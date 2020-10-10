# Glide使用

## 使用

```java
//加载asset目录下的文件
 GlideApp.with(imageView)
        .load("file:///android_asset/image.png")
        .into(imageView);
//加载res目录下的图片
GlideApp.with(imageView)
        .load("android.resource://" + getPackageName() + "/" + R.drawable.image)
        .into(imageView);

GlideApp.with(imageView)
    .load(R.drawable.image)
    .into(imageView);
```

## 遇到的坑

1. 设置圆角有时候不生效，[解决方案](https://github.com/wasabeef/glide-transformations/issues/94)。
2. 图片加载不出来，图片地址：[http://imgservicepa.suning.cn/uimg1/b2c/image/cvhQElXhldg3mMEbKaImAA.jpg\_720h\_1280w\_4e\_0l](http://imgservicepa.suning.cn/uimg1/b2c/image/cvhQElXhldg3mMEbKaImAA.jpg_720h_1280w_4e_0l) ，因为请求头里的User-Agent，导致请求被拒。

## 相关文档

* [https://bumptech.github.io/glide/](https://bumptech.github.io/glide/)
* [https://github.com/wasabeef/glide-transformations](https://github.com/wasabeef/glide-transformations)

