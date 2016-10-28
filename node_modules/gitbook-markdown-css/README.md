# gitbook-markdown-css

Minimalist stylesheet (CSS or Less) for markup output.

### Installation

```
$ npm install gitbook-markdown-css
```

### Usage

##### Less version

```less
@import "./node_modules/gitbook-markdown-css/less/mixin.less";

article {
    .gitbook-markdown();
}
```

See [less/mixin.less](less/mixin.less) for options.

##### CSS version

Import the `gitbook-markdown.css` file and add a `gitbook-markdown-body` class to the container of your rendered Markdown and set a width for it.

```html
<link rel="stylesheet" href="gitbook-markdown.css">
<style>
    .markdown-body {
        min-width: 200px;
        max-width: 790px;
        margin: 0 auto;
        padding: 30px;
    }
</style>
<article class="gitbook-markdown-body">
    <h1>Unicorns</h1>
    <p>All the things</p>
</article>
```

