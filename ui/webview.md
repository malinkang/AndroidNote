



### WebView常用方法

* loadUrl(String url)

```java
//打开本包内asset目录下的test.html文件
loadUrl(" file:///android_asset/test.html ");
//打开本地sd卡内的kris.html文件
loadUrl("content://com.android.htmlfileprovider/sdcard/malinkang.html");
//打开指定URL的html文件
loadUrl("http://www.malinkang.com/");

```

* loadData(String data, String mimeType, String encoding)

* loadDataWithBaseURL(String baseUrl, String data, String mimeType, String encoding, String historyUrl)

```java

//加载字符串 4.0+没有问题，2.3下乱码
loadData(htmlStr, "text/html;charset=utf-8",null);
//4.0+和2.3都没有问题
loadDataWithBaseURL(null, htmlStr,"text/html", "utf-8", null);

```

###更多阅读

[WebView乱码解决](http://stackoverflow.com/questions/3961589/android-webview-and-loaddata)
