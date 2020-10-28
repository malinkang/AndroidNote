# ViewModel 概览

[`ViewModel`](https://developer.android.com/reference/androidx/lifecycle/ViewModel) 类旨在以注重生命周期的方式存储和管理界面相关的数据。[`ViewModel`](https://developer.android.com/reference/androidx/lifecycle/ViewModel) 类让数据可在发生屏幕旋转等配置更改后继续留存。

Android 框架可以管理界面控制器（如 Activity 和 Fragment）的生命周期。Android 框架可能会决定销毁或重新创建界面控制器，以响应完全不受您控制的某些用户操作或设备事件。

如果系统销毁或重新创建界面控制器，则存储在其中的任何临时性界面相关数据都会丢失。例如，应用的某个 Activity 中可能包含用户列表。因配置更改而重新创建 Activity 后，新 Activity 必须重新提取用户列表。对于简单的数据，Activity 可以使用 [`onSaveInstanceState()`](https://developer.android.com/reference/android/app/Activity#onSaveInstanceState%28android.os.Bundle%29) 方法从 [`onCreate()`](https://developer.android.com/reference/android/app/Activity#onCreate%28android.os.Bundle%29) 中的捆绑包恢复其数据，但此方法仅适合可以序列化再反序列化的少量数据，而不适合数量可能较大的数据，如用户列表或位图。

另一个问题是，界面控制器经常需要进行异步调用，这些调用可能需要一些时间才能返回结果。界面控制器需要管理这些调用，并确保系统在其销毁后清理这些调用以避免潜在的内存泄露。此项管理需要大量的维护工作，并且在因配置更改而重新创建对象的情况下，会造成资源的浪费，因为对象可能需要重新发出已经发出过的调用。

诸如 Activity 和 Fragment 之类的界面控制器主要用于显示界面数据、对用户操作做出响应或处理操作系统通信（如权限请求）。如果要求界面控制器也负责从数据库或网络加载数据，那么会使类越发膨胀。为界面控制器分配过多的责任可能会导致单个类尝试自己处理应用的所有工作，而不是将工作委托给其他类。以这种方式为界面控制器分配过多的责任也会大大增加测试的难度。

从界面控制器逻辑中分离出视图数据所有权的做法更易行且更高效。

## 实现 ViewModel

架构组件为界面控制器提供了 [`ViewModel`](https://developer.android.com/reference/androidx/lifecycle/ViewModel) 辅助程序类，该类负责为界面准备数据。在配置更改期间会自动保留 [`ViewModel`](https://developer.android.com/reference/androidx/lifecycle/ViewModel) 对象，以便它们存储的数据立即可供下一个 Activity 或 Fragment 实例使用。例如，如果您需要在应用中显示用户列表，请确保将获取和保留该用户列表的责任分配给 [`ViewModel`](https://developer.android.com/reference/androidx/lifecycle/ViewModel)，而不是 Activity 或 Fragment，如以下示例代码所示：

```java
    class MyViewModel : ViewModel() {
        private val users: MutableLiveData<List<User>> by lazy {
            MutableLiveData().also {
                loadUsers()
            }
        }

        fun getUsers(): LiveData<List<User>> {
            return users
        }

        private fun loadUsers() {
            // Do an asynchronous operation to fetch users.
        }
    }
```

然后，您可以从 Activity 访问该列表，如下所示：

```java
    class MyActivity : AppCompatActivity() {

        override fun onCreate(savedInstanceState: Bundle?) {
            // Create a ViewModel the first time the system calls an activity's onCreate() method.
            // Re-created activities receive the same MyViewModel instance created by the first activity.

            // Use the 'by viewModels()' Kotlin property delegate
            // from the activity-ktx artifact
            val model: MyViewModel by viewModels()
            model.getUsers().observe(this, Observer<List<User>>{ users ->
                // update UI
            })
        }
    }
```

## 参考

[https://developer.android.com/topic/libraries/architecture/viewmodel](https://developer.android.com/topic/libraries/architecture/viewmodel)

## 

