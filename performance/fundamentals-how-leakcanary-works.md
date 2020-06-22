# LeakCanary如何工作

一旦安装了`LeakCanary`，它就会按照以下4个步骤自动检测和报告内存泄漏

* 检测持有对象
* 转储堆。
* 分析堆。
* 对泄漏进行分类。

## 1. 检测持有对象

`LeakCanary`与`Android`生命周期想关联，自动检测`Activity`和`Fragment`何时被销毁，何时应该被垃圾回收。这些被销毁的对象被传递给`ObjectWatcher`，该`ObjectWatcher`持有对它们的弱引用。`LeakCanary`会自动检测以下对象的泄漏:

* 销毁的`Activity`实例
* 销毁的`Fragment`实例
* 销毁的`View`实例
* `ViewModel`实例

您可以观看任何不再需要的对象，例如一个分离的视图或一个被破坏的演示器。
```java
AppWatcher.objectWatcher.watch(myDetachedView, "View was detached")
```

如果`ObjectWatcher`持有的弱引用在等待5秒并运行垃圾回收后没有被清除，被监视的对象就会被认为是被持有，并且有可能泄漏。`LeakCanary`将此记录到`Logcat`。

```
D LeakCanary: Watching instance of com.example.leakcanary.MainActivity
  (Activity received Activity#onDestroy() callback) 

... 5 seconds later ...

D LeakCanary: Scheduling check for retained objects because found new object
  retained
```

LeakCanary等待保留对象的计数达到阈值后才会转储堆，并显示最新计数的通知。

![图1.LeakCanary发现4个保留对象](https://square.github.io/leakcanary/images/retained-notification.png)

```
D LeakCanary: Rescheduling check for retained objects in 2000ms because found
  only 4 retained objects (< 5 while app visible)
```

> 默认的阈值是当应用可见时保留5个对象，当应用不可见时保留1个对象。如果您看到保留对象通知，然后将应用程序置于后台（例如按下主页按钮），那么阈值从5变为1，LeakCanary会在5秒内转储堆。点击通知会迫使LeakCanary立即转储堆。

## 2.转储堆

当保留对象的数量达到阈值时，LeakCanary会将Java堆转储到一个存储在Android文件系统上的.hprof文件（堆转储）中（参见LeakCanary在哪里存储堆转储？转储堆会使应用程序冻结很短的时间，在此期间，LeakCanary会显示以下`Toast`。

![图2. LeakCanary在转储堆的同时，也展示了一个Toast。](https://square.github.io/leakcanary/images/dumping-toast.png)


## 3.分析堆

LeakCanary使用Shark解析.hprof文件，并定位该堆转储中保留的对象。

![图3.LeakCanary在堆转储中找到保留的对象。LeakCanary在堆转储中找到保留的对象。](https://square.github.io/leakcanary/images/finding-retained-notification.png)

对于每个保留的对象，LeakCanary会找到防止该保留对象被垃圾回收的引用路径：它的泄漏跟踪。你将在下一节学习分析泄漏跟踪。修复内存泄漏。


![图4. LeakCanary计算每个保留对象的泄漏跟踪。](https://square.github.io/leakcanary/images/building-leak-traces-notification.png)


当分析完成后，LeakCanary会显示一个带有摘要的通知，并在Logcat中打印结果。请注意下面的4个保留对象是如何被归为2个不同的泄漏的。LeakCanary 为每个泄漏跟踪创建一个签名，并将具有相同签名的泄漏分组在一起，即由相同错误引起的泄漏。

![图5. 4条泄漏痕迹变成了2个不同的泄漏信号。](https://square.github.io/leakcanary/images/analysis-done.png)

```
====================================
HEAP ANALYSIS RESULT
====================================
2 APPLICATION LEAKS

Displaying only 1 leak trace out of 2 with the same signature
Signature: ce9dee3a1feb859fd3b3a9ff51e3ddfd8efbc6
┬───
│ GC Root: Local variable in native code
│
...
```
点击通知会打开一个`Activity`，提供更多细节。稍后通过点击LeakCanary启动器图标再次回到它。

![图6.LeakCanary为每个安装的应用添加启动器图标](https://square.github.io/leakcanary/images/launcher.png)

每一行对应于一组具有相同签名的泄漏。LeakCanary在应用程序首次触发具有该签名的泄漏时，将某行标记为 "New"。

![图7. 4个泄漏点分为2行，每一个不同的泄漏点签名都有一行。](https://square.github.io/leakcanary/images/heap-dump.png)


点击一个泄漏物，打开一个有泄漏痕迹的屏幕。你可以通过下拉菜单在保留的对象和它们的泄漏痕迹之间进行切换。

![图8. 屏幕上显示了3个按其共同泄漏特征分组的泄漏。](https://square.github.io/leakcanary/images/leak-screen.png)

泄漏签名是涉嫌导致泄漏的每个参考文献的连接的哈希值，即每个参考文献用红色下划线显示。


![图9. 一个有3个可疑参照物的泄漏跟踪。](https://square.github.io/leakcanary/images/signature.png)

当泄漏跟踪以文本形式共享时，这些同样可疑的引用会用~~~来下划线。
```
...
│  
├─ com.example.leakcanary.LeakingSingleton class
│    Leaking: NO (a class is never leaking)
│    ↓ static LeakingSingleton.leakedViews
│                              ~~~~~~~~~~~
├─ java.util.ArrayList instance
│    Leaking: UNKNOWN
│    ↓ ArrayList.elementData
│                ~~~~~~~~~~~
├─ java.lang.Object[] array
│    Leaking: UNKNOWN
│    ↓ Object[].[0]
│               ~~~
├─ android.widget.TextView instance
│    Leaking: YES (View.mContext references a destroyed activity)
...

```

在上面的例子中，泄漏的签名将被计算为：
```Kotlin
val leakSignature = sha1Hash(
    "com.example.leakcanary.LeakingSingleton.leakedView" +
    "java.util.ArrayList.elementData" +
    "java.lang.Object[].[x]"
)
println(leakSignature)
// dbfa277d7e5624792e8b60bc950cd164190a11aa
```

## 4.泄露分类

LeakCanary 将它在您的应用程序中发现的泄漏分为两类。应用程序泄漏和库泄漏。库泄漏是由您无法控制的第三方代码中的已知错误引起的泄漏。这种泄漏影响了您的应用程序，但不幸的是，修复它可能不在您的控制范围内，所以LeakCanary将其分离出来。

在Logcat打印的结果中，这两类是分开的。

```
====================================
HEAP ANALYSIS RESULT
====================================
0 APPLICATION LEAKS

====================================
1 LIBRARY LEAK

...
┬───
│ GC Root: Local variable in native code
│
...
```
`LeakCanary`在其泄漏名单中，将一行人标记为图书馆泄漏。
![图10.LeakCanary发现图书馆泄漏。LeakCanary发现了一个library泄漏。](https://square.github.io/leakcanary/images/library-leak.png)


LeakCanary 提供了一个已知泄漏的数据库，它通过参考名称的模式匹配来识别。例如：

```
Leak pattern: instance field android.app.Activity$1#this$0
Description: Android Q added a new IRequestFinishCallback$Stub class [...]
┬───
│ GC Root: Global variable in native code
│
├─ android.app.Activity$1 instance
│    Leaking: UNKNOWN
│    Anonymous subclass of android.app.IRequestFinishCallback$Stub
│    ↓ Activity$1.this$0
│                 ~~~~~~
╰→ com.example.MainActivity instance
```