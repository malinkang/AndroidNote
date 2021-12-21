# ViewModel源码分析

为什么要使用反射创建ViewModel？我觉得应该是为了保证只存在一个ViewModel的实例。所以通过Map存储。如果单独需要创建，并添加到map中。设计者可能是为了解耦这个过程。所以通过反射来创建。

## 创建

```kotlin
//activity/activity-ktx/src/main/java/androidx/activity/ActivityViewModelLazy.kt
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
//activity/activity/src/main/java/androidx/activity/ComponentActivity.java
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
//lifecycle/lifecycle-viewmodel/src/main/java/androidx/lifecycle/ViewModelLazy.kt
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

### ViewModelProvider

提供者，负责调用工厂创建ViewModel并存储到ViewStore中或者从ViewStore中读取ViewModel

```kotlin
//lifecycle/lifecycle-viewmodel/src/main/java/androidx/lifecycle/ViewModelProvider.kt
public open operator fun <T : ViewModel> get(modelClass: Class<T>): T {
    val canonicalName = modelClass.canonicalName
        ?: throw IllegalArgumentException("Local and anonymous classes can not be ViewModels")
    return get("$DEFAULT_KEY:$canonicalName", modelClass)
}

```

```kotlin
//lifecycle/lifecycle-viewmodel/src/main/java/androidx/lifecycle/ViewModelProvider.kt
public open operator fun <T : ViewModel> get(key: String, modelClass: Class<T>): T {
//调用ViewModelStore的重载运算符判断是否有缓存
    val viewModel = store[key]
    if (modelClass.isInstance(viewModel)) {
        (factory as? OnRequeryFactory)?.onRequery(viewModel)
        return viewModel as T
    } else {
        @Suppress("ControlFlowWithEmptyBody")
        if (viewModel != null) {
            // TODO: log a warning.
        }
    }
    val extras = MutableCreationExtras()
    extras[VIEW_MODEL_KEY] = key
    return factory.create(
        modelClass,
        CombinedCreationExtras(extras, defaultCreationExtras)
    ).also { store.put(key, it) }
}
```

```java
//lifecycle/lifecycle-viewmodel-savedstate/src/main/java/androidx/lifecycle/SavedStateViewModelFactory.java
public <T extends ViewModel> T create(@NonNull String key, @NonNull Class<T> modelClass) {
    // empty constructor was called.
    if (mLifecycle == null) {
        throw new UnsupportedOperationException(
                "SavedStateViewModelFactory constructed "
                        + "with empty constructor supports only calls to "
                        + "create(modelClass: Class<T>, extras: CreationExtras)."
        );
    }

    boolean isAndroidViewModel = AndroidViewModel.class.isAssignableFrom(modelClass);
    Constructor<T> constructor;
    if (isAndroidViewModel && mApplication != null) {
        constructor = findMatchingConstructor(modelClass, ANDROID_VIEWMODEL_SIGNATURE);
    } else {
        constructor = findMatchingConstructor(modelClass, VIEWMODEL_SIGNATURE);
    }
    // doesn't need SavedStateHandle
    if (constructor == null) {
        return mFactory.create(modelClass);
    }

    SavedStateHandleController controller = LegacySavedStateHandleController.create(
            mSavedStateRegistry, mLifecycle, key, mDefaultArgs);
    T viewmodel;
    if (isAndroidViewModel && mApplication != null) {
        viewmodel = newInstance(modelClass, constructor, mApplication, controller.getHandle());
    } else {
        viewmodel = newInstance(modelClass, constructor, controller.getHandle());
    }
    viewmodel.setTagIfAbsent(TAG_SAVED_STATE_HANDLE_CONTROLLER, controller);
    return viewmodel;
}
```

```kotlin
private static <T extends ViewModel> T newInstance(@NonNull Class<T> modelClass,
        Constructor<T> constructor, Object... params) {
    try {
        return constructor.newInstance(params);
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

### ViewModelStore

```java
public class ViewModelStore {

    private final HashMap<String, ViewModel> mMap = new HashMap<>();

    final void put(String key, ViewModel viewModel) {
        ViewModel oldViewModel = mMap.put(key, viewModel);
        if (oldViewModel != null) {
            oldViewModel.onCleared();
        }
    }

    final ViewModel get(String key) {
        return mMap.get(key);
    }

    Set<String> keys() {
        return new HashSet<>(mMap.keySet());
    }

    /**
     *  Clears internal storage and notifies ViewModels that they are no longer used.
     */
    public final void clear() {
        for (ViewModel vm : mMap.values()) {
            vm.clear();
        }
        mMap.clear();
    }
}
```

```java
//创建ViewModelStore 该方法有2处调用
void ensureViewModelStore() {
    if (mViewModelStore == null) {
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
}
```

```java
public ViewModelStore getViewModelStore() {
        if (getApplication() == null) {
            throw new IllegalStateException("Your activity is not yet attached to the "
                    + "Application instance. You can't request ViewModel before onCreate call.");
        }
        ensureViewModelStore();
        return mViewModelStore;
}
```

```java
//生命周期发生改变时调用
getLifecycle().addObserver(new LifecycleEventObserver() {
            @Override
            public void onStateChanged(@NonNull LifecycleOwner source,
                    @NonNull Lifecycle.Event event) {
                ensureViewModelStore();
                getLifecycle().removeObserver(this);
            }
        });
```

### Factory

工厂负责创建ViewModel

![](<../.gitbook/assets/image (90).png>)

