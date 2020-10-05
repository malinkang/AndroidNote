# 绑定服务

绑定服务是客户端-服务器接口中的服务器。借助绑定服务，组件（例如 Activity）可以绑定到服务、发送请求、接收响应，以及执行进程间通信 \(IPC\)。绑定服务通常只在为其他应用组件提供服务时处于活动状态，不会无限期在后台运行。

本文介绍如何创建绑定服务，包括如何绑定到来自其他应用组件的服务。如需了解一般服务的更多信息（例如：如何利用服务传送通知、如何将服务设置为在前台运行等），请参阅[服务](https://developer.android.com/guide/components/services)文档。

## 基础知识

绑定服务是 [`Service`](https://developer.android.com/reference/android/app/Service?hl=zh-cn) 类的实现，可让其他应用与其进行绑定和交互。如要为服务提供绑定，您必须实现 [`onBind()`](https://developer.android.com/reference/android/app/Service?hl=zh-cn#onBind%28android.content.Intent%29) 回调方法。该方法会返回 [`IBinder`](https://developer.android.com/reference/android/os/IBinder?hl=zh-cn) 对象，该对象定义的编程接口可供客户端用来与服务进行交互。

### 绑定到已启动服务

如[服务](https://developer.android.com/guide/components/services)文档中所述，您可以创建同时具有已启动和已绑定两种状态的服务。换言之，可通过调用 [`startService()`](https://developer.android.com/reference/android/content/Context#startService%28android.content.Intent%29) 启动服务，让服务无限期运行；此外，还可通过调用 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 让客户端绑定到该服务。

如果您确实允许服务同时具有已启动和已绑定状态，则在启动服务后，如果所有客户端均解绑服务，则系统_不会_销毁该服务。为此，您必须通过调用 [`stopSelf()`](https://developer.android.com/reference/android/app/Service#stopSelf%28%29) 或 [`stopService()`](https://developer.android.com/reference/android/content/Context#stopService%28android.content.Intent%29) 显式停止服务。

尽管您通常应实现 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29) _或_ [`onStartCommand()`](https://developer.android.com/reference/android/app/Service#onStartCommand%28android.content.Intent,%20int,%20int%29)，但有时需同时实现这两种方法。例如，音乐播放器可能认为，让其服务无限期运行并同时提供绑定会很有用处。如此一来，Activity 便可通过启动服务来播放音乐，并且即使用户离开应用，音乐也不会停止。然后，当用户返回应用时，Activity 便能绑定到服务，重新获得回放控制权。

如需详细了解为已启动服务添加绑定时的服务生命周期，请参阅[管理绑定服务的生命周期](https://developer.android.com/guide/components/bound-services#Lifecycle)部分。

客户端通过调用 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 绑定到服务。调用时，它必须提供 [`ServiceConnection`](https://developer.android.com/reference/android/content/ServiceConnection) 的实现，后者会监控与服务的连接。[`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 的返回值表明所请求的服务是否存在，以及是否允许客户端访问该服务。当创建客户端与服务之间的连接时，Android 系统会调用 [`ServiceConnection`](https://developer.android.com/reference/android/content/ServiceConnection) 上的 [`onServiceConnected()`](https://developer.android.com/reference/android/content/ServiceConnection#onServiceConnected%28android.content.ComponentName,%20android.os.IBinder%29)。`onServiceConnected()` 方法包含 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 参数，客户端随后会使用该参数与绑定服务进行通信。

您可以同时将多个客户端连接到服务。但是，系统会缓存 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 服务通信通道。换言之，只有在第一个客户端绑定服务时，系统才会调用服务的 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29) 方法来生成 [`IBinder`](https://developer.android.com/reference/android/os/IBinder)。然后，系统会将同一 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 传递至绑定到相同服务的所有其他客户端，无需再次调用 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29)。

当最后一个客户端取消与服务的绑定时，系统会销毁服务（除非 [`startService()`](https://developer.android.com/reference/android/content/Context#startService%28android.content.Intent%29) 也启动了该服务）。

针对您的绑定服务实现，其最重要的环节是定义 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29) 回调方法所返回的接口。下文将为您介绍几种不同方法，以便您定义服务的 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 接口。

## 创建绑定服务

创建提供绑定的服务时，您必须提供 [`IBinder`](https://developer.android.com/reference/android/os/IBinder?hl=zh-cn)，进而提供编程接口，以便客户端使用此接口与服务进行交互。您可以通过三种方法定义接口：

[扩展 Binder 类](https://developer.android.com/guide/components/bound-services?hl=zh-cn#Binder)

如果服务是供您的自有应用专用，并且在与客户端相同的进程中运行（常见情况），则应通过扩展 [`Binder`](https://developer.android.com/reference/android/os/Binder?hl=zh-cn) 类并从 [`onBind()`](https://developer.android.com/reference/android/app/Service?hl=zh-cn#onBind%28android.content.Intent%29) 返回该类的实例来创建接口。收到 [`Binder`](https://developer.android.com/reference/android/os/Binder?hl=zh-cn) 后，客户端可利用其直接访问 [`Binder`](https://developer.android.com/reference/android/os/Binder?hl=zh-cn) 实现或 [`Service`](https://developer.android.com/reference/android/app/Service?hl=zh-cn) 中可用的公共方法。

如果服务只是您自有应用的后台工作线程，则优先采用这种方法。只有当其他应用或不同进程占用您的服务时，您可以不必使用此方法创建接口。

[使用 Messenger](https://developer.android.com/guide/components/bound-services?hl=zh-cn#Messenger)

如需让接口跨不同进程工作，您可以使用 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn) 为服务创建接口。服务可借此方式定义 [`Handler`](https://developer.android.com/reference/android/os/Handler?hl=zh-cn)，以响应不同类型的 [`Message`](https://developer.android.com/reference/android/os/Message?hl=zh-cn) 对象。此 [`Handler`](https://developer.android.com/reference/android/os/Handler?hl=zh-cn) 是 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn) 的基础，后者随后可与客户端分享一个 [`IBinder`](https://developer.android.com/reference/android/os/IBinder?hl=zh-cn)，以便客户端能利用 [`Message`](https://developer.android.com/reference/android/os/Message?hl=zh-cn) 对象向服务发送命令。此外，客户端还可定义自有 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn)，以便服务回传消息。

这是执行进程间通信 \(IPC\) 最为简单的方法，因为 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn) 会在单个线程中创建包含所有请求的队列，这样您就不必对服务进行线程安全设计。

[使用 AIDL](https://developer.android.com/guide/components/aidl?hl=zh-cn)

Android 接口定义语言 \(AIDL\) 会将对象分解成原语，操作系统可通过识别这些原语并将其编组到各进程中来执行 IPC。对于之前采用 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn) 的方法而言，其实际上是以 AIDL 作为其底层结构。如上所述，[`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn) 会在单个线程中创建包含所有客户端请求的队列，以便服务一次接收一个请求。不过，如果您想让服务同时处理多个请求，则可直接使用 AIDL。在此情况下，您的服务必须达到线程安全的要求，并且能够进行多线程处理。

如要直接使用 AIDL，您必须创建定义编程接口的 `.aidl` 文件。Android SDK 工具会利用该文件生成实现接口和处理 IPC 的抽象类，您随后可在服务内对该类进行扩展。

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

如需让服务与远程进程通信，则可使用 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn) 为您的服务提供接口。借助此方法，您无需使用 AIDL 便可执行进程间通信 \(IPC\)。

为接口使用 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn) 比使用 AIDL 更简单，因为 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn) 会将所有服务调用加入队列。纯 AIDL 接口会同时向服务发送多个请求，服务随后必须执行多线程处理。

对于大多数应用，服务无需执行多线程处理，因此使用 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn) 即可让服务一次处理一个调用。如果您的服务必须执行多线程处理，请使用 [AIDL](https://developer.android.com/guide/components/aidl?hl=zh-cn) 来定义接口。

以下是 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn) 的使用方法摘要：

1. 服务实现一个 [`Handler`](https://developer.android.com/reference/android/os/Handler?hl=zh-cn)，由该类为每个客户端调用接收回调。
2. 服务使用 [`Handler`](https://developer.android.com/reference/android/os/Handler?hl=zh-cn) 来创建 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn) 对象（对 [`Handler`](https://developer.android.com/reference/android/os/Handler?hl=zh-cn) 的引用）。
3. [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn) 创建一个 [`IBinder`](https://developer.android.com/reference/android/os/IBinder?hl=zh-cn)，服务通过 [`onBind()`](https://developer.android.com/reference/android/app/Service?hl=zh-cn#onBind%28android.content.Intent%29) 使其返回客户端。
4. 客户端使用 [`IBinder`](https://developer.android.com/reference/android/os/IBinder?hl=zh-cn) 将 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn)（其引用服务的 [`Handler`](https://developer.android.com/reference/android/os/Handler?hl=zh-cn)）实例化，然后使用后者将 [`Message`](https://developer.android.com/reference/android/os/Message?hl=zh-cn) 对象发送给服务。
5. 服务在其 [`Handler`](https://developer.android.com/reference/android/os/Handler?hl=zh-cn) 中（具体地讲，是在 [`handleMessage()`](https://developer.android.com/reference/android/os/Handler?hl=zh-cn#handleMessage%28android.os.Message%29) 方法中）接收每个 [`Message`](https://developer.android.com/reference/android/os/Message?hl=zh-cn)。

这样，客户端便没有_方法_来调用服务。相反，客户端会传递服务在其 [`Handler`](https://developer.android.com/reference/android/os/Handler?hl=zh-cn) 中接收的_消息_（[`Message`](https://developer.android.com/reference/android/os/Message?hl=zh-cn) 对象）。

以下简单服务实例展示如何使用 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn) 接口：

```java
public class MessengerService extends Service {
    /** For showing and hiding our notification. */
    NotificationManager mNM;
    /** Keeps track of all current registered clients. */
    ArrayList<Messenger> mClients = new ArrayList<Messenger>();
    /** Holds last value set by a client. */
    int mValue = 0;
    
    /**
     * Command to the service to register a client, receiving callbacks
     * from the service.  The Message's replyTo field must be a Messenger of
     * the client where callbacks should be sent.
     */
    static final int MSG_REGISTER_CLIENT = 1;
    
    /**
     * Command to the service to unregister a client, ot stop receiving callbacks
     * from the service.  The Message's replyTo field must be a Messenger of
     * the client as previously given with MSG_REGISTER_CLIENT.
     */
    static final int MSG_UNREGISTER_CLIENT = 2;
    
    /**
     * Command to service to set a new value.  This can be sent to the
     * service to supply a new value, and will be sent by the service to
     * any registered clients with the new value.
     */
    static final int MSG_SET_VALUE = 3;
    
    /**
     * Handler of incoming messages from clients.
     */
    class IncomingHandler extends Handler {
        @Override
        public void handleMessage(Message msg) {
            switch (msg.what) {
                case MSG_REGISTER_CLIENT:
                    mClients.add(msg.replyTo);
                    break;
                case MSG_UNREGISTER_CLIENT:
                    mClients.remove(msg.replyTo);
                    break;
                case MSG_SET_VALUE:
                    mValue = msg.arg1;
                    for (int i=mClients.size()-1; i>=0; i--) {
                        try {
                            mClients.get(i).send(Message.obtain(null,
                                    MSG_SET_VALUE, mValue, 0));
                        } catch (RemoteException e) {
                            // The client is dead.  Remove it from the list;
                            // we are going through the list from back to front
                            // so this is safe to do inside the loop.
                            mClients.remove(i);
                        }
                    }
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
    
    @Override
    public void onCreate() {
        mNM = (NotificationManager)getSystemService(NOTIFICATION_SERVICE);

        // Display a notification about us starting.
        showNotification();
    }

    @Override
    public void onDestroy() {
        // Cancel the persistent notification.
        mNM.cancel(R.string.remote_service_started);

        // Tell the user we stopped.
        Toast.makeText(this, R.string.remote_service_stopped, Toast.LENGTH_SHORT).show();
    }
    
    /**
     * When binding to the service, we return an interface to our messenger
     * for sending messages to the service.
     */
    @Override
    public IBinder onBind(Intent intent) {
        return mMessenger.getBinder();
    }

    /**
     * Show a notification while this service is running.
     */
    private void showNotification() {
        // In this sample, we'll use the same text for the ticker and the expanded notification
        CharSequence text = getText(R.string.remote_service_started);

        // The PendingIntent to launch our activity if the user selects this notification
        PendingIntent contentIntent = PendingIntent.getActivity(this, 0,
                new Intent(this, RemoteService.Controller.class), 0);

        // Set the info for the views that show in the notification panel.
        Notification notification = new Notification.Builder(this)
                .setSmallIcon(R.drawable.stat_sample)  // the status icon
                .setTicker(text)  // the status text
                .setWhen(System.currentTimeMillis())  // the time stamp
                .setContentTitle(getText(R.string.local_service_label))  // the label of the entry
                .setContentText(text)  // the contents of the entry
                .setContentIntent(contentIntent)  // The intent to send when the entry is clicked
                .build();

        // Send the notification.
        // We use a string id because it is a unique number.  We use it later to cancel.
        mNM.notify(R.string.remote_service_started, notification);
    }
}
//END_INCLUDE(service)

```

请注意，服务会在 [`Handler`](https://developer.android.com/reference/android/os/Handler?hl=zh-cn) 的 [`handleMessage()`](https://developer.android.com/reference/android/os/Handler?hl=zh-cn#handleMessage%28android.os.Message%29) 方法中接收传入的 [`Message`](https://developer.android.com/reference/android/os/Message?hl=zh-cn)，并根据 [`what`](https://developer.android.com/reference/android/os/Message?hl=zh-cn#what) 成员决定下一步操作。

客户端只需根据服务返回的 [`IBinder`](https://developer.android.com/reference/android/os/IBinder?hl=zh-cn) 创建 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn)，然后利用 [`send()`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn#send%28android.os.Message%29) 发送消息。

如果您想让服务作出响应，需在客户端中创建一个 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn)。收到 [`onServiceConnected()`](https://developer.android.com/reference/android/content/ServiceConnection?hl=zh-cn#onServiceConnected%28android.content.ComponentName,%20android.os.IBinder%29) 回调时，客户端会向服务发送 [`Message`](https://developer.android.com/reference/android/os/Message?hl=zh-cn)，并在其 [`send()`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn#send%28android.os.Message%29) 方法的 [`replyTo`](https://developer.android.com/reference/android/os/Message?hl=zh-cn#replyTo) 参数中加入客户端的 [`Messenger`](https://developer.android.com/reference/android/os/Messenger?hl=zh-cn)。

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

## 绑定到服务

应用组件（客户端）可通过调用 [`bindService()`](https://developer.android.com/reference/android/content/Context?hl=zh-cn#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 绑定到服务。然后，Android 系统会调用服务的 [`onBind()`](https://developer.android.com/reference/android/app/Service?hl=zh-cn#onBind%28android.content.Intent%29) 方法，该方法会返回用于与服务交互的 [`IBinder`](https://developer.android.com/reference/android/os/IBinder?hl=zh-cn)。

绑定为异步操作，并且 [`bindService()`](https://developer.android.com/reference/android/content/Context?hl=zh-cn#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) _无需_将 [`IBinder`](https://developer.android.com/reference/android/os/IBinder?hl=zh-cn) 返回至客户端即可立即返回。如要接收 [`IBinder`](https://developer.android.com/reference/android/os/IBinder?hl=zh-cn)，客户端必须创建一个 [`ServiceConnection`](https://developer.android.com/reference/android/content/ServiceConnection?hl=zh-cn) 实例，并将其传递给 [`bindService()`](https://developer.android.com/reference/android/content/Context?hl=zh-cn#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29)。[`ServiceConnection`](https://developer.android.com/reference/android/content/ServiceConnection?hl=zh-cn) 包含一个回调方法，系统通过调用该方法来传递 [`IBinder`](https://developer.android.com/reference/android/os/IBinder?hl=zh-cn)。

{% hint style="info" %}
**注意：**只有 Activity、服务和内容提供程序可以绑定到服务，您**无法**从广播接收器绑定到服务。
{% endhint %}

如要从您的客户端绑定到服务，请执行以下步骤：

1. 实现 [`ServiceConnection`](https://developer.android.com/reference/android/content/ServiceConnection?hl=zh-cn)。

   您的实现必须重写两个回调方法：

   *  [`onServiceConnected()`](https://developer.android.com/reference/android/content/ServiceConnection?hl=zh-cn#onServiceConnected%28android.content.ComponentName,%20android.os.IBinder%29)系统会调用该方法，进而传递服务的 [`onBind()`](https://developer.android.com/reference/android/app/Service?hl=zh-cn#onBind%28android.content.Intent%29) 方法所返回的 [`IBinder`](https://developer.android.com/reference/android/os/IBinder?hl=zh-cn)。
   * [`onServiceDisconnected()`](https://developer.android.com/reference/android/content/ServiceConnection?hl=zh-cn#onServiceDisconnected%28android.content.ComponentName%29)当与服务的连接意外中断（例如服务崩溃或被终止）时，Android 系统会调用该方法。当客户端取消绑定时，系统_不会_调用该方法。

2. 调用 [`bindService()`](https://developer.android.com/reference/android/content/Context?hl=zh-cn#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29)，从而传递 [`ServiceConnection`](https://developer.android.com/reference/android/content/ServiceConnection?hl=zh-cn) 实现。
3. 当系统调用 [`onServiceConnected()`](https://developer.android.com/reference/android/content/ServiceConnection?hl=zh-cn#onServiceConnected%28android.content.ComponentName,%20android.os.IBinder%29) 回调方法时，您可以使用接口定义的方法开始调用服务。
4. 如要断开与服务的连接，请调用 [`unbindService()`](https://developer.android.com/reference/android/content/Context?hl=zh-cn#unbindService%28android.content.ServiceConnection%29)。

   当应用销毁客户端时，如果该客户端仍与服务保持绑定状态，则该销毁会导致客户端取消绑定。更好的做法是在客户端与服务交互完成后，立即取消与该客户端的绑定。这样可以关闭空闲服务。如需详细了解有关绑定和取消绑定的适当时机，请参阅[附加说明](https://developer.android.com/guide/components/bound-services?hl=zh-cn#Additional_Notes)。

* [`bindService()`](https://developer.android.com/reference/android/content/Context?hl=zh-cn#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 的第一个参数是一个 [`Intent`](https://developer.android.com/reference/android/content/Intent?hl=zh-cn)，用于显式命名要绑定的服务。

{% hint style="info" %}
**注意：**如果您使用 Intent 来绑定到 [`Service`](https://developer.android.com/reference/android/app/Service?hl=zh-cn)，请务必使用[显式](https://developer.android.com/guide/components/intents-filters?hl=zh-cn#Types) Intent 来确保应用的安全性。使用隐式 Intent 启动服务存在安全隐患，因为您无法确定哪些服务会响应该 Intent，并且用户无法看到哪些服务已启动。从 Android 5.0（API 级别 21）开始，如果使用隐式 Intent 调用 [`bindService()`](https://developer.android.com/reference/android/content/Context?hl=zh-cn#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29)，则系统会抛出异常。
{% endhint %}

* 第二个参数是 [`ServiceConnection`](https://developer.android.com/reference/android/content/ServiceConnection?hl=zh-cn) 对象。
* 第三个参数是指示绑定选项的标记。如要创建尚未处于活动状态的服务，此参数应为 [`BIND_AUTO_CREATE`](https://developer.android.com/reference/android/content/Context?hl=zh-cn#BIND_AUTO_CREATE)。其他可能的值为 [`BIND_DEBUG_UNBIND`](https://developer.android.com/reference/android/content/Context?hl=zh-cn#BIND_DEBUG_UNBIND) 和 [`BIND_NOT_FOREGROUND`](https://developer.android.com/reference/android/content/Context?hl=zh-cn#BIND_NOT_FOREGROUND)，或者 `0`（表示无此参数）。

以下是一些有关绑定到服务的重要说明：

### 附加说明

* 您应该始终捕获 [`DeadObjectException`](https://developer.android.com/reference/android/os/DeadObjectException?hl=zh-cn) 异常，系统会在连接中断时抛出此异常。这是远程方法抛出的唯一异常。
* 对象是跨进程计数的引用。
* 如以下示例所述，在匹配客户端生命周期的引入 \(bring-up\) 和退出 \(tear-down\) 时刻期间，您通常需配对绑定和取消绑定：

  * 如果您只需在 Activity 可见时与服务交互，则应在 [`onStart()`](https://developer.android.com/reference/android/app/Activity?hl=zh-cn#onStart%28%29) 期间进行绑定，在 [`onStop()`](https://developer.android.com/reference/android/app/Activity?hl=zh-cn#onStop%28%29) 期间取消绑定。
  * 当 Activity 在后台处于停止运行状态时，若您仍希望其能接收响应，则可在 [`onCreate()`](https://developer.android.com/reference/android/app/Activity?hl=zh-cn#onCreate%28android.os.Bundle%29) 期间进行绑定，在 [`onDestroy()`](https://developer.android.com/reference/android/app/Activity?hl=zh-cn#onDestroy%28%29) 期间取消绑定。请注意，这意味着您的 Activity 在整个运行过程中（甚至包括后台运行期间）均需使用服务，因此如果服务位于其他进程内，则当您提高该进程的权重时，系统便更有可能会将其终止。

{% hint style="info" %}
**注意：**通常情况下，_不应_在 Activity 的 [`onResume()`](https://developer.android.com/reference/android/app/Activity?hl=zh-cn#onResume%28%29) 和 [`onPause()`](https://developer.android.com/reference/android/app/Activity?hl=zh-cn#onPause%28%29) 期间绑定和取消绑定，因为每次切换生命周期状态时都会发生这些回调，并且您应让这些转换期间的处理工作保持最少。此外，如果您将应用内的多个 Activity 绑定到同一个 Service，并且其中两个 Activity 之间发生了转换，则如果当前 Activity 在下一个 Activity 绑定（恢复期间）之前取消绑定（暂停期间），则系统可能会销毁并重建服务。如需了解 Activity 如何协调其生命周期的 Activity 转换，请参阅 [Activity](https://developer.android.com/guide/components/activities?hl=zh-cn#CoordinatingActivities) 文档。
{% endhint %}

## 管理绑定服务的生命周期

当取消服务与所有客户端之间的绑定时，Android 系统会销毁该服务（除非您还使用 [`onStartCommand()`](https://developer.android.com/reference/android/app/Service?hl=zh-cn#onStartCommand%28android.content.Intent,%20int,%20int%29) 启动了该服务）。因此，如果您的服务完全是绑定服务，则您无需管理其生命周期，Android 系统会根据它是否绑定到任何客户端代您管理。

不过，如果您选择实现 [`onStartCommand()`](https://developer.android.com/reference/android/app/Service?hl=zh-cn#onStartCommand%28android.content.Intent,%20int,%20int%29) 回调方法，则您必须显式停止服务，因为系统现已将其视为_已启动_状态。在此情况下，服务将一直运行，直到其通过 [`stopSelf()`](https://developer.android.com/reference/android/app/Service?hl=zh-cn#stopSelf%28%29) 自行停止，或其他组件调用 [`stopService()`](https://developer.android.com/reference/android/content/Context?hl=zh-cn#stopService%28android.content.Intent%29)（与该服务是否绑定到任何客户端无关）。

此外，如果您的服务已启动并接受绑定，则当系统调用您的 [`onUnbind()`](https://developer.android.com/reference/android/app/Service?hl=zh-cn#onUnbind%28android.content.Intent%29) 方法时，如果您想在客户端下一次绑定到服务时接收 [`onRebind()`](https://developer.android.com/reference/android/app/Service?hl=zh-cn#onRebind%28android.content.Intent%29) 调用，则可选择返回 `true`。[`onRebind()`](https://developer.android.com/reference/android/app/Service?hl=zh-cn#onRebind%28android.content.Intent%29) 返回空值，但客户端仍在其 [`onServiceConnected()`](https://developer.android.com/reference/android/content/ServiceConnection?hl=zh-cn#onServiceConnected%28android.content.ComponentName,%20android.os.IBinder%29) 回调中接收 [`IBinder`](https://developer.android.com/reference/android/os/IBinder?hl=zh-cn)。下图说明这种生命周期的逻辑。  


![&#x5DF2;&#x542F;&#x52A8;&#x4E14;&#x5141;&#x8BB8;&#x7ED1;&#x5B9A;&#x7684;&#x670D;&#x52A1;&#x7684;&#x751F;&#x547D;&#x5468;&#x671F;](../../.gitbook/assets/image%20%2862%29.png)



  


  




