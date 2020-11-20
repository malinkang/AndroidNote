# LiveData源码分析

## LiveData

`LiveData`和`RxJava`里的`Observable`类似，可以添加一个订阅者`Observer`。当`LiveData`的值发生变化时，`Observer`可以收到变化的值。所以源码分析主要分析`LiveData`的订阅和更新数据。

`RxJava`并没有提供与生命周期绑定的方法，一般我们可以通过第三方库[RxLifecycle](https://github.com/trello/RxLifecycle)或者[AutoDispose](https://github.com/uber/AutoDispose)来实现自动解绑。`LiveData`的`observe()`方法要求传递一个`LifecycleOwner`对象，当生命周期结束时自动解绑，避免内存泄露。



`LiveData`是一个抽象类，所以我们只能使用它的子类。



![LiveData类图](https://malinkang-1253444926.cos.ap-beijing.myqcloud.com/images/android/LiveData.png)

`LiveData`内部定义了一个`mVersion`来管理数据的版本。通过`observer()`传进来的`Observer`对象会被包装成一个`ObserverWrapper`对象，内部同样定义了一个`mLastVersion`。如果``ObserverWrapper``的`mLastVersion`小于`mVersion`就会分发数据。

```java
public abstract class LiveData<T>{
  int mActiveCount = 0; //活跃数
  private int mVersion;//版本号
  //和LifecycleRegistry一样 内部创建了一个SafeIterableMap来保存Observer
  private SafeIterableMap<Observer<? super T>, ObserverWrapper> mObservers =
        new SafeIterableMap<>();
}
```

## 订阅数据

我们有三种方式来订阅`LiveData`

* 扩展函数`observe()`
* `observe()`
* `observeForever()`

### 扩展函数observe()

扩展函数允许我们传入一个函数类型，内部还是调用的`observe()`

```java
//LiveData.kt
//LiveData扩展函数
@MainThread inline fun <T> LiveData<T>.observe(
    owner: LifecycleOwner,
    crossinline onChanged: (T) -> Unit
): Observer<T> {
    //创建Observer对象
    val wrappedObserver = Observer<T> { t -> onChanged.invoke(t) }
    //调用LiveData的observe对象
    observe(owner, wrappedObserver)
    return wrappedObserver
}
```

### observe()

`observe()`会首先判断是否在主线程中，不在主线程会直接抛异常。然后判断当前`LifecycleOwner`如果处于`DESTORYED`状态直接返回。如果以上两个条件都通过的话，传入的`Observer`会被包装成一个`LifecycleBoundObserver`对象，这个对象我们后面再进行介绍。然后以传入的`Observer`为`key`,创建的``LifecycleBoundObserver`为`value`存入到`mObservers`中，如果相同的`Observer`已经存在，则抛出异常。因此，不允许在不同的声明周期中添加相同的`Observer`。

```java
public void observe(@NonNull LifecycleOwner owner, @NonNull Observer<? super T> observer) {
  	//判断是否是主线程
    assertMainThread("observe");
  	//判断当前LifecycleOwner处于DESTORYED状态 直接返回
    if (owner.getLifecycle().getCurrentState() == DESTROYED) {
        // ignore
        return;
    }
    //创建一个包装类
    LifecycleBoundObserver wrapper = new LifecycleBoundObserver(owner, observer);
    //key 是observer类 value 是包装类
    //如果已经存在putIfAbsent返回之前的value，不存在存储当前值并返回null
    ObserverWrapper existing = mObservers.putIfAbsent(observer, wrapper);
    if (existing != null && !existing.isAttachedTo(owner)) {
       	//如果Observer类直接抛出异常
        throw new IllegalArgumentException("Cannot add the same observer"
                + " with different lifecycles");
    }
    if (existing != null) {
        return;
    }
    owner.getLifecycle().addObserver(wrapper);
}
```

### ObserverWrapper

ObserverWrapper是LiveData的内部抽象类。有两个子类`LifecycleBoundObserver`和`AlwaysActiveObserver`。

![image-20201120172611267](https://malinkang-1253444926.cos.ap-beijing.myqcloud.com/images/android/ObserverWrapper.png)



`ObserverWrapper`的`mLastVersion`用于与`LiveData`的`mVersion`进行比较。`shouldBeActive()`判断是否处于活跃状态。`isAttachedTo()`判断是否与`LifecycleOwner`绑定。`detachObserver()`用于移除`Observer`。活跃发生改变时会调用`activeStateChanged()`，活跃状态之前是不活跃并且传入的状态是活跃状态会调用`LiveData`的`onActive()`，如果不活跃的状态则会调用`LiveData`的`onInactive()`。如果是活跃状态，则会分发数据。

```java
private abstract class ObserverWrapper {
    final Observer<? super T> mObserver;
    boolean mActive;//是否处于活跃
    int mLastVersion = START_VERSION;

    ObserverWrapper(Observer<? super T> observer) {
        mObserver = observer;
    }
   //是否活跃
    abstract boolean shouldBeActive();
  	//判断Observer是否和LifecycleOwner有绑定关系
    boolean isAttachedTo(LifecycleOwner owner) {
        return false;
    }
  	//移除Observer
    void detachObserver() {
    }
  	//活跃状态发生改变
    void activeStateChanged(boolean newActive) {
        if (newActive == mActive) {
            return;
        }
        // immediately set active state, so we'd never dispatch anything to inactive
        // owner
        mActive = newActive;
        //如果活跃数为0 则表示之前是不活跃状态
        boolean wasInactive = LiveData.this.mActiveCount == 0;
        //如果是活跃的 活跃数+1 否则-1
        LiveData.this.mActiveCount += mActive ? 1 : -1;
      	//不活跃变为活跃 调用onActive()
        if (wasInactive && mActive) {
            onActive();
        }
      	//活跃数为0 变为不活跃调用onInactive
        if (LiveData.this.mActiveCount == 0 && !mActive) {
            onInactive();
        }
      	//分发数据
        if (mActive) {
            dispatchingValue(this);
        }
    }
}
```

#### LifecycleBoundObserver

当 `Lifecycle`的当前状态是` STARTED` 或者 `RESUMED` 时才认为` Observer` 是处于活跃状态。当调用`LifecycleOwner`的`addObserver()`会触发`onStateChanged()`，我们创建`LiveData`时赋值的`mData`就会调用`dispatchingValue()`发送出去。

```java
class LifecycleBoundObserver extends ObserverWrapper implements LifecycleEventObserver {
    @NonNull
    final LifecycleOwner mOwner;

    LifecycleBoundObserver(@NonNull LifecycleOwner owner, Observer<? super T> observer) {
        super(observer);
        mOwner = owner;
    }

    @Override
    boolean shouldBeActive() {
      	//当 Lifecycle 的当前状态是 STARTED 或者 RESUMED 时才认为 Observer 是处于活跃状态
        return mOwner.getLifecycle().getCurrentState().isAtLeast(STARTED);
    }

    @Override
    public void onStateChanged(@NonNull LifecycleOwner source,
            @NonNull Lifecycle.Event event) {
        //如果当前状态是DESTORYED 移除Observer
        if (mOwner.getLifecycle().getCurrentState() == DESTROYED) {
            removeObserver(mObserver);
            return;
        }
        activeStateChanged(shouldBeActive());
    }

    @Override
    boolean isAttachedTo(LifecycleOwner owner) {
        return mOwner == owner;
    }

    @Override
    void detachObserver() {
      	//移除Observer
        mOwner.getLifecycle().removeObserver(this);
    }
}
```

### observeForever()

通过observeForever()方法订阅，不受生命周期影响，一直处于活跃状态，也不会自动移除Observer。

```java
@MainThread
public void observeForever(@NonNull Observer<? super T> observer) {
    assertMainThread("observeForever");
    //创建AlwaysActiveObserver
    AlwaysActiveObserver wrapper = new AlwaysActiveObserver(observer);
    ObserverWrapper existing = mObservers.putIfAbsent(observer, wrapper);
    if (existing instanceof LiveData.LifecycleBoundObserver) {
        throw new IllegalArgumentException("Cannot add the same observer"
                + " with different lifecycles");
    }
    if (existing != null) {
        return;
    }
    wrapper.activeStateChanged(true);
}
```

```java
private class AlwaysActiveObserver extends ObserverWrapper {
    AlwaysActiveObserver(Observer<? super T> observer) {
        super(observer);
    }
    @Override
    boolean shouldBeActive() {
        return true; //一直活跃
    }
}
```

## 更新LiveData值

更新LiveData的值有两种方式

* setValue()：只能在主线程中更新值
* postValue()：可以在任意线程中更新值

### setValue()

```java
@MainThread
protected void setValue(T value) {
    assertMainThread("setValue");
    mVersion++; //版本增加
    mData = value; //将值赋值给mData
    dispatchingValue(null); //调用dispatchingValue()
}
```

```java
void dispatchingValue(@Nullable ObserverWrapper initiator) {
  	//如果正在分发值的时候，有新值更新则会认为当前值不可用
  //将mDispatchInvalidated赋值为false 循环将会中断
    if (mDispatchingValue) {
        mDispatchInvalidated = true;
        return;
    }
  	//设置为true
    mDispatchingValue = true;
    do {
        mDispatchInvalidated = false;
       //判断传入的ObserverWrapper是否为null
        if (initiator != null) {
            considerNotify(initiator);
            initiator = null;
        } else {
          	//遍历ObserverWrapper
            for (Iterator<Map.Entry<Observer<? super T>, ObserverWrapper>> iterator =
                    mObservers.iteratorWithAdditions(); iterator.hasNext(); ) {
                considerNotify(iterator.next().getValue());
                //中断遍历
                if (mDispatchInvalidated) {
                    break;
                }
            }
        }
    } while (mDispatchInvalidated);
    mDispatchingValue = false;
}
```

```java
private void considerNotify(ObserverWrapper observer) {
    if (!observer.mActive) {
        return;
    }
    // Check latest state b4 dispatch. Maybe it changed state but we didn't get the event yet.
    //
    // we still first check observer.active to keep it as the entrance for events. So even if
    // the observer moved to an active state, if we've not received that event, we better not
    // notify for a more predictable notification order.
    if (!observer.shouldBeActive()) {
        observer.activeStateChanged(false);
        return;
    }
    if (observer.mLastVersion >= mVersion) {
        return;
    }
    //修改版本号
    observer.mLastVersion = mVersion;
    //更新值
    observer.mObserver.onChanged((T) mData);
}
```



### postValue()

`postValue()`可以在任意线程中更新数据，其内部其实是把传入的值传递给`mPendingData`。然后在`mPostValueRunnable`调用`setValue`。`mPostValueRunnable`是一个`Runnable`对象，通过`Handler`发送给主线程。`mPendingData`在`mPostValueRunnable`中会被再次赋值为`NO_SET`。如果在`mPostValueRunnable`的`run`方法尚未执行时，再次调用`postValue()`,此时`postTask`为空，则直接返回。

```java
final Object mDataLock = new Object();
static final Object NOT_SET = new Object();
protected void postValue(T value) {
    boolean postTask;
    synchronized (mDataLock) {
        postTask = mPendingData == NOT_SET;
        mPendingData = value;
    }
    if (!postTask) {
        return;
    }
    ArchTaskExecutor.getInstance().postToMainThread(mPostValueRunnable);
}
```

```java
private final Runnable mPostValueRunnable = new Runnable() {
    @SuppressWarnings("unchecked")
    @Override
    public void run() {
        Object newValue;
        synchronized (mDataLock) {
            newValue = mPendingData;
            mPendingData = NOT_SET;
        }
        //调用setValue
        setValue((T) newValue);
    }
};
```



## TaskExecutor

在`postValue()`中，调用了`ArchTaskExecutor`的`postToMainThread`方法，将`mPostValueRunnable`传递到主线程，我们简单分析下`TaskExecutor`。

![](https://malinkang-1253444926.cos.ap-beijing.myqcloud.com/images/android/TaskExecutor.png)





```java
//双重校验锁实现单例
@NonNull
public static ArchTaskExecutor getInstance() {
    if (sInstance != null) {
        return sInstance;
    }
    synchronized (ArchTaskExecutor.class) {
        if (sInstance == null) {
            sInstance = new ArchTaskExecutor();
        }
    }
    return sInstance;
}
```

```java
//ArchTaskExecutor
@NonNull
private TaskExecutor mDefaultTaskExecutor;
private ArchTaskExecutor() {
  	//创建代理类
    mDefaultTaskExecutor = new DefaultTaskExecutor();
    mDelegate = mDefaultTaskExecutor;
}
@Override
public void postToMainThread(Runnable runnable) {
    //调用代理类DefaultTaskExecutor
    mDelegate.postToMainThread(runnable);
}
```

```java
//DefaultTaskExecutor
@Override
public void postToMainThread(Runnable runnable) {    
    if (mMainHandler == null) {
        synchronized (mLock) {
            if (mMainHandler == null) {
                //创建MainHandler
                mMainHandler = createAsync(Looper.getMainLooper());
            }
        }
    }
    //noinspection ConstantConditions
    mMainHandler.post(runnable);
}
```

```java
private static Handler createAsync(@NonNull Looper looper) {
    if (Build.VERSION.SDK_INT >= 28) {
        //>=28直接调用createAsync方法
        return Handler.createAsync(looper);
    }
    if (Build.VERSION.SDK_INT >= 16) {
        try {//>=16通过反射创建
            return Handler.class.getDeclaredConstructor(Looper.class, Handler.Callback.class,
                    boolean.class)
                    .newInstance(looper, null, true);
        } catch (IllegalAccessException ignored) {
        } catch (InstantiationException ignored) {
        } catch (NoSuchMethodException ignored) {
        } catch (InvocationTargetException e) {
            return new Handler(looper);
        }
    }
    //否则直接new一个Handler
    return new Handler(looper);
}
```

## 参考

* [从源码看 Jetpack（3）-LiveData 源码解析](https://juejin.cn/post/6847902222345633806)

