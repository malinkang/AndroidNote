
# Android 接口定义语言 (AIDL)

**定义 AIDL 接口**

您必须使用 Java 编程语言语法在 .aidl 文件中定义 AIDL 接口，然后将它保存在托管服务的应用以及任何其他绑定到服务的应用的源代码（src/ 目录）内。

您开发每个包含 .aidl 文件的应用时，Android SDK 工具都会生成一个基于该 .aidl 文件的 IBinder 接口，并将其保存在项目的 gen/ 目录中。服务必须视情况实现 IBinder 接口。然后客户端应用便可绑定到该服务，并调用 IBinder 中的方法来执行 IPC。

如需使用 AIDL 创建绑定服务，请执行以下步骤：

* 创建 .aidl 文件 此文件定义带有方法签名的编程接口。
* 实现接口 Android SDK 工具基于您的 .aidl 文件，使用 Java 编程语言生成一个接口。此接口具有一个名为 Stub 的内部抽象类，用于扩展 Binder 类并实现 AIDL 接口中的方法。您必须扩展 Stub 类并实现方法。
* 向客户端公开该接口

  实现 Service 并重写 onBind\(\) 以返回 Stub 类的实现。

> 注意：在 AIDL 接口首次发布后对其进行的任何更改都必须保持向后兼容性，以避免中断其他应用对您的服务的使用。 也就是说，因为必须将您的 .aidl 文件复制到其他应用，才能让这些应用访问您的服务的接口，因此您必须保留对原始接口的支持。

1. 创建.aidl文件

AIDL 使用简单语法，使您能通过可带参数和返回值的一个或多个方法来声明接口。 参数和返回值可以是任意类型，甚至可以是其他 AIDL 生成的接口。

您必须使用 Java 编程语言构建 .aidl 文件。每个 .aidl 文件都必须定义单个接口，并且只需包含接口声明和方法签名。

默认情况下，AIDL 支持下列数据类型：

* Java 编程语言中的所有原语类型（如 int、long、char、boolean 等等）
* String
* CharSequence
* List

  List 中的所有元素都必须是以上列表中支持的数据类型、其他 AIDL 生成的接口或您声明的可打包类型。 可选择将 List 用作“通用”类（例如，List）。另一端实际接收的具体类始终是 ArrayList，但生成的方法使用的是 List 接口。

* Map

  Map 中的所有元素都必须是以上列表中支持的数据类型、其他 AIDL 生成的接口或您声明的可打包类型。 不支持通用 Map（如 Map 形式的 Map）。 另一端实际接收的具体类始终是 HashMap，但生成的方法使用的是 Map 接口。

您必须为以上未列出的每个附加类型加入一个 import 语句，即使这些类型是在与您的接口相同的软件包中定义。

定义服务接口时，请注意：

* 方法可带零个或多个参数，返回值或空值。
* 所有非原语参数都需要指示数据走向的方向标记。可以是 in、out 或 inout（见以下示例）。
* 原语默认为 in，不能是其他方向。

  > 注意：您应该将方向限定为真正需要的方向，因为编组参数的开销极大。

* .aidl 文件中包括的所有代码注释都包含在生成的 IBinder 接口中（import 和 package 语句之前的注释除外）
* 只支持方法；您不能公开 AIDL 中的静态字段。

以下是一个 .aidl 文件示例：

```java
// IRemoteService.aidl
package com.example.android;

// Declare any non-default types here with import statements

/** Example service interface */
interface IRemoteService {
    /** Request the process ID of this service, to do evil things with it. */
    int getPid();

    /** Demonstrates some basic types that you can use as parameters
     * and return values in AIDL.
     */
    void basicTypes(int anInt, long aLong, boolean aBoolean, float aFloat,
            double aDouble, String aString);
}
```

只需将您的 .aidl 文件保存在项目的 src/ 目录内，当您开发应用时，SDK 工具会在项目的 gen/ 目录中生成 IBinder 接口文件。生成的文件名与 .aidl 文件名一致，只是使用了 .java 扩展名（例如，IRemoteService.aidl 生成的文件名是 IRemoteService.java）。

如果您使用 Android Studio，增量编译几乎会立即生成 Binder 类。 如果您不使用 Android Studio，则 Gradle 工具会在您下一次开发应用时生成 Binder 类 — 您应该在编写完 .aidl 文件后立即用 gradle assembleDebug （或 gradle assembleRelease）编译项目，以便您的代码能够链接到生成的类。

1. 实现接口

当您开发应用时，Android SDK 工具会生成一个以 .aidl 文件命名的 .java 接口文件。生成的接口包括一个名为 Stub 的子类，这个子类是其父接口（例如，YourInterface.Stub）的抽象实现，用于声明 .aidl 文件中的所有方法。

注：Stub 还定义了几个帮助程序方法，其中最引人关注的是 asInterface\(\)，该方法带 IBinder（通常便是传递给客户端 onServiceConnected\(\) 回调方法的参数）并返回存根接口实例。 如需了解如何进行这种转换的更多详细信息，请参见调用 IPC 方法一节。

如需实现 .aidl 生成的接口，请扩展生成的 Binder 接口（例如，YourInterface.Stub）并实现从 .aidl 文件继承的方法。

以下是一个使用匿名实例实现名为 IRemoteService 的接口（由以上 IRemoteService.aidl 示例定义）的示例：

```java
private final IRemoteService.Stub mBinder = new IRemoteService.Stub() {
    public int getPid(){
        return Process.myPid();
    }
    public void basicTypes(int anInt, long aLong, boolean aBoolean,
        float aFloat, double aDouble, String aString) {
        // Does nothing
    }
};
```

现在，mBinder 是 Stub 类的一个实例（一个 Binder），用于定义服务的 RPC 接口。 在下一步中，将向客户端公开该实例，以便客户端能与服务进行交互。

在实现 AIDL 接口时应注意遵守以下这几个规则：

* 由于不能保证在主线程上执行传入调用，因此您一开始就需要做好多线程处理准备，并将您的服务正确地编译为线程安全服务。
* 默认情况下，RPC 调用是同步调用。如果您明知服务完成请求的时间不止几毫秒，就不应该从 Activity 的主线程调用服务，因为这样做可能会使应用挂起（Android 可能会显示“Application is Not Responding”对话框）— 您通常应该从客户端内的单独线程调用服务。
* 您引发的任何异常都不会回传给调用方。
* 向客户端公开该接口

您为服务实现该接口后，就需要向客户端公开该接口，以便客户端进行绑定。 要为您的服务公开该接口，请扩展 Service 并实现 onBind\(\)，以返回一个类实例，这个类实现了生成的 Stub（见前文所述）。以下是一个向客户端公开 IRemoteService 示例接口的服务示例。

```java
public class RemoteService extends Service {
    @Override
    public void onCreate() {
        super.onCreate();
    }

    @Override
    public IBinder onBind(Intent intent) {
        // Return the interface
        return mBinder;
    }

    private final IRemoteService.Stub mBinder = new IRemoteService.Stub() {
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

现在，当客户端（如 Activity）调用 bindService\(\) 以连接此服务时，客户端的 onServiceConnected\(\) 回调会接收服务的 onBind\(\) 方法返回的 mBinder 实例。

客户端还必须具有对 interface 类的访问权限，因此如果客户端和服务在不同的应用内，则客户端的应用 src/ 目录内必须包含 .aidl 文件（它生成 android.os.Binder 接口 — 为客户端提供对 AIDL 方法的访问权限）的副本。

。例如：

```java
IRemoteService mIRemoteService;
private ServiceConnection mConnection = new ServiceConnection() {
    // Called when the connection with the service is established
    public void onServiceConnected(ComponentName className, IBinder service) {
        // Following the example above for an AIDL interface,
        // this gets an instance of the IRemoteInterface, which we can use to call on the service
        mIRemoteService = IRemoteService.Stub.asInterface(service);
    }

    // Called when the connection with the service disconnects unexpectedly
    public void onServiceDisconnected(ComponentName className) {
        Log.e(TAG, "Service has unexpectedly disconnected");
        mIRemoteService = null;
    }
};
```

**通过 IPC 传递对象**

通过 IPC 接口把某个类从一个进程发送到另一个进程是可以实现的。 不过，您必须确保该类的代码对 IPC 通道的另一端可用，并且该类必须支持 Parcelable 接口。支持 Parcelable 接口很重要，因为 Android 系统可通过它将对象分解成可编组到各进程的原语。

如需创建支持 Parcelable 协议的类，您必须执行以下操作：

* 让您的类实现 Parcelable 接口。
* 实现 writeToParcel，它会获取对象的当前状态并将其写入 Parcel。
* 为您的类添加一个名为 CREATOR 的静态字段，这个字段是一个实现 Parcelable.Creator 接口的对象。
* 最后，创建一个声明可打包类的 .aidl 文件（按照下文 Rect.aidl 文件所示步骤）。

  如果您使用的是自定义编译进程，切勿在您的编译中添加 .aidl 文件。 此 .aidl 文件与 C 语言中的头文件类似，并未编译。

AIDL 在它生成的代码中使用这些方法和字段将您的对象编组和取消编组。

例如，以下这个 Rect.aidl 文件可创建一个可打包的 Rect 类：

```java
package android.graphics;

// Declare Rect so AIDL can find it and knows that it implements
// the parcelable protocol.
parcelable Rect;
```

以下示例展示了 Rect 类如何实现 Parcelable 协议。

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

    public void writeToParcel(Parcel out) {
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
}
```

Rect 类中的编组相当简单。看一看 Parcel 上的其他方法，了解您可以向 Parcel 写入哪些其他类型的值。

> 警告：别忘记从其他进程接收数据的安全影响。 在本例中，Rect 从 Parcel 读取四个数字，但要由您来确保无论调用方目的为何这些数字都在相应的可接受值范围内。 如需了解有关如何防止应用受到恶意软件侵害、保证应用安全的更多信息，请参见安全与权限。

**调用 IPC 方法**

调用类必须执行以下步骤，才能调用使用 AIDL 定义的远程接口：

1. 在项目 src/ 目录中加入 .aidl 文件。
2. 声明一个 IBinder 接口实例（基于 AIDL 生成）。
3. 实现 ServiceConnection。
4. 调用 Context.bindService\(\)，以传入您的 ServiceConnection 实现。
5. 在您的 onServiceConnected\(\) 实现中，您将收到一个 IBinder 实例（名为 service）。调用 YourInterfaceName.Stub.asInterface\(\(IBinder\)service\)，以将返回的参数转换为 YourInterface 类型。
6. 调用您在接口上定义的方法。您应该始终捕获 DeadObjectException 异常，它们是在连接中断时引发的；这将是远程方法引发的唯一异常。
7. 如需断开连接，请使用您的接口实例调用 Context.unbindService\(\)。

有关调用 IPC 服务的几点说明：

* 对象是跨进程计数的引用。
* 您可以将匿名对象作为方法参数发送。

### 绑定到服务

应用组件（客户端）可通过调用 bindService\(\) 绑定到服务。Android 系统随后调用服务的 onBind\(\) 方法，该方法返回用于与服务交互的 IBinder。

绑定是异步的。bindService\(\) 会立即返回，“不会”使 IBinder 返回客户端。要接收 IBinder，客户端必须创建一个 ServiceConnection 实例，并将其传递给 bindService\(\)。ServiceConnection 包括一个回调方法，系统通过调用它来传递 IBinder。

> 注：只有 Activity、服务和内容提供程序可以绑定到服务 — 您无法从广播接收器绑定到服务。

因此，要想从您的客户端绑定到服务，您必须：

1. 实现 ServiceConnection。 您的实现必须重写两个回调方法：
   * onServiceConnected\(\)

     系统会调用该方法以传递服务的 onBind\(\) 方法返回的 IBinder。

   * onServiceDisconnected\(\)

     Android 系统会在与服务的连接意外中断时（例如当服务崩溃或被终止时）调用该方法。当客户端取消绑定时，系统“不会”调用该方法。
2. 调用 bindService\(\)，传递 ServiceConnection 实现。
3. 当系统调用您的 onServiceConnected\(\) 回调方法时，您可以使用接口定义的方法开始调用服务。
4. 要断开与服务的连接，请调用 unbindService\(\)。

如果应用在客户端仍绑定到服务时销毁客户端，则销毁会导致客户端取消绑定。 更好的做法是在客户端与服务交互完成后立即取消绑定客户端。 这样可以关闭空闲服务。如需了解有关绑定和取消绑定的适当时机的详细信息，请参阅附加说明。

例如，以下代码段通过扩展 Binder 类将客户端与上面创建的服务相连，因此它只需将返回的 IBinder 转换为 LocalService 类并请求 LocalService 实例：

```java
LocalService mService;
private ServiceConnection mConnection = new ServiceConnection() {
    // Called when the connection with the service is established
    public void onServiceConnected(ComponentName className, IBinder service) {
        // Because we have bound to an explicit
        // service that is running in our own process, we can
        // cast its IBinder to a concrete class and directly access it.
        LocalBinder binder = (LocalBinder) service;
        mService = binder.getService();
        mBound = true;
    }

    // Called when the connection with the service disconnects unexpectedly
    public void onServiceDisconnected(ComponentName className) {
        Log.e(TAG, "onServiceDisconnected");
        mBound = false;
    }
};
```

客户端可通过将此 ServiceConnection 传递至 bindService\(\) 绑定到服务。例如：

```java
Intent intent = new Intent(this, LocalService.class);
bindService(intent, mConnection, Context.BIND_AUTO_CREATE);
```

* bindService\(\) 的第一个参数是一个 Intent，用于显式命名要绑定的服务（但 Intent 可能是隐式的）
* 第二个参数是 ServiceConnection 对象
* 第三个参数是一个指示绑定选项的标志。它通常应该是 BIND\_AUTO\_CREATE，以便创建尚未激活的服务。其他可能的值为 BIND\_DEBUG\_UNBIND 和 BIND\_NOT\_FOREGROUND，或 0（表示无）

### 附加说明

以下是一些有关绑定到服务的重要说明：

* 您应该始终捕获 DeadObjectException 异常，它们是在连接中断时引发的。这是远程方法引发的唯一异常。
* 对象是跨进程计数的引用。
* 您通常应该在客户端生命周期的匹配引入 \(bring-up\) 和退出 \(tear-down\) 时刻期间配对绑定和取消绑定。 例如：
  * 如果您只需要在 Activity 可见时与服务交互，则应在 onStart\(\) 期间绑定，在 onStop\(\) 期间取消绑定。
  * 如果您希望 Activity 在后台停止运行状态下仍可接收响应，则可在 onCreate\(\) 期间绑定，在 onDestroy\(\) 期间取消绑定。请注意，这意味着您的 Activity 在其整个运行过程中（甚至包括后台运行期间）都需要使用服务，因此如果服务位于其他进程内，那么当您提高该进程的权重时，系统终止该进程的可能性会增加。

    > 注：通常情况下，切勿在 Activity 的 onResume\(\) 和 onPause\(\) 期间绑定和取消绑定，因为每一次生命周期转换都会发生这些回调，您应该使发生在这些转换期间的处理保持在最低水平。此外，如果您的应用内的多个 Activity 绑定到同一服务，并且其中两个 Activity 之间发生了转换，则如果当前 Activity 在下一个 Activity 绑定（恢复期间）之前取消绑定（暂停期间），系统可能会销毁服务并重建服务。 （Activity文档中介绍了这种有关 Activity 如何协调其生命周期的 Activity 转换。）

## 

管理服务生命周期

服务的生命周期比 Activity 的生命周期要简单得多。但是，密切关注如何创建和销毁服务反而更加重要，因为服务可以在用户没有意识到的情况下运行于后台。

服务生命周期（从创建到销毁）可以遵循两条不同的路径：

* 启动服务

  该服务在其他组件调用 startService\(\) 时创建，然后无限期运行，且必须通过调用 stopSelf\(\) 来自行停止运行。此外，其他组件也可以通过调用 stopService\(\) 来停止服务。服务停止后，系统会将其销毁。

* 绑定服务

  该服务在另一个组件（客户端）调用 bindService\(\) 时创建。然后，客户端通过 IBinder 接口与服务进行通信。客户端可以通过调用 unbindService\(\) 关闭连接。多个客户端可以绑定到相同服务，而且当所有绑定全部取消后，系统即会销毁该服务。 （服务不必自行停止运行。）

这两条路径并非完全独立。也就是说，您可以绑定到已经使用 startService\(\) 启动的服务。例如，可以通过使用 Intent（标识要播放的音乐）调用 startService\(\) 来启动后台音乐服务。随后，可能在用户需要稍加控制播放器或获取有关当前播放歌曲的信息时，Activity 可以通过调用 bindService\(\) 绑定到服务。在这种情况下，除非所有客户端均取消绑定，否则 stopService\(\) 或 stopSelf\(\) 不会实际停止服务。

实现生命周期回调

与 Activity 类似，服务也拥有生命周期回调方法，您可以实现这些方法来监控服务状态的变化并适时执行工作。 以下框架服务展示了每种生命周期方法：

```java
public class ExampleService extends Service {
    int mStartMode;       // indicates how to behave if the service is killed
    IBinder mBinder;      // interface for clients that bind
    boolean mAllowRebind; // indicates whether onRebind should be used

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

> 注：与 Activity 生命周期回调方法不同，您不需要调用这些回调方法的超类实现。

![ &#x670D;&#x52A1;&#x751F;&#x547D;&#x5468;&#x671F;&#x3002;&#x5DE6;&#x56FE;&#x663E;&#x793A;&#x4E86;&#x4F7F;&#x7528; startService\(\) &#x6240;&#x521B;&#x5EFA;&#x7684;&#x670D;&#x52A1;&#x7684;&#x751F;&#x547D;&#x5468;&#x671F;&#xFF0C;&#x53F3;&#x56FE;&#x663E;&#x793A;&#x4E86;&#x4F7F;&#x7528; bindService\(\) &#x6240;&#x521B;&#x5EFA;&#x7684;&#x670D;&#x52A1;&#x7684;&#x751F;&#x547D;&#x5468;&#x671F;&#x3002;](../.gitbook/assets/service_lifecycle.png)

通过实现这些方法，您可以监控服务生命周期的两个嵌套循环：

* 服务的整个生命周期从调用 onCreate\(\) 开始起，到 onDestroy\(\) 返回时结束。与 Activity 类似，服务也在 onCreate\(\) 中完成初始设置，并在 onDestroy\(\) 中释放所有剩余资源。例如，音乐播放服务可以在 onCreate\(\) 中创建用于播放音乐的线程，然后在 onDestroy\(\) 中停止该线程。 无论服务是通过 startService\(\) 还是 bindService\(\) 创建，都会为所有服务调用 onCreate\(\) 和 onDestroy\(\) 方法。
* 服务的有效生命周期从调用 onStartCommand\(\) 或 onBind\(\) 方法开始。每种方法均有 {Intent 对象，该对象分别传递到 startService\(\) 或 bindService\(\)。 对于启动服务，有效生命周期与整个生命周期同时结束（即便是在 onStartCommand\(\) 返回之后，服务仍然处于活动状态）。对于绑定服务，有效生命周期在 onUnbind\(\) 返回时结束。

> 注：尽管启动服务是通过调用 stopSelf\(\) 或 stopService\(\) 来停止，但是该服务并无相应的回调（没有 onStop\(\) 回调）。因此，除非服务绑定到客户端，否则在服务停止时，系统会将其销毁 — onDestroy\(\) 是接收到的唯一回调。

上图说明了服务的典型回调方法。尽管该图分开介绍通过 startService\(\) 创建的服务和通过 bindService\(\) 创建的服务，但是请记住，不管启动方式如何，任何服务均有可能允许客户端与其绑定。因此，最初使用 onStartCommand\(\)（通过客户端调用 startService\(\)）启动的服务仍可接收对 onBind\(\) 的调用（当客户端调用 bindService\(\) 时）。

### 管理绑定服务的生命周期

当服务与所有客户端之间的绑定全部取消时，Android 系统便会销毁服务（除非还使用 onStartCommand\(\) 启动了该服务）。因此，如果您的服务是纯粹的绑定服务，则无需对其生命周期进行管理 — Android 系统会根据它是否绑定到任何客户端代您管理。

不过，如果您选择实现 onStartCommand\(\) 回调方法，则您必须显式停止服务，因为系统现在已将服务视为已启动。在此情况下，服务将一直运行到其通过 stopSelf\(\) 自行停止，或其他组件调用 stopService\(\) 为止，无论其是否绑定到任何客户端。

此外，如果您的服务已启动并接受绑定，则当系统调用您的 onUnbind\(\) 方法时，如果您想在客户端下一次绑定到服务时接收 onRebind\(\) 调用，则可选择返回 true。onRebind\(\) 返回空值，但客户端仍在其 onServiceConnected\(\) 回调中接收 IBinder。

![&#x5141;&#x8BB8;&#x7ED1;&#x5B9A;&#x7684;&#x5DF2;&#x542F;&#x52A8;&#x670D;&#x52A1;&#x7684;&#x751F;&#x547D;&#x5468;&#x671F;&#x3002;](../.gitbook/assets/service_binding_tree_lifecycle.png)

## Android 接口定义语言 \(AIDL\)

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