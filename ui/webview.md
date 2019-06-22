

##### WebView常用方法
* public void loadUrl (String url)
```java
//打开本包内asset目录下的test.html文件
loadUrl("file:///android_asset/test.html");
//打开本地sd卡内的kris.html文件
loadUrl("content://com.android.htmlfileprovider/sdcard/malinkang.html");
//打开指定URL的html文件
loadUrl("http://malinkang.com/");
//使用loadUrl调用javascript方法
loadUrl("javascript:test()");
//调用javascript方法传入参数
loadUrl("javascript:test(\"hello\")");
```
有时候html可能需要从资源文件中加载图片
```
<img src="file:///android_res/drawable/a.png">
```
* loadData(String data, String mimeType, String encoding)
* loadDataWithBaseURL(String baseUrl, String data, String mimeType, String encoding, String historyUrl)

```java
//加载字符串 4.0+没有问题，2.3下乱码
loadData(htmlStr, "text/html;charset=utf-8",null);
//4.0+和2.3都没有问题
loadDataWithBaseURL(null, htmlStr,"text/html", "utf-8", null);
```
* public String getTitle()：获取当前页面的title

##### WebChromeClient

`WebChromeClient`是辅助`WebView`处理`Javascript`的对话框,网站图标,网站title等。常用方法如下：

* public void onProgressChanged(WebView view, int newProgress) {}：告诉应用网页加载进度

##### WebViewClient



#####更多阅读

* https://tech.meituan.com/2017/06/09/webviewperf.html

* [WebView Api](http://developer.android.com/reference/android/webkit/WebView.html)
* [Building Web Apps in WebView](http://developer.android.com/guide/webapps/webview.html)
* [WebView乱码解决](http://stackoverflow.com/questions/3961589/android-webview-and-loaddata)
* [android webview js交互， 响应webview中的图片点击事件](http://blog.csdn.net/wangtingshuai/article/details/8635787)
