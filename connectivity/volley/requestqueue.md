# 设置RequestQueue

上一课向您展示了如何利用便捷方法 `Volley.newRequestQueue`来`RequestQueue`利用Volley的默认行为来设置。本课将引导您完成创建`RequestQueue`的明确步骤 ，以允许您提供自己的自定义行为。

本课还介绍了创建一个`RequestQueue` 单例的建议做法，这可以使`RequestQueue`应用程序的生命周期最大化。

## 设置网络和缓存

一个 `RequestQueue`需要完成两项工作：执行请求传输的网络和处理缓存的缓存。Volley工具箱中`DiskBasedCache`提供了这些的标准实现：提供每个响应一个文件的高速缓存以及内存中的索引，并`BasicNetwork`根据您的首选HTTP客户端提供网络传输。

`BasicNetwork`是Volley的默认网络实现。一个`BasicNetwork` 必须使用的应用程序使用连接到网络的HTTP客户端进行初始化。通常，这是一个`HttpURLConnection`。

该代码段向您展示了设置的步骤 `RequestQueue`：

```java
RequestQueue requestQueue;

// Instantiate the cache
Cache cache = new DiskBasedCache(getCacheDir(), 1024 * 1024); // 1MB cap

// Set up the network to use HttpURLConnection as the HTTP client.
Network network = new BasicNetwork(new HurlStack());

// Instantiate the RequestQueue with the cache and network.
requestQueue = new RequestQueue(cache, network);

// Start the queue
requestQueue.start();

String url ="http://www.example.com";

// Formulate the request and handle the response.
StringRequest stringRequest = new StringRequest(Request.Method.GET, url,
        new Response.Listener<String>() {
    @Override
    public void onResponse(String response) {
        // Do something with the response
    }
},
    new Response.ErrorListener() {
        @Override
        public void onErrorResponse(VolleyError error) {
            // Handle error
    }
});

// Add the request to the RequestQueue.
requestQueue.add(stringRequest);

// ...
```

如果您只需要发出一个一次性请求，并且不想离开线程池，则可以使用[发送一个简单的请求](https://developer.android.com/training/volley/simple.html)中描述的`Volley.newRequestQueue()`方法，在`RequestQueue`需要的地方创建请求，并在`RequestQueue`响应或错误返回后立即调用`stop()`。但是更常见的用例是将`RequestQueue`创建为单例，以使其在应用程序的生命周期内保持运行，如下一节所述。

## 使用单例模式

如果您的应用程序不断使用网络，则设置单个实例可能最有效，`RequestQueue`这样可以持续应用程序的生命周期。您可以通过多种方式实现这一目标。推荐的方法是实现封装`RequestQueue`和其他Volley功能的单例类。另一种方法是子类化`Application`并设置 `RequestQueue`在 `Application.onCreate()`中。但是[ 不鼓励](https://developer.android.com/reference/android/app/Application.html)这种方法; 静态单例可以以更模块化的方式提供相同的功能。

一个关键概念是`RequestQueue`必须使用`Application`上下文而不是`Activity`上下文实例化 。这样可以确保`RequestQueue`在应用程序的整个生命周期中持续有效，而不是在每次重新创建活动时（例如，当用户旋转设备时）都重新创建。

这是提供`RequestQueue`和 `ImageLoader`功能的单例类的示例：

```java
public class MySingleton {
    private static MySingleton instance;
    private RequestQueue requestQueue;
    private ImageLoader imageLoader;
    private static Context ctx;

    private MySingleton(Context context) {
        ctx = context;
        requestQueue = getRequestQueue();

        imageLoader = new ImageLoader(requestQueue,
                new ImageLoader.ImageCache() {
            private final LruCache<String, Bitmap>
                    cache = new LruCache<String, Bitmap>(20);

            @Override
            public Bitmap getBitmap(String url) {
                return cache.get(url);
            }

            @Override
            public void putBitmap(String url, Bitmap bitmap) {
                cache.put(url, bitmap);
            }
        });
    }

    public static synchronized MySingleton getInstance(Context context) {
        if (instance == null) {
            instance = new MySingleton(context);
        }
        return instance;
    }

    public RequestQueue getRequestQueue() {
        if (requestQueue == null) {
            // getApplicationContext() is key, it keeps you from leaking the
            // Activity or BroadcastReceiver if someone passes one in.
            requestQueue = Volley.newRequestQueue(ctx.getApplicationContext());
        }
        return requestQueue;
    }

    public <T> void addToRequestQueue(Request<T> req) {
        getRequestQueue().add(req);
    }

    public ImageLoader getImageLoader() {
        return imageLoader;
    }
}
```

以下是一些使用singleton类执行`RequestQueue`操作的示例：

```java
// Get a RequestQueue
RequestQueue queue = MySingleton.getInstance(this.getApplicationContext()).
    getRequestQueue();

// ...

// Add a request (in this example, called stringRequest) to your RequestQueue.
MySingleton.getInstance(this).addToRequestQueue(stringRequest);
```

