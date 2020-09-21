# Choreographer原理

## Choreographer启动流程

在Activity启动过程，执行完onResume后，会调用Activity.makeVisible\(\)，然后再调用到addView\(\)， 层层调用会进入如下方法：

```java
public ViewRootImpl(Context context, Display display) {
    ...
    //获取Choreographer实例
    mChoreographer = Choreographer.getInstance();
    ...
}
```

### getInstance\(\)

```java
    public static Choreographer getInstance() {
        return sThreadInstance.get();
    }
        // Thread local storage for the choreographer.
    private static final ThreadLocal<Choreographer> sThreadInstance =
            new ThreadLocal<Choreographer>() {
        @Override
        protected Choreographer initialValue() {
            //获取当前线程Looper
            Looper looper = Looper.myLooper();
            if (looper == null) {
                throw new IllegalStateException("The current thread must have a looper!");
            }
            Choreographer choreographer = new Choreographer(looper, VSYNC_SOURCE_APP);
            if (looper == Looper.getMainLooper()) {
                mMainInstance = choreographer;
            }
            return choreographer;
        }
    };
```

### 创建Choreographer

```java
    private Choreographer(Looper looper, int vsyncSource) {
        mLooper = looper;
        //创建Handler
        mHandler = new FrameHandler(looper);
        //创建用于接收Vsync的对象
        mDisplayEventReceiver = USE_VSYNC
                ? new FrameDisplayEventReceiver(looper, vsyncSource)
                : null;
        //上一次帧绘制时间点        
        mLastFrameTimeNanos = Long.MIN_VALUE;
        //帧间时长
        mFrameIntervalNanos = (long)(1000000000 / getRefreshRate());
        //创建回调对象
        mCallbackQueues = new CallbackQueue[CALLBACK_LAST + 1];
        for (int i = 0; i <= CALLBACK_LAST; i++) {
            mCallbackQueues[i] = new CallbackQueue();
        }
        // b/68769804: For low FPS experiments.
        setFPSDivisor(SystemProperties.getInt(ThreadedRenderer.DEBUG_FPS_DIVISOR, 1));
    }
```

### 创建FrameHandler

```java
   private final class FrameHandler extends Handler {
        public FrameHandler(Looper looper) {
            super(looper);
        }

        @Override
        public void handleMessage(Message msg) {
            switch (msg.what) {
                case MSG_DO_FRAME:
                    doFrame(System.nanoTime(), 0);
                    break;
                case MSG_DO_SCHEDULE_VSYNC:
                    doScheduleVsync();
                    break;
                case MSG_DO_SCHEDULE_CALLBACK:
                    doScheduleCallback(msg.arg1);
                    break;
            }
        }
    }
```

### 创建FrameDisplayEventReceiver

```java
    private final class FrameDisplayEventReceiver extends DisplayEventReceiver
            implements Runnable {
        private boolean mHavePendingVsync;
        private long mTimestampNanos;
        private int mFrame;

        public FrameDisplayEventReceiver(Looper looper, int vsyncSource) {
            super(looper, vsyncSource, CONFIG_CHANGED_EVENT_SUPPRESS);
        }
    }
```

#### DisplayEventReceiver

```java
    @UnsupportedAppUsage
    public DisplayEventReceiver(Looper looper) {
        this(looper, VSYNC_SOURCE_APP, CONFIG_CHANGED_EVENT_SUPPRESS);
    }
    public DisplayEventReceiver(Looper looper, int vsyncSource, int configChanged) {
        if (looper == null) {
            throw new IllegalArgumentException("looper must not be null");
        }
        //获取主线程消息队列
        mMessageQueue = looper.getQueue();
        //调用Native方法
        mReceiverPtr = nativeInit(new WeakReference<DisplayEventReceiver>(this), mMessageQueue,
                vsyncSource, configChanged);

        mCloseGuard.open("dispose");
    }
```

#### **nativeInit**

```cpp
//android_view_DisplayEventReceiver.cpp
static jlong nativeInit(JNIEnv* env, jclass clazz, jobject receiverWeak,
        jobject messageQueueObj, jint vsyncSource, jint configChanged) {
        //获取MessageQueue
    sp<MessageQueue> messageQueue = android_os_MessageQueue_getMessageQueue(env, messageQueueObj);
    if (messageQueue == NULL) {
        jniThrowRuntimeException(env, "MessageQueue is not initialized.");
        return 0;
    }
    //创建NativeDisplayEventReceiver对象
    sp<NativeDisplayEventReceiver> receiver = new NativeDisplayEventReceiver(env,
            receiverWeak, messageQueue, vsyncSource, configChanged);
    status_t status = receiver->initialize();
    if (status) {
        String8 message;
        message.appendFormat("Failed to initialize display event receiver.  status=%d", status);
        jniThrowRuntimeException(env, message.string());
        return 0;
    }
     //获取DisplayEventReceiver对象的引用
    receiver->incStrong(gDisplayEventReceiverClassInfo.clazz); // retain a reference for the object
    return reinterpret_cast<jlong>(receiver.get());
}
```

**创建NativeDisplayEventReceiver**

NativeDisplayEventReceiver继承于LooperCallback对象，此处mReceiverWeakGlobal记录的是Java层 DisplayEventReceiver对象的全局引用。

```cpp
//可以看做是构造函数调用父类的构造函数
NativeDisplayEventReceiver::NativeDisplayEventReceiver(JNIEnv* env,
        jobject receiverWeak, const sp<MessageQueue>& messageQueue, jint vsyncSource,
        jint configChanged) :
        DisplayEventDispatcher(messageQueue->getLooper(),//获取Looper
                static_cast<ISurfaceComposer::VsyncSource>(vsyncSource),
                static_cast<ISurfaceComposer::ConfigChanged>(configChanged)),
        mReceiverWeakGlobal(env->NewGlobalRef(receiverWeak)),
        mMessageQueue(messageQueue) {
    ALOGV("receiver %p ~ Initializing display event receiver.", this);
}
```

#### **initialize**

`DisplayEventDispatcher`继承`LooperCallback`  


```cpp
//androidfw/DisplayEventDispatcher.h
class DisplayEventDispatcher : public LooperCallback
```

```java
//androidfw/DisplayEventDispatcher.cpp
status_t DisplayEventDispatcher::initialize() {
  //mReceiver为DisplayEventReceiver类型
    status_t result = mReceiver.initCheck();
    if (result) {
        ALOGW("Failed to initialize display event receiver, status=%d", result);
        return result;
    }
    //监听mReceiver的所获取的文件句柄
    int rc = mLooper->addFd(mReceiver.getFd(), 0, Looper::EVENT_INPUT,
            this, NULL);
    if (rc < 0) {
        return UNKNOWN_ERROR;
    }
    return OK;
}
```

 监听mReceiver的所获取的文件句柄，一旦有数据到来，则回调this\(此处NativeDisplayEventReceiver\)中所复写LooperCallback对象的 handleEvent。

```cpp
//Looper.cpp
int Looper::addFd(int fd, int ident, int events, Looper_callbackFunc callback, void* data) {
    return addFd(fd, ident, events, callback ? new SimpleLooperCallback(callback) : nullptr, data);
}
```

## Vysnc回调流程

### handleEvent

```cpp
//androidfw/DisplayEventDispatcher.cpp
int DisplayEventDispatcher::handleEvent(int, int events, void*) {
    if (events & (Looper::EVENT_ERROR | Looper::EVENT_HANGUP)) {
        ALOGE("Display event receiver pipe was closed or an error occurred.  "
                "events=0x%x", events);
        return 0; // remove the callback
    }

    if (!(events & Looper::EVENT_INPUT)) {
        ALOGW("Received spurious callback for unhandled poll event.  "
                "events=0x%x", events);
        return 1; // keep the callback
    }

    // Drain all pending events, keep the last vsync.
    nsecs_t vsyncTimestamp;
    PhysicalDisplayId vsyncDisplayId;
    uint32_t vsyncCount;
    //清除所有的pending事件，只保留最后一次vsync
    if (processPendingEvents(&vsyncTimestamp, &vsyncDisplayId, &vsyncCount)) {
        ALOGV("dispatcher %p ~ Vsync pulse: timestamp=%" PRId64 ", displayId=%"
                ANDROID_PHYSICAL_DISPLAY_ID_FORMAT ", count=%d",
                this, ns2ms(vsyncTimestamp), vsyncDisplayId, vsyncCount);
        mWaitingForVsync = false;
        //分发Vsync
        dispatchVsync(vsyncTimestamp, vsyncDisplayId, vsyncCount);
    }

    return 1; // keep the callback
}
```

#### **processPendingEvents**

```java
bool NativeDisplayEventReceiver::processPendingEvents(
        nsecs_t* outTimestamp, int32_t* outId, uint32_t* outCount) {
    bool gotVsync = false;
    DisplayEventReceiver::Event buf[EVENT_BUFFER_SIZE];
    ssize_t n;
    while ((n = mReceiver.getEvents(buf, EVENT_BUFFER_SIZE)) > 0) {
        for (ssize_t i = 0; i < n; i++) {
            const DisplayEventReceiver::Event& ev = buf[i];
            switch (ev.header.type) {
            case DisplayEventReceiver::DISPLAY_EVENT_VSYNC:
                gotVsync = true; //获取VSync信号
                *outTimestamp = ev.header.timestamp;
                *outId = ev.header.id;
                *outCount = ev.vsync.count;
                break;
            case DisplayEventReceiver::DISPLAY_EVENT_HOTPLUG:
                dispatchHotplug(ev.header.timestamp, ev.header.id, ev.hotplug.connected);
                break;
            default:
                break;
            }
        }
    }
    return gotVsync;
}
```

遍历所有的事件，当有多个VSync事件到来，则只关注最近一次的事件。

### **dispatchVsync**

```java
void NativeDisplayEventReceiver::dispatchVsync(nsecs_t timestamp, PhysicalDisplayId displayId,
                                               uint32_t count) {
    JNIEnv* env = AndroidRuntime::getJNIEnv();

    ScopedLocalRef<jobject> receiverObj(env, jniGetReferent(env, mReceiverWeakGlobal));
    if (receiverObj.get()) {
        ALOGV("receiver %p ~ Invoking vsync handler.", this);
        env->CallVoidMethod(receiverObj.get(),
                gDisplayEventReceiverClassInfo.dispatchVsync, timestamp, displayId, count);
        ALOGV("receiver %p ~ Returned from vsync handler.", this);
    }

    mMessageQueue->raiseAndClearException(env, "dispatchVsync");
}
```

此处调用到Java层的DisplayEventReceiver对象的dispatchVsync\(\)方法，接下来进入Java层。

```java
   //DisplayEventReceiver.java
private void dispatchVsync(long timestampNanos, long physicalDisplayId, int frame) {
   onVsync(timestampNanos, physicalDisplayId, frame);
}
```

Choreographer对象实例化的过程，创建的对象是DisplayEventReceiver子类 FrameDisplayEventReceiver对象，接下来进入该对象。

### onVsync

```java
//FrameDisplayEventReceiver.java
@Override
public void onVsync(long timestampNanos, long physicalDisplayId, int frame) {
    // Post the vsync event to the Handler.
    // The idea is to prevent incoming vsync events from completely starving
    // the message queue.  If there are no messages in the queue with timestamps
    // earlier than the frame time, then the vsync event will be processed immediately.
    // Otherwise, messages that predate the vsync event will be handled first.
    long now = System.nanoTime();
    if (timestampNanos > now) {
        Log.w(TAG, "Frame time is " + ((timestampNanos - now) * 0.000001f)
                + " ms in the future!  Check that graphics HAL is generating vsync "
                + "timestamps using the correct timebase.");
        timestampNanos = now;
    }

    if (mHavePendingVsync) {
        Log.w(TAG, "Already have a pending vsync event.  There should only be "
                + "one at a time.");
    } else {
        mHavePendingVsync = true;
    }

    mTimestampNanos = timestampNanos;
    mFrame = frame;
    Message msg = Message.obtain(mHandler, this);
    msg.setAsynchronous(true);
    mHandler.sendMessageAtTime(msg, timestampNanos / TimeUtils.NANOS_PER_MS);
}
```

可见onVsync\(\)过程是通过FrameHandler向主线程Looper发送了一个自带callback的消息，此处callback为FrameDisplayEventReceiver。 当主线程Looper执行到该消息时，则调用FrameDisplayEventReceiver.run\(\)方法.

#### run\(\)

```java
@Override
public void run() {
    mHavePendingVsync = false;
    doFrame(mTimestampNanos, mFrame);
}
```

### doFrame\(\)

```java
@UnsupportedAppUsage
void doFrame(long frameTimeNanos, int frame) {
    final long startNanos;
    synchronized (mLock) {
        //false直接返回
        if (!mFrameScheduled) {
            return; // no work to do
        }

        if (DEBUG_JANK && mDebugPrintNextFrameTimeDelta) {
            mDebugPrintNextFrameTimeDelta = false;
            Log.d(TAG, "Frame time delta: "
                    + ((frameTimeNanos - mLastFrameTimeNanos) * 0.000001f) + " ms");
        }

        long intendedFrameTimeNanos = frameTimeNanos;
        startNanos = System.nanoTime();
        final long jitterNanos = startNanos - frameTimeNanos;
        if (jitterNanos >= mFrameIntervalNanos) {
            final long skippedFrames = jitterNanos / mFrameIntervalNanos;
            //当掉帧个数超过30，则输出响应log
            if (skippedFrames >= SKIPPED_FRAME_WARNING_LIMIT) {
                Log.i(TAG, "Skipped " + skippedFrames + " frames!  "
                        + "The application may be doing too much work on its main thread.");
            }
            final long lastFrameOffset = jitterNanos % mFrameIntervalNanos;
            if (DEBUG_JANK) {
                Log.d(TAG, "Missed vsync by " + (jitterNanos * 0.000001f) + " ms "
                        + "which is more than the frame interval of "
                        + (mFrameIntervalNanos * 0.000001f) + " ms!  "
                        + "Skipping " + skippedFrames + " frames and setting frame "
                        + "time to " + (lastFrameOffset * 0.000001f) + " ms in the past.");
            }
            frameTimeNanos = startNanos - lastFrameOffset;
        }

        if (frameTimeNanos < mLastFrameTimeNanos) {
            if (DEBUG_JANK) {
                Log.d(TAG, "Frame time appears to be going backwards.  May be due to a "
                        + "previously skipped frame.  Waiting for next vsync.");
            }
            scheduleVsyncLocked();
            return;
        }

        if (mFPSDivisor > 1) {
            long timeSinceVsync = frameTimeNanos - mLastFrameTimeNanos;
            if (timeSinceVsync < (mFrameIntervalNanos * mFPSDivisor) && timeSinceVsync > 0) {
                scheduleVsyncLocked();
                return;
            }
        }

        mFrameInfo.setVsync(intendedFrameTimeNanos, frameTimeNanos);
        mFrameScheduled = false;
        mLastFrameTimeNanos = frameTimeNanos;
    }

    try {
        Trace.traceBegin(Trace.TRACE_TAG_VIEW, "Choreographer#doFrame");
        AnimationUtils.lockAnimationClock(frameTimeNanos / TimeUtils.NANOS_PER_MS);

        mFrameInfo.markInputHandlingStart();
        doCallbacks(Choreographer.CALLBACK_INPUT, frameTimeNanos);
        //标记动画开始时间
        mFrameInfo.markAnimationsStart();
        //执行回调方法
        doCallbacks(Choreographer.CALLBACK_ANIMATION, frameTimeNanos);
        doCallbacks(Choreographer.CALLBACK_INSETS_ANIMATION, frameTimeNanos);
        mFrameInfo.markPerformTraversalsStart();
        doCallbacks(Choreographer.CALLBACK_TRAVERSAL, frameTimeNanos);

        doCallbacks(Choreographer.CALLBACK_COMMIT, frameTimeNanos);
    } finally {
        AnimationUtils.unlockAnimationClock();
        Trace.traceEnd(Trace.TRACE_TAG_VIEW);
    }

    if (DEBUG_FRAMES) {
        final long endNanos = System.nanoTime();
        Log.d(TAG, "Frame " + frame + ": Finished, took "
                + (endNanos - startNanos) * 0.000001f + " ms, latency "
                + (startNanos - frameTimeNanos) * 0.000001f + " ms.");
    }
}
```

此处frameTimeNanos是底层VSYNC信号到达的时间戳。

1. 每调用一次scheduleFrameLocked\(\)，则mFrameScheduled=true，能执行一次doFrame\(\)操作，执行完doFrame\(\)并设置mFrameScheduled=false；
2. 最终有4个回调类别，如下所示：
   * INPUT：输入事件
   * ANIMATION：动画
   * TRAVERSAL：窗口刷新，执行measure/layout/draw操作
   * COMMIT：遍历完成的提交操作，用来修正动画启动时间

### doCallbacks

```java
void doCallbacks(int callbackType, long frameTimeNanos) {
    CallbackRecord callbacks;
    synchronized (mLock) {
        // We use "now" to determine when callbacks become due because it's possible
        // for earlier processing phases in a frame to post callbacks that should run
        // in a following phase, such as an input event that causes an animation to start.
        final long now = System.nanoTime();
        //从队列查找相应类型的CallbackRecord对象
        callbacks = mCallbackQueues[callbackType].extractDueCallbacksLocked(
                now / TimeUtils.NANOS_PER_MS);
        if (callbacks == null) {
            return;
        }
        mCallbacksRunning = true;

        // Update the frame time if necessary when committing the frame.
        // We only update the frame time if we are more than 2 frames late reaching
        // the commit phase.  This ensures that the frame time which is observed by the
        // callbacks will always increase from one frame to the next and never repeat.
        // We never want the next frame's starting frame time to end up being less than
        // or equal to the previous frame's commit frame time.  Keep in mind that the
        // next frame has most likely already been scheduled by now so we play it
        // safe by ensuring the commit time is always at least one frame behind.
        if (callbackType == Choreographer.CALLBACK_COMMIT) {
            final long jitterNanos = now - frameTimeNanos;
            Trace.traceCounter(Trace.TRACE_TAG_VIEW, "jitterNanos", (int) jitterNanos);
            //当commit类型回调执行的时间点超过2帧，则更新mLastFrameTimeNanos。
            if (jitterNanos >= 2 * mFrameIntervalNanos) {
                final long lastFrameOffset = jitterNanos % mFrameIntervalNanos
                        + mFrameIntervalNanos;
                if (DEBUG_JANK) {
                    Log.d(TAG, "Commit callback delayed by " + (jitterNanos * 0.000001f)
                            + " ms which is more than twice the frame interval of "
                            + (mFrameIntervalNanos * 0.000001f) + " ms!  "
                            + "Setting frame time to " + (lastFrameOffset * 0.000001f)
                            + " ms in the past.");
                    mDebugPrintNextFrameTimeDelta = true;
                }
                frameTimeNanos = now - lastFrameOffset;
                mLastFrameTimeNanos = frameTimeNanos;
            }
        }
    }
    try {
        Trace.traceBegin(Trace.TRACE_TAG_VIEW, CALLBACK_TRACE_TITLES[callbackType]);
        for (CallbackRecord c = callbacks; c != null; c = c.next) {
            if (DEBUG_FRAMES) {
                Log.d(TAG, "RunCallback: type=" + callbackType
                        + ", action=" + c.action + ", token=" + c.token
                        + ", latencyMillis=" + (SystemClock.uptimeMillis() - c.dueTime));
            }
            c.run(frameTimeNanos);
        }
    } finally {
        synchronized (mLock) {
            
            mCallbacksRunning = false;
            //回收callbacks，加入对象池mCallbackPool
            do {
                final CallbackRecord next = callbacks.next;
                recycleCallbackLocked(callbacks);
                callbacks = next;
            } while (callbacks != null);
        }
        Trace.traceEnd(Trace.TRACE_TAG_VIEW);
    }
}
```



该方法主要功能：

* 从队列头mHead查找CallbackRecord对象，当队列头部的callbacks对象为空或者执行时间还没到达，则直接返回；
* 开始执行相应回调的run\(\)方法；
* 回收callbacks，加入对象池mCallbackPool，就是说callback一旦执行完成，则会被回收。

### CallbackRecord

```java
private static final class CallbackRecord {
    public CallbackRecord next;
    public long dueTime;
    public Object action; // Runnable or FrameCallback
    public Object token;

    @UnsupportedAppUsage
    public void run(long frameTimeNanos) {
        if (token == FRAME_CALLBACK_TOKEN) {
            ((FrameCallback)action).doFrame(frameTimeNanos);
        } else {
            ((Runnable)action).run();
        }
    }
}
```

这里的回调方法run\(\)有两种执行情况：

* 当token的数据类型为FRAME\_CALLBACK\_TOKEN，则执行该对象的doFrame\(\)方法;
* 当token为其他类型，则执行该对象的run\(\)方法。

那么需要的场景便是由WMS调用scheduleAnimationLocked\(\)方法来设置mFrameScheduled=true来触发动画， 接下来说说动画控制的过程。  


## 动画显示过程

