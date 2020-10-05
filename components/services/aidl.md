
# Android 接口定义语言 (AIDL)


Android 接口定义语言 \(AIDL\) 与您可能使用过的其他接口语言 \(IDL\) 类似。您可以利用它定义客户端与服务均认可的编程接口，以便二者使用进程间通信 \(IPC\) 进行相互通信。在 Android 中，一个进程通常无法访问另一个进程的内存。因此，为进行通信，进程需将其对象分解成可供操作系统理解的原语，并将其编组为可供您操作的对象。编写执行该编组操作的代码较为繁琐，因此 Android 会使用 AIDL 为您处理此问题。

{% hint style="info" %}
**注意：**只有在需要不同应用的客户端通过 IPC 方式访问服务，并且希望在服务中进行多线程处理时，您才有必要使用 AIDL。如果您无需跨不同应用执行并发 IPC，则应通过[实现 Binder](https://developer.android.com/guide/components/bound-services#Binder) 来创建接口；或者，如果您想执行 IPC，但_不_需要处理多线程，请[使用 Messenger ](https://developer.android.com/guide/components/bound-services#Messenger)来实现接口。无论如何，在实现 AIDL 之前，请您务必理解[绑定服务](https://developer.android.com/guide/components/bound-services)。
{% endhint %}



在开始设计 AIDL 接口之前，请注意，AIDL 接口的调用是直接函数调用。您无需对发生调用的线程做任何假设。实际情况的差异取决于调用是来自本地进程中的线程，还是远程进程中的线程。具体而言：

* 来自本地进程的调用在发起调用的同一线程内执行。如果该线程是您的主界面线程，则其将继续在 AIDL 接口中执行。如果该线程是其他线程，则其便是在服务中执行代码的线程。因此，只有在本地线程访问服务时，您才能完全控制哪些线程在服务中执行（但若出现此情况，您根本无需使用 AIDL，而应通过[实现 Binder 类](https://developer.android.com/guide/components/bound-services#Binder)来创建接口）。
* 远程进程的调用分派自线程池，且平台会在您自己的进程内部维护该线程池。您必须为来自未知线程，且多次调用同时发生的传入调用做好准备。换言之，AIDL 接口的实现必须基于完全的线程安全。如果调用来自同一远程对象上的某个线程，则该调用将**依次**抵达接收器端。
* `oneway` 关键字用于修改远程调用的行为。使用此关键字后，远程调用不会屏蔽，而只是发送事务数据并立即返回。最终接收该数据时，接口的实现会将其视为来自 [`Binder`](https://developer.android.com/reference/android/os/Binder) 线程池的常规调用（普通的远程调用）。如果 `oneway` 用于本地调用，则不会有任何影响，且调用仍为同步调用。

### 定义 AIDL 接口 <a id="Defining"></a>



您必须在 `.aidl` 文件中使用 Java 编程语言的语法定义 AIDL 接口，然后将其保存至应用的源代码（在 `src/` 目录中）内，这类应用会托管服务或与服务进行绑定。

在构建每个包含 `.aidl` 文件的应用时，Android SDK 工具会生成基于该 `.aidl` 文件的 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 接口，并将其保存到项目的 `gen/` 目录中。服务必须视情况实现 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 接口。然后，客户端应用便可绑定到该服务，并调用 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 中的方法来执行 IPC。

如要使用 AIDL 创建绑定服务，请执行以下步骤：

1. [创建 .aidl 文件](https://developer.android.com/guide/components/aidl#Create)

   此文件定义带有方法签名的编程接口。

2. [实现接口](https://developer.android.com/guide/components/aidl#ImplementTheInterface)

   Android SDK 工具会基于您的 `.aidl` 文件，使用 Java 编程语言生成接口。此接口拥有一个名为 `Stub` 的内部抽象类，用于扩展 [`Binder`](https://developer.android.com/reference/android/os/Binder) 类并实现 AIDL 接口中的方法。您必须扩展 `Stub` 类并实现这些方法。

3. [向客户端公开接口](https://developer.android.com/guide/components/aidl#ExposeTheInterface)

   实现 [`Service`](https://developer.android.com/reference/android/app/Service) 并重写 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29)，从而返回 `Stub` 类的实现。

{% hint style="info" %}
**注意：**如果您在首次发布 AIDL 接口后对其进行更改，则每次更改必须保持向后兼容性，以免中断其他应用使用您的服务。换言之，由于只有在将您的 `.aidl` 文件复制到其他应用后，才能使其访问服务接口，因而您必须保留对原始接口的支持。
{% endhint %}



#### 1. 创建 .aidl 文件 <a id="Create"></a>

AIDL 使用一种简单语法，允许您通过一个或多个方法（可接收参数和返回值）来声明接口。参数和返回值可为任意类型，甚至是 AIDL 生成的其他接口。

您必须使用 Java 编程语言构建 `.aidl` 文件。每个 `.aidl` 文件均须定义单个接口，并且只需要接口声明和方法签名。

默认情况下，AIDL 支持下列数据类型：

* Java 编程语言中的所有原语类型（如 `int`、`long`、`char`、`boolean` 等）
* [`String`](https://developer.android.com/reference/java/lang/String)
* [`CharSequence`](https://developer.android.com/reference/java/lang/CharSequence)
* [`List`](https://developer.android.com/reference/java/util/List)

  [`List`](https://developer.android.com/reference/java/util/List) 中的所有元素必须是以上列表中支持的数据类型，或者您所声明的由 AIDL 生成的其他接口或 Parcelable 类型。您可选择将 [`List`](https://developer.android.com/reference/java/util/List) 用作“泛型”类（例如，`List<String>`）。尽管生成的方法旨在使用 [`List`](https://developer.android.com/reference/java/util/List) 接口，但另一方实际接收的具体类始终是 [`ArrayList`](https://developer.android.com/reference/java/util/ArrayList)。

* [`Map`](https://developer.android.com/reference/java/util/Map)

  [`Map`](https://developer.android.com/reference/java/util/Map) 中的所有元素必须是以上列表中支持的数据类型，或者您所声明的由 AIDL 生成的其他接口或 Parcelable 类型。不支持泛型 Map（如 `Map<String,Integer>` 形式的 Map）。尽管生成的方法旨在使用 [`Map`](https://developer.android.com/reference/java/util/Map) 接口，但另一方实际接收的具体类始终是 [`HashMap`](https://developer.android.com/reference/java/util/HashMap)。

即使您在与接口相同的包内定义上方未列出的附加类型，亦须为其各自加入一条 `import` 语句。

定义服务接口时，请注意：

* 方法可带零个或多个参数，返回值或空值。
* 所有非原语参数均需要指示数据走向的方向标记。这类标记可以是 `in`、`out` 或 `inout`（见下方示例）。

  原语默认为 `in`，不能是其他方向。

{% hint style="info" %}
* **注意：**您应将方向限定为真正需要的方向，因为编组参数的开销较大。
{% endhint %}

* 生成的 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 接口内包含 `.aidl` 文件中的所有代码注释（import 和 package 语句之前的注释除外）。
* 您可以在 ADL 接口中定义 String 常量和 int 字符串常量。例如：`const int VERSION = 1;`。
* 方法调用由 [transact\(\) 代码](https://developer.android.com/reference/android/os/IBinder#transact%28int,%20android.os.Parcel,%20android.os.Parcel,%20int%29)分派，该代码通常基于接口中的方法索引。由于这会增加版本控制的难度，因此您可以向方法手动配置事务代码：`void method() = 10;`。
* 使用 `@nullable` 注释可空参数或返回类型。

以下是 `.aidl` 文件示例：

```java
// IRemoteService.aidl
package com.example.android

// Declare any non-default types here with import statements
/** Example service interface */
internal interface IRemoteService {
    /** Request the process ID of this service, to do evil things with it. */
    val pid:Int

    /** Demonstrates some basic types that you can use as parameters
     * and return values in AIDL.
     */
    fun basicTypes(anInt:Int, aLong:Long, aBoolean:Boolean, aFloat:Float,
                 aDouble:Double, aString:String)
}
```

您只需将 `.aidl` 文件保存至项目的 `src/` 目录内，这样在构建应用时，SDK 工具便会在项目的 `gen/` 目录中生成 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 接口文件。生成文件的名称与 `.aidl` 文件的名称保持一致，区别在于其使用 `.java` 扩展名（例如，`IRemoteService.aidl` 生成的文件名是 `IRemoteService.java`）。

如果您使用 Android Studio，增量构建几乎会立即生成 Binder 类。如果您不使用 Android Studio，则 Gradle 工具会在您下一次开发应用时生成 Binder 类。因此，在编写完 `.aidl` 文件后，您应立即使用 `gradle assembleDebug`（或 `gradle assembleRelease`）构建项目，以便您的代码能够链接到生成的类。

#### 2. 实现接口 <a id="Implement"></a>

当您构建应用时，Android SDK 工具会生成以 `.aidl` 文件命名的 `.java` 接口文件。生成的接口包含一个名为 `Stub` 的子类（例如，`YourInterface.Stub`），该子类是其父接口的抽象实现，并且会声明 `.aidl` 文件中的所有方法。

{% hint style="info" %}
**注意：**`Stub` 还会定义几个辅助方法，其中最值得注意的是 `asInterface()`，该方法会接收 [`IBinder`](https://developer.android.com/reference/android/os/IBinder)（通常是传递给客户端 [`onServiceConnected()`](https://developer.android.com/reference/android/content/ServiceConnection#onServiceConnected%28android.content.ComponentName,%20android.os.IBinder%29) 回调方法的参数），并返回 Stub 接口的实例。如需了解如何进行此转换的更多详情，请参阅[调用 IPC 方法](https://developer.android.com/guide/components/aidl#Calling)部分。
{% endhint %}

如要实现 `.aidl` 生成的接口，请扩展生成的 [`Binder`](https://developer.android.com/reference/android/os/Binder) 接口（例如，`YourInterface.Stub`），并实现继承自 `.aidl` 文件的方法。

以下示例展示使用匿名实例实现 `IRemoteService` 接口（由以上 `IRemoteService.aidl` 示例定义）的过程：  


```java
private final IRemoteService.Stub binder = new IRemoteService.Stub() {
    public int getPid(){
        return Process.myPid();
    }
    public void basicTypes(int anInt, long aLong, boolean aBoolean,
        float aFloat, double aDouble, String aString) {
        // Does nothing
    }
};
```

现在，`binder` 是 `Stub` 类的一个实例（一个 [`Binder`](https://developer.android.com/reference/android/os/Binder)），其定义了服务的远程过程调用 \(RPC\) 接口。在下一步中，我们会向客户端公开此实例，以便客户端能与服务进行交互。

在实现 AIDL 接口时，您应注意遵守以下规则：

* 由于无法保证在主线程上执行传入调用，因此您一开始便需做好多线程处理的准备，并对您的服务进行适当构建，使其达到线程安全的标准。
* 默认情况下，RPC 调用是同步调用。如果您知道服务完成请求的时间不止几毫秒，则不应从 Activity 的主线程调用该服务，因为这可能会使应用挂起（Android 可能会显示“Application is Not Responding”对话框）— 通常，您应从客户端内的单独线程调用服务。
* 您引发的任何异常都不会回传给调用方。

#### 3. 向客户端公开接口 <a id="Expose"></a>

在为服务实现接口后，您需要向客户端公开该接口，以便客户端进行绑定。如要为您的服务公开该接口，请扩展 [`Service`](https://developer.android.com/reference/android/app/Service) 并实现 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29)，从而返回实现生成的 `Stub` 的类实例（如前文所述）。以下是向客户端公开 `IRemoteService` 示例接口的服务示例。

```java
public class RemoteService extends Service {
    @Override
    public void onCreate() {
        super.onCreate();
    }

    @Override
    public IBinder onBind(Intent intent) {
        // Return the interface
        return binder;
    }

    private final IRemoteService.Stub binder = new IRemoteService.Stub() {
        public int getPid(){
            return Process.myPid();
        }
        public void basicTypes(int anInt, long aLong, boolean aBoolean,
            float aFloat, double aDouble, String aString) {
            // Does nothing
        }
    };
}
```

现在，当客户端（如 Activity）调用 [`bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29) 以连接此服务时，客户端的 [`onServiceConnected()`](https://developer.android.com/reference/android/content/ServiceConnection#onServiceConnected%28android.content.ComponentName,%20android.os.IBinder%29) 回调会接收服务的 [`onBind()`](https://developer.android.com/reference/android/app/Service#onBind%28android.content.Intent%29) 方法所返回的 `binder` 实例。

客户端还必须拥有接口类的访问权限，因此如果客户端和服务在不同应用内，则客户端应用的 `src/` 目录内必须包含 `.aidl` 文件（该文件会生成 `android.os.Binder` 接口，进而为客户端提供 AIDL 方法的访问权限）的副本。

当客户端在 [`onServiceConnected()`](https://developer.android.com/reference/android/content/ServiceConnection#onServiceConnected%28android.content.ComponentName,%20android.os.IBinder%29) 回调中收到 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 时，它必须调用 _`YourServiceInterface`_`.Stub.asInterface(service)`，以将返回的参数转换成 _`YourServiceInterface`_ 类型。例如：

```java
IRemoteService iRemoteService;
private ServiceConnection mConnection = new ServiceConnection() {
    // Called when the connection with the service is established
    public void onServiceConnected(ComponentName className, IBinder service) {
        // Following the example above for an AIDL interface,
        // this gets an instance of the IRemoteInterface, which we can use to call on the service
        iRemoteService = IRemoteService.Stub.asInterface(service);
    }

    // Called when the connection with the service disconnects unexpectedly
    public void onServiceDisconnected(ComponentName className) {
        Log.e(TAG, "Service has unexpectedly disconnected");
        iRemoteService = null;
    }
};
```

如需查看更多示例代码，请参阅 [ApiDemos](https://android.googlesource.com/platform/development/+/master/samples/ApiDemos) 中的 [`RemoteService.java`](https://android.googlesource.com/platform/development/+/master/samples/ApiDemos/src/com/example/android/apis/app/RemoteService.java) 类。

### 通过 IPC 传递对象

您可以通过 IPC 接口，将某个类从一个进程发送至另一个进程。不过，您必须确保 IPC 通道的另一端可使用该类的代码，并且该类必须支持 [`Parcelable`](https://developer.android.com/reference/android/os/Parcelable) 接口。支持 [`Parcelable`](https://developer.android.com/reference/android/os/Parcelable) 接口很重要，因为 Android 系统能通过该接口将对象分解成可编组至各进程的原语。

如要创建支持 [`Parcelable`](https://developer.android.com/reference/android/os/Parcelable) 协议的类，您必须执行以下操作：

1. 让您的类实现 [`Parcelable`](https://developer.android.com/reference/android/os/Parcelable) 接口。
2. 实现 [`writeToParcel`](https://developer.android.com/reference/android/os/Parcelable#writeToParcel%28android.os.Parcel,%20int%29)，它会获取对象的当前状态并将其写入 [`Parcel`](https://developer.android.com/reference/android/os/Parcel)。
3. 为您的类添加 `CREATOR` 静态字段，该字段是实现 [`Parcelable.Creator`](https://developer.android.com/reference/android/os/Parcelable.Creator) 接口的对象。
4. 最后，创建声明 Parcelable 类的 `.aidl` 文件（遵照下文 `Rect.aidl` 文件所示步骤）。

   如果您使用的是自定义编译进程，_请勿_在您的构建中添加 `.aidl` 文件。此 `.aidl` 文件与 C 语言中的头文件类似，并未经过编译。

AIDL 会在其生成的代码中使用这些方法和字段，以对您的对象进行编组和解编。

例如，下方的 `Rect.aidl` 文件可创建 Parcelable 类型的 `Rect` 类：

```java
package android.graphics;

// Declare Rect so AIDL can find it and knows that it implements
// the parcelable protocol.
parcelable Rect;
```

以下示例展示 [`Rect`](https://developer.android.com/reference/android/graphics/Rect) 类如何实现 [`Parcelable`](https://developer.android.com/reference/android/os/Parcelable) 协议。

```java
import android.os.Parcel;
import android.os.Parcelable;

public final class Rect implements Parcelable {
    public int left;
    public int top;
    public int right;
    public int bottom;

    public static final Parcelable.Creator<Rect> CREATOR = new Parcelable.Creator<Rect>() {
        public Rect createFromParcel(Parcel in) {
            return new Rect(in);
        }

        public Rect[] newArray(int size) {
            return new Rect[size];
        }
    };

    public Rect() {
    }

    private Rect(Parcel in) {
        readFromParcel(in);
    }

    public void writeToParcel(Parcel out, int flags) {
        out.writeInt(left);
        out.writeInt(top);
        out.writeInt(right);
        out.writeInt(bottom);
    }

    public void readFromParcel(Parcel in) {
        left = in.readInt();
        top = in.readInt();
        right = in.readInt();
        bottom = in.readInt();
    }

    public int describeContents() {
        return 0;
    }
}
```

`Rect` 类中的编组相当简单。请查看 [`Parcel`](https://developer.android.com/reference/android/os/Parcel) 的其他相关方法，了解您可以向 Parcel 写入哪些其他类型的值。  


{% hint style="info" %}
**警告：**请勿忘记从其他进程中接收数据的安全问题。在本例中，`Rect` 从 [`Parcel`](https://developer.android.com/reference/android/os/Parcel) 读取四个数字，但您需确保：无论调用方目的为何，这些数字均在可接受的值范围内。如需详细了解如何防止应用受到恶意软件侵害、保证应用安全，请参阅[安全与权限](https://developer.android.com/guide/topics/security/security)。
{% endhint %}

### 带软件包参数（包含 Parcelable 类型）的方法 <a id="Bundles"></a>

如果您的 AIDL 接口包含接收软件包作为参数（预计包含 Parcelable 类型）的方法，则在尝试从软件包读取之前，请务必通过调用 [`Bundle.setClassLoader(ClassLoader)`](https://developer.android.com/reference/android/os/Bundle?hl=en#setClassLoader%28java.lang.ClassLoader%29) 设置软件包的类加载器。否则，即使您在应用中正确定义 Parcelable 类型，也会遇到 [`ClassNotFoundException`](https://developer.android.com/reference/java/lang/ClassNotFoundException)。例如，

如果您有 `.aidl` 文件：

```java
// IRectInsideBundle.aidl
package com.example.android;

/** Example service interface */
interface IRectInsideBundle {
    /** Rect parcelable is stored in the bundle with key "rect" */
    void saveRect(in Bundle bundle);
}
```

如下方实现所示，在读取 `Rect` 之前，`ClassLoader` 已在 `Bundle` 中完成显式设置  


```java
private final IRectInsideBundle.Stub binder = new IRectInsideBundle.Stub() {
    public void saveRect(Bundle bundle){
        bundle.setClassLoader(getClass().getClassLoader());
        Rect rect = bundle.getParcelable("rect");
        process(rect); // Do more with the parcelable.
    }
};
```

### 调用 IPC 方法 <a id="Calling"></a>

如要调用通过 AIDL 定义的远程接口，调用类必须执行以下步骤：

1. 在项目的 `src/` 目录中加入 `.aidl` 文件。
2. 声明一个 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 接口实例（基于 AIDL 生成）。
3. 实现 [`ServiceConnection`](https://developer.android.com/reference/android/content/ServiceConnection)。
4. 调用 [`Context.bindService()`](https://developer.android.com/reference/android/content/Context#bindService%28android.content.Intent,%20android.content.ServiceConnection,%20int%29)，从而传入您的 [`ServiceConnection`](https://developer.android.com/reference/android/content/ServiceConnection) 实现。
5. 在 [`onServiceConnected()`](https://developer.android.com/reference/android/content/ServiceConnection#onServiceConnected%28android.content.ComponentName,%20android.os.IBinder%29) 实现中，您将收到一个 [`IBinder`](https://developer.android.com/reference/android/os/IBinder) 实例（名为 `service`）。调用 _`YourInterfaceName`_`.Stub.asInterface((IBinder)`_`service`_`)`，以将返回的参数转换为 _YourInterface_ 类型。
6. 调用您在接口上定义的方法。您应始终捕获 [`DeadObjectException`](https://developer.android.com/reference/android/os/DeadObjectException) 异常，系统会在连接中断时抛出此异常。您还应捕获 [`SecurityException`](https://developer.android.com/reference/java/lang/SecurityException) 异常，当 IPC 方法调用中两个进程的 AIDL 定义发生冲突时，系统会抛出此异常。
7. 如要断开连接，请使用您的接口实例调用 [`Context.unbindService()`](https://developer.android.com/reference/android/content/Context#unbindService%28android.content.ServiceConnection%29)。

有关调用 IPC 服务的几点说明：

* 对象是跨进程计数的引用。
* 您可以方法参数的形式发送匿名对象。

如需了解有关绑定服务的详细信息，请阅读[绑定服务](https://developer.android.com/guide/components/bound-services#Binding)文档。

以下示例代码摘自 ApiDemos 项目的远程服务示例，展示如何调用 AIDL 创建的服务。

```java
public static class Binding extends Activity {
    /** The primary interface we will be calling on the service. */
    IRemoteService mService = null;
    /** Another interface we use on the service. */
    ISecondary secondaryService = null;

    Button killButton;
    TextView callbackText;

    private InternalHandler handler;
    private boolean isBound;

    /**
     * Standard initialization of this activity.  Set up the UI, then wait
     * for the user to poke it before doing anything.
     */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.remote_service_binding);

        // Watch for button clicks.
        Button button = (Button)findViewById(R.id.bind);
        button.setOnClickListener(mBindListener);
        button = (Button)findViewById(R.id.unbind);
        button.setOnClickListener(unbindListener);
        killButton = (Button)findViewById(R.id.kill);
        killButton.setOnClickListener(killListener);
        killButton.setEnabled(false);

        callbackText = (TextView)findViewById(R.id.callback);
        callbackText.setText("Not attached.");
        handler = new InternalHandler(callbackText);
    }

    /**
     * Class for interacting with the main interface of the service.
     */
    private ServiceConnection mConnection = new ServiceConnection() {
        public void onServiceConnected(ComponentName className,
                IBinder service) {
            // This is called when the connection with the service has been
            // established, giving us the service object we can use to
            // interact with the service.  We are communicating with our
            // service through an IDL interface, so get a client-side
            // representation of that from the raw service object.
            mService = IRemoteService.Stub.asInterface(service);
            killButton.setEnabled(true);
            callbackText.setText("Attached.");

            // We want to monitor the service for as long as we are
            // connected to it.
            try {
                mService.registerCallback(mCallback);
            } catch (RemoteException e) {
                // In this case the service has crashed before we could even
                // do anything with it; we can count on soon being
                // disconnected (and then reconnected if it can be restarted)
                // so there is no need to do anything here.
            }

            // As part of the sample, tell the user what happened.
            Toast.makeText(Binding.this, R.string.remote_service_connected,
                    Toast.LENGTH_SHORT).show();
        }

        public void onServiceDisconnected(ComponentName className) {
            // This is called when the connection with the service has been
            // unexpectedly disconnected -- that is, its process crashed.
            mService = null;
            killButton.setEnabled(false);
            callbackText.setText("Disconnected.");

            // As part of the sample, tell the user what happened.
            Toast.makeText(Binding.this, R.string.remote_service_disconnected,
                    Toast.LENGTH_SHORT).show();
        }
    };

    /**
     * Class for interacting with the secondary interface of the service.
     */
    private ServiceConnection secondaryConnection = new ServiceConnection() {
        public void onServiceConnected(ComponentName className,
                IBinder service) {
            // Connecting to a secondary interface is the same as any
            // other interface.
            secondaryService = ISecondary.Stub.asInterface(service);
            killButton.setEnabled(true);
        }

        public void onServiceDisconnected(ComponentName className) {
            secondaryService = null;
            killButton.setEnabled(false);
        }
    };

    private OnClickListener mBindListener = new OnClickListener() {
        public void onClick(View v) {
            // Establish a couple connections with the service, binding
            // by interface names.  This allows other applications to be
            // installed that replace the remote service by implementing
            // the same interface.
            Intent intent = new Intent(Binding.this, RemoteService.class);
            intent.setAction(IRemoteService.class.getName());
            bindService(intent, mConnection, Context.BIND_AUTO_CREATE);
            intent.setAction(ISecondary.class.getName());
            bindService(intent, secondaryConnection, Context.BIND_AUTO_CREATE);
            isBound = true;
            callbackText.setText("Binding.");
        }
    };

    private OnClickListener unbindListener = new OnClickListener() {
        public void onClick(View v) {
            if (isBound) {
                // If we have received the service, and hence registered with
                // it, then now is the time to unregister.
                if (mService != null) {
                    try {
                        mService.unregisterCallback(mCallback);
                    } catch (RemoteException e) {
                        // There is nothing special we need to do if the service
                        // has crashed.
                    }
                }

                // Detach our existing connection.
                unbindService(mConnection);
                unbindService(secondaryConnection);
                killButton.setEnabled(false);
                isBound = false;
                callbackText.setText("Unbinding.");
            }
        }
    };

    private OnClickListener killListener = new OnClickListener() {
        public void onClick(View v) {
            // To kill the process hosting our service, we need to know its
            // PID.  Conveniently our service has a call that will return
            // to us that information.
            if (secondaryService != null) {
                try {
                    int pid = secondaryService.getPid();
                    // Note that, though this API allows us to request to
                    // kill any process based on its PID, the kernel will
                    // still impose standard restrictions on which PIDs you
                    // are actually able to kill.  Typically this means only
                    // the process running your application and any additional
                    // processes created by that app as shown here; packages
                    // sharing a common UID will also be able to kill each
                    // other's processes.
                    Process.killProcess(pid);
                    callbackText.setText("Killed service process.");
                } catch (RemoteException ex) {
                    // Recover gracefully from the process hosting the
                    // server dying.
                    // Just for purposes of the sample, put up a notification.
                    Toast.makeText(Binding.this,
                            R.string.remote_call_failed,
                            Toast.LENGTH_SHORT).show();
                }
            }
        }
    };

    // ----------------------------------------------------------------------
    // Code showing how to deal with callbacks.
    // ----------------------------------------------------------------------

    /**
     * This implementation is used to receive callbacks from the remote
     * service.
     */
    private IRemoteServiceCallback mCallback = new IRemoteServiceCallback.Stub() {
        /**
         * This is called by the remote service regularly to tell us about
         * new values.  Note that IPC calls are dispatched through a thread
         * pool running in each process, so the code executing here will
         * NOT be running in our main thread like most other things -- so,
         * to update the UI, we need to use a Handler to hop over there.
         */
        public void valueChanged(int value) {
            handler.sendMessage(handler.obtainMessage(BUMP_MSG, value, 0));
        }
    };

    private static final int BUMP_MSG = 1;

    private static class InternalHandler extends Handler {
        private final WeakReference<TextView> weakTextView;

        InternalHandler(TextView textView) {
            weakTextView = new WeakReference<>(textView);
        }

        @Override
        public void handleMessage(Message msg) {
            switch (msg.what) {
                case BUMP_MSG:
                    TextView textView = weakTextView.get();
                    if (textView != null) {
                        textView.setText("Received from service: " + msg.arg1);
                    }
                    break;
                default:
                    super.handleMessage(msg);
            }
        }
    }
}
```