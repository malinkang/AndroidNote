
#### ServiceMethod 

ServiceMethod主要用来解析我们声明的方法。
```java
public Builder(Retrofit retrofit, Method method) {
  this.retrofit = retrofit;
  this.method = method;
  this.methodAnnotations = method.getAnnotations();//获取方法上的注解
  this.parameterTypes = method.getGenericParameterTypes();//获取参数类型
  this.parameterAnnotationsArray = method.getParameterAnnotations();//获取参数上的注解
}
```
ServiceMethod的createCallAdapter方法

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

  int parameterCount = parameterAnnotationsArray.length;
  parameterHandlers = new ParameterHandler<?>[parameterCount];//创建参数处理的数组
  for (int p = 0; p < parameterCount; p++) {
    Type parameterType = parameterTypes[p];
    if (Utils.hasUnresolvableType(parameterType)) {
      throw parameterError(p, "Parameter type must not include a type variable or wildcard: %s",
          parameterType);
    }

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
  T body = serviceMethod.toResponse(catchingBody);
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
RxJavaCallAdapter的adapt方法
```java
@Override
public Object adapt(Call<R> call) {
    ResponseCallable<R> resultCallable = new ResponseCallable<>(call);
    Observable<?> observable;
    if (isResult) {
        observable = Observable.fromCallable(new ResultCallable<>(resultCallable));
    } else if (isBody) {
        observable = Observable.fromCallable(new BodyCallable<>(resultCallable));
    } else {
        observable = Observable.fromCallable(resultCallable);
    }
    if (scheduler != null) {
        observable = observable.subscribeOn(scheduler);
    }
    if (isSingle) {
        return observable.toSingle();
    }
    if (isCompletable) {
        return CompletableHelper.toCompletable(observable);
    }
    return observable;
}
```
