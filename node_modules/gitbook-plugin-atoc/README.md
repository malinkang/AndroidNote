#gitbook-plugin-atoc

[![npm](https://img.shields.io/npm/v/gitbook-plugin-atoc.svg?style=plastic)](https://npmjs.org/package/gitbook-plugin-atoc) [![npm](https://img.shields.io/npm/dm/gitbook-plugin-atoc.svg?style=plastic)](https://npmjs.org/package/gitbook-plugin-atoc) [![npm](https://img.shields.io/npm/dt/gitbook-plugin-atoc.svg?style=plastic)](https://npmjs.org/package/gitbook-plugin-atoc)

This plugin will add table of content to the page and provide navigation function inside a page.

Add `<!-- toc -->` to the markdown files. When you build the book, it will insert a table of content where you insert `<!-- toc -->`


`book.json` Config:


```
{
	"plugins": ["atoc"],
	"pluginsConfig": {
		"atoc": {
			"addClass": true,
			"className": "atoc"
		}
	}
}
```

You can add this config to add a HTML ClassName to the TOC `ul` element


## LICENSE

MIT

Alipay Donation(通过支付宝捐赠)：

![qr](https://cloud.githubusercontent.com/assets/1890238/15489630/fccbb9cc-2193-11e6-9fed-b93c59d6ef37.png)
