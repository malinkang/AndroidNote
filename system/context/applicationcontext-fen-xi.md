# ApplicationContext分析

## 创建ApplicationContext

我们通过调用`getApplicationContext()`来获取应用程序全局的ApplicationContext，那么Application Context是如何创建的呢？在一个应用程序启动完成后，应用程序就会有一个全局的Application Context，那么我们就从应用程序启动过程开始着手。

```java
//ActivityThread.java
private Activity performLaunchActivity(ActivityClientRecord r, Intent customIntent) {
    try {
        //调用LoadedApk的makeApplication方法
        Application app = r.packageInfo.makeApplication(false, mInstrumentation);
    }
    return activity;
}
```

```java
public Application makeApplication(boolean forceDefaultAppClass,
        Instrumentation instrumentation) {
    //判断是否为null
    if (mApplication != null) { 
        return mApplication;
    }

    Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "makeApplication");

    Application app = null;
    //类名
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

```java
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

```java
//AppComponentFactory.java
//创建Application
public @NonNull Application instantiateApplication(@NonNull ClassLoader cl,
        @NonNull String className)
        throws InstantiationException, IllegalAccessException, ClassNotFoundException {
    return (Application) cl.loadClass(className).newInstance();
}
```

```java
//Application.java
final void attach(Context context) {
    attachBaseContext(context);
    mLoadedApk = ContextImpl.getImpl(context).mPackageInfo;
}
```

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
@Override
public Context getApplicationContext() {
    //调用ContextImpl的getApplicationContext
    return mBase.getApplicationContext();
}
```

```java
//调用LoadedApk的getApplication()方法
@Override
public Context getApplicationContext() {
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
//ActivityThread
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

