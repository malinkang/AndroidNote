# Okhttp基本流程分析

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

![](../../.gitbook/assets/RequestBody.png)

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

`OkHttpClient`继承`Call.Factory`。

```java
interface Factory {
  Call newCall(Request request);
}
```

`OkHttpClient`的`newCall`方法调用`RealCall`的`newRealCall`创建Call对象

```java
@Override public Call newCall(Request request) {
  return RealCall.newRealCall(this, request, false /* for web socket */);
}
```

```java
static RealCall newRealCall(OkHttpClient client, Request originalRequest, boolean forWebSocket) {
  // Safely publish the Call instance to the EventListener.
  RealCall call = new RealCall(client, originalRequest, forWebSocket);
  call.transmitter = new Transmitter(client, call);  //创建Transmitter
  return call;
}
```

创建RealCall的时候会创建一个`Transmitter`对象。Transmitter是应用层和网络层之间的桥接类。

## 执行网络请求

Call支持执行网络请求的方法`enqueue`和`execute()`。`enqueue`执行异步请求，`execute()`执行同步请求。

```java
@Override public void enqueue(Callback responseCallback) {
  synchronized (this) {
    if (executed) throw new IllegalStateException("Already Executed");
    executed = true;
  }
  transmitter.callStart();
  //调用Dispatcher的enqueue方法
 // AsyncCall继承自Runnable
  client.dispatcher().enqueue(new AsyncCall(responseCallback));
}
```

`Dispatcher`类

```java
void enqueue(AsyncCall call) {
  synchronized (this) {
    readyAsyncCalls.add(call); //添加到准备请求的队列中

    // Mutate the AsyncCall so that it shares the AtomicInteger of an existing running call to
    // the same host.
    if (!call.get().forWebSocket) {
      AsyncCall existingCall = findExistingCallWithHost(call.host());
      if (existingCall != null) call.reuseCallsPerHostFrom(existingCall);
    }
  }
  promoteAndExecute();
}
```

```java
  /**
   * Promotes eligible calls from {@link #readyAsyncCalls} to {@link #runningAsyncCalls} and runs
   * them on the executor service. Must not be called with synchronization because executing calls
   * can call into user code.
   *
   * @return true if the dispatcher is currently running calls.
   */
  private boolean promoteAndExecute() {
    assert (!Thread.holdsLock(this));

    List<AsyncCall> executableCalls = new ArrayList<>();
    boolean isRunning;
    synchronized (this) {
      for (Iterator<AsyncCall> i = readyAsyncCalls.iterator(); i.hasNext(); ) {
        AsyncCall asyncCall = i.next();
        //如果正在运行的Call的数量大于64 
        if (runningAsyncCalls.size() >= maxRequests) break; // Max capacity.
        if (asyncCall.callsPerHost().get() >= maxRequestsPerHost) continue; // Host max capacity.

        i.remove();
        asyncCall.callsPerHost().incrementAndGet();
        executableCalls.add(asyncCall);
        runningAsyncCalls.add(asyncCall);
      }
      isRunning = runningCallsCount() > 0;
    }

    for (int i = 0, size = executableCalls.size(); i < size; i++) {
      AsyncCall asyncCall = executableCalls.get(i);
      asyncCall.executeOn(executorService());
    }

    return isRunning;
  }
```

```java
//创建线程池
public synchronized ExecutorService executorService() {
  if (executorService == null) {
    executorService = new ThreadPoolExecutor(0, Integer.MAX_VALUE, 60, TimeUnit.SECONDS,
        new SynchronousQueue<>(), Util.threadFactory("OkHttp Dispatcher", false));
  }
  return executorService;
}
```

`AsyncCall`的`executeOn`方法

```java
void executeOn(ExecutorService executorService) {
  assert (!Thread.holdsLock(client.dispatcher()));
  boolean success = false;
  try {
    executorService.execute(this);//执行runnable
    success = true;
  } catch (RejectedExecutionException e) {
    InterruptedIOException ioException = new InterruptedIOException("executor rejected");
    ioException.initCause(e);
    transmitter.noMoreExchanges(ioException);
    responseCallback.onFailure(RealCall.this, ioException);
  } finally {
    if (!success) {
      client.dispatcher().finished(this); // This call is no longer running!
    }
  }
}
```

```java
@Override protected void execute() {
  boolean signalledCallback = false;
  transmitter.timeoutEnter();
  try {
    //责任链模式
    Response response = getResponseWithInterceptorChain();
    signalledCallback = true;
    responseCallback.onResponse(RealCall.this, response);
  } catch (IOException e) {
    if (signalledCallback) {
      // Do not signal the callback twice!
      Platform.get().log(INFO, "Callback failure for " + toLoggableString(), e);
    } else {
      responseCallback.onFailure(RealCall.this, e);
    }
  } catch (Throwable t) {
    cancel();
    if (!signalledCallback) {
      IOException canceledException = new IOException("canceled due to " + t);
      canceledException.addSuppressed(t);
      responseCallback.onFailure(RealCall.this, canceledException);
    }
    throw t;
  } finally {
    client.dispatcher().finished(this);
  }
}
```

## 拦截器

`RealInterceptorChain`的proceed主要负责创建下一个`InterceptorChain`，并传递给下一个拦截器Interceptor，可以简单的看做 遍历所有的Interceptor，InterceptorChain主要做一个next的操作。`Interceptor`的`proceed`负责主要的功能。

```java
Response getResponseWithInterceptorChain() throws IOException {
  // Build a full stack of interceptors.
  List<Interceptor> interceptors = new ArrayList<>();
  interceptors.addAll(client.interceptors());
  interceptors.add(new RetryAndFollowUpInterceptor(client));
  interceptors.add(new BridgeInterceptor(client.cookieJar()));
  interceptors.add(new CacheInterceptor(client.internalCache()));
  interceptors.add(new ConnectInterceptor(client));
  if (!forWebSocket) {
    interceptors.addAll(client.networkInterceptors());
  }
  interceptors.add(new CallServerInterceptor(forWebSocket));
  //创建chain并把所有的拦截器传递给chain
  Interceptor.Chain chain = new RealInterceptorChain(interceptors, transmitter, null, 0,
      originalRequest, this, client.connectTimeoutMillis(),
      client.readTimeoutMillis(), client.writeTimeoutMillis());

  boolean calledNoMoreExchanges = false;
  try {
    //执行chain的proceed方法
    Response response = chain.proceed(originalRequest);
    if (transmitter.isCanceled()) {
      closeQuietly(response);
      throw new IOException("Canceled");
    }
    return response;
  } catch (IOException e) {
    calledNoMoreExchanges = true;
    throw transmitter.noMoreExchanges(e);
  } finally {
    if (!calledNoMoreExchanges) {
      transmitter.noMoreExchanges(null);
    }
  }
}
```

```java
public Response proceed(Request request, Transmitter transmitter, @Nullable Exchange exchange)
    throws IOException {
  if (index >= interceptors.size()) throw new AssertionError();

  calls++;

  // If we already have a stream, confirm that the incoming request will use it.
  if (this.exchange != null && !this.exchange.connection().supportsUrl(request.url())) {
    throw new IllegalStateException("network interceptor " + interceptors.get(index - 1)
        + " must retain the same host and port");
  }

  // If we already have a stream, confirm that this is the only call to chain.proceed().
  if (this.exchange != null && calls > 1) {
    throw new IllegalStateException("network interceptor " + interceptors.get(index - 1)
        + " must call proceed() exactly once");
  }

  // Call the next interceptor in the chain.
  //创建下一个chain 并传递给拦截器
  RealInterceptorChain next = new RealInterceptorChain(interceptors, transmitter, exchange,
      index + 1, request, call, connectTimeout, readTimeout, writeTimeout);
  Interceptor interceptor = interceptors.get(index);
  //调用拦截器的intercept方法 在interceptor中会调用next的proceed执行下一个拦截器
  Response response = interceptor.intercept(next);

  // Confirm that the next interceptor made its required call to chain.proceed().
  if (exchange != null && index + 1 < interceptors.size() && next.calls != 1) {
    throw new IllegalStateException("network interceptor " + interceptor
        + " must call proceed() exactly once");
  }

  // Confirm that the intercepted response isn't null.
  if (response == null) {
    throw new NullPointerException("interceptor " + interceptor + " returned null");
  }

  if (response.body() == null) {
    throw new IllegalStateException(
        "interceptor " + interceptor + " returned a response with no body");
  }

  return response;
}
```

## 建立连接

Transmitter

```java
public void prepareToConnect(Request request) {
  if (this.request != null) {
    if (sameConnection(this.request.url(), request.url()) && exchangeFinder.hasRouteToTry()) {
      return; // Already ready.
    }
    if (exchange != null) throw new IllegalStateException();

    if (exchangeFinder != null) {
      maybeReleaseConnection(null, true);
      exchangeFinder = null;
    }
  }

  this.request = request;
  //创建ExchangeFinder
  this.exchangeFinder = new ExchangeFinder(this, connectionPool, createAddress(request.url()),
      call, eventListener);
}
```

```java
public final class ConnectInterceptor implements Interceptor {
  public final OkHttpClient client;

  public ConnectInterceptor(OkHttpClient client) {
    this.client = client;
  }

  @Override public Response intercept(Chain chain) throws IOException {
    RealInterceptorChain realChain = (RealInterceptorChain) chain;
    Request request = realChain.request();
    Transmitter transmitter = realChain.transmitter();
    // We need the network to satisfy this request. Possibly for validating a conditional GET.
    boolean doExtensiveHealthChecks = !request.method().equals("GET");
    Exchange exchange = transmitter.newExchange(chain, doExtensiveHealthChecks);

    return realChain.proceed(request, transmitter, exchange);
  }
}
```

```java
/** Returns a new exchange to carry a new request and response. */
//Transmitter
Exchange newExchange(Interceptor.Chain chain, boolean doExtensiveHealthChecks) {
  synchronized (connectionPool) {
    if (noMoreExchanges) {
      throw new IllegalStateException("released");
    }
    if (exchange != null) {
      throw new IllegalStateException("cannot make a new request because the previous response "
          + "is still open: please call response.close()");
    }
  }
  //获取ExchangeCodec
  ExchangeCodec codec = exchangeFinder.find(client, chain, doExtensiveHealthChecks);
  Exchange result = new Exchange(this, call, eventListener, exchangeFinder, codec);

  synchronized (connectionPool) {
    this.exchange = result;
    this.exchangeRequestDone = false;
    this.exchangeResponseDone = false;
    return result;
  }
}
```

```java
public ExchangeCodec find(
    OkHttpClient client, Interceptor.Chain chain, boolean doExtensiveHealthChecks) {
  int connectTimeout = chain.connectTimeoutMillis();
  int readTimeout = chain.readTimeoutMillis();
  int writeTimeout = chain.writeTimeoutMillis();
  int pingIntervalMillis = client.pingIntervalMillis();
  boolean connectionRetryEnabled = client.retryOnConnectionFailure();

  try {
    //获取RealConnection对象
    RealConnection resultConnection = findHealthyConnection(connectTimeout, readTimeout,
        writeTimeout, pingIntervalMillis, connectionRetryEnabled, doExtensiveHealthChecks);
    return resultConnection.newCodec(client, chain);
  } catch (RouteException e) {
    trackFailure();
    throw e;
  } catch (IOException e) {
    trackFailure();
    throw new RouteException(e);
  }
}
```

```java
/**
   * Returns a connection to host a new stream. This prefers the existing connection if it exists,
   * then the pool, finally building a new connection.
   */
  private RealConnection findConnection(int connectTimeout, int readTimeout, int writeTimeout,
      int pingIntervalMillis, boolean connectionRetryEnabled) throws IOException {
    boolean foundPooledConnection = false;
    RealConnection result = null;
    Route selectedRoute = null;
    RealConnection releasedConnection;
    Socket toClose;
    synchronized (connectionPool) {
      if (transmitter.isCanceled()) throw new IOException("Canceled");
      hasStreamFailure = false; // This is a fresh attempt.

      // Attempt to use an already-allocated connection. We need to be careful here because our
      // already-allocated connection may have been restricted from creating new exchanges.
      releasedConnection = transmitter.connection;
      toClose = transmitter.connection != null && transmitter.connection.noNewExchanges
          ? transmitter.releaseConnectionNoEvents()
          : null;

      if (transmitter.connection != null) {
        // We had an already-allocated connection and it's good.
        result = transmitter.connection;
        releasedConnection = null;
      }

      if (result == null) {
        // Attempt to get a connection from the pool.
        if (connectionPool.transmitterAcquirePooledConnection(address, transmitter, null, false)) {
          foundPooledConnection = true;
          result = transmitter.connection;
        } else if (nextRouteToTry != null) {
          selectedRoute = nextRouteToTry;
          nextRouteToTry = null;
        } else if (retryCurrentRoute()) {
          selectedRoute = transmitter.connection.route();
        }
      }
    }
    closeQuietly(toClose);

    if (releasedConnection != null) {
      eventListener.connectionReleased(call, releasedConnection);
    }
    if (foundPooledConnection) {
      eventListener.connectionAcquired(call, result);
    }
    if (result != null) {
      // If we found an already-allocated or pooled connection, we're done.
      return result;
    }

    // If we need a route selection, make one. This is a blocking operation.
    boolean newRouteSelection = false;
    if (selectedRoute == null && (routeSelection == null || !routeSelection.hasNext())) {
      newRouteSelection = true;
      routeSelection = routeSelector.next();
    }

    List<Route> routes = null;
    synchronized (connectionPool) {
      if (transmitter.isCanceled()) throw new IOException("Canceled");

      if (newRouteSelection) {
        // Now that we have a set of IP addresses, make another attempt at getting a connection from
        // the pool. This could match due to connection coalescing.
        routes = routeSelection.getAll();
        if (connectionPool.transmitterAcquirePooledConnection(
            address, transmitter, routes, false)) {
          foundPooledConnection = true;
          result = transmitter.connection;
        }
      }

      if (!foundPooledConnection) {
        if (selectedRoute == null) {
          selectedRoute = routeSelection.next();
        }

        // Create a connection and assign it to this allocation immediately. This makes it possible
        // for an asynchronous cancel() to interrupt the handshake we're about to do.
        result = new RealConnection(connectionPool, selectedRoute);
        connectingConnection = result;
      }
    }

    // If we found a pooled connection on the 2nd time around, we're done.
    if (foundPooledConnection) {
      eventListener.connectionAcquired(call, result);
      return result;
    }

    // Do TCP + TLS handshakes. This is a blocking operation.
    //RealConnection 连接socket
    result.connect(connectTimeout, readTimeout, writeTimeout, pingIntervalMillis,
        connectionRetryEnabled, call, eventListener);
    connectionPool.routeDatabase.connected(result.route());

    Socket socket = null;
    synchronized (connectionPool) {
      connectingConnection = null;
      // Last attempt at connection coalescing, which only occurs if we attempted multiple
      // concurrent connections to the same host.
      if (connectionPool.transmitterAcquirePooledConnection(address, transmitter, routes, true)) {
        // We lost the race! Close the connection we created and return the pooled connection.
        result.noNewExchanges = true;
        socket = result.socket();
        result = transmitter.connection;

        // It's possible for us to obtain a coalesced connection that is immediately unhealthy. In
        // that case we will retry the route we just successfully connected with.
        nextRouteToTry = selectedRoute;
      } else {
        connectionPool.put(result);
        transmitter.acquireConnectionNoEvents(result);
      }
    }
    closeQuietly(socket);

    eventListener.connectionAcquired(call, result);
    return result;
  }
```

ExchangeCodec类负责处理网络请求和解码返回值。

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

