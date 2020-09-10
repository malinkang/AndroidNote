


在Android中不允许Activity新启动的线程访问该Activity里的UI组件，这样会导致新启动的线程无法改变UI组件的属性值。但实际开发中，很多地方需要在工作线程中改变UI组件的属性值，比如下载网络图片、动画等等。


[Handler](http://developer.android.com/reference/android/os/Handler.html)，它直接继承自Object，一个Handler允许发送和处理`Message`或者`Runnable`对象，并且会关联到主线程的`MessageQueue`中。每个Handler具有一个单独的线程，并且关联到一个消息队列的线程，就是说一个Handler有一个固有的消息队列。当实例化一个Handler的时候，它就承载在一个线程和消息队列的线程，这个Handler可以把Message或Runnable压入到消息队列，并且从消息队列中取出Message或Runnable，进而操作它们。

Handler主要有两个作用：

* 在工作线程中发送消息。
* 在UI线程中获取、处理消息。



## Handler使用

上面介绍到Handler可以把一个Message对象或者Runnable对象压入到消息队列中，进而在UI线程中获取Message或者执行Runnable对象，所以Handler把压入消息队列有两大体系，Post和sendMessage。


### Post

对于Handler的Post方式来说，它会传递一个Runnable对象到消息队列中，在这个Runnable对象中，重写run()方法。一般在这个run()方法中写入需要在UI线程上的操作。

Post有下列方法
  * post(Runnable r)：把一个Runnable入队到消息队列中，UI线程从消息队列中取出这个对象后，立即执行。
  * postAtFrontOfQueue(Runnable r)
  * postAtTime(Runnable r, Object token, long uptimeMillis)
  * postAtTime(Runnable r, long uptimeMillis)：把一个Runnable入队到消息队列中，UI线程从消息队列中取出这个对象后，在特定的时间执行。
  * postDelayed(Runnable r, long delayMillis)：把一个Runnable入队到消息队列中，UI线程从消息队列中取出这个对象后，延迟delayMills秒执行。
  * removeCallbacks(Runnable r):从消息队列中移除一个Runnable对象。

对于Post方式而言，它其中Runnable对象的run()方法的代码，均执行在UI线程上，所以对于这段代码而言，不能执行在UI线程上的操作，一样无法使用post方式执行，比如说访问网络。


### Message

Handler如果使用sendMessage的方式把消息入队到消息队列中，需要传递一个Message对象，而在Handler中，需要重写handleMessage()方法，用于获取工作线程传递过来的消息，此方法运行在UI线程上。下面先介绍一下Message。

[Message](http://developer.android.com/reference/android/os/Message.html)是一个final类，所以不可被继承。Message封装了线程中传递的消息，如果对于一般的数据，Message提供了getData()和setData()方法来获取与设置数据，其中操作的数据是一个Bundle对象.

还有另外一种方式在Message中传递对象，那就是使用Message自带的obj属性传值，它是一个Object类型，所以可以传递任意类型的对象，Message自带的有如下几个属性：

* int arg1：参数一，用于传递不复杂的数据，复杂数据使用setData()传递。
* int arg2：参数二，用于传递不复杂的数据，复杂数据使用setData()传递。
* Object obj：传递一个任意的对象。
* int what：定义的消息码，一般用于设定消息的标志。

对于`Message`对象，一般并不推荐直接使用它的构造方法得到，而是建议通过使用`Message.obtain()`这个静态的方法或者`Handler.obtainMessage()`获取。`Message.obtain()`会从消息池中获取一个`Message`对象，如果消息池中是空的，才会使用构造方法实例化一个新`Message`，这样有利于消息资源的利用。并不需要担心消息池中的消息过多，它是有上限的，上限为10个。Handler.obtainMessage()具有多个重载方法，如果查看源码，会发现其实Handler.obtainMessage()在内部也是调用的Message.obtain()。

`Message.obtain()`方法具有多个重载方法，大致可以分为为两类，一类是无需传递`Handler`对象，对于这类的方法，当填充好消息后，需要调用`Handler.sendMessage()`方法来发送消息到消息队列中。第二类需要传递一个`Handler`对象，这类方法可以直接使用`Message.sendToTarget()`方法发送消息到消息队列中，这是因为在Message对象中有一个私有的Handler类型的属性Target，当时obtain方法传递进一个Handler对象的时候，会给Target属性赋值，当调用sendToTarget()方法的时候，实际在它内部还是调用的Target.sendMessage()方法。


### sendMessage

Handler中，与Message发送消息相关的方法有：

* obtainMessage()：获取一个Message对象。
* sendMessage()：发送一个Message对象到消息队列中，并在UI线程取到消息后，立即执行。
* sendMessageDelayed()：发送一个Message对象到消息队列中，在UI线程取到消息后，延迟执行。
* sendEmptyMessage(int what)：发送一个空的Message对象到队列中，并在UI线程取到消息后，立即执行。
* sendEmptyMessageDelayed(int what,long delayMillis)：发送一个空Message对象到消息队列中，在UI线程取到消息后，延迟执行。
* removeMessage()：从消息队列中移除一个未响应的消息

在Handler中，也定义了一些发送空消息的方法，如：sendEmptyMessage(int what)、sendEmptyMessageDelayed(int what,long delayMillis)，看似这些方法没有使用Message就可以发送一个消息，但是如果查看源码就会发现，其实内部也是从Message.obtain()方法中获取一个Message对象，然后给属性赋值，最后使用sendMessage()发送消息到消息队列中。

## 源码分析


### Looper

我们知道一个线程是一段可执行的代码，当可执行代码执行完成后，线程生命周期便会终止，线程就会退出，那么作为App的主线程，如果代码段执行完了会怎样？，那么就会出现App启动后执行一段代码后就自动退出了，这是很不合理的。所以为了防止代码段被执行完，只能在代码中插入一个死循环，那么代码就不会被执行完，然后自动退出，怎么在在代码中插入一个死循环呢？那么Looper出现了，在主线程中调用Looper.prepare()...Looper.loop()就会变当前线程变成Looper线程（可以先简单理解：无限循环不退出的线程），Looper.loop()方法里面有一段死循环的代码，所以主线程会进入while(true){...}的代码段跳不出来，但是主线程也不能什么都不做吧？其实所有做的事情都在while(true){...}里面做了，主线程会在死循环中不断等其他线程给它发消息（消息包括：Activity启动，生命周期，更新UI，控件事件等），一有消息就根据消息做相应的处理，Looper的另外一部分工作就是在循环代码中会不断从消息队列挨个拿出消息给主线程处理。


在`Looper`的`loop()`方法中循环从`MessageQueue`中取出Message，然后通过`Handler`来处理消息。假若队列为空，那么它会进入休眠。



Handler方法提供接收一个Looper对象的构造函数。但是在UI线程中创建调用不带参数的构造函数也不会报错，那么UI线程的Looper是何时创建的呢？其实在程序启动时，系统就为UI线程创建了一个Looper对象。

```java
//ActivityThread的main方法
public static void main(String[] args) {
    //...
    Looper.prepareMainLooper();

    // Find the value for {@link #PROC_START_SEQ_IDENT} if provided on the command line.
    // It will be in the format "seq=114"
    long startSeq = 0;
    if (args != null) {
        for (int i = args.length - 1; i >= 0; --i) {
            if (args[i] != null && args[i].startsWith(PROC_START_SEQ_IDENT)) {
                startSeq = Long.parseLong(
                        args[i].substring(PROC_START_SEQ_IDENT.length()));
            }
        }
    }
    //创建一下ActivityThread对象，这边需要注意的时候ActivityThread并不是一个线程，
    //它并没有继承Thread，而只是一个普通的类
    ActivityThread thread = new ActivityThread();
    //会创建一个Binder线程（具体是指ApplicationThread，该Binder线程会通过想 
    //Handler将Message发送给主线程
    thread.attach(false, startSeq);

    if (sMainThreadHandler == null) {
        sMainThreadHandler = thread.getHandler();
    }

    if (false) {
        Looper.myLooper().setMessageLogging(new
                LogPrinter(Log.DEBUG, "ActivityThread"));
    }

    // End of event ActivityThreadMain.
    Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
    Looper.loop();

    throw new RuntimeException("Main thread loop unexpectedly exited");
}
```

Looper的`prepareMainLooper`方法会创建一个`Looper`实例然后放入到`ThreadLocal`中，然后创建`Handler`时会获取该实例。

```java

private static void prepare(boolean quitAllowed) {
    //prepare多次调用会崩溃
    if (sThreadLocal.get() != null) {
        throw new RuntimeException("Only one Looper may be created per thread");
    }
    sThreadLocal.set(new Looper(quitAllowed));
}
public static void prepareMainLooper() {
    prepare(false);
    synchronized (Looper.class) {
        if (sMainLooper != null) {
            throw new IllegalStateException("The main Looper has already been prepared.");
        }
        sMainLooper = myLooper();
    }
}
//获取主线程的Looper
public static Looper getMainLooper() {
    synchronized (Looper.class) {
        return sMainLooper;
    }
}

public void quit() {
    mQueue.quit(false);
}

public void quitSafely() {
    mQueue.quit(true);
}
```

quit() 和 quitSafely() 的本质就是让消息队列的 next() 返回 null，以此来退出Looper.loop()。
quit() 调用后直接终止 Looper，不在处理任何 Message，所有尝试把 Message 放进消息队列的操作都会失败，比如 Handler.sendMessage() 会返回 false，但是存在不安全性，因为有可能有 Message 还在消息队列中没来的及处理就终止 Looper 了。
quitSafely() 调用后会在所有消息都处理后再终止 Looper，所有尝试把 Message 放进消息队列的操作也都会失败。

创建Looper的时候，会创建一个`MessageQueue`对象。

```java
//Looper的构造函数是私有的所以不能直接调用Looper的构造函数
private Looper(boolean quitAllowed) {
    mQueue = new MessageQueue(quitAllowed);
    mThread = Thread.currentThread();
}
```

```java
public static void loop() {
    final Looper me = myLooper();
    if (me == null) {
        throw new RuntimeException("No Looper; Looper.prepare() wasn't called on this thread.");
    }
    final MessageQueue queue = me.mQueue;
    //...
    for (;;) {
        Message msg = queue.next(); // might block
        if (msg == null) {
            // No message indicates that the message queue is quitting.
            //没有消息表示消息队列正在退出。
            return;
        }
        //...
        try {
        
            msg.target.dispatchMessage(msg);
            dispatchEnd = needEndTime ? SystemClock.uptimeMillis() : 0;
        } finally {
            if (traceTag != 0) {
                Trace.traceEnd(traceTag);
            }
        }
        //...
        msg.recycleUnchecked();

    }
}
```

在`loop()`中，调用`msg.target`的`dispatchMessage`方法来分发消息。`msg.target` 是一个`Handler`对象，哪个`Handler`把这个`Message`发到队列里，这个Message会持有这个Handler的引用，并放到自己的target变量中,这样就可以回调我们重写的handler的handleMessage方法。



### Handler

简单说`Handler`用于同一个进程的线程间通信。`Looper`让主线程无限循环地从自己的`MessageQueue`拿出消息处理，既然这样我们就知道处理消息肯定是在主线程中处理的，那么怎样在其他的线程往主线程的队列里放入消息呢？其实很简单，我们知道在同一进程中线程和线程之间资源是共享的，也就是对于任何变量在任何线程都是可以访问和修改的，只要考虑并发性做好同步就行了，那么只要拿到`MessageQueue`的实例，就可以往主线程的`MessageQueue`放入消息，主线程在轮询的时候就会在主线程处理这个消息。


```java
public Handler(Callback callback, boolean async) {
    //...
    //获取Looper对象
    mLooper = Looper.myLooper();
    if (mLooper == null) {
        throw new RuntimeException(
            "Can't create handler inside thread " + Thread.currentThread()
                    + " that has not called Looper.prepare()");
    }
    //获取Looper对象的MessageQueue对象
    mQueue = mLooper.mQueue;
    mCallback = callback;
    mAsynchronous = async;
}
```
`Looper`对象的`myLooper`方法
```
static final ThreadLocal<Looper> sThreadLocal = new ThreadLocal<Looper>();
public static @Nullable Looper myLooper() {
    return sThreadLocal.get();
}
```
`ThreadLocal`即线程本地存储区（Thread Local Storage，简称为TLS），每个线程都有自己的私有的本地存储区域，不同线程之间彼此不能访问对方的TLS区域。这里线程自己的本地存储区域存放是线程自己的Looper。

`Handler`发送消息在另外一个线程。发送消息线程和`Lopper`所在的线程共享`MessageQueue`对象。发送消息会将`Message`对象放入到`MessageQueue`中。

```java
public boolean sendMessageAtTime(Message msg, long uptimeMillis) {
    MessageQueue queue = mQueue;
    if (queue == null) {
        RuntimeException e = new RuntimeException(
                this + " sendMessageAtTime() called with no mQueue");
        Log.w("Looper", e.getMessage(), e);
        return false;
    }
    return enqueueMessage(queue, msg, uptimeMillis);
}
private boolean enqueueMessage(MessageQueue queue, Message msg, long uptimeMillis) {
    msg.target = this;
    if (mAsynchronous) {
        msg.setAsynchronous(true);
    }
    return queue.enqueueMessage(msg, uptimeMillis);
}


```
### Message

```
//Message采用单链表的形式，next指向下一个消息
Message next;
```



### MessageQueue


```java
Message next() {
    // Return here if the message loop has already quit and been disposed.
    // This can happen if the application tries to restart a looper after quit
    // which is not supported.
    final long ptr = mPtr;
    if (ptr == 0) {
        return null;
    }

    int pendingIdleHandlerCount = -1; // -1 only during first iteration
    int nextPollTimeoutMillis = 0;
    for (;;) {
        if (nextPollTimeoutMillis != 0) {
            Binder.flushPendingCommands();
        }

        nativePollOnce(ptr, nextPollTimeoutMillis);

        synchronized (this) {
            // Try to retrieve the next message.  Return if found.
            final long now = SystemClock.uptimeMillis();
            Message prevMsg = null;
            Message msg = mMessages;
            if (msg != null && msg.target == null) {
                // Stalled by a barrier.  Find the next asynchronous message in the queue.
                do {
                    prevMsg = msg;
                    msg = msg.next;
                } while (msg != null && !msg.isAsynchronous());
            }
            if (msg != null) {
                if (now < msg.when) {
                    // Next message is not ready.  Set a timeout to wake up when it is ready.
                    nextPollTimeoutMillis = (int) Math.min(msg.when - now, Integer.MAX_VALUE);
                } else {
                    // Got a message.
                    mBlocked = false;
                    if (prevMsg != null) {
                        prevMsg.next = msg.next;
                    } else {
                        mMessages = msg.next;
                    }
                    msg.next = null;
                    if (DEBUG) Log.v(TAG, "Returning message: " + msg);
                    msg.markInUse();
                    return msg;
                }
            } else {
                // No more messages.
                nextPollTimeoutMillis = -1;
            }

            // Process the quit message now that all pending messages have been handled.
            if (mQuitting) {
                dispose();
                return null;
            }

            // If first time idle, then get the number of idlers to run.
            // Idle handles only run if the queue is empty or if the first message
            // in the queue (possibly a barrier) is due to be handled in the future.
            if (pendingIdleHandlerCount < 0
                    && (mMessages == null || now < mMessages.when)) {
                pendingIdleHandlerCount = mIdleHandlers.size();
            }
            if (pendingIdleHandlerCount <= 0) {
                // No idle handlers to run.  Loop and wait some more.
                mBlocked = true;
                continue;
            }

            if (mPendingIdleHandlers == null) {
                mPendingIdleHandlers = new IdleHandler[Math.max(pendingIdleHandlerCount, 4)];
            }
            mPendingIdleHandlers = mIdleHandlers.toArray(mPendingIdleHandlers);
        }

    }
}
```




## 扩展阅读

* [Android 消息处理机制（Looper、Handler、MessageQueue,Message）](https://www.jianshu.com/p/02962454adf7)
* [Android--多线程之Handler](http://www.cnblogs.com/plokmju/p/android_Handler.html)
* [Handler 中 sendMessage() 源代码剖析](http://blog.csdn.net/ahuier/article/details/17013647)
* [How to Leak a Context: Handlers & Inner Classes](http://www.androiddesignpatterns.com/2013/01/inner-class-handler-memory-leak.html)
* [Android中为什么主线程不会因为Looper.loop()里的死循环卡死？](https://www.zhihu.com/question/34652589)
* [Android 高级面试-1：Handler 相关](https://juejin.im/post/6844903778844409863)

















