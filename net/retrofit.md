## Retrofit使用

### 目录

* [1.介绍](#1.介绍)
* [2.使用](#2.使用)
    + [2.1.请求方法](#2.1.请求方法)
    + [2.2.URL操作](#2.2.URL操作)
    + [2.3.发送原生数据](#2.3.发送原生数据)
    + [2.4.表单提交和文件上传](#2.4.表单提交和文件上传)
    + [2.5.请求头](#2.5.请求头)
    + [2.6.同步和异步加载](#2.6.同步和异步加载)
    + [2.7.返回数据类型](#2.7.返回数据类型)
* [3.RestAdapter配置](#3.RestAdapter配置)
    + [3.1.设置自定义转换器](#3.1.设置自定义转换器)
    + [3.2.自定义错误处理](#3.2.自定义错误处理)
    + [3.3.设置Log](#3.3.设置Log)
* [4.Retrofit源码分析](#4.Retrofit源码分析)
    + [4.1RestAdapter配置分析](#4.1RestAdapter配置分析)
    + [4.2解析请求方法](#4.2解析请求方法)
    + [4.3构建请求](#4.3构建请求)
    + [4.4发送请求](#4.4发送请求)
* [参考](#参考)



---------------------------------------------------------


<h3 id="1.介绍">1.介绍</h3>

[Retrofit][Retrofit] 是一个类型安全的Java [Rest][Rest] 客户端，而且也适用于Android。

[Retrofit][Retrofit]可以将Rest Api转换为Java的接口。

```java

public interface GitHubService {
  @GET("/users/{user}/repos")
  List<Repo> listRepos(@Path("user") String user);
}

```
通过RestAdapter类，可以创建GithubService的实例。

```java
RestAdapter restAdapter = new RestAdapter.Builder()
    .setEndpoint("https://api.github.com")
    .build();

GitHubService service = restAdapter.create(GitHubService.class);
```
接着就可以调用创建的GithubService的方法进行网络请求。

```java
List<Repo> repos = service.listRepos("octocat");

```

<h3 id="2.使用">2.使用</h3>


<h4 id="2.1.请求方法">2.1.请求方法</h4>

每一个方法必须有HTTP注解和关联的URL。Retrofit提供了五种内置的注解：`GET`,`POST`,`PUT`,`DELETE`,`HEAD`。在注解内指定相关的URL和资源。

```java

@GET("/users/list")

```
也可以在URL中指定查询参数。


```java

@GET("/users/list?sort=desc")

```

<h4 id="2.2.URL操作">2.2.URL操作</h4>


通过动态的使用替换块和参数可以更新请求的URL。替换块是一个被`{`和`}`包裹的字符串。相应的请求参数必须被`@Path`使用相同的字符串进行注解。

```java
@GET("/group/{id}/users")
List<User> groupList(@Path("id") int groupId);

```
也可以添加查询参数。

```java
@GET("/group/{id}/users")
List<User> groupList(@Path("id") int groupId, @Query("sort") String sort);

```

复杂的查询参数组合可以使用一个`map`

```java

@GET("/group/{id}/users")
List<User> groupList(@Path("id") int groupId, @QueryMap Map<String, String> options);

```

<h4 id="2.3.发送原生数据">2.3.发送原生数据</h4>

当你的请求参数是如下JSON字符串，可以使用`@Body`注解一个对象，`Retrofit`可以将对象转换为字符串

```
{"foo":"kit","bar":"kat"}

```
定义对象

```java

public class FooRequest {
  final String foo;
  final String bar;

  FooRequest(String foo, String bar) {
    this.foo = foo;
    this.bar = bar;
  }
}

```

使用`@Body`

```java
interface Foo {
  @POST("/jayson")
  FooResponse postJson(@Body FooRequest body);
}

```

如果你想直接发送一个JSON串，可以使用 `TypedByteArray`。

```java

String json = "{\"foo\":\"kit\",\"bar\":\"kat\"}";
TypedInput in = new TypedByteArray("application/json", json.getBytes("UTF-8"));
FooResponse response = foo.postRawJson(in);

```

<h4 id="2.4.表单提交和文件上传">2.4.表单提交和文件上传</h4>



使用`@FormUrlEncoded`可以进行表单提交。每一个包含名字和提供数据对象的键值对需要使用`@Field`进行注解。

```java

@FormUrlEncoded
@POST("/user/edit")
User updateUser(@Field("first_name") String first, @Field("last_name") String last);

```

使用`@Multipart`注解，可以进行文件上传。`Parts`使用`@Part`进行注解。


```java

@Multipart
@PUT("/user/photo")
User updateUser(@Part("photo") TypedFile photo, @Part("description") TypedString description);

```

<h4 id="2.5.请求头">2.5.请求头</h4>

可以使用`@Headers`注解为方法设置一个请求头。

```java
@Headers("Cache-Control: max-age=640000")
@GET("/widget/list")
List<Widget> widgetList();

```

添加多个请求头

```java

@Headers({
    "Accept: application/vnd.github.v3.full+json",
    "User-Agent: Retrofit-Sample-App"
})
@GET("/users/{username}")
User getUser(@Path("username") String username);

```
请求头不会被互相覆盖，所有拥有相同名字的请求头都会被包含在请求里。

一个请求头可以使用`@Header`注解动态的更新，并且必须为`@Header`提供一个相应的字符串参数。如果值为空，请求头将被忽略。

```java
@GET("/user")
void getUser(@Header("Authorization") String authorization, Callback<User> callback)

```

如果请求头需要被添加到所有的请求中，可以使用一个RequestInterceptor进行指定。在下面的代码中创建了一个`RequestInterceptor`，它为每一个请求都添加了一个`User-Agent`请求头。

```java
RequestInterceptor requestInterceptor = new RequestInterceptor() {
  @Override
  public void intercept(RequestFacade request) {
    request.addHeader("User-Agent", "Retrofit-Sample-App");
  }
};

RestAdapter restAdapter = new RestAdapter.Builder()
  .setEndpoint("https://api.github.com")
  .setRequestInterceptor(requestInterceptor)
  .build();

```

<h4 id="2.6.同步和异步加载">2.6.同步和异步加载</h4>


可以声明方法是同步执行还是异步执行。

带有返回值类型的方法将被同步执行。

```java
@GET("/user/{id}/photo")
Photo getUserPhoto(@Path("id") int id);

```

异步执行要求方法的最后一个参数是`Callback`，反省类型为请求的返回值，如果没有返回值或者不需要对返回值进行处理可以设置成`Callback<Void>`

```java
@GET("/user/{id}/photo")
void getUserPhoto(@Path("id") int id, Callback<Photo> cb);

```


在android中，`callbacks`在主线程中被执行。对于桌面应用，回调和执行HTTP请求在同一线程中。

Retrofit集成了RxJava，允许方法返回一个`rx.Observable`类型。

```Java
@GET("/user/{id}/photo")
Observable<Photo> getUserPhoto(@Path("id") int id);

```

Observable请求被异步的订阅并且在执行HTTP请求的线程中被观察。如果希望在不同的线程中观察，调用`observeOn(Scheduler)`返回`Observable`。

<h4 id="2.7.返回数据类型">2.7.返回数据类型</h4>

如果你的接口返回的是JSON数据类型，`RestAdapter`会自动转换为方法声明的或者CallBack和Observable中指定的对象。如果是XML或其它数据类型，则需要自定义`RestAdapter`转换器。关于如何自定义`RestAdapter`转换器，将在下面的文章中讲到。

```java

@GET("/users/list")
List<User> userList();

@GET("/users/list")
void userList(Callback<List<User>> cb);

@GET("/users/list")
Observable<List<User>> userList();

```

如果不希望返回值被处理成指定的类型，则可以通过在方法返回值声明、CallBack以及Observable中使用`Response`对象来实现。

```java

@GET("/users/list")
Response userList();

@GET("/users/list")
void userList(Callback<Response> cb);

@GET("/users/list")
Observable<Response> userList();

```


<h3 id="3.RestAdapter配置">3.RestAdapter配置</h3>

除了使用Retrofit提供的默认RestAdapter以外，我们还可以进行设置转换器和设置客户端等自定义操作


<h4 id="3.1.设置自定义转换器">3.1.设置自定义转换器</h4>


Retrofit使用未进行任何配置的GSON来转换数据，如果希望使用经过GsonBuilder配置过的Gson，需要创建一个新的GsonConvert。

```java

Gson gson = new GsonBuilder()
    .setFieldNamingPolicy(FieldNamingPolicy.LOWER_CASE_WITH_UNDERSCORES)
    .registerTypeAdapter(Date.class, new DateTypeAdapter())
    .create();

RestAdapter restAdapter = new RestAdapter.Builder()
    .setEndpoint("https://api.github.com")
    .setConverter(new GsonConverter(gson))
    .build();

GitHubService service = restAdapter.create(GitHubService.class);

```

如果请求返回值是XML或者`Protocol Buffers`格式，Retrofit也提供了XML和`Protocol Buffers`格式的转换器。


下面的代码演示了如何使用`SimpleXMLConvert`。

```java
RestAdapter restAdapter = new RestAdapter.Builder()
    .setEndpoint("https://api.soundcloud.com")
    .setConverter(new SimpleXMLConverter())
    .build();

SoundCloudService service = restAdapter.create(SoundCloudService.class);

```

`ProtoConverter`使用

```java

RestAdapter restAdapter = new RestAdapter.Builder()
    .setEndpoint("https://api.example.com")
    .setConverter(new ProtoConverter())
    .build();

```


如果你需要使用Retrofit不提供的内容格式来进行数据交换或者你想使用其他的库来转换已经存在的格式，可以通过实现Convert接口创建自己的转换器。

<h4 id="3.2.自定义错误处理">3.2.自定义错误处理</h4>



提供自定义的`ErrorHandler`可以自定义错误处理，下面的代码中演示了当返回401如何抛出一个自定义异常。

```java

class MyErrorHandler implements ErrorHandler {
  @Override public Throwable handleError(RetrofitError cause) {
    Response r = cause.getResponse();
    if (r != null && r.getStatus() == 401) {
      return new UnauthorizedException(cause);
    }
    return cause;
  }
}

RestAdapter restAdapter = new RestAdapter.Builder()
    .setEndpoint("https://api.github.com")
    .setErrorHandler(new MyErrorHandler())
    .build();


```

<h4 id="3.3.设置Log">3.3.设置Log</h4>

`RestAdapter`可以通过setLogLevel方法配置Log的级别，打印不同的Log信息。Retrofit提供了`BASIC`,`FULL`,`HEADERS`和`NONE`等四种Log过滤条件。

```java

RestAdapter restAdapter = new RestAdapter.Builder()
    .setLogLevel(RestAdapter.LogLevel.FULL)
    .setEndpoint("https://api.github.com")
    .build();


```

<h3 id="4.Retrofit源码分析">4.Retrofit源码分析</h3>

<h4 id="4.1RestAdapter配置分析">4.1RestAdapter配置分析</h4>

我们先从`RestAdapter`的`build()`方法入手，当不设置某些配置时，就会获取默认的配置。

```java

   /** Create the {@link RestAdapter} instances. */
    public RestAdapter build() {
      if (endpoint == null) {
        throw new IllegalArgumentException("Endpoint may not be null.");
      }
      ensureSaneDefaults();
      return new RestAdapter(endpoint, clientProvider, httpExecutor, callbackExecutor,
          requestInterceptor, converter, profiler, errorHandler, log, logLevel);
    }

  private void ensureSaneDefaults() {
      if (converter == null) {
        converter = Platform.get().defaultConverter();
      }
      if (clientProvider == null) {
        clientProvider = Platform.get().defaultClient();
      }
      if (httpExecutor == null) {
        httpExecutor = Platform.get().defaultHttpExecutor();
      }
      if (callbackExecutor == null) {
        callbackExecutor = Platform.get().defaultCallbackExecutor();
      }
      if (errorHandler == null) {
        errorHandler = ErrorHandler.DEFAULT;
      }
      if (log == null) {
        log = Platform.get().defaultLog();
      }
      if (requestInterceptor == null) {
        requestInterceptor = RequestInterceptor.NONE;
      }
    }

```

```java
 /** Provides sane defaults for operation on Android. */
  private static class Android extends Platform {
    @Override Converter defaultConverter() {
      return new GsonConverter(new Gson());
    }

    @Override Client.Provider defaultClient() {
      final Client client;
      if (hasOkHttpOnClasspath()) {
        client = OkClientInstantiator.instantiate();
      } else if (Build.VERSION.SDK_INT < Build.VERSION_CODES.GINGERBREAD) {
        client = new AndroidApacheClient();
      } else {
        client = new UrlConnectionClient();
      }
      return new Client.Provider() {
        @Override public Client get() {
          return client;
        }
      };
    }

    @Override Executor defaultHttpExecutor() {
      return Executors.newCachedThreadPool(new ThreadFactory() {
        @Override public Thread newThread(final Runnable r) {
          return new Thread(new Runnable() {
            @Override public void run() {
              Process.setThreadPriority(THREAD_PRIORITY_BACKGROUND);
              r.run();
            }
          }, RestAdapter.IDLE_THREAD_NAME);
        }
      });
    }

    @Override Executor defaultCallbackExecutor() {
      return new MainThreadExecutor();
    }

    @Override RestAdapter.Log defaultLog() {
      return new AndroidLog("Retrofit");
    }
  }
```

接下来看`RestAdapter`的`create`方法。

```java
  /** Create an implementation of the API defined by the specified {@code service} interface. */
  @SuppressWarnings("unchecked")
  public <T> T create(Class<T> service) {
    Utils.validateServiceClass(service);
    return (T) Proxy.newProxyInstance(service.getClassLoader(), new Class<?>[] { service },
        new RestHandler(getMethodInfoCache(service)));
  }

```
`create`方法创建了一个代理

```java
 private class RestHandler implements InvocationHandler {

...
    @Override public Object invoke(Object proxy, Method method, final Object[] args)
        throws Throwable {

      // Load or create the details cache for the current method.
      final RestMethodInfo methodInfo = getMethodInfo(methodDetailsCache, method);

      if (methodInfo.isSynchronous) {
        try {
         //调用请求
          return invokeRequest(requestInterceptor, methodInfo, args);
        } catch (RetrofitError error) {
          Throwable newError = errorHandler.handleError(error);
          if (newError == null) {
            throw new IllegalStateException("Error handler returned null for wrapped exception.",
                error);
          }
          throw newError;
        }
      }
      ...

 }
```

<h4 id="4.2解析请求方法">4.2解析请求方法</h4>

`RestMethodInfo`用来封装网络请求方法的信息。

`parseResponseType`方法获取返回值类型。

```java
 /** Loads {@link #responseObjectType}. Returns {@code true} if method is synchronous. */
  private ResponseType parseResponseType() {
    // Synchronous methods have a non-void return type.
    // Observable methods have a return type of Observable.
    Type returnType = method.getGenericReturnType();

    // Asynchronous methods should have a Callback type as the last argument.
    Type lastArgType = null;
    // 最后一个参数
    Class<?> lastArgClass = null;
    Type[] parameterTypes = method.getGenericParameterTypes();
    if (parameterTypes.length > 0) {
    // 获取最后一个参数
      Type typeToCheck = parameterTypes[parameterTypes.length - 1];
      lastArgType = typeToCheck;
      if (typeToCheck instanceof ParameterizedType) {
        typeToCheck = ((ParameterizedType) typeToCheck).getRawType();
      }
      if (typeToCheck instanceof Class) {
        lastArgClass = (Class<?>) typeToCheck;
      }
    }

    boolean hasReturnType = returnType != void.class;
    boolean hasCallback = lastArgClass != null && Callback.class.isAssignableFrom(lastArgClass);

    // Check for invalid configurations.
    if (hasReturnType && hasCallback) {
      throw methodError("Must have return type or Callback as last argument, not both.");
    }
    if (!hasReturnType && !hasCallback) {
      throw methodError("Must have either a return type or Callback as last argument.");
    }
    // 如果有返回值类型
    if (hasReturnType) {
      if (Platform.HAS_RX_JAVA) {
        Class rawReturnType = Types.getRawType(returnType);
        if (RxSupport.isObservable(rawReturnType)) {
          returnType = RxSupport.getObservableType(returnType, rawReturnType);
          responseObjectType = getParameterUpperBound((ParameterizedType) returnType);
          return ResponseType.OBSERVABLE;
        }
      }
      responseObjectType = returnType;
      return ResponseType.OBJECT;
    }

    lastArgType = Types.getSupertype(lastArgType, Types.getRawType(lastArgType), Callback.class);
    if (lastArgType instanceof ParameterizedType) {
      responseObjectType = getParameterUpperBound((ParameterizedType) lastArgType);
      return ResponseType.VOID;
    }

    throw methodError("Last parameter must be of type Callback<X> or Callback<? super X>.");
  }
```


```java
/** Loads {@link #requestMethod} and {@link #requestType}. */
  private void parseMethodAnnotations() {
    for (Annotation methodAnnotation : method.getAnnotations()) {
      Class<? extends Annotation> annotationType = methodAnnotation.annotationType();
      RestMethod methodInfo = null;

      // Look for a @RestMethod annotation on the parameter annotation indicating request method.
      // 获取RestMethod注解
      for (Annotation innerAnnotation : annotationType.getAnnotations()) {
        if (RestMethod.class == innerAnnotation.annotationType()) {
          methodInfo = (RestMethod) innerAnnotation;
          break;
        }
      }

      if (methodInfo != null) {
        if (requestMethod != null) {
          throw methodError("Only one HTTP method is allowed. Found: %s and %s.", requestMethod,
              methodInfo.value());
        }
        String path;
        try {
        // 获取路径
          path = (String) annotationType.getMethod("value").invoke(methodAnnotation);
        } catch (Exception e) {
          throw methodError("Failed to extract String 'value' from @%s annotation.",
              annotationType.getSimpleName());
        }
        parsePath(path);
        requestMethod = methodInfo.value();
        requestHasBody = methodInfo.hasBody();
      } else if (annotationType == Headers.class) {
        String[] headersToParse = ((Headers) methodAnnotation).value();
        if (headersToParse.length == 0) {
          throw methodError("@Headers annotation is empty.");
        }
        headers = parseHeaders(headersToParse);
      } else if (annotationType == Multipart.class) {
        if (requestType != RequestType.SIMPLE) {
          throw methodError("Only one encoding annotation is allowed.");
        }
        requestType = RequestType.MULTIPART;
      } else if (annotationType == FormUrlEncoded.class) {
        if (requestType != RequestType.SIMPLE) {
          throw methodError("Only one encoding annotation is allowed.");
        }
        requestType = RequestType.FORM_URL_ENCODED;
      } else if (annotationType == Streaming.class) {
        if (responseObjectType != Response.class) {
          throw methodError(
              "Only methods having %s as data type are allowed to have @%s annotation.",
              Response.class.getSimpleName(), Streaming.class.getSimpleName());
        }
        isStreaming = true;
      }
    }

    if (requestMethod == null) {
      throw methodError("HTTP method annotation is required (e.g., @GET, @POST, etc.).");
    }
    if (!requestHasBody) {
      if (requestType == RequestType.MULTIPART) {
        throw methodError(
            "Multipart can only be specified on HTTP methods with request body (e.g., @POST).");
      }
      if (requestType == RequestType.FORM_URL_ENCODED) {
        throw methodError("FormUrlEncoded can only be specified on HTTP methods with request body "
                + "(e.g., @POST).");
      }
    }
  }

```

<h4 id="4.3构建请求">4.3构建请求</h4>

<h4 id="4.4发送请求">4.4发送请求</h4>

```java

 private Object invokeRequest(RequestInterceptor requestInterceptor, RestMethodInfo methodInfo,
        Object[] args) {
      String url = null;
      try {
       ...
       //构建请求
        RequestBuilder requestBuilder = new RequestBuilder(serverUrl, methodInfo, converter);
        requestBuilder.setArguments(args);
        requestInterceptor.intercept(requestBuilder);
        Request request = requestBuilder.build();
       ...
       //请求网络
        Response response = clientProvider.get().execute(request);


        int statusCode = response.getStatus();
        if (profiler != null) {
          RequestInformation requestInfo = getRequestInfo(serverUrl, methodInfo, request);
          //noinspection unchecked
          profiler.afterCall(requestInfo, elapsedTime, statusCode, profilerObject);
        }

        if (logLevel.log()) {
          // Log the response data.
          response = logAndReplaceResponse(url, response, elapsedTime);
        }

        Type type = methodInfo.responseObjectType;

        if (statusCode >= 200 && statusCode < 300) { // 2XX == successful request
          // Caller requested the raw Response object directly.
          if (type.equals(Response.class)) {
            if (!methodInfo.isStreaming) {
              // Read the entire stream and replace with one backed by a byte[].
              response = Utils.readBodyToBytesIfNecessary(response);
            }

            if (methodInfo.isSynchronous) {
              return response;
            }
            return new ResponseWrapper(response, response);
          }

          TypedInput body = response.getBody();
          if (body == null) {
            if (methodInfo.isSynchronous) {
              return null;
            }
            return new ResponseWrapper(response, null);
          }

          ExceptionCatchingTypedInput wrapped = new ExceptionCatchingTypedInput(body);
          try {
            Object convert = converter.fromBody(wrapped, type);
            logResponseBody(body, convert);
            if (methodInfo.isSynchronous) {
              return convert;
            }
            return new ResponseWrapper(response, convert);
          } catch (ConversionException e) {
            // If the underlying input stream threw an exception, propagate that rather than
            // indicating that it was a conversion exception.
            if (wrapped.threwException()) {
              throw wrapped.getThrownException();
            }

            // The response body was partially read by the converter. Replace it with null.
            response = Utils.replaceResponseBody(response, null);

            throw RetrofitError.conversionError(url, response, converter, type, e);
          }
        }

        response = Utils.readBodyToBytesIfNecessary(response);
        throw RetrofitError.httpError(url, response, converter, type);
      } catch (RetrofitError e) {
        throw e; // Pass through our own errors.
      } catch (IOException e) {
        if (logLevel.log()) {
          logException(e, url);
        }
        throw RetrofitError.networkError(url, e);
      } catch (Throwable t) {
        if (logLevel.log()) {
          logException(t, url);
        }
        throw RetrofitError.unexpectedError(url, t);
      } finally {
        if (!methodInfo.isSynchronous) {
          Thread.currentThread().setName(IDLE_THREAD_NAME);
        }
      }
    }
  }



```

```java
/** Retrofit client that uses {@link HttpURLConnection} for communication. */
public class UrlConnectionClient implements Client {
  private static final int CHUNK_SIZE = 4096;

  public UrlConnectionClient() {
  }

  @Override public Response execute(Request request) throws IOException {
    HttpURLConnection connection = openConnection(request);
    prepareRequest(connection, request);
    return readResponse(connection);
  }

  protected HttpURLConnection openConnection(Request request) throws IOException {
    HttpURLConnection connection =
        (HttpURLConnection) new URL(request.getUrl()).openConnection();
    connection.setConnectTimeout(Defaults.CONNECT_TIMEOUT_MILLIS);
    connection.setReadTimeout(Defaults.READ_TIMEOUT_MILLIS);
    return connection;
  }

  void prepareRequest(HttpURLConnection connection, Request request) throws IOException {
    connection.setRequestMethod(request.getMethod());
    connection.setDoInput(true);

    for (Header header : request.getHeaders()) {
      connection.addRequestProperty(header.getName(), header.getValue());
    }

    TypedOutput body = request.getBody();
    if (body != null) {
      connection.setDoOutput(true);
      connection.addRequestProperty("Content-Type", body.mimeType());
      long length = body.length();
      if (length != -1) {
        connection.setFixedLengthStreamingMode((int) length);
        connection.addRequestProperty("Content-Length", String.valueOf(length));
      } else {
        connection.setChunkedStreamingMode(CHUNK_SIZE);
      }
      body.writeTo(connection.getOutputStream());
    }
  }

  Response readResponse(HttpURLConnection connection) throws IOException {
    int status = connection.getResponseCode();
    String reason = connection.getResponseMessage();
    if (reason == null) reason = ""; // HttpURLConnection treats empty reason as null.

    List<Header> headers = new ArrayList<Header>();
    for (Map.Entry<String, List<String>> field : connection.getHeaderFields().entrySet()) {
      String name = field.getKey();
      for (String value : field.getValue()) {
        headers.add(new Header(name, value));
      }
    }

    String mimeType = connection.getContentType();
    int length = connection.getContentLength();
    InputStream stream;
    if (status >= 400) {
      stream = connection.getErrorStream();
    } else {
      stream = connection.getInputStream();
    }
    TypedInput responseBody = new TypedInputStream(mimeType, length, stream);
    return new Response(connection.getURL().toString(), status, reason, headers, responseBody);
  }

  private static class TypedInputStream implements TypedInput {
    private final String mimeType;
    private final long length;
    private final InputStream stream;

    private TypedInputStream(String mimeType, long length, InputStream stream) {
      this.mimeType = mimeType;
      this.length = length;
      this.stream = stream;
    }

    @Override public String mimeType() {
      return mimeType;
    }

    @Override public long length() {
      return length;
    }

    @Override public InputStream in() throws IOException {
      return stream;
    }
  }
}
```




[Retrofit]: http://square.github.io/retrofit/
[Rest]: http://zh.wikipedia.org/wiki/REST
[retrofit-converters]: https://github.com/square/retrofit/tree/master/retrofit-converters

<h3 id="参考">参考</h3>

* [理解RESTful架构](http://www.ruanyifeng.com/blog/2011/09/restful.html)

* [RESTful API 设计指南](http://www.ruanyifeng.com/blog/2014/05/restful_api.html)


