# 服务

[`Service`](https://developer.android.com/reference/android/app/Service) 是一种可在后台执行长时间运行操作而不提供界面的应用组件。服务可由其他应用组件启动，而且即使用户切换到其他应用，服务仍将在后台继续运行。此外，组件可通过绑定到服务与之进行交互，甚至是执行进程间通信 \(IPC\)。例如，服务可在后台处理网络事务、播放音乐，执行文件 I/O 或与内容提供程序进行交互。

以下是**三种**不同的服务类型：

**前台**

前台服务执行一些用户能注意到的操作。例如，音频应用会使用前台服务来播放音频曲目。前台服务必须显示[通知](https://developer.android.com/guide/topics/ui/notifiers/notifications)。即使用户停止与应用的交互，前台服务仍会继续运行。

**后台**

后台服务执行用户不会直接注意到的操作。例如，如果应用使用某个服务来压缩其存储空间，则此服务通常是后台服务。

{% hint style="info" %}
注意：如果您的应用面向 API 级别 26 或更高版本，当应用本身未在前台运行时，系统会对[运行后台服务施加限制](https://developer.android.com/about/versions/oreo/background)。在诸如此类的大多数情况下，您的应用应改为使用[计划作业](https://developer.android.com/topic/performance/scheduling)。
{% endhint %}

**绑定**

当应用组件通过调用 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 绑定到服务时，服务即处于_绑定_状态。绑定服务会提供客户端-服务器接口，以便组件与服务进行交互、发送请求、接收结果，甚至是利用进程间通信 \(IPC\) 跨进程执行这些操作。仅当与另一个应用组件绑定时，绑定服务才会运行。多个组件可同时绑定到该服务，但全部取消绑定后，该服务即会被销毁。

虽然本文档分开概括讨论启动服务和绑定服务，但您的服务可同时以这两种方式运行，换言之，它既可以是启动服务（以无限期运行），亦支持绑定。唯一的问题在于您是否实现一组回调方法：[`onStartCommand()`](https://developer.android.com/reference/android/app/Service#onStartCommand%28android.content.Intent,%20int,%20int%29)（让组件启动服务）和 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29)（实现服务绑定）。

无论服务是处于启动状态还是绑定状态（或同时处于这两种状态），任何应用组件均可像使用 Activity 那样，通过调用 [`Intent`](https://developer.android.com/reference/android/content/Intent) 来使用服务（即使此服务来自另一应用）。不过，您可以通过清单文件将服务声明为_私有_服务，并阻止其他应用访问该服务。[使用清单文件声明服务](https://developer.android.com/guide/components/services#Declaring)部分将对此做更详尽的阐述。

{% hint style="info" %}
**注意：**服务在其托管进程的主线程中运行，它既**不**创建自己的线程，也**不**在单独的进程中运行（除非另行指定）。如果服务将执行任何 CPU 密集型工作或阻止性操作（例如 MP3 播放或联网），则应通过在服务内创建新线程来完成这项工作。通过使用单独的线程，您可以降低发生“应用无响应”\(ANR\) 错误的风险，而应用的主线程仍可继续专注于运行用户与 Activity 之间的交互。
{% endhint %}

## 在服务和线程之间进行选择

简单地说，服务是一种即使用户未与应用交互也可在后台运行的组件，因此，只有在需要服务时才应创建服务。

如果您必须在主线程之外执行操作，但只在用户与您的应用交互时执行此操作，则应创建新线程。例如，如果您只是想在 Activity 运行的同时播放一些音乐，则可在 [`onCreate()`](https://developer.android.com/reference/android/app/Activity#onCreate%28android.os.Bundle%29) 中创建线程，在 [`onStart()`](https://developer.android.com/reference/android/app/Activity#onStart%28%29) 中启动线程运行，然后在 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29) 中停止线程。您还可考虑使用 [`AsyncTask`](https://developer.android.com/reference/android/os/AsyncTask) 或 [`HandlerThread`](https://developer.android.com/reference/android/os/HandlerThread)，而非传统的 [`Thread`](https://developer.android.com/reference/java/lang/Thread) 类。如需了解有关线程的详细信息，请参阅[进程和线程](https://developer.android.com/guide/components/processes-and-threads#Threads)文档。

请记住，如果您确实要使用服务，则默认情况下，它仍会在应用的主线程中运行，因此，如果服务执行的是密集型或阻止性操作，则您仍应在服务内创建新线程。

## 基础知识

要创建服务，您必须创建 Service 的子类（或使用它的一个现有子类）。在实现中，您需要重写一些回调方法，以处理服务生命周期的某些关键方面并提供一种机制将组件绑定到服务（如适用）。 应重写的最重要的回调方法包括：

* onStartCommand\(\)

  当另一个组件（如 Activity）通过调用 `startService()` 请求启动服务时，系统将调用此方法。一旦执行此方法，服务即会启动并可在后台无限期运行。 如果您实现此方法，则在服务工作完成后，需要由您通过调用 stopSelf\(\) 或 stopService\(\) 来停止服务。（如果您只想提供绑定，则无需实现此方法。）

* onBind\(\)

  当另一个组件想通过调用 bindService\(\) 与服务绑定（例如执行 RPC）时，系统将调用此方法。在此方法的实现中，您必须通过返回 IBinder 提供一个接口，供客户端用来与服务进行通信。请务必实现此方法，但如果您并不希望允许绑定，则应返回 null。

* onCreate\(\)

  首次创建服务时，系统将调用此方法来执行一次性设置程序（在调用 onStartCommand\(\) 或 onBind\(\) 之前）。

* onDestroy\(\)

  当不再使用服务且准备将其销毁时，系统会调用此方法。服务应通过实现此方法来清理任何资源，如线程、注册的侦听器、接收器等。这是服务接收的最后一个调用。

如果组件通过调用 `startService()`启动服务（这会导致对 `onStartCommand()` 的调用），则服务将一直运行，直到服务使用 `stopSelf()` 自行停止运行，或由其他组件通过调用 `stopService()` 停止它为止。

如果组件是通过调用 bindService\(\) 来创建服务（且未调用 onStartCommand\(\)，则服务只会在该组件与其绑定时运行。一旦该服务与所有客户端之间的绑定全部取消，系统便会销毁它。

仅当内存过低且必须回收系统资源以供具有用户焦点的 Activity 使用时，Android 系统才会强制停止服务。如果将服务绑定到具有用户焦点的 Activity，则它不太可能会终止；如果将服务声明为在前台运行，则它几乎永远不会终止。或者，如果服务已启动并要长时间运行，则系统会随着时间的推移降低服务在后台任务列表中的位置，而服务也将随之变得非常容易被终止；如果服务是启动服务，则您必须将其设计为能够妥善处理系统对它的重启。 如果系统终止服务，那么一旦资源变得再次可用，系统便会重启服务（不过这还取决于从 onStartCommand\(\) 返回的值，本文稍后会对此加以讨论）。

## 使用清单文件声明服务

如同 Activity（以及其他组件）一样，您必须在应用的清单文件中声明所有服务。

要声明服务，请添加 元素作为 元素的子元素。例如：

```java
<manifest ... >
  ...
  <application ... >
      <service android:name=".ExampleService" />
      ...
  </application>
</manifest>
```

您还可将其他属性包括在 元素中，以定义一些特性，如启动服务及其运行所在进程所需的权限。android:name 属性是唯一必需的属性，用于指定服务的类名。应用一旦发布，即不应更改此类名，如若不然，可能会存在因依赖显式 Intent 启动或绑定服务而破坏代码的风险（请阅读博客文章Things That Cannot Change\[不能更改的内容\]）。

{% hint style="info" %}
为了确保应用的安全性，请始终使用显式 Intent 启动或绑定 Service，且不要为服务声明 Intent 过滤器。 启动哪个服务存在一定的不确定性，而如果对这种不确定性的考量非常有必要，则可为服务提供 Intent 过滤器并从 Intent 中排除相应的组件名称，但随后必须使用 setPackage\(\) 方法设置 Intent 的软件包，这样可以充分消除目标服务的不确定性。
{% endhint %}

此外，还可以通过添加 android:exported 属性并将其设置为 "false"，确保服务仅适用于您的应用。这可以有效阻止其他应用启动您的服务，即便在使用显式 Intent 时也如此。

{% hint style="info" %}
**注意**：用户可以查看其设备上正在运行的服务。如果他们发现自己无法识别或信任的服务，则可以停止该服务。为避免用户意外停止您的服务，您需要在应用清单的 [`<service>`](https://developer.android.com/guide/topics/manifest/service-element) 元素中添加 [`android:description`](https://developer.android.com/guide/topics/manifest/service-element#desc)。请在描述中用一个短句解释服务的作用及其提供的好处。
{% endhint %}

## 创建启动服务

启动服务由另一个组件通过调用 startService\(\) 启动，这会导致调用服务的 onStartCommand\(\) 方法。

服务启动之后，其生命周期即独立于启动它的组件，并且可以在后台无限期地运行，即使启动服务的组件已被销毁也不受影响。 因此，服务应通过调用 stopSelf\(\) 结束工作来自行停止运行，或者由另一个组件通过调用 stopService\(\) 来停止它。

应用组件（如 Activity）可以通过调用 startService\(\) 方法并传递 Intent 对象（指定服务并包含待使用服务的所有数据）来启动服务。服务通过 onStartCommand\(\) 方法接收此 Intent。

例如，假设某 Activity 需要将一些数据保存到在线数据库中。该 Activity 可以启动一个协同服务，并通过向 startService\(\) 传递一个 Intent，为该服务提供要保存的数据。服务通过 onStartCommand\(\) 接收 Intent，连接到互联网并执行数据库事务。事务完成之后，服务会自行停止运行并随即被销毁。

注意：默认情况下，服务与服务声明所在的应用运行于同一进程，而且运行于该应用的主线程中。 因此，如果服务在用户与来自同一应用的 Activity 进行交互时执行密集型或阻止性操作，则会降低 Activity 性能。 为了避免影响应用性能，您应在服务内启动新线程。

从传统上讲，您可以扩展两个类来创建启动服务：

* Service

  这是适用于所有服务的基类。扩展此类时，必须创建一个用于执行所有服务工作的新线程，因为默认情况下，服务将使用应用的主~~线~~程，这会降低应用正在运行的所有 Activity 的性能。

* IntentService

  这是 Service 的子类，它使用工作线程逐一处理所有启动请求。如果您不要求服务同时处理多个请求，这是最好的选择。 您只需实现 onHandleIntent\(\) 方法即可，该方法会接收每个启动请求的 Intent，使您能够执行后台工作。

### 扩展 IntentService 类

该类已经被标记为过期。IntentService受制于Android 8.0规定的所有[后台执行限制](https://developer.android.com/about/versions/oreo/background)（API级别26）。 当在`Android 8.0`或更高版本上运行时，可以考虑使用`WorkManager`或`JobIntentService`，它使用作业而不是服务。

由于大多数启动服务都不必同时处理多个请求（实际上，这种多线程情况可能很危险），因此使用 `IntentService` 类实现服务也许是最好的选择。

`IntentService`执行以下操作：

* 创建默认的工作线程，用于在应用的**主线程外**执行传递给`onStartCommand()`的所有 Intent。
* 创建工作队列，用于将 Intent 逐一传递给 onHandleIntent\(\) 实现，这样您就永远不必担心多线程问题。
* 在处理完所有启动请求后停止服务，因此您永远不必调用 stopSelf\(\)。
* 提供`onBind()`的默认实现（返回 null）。
* 提供 `onStartCommand()`的默认实现，可将 `Intent`依次发送到工作队列和 `onHandleIntent()` 实现。

`IntentService` 源码

```java
@Override
public void onCreate() {
    // TODO: It would be nice to have an option to hold a partial wakelock
    // during processing, and to have a static startService(Context, Intent)
    // method that would launch the service & hand off a wakelock.
    super.onCreate();
    //在onCreate中创建HandlerThread 和 Handler
    HandlerThread thread = new HandlerThread("IntentService[" + mName + "]");
    thread.start();
    mServiceLooper = thread.getLooper();
    mServiceHandler = new ServiceHandler(mServiceLooper);
}
private final class ServiceHandler extends Handler {
    public ServiceHandler(Looper looper) {
        super(looper);
    }
    @Override
    public void handleMessage(Message msg) {
        //在子线程中处理intent 并在处理完成后停止服务。
        onHandleIntent((Intent)msg.obj);
        stopSelf(msg.arg1);
    }
}
@Override
public void onStart(@Nullable Intent intent, int startId) {
    Message msg = mServiceHandler.obtainMessage();
    msg.arg1 = startId;
    msg.obj = intent;
    //在主线程中发送消息
    mServiceHandler.sendMessage(msg);
}
```

综上所述，您只需实现 `onHandleIntent()` 来完成客户端提供的工作即可。（不过，您还需要为服务提供小型构造函数。）

以下是 `IntentService` 的实现示例：

```java
public class HelloIntentService extends IntentService {

  /**
   * A constructor is required, and must call the super IntentService(String)
   * constructor with a name for the worker thread.
   */
  public HelloIntentService() {
      super("HelloIntentService");
  }

  /**
   * The IntentService calls this method from the default worker thread with
   * the intent that started the service. When this method returns, IntentService
   * stops the service, as appropriate.
   */
  @Override
  protected void onHandleIntent(Intent intent) {
      // Normally we would do some work here, like download a file.
      // For our sample, we just sleep for 5 seconds.
      try {
          Thread.sleep(5000);
      } catch (InterruptedException e) {
          // Restore interrupt status.
          Thread.currentThread().interrupt();
      }
  }
}
```

您只需要一个构造函数和一个 `onHandleIntent()` 实现即可。

如果您决定还重写其他回调方法（如 onCreate\(\)、onStartCommand\(\) 或 onDestroy\(\)），请确保调用超类实现，以便 `IntentService` 能够妥善处理工作线程的生命周期。

例如，`onStartCommand()`必须返回默认实现（即，如何将 `Intent` 传递给 `onHandleIntent()`）：

```java
@Override
public int onStartCommand(Intent intent, int flags, int startId) {
    Toast.makeText(this, "service starting", Toast.LENGTH_SHORT).show();
    return super.onStartCommand(intent,flags,startId);
}
```

除 `onHandleIntent()` 之外，您无需从中调用超类的唯一方法就是 `onBind()`（仅当服务允许绑定时，才需要实现该方法）。

在下一部分中，您将了解如何在扩展 `Service` 基类时实现同类服务。该基类包含更多代码，但如需同时处理多个启动请求，则更适合使用该基类。

### 扩展服务类

借助 [`IntentService`](https://developer.android.com/reference/android/app/IntentService)，您可以非常轻松地实现启动服务。但是，若要求服务执行多线程（而非通过工作队列处理启动请求），则可通过扩展 [`Service`](https://developer.android.com/reference/android/app/Service) 类来处理每个 Intent。

为进行比较，以下示例代码展示了 [`Service`](https://developer.android.com/reference/android/app/Service) 类的实现，该类执行的工作与上述使用 [`IntentService`](https://developer.android.com/reference/android/app/IntentService) 的示例完全相同。换言之，对于每个启动请求，其均使用工作线程来执行作业，且每次仅处理一个请求。

```java
public class HelloService extends Service {
  private Looper mServiceLooper;
  private ServiceHandler mServiceHandler;

  // Handler that receives messages from the thread
  private final class ServiceHandler extends Handler {
      public ServiceHandler(Looper looper) {
          super(looper);
      }
      @Override
      public void handleMessage(Message msg) {
          // Normally we would do some work here, like download a file.
          // For our sample, we just sleep for 5 seconds.
          try {
              Thread.sleep(5000);
          } catch (InterruptedException e) {
              // Restore interrupt status.
              Thread.currentThread().interrupt();
          }
          // Stop the service using the startId, so that we don't stop
          // the service in the middle of handling another job
          stopSelf(msg.arg1);
      }
  }

  @Override
  public void onCreate() {
    // Start up the thread running the service.  Note that we create a
    // separate thread because the service normally runs in the process's
    // main thread, which we don't want to block.  We also make it
    // background priority so CPU-intensive work will not disrupt our UI.
    HandlerThread thread = new HandlerThread("ServiceStartArguments",
            Process.THREAD_PRIORITY_BACKGROUND);
    thread.start();

    // Get the HandlerThread's Looper and use it for our Handler
    mServiceLooper = thread.getLooper();
    mServiceHandler = new ServiceHandler(mServiceLooper);
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
      Toast.makeText(this, "service starting", Toast.LENGTH_SHORT).show();

      // For each start request, send a message to start a job and deliver the
      // start ID so we know which request we're stopping when we finish the job
      Message msg = mServiceHandler.obtainMessage();
      msg.arg1 = startId;
      mServiceHandler.sendMessage(msg);

      // If we get killed, after returning from here, restart
      return START_STICKY;
  }

  @Override
  public IBinder onBind(Intent intent) {
      // We don't provide binding, so return null
      return null;
  }

  @Override
  public void onDestroy() {
    Toast.makeText(this, "service done", Toast.LENGTH_SHORT).show();
  }
}
```

正如您所见，与使用 IntentService 相比，这需要执行更多工作。

但是，因为是由您自己处理对 onStartCommand\(\) 的每个调用，因此可以同时执行多个请求。此示例并未这样做，但如果您希望如此，则可为每个请求创建一个新线程，然后立即运行这些线程（而不是等待上一个请求完成）。

请注意，onStartCommand\(\) 方法必须返回整型数。整型数是一个值，用于描述系统应该如何在服务终止的情况下继续运行服务（如上所述，IntentService 的默认实现将为您处理这种情况，不过您可以对其进行修改）。从 onStartCommand\(\) 返回的值必须是以下常量之一：

* START\_NOT\_STICKY

  如果系统在 onStartCommand\(\) 返回后终止服务，则除非有挂起 Intent 要传递，否则系统不会重建服务。这是最安全的选项，可以避免在不必要时以及应用能够轻松重启所有未完成的作业时运行服务。

* START\_STICKY

  如果系统在 onStartCommand\(\) 返回后终止服务，则会重建服务并调用 onStartCommand\(\)，但不会重新传递最后一个 Intent。相反，除非有挂起 Intent 要启动服务（在这种情况下，将传递这些 Intent ），否则系统会通过空 Intent 调用 onStartCommand\(\)。这适用于不执行命令、但无限期运行并等待作业的媒体播放器（或类似服务）。

* START\_REDELIVER\_INTENT

  如果系统在 onStartCommand\(\) 返回后终止服务，则会重建服务，并通过传递给服务的最后一个 Intent 调用 onStartCommand\(\)。任何挂起 Intent 均依次传递。这适用于主动执行应该立即恢复的作业（例如下载文件）的服务。

### 启动服务

您可以通过将 Intent（指定要启动的服务）传递给 startService\(\)，从 Activity 或其他应用组件启动服务。Android 系统调用服务的 onStartCommand\(\) 方法，并向其传递 Intent。（切勿直接调用 onStartCommand\(\)。）

例如，Activity 可以结合使用显式 Intent 与 startService\(\)，启动上文中的示例服务 \(HelloService\)：

```java
Intent intent = new Intent(this, HelloService.class);
startService(intent);
```

startService\(\) 方法将立即返回，且 Android 系统调用服务的 onStartCommand\(\) 方法。如果服务尚未运行，则系统会先调用 onCreate\(\)，然后再调用 onStartCommand\(\)。

如果服务亦未提供绑定，则使用 startService\(\) 传递的 Intent 是应用组件与服务之间唯一的通信模式。但是，如果您希望服务返回结果，则启动服务的客户端可以为广播创建一个 PendingIntent （使用 getBroadcast\(\)），并通过启动服务的 Intent 传递给服务。然后，服务就可以使用广播传递结果。

多个服务启动请求会导致多次对服务的 onStartCommand\(\) 进行相应的调用。但是，要停止服务，只需一个服务停止请求（使用 stopSelf\(\) 或 stopService\(\)）即可。

### 停止服务

启动服务必须管理自己的生命周期。也就是说，除非系统必须回收内存资源，否则系统不会停止或销毁服务，而且服务在 onStartCommand\(\) 返回后会继续运行。因此，服务必须通过调用 stopSelf\(\) 自行停止运行，或者由另一个组件通过调用 stopService\(\) 来停止它。

一旦请求使用 stopSelf\(\) 或 stopService\(\) 停止服务，系统就会尽快销毁服务。

但是，如果服务同时处理多个 onStartCommand\(\) 请求，则您不应在处理完一个启动请求之后停止服务，因为您可能已经收到了新的启动请求（在第一个请求结束时停止服务会终止第二个请求）。为了避免这一问题，您可以使用 stopSelf\(int\) 确保服务停止请求始终基于最近的启动请求。也就说，在调用 stopSelf\(int\) 时，传递与停止请求的 ID 对应的启动请求的 ID（传递给 onStartCommand\(\) 的 startId）。然后，如果在您能够调用 stopSelf\(int\) 之前服务收到了新的启动请求，ID 就不匹配，服务也就不会停止。

{% hint style="info" %}
注意：为了避免浪费系统资源和消耗电池电量，应用必须在工作完成之后停止其服务。 如有必要，其他组件可以通过调用 stopService\(\) 来停止服务。即使为服务启用了绑定，一旦服务收到对 onStartCommand\(\) 的调用，您始终仍须亲自停止服务。
{% endhint %}

## 创建绑定服务

绑定服务允许应用组件通过调用 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 与其绑定，从而创建长期连接。此服务通常不允许组件通过调用 [`startService()`](https://developer.android.com/reference/android/content/Context#startService%28android.content.Intent%29) 来_启动_它。

如需与 Activity 和其他应用组件中的服务进行交互，或需要通过进程间通信 \(IPC\) 向其他应用公开某些应用功能，则应创建绑定服务。

如要创建绑定服务，您需通过实现 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29) 回调方法返回 [`IBinder`](https://developer.android.com/reference/android/os/IBinder)，从而定义与服务进行通信的接口。然后，其他应用组件可通过调用 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 来检索该接口，并开始调用与服务相关的方法。服务只用于与其绑定的应用组件，因此若没有组件与该服务绑定，则系统会销毁该服务。您_不必_像通过 [`onStartCommand()`](https://developer.android.com/reference/android/app/Service#onStartCommand%28android.content.Intent,%20int,%20int%29) 启动的服务那样，以相同方式停止绑定服务。

如要创建绑定服务，您必须定义指定客户端如何与服务进行通信的接口。服务与客户端之间的这个接口必须是 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 的实现，并且服务必须从 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29) 回调方法返回该接口。收到 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 后，客户端便可开始通过该接口与服务进行交互。

多个客户端可以同时绑定到服务。完成与服务的交互后，客户端会通过调用 [`unbindService()`](https://developer.android.com/reference/android/content/Context#unbindService%28android.content.ServiceConnection%29) 来取消绑定。如果没有绑定到服务的客户端，则系统会销毁该服务。

实现绑定服务有多种方法，并且此实现比启动服务更为复杂。出于这些原因，请参阅另一份文档[绑定服务](https://developer.android.com/guide/components/bound-services)，了解关于绑定服务的详细介绍。

绑定服务是客户端-服务器接口中的服务器。绑定服务可让组件（例如 Activity）绑定到服务、发送请求、接收响应，甚至执行进程间通信 \(IPC\)。 绑定服务通常只在为其他应用组件服务时处于活动状态，不会无限期在后台运行。

## 向用户发送通知

处于运行状态时，服务可以使用 [Toast 通知](https://developer.android.com/guide/topics/ui/notifiers/toasts)或[状态栏通知](https://developer.android.com/guide/topics/ui/notifiers/notifications)来通知用户所发生的事件。

Toast 通知是指仅在当前窗口界面显示片刻的消息。状态栏通知在状态栏中提供内含消息的图标，用户可通过选择该图标来执行操作（例如启动 Activity）。

通常，当某些后台工作（例如文件下载）已经完成，并且用户可对其进行操作时，状态栏通知是最佳方法。当用户从展开视图中选定通知时，该通知即可启动 Activity（例如显示已下载的文件）。

如需了解详细信息，请参阅 [Toast 通知](https://developer.android.com/guide/topics/ui/notifiers/toasts)或[状态栏通知](https://developer.android.com/guide/topics/ui/notifiers/notifications)开发者指南。

## 在前台运行服务

前台服务是用户主动意识到的一种服务，因此在内存不足时，系统也不会考虑将其终止。前台服务必须为状态栏提供通知，将其放在_运行中的_标题下方。这意味着除非将服务停止或从前台移除，否则不能清除该通知。

{% hint style="info" %}
**注意：**请限制应用使用前台服务。

只有当应用执行的任务需供用户查看（即使该任务未直接与应用交互）时，您才应使用前台服务。因此，前台服务必须显示优先级为 [`PRIORITY_LOW`](https://developer.android.com/reference/androidx/core/app/NotificationCompat#PRIORITY_LOW) 或更高的[状态栏通知](https://developer.android.com/guide/topics/ui/notifiers/notifications)，这有助于确保用户知道应用正在执行的任务。如果某操作不是特别重要，因而您希望使用最低优先级通知，则可能不适合使用服务；相反，您可以考虑使用[计划作业](https://developer.android.com/topic/performance/scheduling)。

每个运行服务的应用都会给系统带来额外负担，从而消耗系统资源。如果应用尝试使用低优先级通知隐藏其服务，则可能会降低用户正在主动交互的应用的性能。因此，如果某个应用尝试运行拥有最低优先级通知的服务，则系统会在抽屉式通知栏的底部调用出该应用的行为。
{% endhint %}

例如，应将通过服务播放音乐的音乐播放器设置为在前台运行，因为用户会明确意识到其操作。状态栏中的通知可能表示正在播放的歌曲，并且其允许用户通过启动 Activity 与音乐播放器进行交互。同样，如果应用允许用户追踪其运行，则需通过前台服务来追踪用户的位置。

{% hint style="info" %}
**注意：**如果应用面向 Android 9（API 级别 28）或更高版本并使用前台服务，则其必须请求 [`FOREGROUND_SERVICE`](https://developer.android.com/reference/android/Manifest.permission#FOREGROUND_SERVICE) 权限。这是一种[普通权限](https://developer.android.com/guide/topics/permissions/overview#normal-dangerous)，因此，系统会自动为请求权限的应用授予此权限。

如果面向 API 级别 28 或更高版本的应用试图创建前台服务但未请求 `FOREGROUND_SERVICE`，则系统会抛出 [`SecurityException`](https://developer.android.com/reference/java/lang/SecurityException)。
{% endhint %}

如要请求让服务在前台运行，请调用 [`startForeground()`](https://developer.android.com/reference/android/app/Service#startForeground%28int,%20android.app.Notification%29)。此方法采用两个参数：唯一标识通知的整型数和用于状态栏的 [`Notification`](https://developer.android.com/reference/android/app/Notification)。此通知必须拥有 [`PRIORITY_LOW`](https://developer.android.com/reference/androidx/core/app/NotificationCompat#PRIORITY_LOW) 或更高的优先级。下面是示例：

```java
Intent notificationIntent = new Intent(this, ExampleActivity.class);
PendingIntent pendingIntent =
        PendingIntent.getActivity(this, 0, notificationIntent, 0);

Notification notification =
          new Notification.Builder(this, CHANNEL_DEFAULT_IMPORTANCE)
    .setContentTitle(getText(R.string.notification_title))
    .setContentText(getText(R.string.notification_message))
    .setSmallIcon(R.drawable.icon)
    .setContentIntent(pendingIntent)
    .setTicker(getText(R.string.ticker_text))
    .build();

startForeground(ONGOING_NOTIFICATION_ID, notification);
```

如要从前台移除服务，请调用 [`stopForeground()`](https://developer.android.com/reference/android/app/Service#stopForeground%28boolean%29)。此方法采用布尔值，指示是否需同时移除状态栏通知。此方法_不会_停止服务。但是，如果您在服务仍运行于前台时将其停止，则通知也会随之移除。

如需了解有关通知的详细信息，请参阅[创建状态栏通知](https://developer.android.com/guide/topics/ui/notifiers/notifications)。

## 管理服务的生命周期

服务的生命周期比 Activity 的生命周期要简单得多。但是，密切关注如何创建和销毁服务反而更加重要，因为服务可以在用户未意识到的情况下运行于后台。

服务生命周期（从创建到销毁）可遵循以下任一路径：

* 启动服务

  该服务在其他组件调用 [`startService()`](https://developer.android.com/reference/android/content/Context#startService%28android.content.Intent%29) 时创建，然后无限期运行，且必须通过调用 [`stopSelf()`](https://developer.android.com/reference/android/app/Service#stopSelf%28%29) 来自行停止运行。此外，其他组件也可通过调用 [`stopService()`](https://developer.android.com/reference/android/content/Context#stopService%28android.content.Intent%29) 来停止此服务。服务停止后，系统会将其销毁。

* 绑定服务

  该服务在其他组件（客户端）调用 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 时创建。然后，客户端通过 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 接口与服务进行通信。客户端可通过调用 [`unbindService()`](https://developer.android.com/reference/android/content/Context#unbindService%28android.content.ServiceConnection%29) 关闭连接。多个客户端可以绑定到相同服务，而且当所有绑定全部取消后，系统即会销毁该服务。（服务_不必_自行停止运行。）

这两条路径并非完全独立。您可以绑定到已使用 [`startService()`](https://developer.android.com/reference/android/content/Context#startService%28android.content.Intent%29) 启动的服务。例如，您可以使用 [`Intent`](https://developer.android.com/reference/android/content/Intent)（标识要播放的音乐）来调用 [`startService()`](https://developer.android.com/reference/android/content/Context#startService%28android.content.Intent%29)，从而启动后台音乐服务。随后，当用户需稍加控制播放器或获取有关当前所播放歌曲的信息时，Activity 可通过调用 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 绑定到服务。此类情况下，在所有客户端取消绑定之前，[`stopService()`](https://developer.android.com/reference/android/content/Context#stopService%28android.content.Intent%29) 或 [`stopSelf()`](https://developer.android.com/reference/android/app/Service#stopSelf%28%29) 实际不会停止服务。

### 实现生命周期回调

与 Activity 类似，服务也拥有生命周期回调方法，您可通过实现这些方法来监控服务状态的变化并适时执行工作。以下框架服务展示了每种生命周期方法：

```java
public class ExampleService extends Service {
    int startMode;       // indicates how to behave if the service is killed
    IBinder binder;      // interface for clients that bind
    boolean allowRebind; // indicates whether onRebind should be used

    @Override
    public void onCreate() {
        // The service is being created
    }
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // The service is starting, due to a call to startService()
        return mStartMode;
    }
    @Override
    public IBinder onBind(Intent intent) {
        // A client is binding to the service with bindService()
        return mBinder;
    }
    @Override
    public boolean onUnbind(Intent intent) {
        // All clients have unbound with unbindService()
        return mAllowRebind;
    }
    @Override
    public void onRebind(Intent intent) {
        // A client is binding to the service with bindService(),
        // after onUnbind() has already been called
    }
    @Override
    public void onDestroy() {
        // The service is no longer used and is being destroyed
    }
}
```

**注意：**与 Activity 生命周期回调方法不同，您_不_需要调用这些回调方法的超类实现。



图 2 展示服务的典型回调方法。尽管该图分开介绍通过 [`startService()`](https://developer.android.com/reference/android/content/Context#startService%28android.content.Intent%29) 创建的服务和通过 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 创建的服务，但请记住，无论启动方式如何，任何服务均有可能允许客户端与其绑定。因此，最初使用 [`onStartCommand()`](https://developer.android.com/reference/android/app/Service#onStartCommand%28android.content.Intent,%20int,%20int%29)（通过客户端调用 [`startService()`](https://developer.android.com/reference/android/content/Context#startService%28android.content.Intent%29)）启动的服务仍可接收对 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29) 的调用（当客户端调用 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 时）。

通过实现这些方法，您可以监控服务生命周期的以下两种嵌套循环：

* 服务的**整个生命周期**贯穿调用 [`onCreate()`](https://developer.android.com/reference/android/app/Service#onCreate%28%29) 和返回 [`onDestroy()`](https://developer.android.com/reference/android/app/Service#onDestroy%28%29) 之间的这段时间。与 Activity 类似，服务也在 [`onCreate()`](https://developer.android.com/reference/android/app/Service#onCreate%28%29) 中完成初始设置，并在 [`onDestroy()`](https://developer.android.com/reference/android/app/Service#onDestroy%28%29) 中释放所有剩余资源。例如，音乐播放服务可以在 [`onCreate()`](https://developer.android.com/reference/android/app/Service#onCreate%28%29) 中创建用于播放音乐的线程，然后在 [`onDestroy()`](https://developer.android.com/reference/android/app/Service#onDestroy%28%29) 中停止该线程。

{% hint style="info" %}
**注意**：无论所有服务是通过 [`startService()`](https://developer.android.com/reference/android/content/Context#startService%28android.content.Intent%29) 还是 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 创建，系统均会为其调用 [`onCreate()`](https://developer.android.com/reference/android/app/Service#onCreate%28%29) 和 [`onDestroy()`](https://developer.android.com/reference/android/app/Service#onDestroy%28%29) 方法。
{% endhint %}

* 服务的**活动生命周期**从调用 [`onStartCommand()`](https://developer.android.com/reference/android/app/Service#onStartCommand%28android.content.Intent,%20int,%20int%29) 或 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29) 开始。每种方法均会获得 [`Intent`](https://developer.android.com/reference/android/content/Intent) 对象，该对象会传递至 [`startService()`](https://developer.android.com/reference/android/content/Context#startService%28android.content.Intent%29) 或 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29)。

  对于启动服务，活动生命周期与整个生命周期会同时结束（即便是在 [`onStartCommand()`](https://developer.android.com/reference/android/app/Service#onStartCommand%28android.content.Intent,%20int,%20int%29) 返回之后，服务仍然处于活动状态）。对于绑定服务，活动生命周期会在 [`onUnbind()`](https://developer.android.com/reference/android/app/Service#onUnbind%28android.content.Intent%29) 返回时结束。

{% hint style="info" %}
**注意：**尽管您需通过调用 [`stopSelf()`](https://developer.android.com/reference/android/app/Service#stopSelf%28%29) 或 [`stopService()`](https://developer.android.com/reference/android/content/Context#stopService%28android.content.Intent%29) 来停止绑定服务，但该服务并没有相应的回调（没有 `onStop()` 回调）。除非服务绑定到客户端，否则在服务停止时，系统会将其销毁（[`onDestroy()`](https://developer.android.com/reference/android/app/Service#onDestroy%28%29) 是接收到的唯一回调）。
{% endhint %}

