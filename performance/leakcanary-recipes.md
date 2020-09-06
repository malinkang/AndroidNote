此页面包含用于根据需要定制LeakCanary的代码配方。通读章节标题并自己做饭！另外，请不要忘记查看FAQ。

> 如果您认为可能缺少食谱，或者不确定当前的API是否可以实现您要实现的目标，请提出问题。您的反馈意见可以帮助我们使LeakCanary更好地服务于整个社区。

## 观察具有生命周期的对象¶


LeakCanary的默认配置将自动监视Activity，Fragment，Fragment View和ViewModel实例。

在您的应用程序中，您可能还有其他具有生命周期的对象，例如服务，Dagger组件等。请使用AppWatcher.objectWatcher监视应进行垃圾收集的实例：


```java
class MyService : Service {

  // ...

  override fun onDestroy() {
    super.onDestroy()
    AppWatcher.objectWatcher.watch(
      watchedObject = this,
      description = "MyService received Service#onDestroy() callback"
    )
  }
}
```

LeakCanary具有默认配置，适用于大多数应用程序。您也可以根据需要自定义它。LeakCanary配置由两个单例对象（AppWatcher和LeakCanary）保留，可以随时更新。大多数开发人员在其调试 应用程序类中配置LeakCanary ：

```java
class DebugExampleApplication : ExampleApplication() {

  override fun onCreate() {
    super.onCreate()
    AppWatcher.config = AppWatcher.config.copy(watchFragmentViews = false)
  }
}
```

> 在您的src/debug/java文件夹中创建一个调试应用程序类。别忘了还要在中注册src/debug/AndroidManifest.xml。


## 在单独的过程中运行LeakCanary分析

LeakCanary在您的主应用程序流程中运行。LeakCanary 2经过优化，可以在分析时保持较低的内存使用率，并优先在后台线程中运行Process.THREAD_PRIORITY_BACKGROUND。如果发现LeakCanary仍在使用过多内存或影响应用程序进程性能，则可以对其进行配置以在单独的进程中运行分析。

您所需要做的就是leakcanary-android用leakcanary-android-process：


```groovy
dependencies {
  // debugImplementation 'com.squareup.leakcanary:leakcanary-android:${version}'
  debugImplementation 'com.squareup.leakcanary:leakcanary-android-process:${version}'
}
```

您可以调用LeakCanaryProcess.isInAnalyzerProcess来检查是否在LeakCanary进程中创建了Application类。当配置Firebase之类的库在意外进程中运行时可能崩溃时，此功能很有用。