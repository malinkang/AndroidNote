# ToolBar

## 1.使用ToolBar

`Toolbar`是在Android5.0开始推出的一个MaterialDesign风格的导航控件，用来取代之前的Actionbar。与Actionbar相比，Toolbar更加灵活。它不像Actionbar一样，一定要固定在Activity的顶部，而是可以放到界面的任意位置。

`Toobar`是Android5.0才引入的，Google也在兼容包`appcompat-v7`中提供了向下兼容的`ToolBar`：`android.support.v7.widget.Toolbar`。

### 1.1基本使用

首先，我们要在build.gradle中添加依赖。

```text
compile 'com.android.support:appcompat-v7:24.2.0'
```

定义NoActionBar的主题，并在AndroidManifest.xml中为Activity指定。

```markup
<!-- Base application theme. -->
<style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
    <!-- Customize your theme here. -->
    <item name="colorPrimary">@color/colorPrimary</item>
    <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
    <item name="colorAccent">@color/colorAccent</item>
</style>
```

然后我们就可以在布局文件中添加ToolBar。

```markup
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">
    <android.support.v7.widget.Toolbar
        android:id="@+id/toolbar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="?attr/colorPrimary"
        android:minHeight="?attr/actionBarSize"
        app:titleTextColor="@android:color/white"/>
</LinearLayout>
```

最后，在Activity或者Fragment中，通过调用setSupportActionBar让ToolBar扮演ActionBar的角色。

```java
public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
    }
}
```

### 1.2 ActionBar常用方法

一旦设置了Toolbar作为activity的actionbar，就可以调用ActionBar类提供的方法来设置ActionBar。ActionBar常用的方法：

* hide\(\):隐藏ActionBar
* show\(\):显示ActionBar
* isShowing\(\):判断ActionBar是否显示
* setBackgroundDrawable\(Drawable drawable\):为ActionBar设置背景。
* setDisplayHomeAsUpEnabled\(boolean b\)：是否显示返回的按钮。
* setDisplayShowHomeEnabled\(boolean b\);是否显示icon
* setDisplayShowTitleEnabled\(boolean b\);是否显示标题
* setDisplayShowCustomEnabled\(boolean b\);是否显示自定义view
* setHomeAsUpIndicator\(@Nullable Drawable indicator\)设置返回图标
* setIcon\(\);设置Icon
* setTitle\(\);设置标题

### 1.3 ToolBar常用属性

```markup
<android.support.v7.widget.Toolbar
        android:id="@+id/toolbar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="@color/razzmatazz"
        android:title="Title"
        app:logo="@mipmap/ic_launcher"
        app:navigationIcon="@drawable/ic_menu_white_24dp"
        app:subtitle="Sub Title"
        app:popupTheme="@style/AppTheme.PopupOverlay"
        app:subtitleTextAppearance="@style/ToolBarTheme.SubTitleAppearance"
        app:theme="@style/ToolBarTheme"/>
```

`app:theme="@style/ToolBarTheme"`用于指定ToolBar的主题。

```markup
<style name="ToolBarTheme">
    <item name="android:textColorPrimary">@android:color/holo_orange_dark</item>
    <item name="actionMenuTextColor">@android:color/holo_green_light</item>
    <item name="colorControlNormal">@android:color/holo_blue_bright</item>
</style>
```

`app:popupTheme="@style/AppTheme.PopupOverlay"`用于设置弹出列表菜单的样式。

```markup
<style name="AppTheme.PopupOverlay" parent="ThemeOverlay.AppCompat.Dark">
    <item name="android:textColorPrimary">@android:color/holo_red_light</item>
</style>
```

## 2.添加Action Buttons

我们可以使用菜单资源文件来添菜单。

```markup
<menu xmlns:android="http://schemas.android.com/apk/res/android"
      xmlns:app="http://schemas.android.com/apk/res-auto">
    <item
        android:id="@+id/action_search"
        android:icon="@drawable/ic_search_white_24dp"
        android:title="@string/action_search"
        app:showAsAction="ifRoom"/>
    <item
        android:id="@+id/action_add_alarm"
        android:icon="@drawable/ic_add_alarm_white_24dp"
        android:title="@string/action_alarm"
        app:showAsAction="ifRoom"/>
</menu>
```

在activity中调用onCreateOptionsMenu\(\)方法来填充菜单。

```java
@Override
public boolean onCreateOptionsMenu(Menu menu) {
    MenuInflater inflater = getMenuInflater();
    inflater.inflate(R.menu.main_activity_actions, menu);
    return super.onCreateOptionsMenu(menu);
}
```

### 2.1 showAsAction属性

`app:showAsAction`属性用来设置菜单是否显示。可选的值包括`ifRoom`、`never`、`always`和`collapseActionView`。`ifRoom`：如果有足够的空间，将以炫富菜单的样式显示。`never`表示从不显示。`always`一直显示。 `android:title`为必选属性。如果空间不足，菜单将以悬浮状态显示，并且只显示title。如果action item只显示icon,用户可以通过长按条目显示title。

### 2.2 actionViewClass和acionLayout

上面只是提供了简单菜单的添加方式，`app:actionLayout`属性和`app:actionViewClass`属性可以添加更加复杂的菜单。`app:actionLayout`值是一个布局文件，`app:actionViewClass`值为一个类。

首先我们先来使用`app:actionLayout`属性为actionbar添加一个switch。

定义布局layout\_switch.xml

```markup
<android.support.v7.widget.SwitchCompat
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/action_switch"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:switchPadding="10dp"/>
```

定义菜单文件

```markup
<menu xmlns:android="http://schemas.android.com/apk/res/android"
      xmlns:app="http://schemas.android.com/apk/res-auto">
    <item
        android:id="@+id/action_switch"
        android:title="@string/action_switch"
        app:actionLayout="@layout/layout_switch"
        app:showAsAction="always" />
</menu>
```

```java
@Override
public boolean onCreateOptionsMenu(Menu menu) {
    getMenuInflater().inflate(R.menu.menu_actionlayout, menu);
    MenuItem item = menu.findItem(R.id.action_switch);
    if (item != null) {
        SwitchCompat action_bar_switch = (SwitchCompat) item.getActionView().findViewById(R.id.action_switch);
        if (action_bar_switch != null) {
            action_bar_switch.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
                @Override
                public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                    int resId = isChecked ? R.string.enable : R.string.disable;
                    Toast.makeText(ActionLayoutActivity.this, getString(resId), Toast.LENGTH_SHORT).show();
                }
            });
        }
    }
    return true;
}
```

Android为我们提供了一个组件android.support.v7.widget.SearchView，我们可以通过actionViewClass来引入这个组件。

```markup
<menu xmlns:android="http://schemas.android.com/apk/res/android"
      xmlns:app="http://schemas.android.com/apk/res-auto">
    <item
        android:id="@+id/action_search"
        android:icon="@drawable/ic_search_white_24dp"
        android:title="@string/action_search"
        app:showAsAction="ifRoom|collapseActionView"
        app:actionViewClass="android.support.v7.widget.SearchView"/>
</menu>
```

```java
@Override
public boolean onCreateOptionsMenu(Menu menu) {
    getMenuInflater().inflate(R.menu.menu_actionviewclass, menu);
    MenuItem searchItem = menu.findItem(R.id.action_search);
    SearchView searchView = (SearchView) MenuItemCompat.getActionView(searchItem);
    searchView.setOnQueryTextListener(new SearchView.OnQueryTextListener() {
        @Override
        public boolean onQueryTextSubmit(String query) {//进行搜索
            Toast.makeText(ActionViewClassActivity.this, "搜索"+query, Toast.LENGTH_SHORT).show();
            return false;
        }
        @Override
        public boolean onQueryTextChange(String newText) {
            return false;
        }
    });
    return true;
}
```

### 2.3添加 Action Provider

类似action view，action provider通过自定义布局来替换一个操作按钮.但是action provider控制所有的动作行为并且在被点击时能够显示一个子菜单。

通过为actionViewClass属性设置一个ActionProvider类，来添加action provider.也可以通过继承ActionProvider来创建自定义的action provider.Android提供了一些action provider,例如ShareActionProvider。

由于每一个ActionProvider类定义自己的动作行为，所以不需要通过onOptionsItemSelected\(\)方法来设置其点击事件，但是你仍然可以通过此方法来设置其他操作，也可以通过onPerformDefaultAction\(\)来设置别的操作。

如果action Provider提供一个子菜单，用户打开列表或者选中一个子菜单，activity将不调用onOptionsItemSelected\(\)。

使用ShareActionProvider添加一个分享操作需要一下步骤： 1.设置actionProviderClass属性值为ShareActionProvider类.

```markup
<menu xmlns:android="http://schemas.android.com/apk/res/android"
      xmlns:app="http://schemas.android.com/apk/res-auto">
    <item
        android:id="@+id/action_search"
        android:icon="@drawable/ic_search_white_24dp"
        android:title="@string/action_search"
        app:showAsAction="ifRoom|collapseActionView"
        app:actionViewClass="android.support.v7.widget.SearchView"/>
    <item
        android:id="@+id/action_share"
        android:icon="@drawable/ic_share_white_24dp"
        android:title="@string/action_share"
        app:actionProviderClass="android.support.v7.widget.ShareActionProvider"
        app:showAsAction="ifRoom"/>
</menu>
```

2.定义你想要分享的Intent。在onCreateOptionsMenu\(\)方法中调用MenuItemCompat.getActionProvider\(\)获取ShareActionProvider对象，然后调用ShareActionProvider的setShareIntent\(\)设置分享意图。

```java
@Override
public boolean onCreateOptionsMenu(Menu menu) {
    // Inflate the menu items for use in the action bar
    MenuInflater inflater = getMenuInflater();
    inflater.inflate(R.menu.main_menu, menu);
    MenuItem shareItem = menu.findItem(R.id.action_share);
    ShareActionProvider shareActionProvider = (ShareActionProvider)
            MenuItemCompat.getActionProvider(shareItem);
    shareActionProvider.setShareIntent(getDefaultIntent());
    return super.onCreateOptionsMenu(menu);
}

private Intent getDefaultIntent() {
    Intent intent = new Intent(Intent.ACTION_SEND);
    intent.setType("image/*");
    return intent;
}
```

## 3.处理条目点击

当用户点击一个条目时，系统将点击的MenuItem传递给Activity的onOptionsItemSelected\(\) 方法。

```java
@Override
public boolean onOptionsItemSelected(MenuItem item) {
    // Handle presses on the action bar items
    switch (item.getItemId()) {
        case R.id.action_search:
            Toast.makeText(this, "点击了搜索", Toast.LENGTH_SHORT).show();
            return true;
        case R.id.action_add_alarm:
            Toast.makeText(this, "点击了添加闹钟", Toast.LENGTH_SHORT).show();
            return true;
        //向上返回的按钮的id是android.R.id.home 所以通过下面代码就能实现点击返回按钮返回的功能。
        case android.R.id.home:
            finish();
            return true;
        default:
            return super.onOptionsItemSelected(item);
    }
}
```

## 使用中的问题

1.自定义Title不能居中

解决办法：让原始的toolbar的title不显示

```java
mActionBar.setDisplayShowTitleEnabled(false);
```

2.ToolBar setNavigationIcon不起作用

解决办法：[Android toolbar setNavigationIcon not working](http://stackoverflow.com/questions/26641259/android-toolbar-setnavigationicon-not-working)

## 参考

* [Adding the App Bar](https://developer.android.com/training/appbar/index.html)
* [Using the App ToolBar](https://guides.codepath.com/android/Using-the-App-ToolBar)
* [Android开发：最详细的 Toolbar 开发实践总结](http://www.jianshu.com/p/79604c3ddcae)
* [ 自定义ActionProvider ToolBar 自定义Menu小红点](http://blog.csdn.net/yanzhenjie1003/article/details/51902796)
* [Android-ActionItemBadge](https://github.com/mikepenz/Android-ActionItemBadge)
* [Android: Toolbar text is coming as black instead of white](https://stackoverflow.com/questions/32794575/android-toolbar-text-is-coming-as-black-instead-of-white)

