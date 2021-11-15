### 缓存过程


### loadFromMemory

```java
@Nullable
private EngineResource<?> loadFromMemory(
    EngineKey key, boolean isMemoryCacheable, long startTime) {
  //内存缓存不可用直接返回null
  if (!isMemoryCacheable) {
    return null;
  }
  EngineResource<?> active = loadFromActiveResources(key);
  if (active != null) {
    if (VERBOSE_IS_LOGGABLE) {
      logWithTimeAndKey("Loaded resource from active resources", startTime, key);
    }
    return active;
  }
  EngineResource<?> cached = loadFromCache(key);
  if (cached != null) {
    if (VERBOSE_IS_LOGGABLE) {
      logWithTimeAndKey("Loaded resource from cache", startTime, key);
    }
    return cached;
  }
  return null;
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

```java
//从缓存中获取
@Nullable
private EngineResource<?> loadFromMemory(
    EngineKey key, boolean isMemoryCacheable, long startTime) {
  //内存缓存不可用直接返回null
  if (!isMemoryCacheable) {
    return null;
  }
  //先从弱引用中获取，如果获取不到则从LruResourceCache中获取缓存
  EngineResource<?> active = loadFromActiveResources(key);
  if (active != null) {
    if (VERBOSE_IS_LOGGABLE) {
      logWithTimeAndKey("Loaded resource from active resources", startTime, key);
    }
    return active;
  }
 
  EngineResource<?> cached = loadFromCache(key);  
  if (cached != null) {
    if (VERBOSE_IS_LOGGABLE) {
      logWithTimeAndKey("Loaded resource from cache", startTime, key);
    }
    return cached;
  }
  return null;
}
@Nullable
private EngineResource<?> loadFromActiveResources(Key key) {
  //从弱引用中获取
  EngineResource<?> active = activeResources.get(key);
  if (active != null) {
    active.acquire();
  }
  return active;
}
private EngineResource<?> loadFromCache(Key key) {
  EngineResource<?> cached = getEngineResourceFromCache(key);
  if (cached != null) {
    cached.acquire();
    activeResources.activate(key, cached);
  }
  return cached;
}
private EngineResource<?> getEngineResourceFromCache(Key key) {
  //从LruResourceCache中获取缓存
  Resource<?> cached = cache.remove(key);
  final EngineResource<?> result;
  if (cached == null) {
    result = null;
  } else if (cached instanceof EngineResource) {
    // Save an object allocation if we've cached an EngineResource (the typical case).
    result = (EngineResource<?>) cached;
  } else {
    result =
        new EngineResource<>(
            cached, /*isMemoryCacheable=*/ true, /*isRecyclable=*/ true, key, /*listener=*/ this);
  }
  return result;
}
//写入缓存
@Override
public synchronized void onResourceReleased(Key cacheKey, EngineResource<?> resource) {
  activeResources.deactivate(cacheKey);
  if (resource.isMemoryCacheable()) {
    cache.put(cacheKey, resource);
  } else {
    resourceRecycler.recycle(resource);
  }
}
```