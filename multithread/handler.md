##Handler


在Android中不允许Activity新启动的线程访问该Activity里的UI组件，这样会导致新启动的线程无法改变UI组件的属性值。但实际开发中，很多地方需要在工作线程中改变UI组件的属性值，比如下载网络图片、动画等等。


[Handler](http://developer.android.com/reference/android/os/Handler.html)，它直接继承自Object，一个Handler允许发送和处理`Message`或者`Runnable`对象，并且会关联到主线程的`MessageQueue`中。每个Handler具有一个单独的线程，并且关联到一个消息队列的线程，就是说一个Handler有一个固有的消息队列。当实例化一个Handler的时候，它就承载在一个线程和消息队列的线程，这个Handler可以把Message或Runnable压入到消息队列，并且从消息队列中取出Message或Runnable，进而操作它们。

Handler主要有两个作用：

* 在工作线程中发送消息。
* 在UI线程中获取、处理消息。

### 1.创建Handler

Handler具有下列构造函数：



### 2.使用Handler

上面介绍到Handler可以把一个Message对象或者Runnable对象压入到消息队列中，进而在UI线程中获取Message或者执行Runnable对象，所以Handler把压入消息队列有两大体系，Post和sendMessage。


#### 2.1 Post
对于Handler的Post方式来说，它会传递一个Runnable对象到消息队列中，在这个Runnable对象中，重写run()方法。一般在这个run()方法中写入需要在UI线程上的操作。

Post有下列方法
  * [public final boolean post (Runnable r)](http://developer.android.com/reference/android/os/Handler.html#post(java.lang.Runnable))：把一个Runnable入队到消息队列中，UI线程从消息队列中取出这个对象后，立即执行。
  * [public final boolean postAtFrontOfQueue (Runnable r)](http://developer.android.com/reference/android/os/Handler.html#postAtFrontOfQueue(java.lang.Runnable))
  * [public final boolean postAtTime (Runnable r, Object token, long uptimeMillis)](http://developer.android.com/reference/android/os/Handler.html#postAtTime(java.lang.Runnable, java.lang.Object, long))
  * [public final boolean postAtTime (Runnable r, long uptimeMillis)](http://developer.android.com/reference/android/os/Handler.html#postAtTime(java.lang.Runnable, long))：把一个Runnable入队到消息队列中，UI线程从消息队列中取出这个对象后，在特定的时间执行。
  * [public final boolean postDelayed (Runnable r, long delayMillis)](http://developer.android.com/reference/android/os/Handler.html#postDelayed(java.lang.Runnable, long))：boolean postDelayed(Runnable r,long delayMillis)：把一个Runnable入队到消息队列中，UI线程从消息队列中取出这个对象后，延迟delayMills秒执行。
  * [public final void removeCallbacks (Runnable r)](http://developer.android.com/reference/android/os/Handler.html#removeCallbacks(java.lang.Runnable)):从消息队列中移除一个Runnable对象。

对于Post方式而言，它其中Runnable对象的run()方法的代码，均执行在UI线程上，所以对于这段代码而言，不能执行在UI线程上的操作，一样无法使用post方式执行，比如说访问网络。


#### 2.2Message

Handler如果使用sendMessage的方式把消息入队到消息队列中，需要传递一个Message对象，而在Handler中，需要重写handleMessage()方法，用于获取工作线程传递过来的消息，此方法运行在UI线程上。下面先介绍一下Message。

[Message](http://developer.android.com/reference/android/os/Message.html)是一个final类，所以不可被继承。Message封装了线程中传递的消息，如果对于一般的数据，Message提供了getData()和setData()方法来获取与设置数据，其中操作的数据是一个Bundle对象.

还有另外一种方式在Message中传递对象，那就是使用Message自带的obj属性传值，它是一个Object类型，所以可以传递任意类型的对象，Message自带的有如下几个属性：

* int arg1：参数一，用于传递不复杂的数据，复杂数据使用setData()传递。
* int arg2：参数二，用于传递不复杂的数据，复杂数据使用setData()传递。
* Object obj：传递一个任意的对象。
* int what：定义的消息码，一般用于设定消息的标志。

对于`Message`对象，一般并不推荐直接使用它的构造方法得到，而是建议通过使用`Message.obtain()`这个静态的方法或者`Handler.obtainMessage()`获取。`Message.obtain()`会从消息池中获取一个`Message`对象，如果消息池中是空的，才会使用构造方法实例化一个新`Message`，这样有利于消息资源的利用。并不需要担心消息池中的消息过多，它是有上限的，上限为10个。Handler.obtainMessage()具有多个重载方法，如果查看源码，会发现其实Handler.obtainMessage()在内部也是调用的Message.obtain()。

`Message.obtain()`方法具有多个重载方法，大致可以分为为两类，一类是无需传递`Handler`对象，对于这类的方法，当填充好消息后，需要调用`Handler.sendMessage()`方法来发送消息到消息队列中。第二类需要传递一个`Handler`对象，这类方法可以直接使用`Message.sendToTarget()`方法发送消息到消息队列中，这是因为在Message对象中有一个私有的Handler类型的属性Target，当时obtain方法传递进一个Handler对象的时候，会给Target属性赋值，当调用sendToTarget()方法的时候，实际在它内部还是调用的Target.sendMessage()方法。


#### 2.3 sendMessage

Handler中，与Message发送消息相关的方法有：

* Message obtainMessage()：获取一个Message对象。
* boolean sendMessage()：发送一个Message对象到消息队列中，并在UI线程取到消息后，立即执行。
* boolean sendMessageDelayed()：发送一个Message对象到消息队列中，在UI线程取到消息后，延迟执行。
* boolean sendEmptyMessage(int what)：发送一个空的Message对象到队列中，并在UI线程取到消息后，立即执行。
* boolean sendEmptyMessageDelayed(int what,long delayMillis)：发送一个空Message对象到消息队列中，在UI线程取到消息后，延迟执行。
* void removeMessage()：从消息队列中移除一个未响应的消息

在Handler中，也定义了一些发送空消息的方法，如：sendEmptyMessage(int what)、sendEmptyMessageDelayed(int what,long delayMillis)，看似这些方法没有使用Message就可以发送一个消息，但是如果查看源码就会发现，其实内部也是从Message.obtain()方法中获取一个Message对象，然后给属性赋值，最后使用sendMessage()发送消息到消息队列中。


## 扩展阅读

* [Android--多线程之Handler](http://www.cnblogs.com/plokmju/p/android_Handler.html)
* [Handler 中 sendMessage() 源代码剖析](http://blog.csdn.net/ahuier/article/details/17013647)
* [How to Leak a Context: Handlers & Inner Classes](http://www.androiddesignpatterns.com/2013/01/inner-class-handler-memory-leak.html)

















