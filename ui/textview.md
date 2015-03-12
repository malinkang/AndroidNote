# TextView




## 1. TextView常用属性

* [android:textStyle](http://developer.android.com/reference/android/widget/TextView.html#attr_android:textStyle)
>设置文本样式
italic：斜体，bold：粗体，normal：正常

* [android:typeface](http://developer.android.com/reference/android/widget/TextView.html#attr_android:typeface)
>设置字体，默认支持“sans”, “serif”, “monospace"三种字体。

设置更多字体样式可以通过下面步骤来实现

1. 将新字体TTF文件copy到assets/fonts/目录下面
2. 不能直接在xml文件中直接设置字体，需要通过代码来实现


```java

		Typeface typeFace = Typeface.createFromAsset(getAssets(),
				"fonts/Roboto-Thin.ttf");
		text.setTypeface(typeFace);


```

* [android:lineSpacingExtra](http://developer.android.com/reference/android/widget/TextView.html#attr_android:lineSpacingExtra)
>设置行间距，例如“3dp”
* [android:lineSpacingMultiplier](http://developer.android.com/reference/android/widget/TextView.html#attr_android:lineSpacingMultiplier)
>设置行间距的倍数，例如"1.2"


## 2. 在TextView中展示Html

TextView直接设置Html字符串，Html标签将不起作用。比如

```java
mTextView.setText("<font color='red'>红色</font>");
```
则，在界面上显示
```
<font color='red'>红色</font>
```
在Android里，提供了一个[Html](http://developer.android.com/reference/android/text/Html.html)对象，通过相关方法可以将Html字符串解析为一个Spanned对象。

```java
mTextView.setText(Html.from("<font color='red'>红色</font>"));


```

## 3. 在TextVeiew中设置字体

在前面我们提到通过`typeface`属性可以设置字体，但该属性只支持`sans`, `serif`, `monospace`三种字体。如果想设置更多的字体只能通过代码来实现，但这样不太方便。开源库[Calligraphy](https://github.com/chrisjenx/Calligraphy)让自定义字体更加的方便。

Calligraphy使用非常简单，到Github项目主页下载最新的Jar，或者使用Gradle构建

```
dependencies {
    compile 'uk.co.chrisjenx:calligraphy:1.2.0'
}

```

将你的自定义字体添加到 `assets/fonts/` 目录下。

Calligraphy中没有添加相关的属性，所以你需要自己添加自定义属性。

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <attr name="fontPath" format="string"/>
</resources>

```

在开始使用之前需要在你的`Application`类中进行初始化配置。

```java
protected void onCreate() {
    super.onCreate();
    CalligraphyConfig.initDefault("fonts/Roboto-Regular.ttf", R.attr.fontPath);
    //....
}

```

`initDefault`方法设置默认自定义字体并进行初始化。

Calligraphy 1.0.0之后可以不用定义CalligraphyConfig，但是这样就无法设置默认字体了。

在activity中注入Context

```java
@Override
protected void attachBaseContext(Context newBase) {
    super.attachBaseContext(new CalligraphyContextWrapper(newBase));
}
```
接下来就可以在布局文件中设置字体了

```xml
<TextView
    android:text="@string/hello_world"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    fontPath="fonts/Roboto-Bold.ttf"/>
```
注意：这时IDE将会提示错误，需要在TextView或者它的父`ViewGroup`中添加`tools:ignore="MissingPrefix" `而且需要添加tools的命名空间`xmlns:tools=" http://schemas.android.com/tools"`。

在TextAppearance中自定义字体。

```xml
<style name="TextAppearance.FontPath" parent="android:TextAppearance">
    <!-- Custom Attr-->
    <item name="fontPath">fonts/RobotoCondensed-Regular.ttf</item>
</style>
```

```xml
<TextView
    android:text="@string/hello_world"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:textAppearance="@style/TextAppearance.FontPath"/>
```
在Styles中设置

```xml
<style name="TextViewCustomFont">
    <item name="fontPath">fonts/RobotoCondensed-Regular.ttf</item>
</style>
```
在Theme中自定义字体

```xml
<style name="AppTheme" parent="android:Theme.Holo.Light.DarkActionBar">
    <item name="android:textViewStyle">@style/AppTheme.Widget.TextView</item>
</style>

<style name="AppTheme.Widget"/>

<style name="AppTheme.Widget.TextView" parent="android:Widget.Holo.Light.TextView">
    <item name="fontPath">fonts/Roboto-ThinItalic.ttf</item>
</style>
```


## 扩展阅读


* [TextView中文API](http://www.cnblogs.com/over140/archive/2010/08/27/1809745.html)
* [TextView英文文档](http://developer.android.com/reference/android/widget/TextView.html)








