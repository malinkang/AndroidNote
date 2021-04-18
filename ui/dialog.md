#### Dialog使用

```java
WindowManager.LayoutParams layoutParams = getDialog().getWindow().getAttributes();
layoutParams.dimAmount=0.4f; //设置暗淡值
layoutParams.alpha = 0.3f;//设置透明度
layoutParams.width = WindowManager.LayoutParams.MATCH_PARENT;//设置全屏
layoutParams.height = WindowManager.LayoutParams.MATCH_PARENT;
getDialog().getWindow().setAttributes(layoutParams);
```

#### 参考

* https://developer.android.com/guide/fragments/dialogs
* [Using-DialogFragment](https://guides.codepath.com/android/Using-DialogFragment)
* https://stackoverflow.com/questions/10795078/dialog-with-transparent-background-in-android
* https://stackoverflow.com/questions/7189948/full-screen-dialogfragment-in-android



