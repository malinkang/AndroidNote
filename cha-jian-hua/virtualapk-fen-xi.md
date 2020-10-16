# VirtualAPK分析

## VirtualAPK初始化流程

在使用VirtualAPK之前，我们需要多VirtualAPK进行初始化，如下所示：

```java
@Override
protected void attachBaseContext(Context base) {
    super.attachBaseContext(base);
    long start = System.currentTimeMillis();
    PluginManager.getInstance(base).init();
}
```

### getInstance\(\)

双重校验锁实现单例

```java
private static volatile PluginManager sInstance = null;
public static PluginManager getInstance(Context base) {
    if (sInstance == null) {
        synchronized (PluginManager.class) {
            if (sInstance == null) {
                //调用createInstance创建PluginManager
                sInstance = createInstance(base);
            }
        }
    }
    return sInstance;
}
```

### createInstance\(\)

```java
    private static PluginManager createInstance(Context context) {
        try {
        //获取清单文件种的meta数据
            Bundle metaData = context.getPackageManager()
                                     .getApplicationInfo(context.getPackageName(), PackageManager.GET_META_DATA)
                                     .metaData;
            
            if (metaData == null) {
                return new PluginManager(context);
            }
            
            String factoryClass = metaData.getString("VA_FACTORY");
            
            if (factoryClass == null) {
                return new PluginManager(context);
            }
            //调用清单文件中Factory创建PluginManager类
            PluginManager pluginManager = Reflector.on(factoryClass).method("create", Context.class).call(context);
            
            if (pluginManager != null) {
                Log.d(TAG, "Created a instance of " + pluginManager.getClass());
                return pluginManager;
            }
    
        } catch (Exception e) {
            Log.w(TAG, "Created the instance error!", e);
        }
        //清单文件中没有声明 直接调用构造函数
        return new PluginManager(context);
    }
```

### 构造函数

```java
protected PluginManager(Context context) {
    if (context instanceof Application) {
        this.mApplication = (Application) context;
        this.mContext = mApplication.getBaseContext();
    } else {
        final Context app = context.getApplicationContext();
        if (app == null) {
            this.mContext = context;
            this.mApplication = ActivityThread.currentApplication();
        } else {
            this.mApplication = (Application) app;
            this.mContext = mApplication.getBaseContext();
        }
    }
    //创建ComponentsHandler
    mComponentsHandler = createComponentsHandler();
    //hook当前线程
    hookCurrentProcess();
}
```

### hookCurrentProcess\(\)

```java
protected void hookCurrentProcess() {
    hookInstrumentationAndHandler();
    hookSystemServices();
    hookDataBindingUtil();
}
```

### hookInstrumentationAndHandler\(\)

```java
protected void hookInstrumentationAndHandler() {
    try {
        //获取ActivityThread
        ActivityThread activityThread = ActivityThread.currentActivityThread();
        //获取ActivityThread的 Instrumentation 对象
        Instrumentation baseInstrumentation = activityThread.getInstrumentation();
        //如果是在平行空间中运行，则退出
          if (baseInstrumentation.getClass().getName().contains("lbe")) {
              // reject executing in paralell space, for example, lbe.
              System.exit(0);
          }
          //创建代理对象
        final VAInstrumentation instrumentation = createInstrumentation(baseInstrumentation);
        
        Reflector.with(activityThread).field("mInstrumentation").set(instrumentation);
        Handler mainHandler = Reflector.with(activityThread).method("getHandler").call();
        Reflector.with(mainHandler).field("mCallback").set(instrumentation);
        this.mInstrumentation = instrumentation;
        Log.d(TAG, "hookInstrumentationAndHandler succeed : " + mInstrumentation);
    } catch (Exception e) {
        Log.w(TAG, e);
    }
}
```

```java
@Override
public Activity newActivity(ClassLoader cl, String className, Intent intent) throws InstantiationException, IllegalAccessException, ClassNotFoundException {
    try {
        cl.loadClass(className);
        Log.i(TAG, String.format("newActivity[%s]", className));
        
    } catch (ClassNotFoundException e) {
        //没有找到类，说明是插件中的类
        ComponentName component = PluginUtil.getComponent(intent);
        
        if (component == null) {
            return newActivity(mBase.newActivity(cl, className, intent));
        }

        String targetClassName = component.getClassName();
        Log.i(TAG, String.format("newActivity[%s : %s/%s]", className, component.getPackageName(), targetClassName));
        //获取插件
        LoadedPlugin plugin = this.mPluginManager.getLoadedPlugin(component);

        if (plugin == null) {
            // Not found then goto stub activity.
            boolean debuggable = false;
            try {
                Context context = this.mPluginManager.getHostContext();
                debuggable = (context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            } catch (Throwable ex) {
    
            }

            if (debuggable) {
                throw new ActivityNotFoundException("error intent: " + intent.toURI());
            }
            
            Log.i(TAG, "Not found. starting the stub activity: " + StubActivity.class);
            return newActivity(mBase.newActivity(cl, StubActivity.class.getName(), intent));
        }
        
        Activity activity = mBase.newActivity(plugin.getClassLoader(), targetClassName, intent);
        activity.setIntent(intent);

        // for 4.1+
        Reflector.QuietReflector.with(activity).field("mResources").set(plugin.getResources());

        return newActivity(activity);
    }

    return newActivity(mBase.newActivity(cl, className, intent));
}
```

```java
//从Intent中获取
public static ComponentName getComponent(Intent intent) {
    if (intent == null) {
        return null;
    }
    //Intent中isPlugin值为true说明是插件中的intent
    if (isIntentFromPlugin(intent)) {
    //插件的类名和包名通过Intent传递过来
    //奇怪，宿主工程并不知道插件里面的类名，如何传递Activity的类名
        return new ComponentName(intent.getStringExtra(Constants.KEY_TARGET_PACKAGE),
            intent.getStringExtra(Constants.KEY_TARGET_ACTIVITY));
    }
    
    return intent.getComponent();
}
```

### hookSystemServices

```java
protected void hookSystemServices() {
    try {
        Singleton<IActivityManager> defaultSingleton;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            defaultSingleton = Reflector.on(ActivityManager.class).field("IActivityManagerSingleton").get();
        } else {
            defaultSingleton = Reflector.on(ActivityManagerNative.class).field("gDefault").get();
        }
        IActivityManager origin = defaultSingleton.get();
        //创建IActivityManager的代理类
        IActivityManager activityManagerProxy = (IActivityManager) Proxy.newProxyInstance(mContext.getClassLoader(), new Class[] { IActivityManager.class },
            createActivityManagerProxy(origin));
        //将代理类设置给mInstance
        // Hook IActivityManager from ActivityManagerNative
        Reflector.with(defaultSingleton).field("mInstance").set(activityManagerProxy);

        if (defaultSingleton.get() == activityManagerProxy) {
            this.mActivityManager = activityManagerProxy;
            Log.d(TAG, "hookSystemServices succeed : " + mActivityManager);
        }
    } catch (Exception e) {
        Log.w(TAG, e);
    }
}
```

## VirtualAPK的的加载流程

VirtualAPK对于加载的APK文件没有额外的约束，只需要添加VirtualAPK的插件进行编译，如下所示：

```java
apply plugin: 'com.didi.virtualapk.plugin'

virtualApk {
    packageId = 0x6f // the package id of Resources.
    targetHost = '../../VirtualAPK/app' // the path of application module in host project.
    applyHostMapping = true //optional, default value: true.
}
```

然后就可以调用PluginManager直接加载编译完成的APK，被加载的APK在PluginManager里是一个LoadedPlugin对象，VirtualAPK通过这些LoadedPlugin对象来管理APK，这些APK也可以 想在手机里直接安装的App一样运行。

```java
PluginManager pluginManager = PluginManager.getInstance(base);
File apk = new File(Environment.getExternalStorageDirectory(), "Test.apk");
try {
    pluginManager.loadPlugin(apk);
    Log.i(TAG, "Loaded plugin from apk: " + apk);
} catch (Exception e) {
    e.printStackTrace();
}
```

APK的加载流程如下图所示：

![](../.gitbook/assets/image%20%2888%29.png)



```java
public void loadPlugin(File apk) throws Exception {
    if (null == apk) {
        throw new IllegalArgumentException("error : apk is null.");
    }

    if (!apk.exists()) {
        // throw the FileNotFoundException by opening a stream.
        InputStream in = new FileInputStream(apk);
        in.close();
    }
    //创建LoadedPlugin
    LoadedPlugin plugin = createLoadedPlugin(apk);
    
    if (null == plugin) {
        throw new RuntimeException("Can't load plugin which is invalid: " + apk.getAbsolutePath());
    }
    //包名为key 插件为value
    this.mPlugins.put(plugin.getPackageName(), plugin);
    //回调
    synchronized (mCallbacks) {
        for (int i = 0; i < mCallbacks.size(); i++) {
            mCallbacks.get(i).onAddedLoadedPlugin(plugin);
        }
    }
}
```

```java
//直接new一个LoadedPlugin对象
protected LoadedPlugin createLoadedPlugin(File apk) throws Exception {
    return new LoadedPlugin(this, this.mContext, apk);
}
```

这里调用了LoadedPlugin的create\(\)方法去构建一个LoadedPlugin对象，所以的初始化操作都是在LoadedPlugin的构造方法里完成的，如下所示：

```java
public LoadedPlugin(PluginManager pluginManager, Context context, File apk) throws Exception {
    this.mPluginManager = pluginManager;
    this.mHostContext = context;
    this.mLocation = apk.getAbsolutePath();
    //1.调用PackageParser解析APK，获取PackageParse.Package对象
    this.mPackage = PackageParserCompat.parsePackage(context, apk, PackageParser.PARSE_MUST_BE_APK);
    this.mPackage.applicationInfo.metaData = this.mPackage.mAppMetaData;
    //2.构建PackageInfo对象
    this.mPackageInfo = new PackageInfo();
    this.mPackageInfo.applicationInfo = this.mPackage.applicationInfo;
    this.mPackageInfo.applicationInfo.sourceDir = apk.getAbsolutePath();

    if (Build.VERSION.SDK_INT >= 28
        || (Build.VERSION.SDK_INT == 27 && Build.VERSION.PREVIEW_SDK_INT != 0)) { // Android P Preview
        try {
            this.mPackageInfo.signatures = this.mPackage.mSigningDetails.signatures;
        } catch (Throwable e) {
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), PackageManager.GET_SIGNATURES);
            this.mPackageInfo.signatures = info.signatures;
        }
    } else {
        this.mPackageInfo.signatures = this.mPackage.mSignatures;
    }
    
    this.mPackageInfo.packageName = this.mPackage.packageName;
    if (pluginManager.getLoadedPlugin(mPackageInfo.packageName) != null) {
        throw new RuntimeException("plugin has already been loaded : " + mPackageInfo.packageName);
    }
    this.mPackageInfo.versionCode = this.mPackage.mVersionCode;
    this.mPackageInfo.versionName = this.mPackage.mVersionName;
    this.mPackageInfo.permissions = new PermissionInfo[0];
    //3.构建PluginPackageManager对象
    this.mPackageManager = createPluginPackageManager();
    this.mPluginContext = createPluginContext(null);
    this.mNativeLibDir = getDir(context, Constants.NATIVE_DIR);
    this.mPackage.applicationInfo.nativeLibraryDir = this.mNativeLibDir.getAbsolutePath();
    //4.构建Resources对象
    this.mResources = createResources(context, getPackageName(), apk);
    //5.构建ClassLoader对象
    this.mClassLoader = createClassLoader(context, apk, this.mNativeLibDir, context.getClassLoader());
    //6.拷贝so库
    tryToCopyNativeLib(apk);

    // Cache instrumentations
    //7.缓存Instrumentation对象
    Map<ComponentName, InstrumentationInfo> instrumentations = new HashMap<ComponentName, InstrumentationInfo>();
    for (PackageParser.Instrumentation instrumentation : this.mPackage.instrumentation) {
        instrumentations.put(instrumentation.getComponentName(), instrumentation.info);
    }
    this.mInstrumentationInfos = Collections.unmodifiableMap(instrumentations);
    this.mPackageInfo.instrumentation = instrumentations.values().toArray(new InstrumentationInfo[instrumentations.size()]);

    // Cache activities
    //8.缓存APK里的Activity信息
    Map<ComponentName, ActivityInfo> activityInfos = new HashMap<ComponentName, ActivityInfo>();
    for (PackageParser.Activity activity : this.mPackage.activities) {
        activity.info.metaData = activity.metaData;
        activityInfos.put(activity.getComponentName(), activity.info);
    }
    this.mActivityInfos = Collections.unmodifiableMap(activityInfos);
    this.mPackageInfo.activities = activityInfos.values().toArray(new ActivityInfo[activityInfos.size()]);

    // Cache services
    //9.缓存APK里的Service信息
    Map<ComponentName, ServiceInfo> serviceInfos = new HashMap<ComponentName, ServiceInfo>();
    for (PackageParser.Service service : this.mPackage.services) {
        serviceInfos.put(service.getComponentName(), service.info);
    }
    this.mServiceInfos = Collections.unmodifiableMap(serviceInfos);
    this.mPackageInfo.services = serviceInfos.values().toArray(new ServiceInfo[serviceInfos.size()]);

    // Cache providers
    //10.缓存APK里的Content Provider信息
    Map<String, ProviderInfo> providers = new HashMap<String, ProviderInfo>();
    Map<ComponentName, ProviderInfo> providerInfos = new HashMap<ComponentName, ProviderInfo>();
    for (PackageParser.Provider provider : this.mPackage.providers) {
        providers.put(provider.info.authority, provider.info);
        providerInfos.put(provider.getComponentName(), provider.info);
    }
    this.mProviders = Collections.unmodifiableMap(providers);
    this.mProviderInfos = Collections.unmodifiableMap(providerInfos);
    this.mPackageInfo.providers = providerInfos.values().toArray(new ProviderInfo[providerInfos.size()]);

    // Register broadcast receivers dynamically
    //11.静态的广播转换为动态的
    Map<ComponentName, ActivityInfo> receivers = new HashMap<ComponentName, ActivityInfo>();
    for (PackageParser.Activity receiver : this.mPackage.receivers) {
        receivers.put(receiver.getComponentName(), receiver.info);

        BroadcastReceiver br = BroadcastReceiver.class.cast(getClassLoader().loadClass(receiver.getComponentName().getClassName()).newInstance());
        for (PackageParser.ActivityIntentInfo aii : receiver.intents) {
            this.mHostContext.registerReceiver(br, aii);
        }
    }
    this.mReceiverInfos = Collections.unmodifiableMap(receivers);
    this.mPackageInfo.receivers = receivers.values().toArray(new ActivityInfo[receivers.size()]);

    // try to invoke plugin's application
    invokeApplication();
}
```

整个LoadedPlugin对象构建的过程就是去解析APK里的组件信息，并缓存起来，具体说来：

1. 调用PackageParser解析APK，获取PackageParser.Package对象。
2. 构建PackageInfo对象。
3. 构建PluginPackageManager对象。
4. 构建Resouces对象。
5. 构建ClassLoader对象。
6. 拷贝so库。
7. 缓存Instrumentation对象。
8. 缓存APK里的Activity信息。
9. 缓存APK里的Service信息。
10. 缓存APK里的Content Provider信息。
11. 将静态的广播转为动态的。

我们接着来看没有在宿主App的Manifest里注册的四大组件时如何被启动起来的。  


## VirtualAPK启动组件的流程

### Activity

前面我们说过在初始化VirtualAPK的过程中使用自定义的VAInstrumentation在ActivityThread中替换掉了原生的Instrumentation对象，来达到hook到Activity启动流程的目的，绕开Instrumentation 启动Activity的校验流程。

那么VirtualAPK是如何绕过系统校验的呢？

  
Virtual是采用占坑的方式来绕过校验的，它在库里的Manifest文件里定义了占坑的文件，如下所示：

```java
    <application>
        <activity android:exported="false" android:name="com.didi.virtualapk.delegate.StubActivity" android:launchMode="standard"/>
        <!-- Stub Activities -->
        <activity android:exported="false" android:name=".A$1" android:launchMode="standard"/>
        <activity android:exported="false" android:name=".A$2" android:launchMode="standard"
            android:theme="@android:style/Theme.Translucent" />

        <!-- Stub Activities -->
        <activity android:exported="false" android:name=".B$1" android:launchMode="singleTop"/>
        <activity android:exported="false" android:name=".B$2" android:launchMode="singleTop"/>
        <activity android:exported="false" android:name=".B$3" android:launchMode="singleTop"/>
        <activity android:exported="false" android:name=".B$4" android:launchMode="singleTop"/>
        <activity android:exported="false" android:name=".B$5" android:launchMode="singleTop"/>
        <activity android:exported="false" android:name=".B$6" android:launchMode="singleTop"/>
        <activity android:exported="false" android:name=".B$7" android:launchMode="singleTop"/>
        <activity android:exported="false" android:name=".B$8" android:launchMode="singleTop"/>

        <!-- Stub Activities -->
        <activity android:exported="false" android:name=".C$1" android:launchMode="singleTask"/>
        <activity android:exported="false" android:name=".C$2" android:launchMode="singleTask"/>
        <activity android:exported="false" android:name=".C$3" android:launchMode="singleTask"/>
        <activity android:exported="false" android:name=".C$4" android:launchMode="singleTask"/>
        <activity android:exported="false" android:name=".C$5" android:launchMode="singleTask"/>
        <activity android:exported="false" android:name=".C$6" android:launchMode="singleTask"/>
        <activity android:exported="false" android:name=".C$7" android:launchMode="singleTask"/>
        <activity android:exported="false" android:name=".C$8" android:launchMode="singleTask"/>

        <!-- Stub Activities -->
        <activity android:exported="false" android:name=".D$1" android:launchMode="singleInstance"/>
        <activity android:exported="false" android:name=".D$2" android:launchMode="singleInstance"/>
        <activity android:exported="false" android:name=".D$3" android:launchMode="singleInstance"/>
        <activity android:exported="false" android:name=".D$4" android:launchMode="singleInstance"/>
        <activity android:exported="false" android:name=".D$5" android:launchMode="singleInstance"/>
        <activity android:exported="false" android:name=".D$6" android:launchMode="singleInstance"/>
        <activity android:exported="false" android:name=".D$7" android:launchMode="singleInstance"/>
        <activity android:exported="false" android:name=".D$8" android:launchMode="singleInstance"/>

        <!-- Local Service running in main process -->
        <service android:exported="false" android:name="com.didi.virtualapk.delegate.LocalService" />

        <!-- Daemon Service running in child process -->
        <service android:exported="false" android:name="com.didi.virtualapk.delegate.RemoteService" android:process=":daemon">
            <intent-filter>
                <action android:name="${applicationId}.intent.ACTION_DAEMON_SERVICE" />
            </intent-filter>
        </service>

        <provider
            android:exported="false"
            android:name="com.didi.virtualapk.delegate.RemoteContentProvider"
            android:authorities="${applicationId}.VirtualAPK.Provider"
            android:process=":daemon" />

    </application>
```

A、B、C、D分别代表standard、singleTop、singleTask和singleInstance四种启动模式。

VirtualAPK制造一些假的Activity替身在Manifest文件提前进行注册占坑，在启动真正的Activity时候，再将Activity填到坑里，以完成启动Activity。我们来看看具体的是实现流程：

1. execStartActivity\(\)
2. realExecStartActivity\(\)
3. newActivity\(\)
4. callActivityOnCreate\(\)

以上四个方法都是启动Activity的过程中必经的四个方法。

```java
protected void injectIntent(Intent intent) {
    //将隐式Intent转换为显式Intent
    mPluginManager.getComponentsHandler().transformIntentToExplicitAsNeeded(intent);
    // null component is an implicitly intent
    if (intent.getComponent() != null) {
        // resolve intent with Stub Activity if needed
        this.mPluginManager.getComponentsHandler().markIntentIfNeeded(intent);
    }
}
```

```java
public Intent transformIntentToExplicitAsNeeded(Intent intent) {
    ComponentName component = intent.getComponent();
    if (component == null
        || component.getPackageName().equals(mContext.getPackageName())) {
        ResolveInfo info = mPluginManager.resolveActivity(intent);
        if (info != null && info.activityInfo != null) {
            component = new ComponentName(info.activityInfo.packageName, info.activityInfo.name);
            intent.setComponent(component);
        }
    }

    return intent;
}
```

```java
public void markIntentIfNeeded(Intent intent) {
    if (intent.getComponent() == null) {
        return;
    }

    String targetPackageName = intent.getComponent().getPackageName();
    String targetClassName = intent.getComponent().getClassName();
    // search map and return specific launchmode stub activity
    if (!targetPackageName.equals(mContext.getPackageName()) && mPluginManager.getLoadedPlugin(targetPackageName) != null) {
        intent.putExtra(Constants.KEY_IS_PLUGIN, true);
        intent.putExtra(Constants.KEY_TARGET_PACKAGE, targetPackageName);
        intent.putExtra(Constants.KEY_TARGET_ACTIVITY, targetClassName);
        dispatchStubActivity(intent);
    }
}
```

1. 将隐式Intent转换为显式Intent，Virtual是通过intent.setClassName\(this, "com.guoxiaoxing.plugin.MainActivity"\);这种 //方式来启动Activity的，这里将包名封装成真正的ComponentName对象。



## 参考

* [https://juejin.im/post/6844903561931784200](https://juejin.im/post/6844903561931784200)



