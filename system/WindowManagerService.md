---
title: WindowManagerService分析
date: 2020-02-23 17:19:13
tags: ["源码分析"]
---

## Window

`Window`字面意思为窗口，是一个抽象类，负责管理`View`，它的唯一子类为`PhoneWindow`。它的官方定义如下：

> Abstract base class for a top-level window look and behavior policy.  An instance of this class should be used as the top-level view added to the window manager. It provides standard UI policies such as a background, title area, default key processing, etc.
>
> The only existing implementation of this abstract class is android.view.PhoneWindow, which you should instantiate when needing a Window.

<!--more-->

顶层窗口外观和行为策略的抽象基类。 该类的一个实例应被用作添加到窗口管理器的顶层视图。它提供了标准的UI策略，如背景、标题区域、默认键处理等。

这个抽象类现有的唯一实现是`android.view.PhoneWindow`，当你需要一个窗口时，应该实例化它。

### Window创建过程

每一个`Activity`都会创建一个`PhoneWindow`对象，那么`PhoneWindow`是何时创建的呢？

`ActivityThread`的`performLaunchActivity`方法会创建`Activity`，并调用`Activity`的`attach`方法。

```java
//frameworks/base/core/java/android/app/ActivityThread.java
private Activity performLaunchActivity(ActivityClientRecord r, Intent customIntent) {
    //...
    ContextImpl appContext = createBaseContextForActivity(r);
    Activity activity = null;
    try {
        java.lang.ClassLoader cl = appContext.getClassLoader();
        activity = mInstrumentation.newActivity(
                cl, component.getClassName(), r.intent);//创建Activity
        //...
    } catch (Exception e) {
        //...
    }

    try {
        Application app = r.packageInfo.makeApplication(false, mInstrumentation); //创建application

        if (activity != null) {
            //...
            //调用Activity的调用attach方法
            activity.attach(appContext, this, getInstrumentation(), r.token,
                    r.ident, app, r.intent, r.activityInfo, title, r.parent,
                    r.embeddedID, r.lastNonConfigurationInstances, config,
                    r.referrer, r.voiceInteractor, window, r.configCallback,
                    r.assistToken);

            //调用Activity的onCreate方法 
            if (r.isPersistable()) {
                mInstrumentation.callActivityOnCreate(activity, r.state, r.persistentState);
            } else {
                mInstrumentation.callActivityOnCreate(activity, r.state);
            }
            //...
        }
        //...

    } catch (SuperNotCalledException e) {
        throw e;

    } catch (Exception e) {
       //...
    }

    return activity;
}
```

### Activity#attach

`Activity`的`attach`方法会创建`PhoneWindow`对象，并创建一个`WindowManager`对象。

```java
//frameworks/base/core/java/android/app/Activity.java
private Window mWindow;
final void attach(Context context, ActivityThread aThread,
        Instrumentation instr, IBinder token, int ident,
        Application application, Intent intent, ActivityInfo info,
        CharSequence title, Activity parent, String id,
        NonConfigurationInstances lastNonConfigurationInstances,
        Configuration config, String referrer, IVoiceInteractor voiceInteractor,
        Window window, ActivityConfigCallback activityConfigCallback, IBinder assistToken) {
  	//...
  	//创建PhoneWindow
    mWindow = new PhoneWindow(this, window, activityConfigCallback);
    //...
    //设置WindowManager 
    mWindow.setWindowManager(
            (WindowManager)context.getSystemService(Context.WINDOW_SERVICE), //调用ContextImpl的getSystemService方法
            mToken, mComponent.flattenToString(),
            (info.flags & ActivityInfo.FLAG_HARDWARE_ACCELERATED) != 0);
  	//...
    //赋值
    mWindowManager = mWindow.getWindowManager();
    //...
}
```

### Activity#setContentView

`Activity`的`setContentView`方法，实际上是调用的`PhoneWindow`的`setContentView`方法。

```java
public void setContentView(@LayoutRes int layoutResID) {
    getWindow().setContentView(layoutResID);//调用Window的setContentView
    initWindowDecorActionBar();
}
```

`PhoneWindow`的`setContentView`方法会调用`installDecor`创建`mDecor`和`mContentParent`。并把传入的`View`添加到`mContentParent`中

## PhoneWindow

### setContentView

```java
//frameworks/base/core/java/com/android/internal/policy/PhoneWindow.java
private DecorView mDecor;
ViewGroup mContentParent;
public void setContentView(int layoutResID) {
    // Note: FEATURE_CONTENT_TRANSITIONS may be set in the process of installing the window
    // decor, when theme attributes and the like are crystalized. Do not check the feature
    // before this happens.
    if (mContentParent == null) {
        installDecor(); //
    } else if (!hasFeature(FEATURE_CONTENT_TRANSITIONS)) {
        mContentParent.removeAllViews();
    }

    if (hasFeature(FEATURE_CONTENT_TRANSITIONS)) {
        final Scene newScene = Scene.getSceneForLayout(mContentParent, layoutResID,
                getContext());
        transitionTo(newScene);
    } else {
        mLayoutInflater.inflate(layoutResID, mContentParent);
    }
    mContentParent.requestApplyInsets();
    final Callback cb = getCallback();
    if (cb != null && !isDestroyed()) {
        cb.onContentChanged();
    }
    mContentParentExplicitlySet = true;
}
```

### installDecor

`installDecor`创建`mDecor`和`mContentParent`.

```java
private void installDecor() {
    mForceDecorInstall = false;
    if (mDecor == null) { //如果Decoder为空
        mDecor = generateDecor(-1); //调用generateDecor创建DecorView
        mDecor.setDescendantFocusability(ViewGroup.FOCUS_AFTER_DESCENDANTS);
        mDecor.setIsRootNamespace(true);
        if (!mInvalidatePanelMenuPosted && mInvalidatePanelMenuFeatures != 0) {
            mDecor.postOnAnimation(mInvalidatePanelMenuRunnable);
        }
    } else {
        mDecor.setWindow(this);//设置Window
    }
    if (mContentParent == null) { //调用generateLayout创建mContentParent
        mContentParent = generateLayout(mDecor);
        //...
    }
    //...
}
```

### generateDecor

```java
protected DecorView generateDecor(int featureId) {
    //...
    //创建DecorView
    return new DecorView(context, featureId, this, getAttributes());
}
```

### generateLayout

```java
//创建ViewGroup
protected ViewGroup generateLayout(DecorView decor) {
    //...
    int layoutResource; //布局资源
    int features = getLocalFeatures();
    //根据设置不同的特性，设置不同的布局
    // System.out.println("Features: 0x" + Integer.toHexString(features));
    if ((features & ((1 << FEATURE_LEFT_ICON) | (1 << FEATURE_RIGHT_ICON))) != 0) {
        if (mIsFloating) {
            TypedValue res = new TypedValue();
            getContext().getTheme().resolveAttribute(
                    R.attr.dialogTitleIconsDecorLayout, res, true);
            layoutResource = res.resourceId;
        } else {
            layoutResource = R.layout.screen_title_icons;
        }
        // XXX Remove this once action bar supports these features.
        removeFeature(FEATURE_ACTION_BAR);
        // System.out.println("Title Icons!");
    } else if ((features & ((1 << FEATURE_PROGRESS) | (1 << FEATURE_INDETERMINATE_PROGRESS))) != 0
            && (features & (1 << FEATURE_ACTION_BAR)) == 0) {
        // Special case for a window with only a progress bar (and title).
        // XXX Need to have a no-title version of embedded windows.
        layoutResource = R.layout.screen_progress;
        // System.out.println("Progress!");
    } else if ((features & (1 << FEATURE_CUSTOM_TITLE)) != 0) {
        // Special case for a window with a custom title.
        // If the window is floating, we need a dialog layout
        if (mIsFloating) {
            TypedValue res = new TypedValue();
            getContext().getTheme().resolveAttribute(
                    R.attr.dialogCustomTitleDecorLayout, res, true);
            layoutResource = res.resourceId;
        } else {
            layoutResource = R.layout.screen_custom_title;
        }
        // XXX Remove this once action bar supports these features.
        removeFeature(FEATURE_ACTION_BAR);
    } else if ((features & (1 << FEATURE_NO_TITLE)) == 0) {
        // If no other features and not embedded, only need a title.
        // If the window is floating, we need a dialog layout
        if (mIsFloating) {
            TypedValue res = new TypedValue();
            getContext().getTheme().resolveAttribute(
                    R.attr.dialogTitleDecorLayout, res, true);
            layoutResource = res.resourceId;
        } else if ((features & (1 << FEATURE_ACTION_BAR)) != 0) {
            layoutResource = a.getResourceId(
                    R.styleable.Window_windowActionBarFullscreenDecorLayout,
                    R.layout.screen_action_bar);
        } else {
            layoutResource = R.layout.screen_title;
        }
        // System.out.println("Title!");
    } else if ((features & (1 << FEATURE_ACTION_MODE_OVERLAY)) != 0) {
        layoutResource = R.layout.screen_simple_overlay_action_mode;
    } else {
        // Embedded, so no decoration is needed.
        layoutResource = R.layout.screen_simple;
        // System.out.println("Simple!");
    }
    mDecor.startChanging();
    //填充布局并添加到mDecor
    mDecor.onResourcesLoaded(mLayoutInflater, layoutResource);
    //调用findViewById获取id为R.id.content的ViewGroup
    ViewGroup contentParent = (ViewGroup)findViewById(ID_ANDROID_CONTENT);
    if (contentParent == null) { //如果获取不到，抛出异常
        throw new RuntimeException("Window couldn't find content container view");
    }
    //... 
    //返回 contentParent
    return contentParent;
}
```

`setContentView`方法通过`PhoneWindow`创建`DecorView`，并通过`findViewById`获取到`DecorView`的子View`mContentParent`，并把传入的`View`添加到`mContentParent`中。

### AT#handleResumeActivity

在`ActivityThread`的`handleResumeActivity`方法中，会调用`WindowManager`的`addView`方法添加`DecorView`。

```java
//frameworks/base/core/java/android/app/ActivityThread.java
@Override
public void handleResumeActivity(IBinder token, boolean finalStateRequest, boolean isForward,
        String reason) {
    //a赋值     
    final Activity a = r.activity;
    if (r.window == null && !a.mFinished && willBeVisible) {
        r.window = r.activity.getWindow(); //获取Window
        View decor = r.window.getDecorView(); //获取DecorView
        decor.setVisibility(View.INVISIBLE);
        ViewManager wm = a.getWindowManager(); //获取WindowManager
        WindowManager.LayoutParams l = r.window.getAttributes();
        a.mDecor = decor;
        l.type = WindowManager.LayoutParams.TYPE_BASE_APPLICATION;
        l.softInputMode |= forwardBit;
        if (r.mPreserveWindow) {
            a.mWindowAdded = true;
            r.mPreserveWindow = false;
            // Normally the ViewRoot sets up callbacks with the Activity
            // in addView->ViewRootImpl#setView. If we are instead reusing
            // the decor view we have to notify the view root that the
            // callbacks may have changed.
            ViewRootImpl impl = decor.getViewRootImpl();
            if (impl != null) {
                impl.notifyChildRebuilt();
            }
        }
        if (a.mVisibleFromClient) {
            if (!a.mWindowAdded) {//没有添加
                a.mWindowAdded = true;
                //调用WindowManager
                wm.addView(decor, l); 
            } else {
                //...
            }
        }
        //...
    } else if (!willBeVisible) {
      //...
    }
    //...
    Looper.myQueue().addIdleHandler(new Idler());
}
```

## WindowManager

`WindowManger`继承自`ViewManager`接口，负责View的添加、更新和移除。`ViewManager`为上述的3个操作提供了3个方法：

```java
public interface ViewManager
{
    public void addView(View view, ViewGroup.LayoutParams params);//添加View
    public void updateViewLayout(View view, ViewGroup.LayoutParams params);//更新View布局
    public void removeView(View view);//移除View
}
```

### WM创建过程

在`Activity`的`attach`方法会调用`ContextImpl`的`getSystemService`方法获取`WindowManager`。

```java
//frameworks/base/core/java/android/app/ContextImpl.java
public Object getSystemService(String name) {
    //...
  	//调用SystemServiceRegistry的getSystemService方法
    return SystemServiceRegistry.getSystemService(this, name);
}
```

```java
//frameworks/base/core/java/android/app/SystemServiceRegistry.java
public static Object getSystemService(ContextImpl ctx, String name) {
      if (name == null) {
          return null;
      }
      //获取ServiceFetcher
      final ServiceFetcher<?> fetcher = SYSTEM_SERVICE_FETCHERS.get(name);
      if (fetcher == null) {
          if (sEnableServiceNotFoundWtf) {
              Slog.wtf(TAG, "Unknown manager requested: " + name);
          }
          return null;
      }
      //从fetcher中获取服务
      final Object ret = fetcher.getService(ctx);
      //...
      return ret;
}
```

`SYSTEM_SERVICE_FETCHERS`是一个`ArrayMap`，`key`是服务名称，`value`是服务对象。

```java
private static final Map<String, ServiceFetcher<?>> SYSTEM_SERVICE_FETCHERS =
        new ArrayMap<String, ServiceFetcher<?>>();
```

`SystemServiceRegistry`的静态代码块中，注册了多个服务。

```java

static{
    //...
    //调用registerService注册WindManager
    registerService(Context.WINDOW_SERVICE, WindowManager.class,
            new CachedServiceFetcher<WindowManager>() {
        @Override
        public WindowManager createService(ContextImpl ctx) {
            return new WindowManagerImpl(ctx);//创建WindowManagerImpl
        }});
  //...
}
```

`registerService`方法很简单，就是将映射关系存入到`ArrayMap`中。

```java
private static <T> void registerService(@NonNull String serviceName,
        @NonNull Class<T> serviceClass, @NonNull ServiceFetcher<T> serviceFetcher) {
    SYSTEM_SERVICE_NAMES.put(serviceClass, serviceName);
    SYSTEM_SERVICE_FETCHERS.put(serviceName, serviceFetcher);//添加到map中
    SYSTEM_SERVICE_CLASS_NAMES.put(serviceName, serviceClass.getSimpleName());
}
```

在`attach`方法中，获取完`WindowManager`会调用`PhoneWindow`的`setWindowManager`方法。

```java
public void setWindowManager(WindowManager wm, IBinder appToken, String appName,
        boolean hardwareAccelerated) {
    mAppToken = appToken;
    mAppName = appName;
    mHardwareAccelerated = hardwareAccelerated;
    if (wm == null) {
        wm = (WindowManager)mContext.getSystemService(Context.WINDOW_SERVICE);
    }
    //调用WindowManagerImpl的createLocalWindowManager方法
    mWindowManager = ((WindowManagerImpl)wm).createLocalWindowManager(this);
}
```

```java
//frameworks/base/core/java/android/view/WindowManagerImpl.java
public WindowManagerImpl createLocalWindowManager(Window parentWindow) {
    return new WindowManagerImpl(mContext, parentWindow); //创建WindowManagerImpl
}
```

### addView

在`WindowManagerImpl`中有一个`WindowManagerGlobal`实例`mGlobal`。`WindowManagerImpl`的`addView`方法调用的是`WindowManagerGlobal`的`addView`方法。

```java
//frameworks/base/core/java/android/view/WindowManagerImpl.java
private final WindowManagerGlobal mGlobal = WindowManagerGlobal.getInstance();
@Override
public void addView(@NonNull View view, @NonNull ViewGroup.LayoutParams params) {
    applyDefaultToken(params);
    mGlobal.addView(view, params, mContext.getDisplayNoVerify(), mParentWindow,
            mContext.getUserId());
}
```

`WindowManagerGlobal`是一个单例对象，可以通过`getInstance`方法获取它的实例。

```java
//frameworks/base/core/java/android/view/WindowManagerGlobal.java
public static WindowManagerGlobal getInstance() {
    synchronized (WindowManagerGlobal.class) {
        if (sDefaultWindowManager == null) {
            sDefaultWindowManager = new WindowManagerGlobal();
        }
        return sDefaultWindowManager;
    }
}
```

`WindowManagerGlobal`的`addView`方法会创建`ViewRootImpl`对象，并调用`ViewRootImpl`的`setView方法`。

```java
private final ArrayList<View> mViews = new ArrayList<View>();
private final ArrayList<ViewRootImpl> mRoots = new ArrayList<ViewRootImpl>();
private final ArrayList<WindowManager.LayoutParams> mParams =
    new ArrayList<WindowManager.LayoutParams>();
public void addView(View view, ViewGroup.LayoutParams params,
        Display display, Window parentWindow, int userId) {
        //...
        //创建ViewRootImpl
        root = new ViewRootImpl(view.getContext(), display);

        view.setLayoutParams(wparams);
        //分别将View、ViewRootImpl和参数添加到对应的ArrayList中
        mViews.add(view);
        mRoots.add(root);
        mParams.add(wparams);

        // do this last because it fires off messages to start doing things
        try {
            root.setView(view, wparams, panelParentView, userId); //调用ViewRootImpl的setView方法
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

## ViewRootImpl

### 构造函数

```java
//frameworks/base/core/java/android/view/ViewRootImpl.java
public ViewRootImpl(Context context, Display display) {
    this(context, display, WindowManagerGlobal.getWindowSession(),//获取WindowSession
            false /* useSfChoreographer */);
}

public ViewRootImpl(Context context, Display display, IWindowSession session) {
    this(context, display, session, false /* useSfChoreographer */);
}

public ViewRootImpl(Context context, Display display, IWindowSession session,
        boolean useSfChoreographer) {
    mContext = context;
    mWindowSession = session;//WindowSession赋值
}
```

```java
public static IWindowSession getWindowSession() {
    synchronized (WindowManagerGlobal.class) {
        if (sWindowSession == null) {
            try {
                // Emulate the legacy behavior.  The global instance of InputMethodManager
                // was instantiated here.
                // TODO(b/116157766): Remove this hack after cleaning up @UnsupportedAppUsage
                InputMethodManager.ensureDefaultInstanceForDefaultDisplayIfNecessary();
                //获取WindowManagerService
                IWindowManager windowManager = getWindowManagerService();
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
public static IWindowManager getWindowManagerService() {
    synchronized (WindowManagerGlobal.class) {
        if (sWindowManagerService == null) {
            //获取代理类
            sWindowManagerService = IWindowManager.Stub.asInterface(
                    ServiceManager.getService("window"));
            try {
                if (sWindowManagerService != null) {
                    ValueAnimator.setDurationScale(
                            sWindowManagerService.getCurrentAnimatorScale());
                    sUseBLASTAdapter = sWindowManagerService.useBLAST();
                }
            } catch (RemoteException e) {
                throw e.rethrowFromSystemServer();
            }
        }
        return sWindowManagerService;
    }
}
```

### setView方法

```java
public void setView(View view, WindowManager.LayoutParams attrs, View panelParentView,
            int userId) {
    synchronized (this) {
        if (mView == null) {
            mView = view;
            try {
                //...
                //调用WindowSession的addToDisplayAsUser方法
                res = mWindowSession.addToDisplayAsUser(mWindow, mSeq, mWindowAttributes,
                        getHostVisibility(), mDisplay.getDisplayId(), userId, mTmpFrame,
                        mAttachInfo.mContentInsets, mAttachInfo.mStableInsets,
                        mAttachInfo.mDisplayCutout, inputChannel,
                        mTempInsets, mTempControls);
                setFrame(mTmpFrame);
            } catch (RemoteException e) {
              //...
            } finally {
                //...
            }

        }
    }
}
```

## WindowManagerService

### wms的注册

```java
//frameworks/base/services/java/com/android/server/SystemServer.java
WindowManagerService wm = null;
private void startOtherServices(@NonNull TimingsTraceAndSlog t) {
    //调用main方法获取WindowManagerService
    wm = WindowManagerService.main(context, inputManager, !mFirstBoot, mOnlyCore,
    new PhoneWindowManager(), mActivityManagerService.mActivityTaskManager);
    //添加服务
ServiceManager.addService(Context.WINDOW_SERVICE, wm, /* allowIsolated= */ false,
    DUMP_FLAG_PRIORITY_CRITICAL | DUMP_FLAG_PROTO);
  
}
```

```java
public static WindowManagerService main(final Context context, final InputManagerService im,
        final boolean showBootMsgs, final boolean onlyCore, WindowManagerPolicy policy,
        ActivityTaskManagerService atm) {
   //调用重载方法
    return main(context, im, showBootMsgs, onlyCore, policy, atm,
            SurfaceControl.Transaction::new, Surface::new, SurfaceControl.Builder::new);
}
```

```java
public static WindowManagerService main(final Context context, final InputManagerService im,
        final boolean showBootMsgs, final boolean onlyCore, WindowManagerPolicy policy,
        ActivityTaskManagerService atm, Supplier<SurfaceControl.Transaction> transactionFactory,
        Supplier<Surface> surfaceFactory,
        Function<SurfaceSession, SurfaceControl.Builder> surfaceControlFactory) {
   
    DisplayThread.getHandler().runWithScissors(() ->
            //创建WindowManagerService
            sInstance = new WindowManagerService(context, im, showBootMsgs, onlyCore, policy,
                    atm, transactionFactory, surfaceFactory, surfaceControlFactory), 0);
    return sInstance;
}
```



```java
public IWindowSession openSession(IWindowSessionCallback callback) {
    //创建Session，并传入WindowManagerService
    return new Session(this, callback);
}
```

## Session

```java
@Override
public int addToDisplayAsUser(IWindow window, int seq, WindowManager.LayoutParams attrs,
        int viewVisibility, int displayId, int userId, Rect outFrame,
        Rect outContentInsets, Rect outStableInsets,
        DisplayCutout.ParcelableWrapper outDisplayCutout, InputChannel outInputChannel,
        InsetsState outInsetsState, InsetsSourceControl[] outActiveControls) {
    //调用WindowManagerService的addWindow
    return mService.addWindow(this, window, seq, attrs, viewVisibility, displayId, outFrame,
            outContentInsets, outStableInsets, outDisplayCutout, outInputChannel,
            outInsetsState, outActiveControls, userId);
}

```













