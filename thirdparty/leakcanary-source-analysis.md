根据[How LeakCanary works](https://square.github.io/leakcanary/fundamentals-how-leakcanary-works/)我们可以知道LeakCanary工作流程大致分为4个阶段：

* 检测持有对象
* 存储堆信息
* 分析堆信息
* 对泄露进行分类


## LeakCanary2.0的安装流程

`LeakCanary`1.0需要手动在`Application`进行安装，2.0不需要任何手动安装的代码。`AppWatcherInstaller`继承`ContentProvider`,`AppWatcherInstaller`的`onCreate`方法会调用安装方法。

### oncreate()

```kotlin
override fun onCreate(): Boolean {
  val application = context!!.applicationContext as Application
  //安装
  AppWatcher.manualInstall(application)
  return true
}
```
### manualInstall()

`AppWatcher`的`manualInstall`方法。

```kotlin
@JvmOverloads
fun manualInstall(
  application: Application,
  retainedDelayMillis: Long = TimeUnit.SECONDS.toMillis(5),
  watchersToInstall: List<InstallableWatcher> = appDefaultWatchers(application)
) {
  //检查是否是主线程
  checkMainThread()
  //如果已经安装过抛出异常
  if (isInstalled) {
    throw IllegalStateException(
      "AppWatcher already installed, see exception cause for prior install call", installCause
    )
  }
  check(retainedDelayMillis >= 0) {
    "retainedDelayMillis $retainedDelayMillis must be at least 0 ms"
  }
  installCause = RuntimeException("manualInstall() first called here")
  this.retainedDelayMillis = retainedDelayMillis
  if (application.isDebuggableBuild) {
    LogcatSharkLog.install()
  }
  // Requires AppWatcher.objectWatcher to be set
  //获取
  LeakCanaryDelegate.loadLeakCanary(application)
  //遍历并调用install方法
  watchersToInstall.forEach {
    it.install()
  }
}
```

### appDefaultWatchers()

`appDefaultWatchers`获取默认安装列表

```kotlin
fun appDefaultWatchers(
  application: Application,
  reachabilityWatcher: ReachabilityWatcher = objectWatcher
): List<InstallableWatcher> {
  return listOf(
    ActivityWatcher(application, reachabilityWatcher),
    FragmentAndViewModelWatcher(application, reachabilityWatcher),
    RootViewWatcher(reachabilityWatcher),
    ServiceWatcher(reachabilityWatcher)
  )
}
```

### loadLeakCanary

```kotlin
val loadLeakCanary by lazy {
  try {
    //反射获取InternalLeakCanary的INSTANCE
    val leakCanaryListener = Class.forName("leakcanary.internal.InternalLeakCanary")
    leakCanaryListener.getDeclaredField("INSTANCE")
      .get(null) as (Application) -> Unit
  } catch (ignored: Throwable) {
    NoLeakCanary
  }
}
```

```kotlin
LeakCanaryDelegate.loadLeakCanary(application)
```

第一次看有点懵逼，这里我单独写了个等价的类`Singleton`继承自函数类型`(String)->Unit`并复写函数类型的`invoke`方法。

```kotlin
object Singleton:(String)->Unit {
    override fun invoke(string: String){
        print("invoke")
    }
}
```

`Kotlin`的`object`会生成一个`INSTANCE`字段。

```java
//Kotlin反编译
public final class Singleton implements Function1{
  public static final Singleton INSTANCE;
}
```

```java
fun main(args:Array<String>){
    val singleton =  Class.forName("Singleton")
    //获取INSTANCE并转换为函数类型(String)->Unit
    val instance = singleton.getDeclaredField("INSTANCE").get(null) as (String)->Unit
    //调用函数invoke
    instance("test") //invoke test
}
```

所以`LeakCanaryDelegate.loadLeakCanary(application)`其实调用的`InternalLeakCanary`的`invoke`方法。

### invoke()

```kotlin
override fun invoke(application: Application) {
  _application = application

  checkRunningInDebuggableBuild()
  //添加listener
  AppWatcher.objectWatcher.addOnObjectRetainedListener(this)
  //创建AndroidHeapDumper
  val heapDumper = AndroidHeapDumper(application, createLeakDirectoryProvider(application))
  //获取GcTigger
  val gcTrigger = GcTrigger.Default

  val configProvider = { LeakCanary.config }

  val handlerThread = HandlerThread(LEAK_CANARY_THREAD_NAME)
  handlerThread.start()
  val backgroundHandler = Handler(handlerThread.looper)
  //创建HeapDumpTrigger
  heapDumpTrigger = HeapDumpTrigger(
    application, backgroundHandler, AppWatcher.objectWatcher, gcTrigger, heapDumper,
    configProvider
  )
  //application注册可见监听器
  application.registerVisibilityListener { applicationVisible ->
                                          this.applicationVisible = applicationVisible
                                            heapDumpTrigger.onApplicationVisibilityChanged(applicationVisible)
                                         }
  registerResumedActivityListener(application)
  addDynamicShortcut(application)

  // We post so that the log happens after Application.onCreate()
  mainHandler.post {
    // https://github.com/square/leakcanary/issues/1981
    // We post to a background handler because HeapDumpControl.iCanHasHeap() checks a shared pref
    // which blocks until loaded and that creates a StrictMode violation.
    backgroundHandler.post {
      SharkLog.d {
        when (val iCanHasHeap = HeapDumpControl.iCanHasHeap()) {
          is Yup -> application.getString(R.string.leak_canary_heap_dump_enabled_text)
          is Nope -> application.getString(
            R.string.leak_canary_heap_dump_disabled_text, iCanHasHeap.reason()
          )
        }
      }
    }
  }
}
```



### install()

![image-20211117140304127](https://malinkang.cn/images/jvm/202111171403054.png)



`ActivityDestroyWatcher`
```kotlin
class ActivityWatcher(
  private val application: Application,
  private val reachabilityWatcher: ReachabilityWatcher
) : InstallableWatcher {

  private val lifecycleCallbacks =
    object : Application.ActivityLifecycleCallbacks by noOpDelegate() {
      override fun onActivityDestroyed(activity: Activity) {
        //Activity执行onDestory时调用expectWeaklyReachable
        reachabilityWatcher.expectWeaklyReachable(
          activity, "${activity::class.java.name} received Activity#onDestroy() callback"
        )
      }
    }

  override fun install() {
    //为application注册Activity生命周期回调
    application.registerActivityLifecycleCallbacks(lifecycleCallbacks)
  }

  override fun uninstall() {
    application.unregisterActivityLifecycleCallbacks(lifecycleCallbacks)
  }
}
```

![LeakCancary安装流程](/Users/malinkang/Library/Application Support/typora-user-images/image-20211117141155622.png)

## 检测持有对象



### registerVisibilityListener()

在`InternalLeakCanary`的`invoke`方法中会调用`application`的`registerVisibilityListener`方法。

```kotlin
application.registerVisibilityListener { applicationVisible ->
  this.applicationVisible = applicationVisible
  heapDumpTrigger.onApplicationVisibilityChanged(applicationVisible)
}
```

`registerVisibilityListener`是一个扩展函数。内部创建了注册了`Activity`生命周期回调和开屏和锁屏的广播。

```kotlin
internal fun Application.registerVisibilityListener(listener: (Boolean) -> Unit) {
  //创建VisibilityTracker并将listener传递给VisibilityTracker
  val visibilityTracker = VisibilityTracker(listener)
  registerActivityLifecycleCallbacks(visibilityTracker)
  registerReceiver(visibilityTracker, IntentFilter().apply {
    addAction(ACTION_SCREEN_ON)
    addAction(ACTION_SCREEN_OFF)
  })
}
```

### VisibilityTracker

`VisibilityTracker`是 一个广播接受者的子类，并实现了`ActivityLifecycleCallbacks`接口。

![image-20211117140225926](https://malinkang.cn/images/jvm/202111171402501.png)

#### onActivityStarted()

```kotlin
override fun onActivityStarted(activity: Activity) {
  startedActivityCount++
  if (!hasVisibleActivities && startedActivityCount == 1) {
    //设置为可见
    hasVisibleActivities = true 
    updateVisible()
  }
}
```

#### onActivityStopped()

```kotlin
override fun onActivityStopped(activity: Activity) {
  // This could happen if the callbacks were registered after some activities were already
  // started. In that case we effectively considers those past activities as not visible.
  if (startedActivityCount > 0) {
    startedActivityCount--
  }
  if (hasVisibleActivities && startedActivityCount == 0 && !activity.isChangingConfigurations) {
    //设置为不可见
    hasVisibleActivities = false
    updateVisible()
  }
}
```

#### onReceive()

```kotlin
override fun onReceive(
  context: Context,
  intent: Intent
) {
  //判断是否锁屏
  screenOn = intent.action != ACTION_SCREEN_OFF
  updateVisible()
}
```

#### updateVisible()

```kotlin
private fun updateVisible() {
  val visible = screenOn && hasVisibleActivities
  if (visible != lastUpdate) {
    lastUpdate = visible
    //回调
    listener.invoke(visible)
  }
}
```

### onApplicationVisibilityChanged()

可见性回调会调用`HeapDumpTrigger`的`onApplicationVisibilityChanged`方法。当不可见时会调用`scheduleRetainedObjectCheck`

```kotlin
fun onApplicationVisibilityChanged(applicationVisible: Boolean) {
  if (applicationVisible) {
    applicationInvisibleAt = -1L
  } else {
    //不可见
    applicationInvisibleAt = SystemClock.uptimeMillis()
    // Scheduling for after watchDuration so that any destroyed activity has time to become
    // watch and be part of this analysis.
    scheduleRetainedObjectCheck(
      delayMillis = AppWatcher.config.watchDurationMillis //延迟时间，配置是5s
    )
  }
}
```

### scheduleRetainedObjectCheck()

```kotlin
fun scheduleRetainedObjectCheck(
  delayMillis: Long = 0L
) {
  val checkCurrentlyScheduledAt = checkScheduledAt
  if (checkCurrentlyScheduledAt > 0) {
    return
  }
  checkScheduledAt = SystemClock.uptimeMillis() + delayMillis
  //延迟5s执行
  backgroundHandler.postDelayed({
    checkScheduledAt = 0
    checkRetainedObjects()
  }, delayMillis)
}
```

### checkRetainedObjects()

```kotlin
private fun checkRetainedObjects() {
  val iCanHasHeap = HeapDumpControl.iCanHasHeap()

  val config = configProvider()

  if (iCanHasHeap is Nope) {
    if (iCanHasHeap is NotifyingNope) {
      // Before notifying that we can't dump heap, let's check if we still have retained object.
      //获取持有对象个数
      var retainedReferenceCount = objectWatcher.retainedObjectCount
      //如果持有的对象个数大于0
      if (retainedReferenceCount > 0) {
        //执行GC
        gcTrigger.runGc()
        //再次获取引用对象个数
        retainedReferenceCount = objectWatcher.retainedObjectCount
      }

      val nopeReason = iCanHasHeap.reason()
      //是否应当进行dump
      val wouldDump = !checkRetainedCount(
        retainedReferenceCount, config.retainedVisibleThreshold, nopeReason
      )

      if (wouldDump) {
        val uppercaseReason = nopeReason[0].toUpperCase() + nopeReason.substring(1)
        onRetainInstanceListener.onEvent(DumpingDisabled(uppercaseReason))
        showRetainedCountNotification(
          objectCount = retainedReferenceCount,
          contentText = uppercaseReason
        )
      }
    } else {
      SharkLog.d {
        application.getString(
          R.string.leak_canary_heap_dump_disabled_text, iCanHasHeap.reason()
        )
      }
    }
    return
  }
  //获取持有对象的个数
  var retainedReferenceCount = objectWatcher.retainedObjectCount

  if (retainedReferenceCount > 0) {
    gcTrigger.runGc()
    retainedReferenceCount = objectWatcher.retainedObjectCount
  }

  if (checkRetainedCount(retainedReferenceCount, config.retainedVisibleThreshold)) return

  val now = SystemClock.uptimeMillis()
  //计算当前时间和上一次调用dump时间的差值
  val elapsedSinceLastDumpMillis = now - lastHeapDumpUptimeMillis
  //如果距离上一次调用dump的时间间隔小于60s 再次执行scheduleRetainedObjectCheck
  if (elapsedSinceLastDumpMillis < WAIT_BETWEEN_HEAP_DUMPS_MILLIS) {
    onRetainInstanceListener.onEvent(DumpHappenedRecently)
    showRetainedCountNotification(
      objectCount = retainedReferenceCount,
      contentText = application.getString(R.string.leak_canary_notification_retained_dump_wait)
    )
    //计算延迟时间，延迟到下一次
    scheduleRetainedObjectCheck(
      delayMillis = WAIT_BETWEEN_HEAP_DUMPS_MILLIS - elapsedSinceLastDumpMillis
    )
    return
  }

  dismissRetainedCountNotification()
  val visibility = if (applicationVisible) "visible" else "not visible"
  //
  dumpHeap(
    retainedReferenceCount = retainedReferenceCount,
    retry = true,
    reason = "$retainedReferenceCount retained objects, app is $visibility"
  )
}
```
### checkRetainedCount()

```kotlin
private fun checkRetainedCount(
  retainedKeysCount: Int,
  retainedVisibleThreshold: Int,
  nopeReason: String? = null
): Boolean 
val countChanged = lastDisplayedRetainedObjectCount != retainedKeysCount
lastDisplayedRetainedObjectCount = retainedKeysCount
if (retainedKeysCount == 0) {
  if (countChanged) {
    SharkLog.d { "All retained objects have been garbage collected" }
    onRetainInstanceListener.onEvent(NoMoreObjects)
    showNoMoreRetainedObjectNotification()
  }
  return true
}

val applicationVisible = applicationVisible
val applicationInvisibleLessThanWatchPeriod = applicationInvisibleLessThanWatchPeriod

if (countChanged) {
  val whatsNext = if (applicationVisible) {
    if (retainedKeysCount < retainedVisibleThreshold) {
      "not dumping heap yet (app is visible & < $retainedVisibleThreshold threshold)"
    } else {
      if (nopeReason != null) {
        "would dump heap now (app is visible & >=$retainedVisibleThreshold threshold) but $nopeReason"
      } else {
        "dumping heap now (app is visible & >=$retainedVisibleThreshold threshold)"
      }
    }
  } else if (applicationInvisibleLessThanWatchPeriod) {
    val wait =
    AppWatcher.config.watchDurationMillis - (SystemClock.uptimeMillis() - applicationInvisibleAt)
    if (nopeReason != null) {
      "would dump heap in $wait ms (app just became invisible) but $nopeReason"
    } else {
      "dumping heap in $wait ms (app just became invisible)"
    }
  } else {
    if (nopeReason != null) {
      "would dump heap now (app is invisible) but $nopeReason"
    } else {
      "dumping heap now (app is invisible)"
    }
  }

  SharkLog.d {
    val s = if (retainedKeysCount > 1) "s" else ""
    "Found $retainedKeysCount object$s retained, $whatsNext"
  }
}

if (retainedKeysCount < retainedVisibleThreshold) {
  if (applicationVisible || applicationInvisibleLessThanWatchPeriod) {
    if (countChanged) {
      onRetainInstanceListener.onEvent(BelowThreshold(retainedKeysCount))
    }
    showRetainedCountNotification(
      objectCount = retainedKeysCount,
      contentText = application.getString(
        R.string.leak_canary_notification_retained_visible, retainedVisibleThreshold
      )
    )
    scheduleRetainedObjectCheck(
      delayMillis = WAIT_FOR_OBJECT_THRESHOLD_MILLIS
    )
    return true
  }
}
return false
}
```



当锁屏或者执行`Activity`的`onStop`方法时，执行的流程图如下所示：

![image-20211117104342050](https://malinkang.cn/images/jvm/202111171043550.png)



### ObjectWatcher

```kotlin
//创建ObjectWatcher
val objectWatcher = ObjectWatcher(
  clock = { SystemClock.uptimeMillis() },
  checkRetainedExecutor = {
    check(isInstalled) {
      "AppWatcher not installed"
    }
    mainHandler.postDelayed(it, retainedDelayMillis)
  },
  isEnabled = { true }
)
```

### expectWeaklyReach()

```kotlin
 @Synchronized override fun expectWeaklyReach
  watchedObject: Any,
  description: String
) {
  if (!isEnabled()) {
    return
  }
  //移除已经回收的对象
  removeWeaklyReachableObjects()
  //生成随机key
  val key = UUID.randomUUID()
    .toString()
  val watchUptimeMillis = clock.uptimeMillis
  //构造KeyedWeakReference 用来监听目标对象
  val reference =
    KeyedWeakReference(watchedObject, key, d
  SharkLog.d {
    "Watching " +
      (if (watchedObject is Class<*>) watche
      (if (description.isNotEmpty()) " ($des
      " with key $key"
  }
  //将引用存储到Map中
  watchedObjects[key] = reference
  checkRetainedExecutor.execute {
    moveToRetained(key)
  }
}
```

### moveToRetained()

```kotlin
@Synchronized private fun moveToRetained(key: String) {
  removeWeaklyReachableObjects()
  val retainedRef = watchedObjects[key]
  if (retainedRef != null) {
    retainedRef.retainedUptimeMillis = clock.uptimeMillis()
    //执行InternalLeakCanary的onObjectRetained方法
    onObjectRetainedListeners.forEach { it.onObjectRetained() }
  }
}
```

### onObjectRetained()

```kotlin
override fun onObjectRetained() = scheduleRetainedObjectCheck()
```

```kotlin
fun scheduleRetainedObjectCheck() {
  if (this::heapDumpTrigger.isInitialized) {
    heapDumpTrigger.scheduleRetainedObjectCheck()
  }
}
```

![image-20211117141939517](https://malinkang.cn/images/jvm/202111171419011.png)

## 存储堆信息

`HeapDumpTrigger`的`dumpHeap`方法

### dumpHeap()

```kotlin
private fun dumpHeap(
  retainedReferenceCount: Int,
  retry: Boolean
) {
  saveResourceIdNamesToMemory()
  val heapDumpUptimeMillis = SystemClock.uptimeMillis()
  KeyedWeakReference.heapDumpUptimeMillis = heapDumpUptimeMillis
  //调用HeapDumper的dumpHeap存储堆信息
  val heapDumpFile = heapDumper.dumpHeap()
  if (heapDumpFile == null) {
    if (retry) {
      SharkLog.d { "Failed to dump heap, will retry in $WAIT_AFTER_DUMP_FAILED_MILLIS ms" }
      scheduleRetainedObjectCheck(
        reason = "failed to dump heap",
        rescheduling = true,
        delayMillis = WAIT_AFTER_DUMP_FAILED_MILLIS
      )
    } else {
      SharkLog.d { "Failed to dump heap, will not automatically retry" }
    }
    showRetainedCountNotification(
      objectCount = retainedReferenceCount,
      contentText = application.getString(
        R.string.leak_canary_notification_retained_dump_failed
      )
    )
    return
  }
  lastDisplayedRetainedObjectCount = 0
  lastHeapDumpUptimeMillis = SystemClock.uptimeMillis()
  objectWatcher.clearObjectsWatchedBefore(heapDumpUptimeMillis)
  //分析堆信息
  HeapAnalyzerService.runAnalysis(application, heapDumpFile)
}
```
### dumpHeap()

`AndroidHeapDumper`的`dumpHeap`方法

```java

override fun dumpHeap(): File? {
  //调用LeakDirectoryProvider的newHeapDumpFile方法获取存储文件路径
  val heapDumpFile = leakDirectoryProvider.newHeapDumpFile() ?: return null

    val waitingForToast = FutureResult<Toast?>()
    showToast(waitingForToast)

    if (!waitingForToast.wait(5, SECONDS)) {
      SharkLog.d { "Did not dump heap, too much time waiting for Toast." }
      return null
    }

  val notificationManager =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Notifications.canShowNotification) {
      val dumpingHeap = context.getString(R.string.leak_canary_notification_dumping)
        val builder = Notification.Builder(context)
        .setContentTitle(dumpingHeap)
        val notification = Notifications.buildNotification(context, builder, LEAKCANARY_LOW)
        notificationManager.notify(R.id.leak_canary_notification_dumping_heap, notification)
    }

  val toast = waitingForToast.get()

    return try {
      //存储文件
      Debug.dumpHprofData(heapDumpFile.absolutePath)
        if (heapDumpFile.length() == 0L) {
          SharkLog.d { "Dumped heap file is 0 byte length" }
          null
        } else {
          heapDumpFile
        }
    } catch (e: Exception) {
      SharkLog.d(e) { "Could not dump heap" }
      // Abort heap dump
      null
    } finally {
      cancelToast(toast)
        notificationManager.cancel(R.id.leak_canary_notification_dumping_heap)
    }
}
```

## 分析堆信息
### runAnalysis()

`HeapAnalyzerService`的静态方法`runAnalysis`

```kotlin
fun runAnalysis(
  context: Context,
  heapDumpFile: File
) {
  val intent = Intent(context, HeapAnalyzerService::class.java)
  intent.putExtra(HEAPDUMP_FILE_EXTRA, heapDumpFile)
  startForegroundService(context, intent)
}
```
### onHandleIntentInForeground()

```kotlin
override fun onHandleIntentInForeground(intent: Intent?) {
  if (intent == null || !intent.hasExtra(HEAPDUMP_FILE_EXTRA)) {
    SharkLog.d { "HeapAnalyzerService received a null or empty intent, ignoring." }
    return
  }

  // Since we're running in the main process we should be careful not to impact it.
  Process.setThreadPriority(Process.THREAD_PRIORITY_BACKGROUND)
  val heapDumpFile = intent.getSerializableExtra(HEAPDUMP_FILE_EXTRA) as File

  val config = LeakCanary.config
  //分析堆信息
  val heapAnalysis = if (heapDumpFile.exists()) {
    analyzeHeap(heapDumpFile, config)
  } else {
    missingFileFailure(heapDumpFile)
  }

  onAnalysisProgress(REPORTING_HEAP_ANALYSIS)
  //回调
  config.onHeapAnalyzedListener.onHeapAnalyzed(heapAnalysis)
}
```

### analyzeHeap()

```kotlin
private fun analyzeHeap(
  heapDumpFile: File,
  config: Config
): HeapAnalysis {
  //创建HeapAnalyzer
  val heapAnalyzer = HeapAnalyzer(this)

  val proguardMappingReader = try {
    ProguardMappingReader(assets.open(PROGUARD_MAPPING_FILE_NAME))
  } catch (e: IOException) {
    null
  }
  return heapAnalyzer.analyze(
    heapDumpFile = heapDumpFile,
    leakingObjectFinder = config.leakingObjectFinder,
    referenceMatchers = config.referenceMatchers,
    computeRetainedHeapSize = config.computeRetainedHeapSize,
    objectInspectors = config.objectInspectors,
    metadataExtractor = config.metadataExtractor,
    proguardMapping = proguardMappingReader?.readProguardMapping()
  )
}
```
### analyze()

`HeapAnalyzer`的`analyze`方法

```kotlin
fun analyze(
  heapDumpFile: File,
  leakingObjectFinder: LeakingObjectFinder,
  referenceMatchers: List<ReferenceMatcher> = emptyList(),
  computeRetainedHeapSize: Boolean = false,
  objectInspectors: List<ObjectInspector> = emptyList(),
  metadataExtractor: MetadataExtractor = MetadataExtractor.NO_OP,
  proguardMapping: ProguardMapping? = null
): HeapAnalysis {
  val analysisStartNanoTime = System.nanoTime()

  if (!heapDumpFile.exists()) {
    val exception = IllegalArgumentException("File does not exist: $heapDumpFile")
    return HeapAnalysisFailure(
      heapDumpFile, System.currentTimeMillis(), since(analysisStartNanoTime),
      HeapAnalysisException(exception)
    )
  }

  return try {
    listener.onAnalysisProgress(PARSING_HEAP_DUMP)
    Hprof.open(heapDumpFile)
    .use { hprof ->
          val graph = HprofHeapGraph.indexHprof(hprof, proguardMapping)
          val helpers =
          FindLeakInput(graph, referenceMatchers, computeRetainedHeapSize, objectInspectors)
          helpers.analyzeGraph(
            metadataExtractor, leakingObjectFinder, heapDumpFile, analysisStartNanoTime
          )
         }
  } catch (exception: Throwable) {
    HeapAnalysisFailure(
      heapDumpFile, System.currentTimeMillis(), since(analysisStartNanoTime),
      HeapAnalysisException(exception)
    )
  }
}
```

### analyzeGraph()

```kotlin
private fun FindLeakInput.analyzeGraph(
  metadataExtractor: MetadataExtractor,
  leakingObjectFinder: LeakingObjectFinder,
  heapDumpFile: File,
  analysisStartNanoTime: Long
): HeapAnalysisSuccess {
  listener.onAnalysisProgress(EXTRACTING_METADATA)
  val metadata = metadataExtractor.extractMetadata(graph)

  listener.onAnalysisProgress(FINDING_RETAINED_OBJECTS)
  val leakingObjectIds = leakingObjectFinder.findLeakingObjectIds(graph)

  val (applicationLeaks, libraryLeaks) = findLeaks(leakingObjectIds)

  return HeapAnalysisSuccess(
    heapDumpFile = heapDumpFile,
    createdAtTimeMillis = System.currentTimeMillis(),
    analysisDurationMillis = since(analysisStartNanoTime),
    metadata = metadata,
    applicationLeaks = applicationLeaks,
    libraryLeaks = libraryLeaks
  )
}
```

### findLeaks()

```kotlin
private fun FindLeakInput.findLeaks(leakingObjectIds: Set<Long>): Pair<List<ApplicationLeak>, List<LibraryLeak>> {
  val pathFinder = PathFinder(graph, listener, referenceMatchers)
  val pathFindingResults =
  pathFinder.findPathsFromGcRoots(leakingObjectIds, computeRetainedHeapSize)

  SharkLog.d { "Found ${leakingObjectIds.size} retained objects" }

  return buildLeakTraces(pathFindingResults)
}
```

## 分析结果呈现

### onHeapAnalyzed()

```kotlin
override fun onHeapAnalyzed(heapAnalysis: HeapAnalysis) {
  SharkLog.d { "$heapAnalysis" }

  val id = LeaksDbHelper(application).writableDatabase.use { db ->
                                                            HeapAnalysisTable.insert(db, heapAnalysis)
                                                           }

  val (contentTitle, screenToShow) = when (heapAnalysis) {
    is HeapAnalysisFailure -> application.getString(
      R.string.leak_canary_analysis_failed
    ) to HeapAnalysisFailureScreen(id)
    is HeapAnalysisSuccess -> {
      val retainedObjectCount = heapAnalysis.allLeaks.sumBy { it.leakTraces.size }
      val leakTypeCount = heapAnalysis.applicationLeaks.size + heapAnalysis.libraryLeaks.size
      application.getString(
        R.string.leak_canary_analysis_success_notification, retainedObjectCount, leakTypeCount
      ) to HeapDumpScreen(id)
    }
  }

  if (InternalLeakCanary.formFactor == TV) {
    showToast(heapAnalysis)
    printIntentInfo()
  } else {
    showNotification(screenToShow, contentTitle)
  }
}
```

## 参考

* [带着问题学】关于LeakCanary2.0你应该知道的知识点](https://juejin.cn/post/6968084138125590541)
* [Android内存泄漏检测之LeakCanary2.0（Kotlin版）的实现原理](https://zhuanlan.zhihu.com/p/360944586)
* [LeakCanary源码分析](https://huangyu.github.io/archives/2e6a35c5.html)