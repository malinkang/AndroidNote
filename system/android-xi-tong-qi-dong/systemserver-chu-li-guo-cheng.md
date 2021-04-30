# SystemServer处理过程

SystemServer进程主要用于创建系统服务，我们熟知的AMS、WMS和PMS都是由它来创建的，因此掌握SystemServer进程是如何启动的，它在启动时做了哪些工作是十分必要的。

## main

```java
public static void main(String[] args) {
    //创建SystemServer并调用run方法
    new SystemServer().run();
}
```

```java
private void run() {
  try {
      startBootstrapServices(t);
      startCoreServices(t);
      startOtherServices(t);
  } catch (Throwable ex) {
    //...
  } finally {
      t.traceEnd(); // StartServices
  }
}
```



```java
//frameworks/base/services/java/com/android/server/SystemServer.java
private void startOtherServices(){
  //创建WindowManagerService
  wm = WindowManagerService.main(context, inputManager,
                    mFactoryTestMode != FactoryTest.FACTORY_TEST_LOW_LEVEL,
                    !mFirstBoot, mOnlyCore);
  ServiceManager.addService(Context.WINDOW_SERVICE, wm);//添加到ServiceManager
}
```

