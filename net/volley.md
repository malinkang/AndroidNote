# Volley使用

[Volley][Volley]是Google在2013年推出的新的网络通信框架。Volley可是说是把[async-http-client][async-http-client]和[Android-Universal-Image-Loader][Android-Universal-Image-Loader]的优点集于了一身，既可以async-http-client像一样非常简单地进行HTTP通信，也可以像ndroid-Universal-Image-Loader一样轻松加载网络上的图片。除了简单易用之外，Volley在性能方面也进行了大幅度的调整，它的设计目标就是非常适合去进行数据量不大，但通信频繁的网络操作，而对于大数据量的网络操作，比如说下载文件等，Volley的表现就会非常糟糕。

## 1.开始使用

使用Git克隆Volley源码

```
<<<<<<< HEAD
git clone https://android.googlesource.com/platform/frameworks/volley
=======
git clone https://android.googlesource.com/platform/frameworks/volley 
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c

```

除了使用官方的Volley 项目，也可以使用托管在Github上的[Android Volley][Android Volley]项目。

## 2.使用Volley进行网络请求

### 2.1 基本用法

使用Volley进行网络请求只需要简单的三步。

1.创建`RequestQueue`对象

```java

<<<<<<< HEAD
RequestQueue mQueue = Volley.newRequestQueue(context);
=======
RequestQueue mQueue = Volley.newRequestQueue(context);  
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c

```

RequestQueue是一个请求队列对象，它可以缓存所有的HTTP请求，然后按照一定的算法并发地发出这些请求。RequestQueue内部的设计就是非常合适高并发的，因此我们不必为每一次HTTP请求都创建一个RequestQueue对象，这是非常浪费资源的，基本上在每一个需要和网络交互的Activity中创建一个RequestQueue对象就足够了。

2.创建Request对象，

 StringRequest是Request的子类，将返回的数据处理为字符串。

```java

       StringRequest stringRequest = new StringRequest("http://www.baidu.com",
                new Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        Log.d("TAG", response);
                    }
                }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                Log.e("TAG", error.getMessage(), error);
            }
        });


```

这里`StringRequest`的构造函数需要传入3个参数：第一个参数就是目标服务器的URL地址，第二个参数是服务器响应成功的回调，第三个参数是服务器响应失败的回调。

3.将Request对象添加到RequestQueue。

```java

<<<<<<< HEAD
mQueue.add(stringRequest);
=======
mQueue.add(stringRequest);  
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c

```

### 2.2 设置请求参数和请求体

StringRequest的父类Request提供了两个方法`getParams()`方法用于获取请求参数和`getBody()`方法获取请求体

所以使用Post发送请求参数或请求体时，只需要覆盖这两个方法即可。

覆盖`getParams()`

```java

 RequestQueue mQueue = Volley.newRequestQueue(this);
        StringRequest stringRequest = new StringRequest(Request.Method.POST,"https://github.com/login/oauth/access_token",
                new Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        Log.e("TAG", "获取成功"+response);
                    }
                }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                Log.e("TAG", error.getMessage(), error);
            }
        }){
            @Override
            protected Map<String, String> getParams() throws AuthFailureError {
                Map<String,String> params=new HashMap<String, String>();
                params.put("client_id",client_id);
                params.put("client_secret",client_secret);
                params.put("code",code);
                params.put("redirect_uri",redirect_uri);
                return params;
            }
        };
        mQueue.add(stringRequest);

```

### 2.3 JsonRequest使用

JsonRequest继承Request，JsonRequest是一个抽象类，有两个子类：

* JsonObjectRequest
* JsonArrayRequest

```java

 RequestQueue mQueue = Volley.newRequestQueue(this);
        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.POST,"https://github.com/login/oauth/access_token", null,
                new Response.Listener<JSONObject>() {
                    @Override
                    public void onResponse(JSONObject response) {
                        Log.e("TAG", response.toString());
                    }
                }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                Log.e("TAG", error.getMessage(), error);
            }
        }){
            @Override
            protected Map<String, String> getParams() throws AuthFailureError {
                Map<String,String> params=new HashMap<String, String>();
                params.put("client_id",client_id);
                params.put("client_secret",client_secret);
                params.put("code",code);
                params.put("redirect_uri",redirect_uri);
                return params;
            }
        };
        mQueue.add(jsonObjectRequest);

```

### 2.4 自定义Request

除了提供的3个Request，我们也可以通过继承Request来实现自己的Request，通过复写`parseNetworkResponse`方法，来实现返回数据的处理。比如我们希望直接将返回的字符串通过`Gson`处理成所需要的对象。

```java

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
<<<<<<< HEAD

=======
 
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c
import com.android.volley.AuthFailureError;
import com.android.volley.NetworkResponse;
import com.android.volley.ParseError;
import com.android.volley.Request;
import com.android.volley.Response;
import com.android.volley.Response.ErrorListener;
import com.android.volley.Response.Listener;
import com.android.volley.toolbox.HttpHeaderParser;
<<<<<<< HEAD

import java.io.UnsupportedEncodingException;
import java.util.Map;

=======
 
import java.io.UnsupportedEncodingException;
import java.util.Map;
 
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c
/**
 * Volley adapter for JSON requests that will be parsed into Java objects by Gson.
 */
public class GsonRequest<T> extends Request<T> {
    private final Gson gson = new Gson();
    private final Class<T> clazz;
    private final Map<String, String> headers;
    private final Listener<T> listener;
<<<<<<< HEAD

=======
 
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c
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
<<<<<<< HEAD

=======
 
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c
    @Override
    public Map<String, String> getHeaders() throws AuthFailureError {
        return headers != null ? headers : super.getHeaders();
    }
<<<<<<< HEAD

=======
 
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c
    @Override
    protected void deliverResponse(T response) {
        listener.onResponse(response);
    }
<<<<<<< HEAD

=======
 
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c
    @Override
    protected Response<T> parseNetworkResponse(NetworkResponse response) {
        try {
            String json = new String(
                    response.data, HttpHeaderParser.parseCharset(response.headers));
            return Response.success(
                    gson.fromJson(json, clazz), HttpHeaderParser.parseCacheHeaders(response));
        } catch (UnsupportedEncodingException e) {
            return Response.error(new ParseError(e));
        } catch (JsonSyntaxException e) {
            return Response.error(new ParseError(e));
        }
    }
}

```

## 3.使用Volley加载网络图片

### 3.1 ImageRequest

使用Volley加载网络图片的步骤和网络请求的步骤基本是一致的，只不过这里使用的Request的是`ImageRequest`

```java
ImageRequest imageRequest = new ImageRequest(
		"http://developer.android.com/images/home/aw_dac.png",
		new Response.Listener<Bitmap>() {
			@Override
			public void onResponse(Bitmap response) {
				imageView.setImageBitmap(response);
			}
		}, 0, 0, Config.RGB_565, new Response.ErrorListener() {
			@Override
			public void onErrorResponse(VolleyError error) {
				imageView.setImageResource(R.drawable.default_image);
			}
		});

```

ImageRequest的构造函数接收六个参数，第一个参数就是图片的URL地址。第二个参数是图片请求成功的回调，这里我们把返回的Bitmap参数设置到ImageView中。第三第四个参数分别用于指定允许图片最大的宽度和高度，如果指定的网络图片的宽度或高度大于这里的最大值，则会对图片进行压缩，指定成0的话就表示不管图片有多大，都不会进行压缩。第五个参数用于指定图片的颜色属性，Bitmap.Config下的几个常量都可以在这里使用，其中ARGB_8888可以展示最好的颜色属性，每个图片像素占据4个字节的大小，而RGB_565则表示每个图片像素占据2个字节大小。第六个参数是图片请求失败的回调，这里我们当请求失败时在ImageView中显示一张默认图片。


### 3.2 ImageLoader的用法

除了使用`ImageRequest`加载图片外，还可以使用`ImageLoader`来加载网络图片。ImageLoader内部也使用的ImageRequest来实现的，不过ImageLoader明显要比ImageRequest更加搞笑，因为它不仅可以帮我们对图片进行缓存，还可以过滤掉重复的链接，避免重复发送请求。

使用ImageLoader大致需要4步。

1.创建一个RequestQueue对象。

2.创建一个ImageLoader对象。

ImageLoader的构造函数接收两个参数，第一个参数就是RequestQueue对象，第二个参数是一个ImageCache对象。借助Android提供的LruCache功能，可以让图片加载到内存中。

```java
public class BitmapCache implements ImageCache {

	private LruCache<String, Bitmap> mCache;

	public BitmapCache() {
		int maxSize = 10 * 1024 * 1024;
		mCache = new LruCache<String, Bitmap>(maxSize) {
			@Override
			protected int sizeOf(String key, Bitmap bitmap) {
				return bitmap.getRowBytes() * bitmap.getHeight();
			}
		};
	}

	@Override
	public Bitmap getBitmap(String url) {
		return mCache.get(url);
	}

	@Override
	public void putBitmap(String url, Bitmap bitmap) {
		mCache.put(url, bitmap);
	}

}

```

```java

ImageLoader imageLoader = new ImageLoader(mQueue, new BitmapCache());

```

3.创建一个ImageListener对象。

```java
<<<<<<< HEAD
ImageListener listener = ImageLoader.getImageListener(imageView,
        R.drawable.default_image, R.drawable.failed_image);
=======
ImageListener listener = ImageLoader.getImageListener(imageView,  
        R.drawable.default_image, R.drawable.failed_image); 
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c

```

4.调用ImageLoader的get()方法来加载图片。

```java
<<<<<<< HEAD
imageLoader.get("http://img.my.csdn.net/uploads/201404/13/1397393290_5765.jpeg", listener);
=======
imageLoader.get("http://img.my.csdn.net/uploads/201404/13/1397393290_5765.jpeg", listener);  
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c

```
### 3.3 NetWorkImageView

`NetWorkImageView`是一个自定义控件，继承自`ImageView`。NetWorkImageView可以直接加载网络图片。

在布局中使用NetWorkImageView

```xml

<<<<<<< HEAD
<com.android.volley.toolbox.NetworkImageView
        android:id="@+id/network_image_view"
        android:layout_width="200dp"
        android:layout_height="200dp"
        android:layout_gravity="center_horizontal"
        />
=======
<com.android.volley.toolbox.NetworkImageView   
        android:id="@+id/network_image_view"  
        android:layout_width="200dp"  
        android:layout_height="200dp"  
        android:layout_gravity="center_horizontal"  
        />  
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c

```
NetWorkImageView方法

* setDefaultImageResId():设置默认图片
* setErrorImageResId():设置加载错误显示的图片
* setImageUrl():加载网络图片。

# 扩展阅读


<<<<<<< HEAD
* [ Android Volley完全解析(一)，初识Volley的基本用法](http://blog.csdn.net/guolin_blog/article/details/17482095)
=======
* [ Android Volley完全解析(一)，初识Volley的基本用法](http://blog.csdn.net/guolin_blog/article/details/17482095) 
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c
* [Android Volley完全解析(二)，使用Volley加载网络图片](http://blog.csdn.net/guolin_blog/article/details/17482165)
* [Android Volley完全解析(三)，定制自己的Request](http://blog.csdn.net/guolin_blog/article/details/17612763)
* [Android Volley完全解析(四)，带你从源码的角度理解Volley](http://blog.csdn.net/guolin_blog/article/details/17656437)
* [Asynchronous HTTP Requests in Android Using Volley](http://arnab.ch/blog/2013/08/asynchronous-http-requests-in-android-using-volley/)

<<<<<<< HEAD

=======
 
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c




[Volley]: https://android.googlesource.com/platform/frameworks/volley
<<<<<<< HEAD
[async-http-client]: https://github.com/AsyncHttpClient/async-http-client
=======
[async-http-client]: https://github.com/AsyncHttpClient/async-http-client 
>>>>>>> 43eb28dc379e3887bf933756ee10845587398c6c
[Android-Universal-Image-Loader]: https://github.com/nostra13/Android-Universal-Image-Loader
[Android Volley]: https://github.com/mcxiaoke/android-volley

