# Context分析

## Context关联类

Context意为上下文，是一个应用程序环境信息的接口。

在开发中我们经常使用Context，它的使用场景总的来说分为两大类，它们分别是：

* 使用Context调用方法，比如启动Activity、访问资源、调用系统级服务等。
* 调用方法时传入Context，比如弹出Toast、创建Dialog等。

`Activity`、`Service`和`Application`都间接地继承自Context，因此我们可以计算出一个应用程序进程中有多少个Context，这个数量等于Activity和Service的总个数加1，1指的是Application的数量。

Context 是一个抽象类，它的内部定义了很多方法以及静态常量，它的具体实现类为ContextImpl。和Context相关联的类，除了`ContextImpl`，还有ContextWrapper、ContextThemeWrapper和Activity等，如图所示。

![](https://malinkang.cn/images/jvm/202111241437141.png)

`ContextImpl`和`ContextWrapper`继承自`Context`，`ContextWrapper`内部包含`Context`类型的mBase对象，mBase 具体指向ContextImpl。ContextImpl 提供了很多功能，但是外界需要使用并拓展ContextImpl的功能，因此设计上使用了装饰模式，ContextWrapper是装饰类，它对ContextImpl进行包装，ContextWrapper主要是起了方法传递的作用，ContextWrapper中几乎所有的方法都是调用ContextImpl的相应方法来实现的。ContextThemeWrapper、Service和Application都继承自ContextWrapper，这样它们都可以通过mBase来使用Context的方法，同时它们也是装饰类，在ContextWrapper的基础上又添加了不同的功能。`ContextThemeWrapper`中包含和主题相关的方法（比如getTheme方法），因此，需要主题的Activity继承`ContextThemeWrapper`，而不需要主题的Service继承ContextWrapper。

Context的关联类采用了装饰模式，主要有以下的优点：

* 使用者（比如Service）能够更方便地使用Context。
* 如果`ContextImpl`发生了变化，它的装饰类ContextWrapper不需要做任何修改。
*  `ContextImpl`的实现不会暴露给使用者，使用者也不必关心`ContextImpl`的实现。
* 通过组合而非继承的方式，拓展ContextImpl的功能，在运行时选择不同的装饰类，实现不同的功能。

为了更好地理解Context的关联类的设计理念，就需要理解Application、Activity、Service的Context的创建过程，下面分别对它们进行介绍。

## ApplicationContext创建

我们通过调用`getApplicationContext()`来获取应用程序全局的ApplicationContext，那么Application Context是如何创建的呢？在一个应用程序启动完成后，应用程序就会有一个全局的Application Context，那么我们就从应用程序启动过程开始着手。

![ApplicationContext创建过程](https://malinkang.cn/images/jvm/202111241522593.png)

### performLaunchActivity()

```java
//frameworks/base/core/java/android/app/ActivityThread.java
private Activity performLaunchActivity(ActivityClientRecord r, Intent customIntent) {
    try {
        //调用LoadedApk的makeApplication方法
        Application app = r.packageInfo.makeApplication(false, mInstrumentation);
    }
    return activity;
}
```

### makeApplication()

```java
//frameworks/base/core/java/android/app/LoadedApk.java
public Application makeApplication(boolean forceDefaultAppClass,
        Instrumentation instrumentation) {
    //判断是否为null
    if (mApplication != null) { 
        return mApplication;
    }

    Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "makeApplication");

    Application app = null;
    //获取Application类名
    String appClass = mApplicationInfo.className;
    if (forceDefaultAppClass || (appClass == null)) {
        appClass = "android.app.Application";
    }

    try {
         //获取ClassLoader
        java.lang.ClassLoader cl = getClassLoader();
        if (!mPackageName.equals("android")) {
            Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER,
                    "initializeJavaContextClassLoader");
            initializeJavaContextClassLoader();
            Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
        }
        //调用ContextImpl静态方法createAppContext创建ContextImpl
        ContextImpl appContext = ContextImpl.createAppContext(mActivityThread, this);
        //创建Application
        app = mActivityThread.mInstrumentation.newApplication(
                cl, appClass, appContext);
        appContext.setOuterContext(app);
    } catch (Exception e) {
        if (!mActivityThread.mInstrumentation.onException(app, e)) {
            Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
            throw new RuntimeException(
                "Unable to instantiate application " + appClass
                + ": " + e.toString(), e);
        }
    }
    mActivityThread.mAllApplications.add(app);
    mApplication = app; //赋值

    if (instrumentation != null) {
        try {
            instrumentation.callApplicationOnCreate(app);
        } catch (Exception e) {
            if (!instrumentation.onException(app, e)) {
                Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
                throw new RuntimeException(
                    "Unable to create application " + app.getClass().getName()
                    + ": " + e.toString(), e);
            }
        }
    }
    //...

    return app;
}
```

### createAppContext()

```java
//frameworks/base/core/java/android/app/ContextImpl.java
static ContextImpl createAppContext(ActivityThread mainThread, LoadedApk packageInfo) {
  return createAppContext(mainThread, packageInfo, null);
}
static ContextImpl createAppContext(ActivityThread mainThread, LoadedApk packageInfo,
                                    String opPackageName) {
  if (packageInfo == null) throw new IllegalArgumentException("packageInfo");
  ContextImpl context = new ContextImpl(null, mainThread, packageInfo,
                                        ContextParams.EMPTY, null, null, null, null, null, 0, null, opPackageName);
  context.setResources(packageInfo.getResources());
  context.mContextType = isSystemOrSystemUI(context) ? CONTEXT_TYPE_SYSTEM_OR_SYSTEM_UI
    : CONTEXT_TYPE_NON_UI;
  return context;
}

```



### newApplication()

```java
//frameworks/base/core/java/android/app/Instrumentation.java
public Application newApplication(ClassLoader cl, String className, Context context)
        throws InstantiationException, IllegalAccessException, 
        ClassNotFoundException {
   //先获取AppComponentFactory
    Application app = getFactory(context.getPackageName())
            .instantiateApplication(cl, className);
    //调用Application的attach方法
    app.attach(context);
    return app;
}
```

### getFactory()

```java
//frameworks/base/core/java/android/app/Instrumentation.java
private AppComponentFactory getFactory(String pkg) {
  if (pkg == null) {
    Log.e(TAG, "No pkg specified, disabling AppComponentFactory");
    return AppComponentFactory.DEFAULT;
  }
  if (mThread == null) {
    Log.e(TAG, "Uninitialized ActivityThread, likely app-created Instrumentation,"
          + " disabling AppComponentFactory", new Throwable());
    return AppComponentFactory.DEFAULT;
  }
  LoadedApk apk = mThread.peekPackageInfo(pkg, true);
  // This is in the case of starting up "android".
  if (apk == null) apk = mThread.getSystemContext().mPackageInfo;
  return apk.getAppFactory();
}
```

### instantiateApplication()

```java
//frameworks/base/core/java/android/app/AppComponentFactory.java
//创建Application
public @NonNull Application instantiateApplication(@NonNull ClassLoader cl,
        @NonNull String className)
        throws InstantiationException, IllegalAccessException, ClassNotFoundException {
    return (Application) cl.loadClass(className).newInstance();
}
```

### attach()

```java
//Application.java
final void attach(Context context) {
    attachBaseContext(context);
    mLoadedApk = ContextImpl.getImpl(context).mPackageInfo;
}
```

### attachBaseContext()

```java
//ContextWrapper.java
protected void attachBaseContext(Context base) {
    if (mBase != null) {
        throw new IllegalStateException("Base context already set");
    }
    mBase = base;
}
```

这个base一路传递过来指的是ContextImpl，它是Context的实现类，将ContextImpl赋值给ContextWrapper的Context类型的成员变量mBase，这样在ContextWrapper中就可以使用Context的方法，而Application继承自ContextWrapper，同样可以使用Context的方法。Application的attach方法的作用就是使Application可以使用Context的方法，这样Application才可以用来代表Application Context。

## 获取ApplicationContext

```java
//frameworks/base/core/java/android/content/ContextWrapper.java
@Override
public Context getApplicationContext() {
    //调用ContextImpl的getApplicationContext
    return mBase.getApplicationContext();
}
```

```java
//frameworks/base/core/java/android/app/ContextImpl.java
@Override
public Context getApplicationContext() {
  //调用LoadedApk的getApplication()方法
    return (mPackageInfo != null) ? 
            mPackageInfo.getApplication() : mMainThread.getApplication();
}
```

```java
//LoadedApk.java
Application getApplication() {
    return mApplication;
}
```

## 创建ActivityContext

```java
//frameworks/base/core/java/android/app/ActivityThread.java
private Activity performLaunchActivity(ActivityClientRecord r, Intent customIntent) {
  //...
  //创建ContextImpl
  ContextImpl appContext = createBaseContextForActivity(r);
  Activity activity = null;
  try {
    java.lang.ClassLoader cl = appContext.getClassLoader();
    activity = mInstrumentation.newActivity(
      cl, component.getClassName(), r.intent);
    StrictMode.incrementExpectedActivityCount(activity.getClass());
    r.intent.setExtrasClassLoader(cl);
    r.intent.prepareToEnterProcess(isProtectedComponent(r.activityInfo),
                                   appContext.getAttributionSource());
    if (r.state != null) {
      r.state.setClassLoader(cl);
    }
  } catch (Exception e) {
    if (!mInstrumentation.onException(activity, e)) {
      throw new RuntimeException(
        "Unable to instantiate activity " + component
        + ": " + e.toString(), e);
    }
  }
  //...
  try  {
     //调用activity的attach方法
     activity.attach(appContext, this, getInstrumentation(), r.token,
                        r.ident, app, r.intent, r.activityInfo, title, r.parent,
                        r.embeddedID, r.lastNonConfigurationInstances, config,
                        r.referrer, r.voiceInteractor, window, r.configCallback,
                        r.assistToken, r.shareableActivityToken);
  }
  //...
}
```

### createBaseContextForActivity()

```java
//frameworks/base/core/java/android/app/ActivityThread.java
private ContextImpl createBaseContextForActivity(ActivityClientRecord r) {
    final int displayId;
    try {
        displayId = ActivityTaskManager.getService().getActivityDisplayId(r.token);
    } catch (RemoteException e) {
        throw e.rethrowFromSystemServer();
    }
    //调用createActivityContext
    ContextImpl appContext = ContextImpl.createActivityContext(
            this, r.packageInfo, r.activityInfo, r.token, displayId, r.overrideConfig);
    final DisplayManagerGlobal dm = DisplayManagerGlobal.getInstance();
    // For debugging purposes, if the activity's package name contains the value of
    // the "debug.use-second-display" system property as a substring, then show
    // its content on a secondary display if there is one.
    String pkgName = SystemProperties.get("debug.second-display.pkg");
    if (pkgName != null && !pkgName.isEmpty()
            && r.packageInfo.mPackageName.contains(pkgName)) {
        for (int id : dm.getDisplayIds()) {
            if (id != Display.DEFAULT_DISPLAY) {
                Display display =
                        dm.getCompatibleDisplay(id, appContext.getResources());
                appContext = (ContextImpl) appContext.createDisplayContext(display);
                break;
            }
        }
    }
    return appContext;
}
```

```java
//frameworks/base/core/java/android/app/ContextImpl.java
static ContextImpl createActivityContext(ActivityThread mainThread,
                                         LoadedApk packageInfo, ActivityInfo activityInfo, IBinder activityToken, int displayId,
                                         Configuration overrideConfiguration) {
 
  //...
  ContextImpl context = new ContextImpl(null, mainThread, packageInfo, ContextParams.EMPTY,
                                        attributionTag, null, activityInfo.splitName, activityToken, null, 0, classLoader,
                                        null);
  context.mContextType = CONTEXT_TYPE_ACTIVITY;
  //...
  return context;
}
```



### 参考

* [Android 开发者，你真的懂 Context 吗？](https://juejin.im/post/6844904179060703246)
* [对于 Context，你了解多少?](https://github.com/Moosphan/Android-Daily-Interview/issues/14)
* [Android 复习笔记 —— 扒一扒 Context](https://juejin.cn/post/6864346705081401352)
* Android进阶解密

