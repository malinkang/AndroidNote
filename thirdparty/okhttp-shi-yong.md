# OkHttp使用

## 简介

HTTP是现代应用程序的网络请求方式。它是我们交换数据和媒体的方式。高效地执行HTTP可以让你的东西加载得更快，并节省带宽。

OkHttp是一个默认高效的HTTP客户端：

* HTTP/2支持允许向同一主机发出的所有请求共享一个套接字。 
* 连接池降低了请求延迟（如果HTTP/2不可用）。
* 透明的GZIP缩小了下载大小。 
* 响应缓存可以完全避免重复请求的网络。

当网络出现问题时，OkHttp会坚持不懈：它会默默地从常见的连接问题中恢复。如果您的服务有多个IP地址，如果第一次连接失败，OkHttp会尝试更换地址。这对于IPv4+IPv6和冗余数据中心的服务是必要的。OkHttp支持现代的TLS功能（TLS 1.3，ALPN，证书引脚）。它可以被配置为广泛的连接。

使用OkHttp很简单。它的请求/响应API被设计成具有流畅的构建器和不可更改性。它既支持同步阻塞调用，也支持带回调的异步调用。

## 添加依赖

## Get请求

```java
private final OkHttpClient client = new OkHttpClient();

public void run() throws Exception {
  Request request = new Request.Builder()
    .url("https://publicobject.com/helloworld.txt")
    .build();

  try (Response response = client.newCall(request).execute()) {
    if (!response.isSuccessful()) throw new IOException("Unexpected code " + response);

    Headers responseHeaders = response.headers();
    for (int i = 0; i < responseHeaders.size(); i++) {
      System.out.println(responseHeaders.name(i) + ": " + responseHeaders.value(i));
    }

    System.out.println(response.body().string());
  }
}
```



