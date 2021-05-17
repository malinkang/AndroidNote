# OKHttp缓存

## 使用缓存

> OkHttp implements an optional, off by default, Cache. OkHttp aims for RFC correct and pragmatic caching behaviour, following common real-world browser like Firefox/Chrome and server behaviour when ambiguous.

  
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

> Cache Events are exposed via the EventListener API. Typical scenarios are below.

> In the ideal scenario the cache can fulfill the request without any conditional call to the network. This will skip the normal events such as DNS, connecting to the network, and downloading the response body.

在理想的情况下，缓存可以在没有任何条件下调用网络的情况下完成请求。这将跳过正常的事件，如DNS，连接到网络，并下载响应体。

> As recommended by the HTTP RFC the max age of a document is defaulted to 10% of the document’s age at the time it was served based on “Last-Modified”. Default expiration dates aren’t used for URIs containing a query.

根据HTTP RFC的建议，文档的最大年龄被默认为基于 "Last-Modified "的文档被提供时年龄的10%。默认的过期日期不用于包含查询的URI。

## 缓存分析

### Cache

缓存核心类是`Cache`对象。

`Cache`的构造函数。

```java
//缓存目录 和最大尺寸
constructor(directory: File, maxSize: Long) : this(directory, maxSize, FileSystem.SYSTEM)
```

Cache提供了两个方法用于存储和获取缓存。

`put`方法将缓存存储到磁盘上。

```java
//返回一个CacheRequest对象
internal val cache = DiskLruCache(
    fileSystem = fileSystem,
    directory = directory,
    appVersion = VERSION,
    valueCount = ENTRY_COUNT,
    maxSize = maxSize,
    taskRunner = TaskRunner.INSTANCE
)

internal fun put(response: Response): CacheRequest? {
  val requestMethod = response.request.method //获取请求方法
  if (HttpMethod.invalidatesCache(response.request.method)) {
    try {
      remove(response.request)
    } catch (_: IOException) {
      // The cache cannot be written.
    }
    return null
  }
  //如果不是GET 请求直接返回null 
  if (requestMethod != "GET") {
    // Don't cache non-GET responses. We're technically allowed to cache HEAD requests and some
    // POST requests, but the complexity of doing so is high and the benefit is low.
    return null
  }
  //Vary头的值为*的情况
  if (response.hasVaryAll()) {
    return null
  }
  val entry = Entry(response) //创建Entry对象
  var editor: DiskLruCache.Editor? = null
  try {
    //先调用key方法生成key
    //调用DiskLruCache的edit方法获取Editor
    editor = cache.edit(key(response.request.url)) ?: return null
    entry.writeTo(editor) //写入本地
    return RealCacheRequest(editor)
  } catch (_: IOException) {
    abortQuietly(editor)
    return null
  }
}
```

`get`方法获取缓存

```java
internal fun get(request: Request): Response? {
  val key = key(request.url)
  val snapshot: DiskLruCache.Snapshot = try {
    cache[key] ?: return null
  } catch (_: IOException) {
    return null // Give up because the cache cannot be read.
  }
  val entry: Entry = try {
    Entry(snapshot.getSource(ENTRY_METADATA))
  } catch (_: IOException) {
    snapshot.closeQuietly()
    return null
  }
  val response = entry.response(snapshot)
  if (!entry.matches(request, response)) {
    response.body?.closeQuietly()
    return null
  }
  return response
}
```

## CacheInterceptor

Cache这两个方法都被CacheInterceptor对象调用。所以处理缓存的核心逻辑都在CacheInterceptor中。

### **缓存逻辑**

```kotlin
if (cache != null) {
    //有body 并且可以被缓存
    if (response.promisesBody() && CacheStrategy.isCacheable(response, networkRequest)) {
        // Offer this request to the cache.
        val cacheRequest = cache.put(response)
        return cacheWritingResponse(cacheRequest, response).also {
          if (cacheResponse != null) {
            // This will log a conditional cache miss only.
            listener.cacheMiss(call)
          }
        }
    }
    if (HttpMethod.invalidatesCache(networkRequest.method)) {
        try {
          cache.remove(networkRequest)
        } catch (_: IOException) {
          // The cache cannot be written.
        }
    }
}
```

`isCacheable`方法用来判断是否可以缓存。

```kotlin
fun isCacheable(response: Response, request: Request): Boolean {
      // Always go to network for uncacheable response codes (RFC 7231 section 6.1), This
      // implementation doesn't support caching partial content.
    when (response.code) {
        HTTP_OK,
        HTTP_NOT_AUTHORITATIVE,
        HTTP_NO_CONTENT,
        HTTP_MULT_CHOICE,
        HTTP_MOVED_PERM,
        HTTP_NOT_FOUND,
        HTTP_BAD_METHOD,
        HTTP_GONE,
        HTTP_REQ_TOO_LONG,
        HTTP_NOT_IMPLEMENTED,
        StatusLine.HTTP_PERM_REDIRECT -> {
          // These codes can be cached unless headers forbid it.
        }

        HTTP_MOVED_TEMP,
        StatusLine.HTTP_TEMP_REDIRECT -> {
          // These codes can only be cached with the right response headers.
          // http://tools.ietf.org/html/rfc7234#section-3
          // s-maxage is not checked because OkHttp is a private cache that should ignore s-maxage.
          if (response.header("Expires") == null &&
              response.cacheControl.maxAgeSeconds == -1 &&
              !response.cacheControl.isPublic &&
              !response.cacheControl.isPrivate) {
            return false
          }
        }

        else -> {
          // All other codes cannot be cached.
          return false
        }
      }

      // A 'no-store' directive on request or response prevents the response from being cached.
    return !response.cacheControl.noStore && !request.cacheControl.noStore
}
```

这里面加了一堆判断，这里需要先了解一下HTTP的缓存原理。才能搞清楚这些判断的逻辑。

### Http缓存原理

在HTTP 1.0时代，响应使用Expires头标识缓存的有效期，其值是一个绝对时间，比如Expires:Thu,31 Dec 2020 23:59:59 GMT。当客户端再次发出网络请求时可比较当前时间 和上次响应的expires时间进行比较，来决定是使用缓存还是发起新的请求。

使用Expires头最大的问题是它依赖客户端的本地时间，如果用户自己修改了本地时间，就会导致无法准确的判断缓存是否过期。

因此，从HTTP 1.1 开始使用`Cache-Control`头表示缓存状态，它的优先级高于Expires，常见的取值为下面的一个或多个。

* private，默认值，标识那些私有的业务逻辑数据，比如根据用户行为下发的推荐数据。该模式下网络链路中的代理服务器等节点不应该缓存这部分数据，因为没有实际意义。
* public 与private相反，public用于标识那些通用的业务数据，比如获取新闻列表，所有人看到的都是同一份数据，因此客户端、代理服务器都可以缓存。
* no-cache 可进行缓存，但在客户端使用缓存前必须要去服务端进行缓存资源有效性的验证，即下文的对比缓存部分，我们稍后介绍。
* max-age 表示缓存时长单位为秒，指一个时间段，比如一年，通常用于不经常变化的静态资源。
* no-store 任何节点禁止使用缓存。

#### 强制缓存

在上述缓存头规约基础之上，强制缓存是指网络请求响应header标识了Expires或Cache-Control带了max-age信息，而此时客户端计算缓存并未过期，则可以直接使用本地缓存内容，而不用真正的发起一次网络请求。

**协商缓存**

强制缓存最大的问题是，一旦服务端资源有更新，直到缓存时间截止前，客户端无法获取到最新的资源（除非请求时手动添加no-store头），另外大部分情况下服务器的资源无法直接确定缓存失效时间，所以使用对比缓存更灵活一些。

使用**Last-Modify** / **If-Modify-Since**头实现协商缓存，具体方法是服务端响应头添加Last-Modify头标识资源的最后修改时间，单位为秒，当客户端再次发起请求时添加If-Modify-Since头并赋值为上次请求拿到的Last-Modify头的值。

服务端收到请求后自行判断缓存资源是否仍然有效，如果有效则返回状态码304同时body体为空，否则下发最新的资源数据。客户端如果发现状态码是304，则取出本地的缓存数据作为响应。

使用这套方案有一个问题，那就是资源文件使用最后修改时间有一定的局限性：

1. Last-Modify单位为秒，如果某些文件在一秒内被修改则并不能准确的标识修改时间。
2. 资源修改时间并不能作为资源是否修改的唯一依据，比如资源文件是Daily Build的，每天都会生成新的，但是其实际内容可能并未改变。







