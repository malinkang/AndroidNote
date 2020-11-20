# LiveData源码分析



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

```java
public void observe(@NonNull LifecycleOwner owner, @NonNull Observer<? super T> observer) {
    assertMainThread("observe");
    if (owner.getLifecycle().getCurrentState() == DESTROYED) {
        // ignore
        return;
    }
    //创建一个包装类
    LifecycleBoundObserver wrapper = new LifecycleBoundObserver(owner, observer);
    //key 是observer类 value 是包装类
    ObserverWrapper existing = mObservers.putIfAbsent(observer, wrapper);
    if (existing != null && !existing.isAttachedTo(owner)) {
        throw new IllegalArgumentException("Cannot add the same observer"
                + " with different lifecycles");
    }
    if (existing != null) {
        return;
    }
    owner.getLifecycle().addObserver(wrapper);
}
```

## postValue\(\)

```java
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

## TaskExecutor

![](../.gitbook/assets/image%20%2899%29.png)



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

* [LiveData with Coroutines and Flow — Part I: Reactive UIs](https://medium.com/androiddevelopers/livedata-with-coroutines-and-flow-part-i-reactive-uis-b20f676d25d7)
* [LiveData with Coroutines and Flow — Part II: Launching coroutines with Architecture Components](https://medium.com/androiddevelopers/livedata-with-coroutines-and-flow-part-ii-launching-coroutines-with-architecture-components-337909f37ae7)
* [LiveData with Coroutines and Flow — Part III: LiveData and coroutines patterns](https://medium.com/androiddevelopers/livedata-with-coroutines-and-flow-part-iii-livedata-and-coroutines-patterns-592485a4a85a)

* [理解协程、LiveData 和 Flow](https://juejin.cn/post/6844904158466670599)