根据[How LeakCanary works](https://square.github.io/leakcanary/fundamentals-how-leakcanary-works/)我们可以知道LeakCanary工作流程大致分为4个阶段：

* 检测持有对象

* 存储堆信息

* 分析堆信息

* 对泄露进行分类


## **LeakCanary2.0的安装流程**


`LeakCanary`1.0需要手动在`Application`进行安装，2.0不需要任何手动安装的代码。`AppWatcherInstaller`继承`ContentProvider`,`AppWatcherInstaller`的`onCreate`方法会调用安装方法。


### onCreate()

```kotlin
override fun onCreate(): Boolean {
  val application = context!!.applicationContext as Application
  //安装
  AppWatcher.manualInstall(application)
  return true
}
```


### **manualInstall()**

`AppWatcher`的`manualInstall`方法会调用`appDefaultWatchers`获取一个`InstallableWatcher`的列表，并遍历列表，分别调用每个`InstallableWatcher`的`install`方法。

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


### **appDefaultWatchers()**

`appDefaultWatchers`获取默认安装列表。


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


### **loadLeakCanary**

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

```kotlin
fun main(args:Array<String>){
    val singleton =  Class.forName("Singleton")
    //获取INSTANCE并转换为函数类型(String)->Unit
    val instance = singleton.getDeclaredField("INSTANCE").get(null) as (String)->Unit
    //调用函数invoke
    instance("test") //invoke test
}
```

所以`LeakCanaryDelegate.loadLeakCanary(application)`其实调用的`InternalLeakCanary`的`invoke`方法。


### **invoke()**

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

```kotlin
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


## **检测持有对象**


### **registerVisibilityListener()**


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


### **VisibilityTracker**

VisibilityTracker负责检测应用是否可见。原理也很简单，通过注册ActivityLifecycleCallbacks来注册生命周期方法，并通过广播来监听开屏和锁屏。updateVisible负责更新可见状态。当onActivityStarted调用**，**startedActivityCount递增，startedActivityCount等于1时调用updateVisible。当onActivityStopped调用，startedActivityCount递减，当startedActivityCount等于0时，调用updateVisible更新为不可见。当锁屏和开屏时，会触发onReceive方法，也会调用updateVisible更新状态

**onActivityStarted()**

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

**onActivityStopped()**

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

onReceive()

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

updateVisible()

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


### **onApplicationVisibilityChanged**

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

