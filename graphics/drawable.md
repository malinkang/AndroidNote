Drawable是“可绘制的东西”的一般抽象。大多数情况下，您将处理Drawable作为将东西绘制到屏幕上的资源类型; Drawable类提供了一个通用API，用于处理可能采用各种形式的底层可视资源。与视图不同，Drawable没有任何设备可以接收事件或以其他方式与用户交互。

除了简单的绘图之外，Drawable还提供了一些通用的机制，以便客户端与所绘制的内容进行交互：

* 必须调用setBounds（Rect）方法来告诉Drawable绘制的位置以及它应该有多大。所有的Drawable都应该遵循所请求的大小，通常只需缩放它们的图像。客户端可以使用getIntrinsicHeight（）和getIntrinsicWidth（）方法找到一些Drawable的首选大小。
* getPadding（Rect）方法可以从一些Drawable信息返回关于如何框架放置在其中的内容。例如，一个想要作为按钮小部件的框架的Drawable将需要返回将标签正确放置在其内部的填充。
* setState（int []）方法允许客户端告诉Drawable在哪个状态下被绘制，例如“focus”，“selected”等。一些可绘制可以根据所选状态来修改它们的图像。
* setLevel（int）方法允许客户端提供可以修改Drawable的单个连续控制器，例如电池电量或进度级别。一些可绘制可以根据当前水平修改其图像。 
* Drawable可以通过Drawable.Callback界面回调其客户端来执行动画。所有客户端都应该支持这个界面（通过setCallback（Drawable.Callback）），以便动画可以工作。一个简单的方法是通过系统设施，如setBackground（Drawable）和ImageView。

虽然应用程序通常不可见，但Drawable可能采用各种形式：

* Bitmap：最简单的Drawable，PNG或JPEG图像。
* Nine Patch：PNG格式的扩展允许它指定有关如何拉伸和放置内容的信息。
* Vector：在XML文件中定义的一个drawable作为一组点，线和曲线及其关联的颜色信息。可以缩放这种类型的可绘制，而不会损失显示质量。
* Shape：包含简单的绘图命令而不是原始位图，允许它在某些情况下更好地调整大小。
* Layers：一个复合的drawable，它可以在彼此之上绘制多个底层可绘图。
* States：根据其状态选择一组可绘图之一的复合绘制。
* Levels：根据其级别选择一组可绘图之一的复合绘图。
* Scale：一个单个可绘制单元的复合绘制，其总体尺寸根据当前水平进行修改。自

### 定义可绘制

所有版本的Android允许在运行时扩展和使用Drawable类代替框架提供的可绘制类。从API 24开始，可以在XML中使用自定义可绘图类。注意：自定义可绘制类只能在应用程序包中访问。其他应用程序将无法加载它们。至少，自定义drawable类必须在Drawable上实现抽象方法，并且应该覆盖Draw（Canvas）方法来绘制内容。可以以多种方式在XML中使用自定义可绘制类：

* 将完全限定类名用作XML元素名称。对于此方法，自定义drawable类必须是公共顶级类。

```xml
 <com.myapp.MyCustomDrawable xmlns:android="http://schemas.android.com/apk/res/android"
     android:color="#ffff0000" />
```

使用drawable作为XML元素名称，并从类属性中指定完全限定类名。此方法可用于公共顶层类和公共静态内部类。

```xml
 <drawable xmlns:android="http://schemas.android.com/apk/res/android"
     class="com.myapp.MyTopLevelClass$InnerCustomDrawable"
     android:color="#ffff0000" />
 
```