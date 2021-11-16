# Glide源码分析

`Glide`的使用非常简单只需要调用`with`、`load` `into`三个方法。

```java
GlideApp.with(this)
      .load(url)
      .into(imageView);
```

接下来，我们依次分析这三个方法。

## with\(\)

`Glide`的`with`方法主要做了三个事情：

1. `Glide`的初始化
2. 获取`RequestManagerRetriever`对象
3. 获取`RequestManager`对象

![初始化Glide](https://malinkang.cn/images/jvm/202111151644483.png)

### with()

```java
//Glide.java
public static RequestManager with(@NonNull Activity activity) {
  //先获取RequestManagerRetriever对象
  //调用RequestManagerRetriever的get方法获取RequestManager
  return getRetriever(activity).get(activity); 
}
```

```java
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

### get()

`get`方法是一个双重检验锁来获取`Glide`的单例对象，如果对象为空则调用`getAnnotationGeneratedGlideModules`和`checkAndInitializeGlide`。
```java
@NonNull
public static Glide get(@NonNull Context context) {
  if (glide == null) {
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

### getAnnotationGeneratedGlideModules()

`getAnnotationGeneratedGlideModules`方法通过反射来获取`GeneratedAppGlideModule`的实现类`GeneratedAppGlideModuleImpl`的`Class`对象，并通过反射创建`GeneratedAppGlideModuleImpl`的实例。

```java
private static GeneratedAppGlideModule getAnnotationGeneratedGlideModules(Context context) {
    GeneratedAppGlideModule result = null;
    try {
        Class<GeneratedAppGlideModule> clazz =
                (Class<GeneratedAppGlideModule>)
                        Class.forName("com.bumptech.glide.GeneratedAppGlideModuleImpl");
        result =
                clazz.getDeclaredConstructor(Context.class).newInstance(context.getApplicationContext());
    } catch (ClassNotFoundException e) {
        if (Log.isLoggable(TAG, Log.WARN)) {
            Log.w(
                    TAG,
                    "Failed to find GeneratedAppGlideModule. You should include an"
                            + " annotationProcessor compile dependency on com.github.bumptech.glide:compiler"
                            + " in your application and a @GlideModule annotated AppGlideModule implementation"
                            + " or LibraryGlideModules will be silently ignored");
        }
        // These exceptions can't be squashed across all versions of Android.
    } catch (InstantiationException e) {
        throwIncorrectGlideModule(e);
    } catch (IllegalAccessException e) {
        throwIncorrectGlideModule(e);
    } catch (NoSuchMethodException e) {
        throwIncorrectGlideModule(e);
    } catch (InvocationTargetException e) {
        throwIncorrectGlideModule(e);
    }
    return result;
}
```


当我们添加一个`AppGlideModule`的实现类，编译时注解会为我们生成一个`GeneratedAppGlideModuleImpl`对象。生成代码的类为`com.bumptech.glide.annotation.compiler.AppModuleGenerator`。

```java
//定义AppGlideModule的实现类
@GlideModule
public final class GalleryModule extends AppGlideModule {
  // Intentionally empty.
  @Override public void applyOptions(@NonNull Context context, @NonNull GlideBuilder builder) {
    super.applyOptions(context, builder);
  }

  @Override public void registerComponents(@NonNull Context context, @NonNull Glide glide,
      @NonNull final Registry registry) {
  }
}
```

生成的`GeneratedAppGlideModuleImpl`为我们定义的`AppGlideModule`类的代理类。

```java
final class GeneratedAppGlideModuleImpl extends GeneratedAppGlideModule {
  private final GalleryModule appGlideModule;

  public GeneratedAppGlideModuleImpl(Context context) {
    appGlideModule = new GalleryModule();
    if (Log.isLoggable("Glide", Log.DEBUG)) {
      Log.d("Glide", "Discovered AppGlideModule from annotation: com.bumptech.glide.samples.gallery.GalleryModule");
      Log.d("Glide", "Discovered LibraryGlideModule from annotation: com.bumptech.glide.integration.okhttp3.OkHttpLibraryGlideModule");
    }
  }

  @Override
  public void applyOptions(@NonNull Context context, @NonNull GlideBuilder builder) {
    appGlideModule.applyOptions(context, builder);
  }

  @Override
  public void registerComponents(@NonNull Context context, @NonNull Glide glide,
      @NonNull Registry registry) {
    new OkHttpLibraryGlideModule().registerComponents(context, glide, registry);
    appGlideModule.registerComponents(context, glide, registry);
  }

  @Override
  public boolean isManifestParsingEnabled() {
    return appGlideModule.isManifestParsingEnabled();
  }

  @Override
  @NonNull
  public Set<Class<?>> getExcludedModuleClasses() {
    return Collections.emptySet();
  }

  @Override
  @NonNull
  GeneratedRequestManagerFactory getRequestManagerFactory() {
    return new GeneratedRequestManagerFactory();
  }
}
```

### checkAndInitializeGlide()

`checkAndInitializeGlide`方法先检查是否正在进行初始化，如果正在进行初始化则抛出异常，否则调用`initializeGlide`方法进行初始化。
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


### initializeGlide()

`initializeGlide`创建一个`GlideBuilder`对象，并传递给他的重载方法。

```java
private static void initializeGlide(
    @NonNull Context context, @Nullable GeneratedAppGlideModule generatedAppGlideModule) {
    //调用重载方法
    initializeGlide(context, new GlideBuilder(), generatedAppGlideModule);
}
```

```java
private static void initializeGlide(
    @NonNull Context context,
    @NonNull GlideBuilder builder,
    @Nullable GeneratedAppGlideModule annotationGeneratedModule) {
  Context applicationContext = context.getApplicationContext();
  List<com.bumptech.glide.module.GlideModule> manifestModules = Collections.emptyList();
  //1.解析AndroidManifest.xml
  if (annotationGeneratedModule == null || annotationGeneratedModule.isManifestParsingEnabled()) {
    manifestModules = new ManifestParser(applicationContext).parse();
  }
  //2.移除标注为排除的GlideModule
  if (annotationGeneratedModule != null
      && !annotationGeneratedModule.getExcludedModuleClasses().isEmpty()) {
    Set<Class<?>> excludedModuleClasses = annotationGeneratedModule.getExcludedModuleClasses();
    Iterator<com.bumptech.glide.module.GlideModule> iterator = manifestModules.iterator();
    while (iterator.hasNext()) {
      com.bumptech.glide.module.GlideModule current = iterator.next();
      if (!excludedModuleClasses.contains(current.getClass())) {
        continue;
      }
      iterator.remove();
    }
  }
  //3.获取RequestManagerFactory即GeneratedRequestManagerFactory
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
注释1负责从`AndroidManifest.xml`解析出`GlideModule`。在`Glide`的3.x版本，是通过在清单文件中注册GlideModule来实现自定义配置的。

```xml
<manifest ...>
    <!-- ... permissions -->
    <application ...>
        <meta-data
            android:name="com.mypackage.MyGlideModule"
            android:value="GlideModule" />
        <!-- ... activities and other components -->
    </application>
</manifest>
```

注释2负责从`GlideModule`集合中删除被标记为排除的`GlideModule`。应用程序可能依赖多个程序库，而它们每一个都可能包含一个或更多的 LibraryGlideModules 。在极端情况下，这些 `LibraryGlideModules`可能定义了相互冲突的选项，或者包含了应用程序希望避免的行为。应用程序可以通过给他们的`AppGlideModule`添加一个`@Excludes`注解来解决这种冲突，或避免不需要的依赖。

```java
@Excludes({com.example.unwanted.GlideModule, com.example.conflicing.GlideModule})
@GlideModule
public final class MyAppGlideModule extends AppGlideModule { }
```

注释3会调用`GeneratedAppGlideModuleImpl`的`getRequestManagerFactory`方法获取`GeneratedRequestManagerFactory`对象。


### build()

`Glide`采用构建模式，来初始化`Glide`。`GlideBuilder`的`build`方法会创建`RequestManagerRetriever`。

```java
//GlideBuilder
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

### Glide构造函数

Glide构造函数创建了`Registry`对象和`GlideContext`对象，并调用`Registry`注册各种组件。

```java
Glide(
  @NonNull Context context,
  @NonNull Engine engine,
  @NonNull MemoryCache memoryCache,
  @NonNull BitmapPool bitmapPool,
  @NonNull ArrayPool arrayPool,
  @NonNull RequestManagerRetriever requestManagerRetriever,
  @NonNull ConnectivityMonitorFactory connectivityMonitorFactory,
  int logLevel,
  @NonNull RequestOptionsFactory defaultRequestOptionsFactory,
  @NonNull Map<Class<?>, TransitionOptions<?, ?>> defaultTransitionOptions,
  @NonNull List<RequestListener<Object>> defaultRequestListeners,
  boolean isLoggingRequestOriginsEnabled,
  boolean isImageDecoderEnabledForBitmaps,
  int hardwareBitmapFdLimit) {
    this.engine = engine;
    this.bitmapPool = bitmapPool;
    this.arrayPool = arrayPool;
    this.memoryCache = memoryCache;
    this.requestManagerRetriever = requestManagerRetriever;
    this.connectivityMonitorFactory = connectivityMonitorFactory;
    this.defaultRequestOptionsFactory = defaultRequestOptionsFactory;

    final Resources resources = context.getResources();

    registry = new Registry();
    registry.register(new DefaultImageHeaderParser());
    // Right now we're only using this parser for HEIF images, which are only supported on OMR1+.
    // If we need this for other file types, we should consider removing this restriction.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        registry.register(new ExifInterfaceImageHeaderParser());
    }

    //...

    //注册 这里省略了一部分注册
    registry
            .append(ByteBuffer.class, new ByteBufferEncoder())
            //...
            .register(GifDrawable.class, byte[].class, gifDrawableBytesTranscoder);
    //创建TargetFactory
    ImageViewTargetFactory imageViewTargetFactory = new ImageViewTargetFactory();
    //创建GlideContext
    glideContext =
            new GlideContext(
                    context,
                    arrayPool,
                    registry,
                    imageViewTargetFactory,
                    defaultRequestOptionsFactory,
                    defaultTransitionOptions,
                    defaultRequestListeners,
                    engine,
                    isLoggingRequestOriginsEnabled,
                    logLevel);
}

```

到这里`Glide`的初始化已经完成了，接着调用`Glide`的`getRequestManagerRetriever`方法来获取`RequestManagerRetriever`对象。`RequestManagerRetriever`对象负责创建一个新的`RequestManager`或者获取一个存在的`RequestManager`。

### RequestManagerRetriever#get

![image-20211115201116032](https://malinkang.cn/images/jvm/202111152011893.png)

`RequestManagerRetriever`有多个重载的`get`方法，根据`with`方法传入的不同参数，来调用不同的方法，这里我们以传入`Activity`为例。

```java
public RequestManager get(@NonNull Activity activity) {
  if (Util.isOnBackgroundThread()) {
    return get(activity.getApplicationContext());
  } else {
    assertNotDestroyed(activity);
    android.app.FragmentManager fm = activity.getFragmentManager();
    return fragmentGet(activity, fm, /*parentHint=*/ null, isActivityVisible(activity));
  }
}
```
### RequestManagerRetriever#fragmentGet

`fragmentGet`方法会先调用`getRequestManagerFragment`创建一个`RequestManagerFragment`对象。然后调用`GeneratedRequestManagerFactory`的`build`方法，创建`RequestManager`。

```java
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

### getRequestManagerFragment

`getRequestManagerFragment`会调用`RequestManagerFragment`的构造函数创建`RequestManagerFragment`对象。

```java
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

### RequestManagerFragment



![生命周期相关类](https://malinkang.cn/images/jvm/202111161126257.png)

![生命周期相关类](https://malinkang.cn/images/jvm/202111161127277.png)

`RequestManagerFragment`的构造函数会创建一个`ActivityFragmentLifecycle`对象。在`RequestManagerFragment`的生命周期方法`onStart`、`onStop`、`onDestroy`会调用`ActivityFragmentLifecycle`的相应方法。

```java
public RequestManagerFragment() {
  this(new ActivityFragmentLifecycle());
}
RequestManagerFragment(@NonNull ActivityFragmentLifecycle lifecycle) {
  this.lifecycle = lifecycle;
}
@Override
public void onStart() {
  super.onStart();
  lifecycle.onStart();
}
@Override
public void onStop() {
  super.onStop();
  lifecycle.onStop();
}
@Override
public void onDestroy() {
  super.onDestroy();
  lifecycle.onDestroy();
  unregisterFragmentWithRoot();
}
```

### ActivityFragmentLifecycle

`ActivityFragmentLifecycle`实现了`Lifecycle`接口。`Lifecycle`定义了两个方法`addListener`，`removeListener`，分别用来添加和删除`LifecycleListener`。

```java
public interface Lifecycle {
  /** Adds the given listener to the set of listeners managed by this Lifecycle implementation. */
  void addListener(@NonNull LifecycleListener listener);

  /**
   * Removes the given listener from the set of listeners managed by this Lifecycle implementation,
   * returning {@code true} if the listener was removed successfully, and {@code false} otherwise.
   *
   * <p>This is an optimization only, there is no guarantee that every added listener will
   * eventually be removed.
   */
  void removeListener(@NonNull LifecycleListener listener);
}
```

### LifecycleListener

`LifecycleListener`也是一个接口，其定义如下：

```java
public interface LifecycleListener {

  /**
   * Callback for when {@link android.app.Fragment#onStart()}} or {@link
   * android.app.Activity#onStart()} is called.
   */
  void onStart();

  /**
   * Callback for when {@link android.app.Fragment#onStop()}} or {@link
   * android.app.Activity#onStop()}} is called.
   */
  void onStop();

  /**
   * Callback for when {@link android.app.Fragment#onDestroy()}} or {@link
   * android.app.Activity#onDestroy()} is called.
   */
  void onDestroy();
}
```

### RequestManager

`RequestManager`实现了`LifecycleListener`，当构建`RequestManager`对象时，会将`RequestManagerFragment`的`ActivityFragmentLifecycle`传递给`RequestManager`。在`RequestManager`的构造函数中，调用`Lifecycle`的`addListener`方法，将当前对象添加到`Lifecycle`中。当`RequestManagerFragment`执行相应的生命周期方法时，会调用`RequestManager`的相应方法，来管理请求。

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
    //...
  }

```



![image-20211116113224787](https://malinkang.cn/images/jvm/202111161132636.png)


## load\(\)

通过`load()`方法返回了一个`RequestManager`对象，所以`into()`方法调用的是`RequestManager`的`into()`方法。

```java
@Override
public RequestBuilder<Drawable> load(@Nullable String string) {
  return asDrawable().load(string);
}
public RequestBuilder<Drawable> asDrawable() {
  return as(Drawable.class);
}

public <ResourceType> RequestBuilder<ResourceType> as(
    @NonNull Class<ResourceType> resourceClass) {
    //创建RequestBuilder
  return new RequestBuilder<>(glide, this, resourceClass, context);
}
```

## into\(\)

在`into()`方法中会调用`GlideContext`的`buildImageViewTarget`构建一个`Target`并传递给它的重载方法。

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
       //构建ImageViewTarget
      glideContext.buildImageViewTarget(view, transcodeClass),
      /*targetListener=*/ null,
      requestOptions,
      Executors.mainThreadExecutor());
}
```

### 构建Target

```java
public <X> ViewTarget<ImageView, X> buildImageViewTarget(
    @NonNull ImageView imageView, @NonNull Class<X> transcodeClass) {
  return imageViewTargetFactory.buildTarget(imageView, transcodeClass);
}
```

```java
public class ImageViewTargetFactory {
  @NonNull
  @SuppressWarnings("unchecked")
  public <Z> ViewTarget<ImageView, Z> buildTarget(
      @NonNull ImageView view, @NonNull Class<Z> clazz) {
    //默认情况下clazz为Drawable.class
    if (Bitmap.class.equals(clazz)) {
      return (ViewTarget<ImageView, Z>) new BitmapImageViewTarget(view);
    } else if (Drawable.class.isAssignableFrom(clazz)) {
      return (ViewTarget<ImageView, Z>) new DrawableImageViewTarget(view);
    } else {
      throw new IllegalArgumentException(
          "Unhandled class: " + clazz + ", try .as*(Class).transcode(ResourceTranscoder)");
    }
  }
}
```

接着，在`into`方法中先调用`buildRequest`构建一个`Request`,然后`RequestManager`会调用`Request`发起请求。

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
  //获取前一个请求
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

### 构建Request

`buildRequest`会依次调用`buildRequestRecursive`、`buildThumbnailRequestRecursive`、`obtainRequest`方法，并最终调用`SingleRequest`的`obtain`方法。

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
### 执行网络请求

`RequestManager`的`track`方法会调用`Request`的`begin`方法，发起请求。
```java
synchronized void track(@NonNull Target<?> target, @NonNull Request request) {
  targetTracker.track(target);
  requestTracker.runRequest(request);
}
```

```java
//RequestTracker
public void runRequest(@NonNull Request request) {
  requests.add(request);
  if (!isPaused) {
    //运行网络请求
    request.begin();
  } else {
    request.clear();
    if (Log.isLoggable(TAG, Log.VERBOSE)) {
      Log.v(TAG, "Paused, delaying request");
    }
    pendingRequests.add(request);
  }
}
```



## 参考

* [Glide中文文档](https://muyangmin.github.io/glide-docs-cn/)
* [面试官：简历上最好不要写Glide，不是问源码那么简单](https://juejin.im/post/6844903986412126216)