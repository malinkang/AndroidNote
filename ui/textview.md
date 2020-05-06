# TextView使用

## 1.TextView常用属性

* `textStyle`:设置文本样式可选值为：italic：斜体，bold：粗体，normal：正常
* `typeface`设置字体，默认支持“sans”, “serif”, “monospace"三种字体。
设置更多字体样式可以通过下面步骤来实现
1. 将新字体TTF文件copy到assets/fonts/目录下面
2. 不能直接在xml文件中直接设置字体，需要通过代码来实现

```java
Typeface typeFace = Typeface.createFromAsset(getAssets(),"fonts/Roboto-Thin.ttf");
text.setTypeface(typeFace);
```

* `lineSpacingExtra`设置行间距，例如“3dp”
* `lineSpacingMultiplier`设置行间距的倍数，例如"1.2"
* `textAllCaps`文本是否全部显示为大写，当为true全部设置为大写。

## 2.在TextView中展示Html

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


## 扩展阅读
* [自动调整 TextView 的大小](https://developer.android.com/guide/topics/ui/look-and-feel/autosizing-textview)
* [Downloadable Fonts](https://developer.android.com/guide/topics/ui/look-and-feel/downloadable-fonts)
* [Fonts in XML](https://developer.android.com/guide/topics/ui/look-and-feel/fonts-in-xml)
* [表情符号兼容性](https://developer.android.com/guide/topics/ui/look-and-feel/emoji-compat)
* [放大镜微件](https://developer.android.com/guide/topics/text/magnifier)
* [Span](https://developer.android.com/guide/topics/text/spans)
* [TextViewApi](http://developer.android.com/reference/android/widget/TextView.html)
* [Advanced Android TextView](http://chiuki.github.io/advanced-android-textview/)
* [Spans, a Powerful Concept.](http://flavienlaurent.com/blog/2014/01/31/spans/)
* [String资源文件中使用占位符](http://stackoverflow.com/questions/5854647/how-to-put-variable-inside-string-resources)
* [Advanced Android TextView](https://github.com/chiuki/advanced-textview)
* [字体开源库Calligraphy](https://github.com/chrisjenx/Calligraphy)
* [fontbinding](https://github.com/lisawray/fontbinding)







