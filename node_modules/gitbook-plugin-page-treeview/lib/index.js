/***********************************************************************
 *                                                                   _
 *       _____  _                           ____  _                 |_|
 *      |  _  |/ \   ____  ____ __ ___     / ___\/ \   __   _  ____  _
 *      | |_| || |  / __ \/ __ \\ '_  \ _ / /    | |___\ \ | |/ __ \| |
 *      |  _  || |__. ___/. ___/| | | ||_|\ \___ |  _  | |_| |. ___/| |
 *      |_/ \_|\___/\____|\____||_| |_|    \____/|_| |_|_____|\____||_|
 *
 *      ================================================================
 *                 More than a coder, More than a designer
 *      ================================================================
 *
 *
 *      - Document: index.js
 *      - Author: aleen42
 *      - Description: the main entrance for page-treeview
 *      - Create Time: Apr 11st, 2016
 *      - Update Time: Apr 22nd, 2017
 *
 *
 **********************************************************************/

/**
 * [replaceAll: replace all match sub-string in a string]
 * @param  {[type]} search      [description]
 * @param  {[type]} replacement [description]
 * @return {[type]}             [description]
 */
String.prototype.replaceAll = function(search, replacement) {
	var target = this;
	return target.split(search).join(replacement);
};

/**
 * [leftTrim: trim left space]
 * @return {[type]} [description]
 */
String.prototype.leftTrim = function() {
	return this.replace(/^\s+/, '');
}

/**
 * [removeMarkdown: convert markdown into plain text]
 * @type {[type]}
 */
const RemoveMarkdown = require('remove-markdown');

/**
 * [remarkable: convert markdown into a html]
 * @type {[type]}
 */
const Remarkable = require('remarkable');

/**
 * [main module]
 * @type {Object}
 */
const pageTreeview = module.exports = {
	/** Map of new style */
	book: {
		assets: './assets',
		css: [
			'style.css'
		]
	},

	testRemove: function (str) {
		console.log(RemoveMarkdown(str));
	},

	/** Map of hooks */
	hooks: {
		'page:before': function (page) {
			if (this.output.name != 'website') {
				return page;
			}

			/**
			 * [defaultOption: default option]
			 * @type {Object}
			 */
			const defaultOption = {
				'copyright': 'Copyright &#169; aleen42',
				'minHeaderCount': '1',
				'minHeaderDeep': '1'
			};

			/**
			 * [configOption: config option]
			 * @type {Object}
			 */
			const configOption = this.config.get('pluginsConfig')['page-treeview'];

			/** if users have its option, and then combine it with default options */
			if (configOption) {
			// @deprecated
			// if (this.options.pluginsConfig['page-treeview']) {
				for (var item in defaultOption) {
					/** special for copyright */
					// @deprecated
					// defaultOption[item] = this.options.pluginsConfig['page-treeview'][item] || defaultOption[item];
					if (item in configOption) {
						defaultOption[item] = configOption[item];
					}
				}
			}

			var renderContent = pageTreeview.initHeaders(page.content, defaultOption.minHeaderCount, defaultOption.minHeaderDeep);

			/** check whether the option copyright is empty */
			var copyRight = (defaultOption.copyright === '') ? '' : '<div class="treeview__container-title"><span class="treeview__main-title">Treeview</span><span class="treeview__copyright">' + defaultOption.copyright + ' all right reserved, powered by <a href="https://github.com/aleen42" target="_blank">aleen42</a></span></div>';

			var insertTreeview = (renderContent === '') ? '' : '<div class="treeview__container">' + copyRight + renderContent + '</div>';

			page.content = insertTreeview + '\n\n' + page.content;

			return page;
		}
	},

	/** Map of new blocks */
	blocks: {},

	/** Map of new filters */
	filters: {},

	/**
	 * [test: tests function]
	 * @param  {[type]} configs  [simulated configs]
	 * @param  {[type]} contents [simulated contents]
	 * @return {[type]}          [description]
	 */
	test: function (configs, contents) {
		configs = configs || null;
		contents = contents || '';

		/**
		 * [defaultOption: default option]
		 * @type {Object}
		 */
		const defaultOption = {
			'copyright': 'Copyright &#169; aleen42',
			'minHeaderCount': '1',
			'minHeaderDeep': '1'
		};

		/** if users have its option, and then combine it with default options */
		if (configs) {
		// @deprecated
		// if (this.options.pluginsConfig['page-treeview']) {
			for (var item in defaultOption) {
				/** special for copyright */
				// @deprecated
				// defaultOption[item] = this.options.pluginsConfig['page-treeview'][item] || defaultOption[item];
				if (item in configs) {
					defaultOption[item] = configs[item];
				}
			}
		}

		/** check whether the option copyright is empty */
        var renderContent = pageTreeview.initHeaders(contents, defaultOption.minHeaderCount, defaultOption.minHeaderDeep);

		var copyRight = (defaultOption.copyright === '') ? '' : '<div class="treeview__container-title"><span class="treeview__main-title">Treeview</span><span class="treeview__copyright">' + defaultOption.copyright + ' all right reserved, powered by <a href="https://github.com/aleen42" target="_blank">aleen42</a></span></div>';

		var insertTreeview = '<div class="treeview__container">' + copyRight + renderContent + '</div>';

		return insertTreeview;
	},

	/**
	 * [getLevelTab: generate tab for a tree with an array]
	 * @param  {[type]} array [description]
	 * @param  {[type]} index [description]
	 * @param  {[type]} min   [description]
	 * @return {[type]}       [description]
	 */
	getLevelTab: function (array, index, min) {
		var ret = '';

		if (index === 0) {
			if (array[index] !== min) {
				for (var i = min; i < array[index]; i++) {
					ret += new Array(i - min + 1).join('\t') + '- &nbsp; \n';
				}
			}
		} else {
			if (array[index] - array[index - 1] > 1) {
				for (var i = array[index - 1] + 1; i < array[index]; i++) {
					ret += new Array(i - min + 1).join('\t') + '- &nbsp; \n';
				}
			}
		}

		return ret + new Array(array[index] - min + 1).join('\t');
	},

	/**
	 * [initHeaders: get headers of a page]
	 * @param  {[type]} content        [description]
	 * @param  {[type]} minHeaderCount [description]
	 * @param  {[type]} minHeaderDeep  [description]
	 * @return {[type]}                [description]
	 */
	initHeaders: function (content, minHeaderCount, minHeaderDeep) {
		var res = [];
		var levelTab = [];
        var parentNodes = [];
        var minLevel = 6;

		var calcLevel = function (str) {
			var count = 0;
			var strArr = str.split('');

			for (var i = 0; i < str.length && strArr[i] === '#'; i++) {
				count++;
			}

			return count;
		};

		var headers = [].concat(content.match(/^(#)+(\s)*(.*)\n/g))
            .concat(content.match(/\n(#)+(\s)*(.*)/g))
            .map(function (x) {
    			if (x !== null) {
    				var ret = x.replaceAll('\n', '');

    				/** filter in code block and code line */
    				var codeBlock = content.match(/\n```[a-zA-Z]*([\s\S]*?)```/g);
    				var codeLine = content.match(/\n`[a-zA-Z]*([\s\S]*?)`/g);

    				if (codeBlock !== null) {
    					for (var i = 0; i < codeBlock.length; i++) {
    						if (codeBlock[i].indexOf(ret) >= 0) {
    							return null;
    						}
    					}
    				}

    				if (codeLine !== null) {
    					for (var i = 0; i < codeLine.length; i++) {
    						if (codeLine[i].indexOf(ret) >= 0) {
    							return null;
    						}
    					}
    				}

    				ret = ret.replace(/<.*?\/>/g, '')
    					.replace(/<.*?>(.*?)<\/.*?>/g, '$1');

    				var level = calcLevel(ret);

    				if (level <= minLevel) {
    					minLevel = level;
    				}

    				levelTab.push(level);

    				return ret;
    			} else {
    				return x;
    			}
    		});

		var nullCount = 0;
		var maxDeep = 0;

		for (var i = 0; i < headers.length; i++) {
			if (headers[i] === null) {
				nullCount++;
				continue;
			} else {
				var levelLength = calcLevel(headers[i]);
				var value = headers[i].replace(new Array(levelLength + 1).join('#'), '').leftTrim();

                var originalTitle = pageTreeview.filterValue(value);
                var title = '';
                var match;

                if (match = /(\d+\.\s)[\s\S]+/.exec(originalTitle)) {
                    /** reserved order list like `1. abc` */
                    title = match[1] += RemoveMarkdown(originalTitle);
                } else {
                    title = RemoveMarkdown(originalTitle);
                }

				var href = pageTreeview.convertID(value);
                var tabs = pageTreeview.getLevelTab(levelTab, i - nullCount, minLevel);
                var tabLen = levelTab[i - nullCount] - minLevel + 1;

				maxDeep = maxDeep < tabLen ? tabLen : maxDeep;

                if (levelTab[i - nullCount] < levelTab[i + 1 - nullCount]) {
                    /** it means that it's a current node */
                    parentNodes.push(i - nullCount);
                }

                res.push(tabs + '- [' + title + '](#' + href + ')');
			}
		}

		/** check whether the number headers is greater than the value `minHeaderCount` */
		if (headers.length - nullCount < (parseInt(minHeaderCount) === NaN ? 1 : parseInt(minHeaderCount))
        && maxDeep < (parseInt(minHeaderDeep) === NaN ? 1 : parseInt(minHeaderDeep))) {
			return '';
		}

        var generatedHTML = new Remarkable().render(res.join('\n'));

        /** replace a tag with wrapped into a block */
        generatedHTML = generatedHTML.replace(/<a[\s\S]+?>[\s\S]+?<\/a>/g, function (match) {
            return '<div>' + match + '<i></i></div>';
        });

        /** give a class name and event handler if it's parentNodes */
        var node = null;
        var currentNodeIndex = 0;
        var regex = /<i[\s\S]+?<\/i>/g;

        while (node = regex.exec(generatedHTML)) {
            if (node.index === regex.lastIndex) {
                /** Don't let browsers get stuck in an infinite loop */
                regex.lastIndex++;
            }

            if (parentNodes.indexOf(currentNodeIndex++) > -1) {
                /** it's a parent node and replace it */
                /** the lenth of "<div" is 4 */
                var seperatorIndex = '<i'.length;

                generatedHTML = generatedHTML.substring(0, node.index + seperatorIndex)
                    + ' class="level__parent level__item level__parent--opened" state="opened" onclick="'
                        + 'var curState = this.getAttribute(\'state\');'
                        + 'var nextState = curState === \'opened\' ? \'hidden\' : \'opened\';'
                        + 'this.setAttribute(\'state\', nextState);'
                        + 'this.className = this.className.split(curState).join(nextState);'
                        + ''
                        + 'var list = this.parentNode.nextElementSibling;'
                        + 'if (nextState === \'hidden\') {'
                        + '    list.style.display = \'none\';'
                        + '} else {'
                        + '    list.style.display = \'block\';'
                        + '}'
                    + '"'
                    + generatedHTML.substring(node.index + seperatorIndex);
            }
        }

		return generatedHTML;
	},

	/**
	 * [filterValue: filter value of headers]
	 * @param  {[type]} str [description]
	 * @return {[type]}     [description]
	 */
	filterValue: function (str) {
		/** reencode of cases: [sub] title [back]() */
		var ret = str;
		var prefix = ret.match(/\[(.+)?\](?!\()+/g);

		if (prefix !== null) {
			/**
			 * [A2U: ascii to unicode]
			 */
			function A2U(str) {
				var reserved = '';
				var convertCh = ['[', ']'];

				for (var i = 0; i < str.length; i++) {
					if ((i === 0 || i === str.length - 1) && convertCh.indexOf(str[i]) >= 0) {
						reserved += '&#' + str.charCodeAt(i) + ';';
					} else {
						reserved += str[i];
					}
				}

				return reserved;
			}

			ret = ret.replaceAll(prefix[0], A2U(prefix[0]));
		}

		return ret;
	},

	/**
	 * [convertID: convert a markdown string into a id generated by gitbook]
	 * @param  {[type]} str [description]
	 * @return {[type]}     [description]
	 */
	convertID: function (str) {
		var entityTable = {
			34: 'quot',
			38: 'amp',
			39: 'apos',
			60: 'lt',
			62: 'gt',
			160: 'nbsp',
			161: 'iexcl',
			162: 'cent',
			163: 'pound',
			164: 'curren',
			165: 'yen',
			166: 'brvbar',
			167: 'sect',
			168: 'uml',
			169: 'copy',
			170: 'ordf',
			171: 'laquo',
			172: 'not',
			173: 'shy',
			174: 'reg',
			175: 'macr',
			176: 'deg',
			177: 'plusmn',
			178: 'sup2',
			179: 'sup3',
			180: 'acute',
			181: 'micro',
			182: 'para',
			183: 'middot',
			184: 'cedil',
			185: 'sup1',
			186: 'ordm',
			187: 'raquo',
			188: 'frac14',
			189: 'frac12',
			190: 'frac34',
			191: 'iquest',
			192: 'Agrave',
			193: 'Aacute',
			194: 'Acirc',
			195: 'Atilde',
			196: 'Auml',
			197: 'Aring',
			198: 'AElig',
			199: 'Ccedil',
			200: 'Egrave',
			201: 'Eacute',
			202: 'Ecirc',
			203: 'Euml',
			204: 'Igrave',
			205: 'Iacute',
			206: 'Icirc',
			207: 'Iuml',
			208: 'ETH',
			209: 'Ntilde',
			210: 'Ograve',
			211: 'Oacute',
			212: 'Ocirc',
			213: 'Otilde',
			214: 'Ouml',
			215: 'times',
			216: 'Oslash',
			217: 'Ugrave',
			218: 'Uacute',
			219: 'Ucirc',
			220: 'Uuml',
			221: 'Yacute',
			222: 'THORN',
			223: 'szlig',
			224: 'agrave',
			225: 'aacute',
			226: 'acirc',
			227: 'atilde',
			228: 'auml',
			229: 'aring',
			230: 'aelig',
			231: 'ccedil',
			232: 'egrave',
			233: 'eacute',
			234: 'ecirc',
			235: 'euml',
			236: 'igrave',
			237: 'iacute',
			238: 'icirc',
			239: 'iuml',
			240: 'eth',
			241: 'ntilde',
			242: 'ograve',
			243: 'oacute',
			244: 'ocirc',
			245: 'otilde',
			246: 'ouml',
			247: 'divide',
			248: 'oslash',
			249: 'ugrave',
			250: 'uacute',
			251: 'ucirc',
			252: 'uuml',
			253: 'yacute',
			254: 'thorn',
			255: 'yuml',
			402: 'fnof',
			913: 'Alpha',
			914: 'Beta',
			915: 'Gamma',
			916: 'Delta',
			917: 'Epsilon',
			918: 'Zeta',
			919: 'Eta',
			920: 'Theta',
			921: 'Iota',
			922: 'Kappa',
			923: 'Lambda',
			924: 'Mu',
			925: 'Nu',
			926: 'Xi',
			927: 'Omicron',
			928: 'Pi',
			929: 'Rho',
			931: 'Sigma',
			932: 'Tau',
			933: 'Upsilon',
			934: 'Phi',
			935: 'Chi',
			936: 'Psi',
			937: 'Omega',
			945: 'alpha',
			946: 'beta',
			947: 'gamma',
			948: 'delta',
			949: 'epsilon',
			950: 'zeta',
			951: 'eta',
			952: 'theta',
			953: 'iota',
			954: 'kappa',
			955: 'lambda',
			956: 'mu',
			957: 'nu',
			958: 'xi',
			959: 'omicron',
			960: 'pi',
			961: 'rho',
			962: 'sigmaf',
			963: 'sigma',
			964: 'tau',
			965: 'upsilon',
			966: 'phi',
			967: 'chi',
			968: 'psi',
			969: 'omega',
			977: 'thetasym',
			978: 'upsih',
			982: 'piv',
			8226: 'bull',
			8230: 'hellip',
			8242: 'prime',
			8243: 'Prime',
			8254: 'oline',
			8260: 'frasl',
			8472: 'weierp',
			8465: 'image',
			8476: 'real',
			8482: 'trade',
			8501: 'alefsym',
			8592: 'larr',
			8593: 'uarr',
			8594: 'rarr',
			8595: 'darr',
			8596: 'harr',
			8629: 'crarr',
			8656: 'lArr',
			8657: 'uArr',
			8658: 'rArr',
			8659: 'dArr',
			8660: 'hArr',
			8704: 'forall',
			8706: 'part',
			8707: 'exist',
			8709: 'empty',
			8711: 'nabla',
			8712: 'isin',
			8713: 'notin',
			8715: 'ni',
			8719: 'prod',
			8721: 'sum',
			8722: 'minus',
			8727: 'lowast',
			8730: 'radic',
			8733: 'prop',
			8734: 'infin',
			8736: 'ang',
			8743: 'and',
			8744: 'or',
			8745: 'cap',
			8746: 'cup',
			8747: 'int',
			8756: 'there4',
			8764: 'sim',
			8773: 'cong',
			8776: 'asymp',
			8800: 'ne',
			8801: 'equiv',
			8804: 'le',
			8805: 'ge',
			8834: 'sub',
			8835: 'sup',
			8836: 'nsub',
			8838: 'sube',
			8839: 'supe',
			8853: 'oplus',
			8855: 'otimes',
			8869: 'perp',
			8901: 'sdot',
			8968: 'lceil',
			8969: 'rceil',
			8970: 'lfloor',
			8971: 'rfloor',
			9001: 'lang',
			9002: 'rang',
			9674: 'loz',
			9824: 'spades',
			9827: 'clubs',
			9829: 'hearts',
			9830: 'diams',
			338: 'OElig',
			339: 'oelig',
			352: 'Scaron',
			353: 'scaron',
			376: 'Yuml',
			710: 'circ',
			732: 'tilde',
			8194: 'ensp',
			8195: 'emsp',
			8201: 'thinsp',
			8204: 'zwnj',
			8205: 'zwj',
			8206: 'lrm',
			8207: 'rlm',
			8211: 'ndash',
			8212: 'mdash',
			8216: 'lsquo',
			8217: 'rsquo',
			8218: 'sbquo',
			8220: 'ldquo',
			8221: 'rdquo',
			8222: 'bdquo',
			8224: 'dagger',
			8225: 'Dagger',
			8240: 'permil',
			8249: 'lsaquo',
			8250: 'rsaquo',
			8364: 'euro'
		};

		/**
		 * [E2A: HTML entites to Ascii]
		 * @param {[type]} str [description]
		 */
		function E2A(str) {
			function getKey(value) {
				value = value.replace('&', '');
				value = value.replace(';', '');

				/** get the first key of a specific value */
				for (var prop in entityTable) {
					if (entityTable.hasOwnProperty(prop)) {
						if (entityTable.prop === value || entityTable[prop] === value) {
							return String.fromCharCode(prop);
						}
					}
				}

				return null;
			};

			return str.replace(/&([\S]+?);/g, getKey);
		}

		var res = RemoveMarkdown(
			/** convert \t into ---- */
			E2A(str.replaceAll('\t', '----')
			/** remove “ and ” */
			.replaceAll('“', '')
			.replaceAll('”', '')
			.toLowerCase()
			.trim()
			.replaceAll(' ', '-'))
		);

		var strArr = res.split('');

		for (var i = 0; i < strArr.length; i++) {
			/** not alpha */
			if (!(strArr[i].charCodeAt(0) >= 97 && strArr[i].charCodeAt(0) <= 122) && !(strArr[i].charCodeAt(0) === 45) && !(strArr[i].charCodeAt(0) > 126) && !(strArr[i].charCodeAt(0) >= 48 && strArr[i].charCodeAt(0) <= 57)) {
				strArr.splice(i, 1);
				i--;
			}
		}

		var result = strArr.join('');

		return result[0] === '-' ? result.substr(1, result.length - 1) : result;
	}
};
