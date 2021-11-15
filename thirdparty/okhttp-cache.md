# OKHttp缓存

## 使用缓存

???+ 原文

    OkHttp implements an optional, off by default, Cache. OkHttp aims for RFC correct and pragmatic caching behaviour, following common real-world browser like Firefox/Chrome and server behaviour when ambiguous.


OkHttp实现了一个可选的、默认关闭的缓存。OkHttp的目标是RFC正确和务实的缓存行为，遵循现实世界中常见的浏览器，如Firefox/Chrome和服务器行为，当不明确时。

### 基本使用

```java
private val client: OkHttpClient = OkHttpClient.Builder()
  .cache(Cache(
    directory = File(application.cacheDir, "http_cache"),
    // $0.05 worth of phone storage in 2020
    maxSize = 50L * 1024L * 1024L // 50 MiB
  ))
  .build()
```

???+ 原文

    Cache Events are exposed via the EventListener API. Typical scenarios are below.

???+ 原文

    In the ideal scenario the cache can fulfill the request without any conditional call to the network. This will skip the normal events such as DNS, connecting to the network, and downloading the response body.

在理想的情况下，缓存可以在没有任何条件下调用网络的情况下完成请求。这将跳过正常的事件，如DNS，连接到网络，并下载响应体。

???+ 原文
    
    As recommended by the HTTP RFC the max age of a document is defaulted to 10% of the document’s age at the time it was served based on “Last-Modified”. Default expiration dates aren’t used for URIs containing a query.

根据HTTP RFC的建议，文档的最大年龄被默认为基于 "Last-Modified "的文档被提供时年龄的10%。默认的过期日期不用于包含查询的URI。







