`RequestManager`会调用`SingleRequest`的`begin`方法发起一个请求，一个请求会经历如下过程。
1. 如果没有设置加载的图片的宽高，则会获取对应ImageView的宽高。
2. 获取图片的流。
3. 调用`Encoder`，将流转化为文件。
4. 获取文件流，并调用`Decoder`转化为Bitmap。
5. 调用`Downsampler`进行重新采样。
5. 调用`Transformation`实现变换操作。
6. 调用`Transcoder`将`Bitmap`转码为`Drawable`.
7. 调用`ImageView`的`setImageDrawable`方法，将`Drawable`设置到`ImageView`上。



## begin

如果设置了overrideWidth和overrideHeight，则调用onSizeReady，否则会调用`Target`的`getSize`方法获取`ImageView`的宽高。

```java
@Override
public synchronized void begin() {
  assertNotCallingCallbacks();
  Log.d(TAG, "begin: ");
  stateVerifier.throwIfRecycled();
  startTime = LogTime.getLogTime();
  //1. 如果model为null，则调用onLoadFailed
  if (model == null) {
    if (Util.isValidDimensions(overrideWidth, overrideHeight)) {
      width = overrideWidth;
      height = overrideHeight;
    }
    // Only log at more verbose log levels if the user has set a fallback drawable, because
    // fallback Drawables indicate the user expects null models occasionally.
    int logLevel = getFallbackDrawable() == null ? Log.WARN : Log.DEBUG;
    onLoadFailed(new GlideException("Received null model"), logLevel);
    return;
  }
  //如果正在运行，则抛出异常
  if (status == Status.RUNNING) {
    throw new IllegalArgumentException("Cannot restart a running request");
  }

  // If we're restarted after we're complete (usually via something like a notifyDataSetChanged
  // that starts an identical request into the same Target or View), we can simply use the
  // resource and size we retrieved the last time around and skip obtaining a new size, starting a
  // new load etc. This does mean that users who want to restart a load because they expect that
  // the view size has changed will need to explicitly clear the View or Target before starting
  // the new load.
  //如果已经完成，则调用onResourceReady
  if (status == Status.COMPLETE) {
    Log.d(TAG, "begin: resource"+resource);
    onResourceReady(resource, DataSource.MEMORY_CACHE);
    return;
  }

  // Restarts for requests that are neither complete nor running can be treated as new requests
  // and can run again from the beginning.
  //等待尺寸
  status = Status.WAITING_FOR_SIZE;
  //如果设置了overrideWidth和overrideHeight，则调用onSizeReady
  if (Util.isValidDimensions(overrideWidth, overrideHeight)) {
    onSizeReady(overrideWidth, overrideHeight);
  } else {
    target.getSize(this);
  }

  if ((status == Status.RUNNING || status == Status.WAITING_FOR_SIZE)
      && canNotifyStatusChanged()) {
    target.onLoadStarted(getPlaceholderDrawable());
  }
  if (IS_VERBOSE_LOGGABLE) {
    logV("finished run method in " + LogTime.getElapsedMillis(startTime));
  }
}
```

## 获取图片宽高

`Target`的`getSize`方法在`ViewTarget`中实现。`ViewTarget`的`getSize`方法会调用`SizeDeterminer`的`getSize`方法。`SizeDeterminer`是`ViewTarget`的静态内部类。

```java
//ViewTarget getSize方法
public void getSize(@NonNull SizeReadyCallback cb) {
    sizeDeterminer.getSize(cb);
}
```

`SizeDeterminer`的`getSize`方法获取完成后，会调用`SizeReadyCallback`的`onSizeReady`方法。`SingleRequest`实现了`SizeReadyCallback`接口，会调用`SingleRequest`的`onSizeReady`方法。

```java
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
    //如果获取为null 添加OnPreDrawListener，当回调时，再次获取宽高
    if (layoutListener == null) {
        ViewTreeObserver observer = view.getViewTreeObserver();
        layoutListener = new SizeDeterminerLayoutListener(this);
        observer.addOnPreDrawListener(layoutListener);
    }
}
```

```java
private int getTargetHeight() {
  int verticalPadding = view.getPaddingTop() + view.getPaddingBottom();
  LayoutParams layoutParams = view.getLayoutParams();
  int layoutParamSize = layoutParams != null ? layoutParams.height : PENDING_SIZE;
  return getTargetDimen(view.getHeight(), layoutParamSize, verticalPadding);
}
```

如果`overrideWidth`和`overrideHeight`设置为`SIZE_ORIGINAL`，则为图片的真实大小。

```java
//Downsampler decodeFromWrappedStreams方法
//获取图片的原始宽高
int[] sourceDimensions = getDimensions(is, options, callbacks, bitmapPool);
int sourceWidth = sourceDimensions[0];
int sourceHeight = sourceDimensions[1];
//如果设置Target.SIZE_ORIGINAL 则为原始宽高
int targetWidth = requestedWidth == Target.SIZE_ORIGINAL ? sourceWidth : requestedWidth;
int targetHeight = requestedHeight == Target.SIZE_ORIGINAL ? sourceHeight : requestedHeight;
```


## onSizeReady

`onSizeReady`会调用`Engine`的`load`方法。

```java
public synchronized void onSizeReady(int width, int height) {
  stateVerifier.throwIfRecycled();
  if (IS_VERBOSE_LOGGABLE) {
    logV("Got onSizeReady in " + LogTime.getElapsedMillis(startTime));
  }
  if (status != Status.WAITING_FOR_SIZE) {
    return;
  }
  status = Status.RUNNING;

  float sizeMultiplier = requestOptions.getSizeMultiplier();
  this.width = maybeApplySizeMultiplier(width, sizeMultiplier);
  this.height = maybeApplySizeMultiplier(height, sizeMultiplier);

  if (IS_VERBOSE_LOGGABLE) {
    logV("finished setup for calling load in " + LogTime.getElapsedMillis(startTime));
  }
  Log.d(TAG,"onSizeReady "+requestOptions.getResourceClass()+",width="+width+",height="+height);
  loadStatus =
      engine.load(
          glideContext,
          model,
          requestOptions.getSignature(), //签名
          this.width,
          this.height,
          requestOptions.getResourceClass(),
          transcodeClass,
          priority,
          requestOptions.getDiskCacheStrategy(), //硬盘缓存策略
          requestOptions.getTransformations(),
          requestOptions.isTransformationRequired(),
          requestOptions.isScaleOnlyOrNoTransform(),
          requestOptions.getOptions(),
          requestOptions.isMemoryCacheable(),
          requestOptions.getUseUnlimitedSourceGeneratorsPool(),
          requestOptions.getUseAnimationPool(),
          requestOptions.getOnlyRetrieveFromCache(), //只从缓存中获取
          this,
          callbackExecutor);

  // This is a hack that's only useful for testing right now where loads complete synchronously
  // even though under any executor running on any thread but the main thread, the load would
  // have completed asynchronously.
  if (status != Status.RUNNING) {
    loadStatus = null;
  }
  if (IS_VERBOSE_LOGGABLE) {
    logV("finished onSizeReady in " + LogTime.getElapsedMillis(startTime));
  }
}
```

## Engline

`Engine`在`GlideBuilder`的`build`方法中创建。

### 构造函数

`Engine`的构造函数，负责初始化一些必要的对象。
```java
@VisibleForTesting Engine(
    MemoryCache cache,
    DiskCache.Factory diskCacheFactory,
    GlideExecutor diskCacheExecutor,
    GlideExecutor sourceExecutor,
    GlideExecutor sourceUnlimitedExecutor,
    GlideExecutor animationExecutor,
    Jobs jobs,
    EngineKeyFactory keyFactory,
    ActiveResources activeResources,
    EngineJobFactory engineJobFactory,
    DecodeJobFactory decodeJobFactory,
    ResourceRecycler resourceRecycler,
    boolean isActiveResourceRetentionAllowed) {
  this.cache = cache; //内存缓存
  this.diskCacheProvider = new LazyDiskCacheProvider(diskCacheFactory);

  if (activeResources == null) {
    activeResources = new ActiveResources(isActiveResourceRetentionAllowed);
  }
  this.activeResources = activeResources;
  activeResources.setListener(this);

  if (keyFactory == null) {
    keyFactory = new EngineKeyFactory();
  }
  this.keyFactory = keyFactory;

  if (jobs == null) {
    jobs = new Jobs();
  }
  this.jobs = jobs;

  if (engineJobFactory == null) {
    engineJobFactory =
        new EngineJobFactory(
            diskCacheExecutor,
            sourceExecutor,
            sourceUnlimitedExecutor,
            animationExecutor,
            /*engineJobListener=*/ this,
            /*resourceListener=*/ this);
  }
  this.engineJobFactory = engineJobFactory;
  //默认为null 创建Factory
  if (decodeJobFactory == null) {
    decodeJobFactory = new DecodeJobFactory(diskCacheProvider);
  }
  this.decodeJobFactory = decodeJobFactory;

  if (resourceRecycler == null) {
    resourceRecycler = new ResourceRecycler();
  }
  this.resourceRecycler = resourceRecycler;

  cache.setResourceRemovedListener(this);
}
```

### load

`load`方法会优先调用`loadFromMemory`从内存缓存中获取，如果内存缓存中不存在，则调用`waitForExistingOrStartNewJob`方法。`loadFromMemory`方法，这里先不做分析，在后面分析`Glide`的缓存的时候会单独分析。接下来我们直接分析`waitForExistingOrStartNewJob`方法。

```java
public <R> LoadStatus load(
  GlideContext glideContext,
  Object model,
  Key signature,
  int width,
  int height,
  Class<?> resourceClass, //资源类
  Class<R> transcodeClass,
  Priority priority,
  DiskCacheStrategy diskCacheStrategy, //硬盘缓存策略
  Map<Class<?>, Transformation<?>> transformations,
  boolean isTransformationRequired,
  boolean isScaleOnlyOrNoTransform,
  Options options,
  boolean isMemoryCacheable,
  boolean useUnlimitedSourceExecutorPool,
  boolean useAnimationPool,
  boolean onlyRetrieveFromCache,
  ResourceCallback cb, //回调
  Executor callbackExecutor) {
long startTime = VERBOSE_IS_LOGGABLE ? LogTime.getLogTime() : 0;
//生成缓存key
EngineKey key =
    keyFactory.buildKey(
        model, //url
        signature,
        width,
        height,
        transformations,
        resourceClass,
        transcodeClass,
        options);

EngineResource<?> memoryResource;
synchronized (this) {
  //从内存中获取
  memoryResource = loadFromMemory(key, isMemoryCacheable, startTime);

  if (memoryResource == null) {
    return waitForExistingOrStartNewJob(
        glideContext,
        model,
        signature,
        width,
        height,
        resourceClass,
        transcodeClass,
        priority,
        diskCacheStrategy, //硬盘缓存策略
        transformations,
        isTransformationRequired,
        isScaleOnlyOrNoTransform,
        options,
        isMemoryCacheable,
        useUnlimitedSourceExecutorPool,
        useAnimationPool,
        onlyRetrieveFromCache,
        cb,
        callbackExecutor,
        key,
        startTime);
  }
}
```

### waitForExistingOrStartNewJob

`waitForExistingOrStartNewJob`负责创建`EngineJob`和`DecodeJob`，并且调用`EngineJob.start`方法执行`DecodeJob`。创建`EngineJob`的过程中，会优先从缓存中获取，如果缓存中存在直接返回。`waitForExistingOrStartNewJob`会返回一个`LoadStatus`，并最终返回给`SingleRequest`。`LoadStatus`可以看做是`EngineJob`的代理类，`SingleRequest`可以通过调用`cancle`方法移除`EngineJob`的回调。


```java
/等待存在的job或者开启一个新的job
private <R> LoadStatus waitForExistingOrStartNewJob(
    GlideContext glideContext,
    Object model,
    Key signature,
    int width,
    int height,
    Class<?> resourceClass,
    Class<R> transcodeClass,
    Priority priority,
    DiskCacheStrategy diskCacheStrategy,
    Map<Class<?>, Transformation<?>> transformations,
    boolean isTransformationRequired,
    boolean isScaleOnlyOrNoTransform,
    Options options,
    boolean isMemoryCacheable,
    boolean useUnlimitedSourceExecutorPool,
    boolean useAnimationPool,
    boolean onlyRetrieveFromCache,
    ResourceCallback cb, //回调
    Executor callbackExecutor,
    EngineKey key,
    long startTime) {
  //从缓存中获取
  EngineJob<?> current = jobs.get(key, onlyRetrieveFromCache);
  if (current != null) {
    current.addCallback(cb, callbackExecutor);
    if (VERBOSE_IS_LOGGABLE) {
      logWithTimeAndKey("Added to existing load", startTime, key);
    }
    return new LoadStatus(cb, current);
  }

  EngineJob<R> engineJob =
      engineJobFactory.build(
          key,
          isMemoryCacheable,
          useUnlimitedSourceExecutorPool,
          useAnimationPool,
          onlyRetrieveFromCache);
  Log.d(TAG, " waitForExistingOrStartNewJob resourceClass =" + resourceClass);
  //创建decodeJob
  DecodeJob<R> decodeJob =
      decodeJobFactory.build(
          glideContext,
          model,
          key,
          signature,
          width,
          height,
          resourceClass,
          transcodeClass,
          priority,
          diskCacheStrategy,//缓存策略
          transformations,
          isTransformationRequired,
          isScaleOnlyOrNoTransform,
          onlyRetrieveFromCache,
          options,
          engineJob);

  jobs.put(key, engineJob);

  engineJob.addCallback(cb, callbackExecutor);
  engineJob.start(decodeJob);

  if (VERBOSE_IS_LOGGABLE) {
    logWithTimeAndKey("Started new load", startTime, key);
  }
  return new LoadStatus(cb, engineJob);
}
```

## EngineJob

### EngineJob创建过程

`EngineJob`通过`Engine`的静态内部类`EngineJobFactory`构建的。`EngineJobFactory`会先调用`EngineJob`的构造函数，然后调用`EngineJob`的`init`方法进行初始化。

```java
static class EngineJobFactory {
  @Synthetic final Pools.Pool<EngineJob<?>> pool =
  FactoryPools.threadSafe(
      JOB_POOL_SIZE, //缓存池大小
      new FactoryPools.Factory<EngineJob<?>>() {
        @Override
        public EngineJob<?> create() {
          return new EngineJob<>(
              diskCacheExecutor,
              sourceExecutor,
              sourceUnlimitedExecutor,
              animationExecutor,
              engineJobListener,
              resourceListener,
              pool);
        }
      });

  @SuppressWarnings("unchecked") <R> EngineJob<R> build(
    Key key,
    boolean isMemoryCacheable,
    boolean useUnlimitedSourceGeneratorPool,
    boolean useAnimationPool,
    boolean onlyRetrieveFromCache) {
  EngineJob<R> result = Preconditions.checkNotNull((EngineJob<R>) pool.acquire());
  return result.init(
      key,
      isMemoryCacheable,
      useUnlimitedSourceGeneratorPool,
      useAnimationPool,
      onlyRetrieveFromCache);
  }
}
```
### start

`EngineJob`的`start`方法会调用`GlideExecutor`执行`DecodeJob`。
```java
public synchronized void start(DecodeJob<R> decodeJob) {
  this.decodeJob = decodeJob;
  GlideExecutor executor =
      decodeJob.willDecodeFromCache() ? diskCacheExecutor : getActiveSourceExecutor();
  executor.execute(decodeJob);
}
```

## DecodeJob

### DecodeJob创建过程

`DecodeJob`通过`Engine`的静态内部类`DecodeJobFactory`构建的。`DecodeJobFactory`会先调用`DecodeJob`的构造函数，然后调用`DecodeJob`的`init`方法进行初始化。

`DecodeJob`实现了`Runnable`方法，`EngineJob`的`start`方法会调用`DecodeJob`的`run`方法。 `run`方法将调用`runWrapped`方法。


### runWrapped

`runWrapped`方法会先获取下一个阶段，并调用`runGenerators`方法运行`Generator`。

```java
private void runWrapped() {
  switch (runReason) {
    case INITIALIZE:
      stage = getNextStage(Stage.INITIALIZE);
      currentGenerator = getNextGenerator();
      runGenerators();
      break;
    case SWITCH_TO_SOURCE_SERVICE:
      runGenerators();
      break;
    case DECODE_DATA:
      decodeFromRetrievedData();
      break;
    default:
      throw new IllegalStateException("Unrecognized run reason: " + runReason);
  }
}
```

### getNextStage

`DecodeJob`的工作过程会经历以下6个阶段：



```java
private enum Stage {
  /**
   * The initial stage.
   */
  INITIALIZE,
  /**
   * Decode from a cached resource.
   */
  RESOURCE_CACHE,
  /**
   * Decode from cached source data.
   */
  DATA_CACHE,
  /**
   * Decode from retrieved source.
   */
  SOURCE,
  /**
   * Encoding transformed resources after a successful load.
   */
  ENCODE,
  /**
   * No more viable stages.
   */
  FINISHED,
}
```
`getNextStage`方法负责根据当前阶段来获取下一个符合条件的阶段。这里我们以第一次加载网络图片为例，分析该过程。当我们第一次调用`getNextStage`，并且`diskCacheStrategy`的`decodeCachedResource()`返回`true`，那么将进入`RESOURCE_CACHE`阶段。

```java
private Stage getNextStage(Stage current) {
  switch (current) {
    case INITIALIZE:
      return diskCacheStrategy.decodeCachedResource()
          ? Stage.RESOURCE_CACHE
          : getNextStage(Stage.RESOURCE_CACHE);
    case RESOURCE_CACHE:
      return diskCacheStrategy.decodeCachedData()
          ? Stage.DATA_CACHE
          : getNextStage(Stage.DATA_CACHE);
    case DATA_CACHE:
      // Skip loading from source if the user opted to only retrieve the resource from cache.
      return onlyRetrieveFromCache ? Stage.FINISHED : Stage.SOURCE;
    case SOURCE:
    case FINISHED:
      return Stage.FINISHED;
    default:
      throw new IllegalArgumentException("Unrecognized stage: " + current);
  }
}
```

### getNextGenerator


`getNextGenerator`负责根据不同的`Stage`获取不同的`Generator`。当前阶段为`RESOURCE_CACHE`时，将返回`ResourceGenerator`。接着`runWrapped`方法会调用`runGenerators`方法。

```java
private DataFetcherGenerator getNextGenerator() {
  switch (stage) {
    case RESOURCE_CACHE:
      return new ResourceCacheGenerator(decodeHelper, this);
    case DATA_CACHE:
      return new DataCacheGenerator(decodeHelper, this);
    case SOURCE:
      return new SourceGenerator(decodeHelper, this);
    case FINISHED:
      return null;
    default:
      throw new IllegalStateException("Unrecognized stage: " + stage);
  }
}
```

### runGenerators

`runGenerators`方法会调用当前`Generator`的`starNext`方法。当前的`Generator`为`ResourceCacheGenerator`。所以这里调用的是`ResourceCacheGenerator`的`starNext`方法。

```java
private void runGenerators() {
  currentThread = Thread.currentThread();
  startFetchTime = LogTime.getLogTime();
  boolean isStarted = false;
  while (!isCancelled
      && currentGenerator != null
      && !(isStarted = currentGenerator.startNext())) {
    stage = getNextStage(stage);
    currentGenerator = getNextGenerator();
    if (stage == Stage.SOURCE) {
      reschedule();
      return;
    }
  }
  // We've run out of stages and generators, give up.
  if ((stage == Stage.FINISHED || isCancelled) && !isStarted) {
    notifyFailed();
  }
  // Otherwise a generator started a new load and we expect to be called back in
  // onDataFetcherReady.
}
```

`DataFetcherGenerator`是`DataFetcher`生成器。

### ResourceCacheGenerator 


`ResourceCacheGenerator`负责从缓存中获取资源缓存，如果没有缓存，则返回`false`。第一次加载图片时，不存在缓存，所以返回false。再回到`runGenerators`方法中，当返回false，会再次调用`getNextStage`获取下一个阶段，下一个`Generator`为`DataCacheGenerator`。

```java
public boolean startNext() {
  Log.d(TAG,"startNext");
  List<Key> sourceIds = helper.getCacheKeys();
  if (sourceIds.isEmpty()) {
    return false;
  }
  List<Class<?>> resourceClasses = helper.getRegisteredResourceClasses();
  if (resourceClasses.isEmpty()) {
    if (File.class.equals(helper.getTranscodeClass())) {
      return false;
    }
    throw new IllegalStateException(
        "Failed to find any load path from "
            + helper.getModelClass()
            + " to "
            + helper.getTranscodeClass());
  }
  while (modelLoaders == null || !hasNextModelLoader()) {
    resourceClassIndex++;
    if (resourceClassIndex >= resourceClasses.size()) {
      sourceIdIndex++;
      if (sourceIdIndex >= sourceIds.size()) {
        return false;
      }
      resourceClassIndex = 0;
    }

    Key sourceId = sourceIds.get(sourceIdIndex);
    Class<?> resourceClass = resourceClasses.get(resourceClassIndex);
    Transformation<?> transformation = helper.getTransformation(resourceClass);
    // PMD.AvoidInstantiatingObjectsInLoops Each iteration is comparatively expensive anyway,
    // we only run until the first one succeeds, the loop runs for only a limited
    // number of iterations on the order of 10-20 in the worst case.
    currentKey =
        new ResourceCacheKey( // NOPMD AvoidInstantiatingObjectsInLoops
            helper.getArrayPool(),
            sourceId,
            helper.getSignature(),
            helper.getWidth(),
            helper.getHeight(),
            transformation,
            resourceClass,
            helper.getOptions());
    //获取缓存文件
    cacheFile = helper.getDiskCache().get(currentKey);
    if (cacheFile != null) {
      Log.d(TAG,"cacheFile"+cacheFile.getAbsolutePath());
      sourceKey = sourceId;
      modelLoaders = helper.getModelLoaders(cacheFile); //获取对应的modelLoaders
      modelLoaderIndex = 0;
    }
  }

  loadData = null;
  boolean started = false;

  while (!started && hasNextModelLoader()) {
    ModelLoader<File, ?> modelLoader = modelLoaders.get(modelLoaderIndex++);
    loadData =
        modelLoader.buildLoadData(
            cacheFile, helper.getWidth(), helper.getHeight(), helper.getOptions());
    if (loadData != null && helper.hasLoadPath(loadData.fetcher.getDataClass())) {
      started = true;
      loadData.fetcher.loadData(helper.getPriority(), this);
    }
  }

  return started;
}
```

### DataCacheGenerator

`DataCacheGenerator`负责从缓存中获取数据缓存，如果没有缓存，则返回`false`。第一次加载图片时，不存在缓存，所以返回false。再回到`runGenerators`方法中，当返回false，会再次调用`getNextStage`获取下一个阶段，下一个`Generator`为`SourceGenerator`。

```java
//构造函数 调用DecodeHelper的getCacheKeys
DataCacheGenerator(DecodeHelper<?> helper, FetcherReadyCallback cb) {
  this(helper.getCacheKeys(), helper, cb);
}
// In some cases we may want to load a specific cache key (when loading from source written to
// cache), so we accept a list of keys rather than just obtain the list from the helper.
DataCacheGenerator(List<Key> cacheKeys, DecodeHelper<?> helper, FetcherReadyCallback cb) {
  this.cacheKeys = cacheKeys;
  this.helper = helper;
  this.cb = cb;
}
```

```java
@Override
public boolean startNext() {
  while (modelLoaders == null || !hasNextModelLoader()) {
    sourceIdIndex++;
    if (sourceIdIndex >= cacheKeys.size()) {
      return false;
    }
    Key sourceId = cacheKeys.get(sourceIdIndex);
    // PMD.AvoidInstantiatingObjectsInLoops The loop iterates a limited number of times
    // and the actions it performs are much more expensive than a single allocation.
    @SuppressWarnings("PMD.AvoidInstantiatingObjectsInLoops")
    Key originalKey = new DataCacheKey(sourceId, helper.getSignature());
    //获取缓存文件
    cacheFile = helper.getDiskCache().get(originalKey);
    if (cacheFile != null) {
      this.sourceKey = sourceId;
      modelLoaders = helper.getModelLoaders(cacheFile);
      modelLoaderIndex = 0;
    }
  }
  loadData = null;
  boolean started = false;
  Log.d(TAG, "modelLoaders = " + modelLoaders);
  while (!started && hasNextModelLoader()) {
    ModelLoader<File, ?> modelLoader = modelLoaders.get(modelLoaderIndex++);
    loadData =
        modelLoader.buildLoadData(
            cacheFile, helper.getWidth(), helper.getHeight(), helper.getOptions());
    if (loadData != null && helper.hasLoadPath(loadData.fetcher.getDataClass())) {
      Log.d(TAG, "startNext: " + modelLoader.getClass());
      started = true;
      loadData.fetcher.loadData(helper.getPriority(), this);
    }
  }
  return started;
}
```

### SourceGenerator

```java
public boolean startNext() {
    Log.d(TAG, "startNext: " + dataToCache);
    //如果dataToCache不为空 则缓存数据，第一次调用为空
    if (dataToCache != null) {
        Object data = dataToCache;
        dataToCache = null;
        cacheData(data); //缓存数据
    }

    if (sourceCacheGenerator != null && sourceCacheGenerator.startNext()) {
        return true;
    }
    sourceCacheGenerator = null;
    loadData = null;
    boolean started = false;
    //获取网络图片
    while (!started && hasNextModelLoader()) {
        loadData = helper.getLoadData().get(loadDataListIndex++);
        if (loadData != null
                && (helper.getDiskCacheStrategy().isDataCacheable(loadData.fetcher.getDataSource())
                || helper.hasLoadPath(loadData.fetcher.getDataClass()))) {
            started = true;
            Log.d(TAG, "startNext loadData=" + loadData.fetcher.getClass().getSimpleName());
            loadData.fetcher.loadData(helper.getPriority(), this);
        }
    }
    return started;
}
```

图片获取成功之后会调用`onDataReady`方法。`onDataReady`方法调用`FetcherReadyCallback`的`reschedule`。最终通过回调会调用`EngineJob`的`reschedule`方法，再次调用`DecodeJob`的`run`方法。然后再次调用`SourceGenerator`的`startNext`方法。此时`dataToCache`不为空，则缓存数据，然后调用`DataCacheGenerator`的`startNext`获取缓存的数据。`DataCacheGenerator`获取完成数据会调用`onDataFetcherReady`方法。


```java
@Override
public void onDataReady(Object data) {
    Log.d(TAG, "onDataReady: ");
    DiskCacheStrategy diskCacheStrategy = helper.getDiskCacheStrategy();
    if (data != null && diskCacheStrategy.isDataCacheable(loadData.fetcher.getDataSource())) {
        dataToCache = data;
        // We might be being called back on someone else's thread. Before doing anything, we should
        // reschedule to get back onto Glide's thread.
        cb.reschedule();
    } else {
        cb.onDataFetcherReady(
                loadData.sourceKey,
                data,
                loadData.fetcher,
                loadData.fetcher.getDataSource(),
                originalKey);
    }
}
```

```java
@Override
public void reschedule(DecodeJob<?> job) {
  Log.d(TAG,"reschedule: ");
  // Even if the job is cancelled here, it still needs to be scheduled so that it can clean itself
  // up.
  getActiveSourceExecutor().execute(job);
}
```

## ModelLoader 

`ModelLoader`是一个工厂接口，负责将复杂的数据类型转换为具体的数据类型，`DataFetcher`使用该具体类型获取数据。



### getLoadData\(\)

`DecodeHelper`的`getLoadData`方法会首先调用`Registry`的`getModelLoaders`方法，来获取符合条件的`ModelLoader`。然后遍历所有`ModelLoader`，并调用`ModelLoader`的
`buildLoadData`方法，过滤掉空的`LoadData`。
```java
//DecodeHelper
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
//Registry
@NonNull
public <Model> List<ModelLoader<Model, ?>> getModelLoaders(@NonNull Model model) {
  //调用ModelLoaderRegistry的getModelLoaders
  return modelLoaderRegistry.getModelLoaders(model);
}
```

`ModelLoaderRegistry`的`getModelLoaders`方法会调用`ModelLoaderRegistry`的`getModelLoadersForClass`方法。`getModelLoadersForClass`方法会先从缓存中获取对应的`ModelLoader`，如果获取不到，则调用`MultiModelLoaderFactory`的`build`方法。获取完成之后，调用`ModelLoader`的`handles`方法筛选符合条件的`ModelLoader`。

比如输入的`model`是一个`http`链接。符合条件的`ModelLoader`有4个。但是`DataUrlLoader`的`handles`返回false所以过滤掉只剩下三个。

![image-20210722155844793](https://malinkang-1253444926.cos.ap-beijing.myqcloud.com/images/java/image-20210722155844793.png)

```java
//DataUrlLoader
private static final String DATA_SCHEME_IMAGE = "data:image";
@Override
public boolean handles(@NonNull Model model) {
  // We expect Model to be a Uri or a String, both of which implement toString() efficiently. We
  // should reconsider this implementation before adding any new Model types.
  return model.toString()
      .startsWith(DATA_SCHEME_IMAGE);
}
```



```java
//ModelLoaderRegistry
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

假设这里的`model`为`http`链接，获得的`entry`的Factory为`StringLoader.StreamFactory`。这里获取符合条件的为4个，这里只举例一个，其他都差不多。

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
private <Model, Data> ModelLoader<Model, Data> build(@NonNull Entry<?, ?> entry) {
  return (ModelLoader<Model, Data>) Preconditions.checkNotNull(entry.factory.build(this));
}
```

`StringLoader.StreamFactory`的`build`方法会调用`MultiModelLoaderFactory`的`build`方法，寻找Model为Uri的`ModelLoader`。

```java
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

如果存在多个`ModelLoader`方法，就会返回一个`MultiModelLoader`对象。

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

`ModelLoader`获取完成之后，`DecodeHelper`的`getLoadData`方法会调用`ModelLoader`的`buildLoadData`方法。还以Model为`Http`链接为例。会依次调用`StringLoader`、`MultiModelLoader`、`HttpUriLoader`和`HttpGlideUrlLoader`。
