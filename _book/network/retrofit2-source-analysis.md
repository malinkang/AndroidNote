基本流程：
1.通过ServiceMethod获取请求参数和请求信息
2.创建OkhttpCall
3.获取对应的CallAdapter，然后调用adapt方法并将OkhttpCall传入。
4.在CallAdapter的adapt方法中执行OkhttpCall的execute方法，并调用ServiceMethod中的ConvertAdapter将返回结果转换为相应的实体。


#### ServiceMethod  

ServiceMethod主要用来解析我们声明的方法。
1.Builder构造函数中获取方法上的注解和注解里的值。
2.调用createCallAdapter方法获取CallAdapter。
3.调用createResponseConverter方法获取Converter。
4.调用parseMethodAnnotation来解析方法上的注解
5.调用parseParameterAnnotation来解析参数上的注解，并将这些注解包含的信息封装成一个ParameterHandler对象。
6.在OkHttpCall中调用toRequest的方法来获取请求的参数。
```java
public Builder(Retrofit retrofit, Method method) {
  this.retrofit = retrofit;
  this.method = method;
  this.methodAnnotations = method.getAnnotations();//获取方法上的注解
  this.parameterTypes = method.getGenericParameterTypes();//获取参数类型
  this.parameterAnnotationsArray = method.getParameterAnnotations();//获取参数上的注解  这里是一个二维数组，每个参数可能有多个注解
}
```
createCallAdapter方法获取方法的返回值和注解，根据注解和返回值获取对应的CallAdapter。

```java
private CallAdapter<T, R> createCallAdapter() {
  Type returnType = method.getGenericReturnType();//获取返回值
  //校验返回值类型
  if (Utils.hasUnresolvableType(returnType)) {
    throw methodError(
        "Method return type must not include a type variable or wildcard: %s", returnType);
  }
  if (returnType == void.class) {
    throw methodError("Service methods cannot return void.");
  }
  Annotation[] annotations = method.getAnnotations();
  try {
    //noinspection unchecked
    //调用Retrofit的 callAdapter方法来获取CallAdapter
    return (CallAdapter<T, R>) retrofit.callAdapter(returnType, annotations);
  } catch (RuntimeException e) { // Wide exception range because factories are user code.
    throw methodError(e, "Unable to create call adapter for %s", returnType);
  }
}
```

Retrofit的callAdapter方法

```java
public CallAdapter<?, ?> callAdapter(Type returnType, Annotation[] annotations) {
return nextCallAdapter(null, returnType, annotations);
}
public CallAdapter<?, ?> nextCallAdapter(CallAdapter.Factory skipPast, Type returnType,
  Annotation[] annotations) {
checkNotNull(returnType, "returnType == null");
checkNotNull(annotations, "annotations == null");
int start = adapterFactories.indexOf(skipPast) + 1;
for (int i = start, count = adapterFactories.size(); i < count; i++) {
    //调用CallAdapter.Factory的get方法来获取对应的CallAdapter
    //这里看出是根据返回值类型来获取不同的CallAdapter
    //
  CallAdapter<?,?> adapter = adapterFactories.get(i).get(returnType, annotations, this);
  if (adapter != null) {
    return adapter;
  }
}
StringBuilder builder = new StringBuilder("Could not locate call adapter for ")
    .append(returnType)
    .append(".\n");
if (skipPast != null) {
  builder.append("  Skipped:");
  for (int i = 0; i < start; i++) {
    builder.append("\n   * ").append(adapterFactories.get(i).getClass().getName());
  }
  builder.append('\n');
}
builder.append("  Tried:");
for (int i = start, count = adapterFactories.size(); i < count; i++) {
  builder.append("\n   * ").append(adapterFactories.get(i).getClass().getName());
}
throw new IllegalArgumentException(builder.toString());
}
```


```java
public ServiceMethod build() {
  callAdapter = createCallAdapter();//创建CallAdapter
  responseType = callAdapter.responseType();//获取返回值类型
  if (responseType == Response.class || responseType == okhttp3.Response.class) {
    throw methodError("'"
        + Utils.getRawType(responseType).getName()
        + "' is not a valid response body type. Did you mean ResponseBody?");
  }
  responseConverter = createResponseConverter();//创建ResponseConverter

  for (Annotation annotation : methodAnnotations) {
    parseMethodAnnotation(annotation);//遍历解析方法注解
  }

  if (httpMethod == null) {
    throw methodError("HTTP method annotation is required (e.g., @GET, @POST, etc.).");
  }

  if (!hasBody) {
    if (isMultipart) {
      throw methodError(
          "Multipart can only be specified on HTTP methods with request body (e.g., @POST).");
    }
    if (isFormEncoded) {
      throw methodError("FormUrlEncoded can only be specified on HTTP methods with "
          + "request body (e.g., @POST).");
    }
  }

  int parameterCount = parameterAnnotationsArray.length;//获取参数注解长度
  parameterHandlers = new ParameterHandler<?>[parameterCount];//创建参数处理的数组
  //遍历每个参数
  for (int p = 0; p < parameterCount; p++) {
    Type parameterType = parameterTypes[p];
    //校验每个参数的类型
    if (Utils.hasUnresolvableType(parameterType)) {
      throw parameterError(p, "Parameter type must not include a type variable or wildcard: %s",
          parameterType);
    }
    //单个参数上的注解
    Annotation[] parameterAnnotations = parameterAnnotationsArray[p];
    if (parameterAnnotations == null) {
      throw parameterError(p, "No Retrofit annotation found.");
    }

    parameterHandlers[p] = parseParameter(p, parameterType, parameterAnnotations);
  }

  if (relativeUrl == null && !gotUrl) {
    throw methodError("Missing either @%s URL or @Url parameter.", httpMethod);
  }
  if (!isFormEncoded && !isMultipart && !hasBody && gotBody) {
    throw methodError("Non-body HTTP method cannot contain @Body.");
  }
  if (isFormEncoded && !gotField) {
    throw methodError("Form-encoded method must contain at least one @Field.");
  }
  if (isMultipart && !gotPart) {
    throw methodError("Multipart method must contain at least one @Part.");
  }

  return new ServiceMethod<>(this);
}
```

```java
private void parseMethodAnnotation(Annotation annotation) {
  if (annotation instanceof DELETE) {
    parseHttpMethodAndPath("DELETE", ((DELETE) annotation).value(), false);
  } else if (annotation instanceof GET) {
    parseHttpMethodAndPath("GET", ((GET) annotation).value(), false);
  } else if (annotation instanceof HEAD) {
    parseHttpMethodAndPath("HEAD", ((HEAD) annotation).value(), false);
    if (!Void.class.equals(responseType)) {
      throw methodError("HEAD method must use Void as response type.");
    }
  } else if (annotation instanceof PATCH) {
    parseHttpMethodAndPath("PATCH", ((PATCH) annotation).value(), true);
  } else if (annotation instanceof POST) {
    parseHttpMethodAndPath("POST", ((POST) annotation).value(), true);
  } else if (annotation instanceof PUT) {
    parseHttpMethodAndPath("PUT", ((PUT) annotation).value(), true);
  } else if (annotation instanceof OPTIONS) {
    parseHttpMethodAndPath("OPTIONS", ((OPTIONS) annotation).value(), false);
  } else if (annotation instanceof HTTP) {
    HTTP http = (HTTP) annotation;
    parseHttpMethodAndPath(http.method(), http.path(), http.hasBody());
  } else if (annotation instanceof retrofit2.http.Headers) {
    String[] headersToParse = ((retrofit2.http.Headers) annotation).value();
    if (headersToParse.length == 0) {
      throw methodError("@Headers annotation is empty.");
    }
    headers = parseHeaders(headersToParse);
  } else if (annotation instanceof Multipart) {
    if (isFormEncoded) {
      throw methodError("Only one encoding annotation is allowed.");
    }
    isMultipart = true;
  } else if (annotation instanceof FormUrlEncoded) {
    if (isMultipart) {
      throw methodError("Only one encoding annotation is allowed.");
    }
    isFormEncoded = true;
  }
}
```

ParameterHandler最主要的方法就是apply方法，该方法的作用是为build添加参数。
```java
abstract void apply(RequestBuilder builder, T value) throws IOException;

  final ParameterHandler<Iterable<T>> iterable() {
    return new ParameterHandler<Iterable<T>>() {
      @Override void apply(RequestBuilder builder, Iterable<T> values) throws IOException {
        if (values == null) return; // Skip null values.

        for (T value : values) {
          ParameterHandler.this.apply(builder, value);
        }
      }
    };
  }

  final ParameterHandler<Object> array() {
    return new ParameterHandler<Object>() {
      @Override void apply(RequestBuilder builder, Object values) throws IOException {
        if (values == null) return; // Skip null values.

        for (int i = 0, size = Array.getLength(values); i < size; i++) {
          //noinspection unchecked
          ParameterHandler.this.apply(builder, (T) Array.get(values, i));
        }
      }
    };
  }

```
ServiceMethod的toRequest先创建一个RequestBuilder，然后遍历参数，依次向build中添加参数。
```java
 /** Builds an HTTP request from method arguments. */
  Request toRequest(Object... args) throws IOException {
    RequestBuilder requestBuilder = new RequestBuilder(httpMethod, baseUrl, relativeUrl, headers,
        contentType, hasBody, isFormEncoded, isMultipart);

    @SuppressWarnings("unchecked") // It is an error to invoke a method with the wrong arg types.
    ParameterHandler<Object>[] handlers = (ParameterHandler<Object>[]) parameterHandlers;

    int argumentCount = args != null ? args.length : 0;
    if (argumentCount != handlers.length) {
      throw new IllegalArgumentException("Argument count (" + argumentCount
          + ") doesn't match expected count (" + handlers.length + ")");
    }

    for (int p = 0; p < argumentCount; p++) {
      handlers[p].apply(requestBuilder, args[p]);
    }

    return requestBuilder.build();
  }

  /** Builds a method return value from an HTTP response body. */
  R toResponse(ResponseBody body) throws IOException {
    return responseConverter.convert(body);
  }
```

RequestBuilder用来构建请求的Request。

```java
final class RequestBuilder {
  private static final char[] HEX_DIGITS =
      { '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F' };
  private static final String PATH_SEGMENT_ALWAYS_ENCODE_SET = " \"<>^`{}|\\?#";

  private final String method;

  private final HttpUrl baseUrl;
  private String relativeUrl;
  private HttpUrl.Builder urlBuilder;

  private final Request.Builder requestBuilder;
  private MediaType contentType;

  private final boolean hasBody;
  private MultipartBody.Builder multipartBuilder;
  private FormBody.Builder formBuilder;
  private RequestBody body;

  RequestBuilder(String method, HttpUrl baseUrl, String relativeUrl, Headers headers,
      MediaType contentType, boolean hasBody, boolean isFormEncoded, boolean isMultipart) {
    this.method = method;
    this.baseUrl = baseUrl;
    this.relativeUrl = relativeUrl;
    this.requestBuilder = new Request.Builder();
    this.contentType = contentType;
    this.hasBody = hasBody;

    if (headers != null) {
      requestBuilder.headers(headers);//添加header
    }

    if (isFormEncoded) {//form请求
      // Will be set to 'body' in 'build'.
      formBuilder = new FormBody.Builder();
    } else if (isMultipart) {
      // Will be set to 'body' in 'build'.
      multipartBuilder = new MultipartBody.Builder();
      multipartBuilder.setType(MultipartBody.FORM);
    }
  }

  void setRelativeUrl(Object relativeUrl) {
    if (relativeUrl == null) throw new NullPointerException("@Url parameter is null.");
    this.relativeUrl = relativeUrl.toString();
  }

  void addHeader(String name, String value) {
    if ("Content-Type".equalsIgnoreCase(name)) {
      MediaType type = MediaType.parse(value);
      if (type == null) {
        throw new IllegalArgumentException("Malformed content type: " + value);
      }
      contentType = type;
    } else {
      requestBuilder.addHeader(name, value);
    }
  }

  void addPathParam(String name, String value, boolean encoded) {
    if (relativeUrl == null) {
      // The relative URL is cleared when the first query parameter is set.
      throw new AssertionError();
    }
    relativeUrl = relativeUrl.replace("{" + name + "}", canonicalizeForPath(value, encoded));
  }

  private static String canonicalizeForPath(String input, boolean alreadyEncoded) {
    int codePoint;
    for (int i = 0, limit = input.length(); i < limit; i += Character.charCount(codePoint)) {
      codePoint = input.codePointAt(i);
      if (codePoint < 0x20 || codePoint >= 0x7f
          || PATH_SEGMENT_ALWAYS_ENCODE_SET.indexOf(codePoint) != -1
          || (!alreadyEncoded && (codePoint == '/' || codePoint == '%'))) {
        // Slow path: the character at i requires encoding!
        Buffer out = new Buffer();
        out.writeUtf8(input, 0, i);
        canonicalizeForPath(out, input, i, limit, alreadyEncoded);
        return out.readUtf8();
      }
    }

    // Fast path: no characters required encoding.
    return input;
  }

  private static void canonicalizeForPath(Buffer out, String input, int pos, int limit,
      boolean alreadyEncoded) {
    Buffer utf8Buffer = null; // Lazily allocated.
    int codePoint;
    for (int i = pos; i < limit; i += Character.charCount(codePoint)) {
      codePoint = input.codePointAt(i);
      if (alreadyEncoded
          && (codePoint == '\t' || codePoint == '\n' || codePoint == '\f' || codePoint == '\r')) {
        // Skip this character.
      } else if (codePoint < 0x20 || codePoint >= 0x7f
          || PATH_SEGMENT_ALWAYS_ENCODE_SET.indexOf(codePoint) != -1
          || (!alreadyEncoded && (codePoint == '/' || codePoint == '%'))) {
        // Percent encode this character.
        if (utf8Buffer == null) {
          utf8Buffer = new Buffer();
        }
        utf8Buffer.writeUtf8CodePoint(codePoint);
        while (!utf8Buffer.exhausted()) {
          int b = utf8Buffer.readByte() & 0xff;
          out.writeByte('%');
          out.writeByte(HEX_DIGITS[(b >> 4) & 0xf]);
          out.writeByte(HEX_DIGITS[b & 0xf]);
        }
      } else {
        // This character doesn't need encoding. Just copy it over.
        out.writeUtf8CodePoint(codePoint);
      }
    }
  }
//添加get请求参数
  void addQueryParam(String name, String value, boolean encoded) {
    if (relativeUrl != null) {
      // Do a one-time combination of the built relative URL and the base URL.
      urlBuilder = baseUrl.newBuilder(relativeUrl);
      if (urlBuilder == null) {
        throw new IllegalArgumentException(
            "Malformed URL. Base: " + baseUrl + ", Relative: " + relativeUrl);
      }
      relativeUrl = null;
    }
    if (encoded) {
      urlBuilder.addEncodedQueryParameter(name, value);
    } else {
      urlBuilder.addQueryParameter(name, value);
    }
  }
//添加form表单请求参数
  void addFormField(String name, String value, boolean encoded) {
    if (encoded) {
      formBuilder.addEncoded(name, value);
    } else {
      formBuilder.add(name, value);
    }
  }

  void addPart(Headers headers, RequestBody body) {
    multipartBuilder.addPart(headers, body);
  }

  void addPart(MultipartBody.Part part) {
    multipartBuilder.addPart(part);
  }

  void setBody(RequestBody body) {
    this.body = body;
  }

  Request build() {
    HttpUrl url;
    HttpUrl.Builder urlBuilder = this.urlBuilder;
    if (urlBuilder != null) {
      url = urlBuilder.build();
    } else {
      // No query parameters triggered builder creation, just combine the relative URL and base URL.
      url = baseUrl.resolve(relativeUrl);
      if (url == null) {
        throw new IllegalArgumentException(
            "Malformed URL. Base: " + baseUrl + ", Relative: " + relativeUrl);
      }
    }

    RequestBody body = this.body;
    if (body == null) {
      // Try to pull from one of the builders.
      if (formBuilder != null) {
        body = formBuilder.build();
      } else if (multipartBuilder != null) {
        body = multipartBuilder.build();
      } else if (hasBody) {
        // Body is absent, make an empty body.
        body = RequestBody.create(null, new byte[0]);
      }
    }

    MediaType contentType = this.contentType;
    if (contentType != null) {
      if (body != null) {
        body = new ContentTypeOverridingRequestBody(body, contentType);
      } else {
        requestBuilder.addHeader("Content-Type", contentType.toString());
      }
    }

    return requestBuilder
        .url(url)
        .method(method, body)
        .build();
  }

  private static class ContentTypeOverridingRequestBody extends RequestBody {
    private final RequestBody delegate;
    private final MediaType contentType;

    ContentTypeOverridingRequestBody(RequestBody delegate, MediaType contentType) {
      this.delegate = delegate;
      this.contentType = contentType;
    }

    @Override public MediaType contentType() {
      return contentType;
    }

    @Override public long contentLength() throws IOException {
      return delegate.contentLength();
    }

    @Override public void writeTo(BufferedSink sink) throws IOException {
      delegate.writeTo(sink);
    }
  }
}

```

#### OkHttpCall
OkHttpCall算是OkHttp的包装类，用它跟OkHttp对接，所有OkHttp需要的参数都可以看这个类。当然也还是可以扩展一个新的Call的，比如HttpUrlConnectionCall。

```java
@Override public Response<T> execute() throws IOException {
okhttp3.Call call;
synchronized (this) {
  if (executed) throw new IllegalStateException("Already executed.");
  executed = true;
  if (creationFailure != null) {
    if (creationFailure instanceof IOException) {
      throw (IOException) creationFailure;
    } else {
      throw (RuntimeException) creationFailure;
    }
  }
  call = rawCall;
  if (call == null) {
    try {
      call = rawCall = createRawCall();
    } catch (IOException | RuntimeException e) {
      creationFailure = e;
      throw e;
    }
  }
}
if (canceled) {
  call.cancel();
}
return parseResponse(call.execute());
}
```

```java
private okhttp3.Call createRawCall() throws IOException {
Request request = serviceMethod.toRequest(args);//构建请求参数
okhttp3.Call call = serviceMethod.callFactory.newCall(request);//执行请求
if (call == null) {
  throw new NullPointerException("Call.Factory returned null.");
}
return call;
}
```
```java
//解析返回值
Response<T> parseResponse(okhttp3.Response rawResponse) throws IOException {
ResponseBody rawBody = rawResponse.body();
// Remove the body's source (the only stateful object) so we can pass the response along.
rawResponse = rawResponse.newBuilder()
    .body(new NoContentResponseBody(rawBody.contentType(), rawBody.contentLength()))
    .build();

int code = rawResponse.code();
if (code < 200 || code >= 300) {
  try {
    // Buffer the entire body to avoid future I/O.
    ResponseBody bufferedBody = Utils.buffer(rawBody);
    return Response.error(bufferedBody, rawResponse);
  } finally {
    rawBody.close();
  }
}
if (code == 204 || code == 205) {
  return Response.success(null, rawResponse);
}
ExceptionCatchingRequestBody catchingBody = new ExceptionCatchingRequestBody(rawBody);
try {
  T body = serviceMethod.toResponse(catchingBody);//将body转化为实体
  return Response.success(body, rawResponse);
} catch (RuntimeException e) {
  // If the underlying source threw an exception, propagate that rather than indicating it was
  // a runtime exception.
  catchingBody.throwIfCaught();
  throw e;
}
}
```

```java
 Response<T> parseResponse(okhttp3.Response rawResponse) throws IOException {
    ResponseBody rawBody = rawResponse.body();

    // Remove the body's source (the only stateful object) so we can pass the response along.
    rawResponse = rawResponse.newBuilder()
        .body(new NoContentResponseBody(rawBody.contentType(), rawBody.contentLength()))
        .build();

    int code = rawResponse.code();
    if (code < 200 || code >= 300) {
      try {
        // Buffer the entire body to avoid future I/O.
        ResponseBody bufferedBody = Utils.buffer(rawBody);
        return Response.error(bufferedBody, rawResponse);
      } finally {
        rawBody.close();
      }
    }

    if (code == 204 || code == 205) {
      rawBody.close();
      return Response.success(null, rawResponse);
    }

    ExceptionCatchingRequestBody catchingBody = new ExceptionCatchingRequestBody(rawBody);
    try {
      T body = serviceMethod.toResponse(catchingBody);//将ResponseBody转换为实体
      return Response.success(body, rawResponse);
    } catch (RuntimeException e) {
      // If the underlying source threw an exception, propagate that rather than indicating it was
      // a runtime exception.
      catchingBody.throwIfCaught();
      throw e;
    }
  }

```
#### CallAdapter


RxJavaCallAdapterFactory

Single类和Observable对象类似，只不过Single只能发送单个值，并且Single只能发出一个错误或成功的值，不能发送onComplete通知。

Single的just方法。
```java
public static <T> Single<T> just(final T value) {
    return ScalarSynchronousSingle.create(value);
}
```

```java
Single.create(new Single.OnSubscribe<Object>() {
    @Override
    public void call(SingleSubscriber<? super Object> singleSubscriber) {
      //SingleSubscriber没有onComplete方法
    }
});
```
Completable也和Observable类似，但是Completable不发送值，值发送错误和完成。
```java
Completable.create(new Completable.CompletableOnSubscribe() {
    @Override
    public void call(Completable.CompletableSubscriber completableSubscriber) {
        //CompletableSubscriber 没有onNext方法
    }
});
```
当我们的请求不需要处理返回值的时候我们可以让该请求返回Completable。
```java
public final class RxJavaCallAdapterFactory extends CallAdapter.Factory {
  /**
   * Returns an instance which creates synchronous observables that do not operate on any scheduler
   * by default.
   */
  public static RxJavaCallAdapterFactory create() {
    return new RxJavaCallAdapterFactory(null);
  }

  /**
   * Returns an instance which creates synchronous observables that
   * {@linkplain Observable#subscribeOn(Scheduler) subscribe on} {@code scheduler} by default.
   */
  public static RxJavaCallAdapterFactory createWithScheduler(Scheduler scheduler) {
    if (scheduler == null) throw new NullPointerException("scheduler == null");
    return new RxJavaCallAdapterFactory(scheduler);
  }

  private final Scheduler scheduler;

  private RxJavaCallAdapterFactory(Scheduler scheduler) {
    this.scheduler = scheduler;
  }

  @Override
  public CallAdapter<?, ?> get(Type returnType, Annotation[] annotations, Retrofit retrofit) {
    Class<?> rawType = getRawType(returnType);
    boolean isSingle = rawType == Single.class;//判断返回值是否是Single.class
    boolean isCompletable = "rx.Completable".equals(rawType.getCanonicalName());
    if (rawType != Observable.class && !isSingle && !isCompletable) {
      return null;
    }

    if (isCompletable) {
      return new RxJavaCallAdapter(Void.class, scheduler, false, true, false, true);
    }

    boolean isResult = false;
    boolean isBody = false;
    Type responseType;
    if (!(returnType instanceof ParameterizedType)) {
      String name = isSingle ? "Single" : "Observable";
      throw new IllegalStateException(name + " return type must be parameterized"
          + " as " + name + "<Foo> or " + name + "<? extends Foo>");
    }

    Type observableType = getParameterUpperBound(0, (ParameterizedType) returnType);
    Class<?> rawObservableType = getRawType(observableType);
    if (rawObservableType == Response.class) {
      if (!(observableType instanceof ParameterizedType)) {
        throw new IllegalStateException("Response must be parameterized"
            + " as Response<Foo> or Response<? extends Foo>");
      }
      responseType = getParameterUpperBound(0, (ParameterizedType) observableType);
    } else if (rawObservableType == Result.class) {
      if (!(observableType instanceof ParameterizedType)) {
        throw new IllegalStateException("Result must be parameterized"
            + " as Result<Foo> or Result<? extends Foo>");
      }
      responseType = getParameterUpperBound(0, (ParameterizedType) observableType);
      isResult = true;
    } else {
      responseType = observableType;
      isBody = true;
    }

    return new RxJavaCallAdapter(responseType, scheduler, isResult, isBody, isSingle, false);
  }
}
```


RxJavaCallAdapter的adapt方法
```java
 @Override public Object adapt(Call<R> call) {
    OnSubscribe<Response<R>> callFunc = new CallOnSubscribe<>(call);//创建CallOnSubscribe

    //获取OnSubscribe对象
    OnSubscribe<?> func;
    if (isResult) {
      func = new ResultOnSubscribe<>(callFunc);
    } else if (isBody) {
      func = new BodyOnSubscribe<>(callFunc);

    } else {
      func = callFunc;
    }
    Observable<?> observable = Observable.create(func);

    if (scheduler != null) {
      observable = observable.subscribeOn(scheduler);
    }

    if (isSingle) {
      return observable.toSingle();//Observable转换为Single
    }
    if (isCompletable) {
      return CompletableHelper.toCompletable(observable);//Observable转换为Completable
    }
    return observable;
  }
```
CallOnSubscribe

```java
final class CallOnSubscribe<T> implements OnSubscribe<Response<T>> {
  private final Call<T> originalCall;

  CallOnSubscribe(Call<T> originalCall) {
    this.originalCall = originalCall;
  }

  @Override public void call(Subscriber<? super Response<T>> subscriber) {
    // Since Call is a one-shot type, clone it for each new subscriber.
    Call<T> call = originalCall.clone();//clone 了原来的 call，因为 okhttp3.Call 是只能用一次的，所以每次都是新 clone 一个进行网络请求；
    CallArbiter<T> arbiter = new CallArbiter<>(call, subscriber);
    subscriber.add(arbiter);
    subscriber.setProducer(arbiter);//调用producer的request方法
    Response<T> response;
    try {
      response = call.execute();//调用OkHttpCall的execute()方法返回Response
    } catch (Throwable t) {
      Exceptions.throwIfFatal(t);
      arbiter.emitError(t);//发送错误
      return;
    }
    arbiter.emitResponse(response);//发送response
  }

  static final class CallArbiter<T> extends AtomicInteger implements Subscription, Producer {
    private static final int STATE_WAITING = 0;
    private static final int STATE_REQUESTED = 1;
    private static final int STATE_HAS_RESPONSE = 2;
    private static final int STATE_TERMINATED = 3;

    private final Call<T> call;
    private final Subscriber<? super Response<T>> subscriber;

    private volatile Response<T> response;

    CallArbiter(Call<T> call, Subscriber<? super Response<T>> subscriber) {
      super(STATE_WAITING);

      this.call = call;
      this.subscriber = subscriber;
    }

    @Override public void unsubscribe() {
      call.cancel();
    }

    @Override public boolean isUnsubscribed() {
      return call.isCanceled();
    }

    @Override public void request(long amount) {

      if (amount == 0) {
        return;
      }
      while (true) {
        int state = get();
        switch (state) {
          case STATE_WAITING:
            if (compareAndSet(STATE_WAITING, STATE_REQUESTED)) {
              return;
            }
            break; // State transition failed. Try again.

          case STATE_HAS_RESPONSE:
            if (compareAndSet(STATE_HAS_RESPONSE, STATE_TERMINATED)) {
              deliverResponse(response);
              return;
            }
            break; // State transition failed. Try again.

          case STATE_REQUESTED:
          case STATE_TERMINATED:
            return; // Nothing to do.

          default:
            throw new IllegalStateException("Unknown state: " + state);
        }
      }
    }

    void emitResponse(Response<T> response) {
      while (true) {
        int state = get();//获取当前值
        switch (state) {
          case STATE_WAITING:
            this.response = response;
            if (compareAndSet(STATE_WAITING, STATE_HAS_RESPONSE)) {//如果当前值==STATE_WAITING,设置值为STATE_HAS_RESPONSE
              return;
            }
            break; //状态改变失败重试

          case STATE_REQUESTED:
            if (compareAndSet(STATE_REQUESTED, STATE_TERMINATED)) {
              deliverResponse(response);
              return;
            }
            break; // State transition failed. Try again.

          case STATE_HAS_RESPONSE:
          case STATE_TERMINATED:
            throw new AssertionError();
          default:
            throw new IllegalStateException("Unknown state: " + state);
        }
      }
    }

    private void deliverResponse(Response<T> response) {
      try {
        if (!isUnsubscribed()) {
          subscriber.onNext(response);
        }
      } catch (Throwable t) {
        Exceptions.throwIfFatal(t);
        try {
          subscriber.onError(t);
        } catch (Throwable inner) {
          Exceptions.throwIfFatal(inner);
          CompositeException composite = new CompositeException(t, inner);
          RxJavaPlugins.getInstance().getErrorHandler().handleError(composite);
        }
        return;
      }
      try {
        subscriber.onCompleted();//发送完成
      } catch (Throwable t) {
        Exceptions.throwIfFatal(t);
        RxJavaPlugins.getInstance().getErrorHandler().handleError(t);
      }
    }

    void emitError(Throwable t) {
      set(STATE_TERMINATED);

      if (!isUnsubscribed()) {
        try {
          subscriber.onError(t);
        } catch (Throwable inner) {
          Exceptions.throwIfFatal(inner);
          CompositeException composite = new CompositeException(t, inner);
          RxJavaPlugins.getInstance().getErrorHandler().handleError(composite);
        }
      }
    }
  }
}
```
BodyOnSubscribe
```java
final class BodyOnSubscribe<T> implements OnSubscribe<T> {
  private final OnSubscribe<Response<T>> upstream;

  BodyOnSubscribe(OnSubscribe<Response<T>> upstream) {
    this.upstream = upstream;
  }

  @Override public void call(Subscriber<? super T> subscriber) {
    upstream.call(new BodySubscriber<>(subscriber));
  }

  private static class BodySubscriber<R> extends Subscriber<Response<R>> {
    private final Subscriber<? super R> subscriber;
    /** Indicates whether a terminal event has been sent to {@link #subscriber}. */
    private boolean subscriberTerminated;

    BodySubscriber(Subscriber<? super R> subscriber) {
      super(subscriber);
      this.subscriber = subscriber;
    }

    @Override public void onNext(Response<R> response) {
      if (response.isSuccessful()) {
        subscriber.onNext(response.body());
      } else {
        subscriberTerminated = true;
        Throwable t = new HttpException(response);
        try {
          subscriber.onError(t);
        } catch (Throwable inner) {
          Exceptions.throwIfFatal(inner);
          CompositeException composite = new CompositeException(t, inner);
          RxJavaPlugins.getInstance().getErrorHandler().handleError(composite);
        }
      }
    }

    @Override public void onError(Throwable throwable) {
      if (!subscriberTerminated) {
        subscriber.onError(throwable);
      } else {
        // This should never happen! onNext handles and forwards errors automatically.
        Throwable broken = new AssertionError(
            "This should never happen! Report as a Retrofit bug with the full stacktrace.");
        //noinspection UnnecessaryInitCause Two-arg AssertionError constructor is 1.7+ only.
        broken.initCause(throwable);
        RxJavaPlugins.getInstance().getErrorHandler().handleError(broken);
      }
    }

    @Override public void onCompleted() {
      if (!subscriberTerminated) {
        subscriber.onCompleted();
      }
    }
  }
}
```
ResultOnSubscribe
```java
final class ResultOnSubscribe<T> implements OnSubscribe<Result<T>> {
  private final OnSubscribe<Response<T>> upstream;

  ResultOnSubscribe(OnSubscribe<Response<T>> upstream) {
    this.upstream = upstream;
  }

  @Override public void call(Subscriber<? super Result<T>> subscriber) {
    upstream.call(new ResultSubscriber<T>(subscriber));
  }

  private static class ResultSubscriber<R> extends Subscriber<Response<R>> {
    private final Subscriber<? super Result<R>> subscriber;

    ResultSubscriber(Subscriber<? super Result<R>> subscriber) {
      super(subscriber);
      this.subscriber = subscriber;
    }

    @Override public void onNext(Response<R> response) {
      subscriber.onNext(Result.response(response));
    }

    @Override public void onError(Throwable throwable) {
      try {
        subscriber.onNext(Result.<R>error(throwable));
      } catch (Throwable t) {
        try {
          subscriber.onError(t);
        } catch (Throwable inner) {
          Exceptions.throwIfFatal(inner);
          CompositeException composite = new CompositeException(t, inner);
          RxJavaPlugins.getInstance().getErrorHandler().handleError(composite);
        }
        return;
      }
      subscriber.onCompleted();
    }

    @Override public void onCompleted() {
      subscriber.onCompleted();
    }
  }
}
```

* [拆轮子系列：拆 Retrofit
](http://blog.piasy.com/2016/06/25/Understand-Retrofit/)
