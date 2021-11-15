# Okhttp源码分析

## 基本流程

1. 创建`RequestBody`
2. 创建`Request`
3. 创建`OkhttpClient`
4. 调用`newCall`创建Call对象
5. 执行异步或同步操作。
6. 创建`Socket`连接
7. 发送请求并处理返回结果

## 创建RequestBody

`RequestBody`主要通过`writeTo`方法将请求内容写入到`BufferedSink`。`RequestBody`提供了3个`create`静态方法来创建`RequestBody`，此外`RequestBody`还包含两个子类。

![image-20211114170629029](https://malinkang.cn/images/jvm/202111141706239.png)

`FormBody`用于表单提交，`MultipartBody`用于多内容提交。

## 创建Request

`Request`对象包含如下信息

```java
final HttpUrl url; //请求连接
final String method; //请求方法
final Headers headers; //请求头
final @Nullable RequestBody body; //请求体
final Map<Class<?>, Object> tags; //tags
```

## 创建OkHttpClient

`OkHttpClient`可配置的信息包括如下：

```java
final Dispatcher dispatcher; //调度器主要负责异步请求
final @Nullable Proxy proxy; //代理
final List<Protocol> protocols; //支持的协议 默认支持HTTP1.1 和HTTP2.0
final List<ConnectionSpec> connectionSpecs; //传输层版本和连接协议
final List<Interceptor> interceptors; //拦截器
final List<Interceptor> networkInterceptors;//网络拦截器
final EventListener.Factory eventListenerFactory; //
final ProxySelector proxySelector; //代理选择器
final CookieJar cookieJar;
final @Nullable Cache cache; //缓存
final @Nullable InternalCache internalCache; //内部缓存
final SocketFactory socketFactory; //工厂
final SSLSocketFactory sslSocketFactory; //安全套接层
final CertificateChainCleaner certificateChainCleaner; //验证确认响应书，适用HTTPS 请求连接的主机名
final HostnameVerifier hostnameVerifier;//主机名字确认
final CertificatePinner certificatePinner; //证书链
final Authenticator proxyAuthenticator; //代理身份验证
final Authenticator authenticator; //本地身份验证
final ConnectionPool connectionPool; //链接池 复用连接
final Dns dns; //DNS
final boolean followSslRedirects; //安全套接层重定向
final boolean followRedirects; //本地重定向
final boolean retryOnConnectionFailure; //重试连接失败
final int callTimeout; //默认0
final int connectTimeout; //连接超时时间 默认10s
final int readTimeout;  //读取超时时间默认10s
final int writeTimeout; //写入超时时间 默认10s
final int pingInterval;
```

## 调用newCall创建Call对象

![image-20211114170500713](https://malinkang.cn/images/jvm/202111141705680.png)

`OkHttpClient`继承`Call.Factory`。

```java
interface Factory {
  Call newCall(Request request);
}
```

`OkHttpClient`的`newCall`方法调用

```java
//每次调用一个newCall都会创建一个新的RealCall对象
override fun newCall(request: Request): Call = RealCall(this, request, forWebSocket = false)
```

## 执行网络请求

![image-20211114173043097](https://malinkang.cn/images/jvm/202111141730335.png)

`Call`支持执行网络请求的方法`enqueue`和`execute()`。`enqueue`执行异步请求，`execute()`执行同步请求。

```java
override fun enqueue(responseCallback: Callback) {
  check(executed.compareAndSet(false, true)) { "Already Executed" }
  callStart()
  client.dispatcher.enqueue(AsyncCall(responseCallback))
}
```

### enqueue()

`Dispatcher`类

```java
internal fun enqueue(call: AsyncCall) {
  synchronized(this) {
    //添加到准备请求的队列中
    readyAsyncCalls.add(call)
    // Mutate the AsyncCall so that it shares the AtomicInteger of an existing running call to
    // the same host.
    if (!call.call.forWebSocket) {
      //寻找相同主机的Call
      val existingCall = findExistingCallWithHost(call.host)
      //所有的AsyncCall公用一个对象
      if (existingCall != null) call.reuseCallsPerHostFrom(existingCall)
    }
  }
  promoteAndExecute()
}
```

### promoteAndExecute()

```java
private fun promoteAndExecute(): Boolean {
  this.assertThreadDoesntHoldLock()
  val executableCalls = mutableListOf<AsyncCall>()
  val isRunning: Boolean
  synchronized(this) {
    val i = readyAsyncCalls.iterator()
    while (i.hasNext()) {
      val asyncCall = i.next()
      //如果正在运行的Call的数量大于64
      if (runningAsyncCalls.size >= this.maxRequests) break // Max capacity. 
       //如果每个域名的请求数超过5
      if (asyncCall.callsPerHost.get() >= this.maxRequestsPerHost) continue // Host max capacity.
      //从准备数组中移除
      i.remove()
      //个数累加
      asyncCall.callsPerHost.incrementAndGet()
      executableCalls.add(asyncCall)
      runningAsyncCalls.add(asyncCall)
    }
    isRunning = runningCallsCount() > 0
  }
  //
  for (i in 0 until executableCalls.size) {
    val asyncCall = executableCalls[i]
      asyncCall.executeOn(executorService)
  }

  return isRunning
}
```

```java
//创建线程池
@get:Synchronized
@get:JvmName("executorService") val executorService: ExecutorService
get() {
  if (executorServiceOrNull == null) {
    executorServiceOrNull = ThreadPoolExecutor(0, Int.MAX_VALUE, 60, TimeUnit.SECONDS,
                                               SynchronousQueue(), threadFactory("$okHttpName Dispatcher", false))
  }
  return executorServiceOrNull!!
}
```

### executeOn()

`AsyncCall`的`executeOn`方法

```java
fun executeOn(executorService: ExecutorService) {
  client.dispatcher.assertThreadDoesntHoldLock()
  var success = false
  try {
    executorService.execute(this)
    success = true
  } catch (e: RejectedExecutionException) {
    val ioException = InterruptedIOException("executor rejected")
    ioException.initCause(e)
    noMoreExchanges(ioException)
    responseCallback.onFailure(this@RealCall, ioException)
  } finally {
    if (!success) {
      client.dispatcher.finished(this) // This call is no longer running!
    }
  }
}
```

```java
override fun run() {
  threadName("OkHttp ${redactedUrl()}") {
    var signalledCallback = false
      timeout.enter()
      try {
        val response = getResponseWithInterceptorChain()
          signalledCallback = true
          responseCallback.onResponse(this@RealCall, response)
      } catch (e: IOException) {
        if (signalledCallback) {
          // Do not signal the callback twice!
          Platform.get().log("Callback failure for ${toLoggableString()}", Platform.INFO, e)
        } else {
          responseCallback.onFailure(this@RealCall, e)
        }
      } catch (t: Throwable) {
        cancel()
          if (!signalledCallback) {
            val canceledException = IOException("canceled due to $t")
              canceledException.addSuppressed(t)
              responseCallback.onFailure(this@RealCall, canceledException)
          }
        throw t
      } finally {
        client.dispatcher.finished(this)
      }
  }
}
```

## 拦截器

`RealInterceptorChain`的`proceed`会创建一个`InterceptorChain`，并调用拦截器的`intercept`方法。除了`CallServerInterceptor`外，所有拦截器的`intercept`都会调用创建的`InterceptorChain`的`proceed`方法。

![](https://malinkang.cn/images/jvm/202111121831550.png)

### getResponseWithInterceptorChain()

```java
@Throws(IOException::class)
internal fun getResponseWithInterceptorChain(): Response {
  // Build a full stack of interceptors.
  val interceptors = mutableListOf<Interceptor>()
  interceptors += client.interceptors
  interceptors += RetryAndFollowUpInterceptor(client)
  interceptors += BridgeInterceptor(client.cookieJar)
  interceptors += CacheInterceptor(client.cache)
  interceptors += ConnectInterceptor
  if (!forWebSocket) {
    interceptors += client.networkInterceptors
  }
  interceptors += CallServerInterceptor(forWebSocket)
  //创建chain并把所有的拦截器传递给chain
  val chain = RealInterceptorChain(
      call = this,
      interceptors = interceptors,
      index = 0,
      exchange = null,
      request = originalRequest,
      connectTimeoutMillis = client.connectTimeoutMillis,
      readTimeoutMillis = client.readTimeoutMillis,
      writeTimeoutMillis = client.writeTimeoutMillis
  )
  var calledNoMoreExchanges = false
  try {//执行chain的proceed方法
    val response = chain.proceed(originalRequest)
    if (isCanceled()) {
      response.closeQuietly()
      throw IOException("Canceled")
    }
    return response
  } catch (e: IOException) {
    calledNoMoreExchanges = true
    throw noMoreExchanges(e) as Throwable
  } finally {
    if (!calledNoMoreExchanges) {
      noMoreExchanges(null)
    }
  }
}
```

### proceed()

```java
@Throws(IOException::class)
override fun proceed(request: Request): Response {
  check(index < interceptors.size)
  calls++
  if (exchange != null) {
    check(exchange.finder.sameHostAndPort(request.url)) {
      "network interceptor ${interceptors[index - 1]} must retain the same host and port"
    }
    check(calls == 1) {
      "network interceptor ${interceptors[index - 1]} must call proceed() exactly once"
    }
  }
  // Call the next interceptor in the chain.
  //调用copy方法创建一个chain
  val next = copy(index = index + 1, request = request)
  //获取下一个拦截器
  val interceptor = interceptors[index]
  @Suppress("USELESS_ELVIS")
  //调用拦截器的intercept方法 在interceptor中会调用next的proceed执行下一个拦截器
  val response = interceptor.intercept(next) ?: throw NullPointerException(
      "interceptor $interceptor returned null")
  if (exchange != null) {
    check(index + 1 >= interceptors.size || next.calls == 1) {
      "network interceptor $interceptor must call proceed() exactly once"
    }
  }
  check(response.body != null) { "interceptor $interceptor returned a response with no body" }
  return response
}
```

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

### CacheInterceptor

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

### 协商缓存

强制缓存最大的问题是，一旦服务端资源有更新，直到缓存时间截止前，客户端无法获取到最新的资源（除非请求时手动添加no-store头），另外大部分情况下服务器的资源无法直接确定缓存失效时间，所以使用对比缓存更灵活一些。

使用**Last-Modify** / **If-Modify-Since**头实现协商缓存，具体方法是服务端响应头添加Last-Modify头标识资源的最后修改时间，单位为秒，当客户端再次发起请求时添加If-Modify-Since头并赋值为上次请求拿到的Last-Modify头的值。

服务端收到请求后自行判断缓存资源是否仍然有效，如果有效则返回状态码304同时body体为空，否则下发最新的资源数据。客户端如果发现状态码是304，则取出本地的缓存数据作为响应。

使用这套方案有一个问题，那就是资源文件使用最后修改时间有一定的局限性：

1. Last-Modify单位为秒，如果某些文件在一秒内被修改则并不能准确的标识修改时间。
2. 资源修改时间并不能作为资源是否修改的唯一依据，比如资源文件是Daily Build的，每天都会生成新的，但是其实际内容可能并未改变。


## 建立连接

![image-20211114174719516](https://malinkang.cn/images/jvm/202111141747580.png)

`OkHttp`通过`ConnectInterceptor`建立连接。在`ConnectInterceptor`的`intercept`方法中，通过调用`RealCall`的`initExchange`方法初始化一个`Exchange`对象。`Exchange`对象负责交换数据。

```kotlin
object ConnectInterceptor : Interceptor {
  @Throws(IOException::class)
  override fun intercept(chain: Interceptor.Chain): Response {
    val realChain = chain as RealInterceptorChain
    //调用RealCall的initExchange初始化Exchange
    val exchange = realChain.call.initExchange(chain)
    //创建一个新的Chain
    val connectedChain = realChain.copy(exchange = exchange)
    return connectedChain.proceed(realChain.request)
  }
}
```

### initExchange\(\)

```java
/** Finds a new or pooled connection to carry a forthcoming request and response. */
internal fun initExchange(chain: RealInterceptorChain): Exchange {
  synchronized(this) {
    check(expectMoreExchanges) { "released" }
    check(!responseBodyOpen)
    check(!requestBodyOpen)
  }
  //ExchangeFinder
  val exchangeFinder = this.exchangeFinder!!
  //ExchangeFinder调用find方法获取ExchangeCodec
  val codec = exchangeFinder.find(client, chain)
  //创建Exchange
  val result = Exchange(this, eventListener, exchangeFinder, codec)
  this.interceptorScopedExchange = result
  this.exchange = result
  synchronized(this) {
    this.requestBodyOpen = true
    this.responseBodyOpen = true
  }

  if (canceled) throw IOException("Canceled")
  return result
}
```

### find\(\)

```kotlin
fun find(
  client: OkHttpClient,
  chain: RealInterceptorChain
): ExchangeCodec {
  try {
  //调用findHealthyConnection获取连接
    val resultConnection = findHealthyConnection(
        connectTimeout = chain.connectTimeoutMillis,
        readTimeout = chain.readTimeoutMillis,
        writeTimeout = chain.writeTimeoutMillis,
        pingIntervalMillis = client.pingIntervalMillis,
        connectionRetryEnabled = client.retryOnConnectionFailure,
        doExtensiveHealthChecks = chain.request.method != "GET"
    )
    //调用RealConnection的newCodec获取ExchangeCodec
    return resultConnection.newCodec(client, chain)
  } catch (e: RouteException) {
    trackFailure(e.lastConnectException)
    throw e
  } catch (e: IOException) {
    trackFailure(e)
    throw RouteException(e)
  }
}
```

### findHealthyConnection\(\)

```kotlin
@Throws(IOException::class)
private fun findHealthyConnection(
  connectTimeout: Int,
  readTimeout: Int,
  writeTimeout: Int,
  pingIntervalMillis: Int,
  connectionRetryEnabled: Boolean,
  doExtensiveHealthChecks: Boolean
): RealConnection {
  while (true) {
    //调用findConnection方法获取RealConnection
    val candidate = findConnection(
        connectTimeout = connectTimeout,
        readTimeout = readTimeout,
        writeTimeout = writeTimeout,
        pingIntervalMillis = pingIntervalMillis,
        connectionRetryEnabled = connectionRetryEnabled
    )
    // Confirm that the connection is good.
    //判断连接是否健康
    if (candidate.isHealthy(doExtensiveHealthChecks)) {
      return candidate
    }
    // If it isn't, take it out of the pool.
    candidate.noNewExchanges()
    // Make sure we have some routes left to try. One example where we may exhaust all the routes
    // would happen if we made a new connection and it immediately is detected as unhealthy.
    if (nextRouteToTry != null) continue
    val routesLeft = routeSelection?.hasNext() ?: true
    if (routesLeft) continue
    val routesSelectionLeft = routeSelector?.hasNext() ?: true
    if (routesSelectionLeft) continue
    throw IOException("exhausted all routes")
  }
}
```

### findConnection\(\)

1. 如果call里面的connection不为空，则复用call里面的connection。
2. 如果call中的connection为空，则从连接池中获取一个。
3. 如果缓存池里也没有就创建一个

```kotlin
@Throws(IOException::class)
private fun findConnection(
  connectTimeout: Int,
  readTimeout: Int,
  writeTimeout: Int,
  pingIntervalMillis: Int,
  connectionRetryEnabled: Boolean
): RealConnection {
  //如果取消抛异常
  if (call.isCanceled()) throw IOException("Canceled")
  // Attempt to reuse the connection from the call.
  //复用call里面的连接
  val callConnection = call.connection // This may be mutated by releaseConnectionNoEvents()!
  if (callConnection != null) {
    var toClose: Socket? = null
    synchronized(callConnection) {
      if (callConnection.noNewExchanges || !sameHostAndPort(callConnection.route().address.url)) {
        //释放连接
        toClose = call.releaseConnectionNoEvents()
      }
    }
    // If the call's connection wasn't released, reuse it. We don't call connectionAcquired() here
    // because we already acquired it.
    //如果call里面的connection不为空
    if (call.connection != null) {
      check(toClose == null)
      return callConnection
    }
    // The call's connection was released.
    toClose?.closeQuietly()
    eventListener.connectionReleased(call, callConnection)
  }
  // We need a new connection. Give it fresh stats.
  refusedStreamCount = 0
  connectionShutdownCount = 0
  otherFailureCount = 0
  // Attempt to get a connection from the pool.
  //尝试从连接池中获取一个连接
  if (connectionPool.callAcquirePooledConnection(address, call, null, false)) {
    val result = call.connection!!
    eventListener.connectionAcquired(call, result)
    return result
  }
  // Nothing in the pool. Figure out what route we'll try next.
  //没看懂这一块路由相关的逻辑
  val routes: List<Route>?
  val route: Route
  if (nextRouteToTry != null) {
    // Use a route from a preceding coalesced connection.
    routes = null
    route = nextRouteToTry!!
    nextRouteToTry = null
  } else if (routeSelection != null && routeSelection!!.hasNext()) {
    // Use a route from an existing route selection.
    routes = null
    route = routeSelection!!.next()
  } else {
    // Compute a new route selection. This is a blocking operation!
    var localRouteSelector = routeSelector
    if (localRouteSelector == null) {
      localRouteSelector = RouteSelector(address, call.client.routeDatabase, call, eventListener)
      this.routeSelector = localRouteSelector
    }
    val localRouteSelection = localRouteSelector.next()
    routeSelection = localRouteSelection
    routes = localRouteSelection.routes
    if (call.isCanceled()) throw IOException("Canceled")
    // Now that we have a set of IP addresses, make another attempt at getting a connection from
    // the pool. We have a better chance of matching thanks to connection coalescing.
    //再次尝试从连接池中获取
    if (connectionPool.callAcquirePooledConnection(address, call, routes, false)) {
      val result = call.connection!!
      eventListener.connectionAcquired(call, result)
      return result
    }
    route = localRouteSelection.next()
  }
  // Connect. Tell the call about the connecting call so async cancels work.
  //创建连接
  val newConnection = RealConnection(connectionPool, route)
  call.connectionToCancel = newConnection
  try {
    //建立连接
    newConnection.connect(
        connectTimeout,
        readTimeout,
        writeTimeout,
        pingIntervalMillis,
        connectionRetryEnabled,
        call,
        eventListener
    )
  } finally {
    call.connectionToCancel = null
  }
  call.client.routeDatabase.connected(newConnection.route())
  // If we raced another call connecting to this host, coalesce the connections. This makes for 3
  // different lookups in the connection pool!
  if (connectionPool.callAcquirePooledConnection(address, call, routes, true)) {
    val result = call.connection!!
    nextRouteToTry = route
    newConnection.socket().closeQuietly()
    eventListener.connectionAcquired(call, result)
    return result
  }
  synchronized(newConnection) {
    //存储到连接池中
    connectionPool.put(newConnection)
    //将connection赋值给call
    call.acquireConnectionNoEvents(newConnection)
  }
  eventListener.connectionAcquired(call, newConnection)
  return newConnection
}
```

## OkHttp连接复用

`OkHttp` 连接复用主要是通过 `RealConnectionPool` 来实现的，其内部定义了一个 `ConcurrentLinkedQueue` 来存储创建的 `RealConnection`。当获取连接时，优先判断 `Call` 中的`` Connection `是否为空，如果不为空则直接复用，为空则从连接池中获取，当从连接池中获取不到的时候才调用` RealConnection `构造函数创建一个新的连接并添加到 `RealConnectionPool` 中。`RealConnectionPool` 提供了两个可配置的参数：最大空闲连接数和存活时长，这两个参数默认是 5 个和 5 分钟，当然我们也可以在`OKHttpClient` 中自己配置。当向 `RealConnectionPool` 中添加连接和连接变成空闲时，内部都会遍历队列中所有的连接，如果最大空闲连接数或者存活时长都大于设定的则移除存空闲时长最长的连接，该方法会多次执行，直到最大空闲连接数和存活时长都小于设定的值。

![image-20211115105736461](https://malinkang.cn/images/jvm/202111151057183.png)

### ConnectionPool

```kotlin
class ConnectionPool internal constructor(
  internal val delegate: RealConnectionPool
) {
  constructor(
    maxIdleConnections: Int,
    keepAliveDuration: Long,
    timeUnit: TimeUnit
  ) : this(RealConnectionPool(//创建RealConnectionPool
      taskRunner = TaskRunner.INSTANCE, //获取TaskRunner
      maxIdleConnections = maxIdleConnections,
      keepAliveDuration = keepAliveDuration,
      timeUnit = timeUnit
  ))
  //最大空闲连接数5 最长空闲时间5分钟
  constructor() : this(5, 5, TimeUnit.MINUTES)

  /** Returns the number of idle connections in the pool. */
  fun idleConnectionCount(): Int = delegate.idleConnectionCount()

  /** Returns total number of connections in the pool. */
  fun connectionCount(): Int = delegate.connectionCount()

  /** Close and remove all idle connections in the pool. */
  fun evictAll() {
    delegate.evictAll()
  }
}
```

## 清理连接

![image-20211115114825724](https://malinkang.cn/images/jvm/202111151148121.png)

## 执行网络请求

```java
/** This is the last interceptor in the chain. It makes a network call to the server. */
public final class CallServerInterceptor implements Interceptor {
  private final boolean forWebSocket;

  public CallServerInterceptor(boolean forWebSocket) {
    this.forWebSocket = forWebSocket;
  }

  @Override public Response intercept(Chain chain) throws IOException {
    RealInterceptorChain realChain = (RealInterceptorChain) chain;
    Exchange exchange = realChain.exchange();
    Request request = realChain.request();

    long sentRequestMillis = System.currentTimeMillis();

    exchange.writeRequestHeaders(request); //写入请求头

    boolean responseHeadersStarted = false;
    Response.Builder responseBuilder = null;
    if (HttpMethod.permitsRequestBody(request.method()) && request.body() != null) {
      // If there's a "Expect: 100-continue" header on the request, wait for a "HTTP/1.1 100
      // Continue" response before transmitting the request body. If we don't get that, return
      // what we did get (such as a 4xx response) without ever transmitting the request body.
      if ("100-continue".equalsIgnoreCase(request.header("Expect"))) {
        exchange.flushRequest();
        responseHeadersStarted = true;
        exchange.responseHeadersStart();
        responseBuilder = exchange.readResponseHeaders(true);
      }
      //写入请求体
      if (responseBuilder == null) {
        if (request.body().isDuplex()) {
          // Prepare a duplex body so that the application can send a request body later.
          exchange.flushRequest();
          BufferedSink bufferedRequestBody = Okio.buffer(
              exchange.createRequestBody(request, true));
          request.body().writeTo(bufferedRequestBody);
        } else {
          // Write the request body if the "Expect: 100-continue" expectation was met.
          BufferedSink bufferedRequestBody = Okio.buffer(
              exchange.createRequestBody(request, false));
          request.body().writeTo(bufferedRequestBody);
          bufferedRequestBody.close();
        }
      } else {
        exchange.noRequestBody();
        if (!exchange.connection().isMultiplexed()) {
          // If the "Expect: 100-continue" expectation wasn't met, prevent the HTTP/1 connection
          // from being reused. Otherwise we're still obligated to transmit the request body to
          // leave the connection in a consistent state.
          exchange.noNewExchangesOnConnection();
        }
      }
    } else {
      exchange.noRequestBody();
    }

    if (request.body() == null || !request.body().isDuplex()) {
      exchange.finishRequest();
    }

    if (!responseHeadersStarted) {
      exchange.responseHeadersStart();
    }

    if (responseBuilder == null) {
      responseBuilder = exchange.readResponseHeaders(false);
    }

    Response response = responseBuilder
        .request(request)
        .handshake(exchange.connection().handshake())
        .sentRequestAtMillis(sentRequestMillis)
        .receivedResponseAtMillis(System.currentTimeMillis())
        .build();

    int code = response.code();
    if (code == 100) {
      // server sent a 100-continue even though we did not request one.
      // try again to read the actual response
      response = exchange.readResponseHeaders(false)
          .request(request)
          .handshake(exchange.connection().handshake())
          .sentRequestAtMillis(sentRequestMillis)
          .receivedResponseAtMillis(System.currentTimeMillis())
          .build();

      code = response.code();
    }

    exchange.responseHeadersEnd(response);

    if (forWebSocket && code == 101) {
      // Connection is upgrading, but we need to ensure interceptors see a non-null response body.
      response = response.newBuilder()
          .body(Util.EMPTY_RESPONSE)
          .build();
    } else {
      response = response.newBuilder()
          .body(exchange.openResponseBody(response))
          .build();
    }

    if ("close".equalsIgnoreCase(response.request().header("Connection"))
        || "close".equalsIgnoreCase(response.header("Connection"))) {
      exchange.noNewExchangesOnConnection();
    }

    if ((code == 204 || code == 205) && response.body().contentLength() > 0) {
      throw new ProtocolException(
          "HTTP " + code + " had non-zero Content-Length: " + response.body().contentLength());
    }

    return response;
  }
}
```

## 参考

* [面试官：听说你熟悉OkHttp原理](https://juejin.cn/post/6844904087788453896)
* [【知识点】OkHttp 原理 8 连问](https://juejin.cn/post/7020027832977850381 )

