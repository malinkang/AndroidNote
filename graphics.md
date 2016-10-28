##Graphics

### canvas

Canvas负责进行绘制各种各样的图形，它有如下的一些绘制图形方法：

* drawArc 绘制扇形
* drawCircle 绘制圆
* drawOval 绘制椭圆
* drawLine 绘制线
* drawPoint 绘制点
* drawRect 绘制矩形
* drawRoundRect 绘制圆角矩形）
* drawVertices
* drawPath 绘制路径
* drawBitmap 绘制位图
* drawText 绘制文字

### Paint
Paint主要负责设置绘图的风格，包括画笔的颜色，粗细，填充风格等

* setARGB/setColor 设置颜色
* setAlpha 设置透明度
* setAntiAlias 设置是否抗锯齿
* setShader 设置画笔的填充效果
* setShadowLayer 设置阴影
* setStyle 设置画笔风格
* setStrokeWidth 设置空心边框的宽度
* setTextSize 设置绘制文本时文字的大小

### Canvas和Paint的使用
#### 绘制弧形

```java
        RectF rectF= new RectF(100,100,400,400);
        Paint paint = new Paint();
        //oval :指定圆弧的外轮廓矩形区域。
        //startAngle: 圆弧起始角度，单位为度。从180°为起始点
        //sweepAngle: 圆弧扫过的角度，顺时针方向，单位为度。
        //useCenter: 如果为True时，在绘制圆弧时将圆心包括在内，通常用来绘制扇形。如果false会将圆弧的两端用直线连接
        //paint: 绘制圆弧的画板属性，如颜色，是否填充等paint.setColor(getResources().getColor(android.R.color.holo_purple));
        canvas.drawArc(rectF,0,90,false,paint);
```

![](images/graphics-1.png)

当`useCenter`设置为true时

![](images/graphics-2.png)



#### 绘制圆

```java
    	Paint paint = new Paint();
        paint.setColor(getResources().getColor(android.R.color.holo_purple));
        canvas.drawCircle(150,150,100,paint);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(10);
        canvas.drawCircle(450,150,100,paint);
```

![](images/graphics-3.png)

#### 绘制圆角矩形

```java
        Paint paint = new Paint();
        paint.setColor(getResources().getColor(android.R.color.holo_purple));
        canvas.drawCircle(150,150,100,paint);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(10);
        canvas.drawCircle(450,150,100,paint);
        RectF rectF= new RectF(50,300,350,500);
        canvas.drawRoundRect(rectF,20,20,paint);
```

![](images/graphics-4.png)

### 参考

* [Android中canvas基本使用
](http://www.jianshu.com/p/5b0de0493a76)
* [Android 2D绘图解析之 Canvas，Paint](http://blog.csdn.net/leejizhou/article/details/51524948)
* [Fun with 
Android Shaders and Filters](http://chiuki.github.io/android-shaders-filters/#/)
