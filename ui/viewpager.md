# ViewPager

布局：

```markup
<LinearLayout
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical">

    <android.support.design.widget.TabLayout
        android:id="@+id/tablayout"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        app:tabGravity="center"
        app:tabIndicatorColor="@color/colorAccent"
        app:tabMode="fixed"
        app:tabTextColor="#FF000000"/>

    <android.support.v4.view.ViewPager
        android:id="@+id/viewpager"
        android:layout_width="match_parent"
        android:layout_height="match_parent"/>
</LinearLayout>
```

Java代码：

```java
mTablayout.setupWithViewPager(mViewpager);
```

属性： tabMode：可选值scrollable和fixed

当设置为scrollable条目过多可以进行滚动，条目过少则会居左显示。:

![](../.gitbook/assets/tablayout-1%20%281%29.gif)

当设置为fixed，则不会进行滚动，tabGravity只有当tabMode是fixed时候起作用，tabGravity可选是是fill和center。 当设置为center时居中。

![](../.gitbook/assets/tablayout-2%20%281%29.gif)

当设置为fill时将会占满所有的位置。

![](../.gitbook/assets/tablayout-3%20%281%29.gif)

tabIndicatorColor：设置指示器颜色。

tabTextColor：设置文本颜色。

## 扩展更多

* [Great animations with PageTransformer](https://medium.com/@BashaChris/the-android-viewpager-has-become-a-fairly-popular-component-among-android-apps-its-simple-6bca403b16d4)
* [为什么调用 FragmentPagerAdapter.notifyDataSetChanged\(\) 并不能更新其 Fragment？](http://www.cnblogs.com/dancefire/archive/2013/01/02/why-notifyDataSetChanged-does-not-work.html)

