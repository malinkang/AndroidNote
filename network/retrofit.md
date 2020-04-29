


## 服务器错误统一处理

```java
public class ApiErrorGsonConverterFactory extends Converter.Factory {

    private final Converter.Factory mDelegateFactory;

    public ApiErrorGsonConverterFactory(Converter.Factory delegateFactory) {
        mDelegateFactory = delegateFactory;
    }

    public static ApiErrorGsonConverterFactory create(Gson gson) {
        return new ApiErrorGsonConverterFactory(GsonConverterFactory.create(gson));
    }

    @Override
    public Converter<?, RequestBody> requestBodyConverter(Type type,
        Annotation[] parameterAnnotations, Annotation[] methodAnnotations, Retrofit retrofit) {
        return mDelegateFactory.requestBodyConverter(type, parameterAnnotations, methodAnnotations,
            retrofit);
    }

    @Override
    public Converter<ResponseBody, ?> responseBodyConverter(Type type, Annotation[] annotations,
        Retrofit retrofit) {
        final Converter<ResponseBody, ?> apiErrorConverter =
            mDelegateFactory.responseBodyConverter(ApiError.class, annotations, retrofit);
        final Converter<ResponseBody, ?> delegateConverter =
            mDelegateFactory.responseBodyConverter(type, annotations, retrofit);
        return (Converter<ResponseBody, Object>) value -> {
            MediaType mediaType = value.contentType();
            String stringBody = value.string();
            //优先解析ApiError
            ApiError apiError = apiErrorConverter.convert(ResponseBody.create(mediaType, stringBody));
            if (((ApiError) apiError).isError()) {
                throw (ApiError) apiError;
            }
            return delegateConverter.convert(ResponseBody.create(mediaType, stringBody));
        };
    }
}
```

## 其他错误统一处理

```dart
class RxErrorHandlingCallAdapterFactory : CallAdapter.Factory() {
    override fun get(
        returnType: Type,
        annotations: Array<Annotation>,
        retrofit: Retrofit
    ): CallAdapter<*, *>? {
        if (getRawType(returnType) != Observable::class.java) {
            return null // Ignore non-Observable types.
        }
        //获取代理
        val delegate = retrofit.nextCallAdapter(
            this, returnType,
            annotations
        ) as CallAdapter<Any?, Observable<Any?>>

        return object : CallAdapter<Any?, Any?> {
            override fun adapt(call: Call<Any?>): Any {
                // Delegate to get the normal Observable...
                val observable = delegate.adapt(call)
                // ...and change it to send notifications to the observer on the specified scheduler.
                return observable.onErrorResumeNext(
                    Function<Throwable, ObservableSource<Any?>> { t ->
                        if (t is ApiError) {
                            Observable.error<Any>(t)
                        } else Observable.error<Any>(asRetrofitException(t))
                    })
                    .observeOn(AndroidSchedulers.mainThread())
            }

            override fun responseType(): Type {
                return delegate.responseType()
            }
        }
    }

    private fun asRetrofitException(throwable: Throwable): RetrofitException {
        try {
            when (throwable) {
              is HttpException -> {
                  val response = throwable.response()
                  return RetrofitException.httpError(
                      response.raw().request().url().toString(), response
                  )
              }
                is IOException -> {
                    return RetrofitException.networkError(throwable)
                }
                is UnknownHostException -> {
                    return RetrofitException.networkError(throwable)
                }
            }
        } catch (e: Exception) {
            return RetrofitException.unexpectedError(e)
        }

        return RetrofitException.unexpectedError(throwable)
    }
}
```

```java
public class RetrofitException extends RuntimeException {
    public static RetrofitException httpError(String url, Response response) {
        String message = response.code() + " " + response.message();
        return new RetrofitException(message, url, response, Kind.HTTP, null);
    }

    public static RetrofitException networkError(IOException exception) {
        String message = MyApp.getAppContext().getResources().getString(R.string.network_error);
        exception.printStackTrace();
        return new RetrofitException(message, null, null, Kind.NETWORK, exception);
    }

    public static RetrofitException unexpectedError(Throwable exception) {
        String message = MyApp.getAppContext().getResources().getString(R.string.unexpected_error);
        exception.printStackTrace();
        return new RetrofitException(message, null, null, Kind.UNEXPECTED, exception);
    }

    private final String url;
    private final Response response;
    private final Kind kind;

    public RetrofitException(String message, String url, Response response, Kind kind,
        Throwable exception) {
        super(message, exception);
        this.url = url;
        this.response = response;
        this.kind = kind;
    }

    /** The request URL which produced the error. */
    public String getUrl() {
        return url;
    }

    /** Response object containing status code, item_data, body, etc. */
    public Response getResponse() {
        return response;
    }

    /** The event kind which triggered this error. */
    public Kind getKind() {
        return kind;
    }
}
```


* [官方文档](https://square.github.io/retrofit/)