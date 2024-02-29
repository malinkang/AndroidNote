
## 生命周期

关于Activity的生命周期，可以参考官方文档：

* [Activity 简介](https://developer.android.com/guide/components/activities/intro-activities)

* [了解 Activity 生命周期](https://developer.android.com/guide/components/activities/activity-lifecycle)


需要注意的是：onStop()在Activity不可见时会调用，如果打开的是一个透明的Activity，就不会回调onStop()，当关闭透明Activity时，也不会回调onRestart()和onStart()。onStart()在Activity可见时调用，刚好与onStop()相反。当打开一个非Activity的Dialog时，不会触发生命周期方法回调（[官方文档](https://developer.android.com/guide/components/activities/state-changes#covered)上说会弹出Dialog会调用onPause()，实测并没有调用）。

当两个Activity A和B，如果A启动B，然后转屏B会销毁重建，当返回A，A会重建。如果B是一个透明Activity，A和B都会重建，并且A会调用onPause()，


## 保存和恢复状态


参考文档：

* [保存和恢复瞬时界面状态](https://developer.android.com/guide/components/activities/activity-lifecycle#saras)

* [保存界面状态](https://developer.android.com/topic/libraries/architecture/saving-states)


### 状态保存

当正常点击返回键和调用`finish()`不会调用`onSaveInstanceState()`，其他情况当应用不可见时，就会调用，比如：

[onSaveInstanceState()](https://developer.android.com/reference/android/app/Activity#onSaveInstanceState(android.os.Bundle))的与生命周期方法的调用顺序。9.0及其之后发生在onStop()之后。之前的版本可能发生在onPause()之前或者之后。


### 状态恢复

`[onCreate()](https://developer.android.com/reference/android/app/Activity#onCreate(android.os.Bundle))` 和 `[onRestoreInstanceState()](https://developer.android.com/reference/android/app/Activity#onRestoreInstanceState(android.os.Bundle))` 回调方法均会收到包含实例状态信息的相同 `[Bundle](https://developer.android.com/reference/android/os/Bundle)`。无论系统是新建 Activity 实例还是重新创建之前的实例，都会调用 `[onCreate()](https://developer.android.com/reference/android/app/Activity#onCreate(android.os.Bundle))` 方法。官方文档中说仅当存在要恢复的已保存状态时，系统才会调用 `[onRestoreInstanceState()](https://developer.android.com/reference/android/app/Activity#onRestoreInstanceState(android.os.Bundle))`。何时需要恢复？假设两个Activity A和B，A打开B，会调用onSaveInstanceState()，然后依次关闭B和A、再次打开A并没有调用onRestoreInstanceState()。如果A打开B，然后强制杀死应用，再次打开A亦然不会调用onRestoreInstanceState()。在转屏的时候会调用onSaveInstanceState()和onRestoreInstanceState()。



## 启动模式

参考文档：

* [Android 面试黑洞——当我按下 Home 键再切回来，会发生什么？](https://juejin.cn/post/6883741254614515720)


