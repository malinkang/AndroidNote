# 1. 介绍

[Universal Image Loader](https://github.com/nostra13/Android-Universal-Image-Loader) 具有以下特性：

* 多线程加载图片
* 可以高度的自定义ImageLoader的配置（如线程执行，下载器，编码，内存和硬盘缓存，图片展示的选项等等）
* 许多自定义选项可以被每个展示的图片调用
* 图片可以缓存在内存中和硬盘上
* 可以监听图片的加载进度和下载进度

# 2.快速入门

## 2.1 构建项目

Jar包下载地址：<https://github.com/nostra13/Android-Universal-Image-Loader>

Maven dependency:

```
<dependency>
    <groupId>com.nostra13.universalimageloader</groupId>
    <artifactId>universal-image-loader</artifactId>
    <version>1.9.3</version>
</dependency>

```
Gradle dependency:

```
compile 'com.nostra13.universalimageloader:universal-image-loader:1.9.3'

```

## 2.2 配置 Android Manifest

在android Mainfest 配置必要的权限

```xml

<manifest>
    <!-- 网络权限 -->
    <uses-permission android:name="android.permission.INTERNET" />
    <!-- 内存卡写入权限 -->
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    ...
</manifest>


```

## 2.3 在Application和Activity中初始化ImageLoader

在第一次使用ImageLoader之前一定要在Application或Activity中初始化ImageLoader

```java

public class MyActivity extends Activity {
    @Override
    public void onCreate() {
        super.onCreate();

        // Create global configuration and initialize ImageLoader with this config
        ImageLoaderConfiguration config = new ImageLoaderConfiguration.Builder(this)
            ...
            .build();
        ImageLoader.getInstance().init(config);
        ...
    }
}

```

ImageLoaderConfiguration作用于整个应用，DisplayOptions在ImageLoader.displayImage(...)方法中被调用，作用于每个图片的展示。

所有的配置都是可选的，用户可以根据自己的需求进行自定义

```java

File cacheDir = StorageUtils.getCacheDirectory(context);
ImageLoaderConfiguration config = new ImageLoaderConfiguration.Builder(context)
        .memoryCacheExtraOptions(480, 800) // default = device screen dimensions
        .diskCacheExtraOptions(480, 800, null)
        .taskExecutor(...)
        .taskExecutorForCachedImages(...)
        .threadPoolSize(3) //线程池个数 default
        .threadPriority(Thread.NORM_PRIORITY - 2) // default
        .tasksProcessingOrder(QueueProcessingType.FIFO) // 任务执行顺序 default
        .denyCacheImageMultipleSizesInMemory()
        .memoryCache(new LruMemoryCache(2 * 1024 * 1024))
        .memoryCacheSize(2 * 1024 * 1024)//内存缓存大小
        .memoryCacheSizePercentage(13) // default
        .diskCache(new UnlimitedDiscCache(cacheDir)) //指定磁盘缓存位置 default
        .diskCacheSize(50 * 1024 * 1024)//磁盘缓存大小
        .diskCacheFileCount(100)//磁盘文件缓存个数
        .diskCacheFileNameGenerator(new HashCodeFileNameGenerator()) // default
        .imageDownloader(new BaseImageDownloader(context)) // default
        .imageDecoder(new BaseImageDecoder()) // default
        .defaultDisplayImageOptions(DisplayImageOptions.createSimple()) // default
        .writeDebugLogs()
        .build();

```
DisplayOptions

```java

DisplayImageOptions options = new DisplayImageOptions.Builder()
        .showImageOnLoading(R.drawable.ic_stub) // resource or drawable
        .showImageForEmptyUri(R.drawable.ic_empty) // resource or drawable
        .showImageOnFail(R.drawable.ic_error) // resource or drawable
        .resetViewBeforeLoading(false)  // default
        .delayBeforeLoading(1000)
        .cacheInMemory(false) // default
        .cacheOnDisk(false) // default
        .preProcessor(...)
        .postProcessor(...)
        .extraForDownloader(...)
        .considerExifParams(false) // default
        .imageScaleType(ImageScaleType.IN_SAMPLE_POWER_OF_2) // default
        .bitmapConfig(Bitmap.Config.ARGB_8888) // default
        .decodingOptions(...)
        .displayer(new SimpleBitmapDisplayer()) // default
        .handler(new Handler()) // default
        .build();


```

# 3.使用

## 3.1 支持多种URI

Universal Image Loader 不仅可以加载网络图片还可以加载内存卡，asset文件夹下的图片等等。

```java

String imageUri = "http://site.com/image.png"; // from Web
String imageUri = "file:///mnt/sdcard/image.png"; // from SD card
String imageUri = "content://media/external/audio/albumart/1"; // from content provider
String imageUri = "assets://image.png"; // from assets
String imageUri = "drawable://" + R.drawable.img; // from drawables (non-9patch images)

```

## 3.2ImageLoader常用方法

* displayImage：加载图片，转换为Bitmap对象，将Bitmap展示在ImageView上或者其他实现ImageAware接口的View。

```java

imageLoader.displayImage(imageUri, imageView);

```


使用displayImage方法可以设置加载监听器和加载进度监听器

```java

// Load image, decode it to Bitmap and display Bitmap in ImageView (or any other view
//  which implements ImageAware interface)
imageLoader.displayImage(imageUri, imageView, options, new ImageLoadingListener() {
    @Override
    public void onLoadingStarted(String imageUri, View view) {
        ...
    }
    @Override
    public void onLoadingFailed(String imageUri, View view, FailReason failReason) {
        ...
    }
    @Override
    public void onLoadingComplete(String imageUri, View view, Bitmap loadedImage) {
        ...
    }
    @Override
    public void onLoadingCancelled(String imageUri, View view) {
        ...
    }
}, new ImageLoadingProgressListener() {
    @Override
    public void onProgressUpdate(String imageUri, View view, int current, int total) {
        ...
    }
});


```

* loadImage：加载图片，转换为Bitmap对象并且将Bitmap对象返回给回掉函数。

```java

imageLoader.loadImage(imageUri, new SimpleImageLoadingListener() {
    @Override
    public void onLoadingComplete(String imageUri, View view, Bitmap loadedImage) {
        // Do whatever you want with Bitmap
    }
});

```
获取Bitmap时，也可以指定要获取的图片尺寸

```java
ImageSize targetSize = new ImageSize(80, 50); // result Bitmap will be fit to this size
imageLoader.loadImage(imageUri, targetSize, options, new SimpleImageLoadingListener() {
    @Override
    public void onLoadingComplete(String imageUri, View view, Bitmap loadedImage) {
        // Do whatever you want with Bitmap
    }
});

```


* loadImageSync：异步加载图片，转换为Bitmap对象并返回。

```java
Bitmap bmp = imageLoader.loadImageSync(imageUri);

```


