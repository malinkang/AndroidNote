# Lifecycle源码分析

## Lifecycle

`Lifecycle`代表生命周期，是一个抽象类，我们经常使用它的子类`LifecycleRegistry`。

![](../.gitbook/assets/image%20%2891%29.png)

`Lifecycle`提供了三个抽象方法用来添加、删除`LifecycleObserver`和获取当前`Lifecycle`状态。

```java
@MainThread
public abstract void addObserver(@NonNull LifecycleObserver observer);
@MainThread
public abstract void removeObserver(@NonNull LifecycleObserver observer);
@MainThread
@NonNull
public abstract State getCurrentState();
```

`Lifecycle`还提供了两个内部枚举`Event`和`State`。

`Event`代表生命周期发生变化时发送的事件。

```java
@SuppressWarnings("WeakerAccess")
public enum Event {
    /**
     * Constant for onCreate event of the {@link LifecycleOwner}.
     */
    ON_CREATE, //onCreate发送该事件
    /**
     * Constant for onStart event of the {@link LifecycleOwner}.
     */
    ON_START,
    /**
     * Constant for onResume event of the {@link LifecycleOwner}.
     */
    ON_RESUME,
    /**
     * Constant for onPause event of the {@link LifecycleOwner}.
     */
    ON_PAUSE,
    /**
     * Constant for onStop event of the {@link LifecycleOwner}.
     */
    ON_STOP,
    /**
     * Constant for onDestroy event of the {@link LifecycleOwner}.
     */
    ON_DESTROY,
    /**
     * An {@link Event Event} constant that can be used to match all events.
     */
    ON_ANY
}
```

`State`代表当前生命周期状态。

```java
public enum State {
    /**
     * Destroyed state for a LifecycleOwner. After this event, this Lifecycle will not dispatch
     * any more events. For instance, for an {@link android.app.Activity}, this state is reached
     * <b>right before</b> Activity's {@link android.app.Activity#onDestroy() onDestroy} call.
     */
     //处于Destoryed状态，Lifecycle将不会发送任何事件
    DESTROYED,
    /**
     * Initialized state for a LifecycleOwner. For an {@link android.app.Activity}, this is
     * the state when it is constructed but has not received
     * {@link android.app.Activity#onCreate(android.os.Bundle) onCreate} yet.
     */
    INITIALIZED,
    /**
     * Created state for a LifecycleOwner. For an {@link android.app.Activity}, this state
     * is reached in two cases:
     * <ul>
     *     <li>after {@link android.app.Activity#onCreate(android.os.Bundle) onCreate} call;
     *     <li><b>right before</b> {@link android.app.Activity#onStop() onStop} call.
     * </ul>
     */
    CREATED,
    /**
     * Started state for a LifecycleOwner. For an {@link android.app.Activity}, this state
     * is reached in two cases:
     * <ul>
     *     <li>after {@link android.app.Activity#onStart() onStart} call;
     *     <li><b>right before</b> {@link android.app.Activity#onPause() onPause} call.
     * </ul>
     */
    STARTED,
    /**
     * Resumed state for a LifecycleOwner. For an {@link android.app.Activity}, this state
     * is reached after {@link android.app.Activity#onResume() onResume} is called.
     */
    RESUMED;
    /**
     * Compares if this State is greater or equal to the given {@code state}.
     *
     * @param state State to compare with
     * @return true if this State is greater or equal to the given {@code state}
     */
     //比较当前状态大于或等于给定状态
    public boolean isAtLeast(@NonNull State state) {
        return compareTo(state) >= 0;
    }
}
```

## LifecycleOwner

`LifecycleOwner`即生命周期拥有者，是一个接口，只提供了一个获取生命周期的方法。

```java
public interface LifecycleOwner {
    @NonNull
    Lifecycle getLifecycle();
}
```

![](../.gitbook/assets/image%20%2895%29.png)

```java
//添加Observer
@Override
public void addObserver(@NonNull LifecycleObserver observer) {
    State initialState = mState == DESTROYED ? DESTROYED : INITIALIZED;
    //过传进来的Observer对象，创建出 ObserverWithState 对象
    ObserverWithState statefulObserver = new ObserverWithState(observer, initialState);
    //将LifecycleObserver对象放入一个FastSafeIterableMap 中
    ObserverWithState previous = mObserverMap.putIfAbsent(observer, statefulObserver);
    if (previous != null) {
        return;
    }
    LifecycleOwner lifecycleOwner = mLifecycleOwner.get();
    if (lifecycleOwner == null) {
        // it is null we should be destroyed. Fallback quickly
        return;
    }
    boolean isReentrance = mAddingObserverCounter != 0 || mHandlingEvent;
    State targetState = calculateTargetState(observer);
    mAddingObserverCounter++;
    while ((statefulObserver.mState.compareTo(targetState) < 0
            && mObserverMap.contains(observer))) {
        pushParentState(statefulObserver.mState);
        statefulObserver.dispatchEvent(lifecycleOwner, upEvent(statefulObserver.mState));
        popParentState();
        // mState / subling may have been changed recalculate
        targetState = calculateTargetState(observer);
    }
    if (!isReentrance) {
        // we do sync only on the top level.
        sync();
    }
    mAddingObserverCounter--;
}
```

## LifecycleObserver

`LifecycleObserver`即生命周期的观察者，是一个空接口，里面没有任何方法。

![](../.gitbook/assets/image%20%2894%29.png)

`LifecycleEventObserver`接口提供了`onStateChanged`方法。当生命周期发生改变会触发`onStateChanged`方法。

```java
void onStateChanged(@NonNull LifecycleOwner source, @NonNull Lifecycle.Event event);
```

`FullLifecycleObserver`接口提供了与`Activity`和`Fragment`生命周期同名方法，当触发生命周期，会触发同名方法调用。

```java
interface FullLifecycleObserver extends LifecycleObserver {

    void onCreate(LifecycleOwner owner);

    void onStart(LifecycleOwner owner);

    void onResume(LifecycleOwner owner);

    void onPause(LifecycleOwner owner);

    void onStop(LifecycleOwner owner);

    void onDestroy(LifecycleOwner owner);
}
```

`SingleGeneratedAdapterObserver`内部包含一个`GeneratedAdapter`对象。`CompositeGeneratedAdaptersObserver`内部包含一个`GeneratedAdapter`数组，当`onStateChanged`调用时会调用`GeneratedAdapter`的`callMethods`方法。

当我们自定义`Observer`对象时，会根据`@OnLifecycleEvent`注解生成对应的`GeneratedAdapter`子类。

```java
//我们定义的子类
class MyObserver :LifecycleObserver {
    companion object{
        const val TAG = "MyObserver"
    }
    @OnLifecycleEvent(Lifecycle.Event.ON_RESUME)
    fun connectListener(){
        Log.d(TAG, "connectListener: ")
    }
    @OnLifecycleEvent(Lifecycle.Event.ON_PAUSE)
    fun disconnectListener(){
        Log.d(TAG, "disconnectListener: ")
    }
}
```

```java
//生成的GeneratedAdapter
public class MyObserver_LifecycleAdapter implements GeneratedAdapter {
  final MyObserver mReceiver;

  MyObserver_LifecycleAdapter(MyObserver receiver) {
    this.mReceiver = receiver;
  }

  @Override
  public void callMethods(LifecycleOwner owner, Lifecycle.Event event, boolean onAny,
      MethodCallsLogger logger) {
    boolean hasLogger = logger != null;
    if (onAny) {
      return;
    }
    if (event == Lifecycle.Event.ON_RESUME) {
      if (!hasLogger || logger.approveCall("connectListener", 1)) {
        mReceiver.connectListener();
      }
      return;
    }
    if (event == Lifecycle.Event.ON_PAUSE) {
      if (!hasLogger || logger.approveCall("disconnectListener", 1)) {
        mReceiver.disconnectListener();
      }
      return;
    }
  }
}
```



```java
//ObserverWithState是LifecycleRegistry的静态内部类
static class ObserverWithState {
    State mState;
    LifecycleEventObserver mLifecycleObserver;
    ObserverWithState(LifecycleObserver observer, State initialState) {
        //调用Lifecycling的lifecycleEventObserver方法创建一个LifecycleEventObserver对象
        mLifecycleObserver = Lifecycling.lifecycleEventObserver(observer);
        mState = initialState;
    }
    void dispatchEvent(LifecycleOwner owner, Event event) {
        State newState = getStateAfter(event);
        mState = min(mState, newState);
        mLifecycleObserver.onStateChanged(owner, event);
        mState = newState;
    }
}
```

```java
//ComponentActivity
@Override
protected void onCreate(@Nullable Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    mSavedStateRegistryController.performRestore(savedInstanceState);
    //创建一个ReportFragment
    ReportFragment.injectIfNeededIn(this);
    if (mContentLayoutId != 0) {
        setContentView(mContentLayoutId);
    }
}
```

```java
//ReportFragment
//当执行生命周期方法时会调用dispatch方法
static void dispatch(@NonNull Activity activity, @NonNull Lifecycle.Event event) {
    if (activity instanceof LifecycleRegistryOwner) {
        ((LifecycleRegistryOwner) activity).getLifecycle().handleLifecycleEvent(event);
        return;
    }
    if (activity instanceof LifecycleOwner) {
        Lifecycle lifecycle = ((LifecycleOwner) activity).getLifecycle();
        if (lifecycle instanceof LifecycleRegistry) {
            //最终调用observer的dispatch方法
            ((LifecycleRegistry) lifecycle).handleLifecycleEvent(event);
        }
    }
}
```

## 参考

* [从源码看 Jetpack（1） -Lifecycle源码解析](https://juejin.im/post/6847902220755992589)

