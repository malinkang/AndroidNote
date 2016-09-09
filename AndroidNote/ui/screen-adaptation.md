## 屏幕适配




<h3>1.基本概念</h3>


* `px`是英文单词`pixel`的缩写。我们通常说的手机分辨率`1080*1920`即指像素。

* `in`英寸，每英寸等于`2.54cm`，我们通常说的手机多少寸屏的指的是屏幕的对角线长度是多少英寸。

* dpi：每英寸像素的点数，即每英寸屏幕上有多少个像素点。比如像素`320*480`，宽2英寸高3英寸的手机，则这个手机拥有160dpi。

* density：与dpi的关系为 dpi/160=density。当density＝1时 1px ＝ 1dpi。px和dpi关系为 px ＝ dpi*density/160。

* sp：类似dp，用于设置字体大小。


<h3>2.屏幕适配</h3>

* 使用dp设置View的大小。

两个物理尺寸一样的手机A,B，A手机的分辨率是B手机的两倍。如果设置相同px长度的View，则在A中显示的长度是B手机的一般。如果使用dp则View长度则一致。

* 使用drawable文件夹

两个分辨率一样的手机A,B，A手机物理尺寸是B的两倍。一个ImageView设置宽高为包裹内容，设置相同的图片，则在A中的清晰度会比B低，如果想要在A,B中达到一定的清晰度，就需要为A设置像素为B两倍的图片。Android提供了多个`drawable`文件夹。

drawable-ldpi (dpi=120, density=0.75)

drawable-mdpi (dpi=160, density=1)

drawable-hdpi (dpi=240, density=1.5)

drawable-xhdpi (dpi=320, density=2)

drawable-xxhdpi (dpi=480, density=3)

<http://developer.android.com/guide/practices/screens_support.html>










