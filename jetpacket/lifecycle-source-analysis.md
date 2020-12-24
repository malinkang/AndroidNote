# Lifecycle源码分析

## Lifecycle

`Lifecycle`代表生命周期，是一个抽象类，我们经常使用它的子类`LifecycleRegistry`。

![](https://malinkang-1253444926.cos.ap-beijing.myqcloud.com/images/android/Lifecycle.png)

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

### Event

`Event`代表生命周期发生变化时发送的事件。

```java
@SuppressWarnings("WeakerAccess")
public enum Event {
    ON_CREATE, //onCreate发送该事件
    ON_START,
    ON_RESUME,
    ON_PAUSE,
    ON_STOP,
    ON_DESTROY,
    ON_ANY
}
```

### State

`State`代表当前生命周期状态。

```java
public enum State {
     //处于Destoryed状态，Lifecycle将不会发送任何事件
    DESTROYED,
    INITIALIZED,
    CREATED,
    STARTED,
    RESUMED;
     //比较当前状态大于或等于给定状态
    public boolean isAtLeast(@NonNull State state) {
        return compareTo(state) >= 0;
    }
}
```

![](../.gitbook/assets/image%20%28107%29.png)

## LifecycleOwner

`LifecycleOwner`即生命周期拥有者，是一个接口，只提供了一个获取生命周期的方法。

```java
public interface LifecycleOwner {
    @NonNull
    Lifecycle getLifecycle();
}
```

![](https://malinkang-1253444926.cos.ap-beijing.myqcloud.com/images/android/LifecycleOwner.png)

## LifecycleObserver

`LifecycleObserver`即生命周期的观察者，是一个空接口，里面没有任何方法。

![](https://malinkang-1253444926.cos.ap-beijing.myqcloud.com/images/android/LifecycleObserver.png)

### LifecycleEventObserver

`LifecycleEventObserver`接口提供了`onStateChanged`方法。当生命周期发生改变会触发`onStateChanged`方法。

```java
void onStateChanged(@NonNull LifecycleOwner source, @NonNull Lifecycle.Event event);
```

### FullLifecycleObserver

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

### GeneratedAdapterObserver

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

## ReportFragment

`ReportFragment`负责在生命周期发生变化时，调用`LifecycleEventObserver`的`onStateChanged`方法。`ComponentActivity`通过在`onCreate`方法中调用`ReportFragment`的静态方法`injectIfNeededIn`与`ReportFragment`进行关联。

```java
protected void onCreate(@Nullable Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    //传入当前的activity
    ReportFragment.injectIfNeededIn(this);
}
```

在`ReportFragment`的`injectIfNeededIn`方法中，会创建一个`ReportFragment`对象并添加到传入的`Activity`上。此外，大于29的版本还会调用`Activity`的`registerActivityLifecycleCallbacks`方法。

```java
public static void injectIfNeededIn(Activity activity) {
    if (Build.VERSION.SDK_INT >= 29) {
        // On API 29+, we can register for the correct Lifecycle callbacks directly
        //>=29 Android Q 直接调用activity的registerActivityLifecycleCallbacks方法。
        //registerActivityLifecycleCallbacks方法是29新增的
        activity.registerActivityLifecycleCallbacks(
                new LifecycleCallbacks());
    }
    // Prior to API 29 and to maintain compatibility with older versions of
    // ProcessLifecycleOwner (which may not be updated when lifecycle-runtime is updated and
    // need to support activities that don't extend from FragmentActivity from support lib),
    // use a framework fragment to get the correct timing of Lifecycle events
    android.app.FragmentManager manager = activity.getFragmentManager();
    if (manager.findFragmentByTag(REPORT_FRAGMENT_TAG) == null) {
        //创建ReportFragment 并添加到Fragment中
        manager.beginTransaction().add(new ReportFragment(), REPORT_FRAGMENT_TAG).commit();
        // Hopefully, we are the first to make a transaction.
        manager.executePendingTransactions();
    }
}
```

### dispatch\(\)

当`ReportFragment`的生命周期方法调用时，会调用`dispatch`方法。当`sdk`小于29不会调用该方法，而是在`LifecycleCallbacks`的回调方法中调用它的重载方法。

```java
private void dispatch(@NonNull Lifecycle.Event event) {
    //既然>=29不调用该方法，为什么injectIfNeededIn不直接大于等于29还要添加一个ReportFragment呢？
    if (Build.VERSION.SDK_INT < 29) {
        // Only dispatch events from ReportFragment on API levels prior
        // to API 29. On API 29+, this is handled by the ActivityLifecycleCallbacks
        // added in ReportFragment.injectIfNeededIn
        //调用重载方法
        dispatch(getActivity(), event);
    }
}
```

```java
//LifecycleCallbacks回调方法会直接调用该方法
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

## SafeIterableMap

![](https://malinkang-1253444926.cos.ap-beijing.myqcloud.com/images/android/SafeIterableMap.png)

`Lifecycle`中的所有`Observer`通过`SafeIterableMap`来管理的。`SafeIterableMap`的内部类`Entry`是一个双向链表。

```java
static class Entry<K, V> implements Map.Entry<K, V> {
    @NonNull
    final K mKey;
    @NonNull
    final V mValue;
    Entry<K, V> mNext; //指向下一个
    Entry<K, V> mPrevious; //指向后一个
    private WeakHashMap<SupportRemove<K, V>, Boolean> mIterators = new WeakHashMap<>();
}
```

`SafeIterableMap`内部定义的几个迭代器。

![](https://malinkang-1253444926.cos.ap-beijing.myqcloud.com/images/android/SafeIterableMap-Iterator.png)

`ListIterator`是一个抽象类，它的next方法会调用抽象方法`forward`。有两个子类`AscendingIterator`和`DescendingIterator`，分别实现正序遍历和逆序遍历。

```java
private abstract static class ListIterator<K, V> implements Iterator<Map.Entry<K, V>>,SupportRemove<K, V> {
    Entry<K, V> mExpectedEnd;
    Entry<K, V> mNext;
    ListIterator(Entry<K, V> start, Entry<K, V> expectedEnd) {
        this.mExpectedEnd = expectedEnd; //结束点
        this.mNext = start; //起始点
    }
    @Override
    public boolean hasNext() {
        return mNext != null;
    }
    @SuppressWarnings("ReferenceEquality")
    private Entry<K, V> nextNode() {
        if (mNext == mExpectedEnd || mExpectedEnd == null) {
            return null;
        }
        //调用forward方法
        return forward(mNext);
    }
    @Override
    public Map.Entry<K, V> next() {
        Map.Entry<K, V> result = mNext;
        mNext = nextNode();
        return result;
    }   
}
```

`AscendingIterator`起始点指向头部，不断向后遍历，`DescendingIterator`起始点指向尾部，不断向前遍历。

![](https://malinkang-1253444926.cos.ap-beijing.myqcloud.com/images/android/ListIterator.png)

```java
static class AscendingIterator<K, V> extends ListIterator<K, V> {
    AscendingIterator(Entry<K, V> start, Entry<K, V> expectedEnd) {
        super(start, expectedEnd);
    }
    @Override
    Entry<K, V> forward(Entry<K, V> entry) {
        return entry.mNext; //向后遍历
    }
    @Override
    Entry<K, V> backward(Entry<K, V> entry) {
        return entry.mPrevious;
    }
}
```

```java
private static class DescendingIterator<K, V> extends ListIterator<K, V> {
    DescendingIterator(Entry<K, V> start, Entry<K, V> expectedEnd) {
        super(start, expectedEnd);
    }
    @Override
    Entry<K, V> forward(Entry<K, V> entry) {
        return entry.mPrevious; //向前遍历
    }
    @Override
    Entry<K, V> backward(Entry<K, V> entry) {
        return entry.mNext;
    }
}
```

```java
public Iterator<Map.Entry<K, V>> descendingIterator() {
    //mEnd作为起始点
    DescendingIterator<K, V> iterator = new DescendingIterator<>(mEnd, mStart);
    mIterators.put(iterator, false);
    return iterator;
}
public Iterator<Map.Entry<K, V>> iterator() {
    //mStart作为起始点
    ListIterator<K, V> iterator = new AscendingIterator<>(mStart, mEnd);
    mIterators.put(iterator, false);
    return iterator;
}
```

```java
private class IteratorWithAdditions implements Iterator<Map.Entry<K, V>>, SupportRemove<K, V> {
    private Entry<K, V> mCurrent; //当前值
    private boolean mBeforeStart = true;
    IteratorWithAdditions() {
    }
    @SuppressWarnings("ReferenceEquality")
    @Override
    public void supportRemove(@NonNull Entry<K, V> entry) {
        if (entry == mCurrent) {
            mCurrent = mCurrent.mPrevious;
            mBeforeStart = mCurrent == null;
        }
    }
    @Override
    public boolean hasNext() {
        if (mBeforeStart) {
            return mStart != null;
        }
        return mCurrent != null && mCurrent.mNext != null;
    }
    @Override
    public Map.Entry<K, V> next() {
        //mBeforeStart默认是true 
        if (mBeforeStart) {
            //第一次调用next 
            mBeforeStart = false;
            mCurrent = mStart;
        } else {
            mCurrent = mCurrent != null ? mCurrent.mNext : null;
        }
        return mCurrent;
    }
}
```

## LifecycleRegistry

`LifecycleRegistry`是`Lifecycle`的子类，实现了具体的添加、删除`LifecycleObserver`和处理`Event`的操作。`ComponentActivity`就是直接调用`LifecycleRegistry`的构造函数创建`Lifecycle`实例。

```java
//ComponentActivity
private LifecycleRegistry mLifecycleRegistry = new LifecycleRegistry(this);
public Lifecycle getLifecycle() {
    return mLifecycleRegistry;
}
```

### 构造函数

```java
//持有LifecycleOwner的一个弱引用避免内存泄露
private State mState;
private final WeakReference<LifecycleOwner> mLifecycleOwner;
//创建FastSafeIterableMap对象存储
private FastSafeIterableMap<LifecycleObserver, ObserverWithState> mObserverMap =
            new FastSafeIterableMap<>();
public LifecycleRegistry(@NonNull LifecycleOwner provider) {
    mLifecycleOwner = new WeakReference<>(provider);
    mState = INITIALIZED; //当前状态为初始化
}
```

### addObserver\(\)

`addObserver`方法中会把传入的`Observer`对象包装成一个`ObserverWithState`对象，并存入到`mObserverMap`中。并且获取当前的状态`targetState`与`Observer`的状态进行比较，如果`Observer`的状态小于目标状态则会循环分发事件，直到`Observer`的状态和`targetState`一致。比如`targetState`是`STARTED`类，`Observer`会依次分发`ON_CREATE`、`ON_START`和`ON_RESUME`事件。

```java
@Override
public void addObserver(@NonNull LifecycleObserver observer) {
    //获取初始状态
    State initialState = mState == DESTROYED ? DESTROYED : INITIALIZED;
    //创建ObserverWithState
    ObserverWithState statefulObserver = new ObserverWithState(observer, initialState);
    //添加到FastSafeIterableMap中 
    //如果添加的LifecycleObserver已经存在 则直接返回存在的value
    ObserverWithState previous = mObserverMap.putIfAbsent(observer, statefulObserver);
    //如果已经添加过，则不重复添加直接返回
    if (previous != null) {
        return;
    }
    LifecycleOwner lifecycleOwner = mLifecycleOwner.get();
    if (lifecycleOwner == null) {
        // it is null we should be destroyed. Fallback quickly
        return;
    }
    //正在添加Observer或者正在处理事件
    boolean isReentrance = mAddingObserverCounter != 0 || mHandlingEvent;
    //计算目标状态
    State targetState = calculateTargetState(observer);
    //正在添加的Observer数量
    mAddingObserverCounter++;
    //如果Observer的状态小于目标状态
    while ((statefulObserver.mState.compareTo(targetState) < 0
            && mObserverMap.contains(observer))) {
        pushParentState(statefulObserver.mState);
        //分发事件
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

```java
private State calculateTargetState(LifecycleObserver observer) {
    //获取前一个Entry
    Entry<LifecycleObserver, ObserverWithState> previous = mObserverMap.ceil(observer);
    //如果前一个Entry不为空，返回前一个Entry的状态
    State siblingState = previous != null ? previous.getValue().mState : null;
    //获取parentState
    State parentState = !mParentStates.isEmpty() ? mParentStates.get(mParentStates.size() - 1)
            : null;
    return min(min(mState, siblingState), parentState);
}
```

### ObserverWithState

`ObserverWithState`是`LifecycleRegistry`的内部类。通过调用`Lifecycling`的`lifecycleEventObserver`方法，将传入的`Observer`对象转换为`LifecycleEventObserver`对象。并且添加了一个`mState`字段来保存`Observer`的状态。

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

### handleLifecycleEvent\(\)

`ReportFragment`的dispatch方法会调用LifecycleRegistry的handleLifecycleEvent方法来处理Event。

```java
public void handleLifecycleEvent(@NonNull Lifecycle.Event event) {
    //获取Event对应的State
    State next = getStateAfter(event);
    moveToState(next);
}
```

```java
private void moveToState(State next) {
    if (mState == next) {
        return;
    }
    mState = next;
    if (mHandlingEvent || mAddingObserverCounter != 0) {
        mNewEventOccurred = true;
        // we will figure out what to do on upper level.
        return;
    }
    mHandlingEvent = true;
    sync();
    mHandlingEvent = false;
}
```

`handleLifecycleEvent`方法最终会调用sync方法来同步所有`Observer`的状态。在sync中，如果当前`State`小于链表中第一`Observer`的`State`，会调用backwardPass方法后向前同步所有`Observer`的`Sate`。如果当前状态大于最后一个`Observer`的`State`，调用`forwardPass`从前向后遍历`Observer`同步`State`。

```java
private void sync() {
    LifecycleOwner lifecycleOwner = mLifecycleOwner.get();
    if (lifecycleOwner == null) {
        throw new IllegalStateException("LifecycleOwner of this LifecycleRegistry is already"
                + "garbage collected. It is too late to change lifecycle state.");
    }
    while (!isSynced()) {
        mNewEventOccurred = false;
        // no need to check eldest for nullability, because isSynced does it for us.
        //如果当前State小于链表中第一Observer的State 
        //调用backwardPass方法后向前同步所有Observer的Sate
        if (mState.compareTo(mObserverMap.eldest().getValue().mState) < 0) {
            backwardPass(lifecycleOwner);
        }
        //获取链表中最后一个Entry
        Entry<LifecycleObserver, ObserverWithState> newest = mObserverMap.newest();
        //如果当前状态大于最后一个Observer的State
        //调用forwardPass从前向后遍历Observer同步State
        if (!mNewEventOccurred && newest != null
                && mState.compareTo(newest.getValue().mState) > 0) {
            forwardPass(lifecycleOwner);
        }
    }
    mNewEventOccurred = false;
}
```

### backwardPass\(\)

```java
private void backwardPass(LifecycleOwner lifecycleOwner) {
    Iterator<Entry<LifecycleObserver, ObserverWithState>> descendingIterator =
            mObserverMap.descendingIterator();
    while (descendingIterator.hasNext() && !mNewEventOccurred) {
        Entry<LifecycleObserver, ObserverWithState> entry = descendingIterator.next();
        //获取对应的observer对象
        ObserverWithState observer = entry.getValue();
        while ((observer.mState.compareTo(mState) > 0 && !mNewEventOccurred
                && mObserverMap.contains(entry.getKey()))) {
            Event event = downEvent(observer.mState);
            pushParentState(getStateAfter(event));
            //调用Observer的dispatchEvent方法
            observer.dispatchEvent(lifecycleOwner, event);
            popParentState();
        }
    }
}
```

```java
private static Event downEvent(State state) {
    switch (state) {
        case INITIALIZED:
            throw new IllegalArgumentException();
        case CREATED:
            return ON_DESTROY;
        case STARTED:
            return ON_STOP;
        case RESUMED:
            return ON_PAUSE;
        case DESTROYED:
            throw new IllegalArgumentException();
    }
    throw new IllegalArgumentException("Unexpected state value " + state);
}
```

## Lifecycling

### lifecycleEventObserver\(\)

`lifecycleEventObserver`方法负责通过传入`LifecycleObserver`对象构建一个`LifecycleEventObserver`对象。

```java
//方法参数为什么不定义为LifecycleObserver？？
@NonNull
static LifecycleEventObserver lifecycleEventObserver(Object object) {
    
    boolean isLifecycleEventObserver = object instanceof LifecycleEventObserver;
    boolean isFullLifecycleObserver = object instanceof FullLifecycleObserver;
    //如果实现了LifecycleEventObserver和FullLifecycleObserver两个接口
    //创建FullLifecycleObserverAdapter
    if (isLifecycleEventObserver && isFullLifecycleObserver) {
        return new FullLifecycleObserverAdapter((FullLifecycleObserver) object,
                (LifecycleEventObserver) object);
    }
    //如果只实现了LifecycleEventObserver创建FullLifecycleObserverAdapter
    //传入的LifecycleEventObserver为null
    if (isFullLifecycleObserver) {
        return new FullLifecycleObserverAdapter((FullLifecycleObserver) object, null);
    }
    //如果只实现了FullLifecycleObserver 直接强转返回
    if (isLifecycleEventObserver) {
        return (LifecycleEventObserver) object;
    }
    final Class<?> klass = object.getClass();
    //获取类型
    int type = getObserverConstructorType(klass);
    if (type == GENERATED_CALLBACK) {
        //从Map中获取构造函数
        List<Constructor<? extends GeneratedAdapter>> constructors =
                sClassToAdapters.get(klass);
        //如果只有一个构造函数 直接返回SingleGeneratedAdapterObserver
        if (constructors.size() == 1) {
            GeneratedAdapter generatedAdapter = createGeneratedAdapter(
                    constructors.get(0), object);
            return new SingleGeneratedAdapterObserver(generatedAdapter);
        }
        //如果有多个构造函数 则创建CompositeGeneratedAdaptersObserver
        GeneratedAdapter[] adapters = new GeneratedAdapter[constructors.size()];
        for (int i = 0; i < constructors.size(); i++) {
            adapters[i] = createGeneratedAdapter(constructors.get(i), object);
        }
        return new CompositeGeneratedAdaptersObserver(adapters);
    }
    //否则返回ReflectiveGenericLifecycleObserver
    return new ReflectiveGenericLifecycleObserver(object);
}
```

### getObserverConstructorType

```java
private static int getObserverConstructorType(Class<?> klass) {
    //从缓存中取
    Integer callbackCache = sCallbackCache.get(klass);
    if (callbackCache != null) {
        return callbackCache;
    }
    //解析ObserverCallback
    int type = resolveObserverCallbackType(klass);
    sCallbackCache.put(klass, type);
    return type;
}
```

### resolveObserverCallbackType

```java
private static int resolveObserverCallbackType(Class<?> klass) {
    // anonymous class bug:35073837
    if (klass.getCanonicalName() == null) {
        return REFLECTIVE_CALLBACK;
    }
    //获取构造函数
    Constructor<? extends GeneratedAdapter> constructor = generatedConstructor(klass)
    if (constructor != null) {
        //构造函数不为空 存入map中
        sClassToAdapters.put(klass, Collections
                .<Constructor<? extends GeneratedAdapter>>singletonList(constructor))
        return GENERATED_CALLBACK;
    }
    boolean hasLifecycleMethods = ClassesInfoCache.sInstance.hasLifecycleMethods(klas
    if (hasLifecycleMethods) {
        return REFLECTIVE_CALLBACK;
    }
    Class<?> superclass = klass.getSuperclass();
    List<Constructor<? extends GeneratedAdapter>> adapterConstructors = null;
    if (isLifecycleParent(superclass)) {
        if (getObserverConstructorType(superclass) == REFLECTIVE_CALLBACK) {
            return REFLECTIVE_CALLBACK;
        }
        adapterConstructors = new ArrayList<>(sClassToAdapters.get(superclass));
    }
    for (Class<?> intrface : klass.getInterfaces()) {
        if (!isLifecycleParent(intrface)) {
            continue;
        }
        if (getObserverConstructorType(intrface) == REFLECTIVE_CALLBACK) {
            return REFLECTIVE_CALLBACK;
        }
        if (adapterConstructors == null) {
            adapterConstructors = new ArrayList<>();
        }
        adapterConstructors.addAll(sClassToAdapters.get(intrface));
    }
    if (adapterConstructors != null) {
        sClassToAdapters.put(klass, adapterConstructors);
        return GENERATED_CALLBACK;
    }
    return REFLECTIVE_CALLBACK;
}
```

### generatedConstructor\(\)

`generatedConstructor`方法获取生成的`GeneratedAdapter`的构造函数。

```java
@Nullable
private static Constructor<? extends GeneratedAdapter> generatedConstructor(Class<?> klass) {
    try {
        Package aPackage = klass.getPackage();
        String name = klass.getCanonicalName();
        //获取包名
        final String fullPackage = aPackage != null ? aPackage.getName() : "";
        //获取adapterName
        final String adapterName = getAdapterName(fullPackage.isEmpty() ? name :
                name.substring(fullPackage.length() + 1));
        //获取Class对象
        @SuppressWarnings("unchecked") final Class<? extends GeneratedAdapter> aClass =
                (Class<? extends GeneratedAdapter>) Class.forName(
                        fullPackage.isEmpty() ? adapterName : fullPackage + "." + adapterName);
        //构造函数
        Constructor<? extends GeneratedAdapter> constructor =
                aClass.getDeclaredConstructor(klass);
        if (!constructor.isAccessible()) {
            constructor.setAccessible(true);
        }
        return constructor;
    } catch (ClassNotFoundException e) {
        return null;
    } catch (NoSuchMethodException e) {
        // this should not happen
        throw new RuntimeException(e);
    }
}
```

## 参考

* [从源码看 Jetpack（1） -Lifecycle源码解析](https://juejin.im/post/6847902220755992589)

