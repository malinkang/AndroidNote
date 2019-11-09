# 实施自定义请求

本课描述了如何为不具有即用Volley支持的类型实现自己的自定义请求类型。

## 编写自定义请求

大多数请求在工具箱中都有现成的实现。如果您的响应是字符串，图像或JSON，则可能无需实现custom `Request`



对于确实需要实现自定义请求的情况，这就是您需要做的一切：

- 继承`Request`类，其中 `<T>`表示请求期望的已解析响应的类型。因此，例如，如果解析的响应是字符串，请通过继承`Request<String>`创建自定义请求。请参阅Volley工具箱类`StringRequest`和`ImageRequest`扩展示例`Request`。
- 实现的抽象方法`parseNetworkResponse()` 和`deliverResponse()`，在下面更详细描述。

### parseNetworkResponse

一个`Response`封装用于递送解析的响应，对于给定类型（例如字符串，图像或JSON）。这是一个示例实现 `parseNetworkResponse()`：

```java
@Override
protected Response<T> parseNetworkResponse(
        NetworkResponse response) {
    try {
        String json = new String(response.data,
        HttpHeaderParser.parseCharset(response.headers));
    return Response.success(gson.fromJson(json, clazz),
    HttpHeaderParser.parseCacheHeaders(response));
    }
    // handle errors
// ...
}
```

请注意以下几点：

- `parseNetworkResponse()`将参数a作为参数`NetworkResponse`，其中包含响应有效载荷（字节[]），HTTP状态代码和响应标头。
- 您的实现必须返回`Response`，其中包含您键入的响应对象和缓存元数据或错误，例如在解析失败的情况下。

如果您的协议具有非标准的缓存语义，则可以构建`Cache.Entry` 自己的协议，但是大多数请求都可以使用以下类似的内容：

```java
return Response.success(myDecodedObject,
        HttpHeaderParser.parseCacheHeaders(response));
```

Volley在工作线程调用`parseNetworkResponse()`。这样可以确保昂贵的解析操作（例如将JPEG解码为位图）不会阻塞UI线程。

### deliveryResponse

Volley使用您返回的对象在主线程上调用您 `parseNetworkResponse()`。大多数请求在此处调用回调接口，例如：

```java
protected void deliverResponse(T response) {
        listener.onResponse(response);
```

## 示例：GsonRequest

[Gson](http://code.google.com/p/google-gson/)是一个使用反射将Java对象与JSON相互转换的库。您可以定义与相应的JSON键具有相同名称的Java对象，将Gson传递给类对象，然后Gson会为您填充字段。这是使用Gson进行解析的Volley请求的完整实现：

```java
public class GsonRequest<T> extends Request<T> {
    private final Gson gson = new Gson();
    private final Class<T> clazz;
    private final Map<String, String> headers;
    private final Listener<T> listener;

    /**
     * Make a GET request and return a parsed object from JSON.
     *
     * @param url URL of the request to make
     * @param clazz Relevant class object, for Gson's reflection
     * @param headers Map of request headers
     */
    public GsonRequest(String url, Class<T> clazz, Map<String, String> headers,
            Listener<T> listener, ErrorListener errorListener) {
        super(Method.GET, url, errorListener);
        this.clazz = clazz;
        this.headers = headers;
        this.listener = listener;
    }

    @Override
    public Map<String, String> getHeaders() throws AuthFailureError {
        return headers != null ? headers : super.getHeaders();
    }

    @Override
    protected void deliverResponse(T response) {
        listener.onResponse(response);
    }

    @Override
    protected Response<T> parseNetworkResponse(NetworkResponse response) {
        try {
            String json = new String(
                    response.data,
                    HttpHeaderParser.parseCharset(response.headers));
            return Response.success(
                    gson.fromJson(json, clazz),
                    HttpHeaderParser.parseCacheHeaders(response));
        } catch (UnsupportedEncodingException e) {
            return Response.error(new ParseError(e));
        } catch (JsonSyntaxException e) {
            return Response.error(new ParseError(e));
        }
    }
}
```

如果您喜欢采用这种方法，Volley将提供即用型`JsonArrayRequest`和`JsonArrayObject`课程。有关更多信息，请参见[ 发出标准请求](https://developer.android.com/training/volley/request.html)。