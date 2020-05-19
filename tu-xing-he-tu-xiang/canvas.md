# Canvas使用

Canvas我们可以称之为画布，我们可以使用画笔在上面绘制颜色，也可以绘制点、线以及矩形、扇形等各种形状，还可以绘制图片文本路径等，下面我们一一进行介绍

## 绘制颜色

Canvas提供了三个绘制颜色的方法。

* drawColor
* drawRGB
* drawARGB

## 绘制基本形状

想要在画布上进行绘制，就需要一个画笔Paint。这里我们只简单介绍画笔的使用，关于画笔的详细使用将在画笔这一章详细介绍。

```java
public class CanvasView extends View {
  public CanvasView(Context context, @Nullable AttributeSet attrs) {
    super(context, attrs);
    initPaint();
  }
  //1.创建Paint对象
  private Paint mPaint = new Paint();
  //2.初始化Paint
  private void initPaint(){
    mPaint.setColor(getResources().getColor(R.color.purple));//设置画笔颜色
    mPaint.setStyle(Paint.Style.FILL);//设置画笔样式为填充
    mPaint.setStrokeWidth(10f); //设置画笔宽度为10px
  }

  @Override protected void onDraw(Canvas canvas) {
    super.onDraw(canvas);
  }
}
```

### 绘制点

绘制一个点需要这个点的坐标。

Canvas提供了三个绘制点的方法：

* public void drawPoint\(float x, float y, @NonNull Paint paint\)；绘制单个点
* public void drawPoints\(@Size\(multiple=2\) @NonNull float\[\] pts, @NonNull Paint paint\) 绘制多个点
* public void drawPoints\(@Size\(multiple=2\) float\[\] pts, int offset, int count, @NonNull Paint paint\)

```java
//在坐标(200,200)位置绘制一个点
canvas.drawPoint(200, 200, mPaint);
//绘制一组点，坐标位置由float数组指定
canvas.drawPoints(new float[]{
    500,500,
    500,600,
    500,700
},mPaint);
```

![](../.gitbook/assets/canvas-point%20%281%29.jpeg)

### 绘制直线

绘制直线需要两个点，初始点和结束点。

Canvas同样提供了三个绘制直线的方法：

* public void drawLine\(float startX, float startY, float stopX, float stopY, @NonNull Paint paint\)
* public void drawLines\(@Size\(multiple=4\) @NonNull float\[\] pts, int offset, int count,@NonNull Paint paint\)
* public void drawLines\(@Size\(multiple=4\) @NonNull float\[\] pts, @NonNull Paint paint\)

```java
canvas.drawLine(300, 300, 500, 600, mPaint);    // 在坐标(300,300)(500,600)之间绘制一条直线
canvas.drawLines(new float[] {               // 绘制一组线 每四数字(两个点的坐标)确定一条线
    100, 200, 200, 200, 100, 300, 200, 300
}, mPaint);
```

![](../.gitbook/assets/canvas-line%20%281%29.jpeg)

### 绘制矩形

确定一个矩形最少需要四个数据，就是对角线的两个点的坐标值，这里一般采用左上角和右下角的两个点的坐标。

Canvas提供了三个绘制矩形的方法：

* public void drawRect\(float left, float top, float right, float bottom, @NonNull Paint paint\):前两个参数是左上角点的坐标，后两个参数是右下角坐标点
* public void drawRect\(@NonNull Rect r, @NonNull Paint paint\)
* public void drawRect\(@NonNull RectF rect, @NonNull Paint paint\)

```java
canvas.drawRect(0,0,400,400,mPaint);
// or
Rect rect = new Rect(0,0,400,400);
canvas.drawRect(rect,mPaint);
// or
RectF rectF = new RectF(0,0,400,400);
canvas.drawRect(rectF,mPaint);
```

![](../.gitbook/assets/canvas-rect%20%281%29.jpeg)

### 绘制圆角矩形

Canvas提供了两个绘制圆角矩形的方法：

* public void drawRoundRect\(float left, float top, float right, float bottom, float rx, float ry,@NonNull Paint paint\)：相比绘制矩形，我们需要提供一个圆角的半径，由于圆角是一个椭圆，所以需要提供椭圆的两个半径rx和ry。
* public void drawRoundRect\(@NonNull RectF rect, float rx, float ry, @NonNull Paint paint\)

```java
// API 21 提供
canvas.drawRoundRect(100,100,500,500,20,20,mPaint);
// or
RectF rectF = new RectF(100,100,500,500);
canvas.drawRoundRect(rectF,20,20,mPaint);
```

![](../.gitbook/assets/canvas-roundrect%20%281%29.jpeg)

当rx或者ry的值大于矩形的一半时，按照一半进行处理：

```java
// API 21 提供
canvas.drawRoundRect(100,100,500,500,250,250,mPaint);
// or
RectF rectF = new RectF(100,100,500,500);
canvas.drawRoundRect(rectF,250,250,mPaint);
```

![](../.gitbook/assets/canvas-roundrect2%20%281%29.jpeg)

### 绘制椭圆

```java
//API 21 提供
canvas.drawOval(100,100,800,400,mPaint);
//or
RectF rectF = new RectF(100,100,800,400);
canvas.drawOval(rectF,mPaint);
```

![](../.gitbook/assets/canvas-oval%20%281%29.jpeg)

### 绘制圆

```java
canvas.drawCircle(500,500,400,mPaint);  // 绘制一个圆心坐标在(500,500)，半径为400 的圆。
```

![](../.gitbook/assets/canvas-circle%20%281%29.jpg)

### 绘制圆弧

Canvas提供了两个绘制圆弧的方法：

* public void drawArc\(@NonNull RectF oval, float startAngle, float sweepAngle, boolean useCenter, @NonNull Paint paint\)
* public void drawArc\(float left, float top, float right, float bottom, float startAngle,float sweepAngle, boolean useCenter, @NonNull Paint paint\) 

从上面可以看出，相比于绘制椭圆，绘制圆弧还多了三个参数：

* startAngle：开始角度
* sweepAngle：扫过角度
* useCenter：是否使用中心，使用了中心点之后绘制出来类似于一个扇形，而不使用中心点则是圆弧起始点和结束点之间的连线加上圆弧围成的图形。

```java
//绘制背景
mPaint.setColor(Color.GRAY);
RectF rectF = new RectF(100,100,500,500);
RectF rectF2 = new RectF(600,100,1000,500);
canvas.drawRect(rectF,mPaint);
canvas.drawRect(rectF2,mPaint);
//绘制圆弧
mPaint.setColor(getResources().getColor(R.color.purple));//设置画笔颜色
canvas.drawArc(rectF,0,90,true,mPaint);
canvas.drawArc(rectF2,0,90,false,mPaint);
```

![](../.gitbook/assets/canvas-arc%20%281%29.jpeg)

## 画布操作

### 位移（translate）

```java
canvas.translate(100,100);
canvas.drawCircle(0,0,100,mPaint);

canvas.translate(200,0);
canvas.drawCircle(0,0,100,mPaint);
```

![](../.gitbook/assets/canvas-translate%20%281%29.jpg)

### 缩放（scale）

canvas提供了两个方法缩放的方法

* public void scale \(float sx, float sy\)
* public final void scale \(float sx, float sy, float px, float py\)

这两个方法中前两个参数是相同的分别为x轴和y轴的缩放比例。而第二种方法比前一种多了两个参数，用来控制缩放中心位置的。

缩放比例\(sx,sy\)取值范围详解：

| 取值范围\(n\) | 说明 |
| :--- | :--- |
| \[-∞, -1\) | 先根据缩放中心放大n倍，再根据中心轴进行翻转 |
| -1 | 根据缩放中心轴进行翻转 |
| \(-1, 0\) | 先根据缩放中心缩小到n，再根据中心轴进行翻转 |
| 0 | 不会显示，若sx为0，则宽度为0，不会显示，sy同理 |
| \(0, 1\) | 根据缩放中心缩小到n |
| 1 | 没有变化 |
| \(1, +∞\) | 根据缩放中心放大n倍 |

如果在缩放时稍微注意一下就会发现**缩放的中心默认为坐标原点,而缩放中心轴就是坐标轴**，如下：

```java
RectF rect = new RectF(0,0,400,400);
canvas.drawRect(rect,mPaint);
canvas.scale(0.5f,0.5f);//画布缩小一半
mPaint.setColor(getResources().getColor(R.color.purple));
canvas.drawRect(rect,mPaint);
```

![](../.gitbook/assets/canvas-scale1%20%281%29.jpg)

设置缩放中心位置

```java
RectF rect = new RectF(0,0,400,400);
canvas.drawRect(rect,mPaint);
canvas.scale(0.5f,0.5f,200,200);//画布缩小一半
mPaint.setColor(getResources().getColor(R.color.purple));
canvas.drawRect(rect,mPaint);   // 绘制蓝色矩形
canvas.drawRect(rect,mPaint);
```

![](../.gitbook/assets/canvas-scale2%20%281%29.jpg)

前面两个示例缩放的数值都是正数，按照表格中的说明，**当缩放比例为负数的时候会根据缩放中心轴进行翻转**，下面我们就来实验一下：

```java
RectF rect = new RectF(0,0,600,400);
canvas.drawRect(rect,mPaint);
canvas.scale(-0.5f,-0.5f,600,400);//画布缩小一半
mPaint.setColor(getResources().getColor(R.color.purple));
canvas.drawRect(rect,mPaint);
```

![](../.gitbook/assets/canvas-scale3%20%281%29.jpeg)

本次缩放可以看做是先根据缩放中心\(坐标原点\)缩放到原来的0.5倍，然后分别按照x轴和y轴进行翻转。

### 旋转（rotate）

canvas提供了两个旋转的方法：

* public void rotate \(float degrees\)
* public final void rotate \(float degrees, float px, float py\)

  和缩放一样，第二种方法多出来的两个参数依旧是控制旋转中心点的。

默认的旋转中心依旧是坐标原点：

```java
canvas.translate(200,200);
RectF rect = new RectF(0,0,200,200);   // 矩形区域
canvas.drawRect(rect,mPaint);
mPaint.setColor(getResources().getColor(R.color.purple));
canvas.rotate(45);
canvas.drawRect(rect,mPaint);
```

![](../.gitbook/assets/canvas-rotate1%20%281%29.jpeg)

```java
canvas.translate(200,200);
RectF rect = new RectF(0,0,200,200);   // 矩形区域
canvas.drawRect(rect,mPaint);
mPaint.setColor(getResources().getColor(R.color.purple));
canvas.rotate(45,100,100);
canvas.drawRect(rect,mPaint);
```

![](../.gitbook/assets/canvas-rotate2%20%281%29.jpeg)

### 错切（skew）

skew这里翻译为错切，错切是特殊类型的线性变换。

错切只提供了一种方法：

* public void skew \(float sx, float sy\)

参数含义： float sx:将画布在x方向上倾斜相应的角度，sx倾斜角度的tan值. float sy:将画布在y轴方向上倾斜相应的角度，sy为倾斜角度的tan值.

示例：

```java
mPaint.setStyle(Paint.Style.STROKE);
RectF rect = new RectF(0,0,200,200); 
canvas.drawRect(rect,mPaint);
canvas.skew(1,0);
mPaint.setColor(getResources().getColor(R.color.purple));        
canvas.drawRect(rect,mPaint);
```

![](../.gitbook/assets/canvas-skew%20%281%29.jpeg)

## 绘制图片

### 绘制Bitmap

Canvas提供了如下绘制Bitmap的方法：

```java
//第一类
public void drawBitmap (Bitmap bitmap, Matrix matrix, Paint paint)
//第二类绘制时指定了图片左上角的坐标(距离坐标原点的距离)
public void drawBitmap (Bitmap bitmap, float left, float top, Paint paint)
//第三类绘制图片的部分区域
//src指定绘制图片的区域，dst指定图片在屏幕上显示的区域
public void drawBitmap (Bitmap bitmap, Rect src, Rect dst, Paint paint)
public void drawBitmap (Bitmap bitmap, Rect src, RectF dst, Paint paint)
```

```java
Bitmap bitmap = BitmapFactory.decodeResource(getResources(), R.drawable.cat);
canvas.drawBitmap(bitmap, new Matrix(), mPaint);
```

![](../.gitbook/assets/canvas-bitmap1%20%281%29.jpeg)

绘制部分区域

```java
Bitmap bitmap = BitmapFactory.decodeResource(getResources(), R.drawable.cat);
// 指定图片绘制区域
Rect src = new Rect(0,0,bitmap.getWidth()/2,bitmap.getHeight()/2);
// 指定图片在屏幕上显示的区域
Rect dst = new Rect(0,0,bitmap.getWidth(),bitmap.getHeight());
canvas.drawBitmap(bitmap, src,dst, mPaint);
```

![](../.gitbook/assets/canvas-bitmap2%20%281%29.jpeg)

## 绘制文字

canvas提供如下绘制文字的方法

```java
// 第一类 指定文本基线位置(基线x默认在字符串左侧，基线y默认在字符串下方)。
public void drawText (String text, float x, float y, Paint paint)
public void drawText (String text, int start, int end, float x, float y, Paint paint)
public void drawText (CharSequence text, int start, int end, float x, float y, Paint paint)
public void drawText (char[] text, int index, int count, float x, float y, Paint paint)
// 第二类可以分别指定每个文字的位置。
public void drawPosText (String text, float[] pos, Paint paint)
public void drawPosText (char[] text, int index, int count, float[] pos, Paint paint)
// 第三类指定一个路径，根据路径绘制文字。
public void drawTextOnPath (String text, Path path, float hOffset, float vOffset, Paint paint)
public void drawTextOnPath (char[] text, int index, int count, Path path, float hOffset, float vOffset, Paint paint)
```

```java
String str = "ABCDEFGHIJK";
mPaint.setTextSize(50);              // 设置字体大小
canvas.drawText(str,2,5,200,500,mPaint);
```

![](../.gitbook/assets/canvas-text%20%281%29.jpeg)

为每个字符指定位置

```java
String str = "ABCDEF";
mPaint.setTextSize(50);              // 设置字体大小
canvas.drawPosText(str, new float[] {
    100, 100,    // 第一个字符位置
    200, 200,    // 第二个字符位置
    300, 300,    // ...
    400, 400, 
    500, 500,
    600, 600
}, mPaint);
```

![](../.gitbook/assets/canvas-text2%20%281%29.jpeg)

## 参考

* [AndroidNote](https://github.com/GcsSloop/AndroidNote)
* [Fun with Android Shaders and Filters](http://chiuki.github.io/android-shaders-filters/)

