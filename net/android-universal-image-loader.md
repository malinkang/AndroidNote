### 1. 介绍

[Universal Image Loader](https://github.com/nostra13/Android-Universal-Image-Loader) 具有以下特性：

* 多线程加载图片
* 可以高度的自定义ImageLoader的配置（如线程执行，下载器，编码，内存和硬盘缓存，图片展示的选项等等）
* 许多自定义选项可以被每个展示的图片调用
* 图片可以缓存在内存中和硬盘上
* 可以监听图片的加载进度和下载进度

### 2.基本配置

#### 2.1 构建项目

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

#### 2.2 配置 Android Manifest

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

#### 2.3 在Application和Activity中初始化ImageLoader

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

### 3.使用

#### 3.1 支持多种URI

Universal Image Loader 不仅可以加载网络图片还可以加载内存卡，asset文件夹下的图片等等。

```java

String imageUri = "http://site.com/image.png"; // from Web
String imageUri = "file:///mnt/sdcard/image.png"; // from SD card
String imageUri = "content://media/external/audio/albumart/1"; // from content provider
String imageUri = "assets://image.png"; // from assets
String imageUri = "drawable://" + R.drawable.img; // from drawables (non-9patch images)

```

#### 3.2ImageLoader常用方法

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

* loadImage：加载图片，转换为Bitmap对象并且将Bitmap对象返回给回调函数。

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

### 4.源码分析

#### 4.1 ImageLoader

displayImage方法

```java
public void displayImage(String uri, ImageAware imageAware, DisplayImageOptions options,
			ImageSize targetSize, ImageLoadingListener listener, ImageLoadingProgressListener progressListener) {
		checkConfiguration();
		if (imageAware == null) {
			throw new IllegalArgumentException(ERROR_WRONG_ARGUMENTS);
		}
		if (listener == null) {
			listener = defaultListener;
		}
		if (options == null) {
			options = configuration.defaultDisplayImageOptions;
		}

		if (TextUtils.isEmpty(uri)) {
			engine.cancelDisplayTaskFor(imageAware);
			listener.onLoadingStarted(uri, imageAware.getWrappedView());
			if (options.shouldShowImageForEmptyUri()) {
				imageAware.setImageDrawable(options.getImageForEmptyUri(configuration.resources));
			} else {
				imageAware.setImageDrawable(null);
			}
			listener.onLoadingComplete(uri, imageAware.getWrappedView(), null);
			return;
		}

		if (targetSize == null) {
			targetSize = ImageSizeUtils.defineTargetSizeForView(imageAware, configuration.getMaxImageSize());
		}
		String memoryCacheKey = MemoryCacheUtils.generateKey(uri, targetSize);
		engine.prepareDisplayTaskFor(imageAware, memoryCacheKey);
		//监听器执行onLoadingStarted方法
		listener.onLoadingStarted(uri, imageAware.getWrappedView());
		//从缓存中读取图片
		Bitmap bmp = configuration.memoryCache.get(memoryCacheKey);
		if (bmp != null && !bmp.isRecycled()) {
			//图片不为空并且没有被回收
			L.d(LOG_LOAD_IMAGE_FROM_MEMORY_CACHE, memoryCacheKey);

			if (options.shouldPostProcess()) {
				ImageLoadingInfo imageLoadingInfo = new ImageLoadingInfo(uri, imageAware, targetSize, memoryCacheKey,
						options, listener, progressListener, engine.getLockForUri(uri));
				ProcessAndDisplayImageTask displayTask = new ProcessAndDisplayImageTask(engine, bmp, imageLoadingInfo,
						defineHandler(options));
				if (options.isSyncLoading()) {
					//同步
					displayTask.run();
				} else {
					//异步
					engine.submit(displayTask);
				}
			} else {
				options.getDisplayer().display(bmp, imageAware, LoadedFrom.MEMORY_CACHE);
				listener.onLoadingComplete(uri, imageAware.getWrappedView(), bmp);
			}
		} else {
			//图片为空
			if (options.shouldShowImageOnLoading()) {
				imageAware.setImageDrawable(options.getImageOnLoading(configuration.resources));
			} else if (options.isResetViewBeforeLoading()) {
				imageAware.setImageDrawable(null);
			}

			ImageLoadingInfo imageLoadingInfo = new ImageLoadingInfo(uri, imageAware, targetSize, memoryCacheKey,
					options, listener, progressListener, engine.getLockForUri(uri));
			LoadAndDisplayImageTask displayTask = new LoadAndDisplayImageTask(engine, imageLoadingInfo,
					defineHandler(options));
			if (options.isSyncLoading()) {
				displayTask.run();
			} else {
				engine.submit(displayTask);
			}
		}
	}
```

#### 4.2 LoadAndDisplayImageTask

```java
@Override
	public void run() {
		if (waitIfPaused()) return;
		if (delayIfNeed()) return;

		ReentrantLock loadFromUriLock = imageLoadingInfo.loadFromUriLock;
		L.d(LOG_START_DISPLAY_IMAGE_TASK, memoryCacheKey);
		if (loadFromUriLock.isLocked()) {
			L.d(LOG_WAITING_FOR_IMAGE_LOADED, memoryCacheKey);
		}

		loadFromUriLock.lock();
		Bitmap bmp;
		try {
			checkTaskNotActual();

			bmp = configuration.memoryCache.get(memoryCacheKey);
			if (bmp == null || bmp.isRecycled()) {
				bmp = tryLoadBitmap();
				if (bmp == null) return; // listener callback already was fired

				checkTaskNotActual();
				checkTaskInterrupted();

				if (options.shouldPreProcess()) {
					L.d(LOG_PREPROCESS_IMAGE, memoryCacheKey);
					bmp = options.getPreProcessor().process(bmp);
					if (bmp == null) {
						L.e(ERROR_PRE_PROCESSOR_NULL, memoryCacheKey);
					}
				}

				if (bmp != null && options.isCacheInMemory()) {
					L.d(LOG_CACHE_IMAGE_IN_MEMORY, memoryCacheKey);
					//缓存到内存中
					configuration.memoryCache.put(memoryCacheKey, bmp);
				}
			} else {
				loadedFrom = LoadedFrom.MEMORY_CACHE;
				L.d(LOG_GET_IMAGE_FROM_MEMORY_CACHE_AFTER_WAITING, memoryCacheKey);
			}

			if (bmp != null && options.shouldPostProcess()) {
				L.d(LOG_POSTPROCESS_IMAGE, memoryCacheKey);
				bmp = options.getPostProcessor().process(bmp);
				if (bmp == null) {
					L.e(ERROR_POST_PROCESSOR_NULL, memoryCacheKey);
				}
			}
			checkTaskNotActual();
			checkTaskInterrupted();
		} catch (TaskCancelledException e) {
			fireCancelEvent();
			return;
		} finally {
			loadFromUriLock.unlock();
		}

		DisplayBitmapTask displayBitmapTask = new DisplayBitmapTask(bmp, imageLoadingInfo, engine, loadedFrom);
		runTask(displayBitmapTask, syncLoading, handler, engine);
	}
```
tryLoadBitmap方法

```java
private Bitmap tryLoadBitmap() throws TaskCancelledException {
		Bitmap bitmap = null;
		try {
			//从硬盘缓存中获取图片
			File imageFile = configuration.diskCache.get(uri);
			if (imageFile != null && imageFile.exists() && imageFile.length() > 0) {
				L.d(LOG_LOAD_IMAGE_FROM_DISK_CACHE, memoryCacheKey);
				loadedFrom = LoadedFrom.DISC_CACHE;

				checkTaskNotActual();
				bitmap = decodeImage(Scheme.FILE.wrap(imageFile.getAbsolutePath()));
			}
			//从网络加载图片
			if (bitmap == null || bitmap.getWidth() <= 0 || bitmap.getHeight() <= 0) {
				L.d(LOG_LOAD_IMAGE_FROM_NETWORK, memoryCacheKey);
				loadedFrom = LoadedFrom.NETWORK;

				String imageUriForDecoding = uri;
				if (options.isCacheOnDisk() && tryCacheImageOnDisk()) {
					imageFile = configuration.diskCache.get(uri);
					if (imageFile != null) {
						imageUriForDecoding = Scheme.FILE.wrap(imageFile.getAbsolutePath());
					}
				}

				checkTaskNotActual();
				bitmap = decodeImage(imageUriForDecoding);

				if (bitmap == null || bitmap.getWidth() <= 0 || bitmap.getHeight() <= 0) {
					fireFailEvent(FailType.DECODING_ERROR, null);
				}
			}
		} catch (IllegalStateException e) {
			fireFailEvent(FailType.NETWORK_DENIED, null);
		} catch (TaskCancelledException e) {
			throw e;
		} catch (IOException e) {
			L.e(e);
			fireFailEvent(FailType.IO_ERROR, e);
		} catch (OutOfMemoryError e) {
			L.e(e);
			fireFailEvent(FailType.OUT_OF_MEMORY, e);
		} catch (Throwable e) {
			L.e(e);
			fireFailEvent(FailType.UNKNOWN, e);
		}
		return bitmap;
	}
```
```java
//缓存图片到硬盘上
	private boolean tryCacheImageOnDisk() throws TaskCancelledException {
		L.d(LOG_CACHE_IMAGE_ON_DISK, memoryCacheKey);

		boolean loaded;
		try {
			loaded = downloadImage();
			if (loaded) {
				int width = configuration.maxImageWidthForDiskCache;
				int height = configuration.maxImageHeightForDiskCache;
				if (width > 0 || height > 0) {
					L.d(LOG_RESIZE_CACHED_IMAGE_FILE, memoryCacheKey);
					resizeAndSaveImage(width, height); // TODO : process boolean result
				}
			}
		} catch (IOException e) {
			L.e(e);
			loaded = false;
		}
		return loaded;
	}
```

#### 4.3 下载图片

* ImageDownloader:接口
    + BaseImageDownloader

#### 4.4 硬盘缓存

* DiskCache
    + LruDiskCache
    + BaseDiskCache
        + UnlimitedDiskCache：默认


#### 4.5 内存缓存
* MemoryCache
    + LruMemoryCache：默认
    + FuzzyKeyMemoryCache
    + BaseMemoryCache
        + WeakMemoryCache
        + LimitedMemoryCache
            + LargestLimitedMemoryCache
            + UsingFreqLimitedMemoryCache
            + LRULimitedMemoryCache
            + LimitedAgeMemoryCache
            
### 参考
* [Android Universal Image Loader 源码分析](http://codekk.com/open-source-project-analysis/detail/Android/huxian99/Android%20Universal%20Image%20Loader%20%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90)
