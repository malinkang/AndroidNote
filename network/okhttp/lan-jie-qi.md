# OkHttp拦截器

拦截器是一个强大的机制，可以监控、重写和重试调用。这里有一个简单的拦截器，可以记录发出的请求和收到的响应。

```java
class LoggingInterceptor implements Interceptor {
  @Override public Response intercept(Interceptor.Chain chain) throws IOException {
    Request request = chain.request();

    long t1 = System.nanoTime();
    logger.info(String.format("Sending request %s on %s%n%s",
        request.url(), chain.connection(), request.headers()));

    Response response = chain.proceed(request);

    long t2 = System.nanoTime();
    logger.info(String.format("Received response for %s in %.1fms%n%s",
        response.request().url(), (t2 - t1) / 1e6d, response.headers()));

    return response;
  }
}
```

对`chain.proceed(request)`的调用是每个拦截器实现的关键部分。这个看似简单的方法是所有HTTP工作发生的地方，产生一个满足请求的响应。如果chain.proceed\(request\)被调用了不止一次，则必须关闭之前的响应体。

拦截器可以被链起来。假设你同时拥有一个压缩拦截器和一个校验和拦截器：你需要决定数据是压缩后再校验和，还是校验和后再压缩。OkHttp使用列表来跟踪拦截器，拦截器是按顺序调用的。

![](../../.gitbook/assets/image%20%2871%29.png)

## 应用拦截器

拦截器被注册为应用程序或网络拦截器。我们将使用上面定义的LoggingInterceptor来说明两者的区别。

通过在OkHttpClient.Builder上调用addInterceptor\(\)来注册一个应用拦截器。

```java
OkHttpClient client = new OkHttpClient.Builder()
    .addInterceptor(new LoggingInterceptor())
    .build();

Request request = new Request.Builder()
    .url("http://www.publicobject.com/helloworld.txt")
    .header("User-Agent", "OkHttp Example")
    .build();

Response response = client.newCall(request).execute();
response.body().close();
```

URL http://www.publicobject.com/helloworld.txt重定向到https://publicobject.com/helloworld.txt，OkHttp自动跟随这个重定向。我们的应用拦截器被调用一次，从chain.proceed\(\)返回的响应有重定向的响应。

```java
INFO: Sending request http://www.publicobject.com/helloworld.txt on null
User-Agent: OkHttp Example

INFO: Received response for https://publicobject.com/helloworld.txt in 1179.7ms
Server: nginx/1.4.6 (Ubuntu)
Content-Type: text/plain
Content-Length: 1759
Connection: keep-alive
```

我们可以看到，我们被重定向了，因为response.request\(\).url\(\)与request.url\(\)不同。两条日志语句记录的是两个不同的URL。

## 网络拦截器

注册一个网络拦截器也很类似。调用addNetworkInterceptor\(\)而不是addInterceptor\(\)。

```java
OkHttpClient client = new OkHttpClient.Builder()
    .addNetworkInterceptor(new LoggingInterceptor())
    .build();

Request request = new Request.Builder()
    .url("http://www.publicobject.com/helloworld.txt")
    .header("User-Agent", "OkHttp Example")
    .build();

Response response = client.newCall(request).execute();
response.body().close();
```

当我们运行这段代码时，拦截器会运行两次。一次是初始请求http://www.publicobject.com/helloworld.txt，另一次是重定向到https://publicobject.com/helloworld.txt。

```java
INFO: Sending request http://www.publicobject.com/helloworld.txt on Connection{www.publicobject.com:80, proxy=DIRECT hostAddress=54.187.32.157 cipherSuite=none protocol=http/1.1}
User-Agent: OkHttp Example
Host: www.publicobject.com
Connection: Keep-Alive
Accept-Encoding: gzip

INFO: Received response for http://www.publicobject.com/helloworld.txt in 115.6ms
Server: nginx/1.4.6 (Ubuntu)
Content-Type: text/html
Content-Length: 193
Connection: keep-alive
Location: https://publicobject.com/helloworld.txt

INFO: Sending request https://publicobject.com/helloworld.txt on Connection{publicobject.com:443, proxy=DIRECT hostAddress=54.187.32.157 cipherSuite=TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA protocol=http/1.1}
User-Agent: OkHttp Example
Host: publicobject.com
Connection: Keep-Alive
Accept-Encoding: gzip

INFO: Received response for https://publicobject.com/helloworld.txt in 80.9ms
Server: nginx/1.4.6 (Ubuntu)
Content-Type: text/plain
Content-Length: 1759
Connection: keep-alive
```

网络请求还包含更多的数据，比如OkHttp添加的Accept-Encoding: gzip头，用来宣传对响应压缩的支持。网络拦截器的Chain有一个非空的Connection，可以用来查询连接到webserver的IP地址和TLS配置。

## 在应用程序和网络拦截器之间进行选择

每个拦截链都有相对的优点。

### 应用拦截器

* 不需要担心重定向和重试等中间响应。 
* 总是被调用一次，即使HTTP响应是从缓存中提供的。
* 观察应用程序的原意。不关心OkHttp注入的头信息，如If-None-Match。
* 允许短路，不调用`Chain.proceed()`。
* 允许重试和多次调用`Chain.proceed()`。 
* 可以使用`withConnectTimeout`、`withReadTimeout`、`withWriteTimeout`调整Call超时。

### 网络拦截器

* 能够对重定向和重试等中间响应进行操作。 
* 不调用对网络短路的缓存响应。 
* 在数据将在网络上传输时就观察数据。 
* 访问承载请求的连接。





![](../../.gitbook/assets/image%20%2872%29.png)

`CallServerInterceptor`不会执行chain的proceed。所以`CallServerInterceptor`必须放最后一个。

## 参考

* [Interceptors](https://square.github.io/okhttp/interceptors/)

