# WMS

## WMS的创建过程

WMS是在SystemServer进程中创建的。

```java
//SystemServer.java
public static void main(String[] args) {
    //创建SystemServer并调用run方法
    new SystemServer().run();
}
```

```java
//SystemServer.java
private void run() {
    try {
        //创建消息Looper
        Looper.prepareMainLooper();
        Looper.getMainLooper().setSlowLogThresholdMs(
                SLOW_DISPATCH_THRESHOLD_MS, SLOW_DELIVERY_THRESHOLD_MS);
        //加载动态库libandroid_servers.so
        // Initialize native services.
        System.loadLibrary("android_servers");//1
        //...
        //创建系统的Context
        createSystemContext();

        // Create the system service manager.
        //创建SystemServiceManager
        mSystemServiceManager = new SystemServiceManager(mSystemContext); //2
    } finally {
        traceEnd();  // InitBeforeStartServices
    }

    // Start services.
    try {
        traceBeginAndSlog("StartServices");
        //启动引导服务
        startBootstrapServices(); //3
        //启动核心服务
        startCoreServices(); //4
        //启动其他服务
        startOtherServices();//5
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

在注释1处加载了动态库`libandroid_servers.so`。接下来在注释2处创建`SystemServiceManager`，它会对系统的服务进行创建、启动和生命周期管理。在注释3处的`startBootstrapServices`方法中用`SystemServiceManager`启动了`ActivityManagerService`、`PowerManagerService`、`PackageManagerService`等服务。在注释4处的`startCoreServices`方法中则启动了`DropBoxManagerService`、`BatteryService`、`UsageStatsService`和`WebViewUpdateService`。在注释5处的`startOtherServices` 方法中启动了`CameraService`、`AlarmManagerService`、`VrManagerService`等服务。这些服务的父类均为`SystemService`。从注释3、注释4、注释5处的方法可以看出，官方把系统服务分为了三种类型，分别是引导服务、核心服务和其他服务，其中其他服务是一些非紧要和不需要立即启动的服务，WMS就是其他服务的一种。我们来查看在startOtherServices方法中是如何启动WMS的：

```java
private void startOtherServices() {
    final Context context = mSystemContext;
    WindowManagerService wm = null;
    InputManagerService inputManager = null;
    try {
        //创建InputManagerService
        inputManager = new InputManagerService(context);
        // 创建WindowManagerService
        wm = WindowManagerService.main(context, inputManager, !mFirstBoot, mOnlyCore,
                new PhoneWindowManager(), mActivityManagerService.mActivityTaskManager);
        //分别将WMS和IMS注册到ServiceManager中
        ServiceManager.addService(Context.WINDOW_SERVICE, wm, /* allowIsolated= */ false,
                DUMP_FLAG_PRIORITY_CRITICAL | DUMP_FLAG_PROTO);
        ServiceManager.addService(Context.INPUT_SERVICE, inputManager,
                /* allowIsolated= */ false, DUMP_FLAG_PRIORITY_CRITICAL);
        traceEnd();

    } catch (RuntimeException e) {
        Slog.e("System", "******************************************");
        Slog.e("System", "************ Failure starting core service", e);
    }
    //...
    try {
        //初始化屏幕显示信息
        wm.displayReady();
    } catch (Throwable e) {
        reportWtf("making display ready", e);
    }
    traceEnd();
    //...
    try {
        //系统的初始化工作已经完成，其内部调用了WindowManagerPolicy的systemReady方
        wm.systemReady();
    } catch (Throwable e) {
        reportWtf("making Window Manager Service ready", e);
    }
    traceEnd();

}
```

### WMS的main方法

```java
public static WindowManagerService main(final Context context, final InputManagerService im,
        final boolean showBootMsgs, final boolean onlyCore, WindowManagerPolicy policy,
        ActivityTaskManagerService atm, TransactionFactory transactionFactory) {
    //①
    DisplayThread.getHandler().runWithScissors(() ->
            //创建WindowManagerService实例
            sInstance = new WindowManagerService(context, im, showBootMsgs, onlyCore, policy,
                    atm, transactionFactory), 0);
    return sInstance;
}
```

在注释1处调用了DisplayThread的getHandler方法，用来得到DisplayThread的Handler实例。DisplayThread是一个单例的前台线程，这个线程用来处理需要低延时显示的相关操作，并只能由WindowManager、DisplayManager和InputManager实时执行快速操作。  


### Handler\#runWithScissors\(\)

```java
public final boolean runWithScissors(@NonNull Runnable r, long timeout) {
    if (r == null) {
        throw new IllegalArgumentException("runnable must not be null");
    }
    if (timeout < 0) {
        throw new IllegalArgumentException("timeout must be non-negative");
    }
    //判断当前线程是否是创建Handler的线程
    if (Looper.myLooper() == mLooper) {
        r.run();
        return true;
    }
    //如果不是则调用BlockingRunnable
    BlockingRunnable br = new BlockingRunnable(r);
    return br.postAndWait(this, timeout);
}
```

### BlockingRunnable

```java
private static final class BlockingRunnable implements Runnable {
        private final Runnable mTask;
        private boolean mDone;

        public BlockingRunnable(Runnable task) {
            mTask = task;
        }

        @Override
        public void run() {
            try {
                mTask.run();
            } finally {
                synchronized (this) {
                    mDone = true;
                    notifyAll();
                }
            }
        }
        
        public boolean postAndWait(Handler handler, long timeout) {
            if (!handler.post(this)) {
                return false;
            }

            synchronized (this) {
                if (timeout > 0) {
                    final long expirationTime = SystemClock.uptimeMillis() + timeout;
                    while (!mDone) {
                        long delay = expirationTime - SystemClock.uptimeMillis();
                        if (delay <= 0) {
                            return false; // timeout
                        }
                        try {
                            wait(delay);
                        } catch (InterruptedException ex) {
                        }
                    }
                } else {
                    while (!mDone) {
                        try {
                            wait();
                        } catch (InterruptedException ex) {
                        }
                    }
                }
            }
            return true;
        }
    }
```

### WMS构造函数

```java
final WindowAnimator mAnimator;
private WindowManagerService(Context context, InputManagerService inputManager,
        boolean showBootMsgs, boolean onlyCore, WindowManagerPolicy policy,
        ActivityTaskManagerService atm, TransactionFactory transactionFactory) {
    //mInputManager赋值
    mInputManager = inputManager; // Must be before createDisplayContentLocked.
    //创建了WindowAnimator，它用于管理所有的窗口动画
    mAnimator = new WindowAnimator(this);
}
```

## WMS的重要成员

### mPolicy:WindowManagerPolicy

mPolicy是WindowManagerPolicy（WMP）类型的变量。WindowManagerPolicy是窗口管理策略的接口类，用来定义一个窗口策略所要遵循的通用规范，并提供了WindowManager所有的特定的UI行为。它的具体实现类为PhoneWindowManager，这个实现类在WMS创建时被创建。WMP允许定制窗口层级和特殊窗口类型以及关键的调度和布局。

```java
WindowManagerPolicy mPolicy;
```

### mSessions:ArraySet

```java
final ArraySet<Session> mSessions = new ArraySet<>();
```

mSessions是ArraySet类型的变量，元素类型为Session，它主要用于进程间通信，其他的应用程序进程想要和WMS进程进行通信就需要经过Session，并且每个应用程序进程都会对应一个Session，WMS保存这些Session用来记录所有向WMS提出窗口管理服务的客户端。

### mWindowMap:WindowHashMap

mWindowMap 是WindowHashMap类型的变量，WindowHashMap继承了HashMap，它限制了HashMap的key值的类型为IBinder，value值的类型为WindowState。WindowState用于保存窗口的信息，在WMS中它用来描述一个窗口。综上得出结论，mWindowMap就是用来保存WMS中各种窗口的集合。

### mFinishedStarting:ArrayList

mFinishedStarting 是ArrayList 类型的变量，元素类型为AppWindowToken，它是WindowToken的子类。要想理解mFinishedStarting的含义，需要先了解WindowToken是什么。WindowToken主要有两个作用：

* 可以理解为窗口令牌，当应用程序想要向WMS 申请新创建一个窗口，则需要向WMS出示有效的WindowToken。AppWindowToken作为WindowToken的子类，主要用来描述应用程序的WindowToken 结构，应用程序中每个Activity 都对应一个AppWindowToken。
* WindowToken会将同一个组件（比如同一个Activity）的窗口（WindowState）集合在一起，方便管理。
* WindowToken会将同一个组件（比如同一个Activity）的窗口（WindowState）集合在一起，方便管理。

mFinishedStarting 就是用于存储已经完成启动的应用程序窗口（比如Activity）的AppWindowToken的列表。除了mFinishedStarting外，还有类似的mFinishedEarlyAnim和mWindowReplacementTimeouts，其中mFinishedEarlyAnim存储了已经完成窗口绘制并且不需要展示任何已保存surface的应用程序窗口的AppWindowToken。mWindowReplacementTimeout存储了等待更换的应用程序窗口的AppWindowToken，如果更换不及时，旧窗口就需要被处理。

### mResizingWindows:ArrayList

mResizingWindows是ArrayList类型的变量，元素类型为WindowState。mResizingWindows是用来存储正在调整大小的窗口的列表。与mResizingWindows 类似的还有mPendingRemove、mDestroySurface和mDestroyPreservedSurface等，其中mPendingRemove是在内存耗尽时设置的，里面存有需要强制删除的窗口，mDestroySurface里面存有需要被销毁的Surface，mDestroyPreservedSurface 里面存有窗口需要保存的等待销毁的Surface，为什么窗口要保存这些Surface？这是因为当窗口经历Surface变化时，窗口需要一直保持旧Surface，直到新Surface的第一帧绘制完成。

### mAnimator:WindowAnimator

mAnimator是WindowAnimator类型的变量，用于管理窗口的动画以及特效动画。

### mH:H

mH 是H 类型的变量，系统的Handler 类，用于将任务加入到主线程的消息队列中，这样代码逻辑就会在主线程中执行。

### mInputManager:InputManagerService

mInputManager 是InputManagerService 类型的变量，输入系统的管理者。InputManagerService（IMS）会对触摸事件进行处理，它会寻找一个最合适的窗口来处理触摸反馈信息，WMS是窗口的管理者，因此WMS作为输入系统的中转站是再合适不过了。  


## Window的添加过程

我们知道Window的操作分为两大部分，一部分是WindowManager处理部分，另一部分是WMS处理部分，

### addWindow

```java
public int addWindow(Session session, IWindow client, int seq,
        LayoutParams attrs, int viewVisibility, int displayId, Rect outFrame,
        Rect outContentInsets, Rect outStableInsets, Rect outOutsets,
        DisplayCutout.ParcelableWrapper outDisplayCutout, InputChannel outInputChannel,
        InsetsState outInsetsState) {
    int[] appOp = new int[1];
    int res = mPolicy.checkAddPermission(attrs, appOp);//1

    synchronized (mGlobalLock) {
        if (!mDisplayReady) {
            throw new IllegalStateException("Display has not been initialialized");
        }
        //2
        final DisplayContent displayContent = getDisplayContentOrCreate(displayId, attrs.token);
        //...

        if (type >= FIRST_SUB_WINDOW && type <= LAST_SUB_WINDOW) { //3
            parentWindow = windowForClientLocked(null, attrs.token, false); //4
            if (parentWindow == null) {
                Slog.w(TAG_WM, "Attempted to add window with token that is not a window: "
                        + attrs.token + ".  Aborting.");
                return WindowManagerGlobal.ADD_BAD_SUBWINDOW_TOKEN;
            }
            if (parentWindow.mAttrs.type >= FIRST_SUB_WINDOW
                    && parentWindow.mAttrs.type <= LAST_SUB_WINDOW) {
                Slog.w(TAG_WM, "Attempted to add window with token that is a sub-window: "
                        + attrs.token + ".  Aborting.");
                return WindowManagerGlobal.ADD_BAD_SUBWINDOW_TOKEN;
            }
        }
        // Use existing parent window token for child windows since they go in the same token
        // as there parent window so we can apply the same policy on them.
        //获取WindowToken
        WindowToken token = displayContent.getWindowToken(hasParent ? parentWindow.mAttrs.token : attrs.token);
        // If this is a child window, we want to apply the same type checking rules as the
        // parent window type.
        //如果有父窗口的type值赋值给rootType。如果当前没有窗口的type值赋值给rootType
        final int rootType = hasParent ? parentWindow.mAttrs.type : type;
        if (token == null) {
            //接下来如果WindowToken为null，则根据rootType或者type的值进行区分判断，
            //如果rootType值等于TYPE_INPUT_METHOD、TYPE_WALLPAPER 等值时，
            //则返回状态值WindowManagerGlobal.ADD_BAD_APP_TOKEN，
            //说明rootType值等于TYPE_INPUT_METHOD、TYPE_WALLPAPER 等值时是不允许WindowToken为null的
            if (rootType == TYPE_INPUT_METHOD) {
                Slog.w(TAG_WM, "Attempted to add input method window with unknown token "
                    + attrs.token + ".  Aborting.");
                return WindowManagerGlobal.ADD_BAD_APP_TOKEN;
            }
            if (rootType == TYPE_VOICE_INTERACTION) {
                Slog.w(TAG_WM, "Attempted to add voice interaction window with unknown token "
                    + attrs.token + ".  Aborting.");
                return WindowManagerGlobal.ADD_BAD_APP_TOKEN;
            }
            if (rootType == TYPE_WALLPAPER) {
                Slog.w(TAG_WM, "Attempted to add wallpaper window with unknown token "
                    + attrs.token + ".  Aborting.");
                return WindowManagerGlobal.ADD_BAD_APP_TOKEN;
            }
            if (rootType == TYPE_DREAM) {
                Slog.w(TAG_WM, "Attempted to add Dream window with unknown token "
                    + attrs.token + ".  Aborting.");
                return WindowManagerGlobal.ADD_BAD_APP_TOKEN;
            }
            if (rootType == TYPE_QS_DIALOG) {
                Slog.w(TAG_WM, "Attempted to add QS dialog window with unknown token "
                    + attrs.token + ".  Aborting.");
                return WindowManagerGlobal.ADD_BAD_APP_TOKEN;
            }
            if (rootType == TYPE_ACCESSIBILITY_OVERLAY) {
                Slog.w(TAG_WM, "Attempted to add Accessibility overlay window with unknown token "
                        + attrs.token + ".  Aborting.");
                return WindowManagerGlobal.ADD_BAD_APP_TOKEN;
            }
            if (type == TYPE_TOAST) {
                // Apps targeting SDK above N MR1 cannot arbitrary add toast windows.
                if (doesAddToastWindowRequireToken(attrs.packageName, callingUid,
                        parentWindow)) {
                    Slog.w(TAG_WM, "Attempted to add a toast window with unknown token "
                            + attrs.token + ".  Aborting.");
                    return WindowManagerGlobal.ADD_BAD_APP_TOKEN;
                }
            }
            final IBinder binder = attrs.token != null ? attrs.token : client.asBinder();
            final boolean isRoundedCornerOverlay =
                    (attrs.privateFlags & PRIVATE_FLAG_IS_ROUNDED_CORNERS_OVERLAY) != 0;
            //创建WindowToken，这说明当我们添加窗口时可以不向WMS提供WindowToken，
            //前提是rootType和type的值不为前面条件判断筛选的值。
            token = new WindowToken(this, binder, type, false, displayContent,
                    session.mCanAddInternalSystemWindow, isRoundedCornerOverlay);
        }
    }
    //...

       
}
```







