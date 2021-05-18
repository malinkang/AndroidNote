# Handler源码分析

## Looper

我们知道一个线程是一段可执行的代码，当可执行代码执行完成后，线程生命周期便会终止，线程就会退出，那么作为App的主线程，如果代码段执行完了会怎样？，那么就会出现App启动后执行一段代码后就自动退出了，这是很不合理的。所以为了防止代码段被执行完，只能在代码中插入一个死循环，那么代码就不会被执行完，然后自动退出，怎么在在代码中插入一个死循环呢？那么Looper出现了，在主线程中调用Looper.prepare\(\)...Looper.loop\(\)就会变当前线程变成Looper线程（可以先简单理解：无限循环不退出的线程），Looper.loop\(\)方法里面有一段死循环的代码，所以主线程会进入while\(true\){...}的代码段跳不出来，但是主线程也不能什么都不做吧？其实所有做的事情都在while\(true\){...}里面做了，主线程会在死循环中不断等其他线程给它发消息（消息包括：Activity启动，生命周期，更新UI，控件事件等），一有消息就根据消息做相应的处理，Looper的另外一部分工作就是在循环代码中会不断从消息队列挨个拿出消息给主线程处理。

在`Looper`的`loop()`方法中循环从`MessageQueue`中取出`Message`，然后通过`Handler`来处理消息。假若队列为空，那么它会进入休眠。

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

### prepare\(\)

对于无参的情况，默认调用`prepare(true)`，表示的是这个Looper允许退出，而对于false的情况则表示当前Looper不允许退出。

```java
private static void prepare(boolean quitAllowed) {
    //prepare多次调用会崩溃
    if (sThreadLocal.get() != null) {
        throw new RuntimeException("Only one Looper may be created per thread");
    }
    sThreadLocal.set(new Looper(quitAllowed));
}
```

```java
public static void prepareMainLooper() {
    prepare(false);
    synchronized (Looper.class) {
        if (sMainLooper != null) {
            throw new IllegalStateException("The main Looper has already been prepared.");
        }
        sMainLooper = myLooper();
    }
}
```

```java
//获取主线程的Looper
public static Looper getMainLooper() {
    synchronized (Looper.class) {
        return sMainLooper;
    }
}
```

quit\(\) 和 quitSafely\(\) 的本质就是让消息队列的 next\(\) 返回 null，以此来退出Looper.loop\(\)。 quit\(\) 调用后直接终止 Looper，不在处理任何 Message，所有尝试把 Message 放进消息队列的操作都会失败，比如 Handler.sendMessage\(\) 会返回 false，但是存在不安全性，因为有可能有 Message 还在消息队列中没来的及处理就终止 Looper 了。 quitSafely\(\) 调用后会在所有消息都处理后再终止 Looper，所有尝试把 Message 放进消息队列的操作也都会失败。

创建Looper的时候，会创建一个`MessageQueue`对象。

```java
//Looper的构造函数是私有的所以不能直接调用Looper的构造函数
private Looper(boolean quitAllowed) {
    //在Looper的构造函数中创建了MessageQueue，所以每个线程也只有1个MessageQueue
    mQueue = new MessageQueue(quitAllowed);
    mThread = Thread.currentThread();
}
```

### loop\(\)

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
        //回收消息
        msg.recycleUnchecked();

    }
}
```

在`loop()`中，调用`msg.target`的`dispatchMessage`方法来分发消息。`msg.target` 是一个`Handler`对象，哪个`Handler`把这个`Message`发到队列里，这个Message会持有这个Handler的引用，并放到自己的target变量中,这样就可以回调我们重写的handler的handleMessage方法。

### quit\(\)

```java
public void quit() {
    mQueue.quit(false); //移除消息
}

public void quitSafely() {
    mQueue.quit(true); //安全地消息移除
}
```

Looper.quit\(\)方法的实现最终调用的是MessageQueue.quit\(\)方法

```java
//MessageQueue.java
void quit(boolean safe) {
    //当mQuitAllowed为false，表示不运行退出，强行调用quit会爬出异常
    if (!mQuitAllowed) {
        throw new IllegalStateException("Main thread not allowed to quit.");
    }
    synchronized (this) {
        //防止多次执行退出
        if (mQuitting) {
            return;
        }
        mQuitting = true;
        if (safe) {
            removeAllFutureMessagesLocked();
        } else {
            removeAllMessagesLocked();
        }
        // We can assume mPtr != 0 because mQuitting was previously false.
        nativeWake(mPtr);
    }
}
```

消息退出的方式：

* 当safe =true时，只移除尚未触发的所有消息，对于正在触发的消息并不移除；
* 当safe =flase时，移除所有的消息

## Handler

简单说`Handler`用于同一个进程的线程间通信。`Looper`让主线程无限循环地从自己的`MessageQueue`拿出消息处理，既然这样我们就知道处理消息肯定是在主线程中处理的，那么怎样在其他的线程往主线程的队列里放入消息呢？其实很简单，我们知道在同一进程中线程和线程之间资源是共享的，也就是对于任何变量在任何线程都是可以访问和修改的，只要考虑并发性做好同步就行了，那么只要拿到`MessageQueue`的实例，就可以往主线程的`MessageQueue`放入消息，主线程在轮询的时候就会在主线程处理这个消息。

### 构造函数

```java
public Handler(@Nullable Callback callback, boolean async) {
     //匿名类、内部类活本地类都必须声明为static 否则会警告可能会出现内存泄露
    if (FIND_POTENTIAL_LEAKS) {
        final Class<? extends Handler> klass = getClass();
        if ((klass.isAnonymousClass() || klass.isMemberClass() || klass.isLocalClass()) &&
                (klass.getModifiers() & Modifier.STATIC) == 0) {
            Log.w(TAG, "The following Handler class should be static or leaks might occur: " +
                klass.getCanonicalName());
        }
    }
    // //必须先执行Looper.prepare()，才能获取Looper对象，否则为null.
    //从当前线程的TLS中获取Looper对象
    mLooper = Looper.myLooper();
    if (mLooper == null) {
        throw new RuntimeException(
            "Can't create handler inside thread " + Thread.currentThread()
                    + " that has not called Looper.prepare()");
    }
    mQueue = mLooper.mQueue;//消息队列，来自Looper对象
    mCallback = callback; //回调方法
    mAsynchronous = async;//设置消息是否为异步处理方式
}
```

`Looper`对象的`myLooper`方法

```text
static final ThreadLocal<Looper> sThreadLocal = new ThreadLocal<Looper>();
public static @Nullable Looper myLooper() {
    return sThreadLocal.get();
}
```

`ThreadLocal`即线程本地存储区（Thread Local Storage，简称为TLS），每个线程都有自己的私有的本地存储区域，不同线程之间彼此不能访问对方的TLS区域。这里线程自己的本地存储区域存放是线程自己的Looper。

### 消息分发

在`Looper.loop()`中，当发现有消息时，调用消息的目标`handler`，执行`dispatchMessage()`方法来分发消息。

```java
public void dispatchMessage(@NonNull Message msg) {
    //当Message存在回调方法，回调msg.callback.run()方法；
    if (msg.callback != null) {
        handleCallback(msg);
    } else {
        if (mCallback != null) {
        //当Handler存在Callback成员变量时，回调方法handleMessage()；
            if (mCallback.handleMessage(msg)) {
                return;
            }
        }
        //Handler自身的回调方法handleMessage()
        handleMessage(msg);
    }
}
```

**分发消息流程：**

1. 当`Message`的回调方法不为空时，则回调方法`msg.callback.run()`，其中callBack数据类型为Runnable,否则进入步骤2；
2. 当`Handler`的`mCallback`成员变量不为空时，则回调方法`mCallback.handleMessage(msg)`,否则进入步骤3；
3. 调用`Handler`自身的回调方法`handleMessage()`，该方法默认为空，Handler子类通过覆写该方法来完成具体的逻辑。

对于很多情况下，消息分发后的处理方法是第3种情况，即Handler.handleMessage\(\)，一般地往往通过覆写该方法从而实现自己的业务逻辑。

### 消息发送

发送消息调用链：

  


![](../.gitbook/assets/image%20%2869%29.png)

post方法最终也是调用的send方法。只不过是把runnable对象赋值给Message的callback。

```java
public final boolean post(@NonNull Runnable r) {
   return sendMessageDelayed(getPostMessage(r), 0);
}
```

```java
private static Message getPostMessage(Runnable r) {
    Message m = Message.obtain();
    m.callback = r;
    return m;
}
```

```java
public final boolean sendMessageDelayed(@NonNull Message msg, long delayMillis) {
    if (delayMillis < 0) {
        delayMillis = 0;
    }
    return sendMessageAtTime(msg, SystemClock.uptimeMillis() + delayMillis);
}
```

```java
private boolean enqueueMessage(@NonNull MessageQueue queue, @NonNull Message msg,
        long uptimeMillis) {
    msg.target = this;
    msg.workSourceUid = ThreadLocalWorkSource.getUid();
    if (mAsynchronous) {
        msg.setAsynchronous(true);
    }
    return queue.enqueueMessage(msg, uptimeMillis);
}
```



## Message

### 消息对象

每个消息用`Message`表示，`Message`主要包含以下内容：

| 数据类型 | 成员变量 | 解释 |
| :--- | :--- | :--- |
| int | what | 消息类别 |
| long | when | 消息触发时间 |
| int | arg1 | 参数1 |
| int | arg2 | 参数2 |
| Object | obj | 消息内容 |
| Handler | target | 消息响应方 |
| Runnable | callback | 回调方法 |

创建消息的过程，就是填充消息的上述内容的一项或多项。

```text
//Message采用单链表的形式，next指向下一个消息
Message next;
```

### 消息池

在代码中，可能经常看到recycle\(\)方法，咋一看，可能是在做虚拟机的gc\(\)相关的工作，其实不然，这是用于把消息加入到消息池的作用。这样的好处是，当消息池不为空时，可以直接从消息池中获取Message对象，而不是直接创建，提高效率。

静态变量`sPool`的数据类型为Message，通过next成员变量，维护一个消息池；静态变量`MAX_POOL_SIZE`代表消息池的可用大小；消息池的默认大小为50。

消息池常用的操作方法是obtain\(\)和recycle\(\)。

```java
private static Message sPool;
```

```java
public static Message obtain() {
    synchronized (sPoolSync) {
        if (sPool != null) {
            Message m = sPool;
            sPool = m.next;
            m.next = null;
            m.flags = 0; // clear in-use flag
            sPoolSize--;
            return m;
        }
    }
    return new Message();
}
```

obtain\(\)，从消息池取Message，都是把消息池表头的Message取走，再把表头指向next;

recycle把不再使用的消息加入消息池

```java
public void recycle() {
    if (isInUse()) { //判断消息是否正在使用
        if (gCheckRecycle) { //Android 5.0以后的版本默认为true,之前的版本默认为false.
            throw new IllegalStateException("This message cannot be recycled because it is still in use.");
        }
        return;
    }
    recycleUnchecked();
}

//对于不再使用的消息，加入到消息池
void recycleUnchecked() {
    //将消息标示位置为IN_USE，并清空消息所有的参数。
    flags = FLAG_IN_USE;
    what = 0;
    arg1 = 0;
    arg2 = 0;
    obj = null;
    replyTo = null;
    sendingUid = -1;
    when = 0;
    target = null;
    callback = null;
    data = null;
    synchronized (sPoolSync) {
        if (sPoolSize < MAX_POOL_SIZE) { //当消息池没有满时，将Message对象加入消息池
            next = sPool;
            sPool = this;
            sPoolSize++; //消息池的可用大小进行加1操作
        }
    }
}
```

## MessageQueue

### IdleHandler

IdleHandler是MessageQueue内部接口

```java
/**
 * Callback interface for discovering when a thread is going to block
 * waiting for more messages.
 */
public static interface IdleHandler {
    /**
     * Called when the message queue has run out of messages and will now
     * wait for more.  Return true to keep your idle handler active, false
     * to have it removed.  This may be called if there are still messages
     * pending in the queue, but they are all scheduled to be dispatched
     * after the current time.
     */
    boolean queueIdle();
}
```

```java
private final ArrayList<IdleHandler> mIdleHandlers = new ArrayList<IdleHandler>();
```

```java
public void addIdleHandler(@NonNull IdleHandler handler) {
    if (handler == null) {
        throw new NullPointerException("Can't add a null IdleHandler");
    }
    synchronized (this) {
        mIdleHandlers.add(handler);
    }
}
public void removeIdleHandler(@NonNull IdleHandler handler) {
    synchronized (this) {
        mIdleHandlers.remove(handler);
    }
}
```

### next\(\)

```java
Message next() {
    // Return here if the message loop has already quit and been disposed.
    // This can happen if the application tries to restart a looper after quit
    // which is not supported.
    final long ptr = mPtr;
    if (ptr == 0) { //当消息循环已经退出，则直接返回
        return null;
    }

    int pendingIdleHandlerCount = -1; // -1 only during first iteration
    int nextPollTimeoutMillis = 0;
    for (;;) {
        if (nextPollTimeoutMillis != 0) {
            Binder.flushPendingCommands();
        }
        //阻塞操作，当等待nextPollTimeoutMillis时长，或者消息队列被唤醒，都会返回
        nativePollOnce(ptr, nextPollTimeoutMillis);

        synchronized (this) {
            // Try to retrieve the next message.  Return if found.
            final long now = SystemClock.uptimeMillis();
            Message prevMsg = null;
            Message msg = mMessages;
            //当消息的Handler为空时，则查询异步消息
            if (msg != null && msg.target == null) {
                // Stalled by a barrier.  Find the next asynchronous message in the queue.
                //当查询到异步消息，则立刻退出循环
                do {
                    prevMsg = msg;
                    msg = msg.next;
                } while (msg != null && !msg.isAsynchronous());
            }
            if (msg != null) {
                if (now < msg.when) {
                    // Next message is not ready.  Set a timeout to wake up when it is ready.
                    //当异步消息触发时间大于当前时间，则设置下一次轮询的超时时长
                    nextPollTimeoutMillis = (int) Math.min(msg.when - now, Integer.MAX_VALUE);
                } else {
                    // Got a message.
                    // 获取一条消息，并返回
                    mBlocked = false;
                    if (prevMsg != null) {
                        prevMsg.next = msg.next;
                    } else {
                        mMessages = msg.next;
                    }
                    msg.next = null;
                    if (DEBUG) Log.v(TAG, "Returning message: " + msg);
                    //设置消息的使用状态，即flags |= FLAG_IN_USE
                    msg.markInUse();
                    return msg;
                }
            } else {
                // No more messages.
                nextPollTimeoutMillis = -1; //没有消息
            }

            // Process the quit message now that all pending messages have been handled.
             //消息正在退出，返回null
            if (mQuitting) {
                dispose();
                return null;
            }
            //当消息队列为空，或者是消息队列的第一个消息时
            // If first time idle, then get the number of idlers to run.
            // Idle handles only run if the queue is empty or if the first message
            // in the queue (possibly a barrier) is due to be handled in the future.
            if (pendingIdleHandlerCount < 0
                    && (mMessages == null || now < mMessages.when)) {
                pendingIdleHandlerCount = mIdleHandlers.size();
            }
            if (pendingIdleHandlerCount <= 0) {
                // No idle handlers to run.  Loop and wait some more.
                 //没有idle handlers 需要运行，则循环并等待。
                mBlocked = true;
                continue;
            }
             
            if (mPendingIdleHandlers == null) {
                mPendingIdleHandlers = new IdleHandler[Math.max(pendingIdleHandlerCount, 4)];
            }
            mPendingIdleHandlers = mIdleHandlers.toArray(mPendingIdleHandlers);
        }
         // Run the idle handlers.
        // We only ever reach this code block during the first iteration.
        //只有第一次循环时，会运行idle handlers，执行完成后，重置pendingIdleHandlerCount为0.
        for (int i = 0; i < pendingIdleHandlerCount; i++) {
            final IdleHandler idler = mPendingIdleHandlers[i];
            mPendingIdleHandlers[i] = null; // release the reference to the handler

            boolean keep = false;
            try {
                keep = idler.queueIdle();
            } catch (Throwable t) {
                Log.wtf(TAG, "IdleHandler threw exception", t);
            }

            if (!keep) {
                synchronized (this) {
                    mIdleHandlers.remove(idler);
                }
            }
        }

        // Reset the idle handler count to 0 so we do not run them again.
         //重置idle handler个数为0，以保证不会再次重复运行
        pendingIdleHandlerCount = 0;

        // While calling an idle handler, a new message could have been delivered
        // so go back and look again for a pending message without waiting.
        //当调用一个空闲handler时，一个新message能够被分发，因此无需等待可以直接查询pending message.
        nextPollTimeoutMillis = 0;

    }
}
```

### enqueueMessage

```java
boolean enqueueMessage(Message msg, long when) {
        //每一个Message都必须有一个target，否则抛出异常
        if (msg.target == null) {
            throw new IllegalArgumentException("Message must have a target.");
        }
        if (msg.isInUse()) {
            throw new IllegalStateException(msg + " This message is already in use.");
        }

        synchronized (this) {
            //正在退出时，回收msg，加入到消息池
            if (mQuitting) { 
                IllegalStateException e = new IllegalStateException(
                        msg.target + " sending message to a Handler on a dead thread");
                Log.w(TAG, e.getMessage(), e);
                msg.recycle();
                return false;
            }

            msg.markInUse();
            msg.next = when;
            Message p = mMessages;
            boolean needWake;
            if (p == null || when == 0 || when < p.when) {
                // New head, wake up the event queue if blocked.
                msg.next = p;
                mMessages = msg;
                needWake = mBlocked;
            } else {
                // Inserted within the middle of the queue.  Usually we don't have to wake
                // up the event queue unless there is a barrier at the head of the queue
                // and the message is the earliest asynchronous message in the queue.
                //将消息按时间顺序插入到MessageQueue
                needWake = mBlocked && p.target == null && msg.isAsynchronous();
                Message prev;
                //遍历Message 当p为空或者p.when大于when时跳出循环
                for (;;) {
                    prev = p;
                    p = p.next;
                    if (p == null || when < p.when) {
                        break;
                    }
                    if (needWake && p.isAsynchronous()) {
                        needWake = false;
                    }
                }
                //将msg添加到跳出循环的位置
                msg.next = p; // invariant: p == prev.next
                prev.next = msg;
            }

            // We can assume mPtr != 0 because mQuitting is false.
            //唤醒操作
            if (needWake) {
                nativeWake(mPtr);
            }
        }
        return true;
    }
```

`MessageQueue`是按照Message触发时间的先后顺序排列的，队头的消息是将要最早触发的消息。当有消息需要加入消息队列时，会从队列头开始遍历，直到找到消息应该插入的合适位置，以保证所有消息的时间顺序。

### removeMessages

```java
void removeMessages(Handler h, int what, Object object) {
    if (h == null) {
        return;
    }
    synchronized (this) {
        Message p = mMessages;
        //从消息队列的头部开始，移除所有符合条件的消息
        while (p != null && p.target == h && p.what == what
               && (object == null || p.obj == object)) {
            Message n = p.next;
            mMessages = n;
            p.recycleUnchecked();
            p = n;
        }
        //移除剩余的符合要求的消息
        while (p != null) {
            Message n = p.next;
            if (n != null) {
                if (n.target == h && n.what == what
                    && (object == null || n.obj == object)) {
                    Message nn = n.next;
                    n.recycleUnchecked();
                    p.next = nn;
                    continue;
                }
            }
            p = n;
        }
    }
}
```

这个移除消息的方法，采用了两个while循环，第一个循环是从队头开始，移除符合条件的消息，第二个循环是从头部移除完连续的满足条件的消息之后，再从队列后面继续查询是否有满足条件的消息需要被移除。

#### postSyncBarrier <a id="45-postsyncbarrier"></a>

```java
public int postSyncBarrier() {
    return postSyncBarrier(SystemClock.uptimeMillis());
}

private int postSyncBarrier(long when) {
    synchronized (this) {
        final int token = mNextBarrierToken++;
        final Message msg = Message.obtain();
        msg.markInUse();
        msg.when = when;
        msg.arg1 = token;

        Message prev = null;
        Message p = mMessages;
        if (when != 0) {
            while (p != null && p.when <= when) {
                prev = p;
                p = p.next;
            }
        }
        if (prev != null) {
            msg.next = p;
            prev.next = msg;
        } else {
            msg.next = p;
            mMessages = msg;
        }
        return token;
    }
}
```

每一个普通Message必须有一个target，对于特殊的message是没有target，即同步barrier token。 这个消息的价值就是用于拦截同步消息，所以并不会唤醒Looper.

```java
public void removeSyncBarrier(int token) {
     synchronized (this) {
         Message prev = null;
         Message p = mMessages;
         //从消息队列找到 target为空,并且token相等的Message
         while (p != null && (p.target != null || p.arg1 != token)) {
             prev = p;
             p = p.next;
         }
         final boolean needWake;
         if (prev != null) {
             prev.next = p.next;
             needWake = false;
         } else {
             mMessages = p.next;
             needWake = mMessages == null || mMessages.target != null;
         }
         p.recycleUnchecked();

         if (needWake && !mQuitting) {
             nativeWake(mPtr);
         }
     }
 }
```

postSyncBarrier只对同步消息产生影响，对于异步消息没有任何差别。

## Activity\#runOnUiThread

```java
private Thread mUiThread; //在attach方法中将当前Thread赋值给mUiThread
final Handler mHandler = new Handler();
public final void runOnUiThread(Runnable action) {
    //判断当前是否是UI线程 不是则调用Handler的post方法
    if (Thread.currentThread() != mUiThread) {
        mHandler.post(action);
    } else {
        action.run();
    }
}
```

## View\#post

```java
 public boolean post(Runnable action) {
     final AttachInfo attachInfo = mAttachInfo;
     //当attachInfo不为空调用attachInfo的mHandler
     if (attachInfo != null) {
         return attachInfo.mHandler.post(action);
     }
     // Postpone the runnable until we know on which thread it needs to run.
     // Assume that the runnable will be successfully placed after attach.
     //为空
     getRunQueue().post(action);
     return true;
 }
```

```java
//mAttachInfo赋值

void dispatchAttachedToWindow(AttachInfo info, int visibility) {
    mAttachInfo = info;
    // Transfer all pending runnables.
    if (mRunQueue != null) {
        mRunQueue.executeActions(info.mHandler);
        mRunQueue = null;
    }
}
void dispatchDetachedFromWindow() {
    AttachInfo info = null;
}
```

```java
private HandlerActionQueue getRunQueue() {
    if (mRunQueue == null) {
        mRunQueue = new HandlerActionQueue();
    }
    return mRunQueue;
}
```

```java
public class HandlerActionQueue {
    private HandlerAction[] mActions;
    private int mCount;

    public void post(Runnable action) {
        postDelayed(action, 0);
    }

    public void postDelayed(Runnable action, long delayMillis) {
        final HandlerAction handlerAction = new HandlerAction(action, delayMillis);

        synchronized (this) {
            if (mActions == null) {
                mActions = new HandlerAction[4];
            }
            //将HandlerAction添加到数组中
            mActions = GrowingArrayUtils.append(mActions, mCount, handlerAction);
            mCount++;
        }
    }

    public void removeCallbacks(Runnable action) {
        synchronized (this) {
            final int count = mCount;
            int j = 0;

            final HandlerAction[] actions = mActions;
            for (int i = 0; i < count; i++) {
                if (actions[i].matches(action)) {
                    // Remove this action by overwriting it within
                    // this loop or nulling it out later.
                    continue;
                }

                if (j != i) {
                    // At least one previous entry was removed, so
                    // this one needs to move to the "new" list.
                    actions[j] = actions[i];
                }

                j++;
            }

            // The "new" list only has j entries.
            mCount = j;

            // Null out any remaining entries.
            for (; j < count; j++) {
                actions[j] = null;
            }
        }
    }

    public void executeActions(Handler handler) {
        synchronized (this) {
            final HandlerAction[] actions = mActions;
            for (int i = 0, count = mCount; i < count; i++) {
                final HandlerAction handlerAction = actions[i];
                handler.postDelayed(handlerAction.action, handlerAction.delay);
            }

            mActions = null;
            mCount = 0;
        }
    }

    public int size() {
        return mCount;
    }

    public Runnable getRunnable(int index) {
        if (index >= mCount) {
            throw new IndexOutOfBoundsException();
        }
        return mActions[index].action;
    }

    public long getDelay(int index) {
        if (index >= mCount) {
            throw new IndexOutOfBoundsException();
        }
        return mActions[index].delay;
    }

    private static class HandlerAction {
        final Runnable action;
        final long delay;

        public HandlerAction(Runnable action, long delay) {
            this.action = action;
            this.delay = delay;
        }

        public boolean matches(Runnable otherAction) {
            return otherAction == null && action == null
                    || action != null && action.equals(otherAction);
        }
    }
}
```

## 扩展阅读

* [Android 消息处理机制（Looper、Handler、MessageQueue,Message）](https://www.jianshu.com/p/02962454adf7)
* [Android--多线程之Handler](http://www.cnblogs.com/plokmju/p/android_Handler.html)
* [Handler 中 sendMessage\(\) 源代码剖析](http://blog.csdn.net/ahuier/article/details/17013647)
* [How to Leak a Context: Handlers & Inner Classes](http://www.androiddesignpatterns.com/2013/01/inner-class-handler-memory-leak.html)
* [Android中为什么主线程不会因为Looper.loop\(\)里的死循环卡死？](https://www.zhihu.com/question/34652589)
* [Android 高级面试-1：Handler 相关](https://juejin.im/post/6844903778844409863)
* [Handler 10问，你顶的住吗？](https://mp.weixin.qq.com/s/V1xI2M8AibgB2whHSOTQGQ)
* [Handler的初级、中级、高级问法，你都掌握了吗？](https://juejin.cn/post/6893791473121280013)





