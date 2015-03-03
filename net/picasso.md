# Picasso使用



## 1. 介绍

[Picasso](http://square.github.io/picasso/) 具有以下特性：

* 处理Adapter中的 ImageView 回收和取消已经回收ImageView的下载进程
* 使用最少的内存完成复杂的图片转换，比如把下载的图片转换为圆角等
* 自动添加磁盘和内存缓存

## 2.快速入门

### 2.1 构建项目

Jar包下载地址：<https://github.com/square/picasso>

Gradle构建

```
compile 'com.squareup.picasso:picasso:2.3.4'

```
Maven

```

<dependency>
    <groupId>com.squareup.picasso</groupId>
    <artifactId>picasso</artifactId>
    <version>2.3.4</version>
</dependency>

```
### 2.2 混淆

在`ProGuard`中添加下列选项

```
-dontwarn com.squareup.okhttp.**

```

### 2.3 使用

`Picasso`加载网络图片非常简单

```java
Picasso.with(context).load("http://i.imgur.com/DvpvklR.png").into(imageView);

```

## 3 特性介绍

### 3.1 图片转换

转换图片更好的适应布局并且减少内存占用量。

```java

Picasso.with(context)
  .load(url)
  .resize(50, 50)
  .centerCrop()
  .into(imageView)

```

用户也可以自己指定转换器，如下例子将图片转换为方形

```java
public class CropSquareTransformation implements Transformation {
  @Override public Bitmap transform(Bitmap source) {
    int size = Math.min(source.getWidth(), source.getHeight());
    int x = (source.getWidth() - size) / 2;
    int y = (source.getHeight() - size) / 2;
    Bitmap result = Bitmap.createBitmap(source, x, y, size, size);
    if (result != source) {
      source.recycle();
    }
    return result;
  }

  @Override public String key() { return "square()"; }
}

```

将CropSquareTransformation的实例传递给`transform`方法即可。

下面的例子是一个圆形的转换器

```java

import android.graphics.*;
import com.squareup.picasso.Transformation;

/**
 * Transforms an image into a circle representation. Such as a avatar.
 */
public class CircularTransformation implements Transformation
{
    int radius = 10;

    public CircularTransformation(final int radius)
    {
        this.radius = radius;
    }

    public CircularTransformation()
    {
    }

    @Override
    public Bitmap transform(final Bitmap source)
    {
        Bitmap output = Bitmap.createBitmap(source.getWidth(), source.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);

        final Paint paint = new Paint();
        final Rect rect = new Rect(0, 0, source.getWidth(), source.getHeight());

        paint.setAntiAlias(true);
        paint.setFilterBitmap(true);
        paint.setDither(true);

        canvas.drawARGB(0, 0, 0, 0);

        paint.setColor(Color.parseColor("#BAB399"));

        canvas.drawCircle(source.getWidth() / 2 + 0.7f, source.getHeight() / 2 + 0.7f, source.getWidth() / 2 - 1.1f, paint);

        paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));

        canvas.drawBitmap(source, rect, rect, paint);

        if(source != output) {
            source.recycle();
        }
        return output;
    }

    @Override
    public String key()
    {
        return "circular" + String.valueOf(radius);
    }
}

```

### 3.2 占位

当图片还未加载出来或者加载错误，我们可以设置一张图片来标识不同的状态

```java
Picasso.with(context)
    .load(url)
    .placeholder(R.drawable.user_placeholder)
    .error(R.drawable.user_placeholder_error)
    .into(imageView);

```

### 3.3 加载其他资源图片

`Picasso`不仅可以加载网络图片，还可以资源文件，assets目录下文件，内存卡文件等等

```java

Picasso.with(context).load(R.drawable.landing_screen).into(imageView1);
Picasso.with(context).load(new File(...)).into(imageView2);

```

### 3.4 Debug标识

在开发状态下，调用`setIndicatorsEnabled(true)`方法会在图片的左上角现实一个的小三角，不同的颜色表示图片的不同来源

![](http://square.github.io/picasso/static/debug.png)

红色：代表从网络下载的图片

黄色：代表从磁盘缓存加载的图片

绿色：代表从内存中加载的图片

如果项目中使用了OkHttp库的话，默认会使用OkHttp来下载图片。否则使用HttpUrlConnection来下载图片。



# 扩展阅读

[RequestHandler API for Picasso library](http://blog.jpardogo.com/requesthandler-api-for-picasso-library/)

[Custom Picasso Downloader](http://blog.jpardogo.com/custom-picasso-downloader/)






