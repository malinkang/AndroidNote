# Lifecycle源码分析



![](../.gitbook/assets/image%20%2892%29.png)

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

![](../.gitbook/assets/image%20%2893%29.png)

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

