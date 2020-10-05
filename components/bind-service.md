# 绑定服务

绑定服务是客户端-服务器接口中的服务器。借助绑定服务，组件（例如 Activity）可以绑定到服务、发送请求、接收响应，以及执行进程间通信 \(IPC\)。绑定服务通常只在为其他应用组件提供服务时处于活动状态，不会无限期在后台运行。

本文介绍如何创建绑定服务，包括如何绑定到来自其他应用组件的服务。如需了解一般服务的更多信息（例如：如何利用服务传送通知、如何将服务设置为在前台运行等），请参阅[服务](https://developer.android.com/guide/components/services)文档。

## 基础知识

如[服务](https://developer.android.com/guide/components/services)文档中所述，您可以创建同时具有已启动和已绑定两种状态的服务。换言之，可通过调用 [`startService()`](https://developer.android.com/reference/android/content/Context#startService%28android.content.Intent%29) 启动服务，让服务无限期运行；此外，还可通过调用 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 让客户端绑定到该服务。

如果您确实允许服务同时具有已启动和已绑定状态，则在启动服务后，如果所有客户端均解绑服务，则系统_不会_销毁该服务。为此，您必须通过调用 [`stopSelf()`](https://developer.android.com/reference/android/app/Service#stopSelf%28%29) 或 [`stopService()`](https://developer.android.com/reference/android/content/Context#stopService%28android.content.Intent%29) 显式停止服务。

尽管您通常应实现 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29) _或_ [`onStartCommand()`](https://developer.android.com/reference/android/app/Service#onStartCommand%28android.content.Intent,%20int,%20int%29)，但有时需同时实现这两种方法。例如，音乐播放器可能认为，让其服务无限期运行并同时提供绑定会很有用处。如此一来，Activity 便可通过启动服务来播放音乐，并且即使用户离开应用，音乐也不会停止。然后，当用户返回应用时，Activity 便能绑定到服务，重新获得回放控制权。

如需详细了解为已启动服务添加绑定时的服务生命周期，请参阅[管理绑定服务的生命周期](https://developer.android.com/guide/components/bound-services#Lifecycle)部分。

客户端通过调用 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 绑定到服务。调用时，它必须提供 [`ServiceConnection`](https://developer.android.com/reference/android/content/ServiceConnection) 的实现，后者会监控与服务的连接。[`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 的返回值表明所请求的服务是否存在，以及是否允许客户端访问该服务。当创建客户端与服务之间的连接时，Android 系统会调用 [`ServiceConnection`](https://developer.android.com/reference/android/content/ServiceConnection) 上的 [`onServiceConnected()`](https://developer.android.com/reference/android/content/ServiceConnection#onServiceConnected%28android.content.ComponentName,%20android.os.IBinder%29)。`onServiceConnected()` 方法包含 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 参数，客户端随后会使用该参数与绑定服务进行通信。

您可以同时将多个客户端连接到服务。但是，系统会缓存 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 服务通信通道。换言之，只有在第一个客户端绑定服务时，系统才会调用服务的 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29) 方法来生成 [`IBinder`](https://developer.android.com/reference/android/os/IBinder)。然后，系统会将同一 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 传递至绑定到相同服务的所有其他客户端，无需再次调用 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29)。

当最后一个客户端取消与服务的绑定时，系统会销毁服务（除非 [`startService()`](https://developer.android.com/reference/android/content/Context#startService%28android.content.Intent%29) 也启动了该服务）。

针对您的绑定服务实现，其最重要的环节是定义 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29) 回调方法所返回的接口。下文将为您介绍几种不同方法，以便您定义服务的 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 接口。

## 创建绑定服务

绑定服务允许应用组件通过调用 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 与其绑定，从而创建长期连接。此服务通常不允许组件通过调用 [`startService()`](https://developer.android.com/reference/android/content/Context#startService%28android.content.Intent%29) 来_启动_它。

如需与 Activity 和其他应用组件中的服务进行交互，或需要通过进程间通信 \(IPC\) 向其他应用公开某些应用功能，则应创建绑定服务。

如要创建绑定服务，您需通过实现 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29) 回调方法返回 [`IBinder`](https://developer.android.com/reference/android/os/IBinder)，从而定义与服务进行通信的接口。然后，其他应用组件可通过调用 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 来检索该接口，并开始调用与服务相关的方法。服务只用于与其绑定的应用组件，因此若没有组件与该服务绑定，则系统会销毁该服务。您_不必_像通过 [`onStartCommand()`](https://developer.android.com/reference/android/app/Service#onStartCommand%28android.content.Intent,%20int,%20int%29) 启动的服务那样，以相同方式停止绑定服务。

如要创建绑定服务，您必须定义指定客户端如何与服务进行通信的接口。服务与客户端之间的这个接口必须是 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 的实现，并且服务必须从 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29) 回调方法返回该接口。收到 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 后，客户端便可开始通过该接口与服务进行交互。

多个客户端可以同时绑定到服务。完成与服务的交互后，客户端会通过调用 [`unbindService()`](https://developer.android.com/reference/android/content/Context#unbindService%28android.content.ServiceConnection%29) 来取消绑定。如果没有绑定到服务的客户端，则系统会销毁该服务。

实现绑定服务有多种方法，并且此实现比启动服务更为复杂。出于这些原因，请参阅另一份文档[绑定服务](https://developer.android.com/guide/components/bound-services)，了解关于绑定服务的详细介绍。

### 扩展Binder类

如果您的服务仅供本地应用使用，不需要跨进程工作，则可以实现自有 Binder 类，让您的客户端通过该类直接访问服务中的公共方法。

> 注：此方法只有在客户端和服务位于同一应用和进程内这一最常见的情况下方才有效。 例如，对于需要将 Activity 绑定到在后台播放音乐的自有服务的音乐应用，此方法非常有效。

以下是具体的设置方法：

1. 在您的服务中，创建一个可满足下列任一要求的 Binder 实例：
   * 包含客户端可调用的公共方法
   * 返回当前 Service 实例，其中包含客户端可调用的公共方法
   * 或返回由服务承载的其他类的实例，其中包含客户端可调用的公共方法
2. 从 onBind\(\) 回调方法返回此 Binder 实例。
3. 在客户端中，从 onServiceConnected\(\) 回调方法接收 Binder，并使用提供的方法调用绑定服务。

> 注：之所以要求服务和客户端必须在同一应用内，是为了便于客户端转换返回的对象和正确调用其 API。服务和客户端还必须在同一进程内，因为此方法不执行任何跨进程编组。

例如，以下这个服务可让客户端通过 Binder 实现访问服务中的方法：

```java
public class LocalService extends Service {
    // Binder given to clients
    private final IBinder mBinder = new LocalBinder();
    // Random number generator
    private final Random mGenerator = new Random();

    /**
     * Class used for the client Binder.  Because we know this service always
     * runs in the same process as its clients, we don't need to deal with IPC.
     */
    public class LocalBinder extends Binder {
        LocalService getService() {
            // Return this instance of LocalService so clients can call public methods
            return LocalService.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return mBinder;
    }

    /** method for clients */
    public int getRandomNumber() {
      return mGenerator.nextInt(100);
    }
}
```

LocalBinder 为客户端提供 getService\(\) 方法，以检索 LocalService 的当前实例。这样，客户端便可调用服务中的公共方法。 例如，客户端可调用服务中的 getRandomNumber\(\)。

点击按钮时，以下这个 Activity 会绑定到 LocalService 并调用 getRandomNumber\(\) ：

```java
public class BindingActivity extends Activity {
    LocalService mService;
    boolean mBound = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.main);
    }

    @Override
    protected void onStart() {
        super.onStart();
        // Bind to LocalService
        Intent intent = new Intent(this, LocalService.class);
        bindService(intent, mConnection, Context.BIND_AUTO_CREATE);
    }

    @Override
    protected void onStop() {
        super.onStop();
        // Unbind from the service
        if (mBound) {
            unbindService(mConnection);
            mBound = false;
        }
    }

    /** Called when a button is clicked (the button in the layout file attaches to
      * this method with the android:onClick attribute) */
    public void onButtonClick(View v) {
        if (mBound) {
            // Call a method from the LocalService.
            // However, if this call were something that might hang, then this request should
            // occur in a separate thread to avoid slowing down the activity performance.
            int num = mService.getRandomNumber();
            Toast.makeText(this, "number: " + num, Toast.LENGTH_SHORT).show();
        }
    }

    /** Defines callbacks for service binding, passed to bindService() */
    private ServiceConnection mConnection = new ServiceConnection() {

        @Override
        public void onServiceConnected(ComponentName className,
                IBinder service) {
            // We've bound to LocalService, cast the IBinder and get LocalService instance
            LocalBinder binder = (LocalBinder) service;
            mService = binder.getService();
            mBound = true;
        }

        @Override
        public void onServiceDisconnected(ComponentName arg0) {
            mBound = false;
        }
    };
}
```

### 使用 Messenger

如需让服务与远程进程通信，则可使用 Messenger 为您的服务提供接口。利用此方法，您无需使用 AIDL 便可执行进程间通信 \(IPC\)。

以下是 Messenger 的使用方法摘要：

* 服务实现一个 Handler，由其接收来自客户端的每个调用的回调
* Handler 用于创建 Messenger 对象（对 Handler 的引用）
* Messenger 创建一个 IBinder，服务通过 onBind\(\) 使其返回客户端
* 客户端使用 IBinder 将 Messenger（引用服务的 Handler）实例化，然后使用后者将 Message 对象发送给服务
* 服务在其 Handler 中（具体地讲，是在 handleMessage\(\) 方法中）接收每个 

这样，客户端并没有调用服务的“方法”。而客户端传递的“消息”（Message 对象）是服务在其 Handler 中接收的。

以下是一个使用 Messenger 接口的简单服务示例：

```java
public class MessengerService extends Service {
    /** Command to the service to display a message */
    static final int MSG_SAY_HELLO = 1;

    /**
     * Handler of incoming messages from clients.
     */
    class IncomingHandler extends Handler {
        @Override
        public void handleMessage(Message msg) {
            switch (msg.what) {
                case MSG_SAY_HELLO:
                    Toast.makeText(getApplicationContext(), "hello!", Toast.LENGTH_SHORT).show();
                    break;
                default:
                    super.handleMessage(msg);
            }
        }
    }

    /**
     * Target we publish for clients to send messages to IncomingHandler.
     */
    final Messenger mMessenger = new Messenger(new IncomingHandler());

    /**
     * When binding to the service, we return an interface to our messenger
     * for sending messages to the service.
     */
    @Override
    public IBinder onBind(Intent intent) {
        Toast.makeText(getApplicationContext(), "binding", Toast.LENGTH_SHORT).show();
        return mMessenger.getBinder();
    }
}
```

请注意，服务就是在 Handler 的 handleMessage\(\) 方法中接收传入的 Message，并根据 what 成员决定下一步操作。

客户端只需根据服务返回的 IBinder 创建一个 Messenger，然后利用 send\(\) 发送一条消息。例如，以下就是一个绑定到服务并向服务传递 MSG\_SAY\_HELLO 消息的简单 Activity：

```java
public class ActivityMessenger extends Activity {
    /** Messenger for communicating with the service. */
    Messenger mService = null;

    /** Flag indicating whether we have called bind on the service. */
    boolean mBound;

    /**
     * Class for interacting with the main interface of the service.
     */
    private ServiceConnection mConnection = new ServiceConnection() {
        public void onServiceConnected(ComponentName className, IBinder service) {
            // This is called when the connection with the service has been
            // established, giving us the object we can use to
            // interact with the service.  We are communicating with the
            // service using a Messenger, so here we get a client-side
            // representation of that from the raw IBinder object.
            mService = new Messenger(service);
            mBound = true;
        }

        public void onServiceDisconnected(ComponentName className) {
            // This is called when the connection with the service has been
            // unexpectedly disconnected -- that is, its process crashed.
            mService = null;
            mBound = false;
        }
    };

    public void sayHello(View v) {
        if (!mBound) return;
        // Create and send a message to the service, using a supported 'what' value
        Message msg = Message.obtain(null, MessengerService.MSG_SAY_HELLO, 0, 0);
        try {
            mService.send(msg);
        } catch (RemoteException e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.main);
    }

    @Override
    protected void onStart() {
        super.onStart();
        // Bind to the service
        bindService(new Intent(this, MessengerService.class), mConnection,
            Context.BIND_AUTO_CREATE);
    }

    @Override
    protected void onStop() {
        super.onStop();
        // Unbind from the service
        if (mBound) {
            unbindService(mConnection);
            mBound = false;
        }
    }
}
```

请注意，此示例并未说明服务如何对客户端作出响应。如果您想让服务作出响应，则还需要在客户端中创建一个 Messenger。然后，当客户端收到 onServiceConnected\(\) 回调时，会向服务发送一条 Message，并在其 send\(\) 方法的 replyTo 参数中包含客户端的 Messenger。

#### 使用AIDL

AIDL（Android 接口定义语言）与您可能使用过的其他 IDL 类似。 您可以利用它定义客户端与服务使用进程间通信 \(IPC\) 进行相互通信时都认可的编程接口。 在 Android 上，一个进程通常无法访问另一个进程的内存。 尽管如此，进程需要将其对象分解成操作系统能够识别的原语，并将对象编组成跨越边界的对象。 编写执行这一编组操作的代码是一项繁琐的工作，因此 Android 会使用 AIDL 来处理。

> 注：只有允许不同应用的客户端用 IPC 方式访问服务，并且想要在服务中处理多线程时，才有必要使用 AIDL。 如果您不需要执行跨越不同应用的并发 IPC，就应该通过实现一个 Binder 创建接口；或者，如果您想执行 IPC，但根本不需要处理多线程，则使用 Messenger 类来实现接口。无论如何，在实现 AIDL 之前，请您务必理解绑定服务。

在您开始设计 AIDL 接口之前，要注意 AIDL 接口的调用是直接函数调用。 您不应该假设发生调用的线程。 视调用来自本地进程还是远程进程中的线程，实际情况会有所差异。 具体而言：

* 来自本地进程的调用在发起调用的同一线程内执行。如果该线程是您的主 UI 线程，则该线程继续在 AIDL 接口中执行。 如果该线程是其他线程，则其便是在服务中执行您的代码的线程。 因此，只有在本地线程访问服务时，您才能完全控制哪些线程在服务中执行（但如果真是这种情况，您根本不应该使用 AIDL，而是应该通过实现 Binder 类创建接口）。
* 来自远程进程的调用分派自平台在您的自有进程内部维护的线程池。 您必须为来自未知线程的多次并发传入调用做好准备。 换言之，AIDL 接口的实现必须是完全线程安全实现。
* oneway 关键字用于修改远程调用的行为。使用该关键字时，远程调用不会阻塞；它只是发送事务数据并立即返回。接口的实现最终接收此调用时，是以正常远程调用形式将其作为来自 Binder 线程池的常规调用进行接收。 如果 oneway 用于本地调用，则不会有任何影响，调用仍是同步调用。
