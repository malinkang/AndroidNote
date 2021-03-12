---
description: >-
  主要基于8.0分析：https://cs.android.com/android/platform/superproject/+/android-8.1.0_r9
---

# ActivityManagerService分析

## 7.0 AMS分析 

```java
//frameworks/base/core/java/android/app/Instrumentation.java
public ActivityResult execStartActivity(
    Context who, IBinder contextThread, IBinder token, String target,
    Intent intent, int requestCode, Bundle options) {
    //...
    try {
        intent.migrateExtraStreamToClipData();
        intent.prepareToLeaveProcess(who);
        //AMN获取AMS的代理类AMP(ActivityManagerProxy)
        int result = ActivityManagerNative.getDefault()
            .startActivity(whoThread, who.getBasePackageName(), intent,
                    intent.resolveTypeIfNeeded(who.getContentResolver()),
                    token, target, requestCode, 0, null, options);
        checkStartActivityResult(result, intent);
    } catch (RemoteException e) {
        throw new RuntimeException("Failure from system", e);
    }
    return null;
}
```

```java
//7.0是手动实现Binder通信的。8.0通过AIDL实现的
public interface IActivityManager extends IInterface {
}
```

```java
//frameworks/base/core/java/android/app/ActivityManagerNative.java
static public IActivityManager getDefault() {
    return gDefault.get();
}
private static final Singleton<IActivityManager> gDefault = new Singleton<IActivityManager>() {
    protected IActivityManager create() {
        //获取ActivityManagerService
        IBinder b = ServiceManager.getService("activity");
        if (false) {
            Log.v("ActivityManager", "default service binder = " + b);
        }
        IActivityManager am = asInterface(b); //获取AMP
        if (false) {
            Log.v("ActivityManager", "default service = " + am);
        }
        return am;
    }
};
```

```java
//frameworks/base/core/java/android/app/ActivityManagerNative.java
static public IActivityManager asInterface(IBinder obj) {
    if (obj == null) {
        return null;
    }
    IActivityManager in =
        (IActivityManager)obj.queryLocalInterface(descriptor);
    if (in != null) {
        return in;
    }
    //创建代理类
    return new ActivityManagerProxy(obj);
}
```

```java
class ActivityManagerProxy implements IActivityManager
{    //构造函数 mRemote就是AMS
    public ActivityManagerProxy(IBinder remote)
    {
        mRemote = remote; 
    }
}
```

```java
public int startActivity(IApplicationThread caller, String callingPackage, Intent intent,
        String resolvedType, IBinder resultTo, String resultWho, int requestCode,
        int startFlags, ProfilerInfo profilerInfo, Bundle options) throws RemoteException {
    Parcel data = Parcel.obtain();
    Parcel reply = Parcel.obtain();
    data.writeInterfaceToken(IActivityManager.descriptor);
    data.writeStrongBinder(caller != null ? caller.asBinder() : null);
    data.writeString(callingPackage);
    intent.writeToParcel(data, 0);
    data.writeString(resolvedType);
    data.writeStrongBinder(resultTo);
    data.writeString(resultWho);
    data.writeInt(requestCode);
    data.writeInt(startFlags);
    if (profilerInfo != null) {
        data.writeInt(1);
        profilerInfo.writeToParcel(data, Parcelable.PARCELABLE_WRITE_RETURN_VALUE);
    } else {
        data.writeInt(0);
    }
    if (options != null) {
        data.writeInt(1);
        options.writeToParcel(data, 0);
    } else {
        data.writeInt(0);
    }
    //调用AMS的transact方法
    //ActivityManagerService继承AMN 所以会调用AMN的on-only 
    mRemote.transact(START_ACTIVITY_TRANSACTION, data, reply, 0);
    reply.readException();
    int result = reply.readInt();
    reply.recycle();
    data.recycle();
    return result;
}
```

```java
//frameworks/base/services/core/java/com/android/server/am/ActivityManagerService.java
public final class ActivityManagerService extends ActivityManagerNative
        implements Watchdog.Monitor, BatteryStatsImpl.BatteryCallback {
    @Override
    public final int startActivity(IApplicationThread caller, String callingPackage,
            Intent intent, String resolvedType, IBinder resultTo, String resultWho, int requestCode,
            int startFlags, ProfilerInfo profilerInfo, Bundle bOptions) {
        return startActivityAsUser(caller, callingPackage, intent, resolvedType, resultTo,
                resultWho, requestCode, startFlags, profilerInfo, bOptions,
                UserHandle.getCallingUserId());
    }
    @Override
    public final int startActivityAsUser(IApplicationThread caller, String callingPackage,
            Intent intent, String resolvedType, IBinder resultTo, String resultWho, int requestCode,
            int startFlags, ProfilerInfo profilerInfo, Bundle bOptions, int userId) {
        enforceNotIsolatedCaller("startActivity");
        userId = mUserController.handleIncomingUser(Binder.getCallingPid(), Binder.getCallingUid(),
                userId, false, ALLOW_FULL_ONLY, "startActivity", null);
        // TODO: Switch to user app stacks here.
        //调用ActivityStarter的startActivityMayWait方法
        return mActivityStarter.startActivityMayWait(caller, -1, callingPackage, intent,
                resolvedType, null, null, resultTo, resultWho, requestCode, startFlags,
                profilerInfo, null, null, bOptions, false, userId, null, null);
    }
}
```

```java
//frameworks/base/core/java/android/app/ActivityManagerNative.java
@Override
public boolean onTransact(int code, Parcel data, Parcel reply, int flags)
        throws RemoteException {
    switch (code) {
    case START_ACTIVITY_TRANSACTION:
    {
        data.enforceInterface(IActivityManager.descriptor);
        IBinder b = data.readStrongBinder();
        IApplicationThread app = ApplicationThreadNative.asInterface(b);
        String callingPackage = data.readString();
        Intent intent = Intent.CREATOR.createFromParcel(data);
        String resolvedType = data.readString();
        IBinder resultTo = data.readStrongBinder();
        String resultWho = data.readString();
        int requestCode = data.readInt();
        int startFlags = data.readInt();
        ProfilerInfo profilerInfo = data.readInt() != 0
                ? ProfilerInfo.CREATOR.createFromParcel(data) : null;
        Bundle options = data.readInt() != 0
                ? Bundle.CREATOR.createFromParcel(data) : null;
        //调用startActivity方法
        int result = startActivity(app, callingPackage, intent, resolvedType,
                resultTo, resultWho, requestCode, startFlags, profilerInfo, options);
        reply.writeNoException();
        reply.writeInt(result);
        return true;
    }
}
```

![](../.gitbook/assets/image%20%2879%29%20%282%29.png)

![](../.gitbook/assets/image%20%2876%29.png)

## 8.0 AMS分析

```java
public ActivityResult execStartActivity(
        Context who, IBinder contextThread, IBinder token, Activity target,
        Intent intent, int requestCode, Bundle options) {
        //...
        try {
            intent.migrateExtraStreamToClipData();
            intent.prepareToLeaveProcess(who);
            //调用ActivityManager getService方法
            int result = ActivityManager.getService()
                .startActivity(whoThread, who.getBasePackageName(), intent,
                        intent.resolveTypeIfNeeded(who.getContentResolver()),
                        token, target != null ? target.mEmbeddedID : null,
                        requestCode, 0, null, options);
            checkStartActivityResult(result, intent);
        } catch (RemoteException e) {
            throw new RuntimeException("Failure from system", e);
        }
        return null;
}
```

```java
//frameworks/base/core/java/android/app/ActivityManager.java
public static IActivityManager getService() {
        return IActivityManagerSingleton.get();
}
private static final Singleton<IActivityManager> IActivityManagerSingleton =
        new Singleton<IActivityManager>() {
        @Override
        protected IActivityManager create() {
                final IBinder b = ServiceManager.getService(Context.ACTIVITY_SERVICE);
                final IActivityManager am = IActivityManager.Stub.asInterface(b);
                return am;
        }
};

```

![](../.gitbook/assets/image%20%2886%29.png)

## AMS的启动过程

```java
//frameworks/base/services/java/com/android/server/SystemServer.java
public static void main(String[] args) {
        new SystemServer().run();
}
```

```java
  private void run() {
        try {
                //创建消息Looper
            Looper.prepareMainLooper();
            //加载动态库libandroid_servers.so
            // Initialize native services.so
            System.loadLibrary("android_servers");
            //创建系统Context
            createSystemContext();

            // Create the system service manager.
            //创建SystemServiceManager
            mSystemServiceManager = new SystemServiceManager(mSystemContext);
            mSystemServiceManager.setRuntimeRestarted(mRuntimeRestart);
            LocalServices.addService(SystemServiceManager.class, mSystemServiceManager);
            // Prepare the thread pool for init tasks that can be parallelized
            SystemServerInitThreadPool.get();
        } finally {
            traceEnd();  // InitBeforeStartServices
        }

        // Start services.
        try {
        //官方把系统服务分为了3种类型，
        //分别是引导服务、核心服务和其他服务，
        //其中其他服务是一些非紧要和不需要立即启动的服务。
            traceBeginAndSlog("StartServices");
            //启动引导服务
            startBootstrapServices();
            //启动核心服务
            startCoreServices();
            //启动其他服务
            startOtherServices();
            SystemServerInitThreadPool.shutdown();
        } catch (Throwable ex) {
            Slog.e("System", "******************************************");
            Slog.e("System", "************ Failure starting system services", ex);
            throw ex;
        } finally {
            traceEnd();
        }
        //...
    }
```

```java
   private void startBootstrapServices() {

        //...
        // Activity manager runs the show.
        //创建AMS
        mActivityManagerService = mSystemServiceManager.startService(
                ActivityManagerService.Lifecycle.class).getService();
        mActivityManagerService.setSystemServiceManager(mSystemServiceManager);
        //...
    }
```

```java
    //frameworks/base/services/core/java/com/android/server/SystemServiceManager.java
    public <T extends SystemService> T startService(Class<T> serviceClass) {
        try {
            final String name = serviceClass.getName();
            Slog.i(TAG, "Starting " + name);
            Trace.traceBegin(Trace.TRACE_TAG_SYSTEM_SERVER, "StartService " + name);

            // Create the service.
            if (!SystemService.class.isAssignableFrom(serviceClass)) {
                throw new RuntimeException("Failed to create " + name
                        + ": service must extend " + SystemService.class.getName());
            }
            final T service;
            try {
                Constructor<T> constructor = serviceClass.getConstructor(Context.class);
                service = constructor.newInstance(mContext);
            } catch (InstantiationException ex) {
                throw new RuntimeException("Failed to create service " + name
                        + ": service could not be instantiated", ex);
            } catch (IllegalAccessException ex) {
                throw new RuntimeException("Failed to create service " + name
                        + ": service must have a public constructor with a Context argument", ex);
            } catch (NoSuchMethodException ex) {
                throw new RuntimeException("Failed to create service " + name
                        + ": service must have a public constructor with a Context argument", ex);
            } catch (InvocationTargetException ex) {
                throw new RuntimeException("Failed to create service " + name
                        + ": service constructor threw an exception", ex);
            }

            startService(service);
            return service;
        } finally {
            Trace.traceEnd(Trace.TRACE_TAG_SYSTEM_SERVER);
        }
    }
```

```java
   public void startService(@NonNull final SystemService service) {
        // Register it.
        mServices.add(service); //添加到集合中
        // Start it.
        long time = SystemClock.elapsedRealtime();
        try {
            //调用onStart方法
            service.onStart();
        } catch (RuntimeException ex) {
            throw new RuntimeException("Failed to start service " + service.getClass().getName()
                    + ": onStart threw an exception", ex);
        }
        warnIfTooLong(SystemClock.elapsedRealtime() - time, service, "onStart");
    }
```

```java
private final ArrayList<SystemService> mServices = new ArrayList<SystemService>();
```

传入的SystemService类型的service对象的值为ActivityManagerService.Lifecycle.class。在注释1处将service对象添加到ArrayList类型的mServices中来完成注册。在注释2处调用service的onStart方法来启动service对象，这个service对象具体指的是什么呢？我们接着往下看，Lifecycle是AMS的内部类，代码如下所示：



```java
    //frameworks/base/services/core/java/com/android/server/am/ActivityManagerService.java
    public static final class Lifecycle extends SystemService {
        private final ActivityManagerService mService;
        private static ActivityTaskManagerService sAtm;
        //创建AMS实例
        public Lifecycle(Context context) {
            super(context);
            mService = new ActivityManagerService(context, sAtm);
        }

        public static ActivityManagerService startService(
                SystemServiceManager ssm, ActivityTaskManagerService atm) {
            sAtm = atm;
            return ssm.startService(ActivityManagerService.Lifecycle.class).getService();
        }
        //调用onStare
        @Override
        public void onStart() {
            mService.start();
        }
        
        public ActivityManagerService getService() {
            return mService;
        }
    }
```

注册过程很简单，通过反射创建SystemService的子类，然后添加到ArrayList中。

## AMS与应用程序进程

Zygote的Java框架层中，会创建一个Server端的Socket，这个Socket用来等待AMS请求Zygote来创建新的应用程序进程。要启动一个应用程序，首先要保证这个应用程序所需要的应用程序进程已经存在。在启动应用程序时AMS会检查这个应用程序需要的应用程序进程是否存在，不存在就会请求Zygote进程创建需要的应用程序进程。这里以Service的启动过程为例，来分析AMS与应用程序进程的关系。Service在启动过程中会调用ActiveServices的bringUpServiceLocked方法，如下所示：

```java

    private String bringUpServiceLocked(ServiceRecord r, int intentFlags, boolean execInFg,
            boolean whileRestarting, boolean permissionsReviewRequired)
            throws TransactionTooLargeException {
            //获取Service想要在哪个进程运行
        //得到ServiceRecord的processName的值并赋予给procName
        //processName用来描述Service想要在哪个进程运行，默认是当前进程
        //我们也可以在AndroidManifest文件中设置android:process属性来新开启一个进程
        final String procName = r.processName;
        String hostingType = "service";
        ProcessRecord app;

        if (!isolated) {
            //将procName和Service的uid传入到AMS的getProcessRecordLocked方法中
            //来查询是否存在一个与Service对应的ProcessRecord类型的对象app
            app = mAm.getProcessRecordLocked(procName, r.appInfo.uid, false);
            if (DEBUG_MU) Slog.v(TAG_MU, "bringUpServiceLocked: appInfo.uid=" + r.appInfo.uid
                        + " app=" + app);
            //如果运行Service的应用程序进程存在
            if (app != null && app.thread != null) {
                try {
                    app.addPackage(r.appInfo.packageName, r.appInfo.versionCode, mAm.mProcessStats);
                    //启动Service
                    realStartServiceLocked(r, app, execInFg);
                    return null;
                } catch (TransactionTooLargeException e) {
                    throw e;
                } catch (RemoteException e) {
                    Slog.w(TAG, "Exception when starting service " + r.shortName, e);
                }

                // If a dead object exception was thrown -- fall through to
                // restart the application.
            }
        } else {
            // If this service runs in an isolated process, then each time
            // we call startProcessLocked() we will get a new isolated
            // process, starting another process if we are currently waiting
            // for a previous process to come up.  To deal with this, we store
            // in the service any current isolated process it is running in or
            // waiting to have come up.
            app = r.isolatedProc;
            if (WebViewZygote.isMultiprocessEnabled()
                    && r.serviceInfo.packageName.equals(WebViewZygote.getPackageName())) {
                hostingType = "webview_service";
            }
        }

        // Not running -- get it started, and enqueue this service record
        // to be executed when the app comes up.
        //如果用来运行Service的应用进程不存在
        if (app == null && !permissionsReviewRequired) {
            //调用AMS的startProcessLocked方法来创建对应的应用程序进程
            if ((app=mAm.startProcessLocked(procName, r.appInfo, true, intentFlags,
                    hostingType, r.name, false, isolated, false)) == null) {
                String msg = "Unable to launch app "
                        + r.appInfo.packageName + "/"
                        + r.appInfo.uid + " for service "
                        + r.intent.getIntent() + ": process is bad";
                Slog.w(TAG, msg);
                bringDownServiceLocked(r);
                return msg;
            }
            if (isolated) {
                r.isolatedProc = app;
            }
        }

        if (r.fgRequired) {
            if (DEBUG_FOREGROUND_SERVICE) {
                Slog.v(TAG, "Whitelisting " + UserHandle.formatUid(r.appInfo.uid)
                        + " for fg-service launch");
            }
            mAm.tempWhitelistUidLocked(r.appInfo.uid,
                    SERVICE_START_FOREGROUND_TIMEOUT, "fg-service-launch");
        }

        if (!mPendingServices.contains(r)) {
            mPendingServices.add(r);
        }

        if (r.delayedStop) {
            // Oh and hey we've already been asked to stop!
            r.delayedStop = false;
            if (r.startRequested) {
                if (DEBUG_DELAYED_STARTS) Slog.v(TAG_SERVICE,
                        "Applying delayed stop (in bring up): " + r);
                stopServiceLocked(r);
            }
        }

        return null;
    }
```

AMS与应用程序进程的关系主要有以下两点：

* 启动应用程序时AMS会检查这个应用程序需要的应用程序进程是否存在。
* 如果需要的应用程序进程不存在，AMS就会请求Zygote进程创建需要的应用程序进程。

## AMS重要的数据结构

### 解析ActivityRecord

ActivityRecord在本书的前几章经常会见到，它内部记录了Activity的所有信息，因此它用来描述一个Activity，它是在启动Activity 时被创建的，具体是在ActivityStarter 的startActivity方法中被创建的。ActivityRecord的部分重要成员变量如表所示。

![](../.gitbook/assets/image%20%2880%29.png)

可以看出ActivityRecord的作用，其内部存储了Activity的所有信息，包括AMS的引用、AndroidManifes节点信息、Activity状态、Activity资源信息和Activity进程相关信息等，需要注意的是其中含有该ActivityRecord所在的TaskRecord，这就将ActivityRecord和TaskRecord关联在一起，它们是Activity任务栈模型的重要成员，我们接着来查看TaskRecord。

### 解析TaskRecord

TaskRecord 用来描述一个Activity任务栈，其内部也有很多的成员变量，这里挑出一些重要的成员变量进行介绍，如表所示。

![](../.gitbook/assets/image%20%2877%29.png)

发现TaskRecord的作用，其内部存储了任务栈的所有信息，包括任务栈的唯一标识符、任务栈的倾向性、任务栈中的Activity记录和AMS的引用等，需要注意的是其中含有ActivityStack，也就是当前Activity任务栈所归属的ActivityStack，我们接着来查看ActivityStack。

### 解析ActivityStack

ActivityStack是一个管理类，用来管理系统所有Activity，其内部维护了Activity的所有状态、特殊状态的Activity以及和Activity 相关的列表等数据。ActivityStack是由ActivityStackSupervisor来进行管理的，而ActivityStackSupervisor在AMS的构造方法中被创建，如下所示：

```java
//frameworks/base/services/core/java/com/android/server/am/ActivityManagerService.java
public ActivityManagerService(Context systemContext){
    mStackSupervisor = createStackSupervisor();
}
//创建ActivityStackSupervisor
protected ActivityStackSupervisor createStackSupervisor() {
        return new ActivityStackSupervisor(this, mHandler.getLooper());
}
```

#### 1．ActivityStack的实例类型

在ActivityStackSupervisor中有多种ActivityStack实例，如下所示：

```java
//frameworks/base/services/core/java/com/android/server/am/ActivityStackSupervisor.java
public class ActivityStackSupervisor extends ConfigurationContainer implements DisplayListener {
    /** The stack containing the launcher app. Assumed to always be attached to
     * Display.DEFAULT_DISPLAY. */
    ActivityStack mHomeStack;

    /** The stack currently receiving input or launching the next activity. */
    ActivityStack mFocusedStack;
    /** If this is the same as mFocusedStack then the activity on the top of the focused stack has
     * been resumed. If stacks are changing position this will hold the old stack until the new
     * stack becomes resumed after which it will be set to mFocusedStack. */
    private ActivityStack mLastFocusedStack;
}
```

mHomeStack用来存储Launcher App的所有Activity，mFocusedStack表示当前正在接收输入或启动下一个Activity的所有Activity。mLastFocusedStack表示此前接收输入的所有Activity。通过ActivityStackSupervisor提供了获取上述ActivityStack 的方法，比如要获取mFocusedStack，只需要调用ActivityStackSupervisor的getFocusedStack方法就可以了：

```java
   ActivityStack getFocusedStack() {
        return mFocusedStack;
    }
```

#### 2. ActivityState

在ActivityStack中通过枚举存储了Activity的所有的状态，如下所示：

```java
   //frameworks/base/services/core/java/com/android/server/am/ActivityStack.java
   enum ActivityState {
        INITIALIZING,
        RESUMED,
        PAUSING,
        PAUSED,
        STOPPING,
        STOPPED,
        FINISHING,
        DESTROYING,
        DESTROYED
    }
```

通过名称我们可以很轻易知道这些状态所代表的意义。应用ActivityState 的场景会有很多，比如下面的代码：

```java
   @Override
    public void overridePendingTransition(IBinder token, String packageName,
            int enterAnim, int exitAnim) {
        synchronized(this) {
            ActivityRecord self = ActivityRecord.isInStackLocked(token);
            if (self == null) {
                return;
            }

            final long origId = Binder.clearCallingIdentity();

            if (self.state == ActivityState.RESUMED
                    || self.state == ActivityState.PAUSING) {
                mWindowManager.overridePendingAppTransition(packageName,
                        enterAnim, exitAnim, null);
            }

            Binder.restoreCallingIdentity(origId);
        }
    }

```

overridePendingTransition 方法用于设置Activity的切换动画，在注释1处可以看到只有ActivityState 为RESUMED状态或者PAUSING状态时才会调用WMS类型的mWindowManager对象的overridePendingAppTransition方法来切换动画。

#### 3.特殊状态的Activity

在ActivityStack中定义了一些特殊状态的Activity，如下所示：

```java
//正在暂停的Activity
ActivityRecord mPausingActivity = null;
//上一个已经暂停的Activity
ActivityRecord mLastPausedActivity = null;
//最近一次没有历史记录的Activity
ActivityRecord mLastNoHistoryActivity = null;
//已经Resume的Activity
ActivityRecord mResumedActivity = null;
//传递给convertToTranslucent方法的最上层的Activity
ActivityRecord mTranslucentActivityWaiting = null;
```

这些特殊的状态都是ActivityRecord类型的，ActivityRecord用来记录一个Activity的所有信息。

#### 4.维护的ArrayList

在ActivityStack 中维护了很多ArrayList，这些ArrayList中的元素类型主要有ActivityRecord和TaskRecord，如表所示。

![](../.gitbook/assets/image%20%2875%29.png)

ActivityStack维护了元素类型为TaskRecord的列表，这样ActivityStack和TaskRecord就有了关联，Activity 任务栈存储在ActivityStack 中。

## Activity栈管理

我们平时做应用开发都知道Activty是放入在Activity任务栈中的，有了任务栈，系统和开发者就能够更好地应用和管理Activity，来完成各种业务逻辑。

### Activity任务栈模型

Activity任务栈并不是凭空想象出来的，它是由多种数据结构共同组合而成的，ActivityRecord、TaskRecord和ActivityStack，它们就是Activity任务栈模型的重要组成部分，如图所示。

![](../.gitbook/assets/image%20%2874%29.png)

ActivityRecord 用来记录一个Activity 的所有信息，TaskRecord 中包含了一个或多个ActivityRecord，TaskRecord用来表示Activity的任务栈，用来管理栈中的ActivityRecord，ActivityStack又包含了一个或多个TaskRecord，它是TaskRecord的管理者。Activity栈管理就是建立在、Activity 任务栈模型之上的，有了栈管理，我们可以对应用程序进行操作，应用可以复用自身应用中以及其他应用的Activity，节省了资源。比如我们使用一款社交应用，这个应用的联系人详情界面提供了联系人的邮箱，当我们点击邮箱时会跳到发送邮件的界面，如图所示。



![](../.gitbook/assets/image%20%2878%29.png)

社交应用和系统E-mail中的Activity是处于不同应用程序进程的，而有了栈管理，就可以把发送邮件界面放到社交应用中详情界面所在栈的栈顶，来做到跨进程操作。为了更灵活地进行栈管理，Android系统提供了很多配置，包括LaunchMode、Intent的FLAG和taskAffinity等，下面分别对它们进行介绍。

### Launch Mode

Launch Mode大家都不陌生，用于设定Activity的启动方式，无论是哪种启动方式，所启动的Activity都会位于Activity栈的栈顶，主要有以下4种Launch Mode。

* standerd：默认模式，每次启动Activity都会创建一个新的Activity实例。
* singleTop：如果要启动的Activity 已经在栈顶，则不会重新创建Activity，同时该Activity的onNewIntent方法会被调用。如果要启动的Activity不在栈顶，则会重新创建该Activity的实例。
*  singleTask：如果要启动的Activity已经存在于它想要归属的栈中，那么不会创建该Activity实例，将栈中位于该Activity上的所有的Activity出栈，同时该Activity的onNewIntent方法会被调用。如果要启动的Activity不存在于它想要归属的栈中，并且该栈存在，则会重新创建该Activity 的实例。如果要启动的Activity 想要归属的栈不存在，则首先要创建一个新栈，然后创建该Activity实例并压入到新栈中。
* singleInstance：和singleTask基本类似，不同的是启动Activity时，首先要创建一个新栈，然后创建该Activity实例并压入新栈中，新栈中只会存在这一个Activity实例。

### Intent的FLAG

在Intent中定义了很多FLAG，其中有几个FLAG也可以设定Activity的启动方式，如果Launch Mode和FLAG设定的Activity的启动方式有冲突，则以FLAG设定的为准。

* FLAG\_ACTIVITY\_SINGLE\_TOP：和Launch Mode中的singleTop效果是一样的。
* FLAG\_ACTIVITY\_NEW\_TASK：和Launch Mode中的singleTask效果是一样的
* FLAG\_ACTIVITY\_CLEAR\_TOP：在Launch Mode中没有与此对应的模式，如果要启动的Activity已经存在于栈中，则将所有位于它上面的Activity出栈。singleTask默认具有此标记位的效果。

除了上述这三个FLAG，还有一些FLAG对我们分析栈管理有些帮助。

* FLAG\_ACTIVITY\_NO\_HISTORY：Activity一旦退出，就不会存在于栈中。同样地，也可以在AndroidManifest.xml中设置android：noHistory。
* FLAG\_ACTIVITY\_MULTIPLE\_TASK：需要和FLAG\_ACTIVITY\_NEW\_TASK一同使用才有效果，系统会启动一个新的栈来容纳新启动的Activity。
* FLAG\_ACTIVITY\_EXCLUDE\_FROM\_RECENTS：Activity 不会被放入到“最近启动的Activity”列表中
* FLAG\_ACTIVITY\_BROUGHT\_TO\_FRON T：这个标志位通常不是由应用程序中的代码设置的，而是Launch Mode为singleTask时，由系统自动加上的。
* FLAG\_ACTIVITY\_LAUNCHED\_FROM\_HISTORY：这个标志位通常不是由应用程序中的代码设置的，而是从历史记录中启动的（长按Home键调出）。
* FLAG\_ACTIVITY\_CLEAR\_TASK：需要和FLAG\_ACTIVITY\_NEW\_TASK 一同使用才有效果，用于清除与启动的Activity相关栈的所有其他Activity。

接下来通过系统源码来查看FLAG 的应用，根Activity 启动时会调用AMS的startActivity方法，经过层层调用会调用ActivityStarter的startActivityUnchecked方法，如图所示。

```java
private int startActivityUnchecked(final ActivityRecord r, ActivityRecord sourceRecord,
            IVoiceInteractionSession voiceSession, IVoiceInteractor voiceInteractor,
            int startFlags, boolean doResume, ActivityOptions options, TaskRecord inTask,
            ActivityRecord[] outActivity) {
            //用于初始化启动Activity 的各种配置，在初始化前会重置各种配置再进行配置，
            //这些配置包括ActivityRecord、Intent、TaskRecord和LaunchFlags
            //（Activity 启动的FLAG）等
        setInitialState(r, options, inTask, doResume, startFlags, sourceRecord, voiceSession,
                voiceInteractor);
        //用于计算出Activity启动的FLAG，并将计算的值赋值给mLaunchFlags
        computeLaunchingTaskFlags();
        //
        computeSourceStack();
        //将mLaunchFlags设置给Intent，达到设定Activity的启动方式的目的，
        //接着来查看computeLaunchingTaskFlags方法：
        mIntent.setFlags(mLaunchFlags);
}
```

![](../.gitbook/assets/image%20%2881%29.png)

```java
   private void computeLaunchingTaskFlags() {
//TaskRecord类型的mInTask为null时，说明Activity要加入的栈不存在，
//因此，这一小段代码主要解决的问题就是Activity 要加入的栈不存在时如何计算出启动的FLAG
        if (mInTask == null) {
        //ActivityRecord类型的mSourceRecord用于描述“初始Activity”，什么是“初始Activity”呢？
        //比如ActivityA启动了ActivityB，ActivityA就是初始Activity。
            if (mSourceRecord == null) {
                // This activity is not being started from another...  in this
                // case we -always- start a new task.
                //创建1个新栈
                if ((mLaunchFlags & FLAG_ACTIVITY_NEW_TASK) == 0 && mInTask == null) {
                    Slog.w(TAG, "startActivity called from non-Activity context; forcing " +
                            "Intent.FLAG_ACTIVITY_NEW_TASK for: " + mIntent);
                    mLaunchFlags |= FLAG_ACTIVITY_NEW_TASK;
                }
             //singleInstance创建一个新栈
            } else if (mSourceRecord.launchMode == LAUNCH_SINGLE_INSTANCE) {
                // The original activity who is starting us is running as a single
                // instance...  this new activity it is starting must go on its
                // own task.
                mLaunchFlags |= FLAG_ACTIVITY_NEW_TASK;
                //
            } else if (mLaunchSingleInstance || mLaunchSingleTask) {
                // The activity being started is a single instance...  it always
                // gets launched into its own task.
                mLaunchFlags |= FLAG_ACTIVITY_NEW_TASK;
            }
        }
    }
```

### taskAffinity

我们可以在AndroidManifest.xml中设置android：taskAffinity，用来指定Activity希望归属的栈，在默认情况下，同一个应用程序的所有的Activity 都有着相同的taskAffinity。taskAffinity在下面两种情况时会产生效果。

* taskAffinity与FLAG\_ACTIVITY\_NEW\_TASK或者singleTask配合。如果新启动Activity的taskAffinity和栈的taskAffinity相同则加入到该栈中；如果不同，就会创建新栈。
* taskAffinity与allowTaskReparenting配合。如果allowTaskReparenting为true，说明Activity 具有转移的能力。拿此前的邮件为例（图6-5），当社交应用启动了发送邮件的Activity，此时发送邮件的Activity是和社交应用处于同一个栈中的，并且这个栈位于前台。如果发送邮件的Activity的allowTaskReparenting设置为true，此后E-mail应用所在的栈位于前台时，发送邮件的Activity 就会由社交应用的栈中转移到与它更亲近的邮件应用（taskAffinity相同）所在的栈中，如图所示。

![](../.gitbook/assets/image%20%2884%29%20%281%29%20%281%29.png)

接着通过系统源码来查看taskAffinity的应用。ActivityStackSupervisor的findTaskLocked方法用于找到Activity最匹配的栈，最终会调用ActivityStack的findTaskLocked方法：

```java
    void findTaskLocked(ActivityRecord target, FindTaskResult result) {
    //...
    //遍历mTaskHistory列表，列表的元素为TaskRecord，它用于存储没有被销毁的栈
        for (int taskNdx = mTaskHistory.size() - 1; taskNdx >= 0; --taskNdx) {
            //获取某一个栈的信息
            final TaskRecord task = mTaskHistory.get(taskNdx);
       
            // TODO Refactor to remove duplications. Check if logic can be simplified.
            if (taskIntent != null && taskIntent.getComponent() != null &&
                    taskIntent.getComponent().compareTo(cls) == 0 &&
                    Objects.equals(documentData, taskDocumentData)) {
                if (DEBUG_TASKS) Slog.d(TAG_TASKS, "Found matching class!");
                //dump();
                if (DEBUG_TASKS) Slog.d(TAG_TASKS,
                        "For Intent " + intent + " bringing to top: " + r.intent);
                result.r = r;
                result.matchedByRootAffinity = false;
                break;
            } else if (affinityIntent != null && affinityIntent.getComponent() != null &&
                    affinityIntent.getComponent().compareTo(cls) == 0 &&
                    Objects.equals(documentData, taskDocumentData)) {
                if (DEBUG_TASKS) Slog.d(TAG_TASKS, "Found matching class!");
                //dump();
                if (DEBUG_TASKS) Slog.d(TAG_TASKS,
                        "For Intent " + intent + " bringing to top: " + r.intent);
                result.r = r;
                result.matchedByRootAffinity = false;
                break;
            } else if (!isDocument && !taskIsDocument
                    && result.r == null && task.rootAffinity != null) {
                    //将栈的rootAffinity和目标Activity的taskAffinity做对比，如果相同
                    //则将FindTaskResult的matchedByRootAffinity 属性设置为true，说明找到了匹配的栈。
                if (task.rootAffinity.equals(target.taskAffinity)) {
                    if (DEBUG_TASKS) Slog.d(TAG_TASKS, "Found matching affinity candidate!");
                    // It is possible for multiple tasks to have the same root affinity especially
                    // if they are in separate stacks. We save off this candidate, but keep looking
                    // to see if there is a better candidate.
                    result.r = r;
                    result.matchedByRootAffinity = true;
                }
            } else if (DEBUG_TASKS) Slog.d(TAG_TASKS, "Not a match: " + task);
        }
    }
```









