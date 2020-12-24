# ViewModel源码分析

## 

```java
//ActivityViewModelLazyKt.class
@MainThread
inline fun <reified VM : ViewModel> ComponentActivity.viewModels(
    noinline factoryProducer: (() -> Factory)? = null
): Lazy<VM> {
    //如果Factory为空则调用getDefaultViewModelProviderFactory获取Factory
    //默认的Factory对象时SavedStateViewModelFactory
    val factoryPromise = factoryProducer ?: {
        defaultViewModelProviderFactory
    }
    //创建ViewModelLazy 
    //调用getViewModelStore方法获取ViewModelStore
    return ViewModelLazy(VM::class, { viewModelStore }, factoryPromise)
}
```

```java
@NonNull
@Override
public ViewModelProvider.Factory getDefaultViewModelProviderFactory() {
    if (getApplication() == null) {
        throw new IllegalStateException("Your activity is not yet attached to the "
                + "Application instance. You can't request ViewModel before onCreate call.");
    }
    if (mDefaultFactory == null) {
        mDefaultFactory = new SavedStateViewModelFactory(
                getApplication(),
                this,
                getIntent() != null ? getIntent().getExtras() : null);
    }
    return mDefaultFactory;
}
```

```java
//ViewModelLazy.kt
class ViewModelLazy<VM : ViewModel> (
    private val viewModelClass: KClass<VM>,
    private val storeProducer: () -> ViewModelStore,
    private val factoryProducer: () -> ViewModelProvider.Factory
) : Lazy<VM> {
    private var cached: VM? = null

    override val value: VM
        get() {
            val viewModel = cached
            return if (viewModel == null) {
                val factory = factoryProducer()
                val store = storeProducer()
                ViewModelProvider(store, factory).get(viewModelClass.java).also {
                    cached = it
                }
            } else {
                viewModel
            }
        }

    override fun isInitialized() = cached != null
}
```

```java
@Override
@Nullable
public final Object onRetainNonConfigurationInstance() {
    //旋转屏幕会触发该方法调用 将ViewModelStore存储到NonConfigurationInstances中
    Object custom = onRetainCustomNonConfigurationInstance();
    ViewModelStore viewModelStore = mViewModelStore;
    if (viewModelStore == null) {
        // No one called getViewModelStore(), so see if there was an existing
        // ViewModelStore from our last NonConfigurationInstance
        NonConfigurationInstances nc =
                (NonConfigurationInstances) getLastNonConfigurationInstance();
        if (nc != null) {
            viewModelStore = nc.viewModelStore;
        }
    }
    if (viewModelStore == null && custom == null) {
        return null;
    }
    NonConfigurationInstances nci = new NonConfigurationInstances();
    nci.custom = custom;
    nci.viewModelStore = viewModelStore;
    return nci;
}
```

```java
@NonNull
@Override
public ViewModelStore getViewModelStore() {
    if (getApplication() == null) {
        throw new IllegalStateException("Your activity is not yet attached to the "
                + "Application instance. You can't request ViewModel before onCreate call.");
    }
    if (mViewModelStore == null) {
       //调用getLastNonConfigurationInstance方法获取NonConfigurationInstances对象
        NonConfigurationInstances nc =
                (NonConfigurationInstances) getLastNonConfigurationInstance();
        if (nc != null) {
            // Restore the ViewModelStore from NonConfigurationInstances
            mViewModelStore = nc.viewModelStore;
        }
        if (mViewModelStore == null) {
            mViewModelStore = new ViewModelStore();
        }
    }
    return mViewModelStore;
}
```

## ViewModelProvider

```java
//构造函数
public ViewModelProvider(@NonNull ViewModelStore store, @NonNull Factory factory) {
    mFactory = factory;
    mViewModelStore = store;
}
```

```java
@NonNull
@MainThread
public <T extends ViewModel> T get(@NonNull Class<T> modelClass) {
    String canonicalName = modelClass.getCanonicalName();
    if (canonicalName == null) {
        throw new IllegalArgumentException("Local and anonymous classes can not be ViewModels");
    }
    return get(DEFAULT_KEY + ":" + canonicalName, modelClass);
}
```

```java
@SuppressWarnings("unchecked")
@NonNull
@MainThread
public <T extends ViewModel> T get(@NonNull String key, @NonNull Class<T> modelClass) {
    ViewModel viewModel = mViewModelStore.get(key);//从ViewModelStore中获取
    //判断是否是ViewModel类 
    //第一次为null 返回false
    if (modelClass.isInstance(viewModel)) {
        if (mFactory instanceof OnRequeryFactory) {
            ((OnRequeryFactory) mFactory).onRequery(viewModel);
        }
        return (T) viewModel;
    } else {
        //noinspection StatementWithEmptyBody
        if (viewModel != null) {
            // TODO: log a warning.
        }
    }
    
    if (mFactory instanceof KeyedFactory) {
        //调用Factory的create方法
        viewModel = ((KeyedFactory) (mFactory)).create(key, modelClass);
    } else {
        viewModel = (mFactory).create(modelClass);
    }
    mViewModelStore.put(key, viewModel);
    return (T) viewModel;
}
```

## Factory

![](../.gitbook/assets/image%20%2890%29.png)

```java
public SavedStateViewModelFactory(@NonNull Application application,
        @NonNull SavedStateRegistryOwner owner,
        @Nullable Bundle defaultArgs) {
    mSavedStateRegistry = owner.getSavedStateRegistry();
    mLifecycle = owner.getLifecycle();
    mDefaultArgs = defaultArgs;
    mApplication = application;
    //创建AndroidViewModelFactory
    mFactory = ViewModelProvider.AndroidViewModelFactory.getInstance(application);
}
```

```java
@NonNull
@Override
public <T extends ViewModel> T create(@NonNull String key, @NonNull Class<T> modelClass) {
    //是否是AndroidModel类
    boolean isAndroidViewModel = AndroidViewModel.class.isAssignableFrom(modelClass);
    Constructor<T> constructor;
    //获取构造函数
    if (isAndroidViewModel) {
        constructor = findMatchingConstructor(modelClass, ANDROID_VIEWMODEL_SIGNATURE);
    } else {
        constructor = findMatchingConstructor(modelClass, VIEWMODEL_SIGNATURE);
    }
    // doesn't need SavedStateHandle
    //如果构造函数为空
    //调用AndroidViewModelFactory的create方法
    if (constructor == null) {
        return mFactory.create(modelClass);
    }
    SavedStateHandleController controller = SavedStateHandleController.create(
            mSavedStateRegistry, mLifecycle, key, mDefaultArgs);
    try {
        T viewmodel;
        if (isAndroidViewModel) {
            viewmodel = constructor.newInstance(mApplication, controller.getHandle());
        } else {
            viewmodel = constructor.newInstance(controller.getHandle());
        }
        viewmodel.setTagIfAbsent(TAG_SAVED_STATE_HANDLE_CONTROLLER, controller);
        return viewmodel;
    } catch (IllegalAccessException e) {
        throw new RuntimeException("Failed to access " + modelClass, e);
    } catch (InstantiationException e) {
        throw new RuntimeException("A " + modelClass + " cannot be instantiated.", e);
    } catch (InvocationTargetException e) {
        throw new RuntimeException("An exception happened in constructor of "
                + modelClass, e.getCause());
    }
}
```

```java
//AndroidViewModelFactory
@NonNull
@Override
public <T extends ViewModel> T create(@NonNull Class<T> modelClass) {
    if (AndroidViewModel.class.isAssignableFrom(modelClass)) {
        //noinspection TryWithIdenticalCatches
        try {
            return modelClass.getConstructor(Application.class).newInstance(mApplication);
        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Cannot create an instance of " + modelClass, e);
        } catch (IllegalAccessException e) {
            throw new RuntimeException("Cannot create an instance of " + modelClass, e);
        } catch (InstantiationException e) {
            throw new RuntimeException("Cannot create an instance of " + modelClass, e);
        } catch (InvocationTargetException e) {
            throw new RuntimeException("Cannot create an instance of " + modelClass, e);
        }
    }
    //调用NewInstanceFactory的create方法
    return super.create(modelClass);
}
```

```java
public <T extends ViewModel> T create(@NonNull Class<T> modelClass) {
    //noinspection TryWithIdenticalCatches
    try { //调用无参构造函数
        return modelClass.newInstance();
    } catch (InstantiationException e) {
        throw new RuntimeException("Cannot create an instance of " + modelClass, e);
    } catch (IllegalAccessException e) {
        throw new RuntimeException("Cannot create an instance of " + modelClass, e);
    }
}
```

## 参考

* 
