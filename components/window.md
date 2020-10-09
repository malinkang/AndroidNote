# Window

Window表示一个窗口的概念，在日常开发中直接接触Window的机会并不多，但是在某些特殊时候我们需要在桌面上显示一个类似悬浮窗的东西，那么这种效果就需要用到Window来实现。Window是一个抽象类，它的具体实现是PhoneWindow。创建一个Window是很简单的事，只需要通过WindowManager即可完成。WindowManager是外界访问Window的入口，Window的具体实现位于WindowManagerService中，WindowManager和WindowManagerService的交互是一个IPC过程。Android中所有的视图都是通过Window来呈现的，不管是Activity、Dialog还是Toast，它们的视图实际上都是附加在Window上的，因此Window实际是View的直接管理者。

## Window

Window是一个抽象类，它的具体实现类为PhoneWindow，PhoneWindow是何时创建的呢？在Activity 启动过程中会调用ActivityThread的performLaunchActivity方法，performLaunchActivity方法中又会调用Activity的attach方法，PhoneWindow就是在Activity的attach方法中创建的，如下所示：

```java
final void attach(Context context, ActivityThread aThread,
        Instrumentation instr, IBinder token, int ident,
        Application application, Intent intent, ActivityInfo info,
        CharSequence title, Activity parent, String id,
        NonConfigurationInstances lastNonConfigurationInstances,
        Configuration config, String referrer, IVoiceInteractor voiceInteractor,
        Window window, ActivityConfigCallback activityConfigCallback, IBinder assistToken) {
    attachBaseContext(context);

    mFragments.attachHost(null /*parent*/);
    //创建Window
    mWindow = new PhoneWindow(this, window, activityConfigCallback);
    mWindow.setWindowControllerCallback(this);
    mWindow.setCallback(this);
    mWindow.setOnWindowDismissedCallback(this);
    mWindow.getLayoutInflater().setPrivateFactory(this);
    //...
    //设置WindowManager
    mWindow.setWindowManager(
            (WindowManager)context.getSystemService(Context.WINDOW_SERVICE),
            mToken, mComponent.flattenToString(),
            (info.flags & ActivityInfo.FLAG_HARDWARE_ACCELERATED) != 0);
    if (mParent != null) {
        mWindow.setContainer(mParent.getWindow());
    }
    mWindowManager = mWindow.getWindowManager();
    mCurrentConfig = config;

    mWindow.setColorMode(info.colorMode);

    setAutofillOptions(application.getAutofillOptions());
    setContentCaptureOptions(application.getContentCaptureOptions());
}
```

```java
public void setWindowManager(WindowManager wm, IBinder appToken, String appName,
        boolean hardwareAccelerated) {
    mAppToken = appToken;
    mAppName = appName;
    mHardwareAccelerated = hardwareAccelerated;
    if (wm == null) {
        wm = (WindowManager)mContext.getSystemService(Context.WINDOW_SERVICE);
    }
    mWindowManager = ((WindowManagerImpl)wm).createLocalWindowManager(this);
}
```

如果传入的WindowManager为null，就会调用Context的getSystemService方法，并传入服务的名称Context.WINDOW\_SERVICE（值为window），具体在ContextImpl中实现，如下所示

```java
//ContextImpl
@Override
public Object getSystemService(String name) {
    return SystemServiceRegistry.getSystemService(this, name);
}
```

```java
//SystemServiceRegistry.java
public static Object getSystemService(ContextImpl ctx, String name) {
    //SYSTEM_SERVICE_FETCHERS是ArrayMap
    ServiceFetcher<?> fetcher = SYSTEM_SERVICE_FETCHERS.get(name);
    return fetcher != null ? fetcher.getService(ctx) : null;
}
```

SYSTEM\_SERVICE\_NAMES是一个ArrayMap类型的数据，它用来存储服务的名称，那么传入的Context.WINDOW\_SERVICE到底对应着什么？我们接着往下看：

```java
//SystemServiceRegistry.java
static{
    registerService(Context.WINDOW_SERVICE, WindowManager.class,
        new CachedServiceFetcher<WindowManager>() {
    @Override
    public WindowManager createService(ContextImpl ctx) {
        return new WindowManagerImpl(ctx);//1
    }});
}
```

在SystemServiceRegistry 的静态代码块中会调用多个registerService方法，这里只列举了和本节有关的一个。registerService 方法内部会将传入的服务的名称存入到SYSTEM\_SERVICE\_NAMES中。从注释1处可以看出，传入的Context.WINDOW\_SERVICE对应的就是WindowManagerImpl实例，因此得出结论，Context的getSystemService方法得到的是WindowManagerImpl实例。我们再回到Window的setWindowManager方法，在注释1处得到WindowManagerImpl实例后转为WindowManager 类型。

```java
private final Window mParentWindow;
private WindowManagerImpl(Context context, Window parentWindow) {
    mContext = context;
    mParentWindow = parentWindow;
}
public WindowManagerImpl createLocalWindowManager(Window parentWindow) {
    return new WindowManagerImpl(mContext, parentWindow);
}
```

createLocalWindowManager方法同样也是创建WindowManagerImpl，不同的是这次创建WindowManagerImpl 时将创建它的Window 作为参数传了进来，这样WindowManagerImpl就持有了Window的引用，可以对Window进行操作，比如在Window中添加View，会调用WindowManagerImpl的addView方法，如下所示：

```java
@Override
public void addView(@NonNull View view, @NonNull ViewGroup.LayoutParams params) {
    applyDefaultToken(params);
    mGlobal.addView(view, params, mContext.getDisplay(), mParentWindow);
}
```

在注释1处调用了WindowManagerGlobal的addView方法，其中最后一个参数mParentWindow就是上面提到的Window，可以看出WindowManagerImpl虽然是WindowManager的实现类，但是没有实现什么功能，而是将功能实现委托给了WindowManagerGlobal，这里用到的是桥接模式。

```java
private final WindowManagerGlobal mGlobal = WindowManagerGlobal.getInstance();
```

![](../.gitbook/assets/image%20%2867%29.png)

## WindowManager

为了分析Window的工作机制，我们需要先了解如何使用WindowManager添加一个Window。下面的代码演示了通过WindowManager添加Window的过程，是不是很简单呢？

```kotlin
val layoutParams = WindowManager.LayoutParams(
    WindowManager.LayoutParams.WRAP_CONTENT,
    WindowManager.LayoutParams.WRAP_CONTENT,
    WindowManager.LayoutParams.TYPE_APPLICATION, 0, PixelFormat.TRANSPARENT
)
layoutParams.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
layoutParams.gravity = Gravity.LEFT or Gravity.TOP
layoutParams.x = 100
layoutParams.y = 300
windowManager.addView(button, layoutParams)
```

上述代码可以将一个Button添加到屏幕坐标为（100,300）的位置上。WindowManager. LayoutParams中的flags和type这两个参数比较重要，下面对其进行说明。

* Flags参数表示Window的属性，它有很多选项，通过这些选项可以控制Window的显示特性，这里主要介绍几个比较常用的选项，剩下的请查看官方文档。

#### FLAG\_NOT\_FOCUSABLE

表示Window不需要获取焦点，也不需要接收各种输入事件，此标记会同时启用

#### FLAG\_NOT\_TOUCH\_MODAL

最终事件会直接传递给下层的具有焦点的Window。FLAG\_NOT\_TOUCH\_MODAL在此模式下，系统会将当前Window区域以外的单击事件传递给底层的Window，当前Window区域以内的单击事件则自己处理。这个标记很重要，一般来说都需要开启此标记，否则其他Window将无法收到单击事件。

#### FLAG\_SHOW\_WHEN\_LOCKED

开启此模式可以让Window显示在锁屏的界面上。

Type参数表示Window的类型，Window有三种类型。

* 应用Window：应用类Window对应着一个Activity。
* 子Window：子Window不能单独存在，它需要附属在特定的父Window之中，比如常见的一些Dialog就是一个子Window。
* 系统Window：系统Window是需要声明权限才能创建的Window，比如Toast和系统状态栏这些都是系统Window。

Window是分层的，每个Window都有对应的z-ordered，层级大的会覆盖在层级小的Window的上面，这和HTML中的z-index的概念是完全一致的。在三类Window中，应用Window的层级范围是1～99，子Window的层级范围是1000～1999，系统Window的层级范围是2000～2999，这些层级范围对应着WindowManager.LayoutParams的type参数。如果想要Window位于所有Window的最顶层，那么采用较大的层级即可。很显然系统Window的层级是最大的，而且系统层级有很多值，一般我们可以选用TYPE\_SYSTEM\_OVERLAY或者TYPE\_SYSTEM\_ERROR，如果采用TYPE\_SYSTEM\_ERROR，只需要为type参数指定这个层级即可：mLayoutParams.type =LayoutParams.TYPE\_SYSTEM\_ERROR；同时声明权限：

```markup
<uses-permissionandroid:name="android.permission.SYSTEM_ALERT_WINDOW" />
```

因为系统类型的Window是需要检查权限的，如果不在AndroidManifest中使用相应的权限，那么创建Window的时候就会报错。

WindowManager所提供的功能很简单，常用的只有三个方法，即添加View、更新View和删除View，这三个方法定义在ViewManager中，而WindowManager继承了ViewManager。

```java
public interface ViewManager
{
    /**
     * Assign the passed LayoutParams to the passed View and add the view to the window.
     * <p>Throws {@link android.view.WindowManager.BadTokenException} for certain programming
     * errors, such as adding a second view to a window without removing the first view.
     * <p>Throws {@link android.view.WindowManager.InvalidDisplayException} if the window is on a
     * secondary {@link Display} and the specified display can't be found
     * (see {@link android.app.Presentation}).
     * @param view The view to be added to this window.
     * @param params The LayoutParams to assign to view.
     */
    public void addView(View view, ViewGroup.LayoutParams params);
    public void updateViewLayout(View view, ViewGroup.LayoutParams params);
    public void removeView(View view);
}
```

对开发者来说，WindowManager常用的就只有这三个功能而已，但是这三个功能已经足够我们使用了。它可以创建一个Window并向其添加View，还可以更新Window中的View，另外如果想要删除一个Window，那么只需要删除它里面的View即可。由此来看，WindowManager操作Window的过程更像是在操作Window中的View。我们时常见到那种可以拖动的Window效果，其实是很好实现的，只需要根据手指的位置来设定LayoutParams中的x和y的值即可改变Window的位置。首先给View设置onTouchListener。然后在onTouch方法中不断更新View的位置即可：

```java
override fun onTouch(v: View, event: MotionEvent): Boolean {
    val rawX = event.rawX
    val rawY = event.rawY
    when(event.action){
        MotionEvent.ACTION_MOVE->{
            mLayoutParams.x = rawX.toInt()
            mLayoutParams.y = rawY.toInt()
            windowManager.updateViewLayout(v,mLayoutParams)
        }
    }
    return false
}
```

## Window的内部机制

Window是一个抽象的概念，每一个Window都对应着一个View和一个ViewRootImpl, Window和View通过ViewRootImpl来建立联系，因此Window并不是实际存在的，它是以View的形式存在。这点从WindowManager的定义也可以看出，它提供的三个接口方法addView、updateViewLayout以及removeView都是针对View的，这说明View才是Window存在的实体。在实际使用中无法直接访问Window，对Window的访问必须通过WindowManager。为了分析Window的内部机制，这里从Window的添加、删除以及更新说起。

### Window的添加过程

Window的添加过程需要通过WindowManager的addView来实现，WindowManager是一个接口，它的真正实现是WindowManagerImpl类。在WindowManagerImpl中Window的三大操作的实现如下：

```java
private final WindowManagerGlobal mGlobal = WindowManagerGlobal.getInstance();
@Override
public void addView(@NonNull View view, @NonNull ViewGroup.LayoutParams params) {
    applyDefaultToken(params);
    mGlobal.addView(view, params, mContext.getDisplay(), mParentWindow);
}
@Override
public void updateViewLayout(@NonNull View view, @NonNull ViewGroup.LayoutParams params) {
    applyDefaultToken(params);
    mGlobal.updateViewLayout(view, params);
}
@Override
public void removeView(View view) {
    mGlobal.removeView(view, false);
}
```

可以发现，WindowManagerImpl并没有直接实现Window的三大操作，而是全部交给了WindowManagerGlobal来处理，WindowManagerGlobal以工厂的形式向外提供自己的实例，在WindowManagerGlobal中有如下一段代码：private finalWindowManagerGlobal mGlobal = WindowManagerGlobal.getInstance\(\)。WindowManagerImpl这种工作模式是典型的桥接模式，将所有的操作全部委托给WindowManagerGlobal来实现。WindowManagerGlobal的addView方法主要分为如下几步。

```java
//mViews存储的是所有Window所对应的View,
private final ArrayList<View> mViews = new ArrayList<View>();
//mRoots存储的是所有Window所对应的ViewRootImpl
private final ArrayList<ViewRootImpl> mRoots = new ArrayList<ViewRootImpl>();
//mParams存储的是所有Window所对应的布局参数
private final ArrayList<WindowManager.LayoutParams> mParams = new ArrayList<WindowManager.LayoutParams>();
//mDyingViews则存储了那些正在被删除的View对象 或者说是那些已经调用removeView方法但是删除操作还未完成的Window对象。
private final ArraySet<View> mDyingViews = new ArraySet<View>();
public void addView(View view, ViewGroup.LayoutParams params,
        Display display, Window parentWindow) {
    //1. 检查参数是否合法，如果是子Window那么还需要调整一些布局参数
    if (view == null) {
        throw new IllegalArgumentException("view must not be null");
    }
    if (display == null) {
        throw new IllegalArgumentException("display must not be null");
    }
    if (!(params instanceof WindowManager.LayoutParams)) {
        throw new IllegalArgumentException("Params must be WindowManager.LayoutParams");
    }

    final WindowManager.LayoutParams wparams = (WindowManager.LayoutParams) params;
    if (parentWindow != null) {
        parentWindow.adjustLayoutParamsForSubWindow(wparams);
    } else {
        // If there's no parent, then hardware acceleration for this view is
        // set from the application's hardware acceleration setting.
        final Context context = view.getContext();
        if (context != null
                && (context.getApplicationInfo().flags
                        & ApplicationInfo.FLAG_HARDWARE_ACCELERATED) != 0) {
            wparams.flags |= WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED;
        }
    }

    ViewRootImpl root;
    View panelParentView = null;

    synchronized (mLock) {
        // Start watching for system property changes.
        if (mSystemPropertyUpdater == null) {
            mSystemPropertyUpdater = new Runnable() {
                @Override public void run() {
                    synchronized (mLock) {
                        for (int i = mRoots.size() - 1; i >= 0; --i) {
                            mRoots.get(i).loadSystemProperties();
                        }
                    }
                }
            };
            SystemProperties.addChangeCallback(mSystemPropertyUpdater);
        }

        int index = findViewLocked(view, false);
        if (index >= 0) {
            if (mDyingViews.contains(view)) {
                // Don't wait for MSG_DIE to make it's way through root's queue.
                mRoots.get(index).doDie();
            } else {
                throw new IllegalStateException("View " + view
                        + " has already been added to the window manager.");
            }
            // The previous removeView() had not completed executing. Now it has.
        }

        // If this is a panel window, then find the window it is being
        // attached to for future reference.
        if (wparams.type >= WindowManager.LayoutParams.FIRST_SUB_WINDOW &&
                wparams.type <= WindowManager.LayoutParams.LAST_SUB_WINDOW) {
            final int count = mViews.size();
            for (int i = 0; i < count; i++) {
                if (mRoots.get(i).mWindow.asBinder() == wparams.token) {
                    panelParentView = mViews.get(i);
                }
            }
        }
        //2．创建ViewRootImpI并将View添加到列表中
        root = new ViewRootImpl(view.getContext(), display);

        view.setLayoutParams(wparams);

        mViews.add(view);
        mRoots.add(root);
        mParams.add(wparams);

        // do this last because it fires off messages to start doing things
        try {
        //3.通过ViewRootImpI来更新界面并完成Window的添加过程
            root.setView(view, wparams, panelParentView);
        } catch (RuntimeException e) {
            // BadTokenException or InvalidDisplayException, clean up.
            if (index >= 0) {
                removeViewLocked(index, true);
            }
            throw e;
        }
    }
}
```

View的绘制过程是由ViewRootImpl来完成的，这里当然也不例外，在setView内部会通过requestLayout来完成异步刷新请求。在下面的代码中，scheduleTraversals实际是View绘制的入口：

```java
@Override
public void requestLayout() {
    if (!mHandlingLayoutInLayoutRequest) {
        checkThread();
        mLayoutRequested = true;
        scheduleTraversals();
    }
}
```

接着会通过WindowSession最终来完成Window的添加过程。在下面的代码中，mWindowSession的类型是IWindowSession，它是**一个**Binder对象，真正的实现类是Session，也就是Window的添加过程是一次IPC调用。

```java
 //ViewRootImpl setView方法
try {
    mOrigWindowType = mWindowAttributes.type;
    mAttachInfo.mRecomputeGlobalAttributes = true;
    collectViewAttributes();
    res = mWindowSession.addToDisplay(mWindow, mSeq, mWindowAttributes,
            getHostVisibility(), mDisplay.getDisplayId(), mTmpFrame,
            mAttachInfo.mContentInsets, mAttachInfo.mStableInsets,
            mAttachInfo.mOutsets, mAttachInfo.mDisplayCutout, mInputChannel,
            mTempInsets);
    setFrame(mTmpFrame);
} catch (RemoteException e) {
    mAdded = false;
    mView = null;
    mAttachInfo.mRootView = null;
    mInputChannel = null;
    mFallbackEventHandler.setView(null);
    unscheduleTraversals();
    setAccessibilityFocus(null, null);
    throw new RuntimeException("Adding window failed", e);
} finally {
    if (restore) {
        attrs.restore();
    }
}
```

mWindowSession是IWindowSession类型的，它是一个Binder对象，用于进行进程间通信，IWindowSession是Client端的代理，它的Server端的实现为Session，此前的代码逻辑都是运行在本地进程的，而Session的addToDisplay方法则运行在WMS所在的进程（SystemServer进程）中。

```java
 public ViewRootImpl(Context context, Display display) {
     mContext = context;
     mWindowSession = WindowManagerGlobal.getWindowSession();
 }
```

```java
//WindowManagerGlobal.java
@UnsupportedAppUsage
public static IWindowSession getWindowSession() {
    synchronized (WindowManagerGlobal.class) {
        if (sWindowSession == null) {
            try {
                // Emulate the legacy behavior.  The global instance of InputMethodManager
                // was instantiated here.
                // TODO(b/116157766): Remove this hack after cleaning up @UnsupportedAppUsage
                InputMethodManager.ensureDefaultInstanceForDefaultDisplayIfNecessary();
                IWindowManager windowManager = getWindowManagerService();
                //获取WindowManagerService
                //调用WindowManagerService的openSession方法
                sWindowSession = windowManager.openSession(
                        new IWindowSessionCallback.Stub() {
                            @Override
                            public void onAnimatorScaleChanged(float scale) {
                                ValueAnimator.setDurationScale(scale);
                            }
                        });
            } catch (RemoteException e) {
                throw e.rethrowFromSystemServer();
            }
        }
        return sWindowSession;
    }
}
```

```java
//WindowManagerService.java 
@Override
public IWindowSession openSession(IWindowSessionCallback callback) {
    return new Session(this, callback);
}
```

![](../.gitbook/assets/image%20%2868%29.png)

  
在Session内部会通过WindowManagerService来实现Window的添加，代码如下所示。

```java
//
@Override
public int addToDisplay(IWindow window, int seq, WindowManager.LayoutParams attrs,
        int viewVisibility, int displayId, Rect outFrame, Rect outContentInsets,
        Rect outStableInsets, Rect outOutsets,
        DisplayCutout.ParcelableWrapper outDisplayCutout, InputChannel outInputChannel,
        InsetsState outInsetsState) {
    return mService.addWindow(this, window, seq, attrs, viewVisibility, displayId, outFrame,
            outContentInsets, outStableInsets, outOutsets, outDisplayCutout, outInputChannel,
            outInsetsState);
}
```

在addToDisplay方法中调用了WMS的addWindow方法，并将自身也就是Session作为参数传了进去，每个应用程序进程都会对应一个Session，WMS会用ArrayList来保存这些Session，这样剩下的工作就交给WMS来处理，在WMS中会为这个添加的窗口分配Surface，并确定窗口显示次序，可见负责显示界面的是画布Surface，而不是窗口本身。WMS会将它所管理的Surface 交由SurfaceFlinger处理，SurfaceFlinger会将这些Surface混合并绘制到屏幕上。

### Window的删除过程

Window的删除过程和添加过程一样，都是先通过WindowManagerImpl后，再进一步通过WindowManagerGlobal来实现的。下面是WindowManagerGlobal的removeView的实现：

```java
@UnsupportedAppUsage
public void removeView(View view, boolean immediate) {
    if (view == null) {
        throw new IllegalArgumentException("view must not be null");
    }
    synchronized (mLock) {
        int index = findViewLocked(view, true);
        View curView = mRoots.get(index).getView();
        removeViewLocked(index, immediate);
        if (curView == view) {
            return;
        }
        throw new IllegalStateException("Calling with view " + view
                + " but the ViewAncestor is attached to " + curView);
    }
}
```

removeView的逻辑很清晰，首先通过findViewLocked来查找待删除的View的索引，这个查找过程就是建立的数组遍历，然后再调用removeViewLocked来做进一步的删除，如下所示。

```java
private void removeViewLocked(int index, boolean immediate) {
    ViewRootImpl root = mRoots.get(index);
    View view = root.getView();
    if (view != null) {
        InputMethodManager imm = view.getContext().getSystemService(InputMethodManager.class);
        if (imm != null) {
            imm.windowDismissed(mViews.get(index).getWindowToken());
        }
    }
    boolean deferred = root.die(immediate);
    if (view != null) {
        view.assignParent(null);
        if (deferred) {
            mDyingViews.add(view);
        }
    }
}
```

removeViewLocked是通过ViewRootImpl来完成删除操作的。在WindowManager中提供了两种删除接口removeView和removeViewImmediate，它们分别表示异步删除和同步删除，其中removeViewImmediate使用起来需要特别注意，一般来说不需要使用此方法来删除Window以免发生意外的错误。这里主要说异步删除的情况，具体的删除操作由ViewRootImpl的die方法来完成。在异步删除的情况下，die方法只是发送了一个请求删除的消息后就立刻返回了，这个时候View并没有完成删除操作，所以最后会将其添加到mDyingViews中，mDyingViews表示待删除的View列表。ViewRootImpl的die方法如下所示。

```java
/**
 * @param immediate True, do now if not in traversal. False, put on queue and do later.
 * @return True, request has been queued. False, request has been completed.
 */
boolean die(boolean immediate) {
    // Make sure we do execute immediately if we are in the middle of a traversal or the damage
    // done by dispatchDetachedFromWindow will cause havoc on return.
    if (immediate && !mIsInTraversal) {
        doDie();
        return false;
    }
    if (!mIsDrawing) {
        destroyHardwareRenderer();
    } else {
        Log.e(mTag, "Attempting to destroy the window while drawing!\n" +
                "  window=" + this + ", title=" + mWindowAttributes.getTitle());
    }
    mHandler.sendEmptyMessage(MSG_DIE);
    return true;
}
```

在die方法内部只是做了简单的判断，如果是异步删除，那么就发送一个MSG\_DIE的消息，ViewRootImpl中的Handler会处理此消息并调用doDie方法，如果是同步删除（立即删除），那么就不发消息直接调用doDie方法，这就是这两种删除方式的区别。在doDie内部会调用dispatchDetachedFromWindow方法，真正删除View的逻辑在dispatchDetachedFromWindow方法的内部实现。dispatchDetachedFromWindow方法主要做四件事：

1. 垃圾回收相关的工作，比如清除数据和消息、移除回调。
2. 通过Session的remove方法删除Window:mWindowSession.remove\(mWindow\)，这同样是一个IPC过程，最终会调用WindowManagerService的removeWindow方法。
3. 调用View的dispatchDetachedFromWindow方法，在内部会调用View的onDetached-FromWindow\(\)以及onDetachedFromWindowInternal\(\)。对于onDetachedFromWindow\(\)大家一定不陌生，当View从Window中移除时，这个方法就会被调用，可以在这个方法内部做一些资源回收的工作，比如终止动画、停止线程等。
4. 调用WindowManagerGlobal的doRemoveView方法刷新数据，包括mRoots、mParams以及mDyingViews，需要将当前Window所关联的这三类对象从列表中删除。

### Window的更新过程

到这里，Window的删除过程已经分析完毕了，下面分析Window的更新过程，还是要看WindowManagerGlobal的updateViewLayout方法，如下所示。

```java
public void updateViewLayout(View view, ViewGroup.LayoutParams params) {
    if (view == null) {
        throw new IllegalArgumentException("view must not be null");
    }
    if (!(params instanceof WindowManager.LayoutParams)) {
        throw new IllegalArgumentException("Params must be WindowManager.LayoutParams");
    }
    final WindowManager.LayoutParams wparams = (WindowManager.LayoutParams)params;
    view.setLayoutParams(wparams);
    synchronized (mLock) {
        int index = findViewLocked(view, true);
        ViewRootImpl root = mRoots.get(index);
        mParams.remove(index);
        mParams.add(index, wparams);
        root.setLayoutParams(wparams, false);
    }
}
```

updateViewLayout方法做的事情就比较简单了，首先它需要更新View的LayoutParams并替换掉老的LayoutParams，接着再更新ViewRootImpl中的LayoutParams，这一步是通过ViewRootImpl的setLayoutParams方法来实现的。在ViewRootImpl中会通过scheduleTraversals方法来对View重新布局，包括测量、布局、重绘这三个过程。除了View本身的重绘以外，ViewRootImpl还会通过WindowSession来更新Window的视图，这个过程最终是由WindowManagerService的relayoutWindow\(\)来具体实现的，它同样是一个IPC过程。





