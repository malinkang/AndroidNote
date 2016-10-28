
#ActionBar使用



![](https://github.com/ITBox/ITBox.github.io/blob/master/images/D06A00CC-E866-4B48-B09A-41609D28B275.png?raw=true)

随着AndroidDesign的Holo风格越来越普及，Android应用程序也有了自己的设计风格，微信5.2也转向的Holo风格，ActionBar是Holo风格中重要的元素，接下来我将简单介绍ActionBar如何应用到项目中。

[ActionBar](http://developer.android.com/guide/topics/ui/actionbar.html)是android3.0之后（API Level 11）才加入的。在此之前一般是使用Github上的开源项目[ActionBarSherlock](https://github.com/JakeWharton/ActionBarSherlock)来兼容低版本。2013年google发布了v7 appcompact library,可以让开发者在android 2.1(API level 7)以及以上版本上使用ActionBar。我们这里主要讲解一下使用v7 appcompact library来实现ActionBar。


###ActionBar的显示与隐藏

 如果还没有v7支持库，打开SDK Manager安装即可

![SDK Manager](https://github.com/baoyongzhang/test_pages/blob/gh-pages/image-1.png?raw=true)

安装之后，在sdk目录下的extras目录中可应该可以找到v4,v7,v13支持库，v7中包含了三个项目，ActionBar只需要使用v7中的appcompat项目。

![v7 appcompat](https://github.com/baoyongzhang/test_pages/blob/gh-pages/image-2.png?raw=true)


接下来新建一个Android Project，我使用的是eclipse，然后导入v7中得appcompat项目，这里要注意一下，appcompat项目是包含资源文件的（比如ActionBar的背景图片），只导入jar包是不行的，我们的工程需要关联appcompat项目，如何关联请参考Android Library项目的使用。

在清单文件中配置activity的Theme，也可以在application中配置全局Theme，appcompat提供了三种Theme：

>黑色主题：@Style/Theme.AppCompat

>白色主题：@Style/Theme.AppCompat.Light


>白色主题，黑色ActionBar：@Style/Theme.AppCompat.Light.DarkActionBar


也可以自定义Style继承上面几种Theme。


配置完主题之后，我们需要将Activity继承ActionBarActivity，如果需要使用v4包中的FragmentActivity也不需要担心，因为ActionBarActivity继承了FragmentActivity。

在Activity中调用getSupportActionBar()方法可以获取ActionBar对象，ActionBar默认是显示的，如果想隐藏可以调用ActionBar.hide()方法，显示则调用ActionBar.show();


```java
        ActionBar actionBar = getSupportActionBar();
	    if (actionBar.isShowing()) {// 判断ActionBar是否显示
			actionBar.hide();// 隐藏ActionBar
	    } else {
			actionBar.show();// 显示ActionBar
	    }

```

####使用Logo替换icon####

默认的,ActionBar调用应用图标。如果在```<application>```或者```<activity>```元素中，指定logo属性，ActionBar将使用logo替代icon


**ActionBar一些常用的方法**

* setBackgroundDrawable(Drawable drawable):为ActionBar设置背景。
* setDisplayHomeAsUpEnabled(boolean b)：是否显示返回的按钮。
* setDisplayShowHomeEnabled(boolean b);是否显示icon
* setDisplayShowTitleEnabled(boolean b);是否显示标题
* setDisplayShowCustomEnabled(boolean b);是否显示自定义view
* setIcon();设置Icon
* setTitle();设置标题
* getSelectedNavigationIndex()获取选择条目的索引。

###添加Action Item###
当你开启Activity时，系统通过调用Activity的onCreateOptionsMenu()方法来放置action items。使用这个方法inflate一个定义所有action items的菜单资源。

```xml

<menu xmlns:android="http://schemas.android.com/apk/res/android" >
    <item android:id="@+id/action_search"
          android:icon="@drawable/ic_action_search"
          android:title="@string/action_search"/>
    <item android:id="@+id/action_compose"
          android:icon="@drawable/ic_action_compose"
          android:title="@string/action_compose" />
</menu>

```

然后调用Activity的onCreateOptionsMenu()方法中添加将所有的action item添加到ActionBar上。

```java

@Override
public boolean onCreateOptionsMenu(Menu menu) {
    // Inflate the menu items for use in the action bar
    MenuInflater inflater = getMenuInflater();
    inflater.inflate(R.menu.main_activity_actions, menu);
    return super.onCreateOptionsMenu(menu);
}

```

想要item直接显示在actionbar上，需要在<item>标签中，添加一个showAsAction="ifRoom"属性。

```xml

<menu xmlns:android="http://schemas.android.com/apk/res/android"
      xmlns:yourapp="http://schemas.android.com/apk/res-auto" >
    <item android:id="@+id/action_search"
          android:icon="@drawable/ic_action_search"
          android:title="@string/action_search"
          yourapp:showAsAction="ifRoom"  />
    ...
</menu>
```

如果没有足够的空间，它将以悬浮菜单的样式显示。

####使用support library的属性####
注意上面的showAsAction 属性使用了一个自定义命名空间。在使用support library定义的属性必须自定义命名空间。因为这些属性在一些老的Android设备上不存在。

如果同时指定了title和icon属性，action item默认只显示icon.如果需要显示标题，需要为showAsAction属性添加withText值,如果icon可用并且actionbar空间不足时，title将不显示。

```xml
<item yourapp:showAsAction="ifRoom|withText" ... />
```



尽管可能你不需要显示title，但是仍然要指定title属性的值。

* 如果空间不足，菜单将以悬浮状态显示，并且只显示title。
* 如果action item只显示icon,用户可以通过长按条目显示title。

你也可以设置showAsAction属性的值为always，让一个action item一直显示，但是你最好不要让一个action item一直显示。这样做在窄屏上出现一些布局适配的问题。

####处理条目点击####
当用户点击一个条目时，系统将点击的MenuItem传递给Activity的onOptionsItemSelected() 方法。

```java
@Override
public boolean onOptionsItemSelected(MenuItem item) {
    // Handle presses on the action bar items
    switch (item.getItemId()) {
        case R.id.action_search:
            openSearch();
            return true;
        case R.id.action_compose:
            composeMessage();
            return true;
        default:
            return super.onOptionsItemSelected(item);
    }
}
```

向上返回的按钮的id是android.R.id.home 所以通过下面代码就能实现点击返回按钮返回的功能。
``` java

 setDisplayHomeAsUpEnabled(true);//显示返回箭头
@Override
public boolean onOptionsItemSelected(MenuItem item) {
    // Handle presses on the action bar items
    switch (item.getItemId()) {
        case android.R.id.home:
                finish();
        default:
            return super.onOptionsItemSelected(item);
    }
}

```

####使用分离的ActionBar####

![](http://developer.android.com/images/ui/actionbar-splitaction@2x.png)
ActionBar可以分割成屏幕上方和屏幕下方两部分来显示（如上图所示）。分割的ActionBar可以让空间能够更合理的利用。

为了实现分离的ActionBar，必须做以下两件事情：

1.  添加uiOptions="splitActionBarWhenNarrow"到<activity>元素或 <application> 元素中。这个属性只能在API 14+上起作用，低版本将忽略这个属性。

2. 为了支持低版本，在```<activity>```元素中添加一个```<mata-data>```元素，

```xml

<manifest ...>
    <activity uiOptions="splitActionBarWhenNarrow" ... >
        <meta-data android:name="android.support.UI_OPTIONS"
                   android:value="splitActionBarWhenNarrow" />
    </activity>
</manifest>
```

###添加一个Action View###

Action View 提供了一些复杂操作的快速入口，不需要改变Acitivity或者Fragment，并且不用替换ActionBar.例如，如果你想进行搜索，你可以通过给actionbar添加一个SearchView组件来实现（如图所示）。
![](http://developer.android.com/images/ui/actionbar-searchview@2x.png)
我们可以通过给acionlayout属性指定一个布局资源或者给actionViewClass属性指定一个组件类来添加一个Action View.

```xml

<?xml version="1.0" encoding="utf-8"?>
<menu xmlns:android="http://schemas.android.com/apk/res/android"
      xmlns:yourapp="http://schemas.android.com/apk/res-auto" >
    <item android:id="@+id/action_search"
          android:title="@string/action_search"
          android:icon="@drawable/ic_action_search"
          yourapp:showAsAction="ifRoom|collapseActionView"
          yourapp:actionViewClass="android.support.v7.widget.SearchView" />
</menu>

```

注意showAsAction属性包含了一个collapseActionView值。

我们可以在onCreateOptionsMenu()方法中配置action view。通过静态方法MenuItemCompat.getActionView()可以获取一个到action view对象。这个方法需要传递一个MenuItem对象。

```java

@Override
public boolean onCreateOptionsMenu(Menu menu) {
    getMenuInflater().inflate(R.menu.main_activity_actions, menu);
    MenuItem searchItem = menu.findItem(R.id.action_search);
    SearchView searchView = (SearchView) MenuItemCompat.getActionView(searchItem);
    // Configure the search info and add any event listeners
    ...
    return super.onCreateOptionsMenu(menu);
}

```

####处理可折叠的 action view####

为了节省action bar的空间，可以将action view折叠成一个action button。当这个action button被选中时，action view将会被展开。只要为showAsAction属性添加一个collapseActionView值就可以让action view变的可折叠。

当用户点击action button，action view能够自动的展开，不需要在onOptionsItemSelected()方法中进行点击处理。但是如果将其返回值设置为true,action view将不会被展开。

当点下手机的返回按钮或者action bar的返回按钮，action view将会被折叠。

通过OnActionExpandListener监听器，可以监听到action view折叠和展开。

```java

@Override
public boolean onCreateOptionsMenu(Menu menu) {
    getMenuInflater().inflate(R.menu.options, menu);
    MenuItem menuItem = menu.findItem(R.id.actionItem);
    ...

    // When using the support library, the setOnActionExpandListener() method is
    // static and accepts the MenuItem object as an argument
    MenuItemCompat.setOnActionExpandListener(menuItem, new OnActionExpandListener() {
        @Override
        public boolean onMenuItemActionCollapse(MenuItem item) {
            // Do something when collapsed
            return true;  // Return true to collapse action view
        }

        @Override
        public boolean onMenuItemActionExpand(MenuItem item) {
            // Do something when expanded
            return true;  // Return true to expand action view
        }
    });
}
```

###添加 Action Provider###

![](http://developer.android.com/images/ui/actionbar-shareaction@2x.png)

类似action view，action provider通过自定义布局来替换一个操作按钮.但是action provider控制所有的动作行为并且在被点击时能够显示一个子菜单。

通过为actionViewClass属性设置一个ActionProvider类，来添加action provider.也可以通过继承ActionProvider来创建自定义的action provider.Android提供了一些action provider,例如ShareActionProvider。

由于每一个ActionProvider类定义自己的动作行为，所以不需要通过onOptionsItemSelected()方法来设置其点击事件，但是你仍然可以通过此方法来设置其他操作，也可以通过onPerformDefaultAction()来设置别的操作。

如果action Provider提供一个子菜单，用户打开列表或者选中一个子菜单，activity将不调用onOptionsItemSelected()。

####使用ShareActionProvider####

使用ShareActionProvider添加一个分享操作需要一下步骤：

* 设置actionProviderClass属性值为ShareActionProvider类.

```xml

<?xml version="1.0" encoding="utf-8"?>
<menu xmlns:android="http://schemas.android.com/apk/res/android"
      xmlns:yourapp="http://schemas.android.com/apk/res-auto" >
    <item android:id="@+id/action_share"
          android:title="@string/share"
          yourapp:showAsAction="ifRoom"
          yourapp:actionProviderClass="android.support.v7.widget.ShareActionProvider"
          />
    ...
</menu>
```

* 定义你想要分享的Intent。在onCreateOptionsMenu()方法中调用 MenuItemCompat.getActionProvider() 获取ShareActionProvider对象，然后调用ShareActionProvider的setShareIntent()设置分享意图。

```java
private ShareActionProvider mShareActionProvider;

@Override
public boolean onCreateOptionsMenu(Menu menu) {
    getMenuInflater().inflate(R.menu.main_activity_actions, menu);

    // Set up ShareActionProvider's default share intent
    MenuItem shareItem = menu.findItem(R.id.action_share);
    mShareActionProvider = (ShareActionProvider)
            MenuItemCompat.getActionProvider(shareItem);
    mShareActionProvider.setShareIntent(getDefaultIntent());

    return super.onCreateOptionsMenu(menu);
}

/** Defines a default (dummy) share intent to initialize the action provider.
  * However, as soon as the actual content to be used in the intent
  * is known or changes, you must update the share intent by again calling
  * mShareActionProvider.setShareIntent()
  */
private Intent getDefaultIntent() {
    Intent intent = new Intent(Intent.ACTION_SEND);
    intent.setType("image/*");
    return intent;
}
```

默认情况下，ShareActionProvider根据用户选择的频繁度进行排序，越频繁的越靠上，最频繁的直接作为一个action bar的一个默认分享按钮存在。并且排序信息保存在一个名为DEFAULT_SHARE_HISTORY_FILE_NAME的私有文件中。如果使用ShareActionProvider或其子类只进行一种操作的话，可以继续使用这个历史文件而不需要其它操作。如果你用SharedActionProvider或子类同时进行多种不同的操作，那么每一个ShareActionProvider应当分别指定自己的历史文件去维护自己的历史记录。通过调用setShareHistoryFileName()并且创建一个xml的文件来创建不同的历史文件。

####创建自定义的ActionProvider####

要创建自定义的ActionProvider只需要简单的继承ActionProvider类，并且实现下列方法。

* OnCreateActionView()这个方法用来获取action view。使用从构造器中接收的Context对象，获取一个LayoutInflater对象的实例，并且用XML资源来填充操作视窗，然后注册事件监听器。


```java

public View onCreateActionView(MenuItem forItem) {
    // Inflate the action view to be shown on the action bar.
    LayoutInflater layoutInflater = LayoutInflater.from(mContext);
    View view = layoutInflater.inflate(R.layout.action_provider, null);
    ImageButton button = (ImageButton) view.findViewById(R.id.button);
    button.setOnClickListener(new View.OnClickListener() {
        @Override
        public void onClick(View v) {
            // Do something...
        }
    });
    return view;
}


```

* onPerformDefaultAction()在选中悬浮菜单中的菜单时，系统会调用这个方法，并且操作提供器应该这对这个选中的菜单项执行默认的操作。但是，如果你的操作提供器提供了一个子菜单，即使是悬浮菜单中一个菜单项的子菜单，那么也要通过onPrepareSubMenu()回调方法来显示子菜单。这样onPerformDefaultAction()在子菜单显示时就不会被调用。注意：实现了onOptionsItemSelected()回调方法的Activity或Frament对象能够通过处理item-selected事件（并且返回true）来覆盖操作提供器的默认行为，这种情况下，系统不会调用onPerformDefaultAction()方法。

###添加导航选项标签###

action bar 选项卡可以让用户非常方便的浏览和切换不同的视图，并且能够适配不同的屏幕。例如：当屏幕足够宽的时候，选项卡可以和action button并肩显示（如下图1），当在窄屏上，它将与action bar分离显示(如下图2)。在一些情况下，Android系统将会在action bar中以下拉列表的形式显示选项卡条目用来确保最合适的适配。

![](http://developer.android.com/images/ui/actionbar-tabs@2x.png)


![](http://developer.android.com/images/ui/actionbar-tabs-stacked@2x.png)

为action bar添加选项卡，一般需要以下步骤：

1. 实现ActionBar.TabListener接口，这个接口提供了一些选项卡事件的回调函数。

2. 创建ActionBar.Tab，通过调用setTabListener()方法设置 ActionBar.TabListener。setText()方法可以用来设置选项卡的标题。

3. 调用addTab()方法来将所有的选项卡添加到action bar上。

示例：

实现ActionBar.TabListener

```java

public static class TabListener<T extends Fragment> implements ActionBar.TabListener {
    private Fragment mFragment;
    private final Activity mActivity;
    private final String mTag;
    private final Class<T> mClass;

    /** Constructor used each time a new tab is created.
      * @param activity  The host Activity, used to instantiate the fragment
      * @param tag  The identifier tag for the fragment
      * @param clz  The fragment's Class, used to instantiate the fragment
      */
    public TabListener(Activity activity, String tag, Class<T> clz) {
        mActivity = activity;
        mTag = tag;
        mClass = clz;
    }

    /* The following are each of the ActionBar.TabListener callbacks */

    public void onTabSelected(Tab tab, FragmentTransaction ft) {
        // Check if the fragment is already initialized
        if (mFragment == null) {
            // If not, instantiate and add it to the activity
            mFragment = Fragment.instantiate(mActivity, mClass.getName());
            ft.add(android.R.id.content, mFragment, mTag);
        } else {
            // If it exists, simply attach it in order to show it
            ft.attach(mFragment);
        }
    }

    public void onTabUnselected(Tab tab, FragmentTransaction ft) {
        if (mFragment != null) {
            // Detach the fragment, because another one is being attached
            ft.detach(mFragment);
        }
    }

    public void onTabReselected(Tab tab, FragmentTransaction ft) {
        // User selected the already selected tab. Usually do nothing.
    }
}

```

注意：在这里不能调用fragment transaction的commit()方法，否则系统可能会出现异常，也不能添加这些fragment到返回栈。

接下来创建每一个需要添加到ActionBar上的ActionBar.Tab。注意，必须调用ActionBar的setNavigationMode(NAVIGATION_MODE_TABS)使选项卡可用。

```java

@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Notice that setContentView() is not used, because we use the root
    // android.R.id.content as the container for each fragment

    // setup action bar for tabs
    ActionBar actionBar = getSupportActionBar();
    actionBar.setNavigationMode(ActionBar.NAVIGATION_MODE_TABS);
    actionBar.setDisplayShowTitleEnabled(false);

    Tab tab = actionBar.newTab()
                       .setText(R.string.artist)
                       .setTabListener(new TabListener<ArtistFragment>(
                               this, "artist", ArtistFragment.class));
    actionBar.addTab(tab);

    tab = actionBar.newTab()
                   .setText(R.string.album)
                   .setTabListener(new TabListener<AlbumFragment>(
                           this, "album", AlbumFragment.class));
    actionBar.addTab(tab);
}

```

此外，我们还可以通过结合ViewPager来实现滑动切换视图。

###添加下拉列表导航###

![](http://developer.android.com/images/ui/actionbar-dropdown@2x.png)

Activity还提供了一个下拉列表的导航，如上图所示。下拉列表适用于不频繁的操作，如果操作频繁，请使用选项卡导航。

创建一个下拉列表导航需要以下步骤：

1. 创建一个SpinnerAdapter，这个适配器用于填充列表。
2. 实现ActionBar.OnNavigationListener用于监听列表选中操作。
3. 调用setNavigationMode(NAVIGATION_MODE_LIST).设置导航模式为列表模式。
4. 调用setListNavigationCallbacks()方法设置监听器。

###ActionBar样式###

ActionBar允许自定义ActionBar的颜色，字体颜色，按钮样式等等。你可以使用Android的样式和主题框架通过指定的样式属性来自定义ActionBar。

注意：使用的所有背景图片必须为9patch图片，并且图片要小于40dp高和30dp宽。

####通用样式####

自定义ActionBar样式可以通过继承Widget.AppCompat.ActionBar来实现。查看Widget.AppCompat.ActionBar源码

```xml

<style name="Widget.AppCompat.ActionBar" parent="Widget.AppCompat.Base.ActionBar">
</style>

<style name="Widget.AppCompat.Base.ActionBar" parent="">
        <item name="displayOptions">useLogo|showHome|showTitle</item>
        <item name="divider">?attr/dividerVertical</item>
        <item name="height">?attr/actionBarSize</item>
        <item name="homeLayout">@layout/abc_action_bar_home</item>

        <item name="titleTextStyle">@style/TextAppearance.AppCompat.Widget.ActionBar.Title</item>
        <item name="subtitleTextStyle">@style/TextAppearance.AppCompat.Widget.ActionBar.Subtitle
        </item>

        <item name="background">@drawable/abc_ab_transparent_dark_holo</item>
        <item name="backgroundStacked">@drawable/abc_ab_stacked_transparent_dark_holo</item>
        <item name="backgroundSplit">@drawable/abc_ab_bottom_transparent_dark_holo</item>

        <item name="actionButtonStyle">@style/Widget.AppCompat.ActionButton</item>
        <item name="actionOverflowButtonStyle">@style/Widget.AppCompat.ActionButton.Overflow</item>

        <item name="progressBarStyle">@style/Widget.AppCompat.ProgressBar.Horizontal</item>
        <item name="indeterminateProgressStyle">@style/Widget.AppCompat.ProgressBar</item>
</style>

```
background:设置actionbar的背景。

backgroundstacked：设置tab的背景

backButtonStyle：设置按钮的样式

displayOptions：显示选项

divider：两个action按钮之间的分割线。

titleTextStyle:标题样式

###ActionItem样式####

自定义ActionItem样式可以通过继承Widget.AppCompat.ActionButton来实现。查看Widget.AppCompat.ActionButton源码

```xml

   <style name="Widget.AppCompat.ActionButton" parent="Widget.AppCompat.Base.ActionButton">
    </style>

    <style name="Widget.AppCompat.Base.ActionButton" parent="">
        <item name="android:background">?attr/actionBarItemBackground</item>
        <item name="android:paddingLeft">12dip</item>
        <item name="android:paddingRight">12dip</item>
        <item name="android:minWidth">@dimen/abc_action_button_min_width</item>
        <item name="android:minHeight">?attr/actionBarSize</item>
        <item name="android:gravity">center</item>
        <item name="android:maxLines">2</item>
        <item name="textAllCaps">@bool/abc_config_actionMenuItemAllCaps</item>
    </style>

```

###Tab导航样式###

自定义Tab导航样式可以通过继承Widget.AppCompat.ActionBar.TabView来实现。查看Widget.AppCompat.ActionBar.TabView源码


```xml

    <style name="Widget.AppCompat.ActionBar.TabView"
           parent="Widget.AppCompat.Base.ActionBar.TabView">
    </style>

    <style name="Widget.AppCompat.Base.ActionBar.TabView" parent="">
        <item name="android:background">@drawable/abc_tab_indicator_ab_holo</item>
        <item name="android:gravity">center_horizontal</item>
        <item name="android:paddingLeft">16dip</item>
        <item name="android:paddingRight">16dip</item>
        <item name="android:minWidth">80dip</item>
    </style>

```

####下拉列表样式####

自定义下拉列表样式可以通过继承Widget.AppCompat.Spinner.DropDown.ActionBar来实现。查看Widget.AppCompat.ActionBar.TabView源码

```xml

   <style name="Widget.AppCompat.Spinner.DropDown.ActionBar"
           parent="Widget.AppCompat.Base.Spinner">
    </style>

  <style name="Widget.AppCompat.Base.Spinner" parent="">
        <item name="spinnerMode">dropdown</item>
        <item name="android:popupBackground">@drawable/abc_menu_dropdown_panel_holo_dark</item>
        <item name="android:dropDownSelector">@drawable/abc_list_selector_holo_dark</item>
        <item name="android:dropDownVerticalOffset">0dip</item>
        <item name="android:dropDownHorizontalOffset">0dip</item>
        <item name="android:dropDownWidth">wrap_content</item>
        <item name="android:gravity">left|center_vertical</item>
        <item name="android:clickable">true</item>
        <item name="android:background">@drawable/abc_spinner_ab_holo_dark</item>
    </style>

```


###扩展阅读：


[官方ActionBar开发指南](http://developer.android.com/guide/topics/ui/actionbar.html)

[创建带有选项卡的滑动视图](http://developer.android.com/training/implementing-navigation/lateral.html)

[ActionBarCompat and I/O 2013 App Source]()

[ActionBarSherlock和ActionBar Compatibility区别](http://stackoverflow.com/questions/7844517/difference-between-actionbarsherlock-and-actionbar-compatibility)

[ActionBar Training](https://developer.android.com/training/basics/actionbar/index.html)

