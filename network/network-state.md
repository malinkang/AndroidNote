
为了检测网络连接，我们需要使用到下面两个类：

* ConnectivityManager：它会回答关于网络连接的查询结果，并在网络连接改变时通知应用程序。
* NetworkInfo：描述一个给定类型的网络接口状态。


```java
ConnectivityManager connMgr = (ConnectivityManager)
        getSystemService(Context.CONNECTIVITY_SERVICE);
//获取wifi 网络状态
NetworkInfo networkInfo = connMgr.getNetworkInfo(ConnectivityManager.TYPE_WIFI);
boolean isWifiConn = networkInfo.isConnected();
//获取3G 网络状态
networkInfo = connMgr.getNetworkInfo(ConnectivityManager.TYPE_MOBILE);
boolean isMobileConn = networkInfo.isConnected();
networkInfo = connMgr.getActiveNetworkInfo();
//判断是否连接网络
boolean isConnected=(networkInfo != null && networkInfo.isConnected());

```


* [在wifi开启时，强制通过手机网络发送请求](http://www.jianshu.com/p/8b6b48c61120)
* [Android 监听wifi广播的两种方式](http://blog.csdn.net/h3c4lenovo/article/details/9627781)
* [TelephonyManager](https://developer.android.com/reference/android/telephony/TelephonyManager.html)
* [ReactiveNetwork](https://github.com/pwittchen/ReactiveNetwork)