'use strict';

var cheerio = require('cheerio');
var Q = require('q');

var PLUGIN_NAME = 'image-captions';

var onInit = function (gitbook) {
  var config = readConfig(gitbook);
  return readAllImages(gitbook)
    .then(function (images) {
      return preprocessImages(images, config);
    })
    .then(function (images) {
      persistImagesInConfig(gitbook, config, images);
    });
};

var onPage = function (gitbook, page) {
  var images = readImagesFromConfig(gitbook);
  var html = insertCaptions(images, page, page.content);
  page.content = html; // side effect!
  return page;
};

var getConfigValue = function (gitbook, expression, def) {
  return gitbook.config.get(expression) || def;
};

var readConfig = function (gitbook) {
  var config = getConfigValue(gitbook, 'pluginsConfig', {})[PLUGIN_NAME] || {};
  // set name of variable with images (available later for images list)
  config.variable_name = config.variable_name || '_pictures';
  return config;
};

var persistImagesInConfig = function (gitbook, config, images) {
  gitbook.config.set(['variables', config.variable_name], images); // side effect!
};

var readImagesFromConfig = function (gitbook) {
  var pluginConfig = readConfig(gitbook);
  return gitbook.config.get(['variables', pluginConfig.variable_name]);
};

function getCaptionTemplate (imageKey, options, captionVarName) {
  // try to get image specific template from plugin configuration options
  if (options.images && options.images[imageKey] && options.images[imageKey][captionVarName]) {
    return options.images[imageKey][captionVarName];
  } else if (options[captionVarName]) {
    return options[captionVarName];
  } else {
    return 'Figure: _CAPTION_';
  }
}

function createCaption (image, key, options, captionKey) {
  // replace supported template placeholders
  return getCaptionTemplate(key, options, captionKey)
    .replace('_CAPTION_', image.label) // img title or alt attribute
    .replace('_PAGE_LEVEL_', image.page_level) // book page level
    .replace('_PAGE_IMAGE_NUMBER_', image.index) // order of the image on the page
    .replace('_BOOK_IMAGE_NUMBER_', image.nro); // order of the image on the book
}

function setImageAttributes (img, data) {
  for (var attr in data.attributes) {
    img.attr(attr, data.attributes[attr]);
  }
}

function setImageCaption ($, img, data) {
  var imageParent = img.parent();
  var figure = '<figure id="fig' + data.key + '">' + $.html(img) + '<figcaption>' + data.caption + '</figcaption></figure>';
  if (imageParent[0].tagName === 'p') {
    // the image is wrapped only by a paragraph
    imageParent.replaceWith(figure);
  } else {
    // the image is wrapped by a link and this link is then wrapped by a paragraph
    img.replaceWith(figure);
    imageParent.parent().replaceWith(imageParent);
  }
}

function setImageAlignment ($, img, data) {
  if (data.align) {
    $('figcaption').addClass(data.align); // TODO: this is wrong, it sets align to all!
  }
}

var insertCaptions = function (images, page, htmlContent) {
  var pageLevel = page.level;
  var $ = cheerio.load(htmlContent);
  // get all images from section content
  $('img').filter(function () {
    return shouldBeWrapped($(this));
  })
  .each(function (i) {
    var img = $(this);
    var key = pageLevel + '.' + (i + 1);

    var data = images.filter(function (item) { return item.key === key; })[0];
    if (!data.skip) {
      setImageAttributes(img, data);
      setImageCaption($, img, data);
      setImageAlignment($, img, data);
    }
  });
  return $.html();
};

function readImageAttributesFromConfig (config, imageKey) {
  if (config.images && config.images[imageKey] && config.images[imageKey].attributes) {
    return config.images[imageKey].attributes;
  } else if (config.attributes) {
    return config.attributes;
  }
  return {};
}

function readAlignFromConfig (config, imageKey) {
  if (config.images && config.images[imageKey] && config.images[imageKey].align) {
    return config.images[imageKey].align;
  } else if (config.align) {
    return config.align;
  }
  return null;
}

function readSkipFlag (config, imageKey) {
  if (config.images && config.images[imageKey] && typeof config.images[imageKey].skip === 'boolean') {
    return config.images[imageKey].skip;
  }
  return false;
}

function shouldBeWrapped (img) {
  return img.parent().children().length === 1 &&
         img.parent().text() === '' &&
         (img.attr('title') || img.attr('alt'));
};

function preprocessImages (results, config) {
  var totalCounter = 1;
  return results.sort(function (a, b) {
    return a.order - b.order;
  })
  .reduce(function (acc, val) { return acc.concat(val.data); }, []) // flatten sections images
  .map(function (image) {
    image.nro = totalCounter++;
    image.attributes = readImageAttributesFromConfig(config, image.key);

    image.skip = readSkipFlag(config, image.key);

    var align = readAlignFromConfig(config, image.key);
    if (align) {
      image.align = align;
    }
    image.list_caption = createCaption(image, image.key, config, 'list_caption');
    image.caption = createCaption(image, image.key, config, 'caption');
    return image;
  });
}

var readAllImages = function (gitbook) {
  var promises = [];

  var pageIndex = 0;

  gitbook.summary.walk(function (page) {
    var currentPageIndex = pageIndex++;
    if (page.path) { // Check that there is truly a link
      var pageText = gitbook.readFileAsString(page.path);
      promises.push(pageText.then(function (pageContent) {
        var pageImages = [];

        var reg = new RegExp(/!\[(.*?)\]\((.*?)(?:\s+"(.*)")?\)/gmi);
        var result;

        var index = 1;

        while ((result = reg.exec(pageContent)) !== null) {
          var image = {alt: result[1], url: result[2]};
          if (result[3]) {
            image.title = result[3];
          }

          image.label = image.title || image.alt;
          image.index = index;
          image.level = page.level;
          image.page_level = page.level;
          image.key = image.level + '.' + image.index;

          // FIXME: is it gitbook or plugin responsibility?
          // SEE: https://github.com/todvora/gitbook-plugin-image-captions/issues/9
          var pageLink = page.ref.replace(/readme.md/gi, 'index.html').replace(/.md/, '.html');

          image.backlink = pageLink + '#fig' + image.key; // TODO

          pageImages.push(image);
          index++;
        }

        return {
          data: pageImages.reduce(function (acc, val) { return acc.concat(val); }, []),
          order: currentPageIndex
        };
      }));
    }
  });
  return Q.all(promises);
};

module.exports = {
  website: {
    assets: './assets',
    css: [
      'image-captions.css'
    ]
  },
  ebook: {
    assets: './assets',
    css: [
      'image-captions.css'
    ]
  },
  hooks: {
    init: function () { // before book pages has been converted to html
      return onInit(this);
    },
    page: function (page) { // after page has been converted to html
      return onPage(this, page);
    }
  }
};
