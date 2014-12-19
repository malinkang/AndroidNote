
# Shape Drawable

语法

```xml

<?xml version="1.0" encoding="utf-8"?>
<shape
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape=["rectangle" | "oval" | "line" | "ring"] >
    <corners
        android:radius="integer"
        android:topLeftRadius="integer"
        android:topRightRadius="integer"
        android:bottomLeftRadius="integer"
        android:bottomRightRadius="integer" />
    <gradient
        android:angle="integer"
        android:centerX="integer"
        android:centerY="integer"
        android:centerColor="integer"
        android:endColor="color"
        android:gradientRadius="integer"
        android:startColor="color"
        android:type=["linear" | "radial" | "sweep"]
        android:useLevel=["true" | "false"] />
    <padding
        android:left="integer"
        android:top="integer"
        android:right="integer"
        android:bottom="integer" />
    <size
        android:width="integer"
        android:height="integer" />
    <solid
        android:color="color" />
    <stroke
        android:width="integer"
        android:color="color"
        android:dashWidth="integer"
        android:dashGap="integer" />
</shape>

```

## <shape>


`android:shape`定义形状，可用的值包括`rectangle(矩形)`、`oval(椭圆形)`、`line(线)`、`ring(圆形)`

**下列属性只有当`android:shape="ring"`时才能使用。**

* `android:innerRadius`尺寸值。 圆形内部半径。
* `android:innerRadiusRatio`float值。内部半径和圆形宽度比例。例如，如果` android:innerRadiusRatio="5"`时，内部半斤等于圆形宽度除以5。如果设置了`android:innerRadius`，该值讲不起作用。默认值为`9`。
* `android:thickness`尺寸值。圆形的厚度。
* `android:thicknessRatio`float值。厚度与圆形宽度的比例。默认值是`3`。
* `android:useLevel`是否作为一个` LevelListDrawable`。

## <corners>

* `android:radius`尺寸值。所有角的半径。
* `android:topLeftRadius`尺寸值。左上角的半径。
* `android:topRightRadius`尺寸值。右上角的半径。
* `android:bottomLeftRadius`尺寸值。左下角的半径。
* `android:bottomRightRadius`尺寸值。右下角的半径。

## <gradient>

定义颜色渐变。

* `android:angle`Integer值。渐变的角度。0是从左到右，90是从底部到顶部。值必须是`45`的倍数。默认是`0`。
* `android:centerX`
* `android:centerY`
* `android:centerColor`
* `android:endColor`
* `android:gradientRadius`
* `android:startColor`
* `android:type`

## <padding>

## <size>

## <solid>
实心的颜色，填充Shape

## <stroke>

Shape的边线。

* `android:width`
* `android:color`
* `android:dashGap`
* `android:dashWidth`

示例

```xml

<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <gradient
        android:startColor="#FFFF0000"
        android:endColor="#80FF00FF"
        android:angle="45"/>
    <padding android:left="7dp"
        android:top="7dp"
        android:right="7dp"
        android:bottom="7dp" />
    <corners android:radius="8dp" />
</shape>

```



#扩展阅读：


* [TextView中文API](http://www.cnblogs.com/over140/archive/2010/08/27/1809745.html)
* [TextView英文文档](http://developer.android.com/reference/android/widget/TextView.html)