# WebView

## WebView常用方法

* public void loadUrl \(String url\)

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

  ```text
  <img src="file:///android_res/drawable/a.png">
  ```

* loadData\(String data, String mimeType, String encoding\)
* loadDataWithBaseURL\(String baseUrl, String data, String mimeType, String encoding, String historyUrl\)

```java
//加载字符串 4.0+没有问题，2.3下乱码
loadData(htmlStr, "text/html;charset=utf-8",null);
//4.0+和2.3都没有问题
loadDataWithBaseURL(null, htmlStr,"text/html", "utf-8", null);
```

* public String getTitle\(\)：获取当前页面的title

## WebChromeClient

`WebChromeClient`是辅助`WebView`处理`Javascript`的对话框,网站图标,网站title等。常用方法如下：

* public void onProgressChanged\(WebView view, int newProgress\) {}：告诉应用网页加载进度

## WebView源码分析

```java
//WebView的所有操作都是通过调用Provider相应的方法
private WebViewProvider mProvider;
//创建WebViewProvider
private void ensureProviderCreated() {
    checkThread();
    if (mProvider == null) {
        // As this can get called during the base class constructor chain, pass the minimum
        // number of dependencies here; the rest are deferred to init().
        mProvider = getFactory().createWebView(this, new PrivateAccess());
    }
}
//获取WebViewFactoryProvider
@UnsupportedAppUsage
private static WebViewFactoryProvider getFactory() {
    //内部通过反射获取WebViewFactoryProvider，不同的版本可能
   //创建不同的WebViewFactoryProvider，
    return WebViewFactory.getProvider();
}
```

`WebViewFactory`

```java
//类的路径
private static final String CHROMIUM_WEBVIEW_FACTORY =
           "com.android.webview.chromium.WebViewChromiumFactoryProviderForQ";
```

5.0版本的`WebView`创建的`WebViewFactoryProvider`对象为`WebViewChromiumFactoryProvider`。

[WebViewChromiumFactoryProvider](https://android.googlesource.com/platform/frameworks/webview/+/refs/heads/lollipop-dev/chromium/java/com/android/webview/chromium/WebViewChromiumFactoryProvider.java)

```java
@Override
public WebViewProvider createWebView(WebView webView, WebView.PrivateAccess privateAccess) {
    //创建WebView内核
    WebViewChromium wvc = new WebViewChromium(this, webView, privateAccess);
    synchronized (mLock) {
        if (mWebViewsToStart != null) {
            mWebViewsToStart.add(new WeakReference<WebViewChromium>(wvc));
        }
    }
    return wvc;
}
```

```java
@Override
public void addJavascriptInterface(final Object obj, final String interfaceName) {
    if (checkNeedsPost()) {
        //WebViewChromiumRunQueue
        mRunQueue.addTask(new Runnable() {
            @Override
            public void run() {
                addJavascriptInterface(obj, interfaceName);
            }
        });
        return;
    }
    Class<? extends Annotation> requiredAnnotation = null;
    if (mAppTargetSdkVersion >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
       requiredAnnotation = JavascriptInterface.class;
    }
   //AwContents
    mAwContents.addPossiblyUnsafeJavascriptInterface(obj, interfaceName, requiredAnnotation);
}
```

[https://github.com/pwnall/chromeview/blob/master/src/org/chromium/android\_webview/AwContents.java](https://github.com/pwnall/chromeview/blob/master/src/org/chromium/android_webview/AwContents.java)

```java
    /**
     * @see ContentViewCore#addPossiblyUnsafeJavascriptInterface(Object, String, Class)
     */
    public void addPossiblyUnsafeJavascriptInterface(Object object, String name,
            Class<? extends Annotation> requiredAnnotation) {
        mContentViewCore.addPossiblyUnsafeJavascriptInterface(object, name, requiredAnnotation);
    }
```

[https://chromium.googlesource.com/chromium/src/+/9d343ad2ea6ec395c377a4efa266057155bfa9c1/content/public/android/java/src/org/chromium/content/browser/ContentViewCore.java](https://chromium.googlesource.com/chromium/src/+/9d343ad2ea6ec395c377a4efa266057155bfa9c1/content/public/android/java/src/org/chromium/content/browser/ContentViewCore.java)

```java
   */
public void addJavascriptInterface(Object object, String name) {
    addPossiblyUnsafeJavascriptInterface(object, name, JavascriptInterface.class);
}
public void addPossiblyUnsafeJavascriptInterface(Object object, String name,
        Class<? extends Annotation> requiredAnnotation) {
    if (mNativeContentViewCore != 0 && object != null) {
        mJavaScriptInterfaces.put(name, new Pair<Object, Class>(object, requiredAnnotation));
        //本地方法
        nativeAddJavascriptInterface(mNativeContentViewCore, object, name, requiredAnnotation);
    }
}
```

## 更多阅读

* [https://tech.meituan.com/2017/06/09/webviewperf.html](https://tech.meituan.com/2017/06/09/webviewperf.html)
* [WebView Api](http://developer.android.com/reference/android/webkit/WebView.html)
* [Building Web Apps in WebView](http://developer.android.com/guide/webapps/webview.html)
* [WebView乱码解决](http://stackoverflow.com/questions/3961589/android-webview-and-loaddata)
* [android webview js交互， 响应webview中的图片点击事件](http://blog.csdn.net/wangtingshuai/article/details/8635787)

