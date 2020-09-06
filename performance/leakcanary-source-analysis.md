

AppWatcherInstaller

`onCreate`方法

```kotlin
override fun onCreate(): Boolean {
    val application = context!!.applicationContext as Application
    AppWatcher.manualInstall(application) //安装
    return true
}
//安装
fun manualInstall(application: Application) {
    InternalAppWatcher.install(application)
}
//创建ObjectWatcher
val objectWatcher = ObjectWatcher(
    clock = clock,
    checkRetainedExecutor = checkRetainedExecutor,
    isEnabled = { true }
)
fun install(application: Application) {
    checkMainThread()
    if (this::application.isInitialized) {
    return
    }
    SharkLog.logger = DefaultCanaryLog()
    InternalAppWatcher.application = application

    val configProvider = { AppWatcher.config }
    ActivityDestroyWatcher.install(application, objectWatcher, configProvider)
    FragmentDestroyWatcher.install(application, objectWatcher, configProvider)
    onAppWatcherInstalled(application)
}
```