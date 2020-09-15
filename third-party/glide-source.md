# Glide源码分析

`Glide`的使用非常简单只需要调用`with`、`load` `into`三个方法。

```java
 GlideApp.with(this)
        .load(url)
        .into(imageView);
```

接下来，我们依次分析这三个方法。

## with\(\)

```java
//Glide.java
public static RequestManager with(@NonNull Activity activity) {
  //先获取RequestManagerRetriever对象
  //调用RequestManagerRetriever的get方法获取RequestManager
  return getRetriever(activity).get(activity); 
}
private static RequestManagerRetriever getRetriever(@Nullable Context context) {
  // Context could be null for other reasons (ie the user passes in null), but in practice it will
  // only occur due to errors with the Fragment lifecycle.
  Preconditions.checkNotNull(
      context,
      "You cannot start a load on a not yet attached View or a Fragment where getActivity() "
          + "returns null (which usually occurs when getActivity() is called before the Fragment "
          + "is attached or after the Fragment is destroyed).");
  
  return Glide.get(context).getRequestManagerRetriever();
}

```

### get\(\)

```java
@NonNull
public static Glide get(@NonNull Context context) {
  if (glide == null) {
    //获取生成的GdlieModule类
    GeneratedAppGlideModule annotationGeneratedModule =
        getAnnotationGeneratedGlideModules(context.getApplicationContext());
    synchronized (Glide.class) {
      if (glide == null) {
        //初始化Glide
        checkAndInitializeGlide(context, annotationGeneratedModule);
      }
    }
  }
  return glide;
}
```

### ApiGlideModule

`ApiGlideModule`定义了在应用程序中初始化 `Glide` 时要使用的一系列依赖关系和选项。

![](../.gitbook/assets/image%20%2852%29.png)

```java
//GeneratedAppGlideModuleImpl
 @Override
 @NonNull
 GeneratedRequestManagerFactory getRequestManagerFactory() {
   return new GeneratedRequestManagerFactory();
 }
```

### checkAndInitializeGlide\(\)

```java
@GuardedBy("Glide.class")
private static void checkAndInitializeGlide(
    @NonNull Context context, @Nullable GeneratedAppGlideModule generatedAppGlideModule) {
    // In the thread running initGlide(), one or more classes may call Glide.get(context).
    // Without this check, those calls could trigger infinite recursion.
    if (isInitializing) {
        throw new IllegalStateException(
            "You cannot call Glide.get() in registerComponents(),"
                + " use the provided Glide instance instead");
    }
    isInitializing = true;
    initializeGlide(context, generatedAppGlideModule);
    isInitializing = false;
}
```

### initializeGlide\(\)

```java
@GuardedBy("Glide.class")
private static void initializeGlide(
    @NonNull Context context, @Nullable GeneratedAppGlideModule generatedAppGlideModule) {
    initializeGlide(context, new GlideBuilder(), generatedAppGlideModule);
}
```

```java
  @GuardedBy("Glide.class")
  @SuppressWarnings("deprecation")
  private static void initializeGlide(
      @NonNull Context context,
      @NonNull GlideBuilder builder,
      @Nullable GeneratedAppGlideModule annotationGeneratedModule) {
    Context applicationContext = context.getApplicationContext();
    List<com.bumptech.glide.module.GlideModule> manifestModules = Collections.emptyList();
    if (annotationGeneratedModule == null || annotationGeneratedModule.isManifestParsingEnabled()) {
      //解析ManifestParser 老的Glide版本需要在清单文件中注册GlideModule
      manifestModules = new ManifestParser(applicationContext).parse();
    }

    if (annotationGeneratedModule != null
        && !annotationGeneratedModule.getExcludedModuleClasses().isEmpty()) {
      Set<Class<?>> excludedModuleClasses = annotationGeneratedModule.getExcludedModuleClasses();
      Iterator<com.bumptech.glide.module.GlideModule> iterator = manifestModules.iterator();
      while (iterator.hasNext()) {
        com.bumptech.glide.module.GlideModule current = iterator.next();
        if (!excludedModuleClasses.contains(current.getClass())) {
          continue;
        }
        if (Log.isLoggable(TAG, Log.DEBUG)) {
          Log.d(TAG, "AppGlideModule excludes manifest GlideModule: " + current);
        }
        iterator.remove();
      }
    }

    if (Log.isLoggable(TAG, Log.DEBUG)) {
      for (com.bumptech.glide.module.GlideModule glideModule : manifestModules) {
        Log.d(TAG, "Discovered GlideModule from manifest: " + glideModule.getClass());
      }
    }
    //获取RequestManagerFactory即GeneratedRequestManagerFactory
    RequestManagerRetriever.RequestManagerFactory factory =
        annotationGeneratedModule != null
            ? annotationGeneratedModule.getRequestManagerFactory()
            : null;
    //为GlideBuilder设置RequestManagerFactory
    builder.setRequestManagerFactory(factory);
    for (com.bumptech.glide.module.GlideModule module : manifestModules) {
      module.applyOptions(applicationContext, builder);
    }
    if (annotationGeneratedModule != null) {
      annotationGeneratedModule.applyOptions(applicationContext, builder);
    }
    //调用build方法创建Glide对象
    Glide glide = builder.build(applicationContext);
    for (com.bumptech.glide.module.GlideModule module : manifestModules) {
      try {
        module.registerComponents(applicationContext, glide, glide.registry);
      } catch (AbstractMethodError e) {
        throw new IllegalStateException(
            "Attempting to register a Glide v3 module. If you see this, you or one of your"
                + " dependencies may be including Glide v3 even though you're using Glide v4."
                + " You'll need to find and remove (or update) the offending dependency."
                + " The v3 module name is: "
                + module.getClass().getName(),
            e);
      }
    }
    if (annotationGeneratedModule != null) {
      annotationGeneratedModule.registerComponents(applicationContext, glide, glide.registry);
    }
    applicationContext.registerComponentCallbacks(glide);
    Glide.glide = glide;
  }
```

### GlideBuilder

```java
  @NonNull
  Glide build(@NonNull Context context) {
    if (sourceExecutor == null) {
      sourceExecutor = GlideExecutor.newSourceExecutor();
    }
    //执行硬盘缓存的线程池
    if (diskCacheExecutor == null) {
      diskCacheExecutor = GlideExecutor.newDiskCacheExecutor();
    }
    //动画线程池
    if (animationExecutor == null) {
      animationExecutor = GlideExecutor.newAnimationExecutor();
    }
    //内存大小计算
    if (memorySizeCalculator == null) {
      memorySizeCalculator = new MemorySizeCalculator.Builder(context).build();
    }
    //创建默认连接监听工厂
    if (connectivityMonitorFactory == null) {
      connectivityMonitorFactory = new DefaultConnectivityMonitorFactory();
    }
    //除了ArrayPool之外每个缓存都有两个版本。
    //LruBitmapPool BitmapPoolAdapter
    //LruResourceCache MemoryCacheAdapter
    //DiskLruCacheWrapper DiskCacheAdapter
    //当内存不足的时候调用XXAdapter，put方法里什么也不做
    // 正常调用LruXX
    //BitmapPool
    if (bitmapPool == null) {
      int size = memorySizeCalculator.getBitmapPoolSize();
      if (size > 0) {
        bitmapPool = new LruBitmapPool(size);
      } else {
        bitmapPool = new BitmapPoolAdapter();
      }
    }
    //ArrayPool
    if (arrayPool == null) {
      arrayPool = new LruArrayPool(memorySizeCalculator.getArrayPoolSizeInBytes());
    }
   //MemoryCache
    if (memoryCache == null) {
      memoryCache = new LruResourceCache(memorySizeCalculator.getMemoryCacheSize());
    }
    //DiskCacheFactory
    if (diskCacheFactory == null) {
      diskCacheFactory = new InternalCacheDiskCacheFactory(context);
    }
    //创建Engine
    if (engine == null) {
      engine =
          new Engine(
              memoryCache,
              diskCacheFactory,
              diskCacheExecutor,
              sourceExecutor,
              GlideExecutor.newUnlimitedSourceExecutor(),//无限制缓存池
              animationExecutor,
              isActiveResourceRetentionAllowed);
    }

    if (defaultRequestListeners == null) {
      defaultRequestListeners = Collections.emptyList();
    } else {
      defaultRequestListeners = Collections.unmodifiableList(defaultRequestListeners);
    }
    //创建RequestManagerRetriever
    RequestManagerRetriever requestManagerRetriever =
        new RequestManagerRetriever(
            requestManagerFactory, waitForFirstFrameBeforeEnablingHardwareBitmaps);

    boolean blockHardwareBitmaps =
        waitForFirstFrameBeforeEnablingHardwareBitmaps || waitForCallBeforeEnablingHardwareBitmaps;
    //调用Glide构造函数创建Glide对象
    return new Glide(
        context,
        engine,
        memoryCache,
        bitmapPool,
        arrayPool,
        requestManagerRetriever,
        connectivityMonitorFactory,
        logLevel,
        defaultRequestOptionsFactory,
        defaultTransitionOptions,
        defaultRequestListeners,
        isLoggingRequestOriginsEnabled,
        isImageDecoderEnabledForBitmaps,
        blockHardwareBitmaps,
        manualOverrideHardwareBitmapMaxFdCount);
  }
```

### GlideExecutor

在`build()`中一共创建了4个线程池

`newDiskCacheExecutor()`创建磁盘缓存的线程池

```java
  private static final int DEFAULT_DISK_CACHE_EXECUTOR_THREADS = 1;
  public static GlideExecutor newDiskCacheExecutor() {
    return newDiskCacheBuilder().build();
  }
  public static GlideExecutor.Builder newDiskCacheBuilder() {
    return new GlideExecutor.Builder(/*preventNetworkOperations=*/ true)
        .setThreadCount(DEFAULT_DISK_CACHE_EXECUTOR_THREADS) //线程数1
        .setName(DEFAULT_DISK_CACHE_EXECUTOR_NAME);
  }
```

其余三个线程池都是负责下载和解码的`newAnimationBuilder`是用来处理gif的。

```java
public final class GlideExecutor implements ExecutorService {
  private static final int MAXIMUM_AUTOMATIC_THREAD_COUNT = 4;
  
  public static GlideExecutor newSourceExecutor() {
    return newSourceBuilder().build();
  }
  public static GlideExecutor.Builder newSourceBuilder() {
    return new GlideExecutor.Builder(/*preventNetworkOperations=*/ false)
        .setThreadCount(calculateBestThreadCount())
        .setName(DEFAULT_SOURCE_EXECUTOR_NAME);
  }
  //计算最佳的线程数量
  public static int calculateBestThreadCount() {
    if (bestThreadCount == 0) {
      //cpu内核数量和4取最小值
      bestThreadCount =
          Math.min(MAXIMUM_AUTOMATIC_THREAD_COUNT, RuntimeCompat.availableProcessors());
    }
    return bestThreadCount;
  }
}
```

```java
  public static GlideExecutor.Builder newAnimationBuilder() {
    int bestThreadCount = calculateBestThreadCount();
    // We don't want to add a ton of threads running animations in parallel with our source and
    // disk cache executors. Doing so adds unnecessary CPU load and can also dramatically increase
    // our maximum memory usage. Typically one thread is sufficient here, but for higher end devices
    // with more cores, two threads can provide better performance if lots of GIFs are showing at
    // once.
    //我们不希望增加大量线程来并行运行动画，我们的源代码和磁盘缓存执行器。
    //这样做增加了不必要的CPU负载，也会大大增加了我们的最大内存使用量。
    //通常情况下，一个线程就足够了，但对于更高端的设备来说。
    //如果有更多的核心，两个线程可以提供更好的性能，如果大量的GIF显示一次。
    int maximumPoolSize = bestThreadCount >= 4 ? 2 : 1;

    return new GlideExecutor.Builder(/*preventNetworkOperations=*/ true)
        .setThreadCount(maximumPoolSize)
        .setName(DEFAULT_ANIMATION_EXECUTOR_NAME);
  }

  /** Shortcut for calling {@link Builder#build()} on {@link #newAnimationBuilder()}. */
  public static GlideExecutor newAnimationExecutor() {
    return newAnimationBuilder().build();
  }
```

```java
  public static GlideExecutor newUnlimitedSourceExecutor() {
    return new GlideExecutor(
        new ThreadPoolExecutor(
            0,
            Integer.MAX_VALUE,
            KEEP_ALIVE_TIME_MS,
            TimeUnit.MILLISECONDS,
            new SynchronousQueue<Runnable>(),
            new DefaultThreadFactory(
                DEFAULT_SOURCE_UNLIMITED_EXECUTOR_NAME, UncaughtThrowableStrategy.DEFAULT, false)));
  }
```

这三个线程池选用哪个呢？

```java
  //EngineJob.java
  private GlideExecutor getActiveSourceExecutor() {
    return useUnlimitedSourceGeneratorPool
        ? sourceUnlimitedExecutor
        : (useAnimationPool ? animationExecutor : sourceExecutor);
  }
```

`useUnlimitedSourceGeneratorsPool`和`useAnimationPool`可以通过`BaseRequestOptions`进行配置。

```java
  private boolean useUnlimitedSourceGeneratorsPool;
  private boolean useAnimationPool;
  @NonNull
  @CheckResult
  public T useAnimationPool(boolean flag) {
    if (isAutoCloneEnabled) {
      return clone().useAnimationPool(flag);
    }

    useAnimationPool = flag;
    fields |= USE_ANIMATION_POOL;

    return selfOrThrowIfLocked();
  }
  
```

`useAnimationPool`默认不需要配置。系统默认会在处理gif的时候设置为true。

```java
  //GifFrameLoader.java
  private static RequestBuilder<Bitmap> getRequestBuilder(
      RequestManager requestManager, int width, int height) {
    return requestManager
        .asBitmap()
        .apply(
            diskCacheStrategyOf(DiskCacheStrategy.NONE)
                .useAnimationPool(true)
                .skipMemoryCache(true)
                .override(width, height));
  }
```

### MemorySizeCalculator

```java
  public static final class Builder {
    @VisibleForTesting static final int MEMORY_CACHE_TARGET_SCREENS = 2;

    /**
     * On Android O+, we use {@link android.graphics.Bitmap.Config#HARDWARE} for all reasonably
     * sized images unless we're creating thumbnails for the first time. As a result, the Bitmap
     * pool is much less important on O than it was on previous versions.
     */
    static final int BITMAP_POOL_TARGET_SCREENS =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.O ? 4 : 1;

    static final float MAX_SIZE_MULTIPLIER = 0.4f;
    static final float LOW_MEMORY_MAX_SIZE_MULTIPLIER = 0.33f;
    // 4MB.
    static final int ARRAY_POOL_SIZE_BYTES = 4 * 1024 * 1024;

    @Synthetic final Context context;

    // Modifiable (non-final) for testing.
    @Synthetic ActivityManager activityManager;
    @Synthetic ScreenDimensions screenDimensions;

    @Synthetic float memoryCacheScreens = MEMORY_CACHE_TARGET_SCREENS;
    @Synthetic float bitmapPoolScreens = BITMAP_POOL_TARGET_SCREENS;
    @Synthetic float maxSizeMultiplier = MAX_SIZE_MULTIPLIER;
    @Synthetic float lowMemoryMaxSizeMultiplier = LOW_MEMORY_MAX_SIZE_MULTIPLIER;
    @Synthetic int arrayPoolSizeBytes = ARRAY_POOL_SIZE_BYTES;
 }
```

```java
// Package private to avoid PMD warning.
  MemorySizeCalculator(MemorySizeCalculator.Builder builder) {
    this.context = builder.context;
    //4M 低内存设备2M
    arrayPoolSize =
        isLowMemoryDevice(builder.activityManager)
            ? builder.arrayPoolSizeBytes / LOW_MEMORY_BYTE_ARRAY_POOL_DIVISOR
            : builder.arrayPoolSizeBytes;
    //计算最大大小
    int maxSize =
        getMaxSize(
            builder.activityManager, builder.maxSizeMultiplier, builder.lowMemoryMaxSizeMultiplier);

    int widthPixels = builder.screenDimensions.getWidthPixels();
    int heightPixels = builder.screenDimensions.getHeightPixels();
    //计算一张格式为 ARGB_8888 ，大小为屏幕大小的图片的占用内存大小
    //BYTES_PER_ARGB_8888_PIXEL 值为 4
    int screenSize = widthPixels * heightPixels * BYTES_PER_ARGB_8888_PIXEL;
    //BitmapPool大小
    //BitmapPool和MemoryCache的大小依赖当前屏幕分辨率
    int targetBitmapPoolSize = Math.round(screenSize * builder.bitmapPoolScreens);
    //MemoryCache大小 
    int targetMemoryCacheSize = Math.round(screenSize * builder.memoryCacheScreens);
    int availableSize = maxSize - arrayPoolSize;
    //小于可用大小 按照计算的值分配
    if (targetMemoryCacheSize + targetBitmapPoolSize <= availableSize) {
      memoryCacheSize = targetMemoryCacheSize;
      bitmapPoolSize = targetBitmapPoolSize;
    } else {
      //将可用的分配
      float part = availableSize / (builder.bitmapPoolScreens + builder.memoryCacheScreens);
      memoryCacheSize = Math.round(part * builder.memoryCacheScreens);
      bitmapPoolSize = Math.round(part * builder.bitmapPoolScreens);
    }
  }
```

```java
  private static int getMaxSize(
      ActivityManager activityManager, float maxSizeMultiplier, float lowMemoryMaxSizeMultiplier) {
    final int memoryClassBytes = activityManager.getMemoryClass() * 1024 * 1024;
    final boolean isLowMemoryDevice = isLowMemoryDevice(activityManager);
    return Math.round(
        memoryClassBytes * (isLowMemoryDevice ? lowMemoryMaxSizeMultiplier : maxSizeMultiplier));
  }
```

### 磁盘缓存

![](../.gitbook/assets/image%20%2855%29.png)

```java
public final class InternalCacheDiskCacheFactory extends DiskLruCacheFactory {

  public InternalCacheDiskCacheFactory(Context context) {
    this(
        context,
        DiskCache.Factory.DEFAULT_DISK_CACHE_DIR,
        DiskCache.Factory.DEFAULT_DISK_CACHE_SIZE);
  }

  public InternalCacheDiskCacheFactory(Context context, long diskCacheSize) {
    this(context, DiskCache.Factory.DEFAULT_DISK_CACHE_DIR, diskCacheSize);
  }

  public InternalCacheDiskCacheFactory(
      final Context context, final String diskCacheName, long diskCacheSize) {
    super(
        new CacheDirectoryGetter() {
          @Override
          public File getCacheDirectory() {
            File cacheDirectory = context.getCacheDir();
            if (cacheDirectory == null) {
              return null;
            }
            if (diskCacheName != null) {
              return new File(cacheDirectory, diskCacheName);
            }
            return cacheDirectory;
          }
        },
        diskCacheSize);
  }
}
```

```java
 interface Factory {
    /** 250 MB of cache. */
    int DEFAULT_DISK_CACHE_SIZE = 250 * 1024 * 1024;

    String DEFAULT_DISK_CACHE_DIR = "image_manager_disk_cache";

    /** Returns a new disk cache, or {@code null} if no disk cache could be created. */
    @Nullable
    DiskCache build();
  }
```

### get\(\)

```java
  @NonNull
  public RequestManager get(@NonNull Activity activity) {
    //获取RequestManager
    if (Util.isOnBackgroundThread()) {
      return get(activity.getApplicationContext());
    } else if (activity instanceof FragmentActivity) {
      return get((FragmentActivity) activity);
    } else {
      assertNotDestroyed(activity);
      maybeRegisterFirstFrameWaiter(activity);
      android.app.FragmentManager fm = activity.getFragmentManager();
      return fragmentGet(activity, fm, /*parentHint=*/ null, isActivityVisible(activity));
    }
  }
```

### Lifecycle

Glide会添加一个透明的Fragment，当Fragment执行生命周期方法时，回调`Lifecycle`注册的`LifecycleListener`。

![](../.gitbook/assets/image%20%2857%29.png)

```java
@Deprecated
  @NonNull
  private RequestManager fragmentGet(
      @NonNull Context context,
      @NonNull android.app.FragmentManager fm,
      @Nullable android.app.Fragment parentHint,
      boolean isParentVisible) {
    //创建RequestManagerFragment
    RequestManagerFragment current = getRequestManagerFragment(fm, parentHint);
    RequestManager requestManager = current.getRequestManager();
    if (requestManager == null) {
      // TODO(b/27524013): Factor out this Glide.get() call.
      Glide glide = Glide.get(context);
      //将Lifecycle和RequestManagerTreeNode传递给RequestManager
      requestManager =
          factory.build(
              glide, current.getGlideLifecycle(), current.getRequestManagerTreeNode(), context);
      // This is a bit of hack, we're going to start the RequestManager, but not the
      // corresponding Lifecycle. It's safe to start the RequestManager, but starting the
      // Lifecycle might trigger memory leaks. See b/154405040
      if (isParentVisible) {
        requestManager.onStart();
      }
      current.setRequestManager(requestManager);
    }
    return requestManager;
  }
```

```java
  @SuppressWarnings("deprecation")
  @NonNull
  private RequestManagerFragment getRequestManagerFragment(
      @NonNull final android.app.FragmentManager fm, @Nullable android.app.Fragment parentHint) {
    RequestManagerFragment current = (RequestManagerFragment) fm.findFragmentByTag(FRAGMENT_TAG);
    if (current == null) {
      //从Map中获取RequestManagerFragment
      current = pendingRequestManagerFragments.get(fm);
      if (current == null) {
        //创建ReqeustManagerFragment
        //创建Fragment的时候创建Lifecycle
        current = new RequestManagerFragment();
        current.setParentFragmentHint(parentHint);
        pendingRequestManagerFragments.put(fm, current);
        //添加fragment
        fm.beginTransaction().add(current, FRAGMENT_TAG).commitAllowingStateLoss();
        handler.obtainMessage(ID_REMOVE_FRAGMENT_MANAGER, fm).sendToTarget();
      }
    }
    return current;
  }
```

```java
  public RequestManagerFragment() {
    this(new ActivityFragmentLifecycle());
  }
```

### LifecycleListener

![](../.gitbook/assets/image%20%2860%29.png)

### RequestManager

在`RequestManager`中将当前对象和`DefaultConnectivityMonitor`和注册到`Lifecycle`。

```java
  private final Runnable addSelfToLifecycle =
      new Runnable() {
        @Override
        public void run() {
          lifecycle.addListener(RequestManager.this);
        }
      };
  private final ConnectivityMonitor connectivityMonitor;
  // Adding default listeners should be much less common than starting new requests. We want
  // some way of making sure that requests don't mutate our listeners without creating a new copy of
  // the list each time a request is started.
  private final CopyOnWriteArrayList<RequestListener<Object>> defaultRequestListeners;

  @GuardedBy("this")
  private RequestOptions requestOptions;

  private boolean pauseAllRequestsOnTrimMemoryModerate;

  public RequestManager(
      @NonNull Glide glide,
      @NonNull Lifecycle lifecycle,
      @NonNull RequestManagerTreeNode treeNode,
      @NonNull Context context) {
    this(
        glide,
        lifecycle,
        treeNode,
        new RequestTracker(),
        glide.getConnectivityMonitorFactory(),
        context);
  }

  // Our usage is safe here.
  @SuppressWarnings("PMD.ConstructorCallsOverridableMethod")
  RequestManager(
      Glide glide,
      Lifecycle lifecycle,
      RequestManagerTreeNode treeNode,
      RequestTracker requestTracker,
      ConnectivityMonitorFactory factory,
      Context context) {
    this.glide = glide;
    this.lifecycle = lifecycle;
    this.treeNode = treeNode;
    this.requestTracker = requestTracker;
    this.context = context;

    connectivityMonitor =
        factory.build(
            context.getApplicationContext(),
            new RequestManagerConnectivityListener(requestTracker));

    // If we're the application level request manager, we may be created on a background thread.
    // In that case we cannot risk synchronously pausing or resuming requests, so we hack around the
    // issue by delaying adding ourselves as a lifecycle listener by posting to the main thread.
    // This should be entirely safe.
    if (Util.isOnBackgroundThread()) {
      Util.postOnUiThread(addSelfToLifecycle);
    } else {
      lifecycle.addListener(this);
    }
    //添加
    lifecycle.addListener(connectivityMonitor);

    defaultRequestListeners =
        new CopyOnWriteArrayList<>(glide.getGlideContext().getDefaultRequestListeners());
    setRequestOptions(glide.getGlideContext().getDefaultRequestOptions());

    glide.registerRequestManager(this);
  }

```

## load\(\)

通过`with()`方法返回了一个`RequestManager`对象，所以`load()`方法调用的是`RequestManager`的`load()`方法。

```java
@NonNull
@CheckResult
@Override
public RequestBuilder<Drawable> load(@Nullable String string) {
  return asDrawable().load(string);
}
@NonNull
@CheckResult
public RequestBuilder<Drawable> asDrawable() {
  return as(Drawable.class);
}
@NonNull
@CheckResult
public <ResourceType> RequestBuilder<ResourceType> as(
    @NonNull Class<ResourceType> resourceClass) {
    //创建RequestBuilder
  return new RequestBuilder<>(glide, this, resourceClass, context);
}
```

### RequestBuilder

![](../.gitbook/assets/image%20%2854%29.png)

## into\(\)

`load()`比较简单就是创建一个`RequestBuilder`对象。`into()`方法就是调用`RequestBuilder`的`into()`。

```java
 @NonNull
  public ViewTarget<ImageView, TranscodeType> into(@NonNull ImageView view) {
    Util.assertMainThread();
    Preconditions.checkNotNull(view);

    BaseRequestOptions<?> requestOptions = this;
    if (!requestOptions.isTransformationSet()
        && requestOptions.isTransformationAllowed()
        && view.getScaleType() != null) {
      // Clone in this method so that if we use this RequestBuilder to load into a View and then
      // into a different target, we don't retain the transformation applied based on the previous
      // View's scale type.
      switch (view.getScaleType()) {
        case CENTER_CROP:
          requestOptions = requestOptions.clone().optionalCenterCrop();
          break;
        case CENTER_INSIDE:
          requestOptions = requestOptions.clone().optionalCenterInside();
          break;
        case FIT_CENTER:
        case FIT_START:
        case FIT_END:
          requestOptions = requestOptions.clone().optionalFitCenter();
          break;
        case FIT_XY:
          requestOptions = requestOptions.clone().optionalCenterInside();
          break;
        case CENTER:
        case MATRIX:
        default:
          // Do nothing.
      }
    }

    return into(
        glideContext.buildImageViewTarget(view, transcodeClass),
        /*targetListener=*/ null,
        requestOptions,
        Executors.mainThreadExecutor());
  }
```

```java
  private <Y extends Target<TranscodeType>> Y into(
      @NonNull Y target,
      @Nullable RequestListener<TranscodeType> targetListener,
      BaseRequestOptions<?> options,
      Executor callbackExecutor) {
    Preconditions.checkNotNull(target);
    if (!isModelSet) {
      throw new IllegalArgumentException("You must call #load() before calling #into()");
    }
    //构建Request
    Request request = buildRequest(target, targetListener, options, callbackExecutor);

    Request previous = target.getRequest();
    if (request.isEquivalentTo(previous)
        && !isSkipMemoryCacheWithCompletePreviousRequest(options, previous)) {
      // If the request is completed, beginning again will ensure the result is re-delivered,
      // triggering RequestListeners and Targets. If the request is failed, beginning again will
      // restart the request, giving it another chance to complete. If the request is already
      // running, we can let it continue running without interruption.
      if (!Preconditions.checkNotNull(previous).isRunning()) {
        // Use the previous request rather than the new one to allow for optimizations like skipping
        // setting placeholders, tracking and un-tracking Targets, and obtaining View dimensions
        // that are done in the individual Request.
        previous.begin();
      }
      return target;
    }

    requestManager.clear(target);
    target.setRequest(request);
    //追踪Request
    requestManager.track(target, request);

    return target;
  }
```

### obtainRequest\(\)

```java
  private Request obtainRequest(
      Object requestLock,
      Target<TranscodeType> target,
      RequestListener<TranscodeType> targetListener,
      BaseRequestOptions<?> requestOptions,
      RequestCoordinator requestCoordinator,
      TransitionOptions<?, ? super TranscodeType> transitionOptions,
      Priority priority,
      int overrideWidth,
      int overrideHeight,
      Executor callbackExecutor) {
    return SingleRequest.obtain(
        context,
        glideContext,
        requestLock,
        model,
        transcodeClass,
        requestOptions,
        overrideWidth,
        overrideHeight,
        priority,
        target,
        targetListener,
        requestListeners,
        requestCoordinator,
        glideContext.getEngine(),
        transitionOptions.getTransitionFactory(),
        callbackExecutor);
  }
```

### Request

![](../.gitbook/assets/image%20%2853%29.png)

![&#x6574;&#x4F53;&#x6D41;&#x7A0B;](../.gitbook/assets/image%20%2858%29.png)

![&#x7B2C;&#x4E00;&#x6B21;&#x52A0;&#x8F7D;&#x7F51;&#x7EDC;&#x56FE;&#x7247;&#x7684;&#x7F16;&#x89E3;&#x7801;&#x8FC7;&#x7A0B;](../.gitbook/assets/image%20%2859%29.png)

### ModelLoader

`ModelLoader`类负责将`model`转换为`data`。`model`就是我们在调用`load`方法传入的值。

### getLoadData\(\)

```java
  //
  List<LoadData<?>> getLoadData() {
    if (!isLoadDataSet) {
      isLoadDataSet = true; //获取成功之后设置为true 避免多次获取
      loadData.clear();
      //根据Model获取ModelLoader
      List<ModelLoader<Object, ?>> modelLoaders = glideContext.getRegistry().getModelLoaders(model);
      //noinspection ForLoopReplaceableByForEach to improve perf
      for (int i = 0, size = modelLoaders.size(); i < size; i++) {
        ModelLoader<Object, ?> modelLoader = modelLoaders.get(i);
        LoadData<?> current = modelLoader.buildLoadData(model, width, height, options);
        if (current != null) {
          loadData.add(current);
        }
      }
    }
    return loadData;
  }
```

### getModelLoaders\(\)

```java
  @NonNull
  public <Model> List<ModelLoader<Model, ?>> getModelLoaders(@NonNull Model model) {
    return modelLoaderRegistry.getModelLoaders(model);
  }
```

```java
  @NonNull
  public <A> List<ModelLoader<A, ?>> getModelLoaders(@NonNull A model) {
    List<ModelLoader<A, ?>> modelLoaders = getModelLoadersForClass(getClass(model));
    if (modelLoaders.isEmpty()) {
      throw new NoModelLoaderAvailableException(model);
    }
    int size = modelLoaders.size();
    boolean isEmpty = true;
    List<ModelLoader<A, ?>> filteredLoaders = Collections.emptyList();
    //noinspection ForLoopReplaceableByForEach to improve perf
    for (int i = 0; i < size; i++) {
      ModelLoader<A, ?> loader = modelLoaders.get(i);
      if (loader.handles(model)) {
        if (isEmpty) {
          filteredLoaders = new ArrayList<>(size - i);
          isEmpty = false;
        }
         //根据ModelLoader的handles方法，过滤掉不匹配的
        //假设传入的是url，则过滤掉DataUrlLoader
        filteredLoaders.add(loader);
      }
    }
    if (filteredLoaders.isEmpty()) {
      throw new NoModelLoaderAvailableException(model, modelLoaders);
    }
    return filteredLoaders;
  }
```

```java
  @NonNull
  private synchronized <A> List<ModelLoader<A, ?>> getModelLoadersForClass(
      @NonNull Class<A> modelClass) {
    //从缓存中取
    List<ModelLoader<A, ?>> loaders = cache.get(modelClass);
    if (loaders == null) {
      //调用MultiModelLoaderFactory的build方法
      loaders = Collections.unmodifiableList(multiModelLoaderFactory.build(modelClass));
      cache.put(modelClass, loaders);
    }
    return loaders;
  }
```

```java
  @NonNull
  synchronized <Model> List<ModelLoader<Model, ?>> build(@NonNull Class<Model> modelClass) {
    try {
      List<ModelLoader<Model, ?>> loaders = new ArrayList<>();
      for (Entry<?, ?> entry : entries) {
        // Avoid stack overflow recursively creating model loaders by only creating loaders in
        // recursive requests if they haven't been created earlier in the chain. For example:
        // A Uri loader may translate to another model, which in turn may translate back to a Uri.
        // The original Uri loader won't be provided to the intermediate model loader, although
        // other Uri loaders will be.
        if (alreadyUsedEntries.contains(entry)) {
          continue;
        }
        //根据ModelClass进行判断
        if (entry.handles(modelClass)) {
          alreadyUsedEntries.add(entry);
          //调用Factory创建Loader
          loaders.add(this.<Model, Object>build(entry));
          alreadyUsedEntries.remove(entry);
        }
      }
      return loaders;
    } catch (Throwable t) {
      alreadyUsedEntries.clear();
      throw t;
    }
  }
```

```java
//StringLoader先将String转化为Uri
//通过MultiModelLoaderFactory获取一个MultiModelLoader对象
//内部调用的MultiModelLoader
public static class StreamFactory implements ModelLoaderFactory<String, InputStream> {

    @NonNull
    @Override
    public ModelLoader<String, InputStream> build(@NonNull MultiModelLoaderFactory multiFactory) {
      return new StringLoader<>(multiFactory.build(Uri.class, InputStream.class));
    }

    @Override
    public void teardown() {
      // Do nothing.
    }
}
```

```java
  @NonNull
  public synchronized <Model, Data> ModelLoader<Model, Data> build(
      @NonNull Class<Model> modelClass, @NonNull Class<Data> dataClass) {
    try {
      List<ModelLoader<Model, Data>> loaders = new ArrayList<>();
      boolean ignoredAnyEntries = false;
      for (Entry<?, ?> entry : entries) {
        // Avoid stack overflow recursively creating model loaders by only creating loaders in
        // recursive requests if they haven't been created earlier in the chain. For example:
        // A Uri loader may translate to another model, which in turn may translate back to a Uri.
        // The original Uri loader won't be provided to the intermediate model loader, although
        // other Uri loaders will be.
        if (alreadyUsedEntries.contains(entry)) {
          ignoredAnyEntries = true;
          continue;
        }
        if (entry.handles(modelClass, dataClass)) {
          alreadyUsedEntries.add(entry);
          loaders.add(this.<Model, Data>build(entry));
          alreadyUsedEntries.remove(entry);
        }
      }
      //如果存在多个就构建成一个MultiModelLoader
      if (loaders.size() > 1) {
        return factory.build(loaders, throwableListPool);
      } else if (loaders.size() == 1) {
        return loaders.get(0);
      } else {
        // Avoid crashing if recursion results in no loaders available. The assertion is supposed to
        // catch completely unhandled types, recursion may mean a subtype isn't handled somewhere
        // down the stack, which is often ok.
        if (ignoredAnyEntries) {
          return emptyModelLoader();
        } else {
          throw new NoModelLoaderAvailableException(modelClass, dataClass);
        }
      }
    } catch (Throwable t) {
      alreadyUsedEntries.clear();
      throw t;
    }
  }
```

```java
  static class Factory {
    @NonNull
    public <Model, Data> MultiModelLoader<Model, Data> build(
        @NonNull List<ModelLoader<Model, Data>> modelLoaders,
        @NonNull Pool<List<Throwable>> throwableListPool) {
      return new MultiModelLoader<>(modelLoaders, throwableListPool);
    }
  }
```

### 加载到内存的图片大小

默认大小为`ImageView`的大小。设置了`override`，则是设置的大小。如果设置值为`Target.SIZE_ORIGINAL`，则使用图片原始大小。

```java
//SingleRequest begin方法
if (Util.isValidDimensions(overrideWidth, overrideHeight)) {
    onSizeReady(overrideWidth, overrideHeight);
} else {
    target.getSize(this);
}
//ViewTarget getSize方法
public void getSize(@NonNull SizeReadyCallback cb) {
    sizeDeterminer.getSize(cb);
}
//SizeDeterminer getSize方法
void getSize(@NonNull SizeReadyCallback cb) {
    int currentWidth = getTargetWidth(); //获取宽
    int currentHeight = getTargetHeight(); //获取高
    if (isViewStateAndSizeValid(currentWidth, currentHeight)) {
        cb.onSizeReady(currentWidth, currentHeight);
        return;
    }

    // We want to notify callbacks in the order they were added and we only expect one or two
    // callbacks to be added a time, so a List is a reasonable choice.
    if (!cbs.contains(cb)) {
        cbs.add(cb);
    }
    if (layoutListener == null) {
        ViewTreeObserver observer = view.getViewTreeObserver();
        layoutListener = new SizeDeterminerLayoutListener(this);
        observer.addOnPreDrawListener(layoutListener);
    }
}
//CustomTarget默认是原图大小
public CustomTarget() {
    this(Target.SIZE_ORIGINAL, Target.SIZE_ORIGINAL);
}
//Downsampler decodeFromWrappedStreams方法
//获取图片的原始宽高
int[] sourceDimensions = getDimensions(is, options, callbacks, bitmapPool);
int sourceWidth = sourceDimensions[0];
int sourceHeight = sourceDimensions[1];
//如果设置Target.SIZE_ORIGINAL 则为原始宽高
int targetWidth = requestedWidth == Target.SIZE_ORIGINAL ? sourceWidth : requestedWidth;
int targetHeight = requestedHeight == Target.SIZE_ORIGINAL ? sourceHeight : requestedHeight;
```

### 

参考

* [Glide中文文档](https://muyangmin.github.io/glide-docs-cn/)

