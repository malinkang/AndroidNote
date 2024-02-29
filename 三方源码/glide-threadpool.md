
### GlideExecutor

在`build()`中一共创建了4个线程池

`newDiskCacheExecutor()`创建磁盘缓存的线程池

```java
private static final int DEFAULT_DISK_CACHE_EXECUTOR_THREADS = 1;
public static GlideExecutor.Builder newDiskCacheBuilder() {
  return new GlideExecutor.Builder(/*preventNetworkOperations=*/ true)
      .setThreadCount(DEFAULT_DISK_CACHE_EXECUTOR_THREADS)
      .setName(DEFAULT_DISK_CACHE_EXECUTOR_NAME);
}
```

其余三个线程池都是负责下载和解码的，`newAnimationBuilder`是用来处理gif的。

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
}
```

```java
//计算最佳的线程数量
public static int calculateBestThreadCount() {
  if (bestThreadCount == 0) {
    //cpu内核数量和4取最小值
    bestThreadCount =
        Math.min(MAXIMUM_AUTOMATIC_THREAD_COUNT, RuntimeCompat.availableProcessors());
  }
  return bestThreadCount;
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

