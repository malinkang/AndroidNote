

Android应用程序可以发送或接收来自Android系统和其他Android应用程序的广播消息，类似于发布 - 订阅设计模式。当感兴趣的事件发生时，这些广播被发送。例如，当各种系统事件发生时，例如系统启动或设备开始充电时，Android系统会发送广播。应用程序还可以发送自定义广播，例如，通知其他应用程序可能感兴趣的内容（例如，一些新数据已被下载）。

应用程序可以注册以接收特定广播。当发送广播时，系统自动将广播路由到已订阅接收该特定类型的广播的应用。

一般来说，广播可以用作跨应用程序和正常用户流之外的消息传递系统。但是，如下面的视频所述，您必须注意不要滥用机会来响应广播并在后台运行可能导致系统性能下降的作业。

<iframe width="470" height="264" src="https://www.youtube.com/embed/vBjTXKpaFj8" frameborder="0" allowfullscreen></iframe>


### 系统广播


当系统发生各种系统事件时，系统会自动发送广播，例如系统切换飞行模式时。系统广播将发送到订阅接收事件的所有应用程序。

广播消息本身被包装在Intent对象中，其动作字符串标识发生的事件（例如android.intent.action.AIRPLANE_MODE）。意图还可能包括捆绑到其额外字段中的附加信息。例如，飞行模式意图包括一个布尔值，表示飞行模式是否打开。

有关系统广播操作的完整列表，请参阅Android SDK中的BROADCAST_ACTIONS.TXT文件。每个广播动作具有与其相关联的常量字段。例如，常量ACTION_AIRPLANE_MODE_CHANGED的值是android.intent.action.AIRPLANE_MODE。每个广播动作的文档都可以在其关联的常量字段中使用。

#### 更改系统广播


Android 7.0及更高版本不再发送以下系统广播。此优化会影响所有应用，而不仅仅是针对Android 7.0的应用。

* ACTION_NEW_PICTURE
* ACTION_NEW_VIDEO


针对Android 7.0（API级别24）或更高版本的应用程序必须使用`registerReceiver（BroadcastReceiver，IntentFilter）`注册以下广播。在清单中声明接收器不起作用。

### 接受广播


应用程序可以通过两种方式接收广播：通过清单声明的接收器和上下文注册的接收器。


#### 清单声明的接收器

要在清单中声明广播接收者，请执行以下步骤：

1.在应用程序的清单中指定<receiver>元素。

```xml
<receiver android:name=".MyBroadcastReceiver"  android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED"/>
        <action android:name="android.intent.action.INPUT_METHOD_CHANGED" />
    </intent-filter>
</receiver>
```

2.创建BroadcastReceiver的子类并实现onReceive（Context，Intent）。以下示例中的广播接收器记录并显示广播的内容：

```java
public class MyBroadcastReceiver extends BroadcastReceiver {
    private static final String TAG = "MyBroadcastReceiver";
    @Override
    public void onReceive(Context context, Intent intent) {
        StringBuilder sb = new StringBuilder();
        sb.append("Action: " + intent.getAction() + "\n");
        sb.append("URI: " + intent.toUri(Intent.URI_INTENT_SCHEME).toString() + "\n");
        String log = sb.toString();
        Log.d(TAG, log);
        Toast.makeText(context, log, Toast.LENGTH_LONG).show();
    }
}
```


系统软件包管理器在安装应用程序时注册接收器。然后，接收器将成为您的应用程序的单独入口点，这意味着如果应用程序当前未运行，系统可以启动应用程序并传送广播。

该系统创建一个新的BroadcastReceiver组件对象来处理它接收的每个广播。此对象仅对调用onReceive（Context，Intent）的持续时间有效。一旦您的代码从此方法返回，系统将认为组件不再活动。


#### 上下文注册的接收器

要注册具有上下文的接收器，请执行以下步骤：

1.创建BroadcastReceiver的一个实例。

```java
BroadcastReceiver br = new MyBroadcastReceiver();
```
2.创建一个IntentFilter并通过调用registerReceiver（BroadcastReceiver，IntentFilter）来注册接收器：

```java
IntentFilter filter = new IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION);
intentFilter.addAction(Intent.ACTION_AIRPLANE_MODE_CHANGED);
this.registerReceiver(br, filter);
```

> 注意：要注册本地广播，请改用LocalBroadcastManager.registerReceiver（BroadcastReceiver，IntentFilter）

上下文注册的接收者只要其注册上下文有效就接收广播。例如，如果您在Activity上下文中注册，则只要Activity未被销毁，就会收到广播。如果您使用应用程序上下文注册，只要应用程序正在运行，您就可以收到广播。

3.要停止接收广播，请调用unregisterReceiver（android.content.BroadcastReceiver）。当您不再需要它或上下文不再有效时，请务必取消注册接收器。
注意在哪里注册和注销接收者，例如，如果您使用活动上下文在onCreate（Bundle）中注册接收者，则应该在onDestroy（）中注销它，以防止将接收者从活动上下文泄漏出来。如果你在onResume（）中注册一个接收器，你应该在onPause（）中取消注册，以防多次注册（如果你不想在暂停时收到广播，这样可以减少不必要的系统开销）。不要在onSaveInstanceState（Bundle）中注销，因为如果用户在历史堆栈中移回，则不会调用此方法。

#### 对过程状态的影响


BroadcastReceiver的状态（无论是否运行）会影响其包含进程的状态，从而影响系统被杀死的可能性。例如，当一个进程执行一个接收方（即当前在其onReceive（）方法中运行代码）时，它被认为是一个前台进程。系统保持进程运行，除非是极端的内存压力。

但是，一旦你的代码从onReceive（）返回，BroadcastReceiver就不再活动了。接收者的主机进程与其中运行的其他应用程序组件一样重要。如果该进程仅托管清单声明的接收者（用户从未或最近未与之交互的应用程序的常见情况），则在从onReceive（）返回时，系统将其进程视为低优先级进程，并且可能杀死它以使资源可用于其他更重要的进程。

因此，您不应该从广播接收器启动长时间运行的后台线程。在onReceive（）之后，系统可以随时杀死进程以回收内存，这样做会终止在进程中运行的生成的线程。为了避免这种情况，您应该调用goAsync（）（如果您需要更多的时间处理后台线程中的广播）或使用JobScheduler从接收方调度JobService，则系统会知道该进程继续执行工作。

以下片段显示了BroadcastReceiver，它使用goAsync（）来标记在onReceive（）完成后需要更多时间才能完成。如果您要在onReceive（）中完成的工作足够长，导致UI线程错过了一帧（> 16ms），使其更适合于后台线程，这将非常有用。

```java
public class MyBroadcastReceiver extends BroadcastReceiver {
    private static final String TAG = "MyBroadcastReceiver";

    @Override
    public void onReceive(final Context context, final Intent intent) {
        final PendingResult pendingResult = goAsync();
        AsyncTask<String, Integer, String> asyncTask = new AsyncTask<String, Integer, String>() {
            @Override
            protected String doInBackground(String... params) {
                StringBuilder sb = new StringBuilder();
                sb.append("Action: " + intent.getAction() + "\n");
                sb.append("URI: " + intent.toUri(Intent.URI_INTENT_SCHEME).toString() + "\n");
                Log.d(TAG, log);
                // Must call finish() so the BroadcastReceiver can be recycled.
                pendingResult.finish();
                return data;
            }
        };
        asyncTask.execute();
    }
}
```

### 发送广播


Android为应用发送广播提供了三种方式：

* sendOrderedBroadcast（Intent，String）方法一次向一个接收方发送广播。随着每个接收机依次执行，它可以将结果传播到下一个接收机，或者它可以完全中止广播，使其不会被传递到其他接收机。运行的订单接收器可以通过匹配的intent-filter的android：priority属性进行控制;具有相同优先级的接收器将以任意顺序运行。

* sendBroadcast（Intent）方法以未定义的顺序向所有接收者发送广播。这被称为普通广播。这更有效率，但是意味着接收机不能从其他接收机读取结果，传播从广播接收的数据，或者中止广播。

* LocalBroadcastManager.sendBroadcast方法将广播发送到与发送方相同的应用程序中的接收者。如果您不需要跨应用发送广播，请使用本地广播。实施效率更高（无需进行进程间通信），您无需担心与能够接收或发送广播的其他应用程序相关的任何安全问题。


以下代码片段演示了如何通过创建Intent并调用sendBroadcast（Intent）来发送广播。

```java
Intent intent = new Intent();
intent.setAction("com.example.broadcast.MY_NOTIFICATION");
intent.putExtra("data","Notice me senpai!");
sendBroadcast(intent);
```

广播消息包装在Intent对象中。意图的操作字符串必须提供应用程序的Java包名称语法，并唯一标识广播事件。您可以使用putExtra（String，Bundle）附加附加信息到意图。您也可以通过在意图上调用setPackage（String）来将广播限制在同一组织中的一组应用程序中。

>注意：虽然Intent用于发送广播和使用startActivity（Intent）启动Activity，但这些操作是完全不相关的。广播接收者无法查看或捕获用于开启Activity的意图;同样地，当您广播意图时，您无法找到或开启一个Activity。

### 限制使用权限的广播

权限允许您将广播限制到拥有某些权限的一组应用程序。您可以对广播的发送者或接收者强制执行限制。

#### 发送权限

当您调用sendBroadcast（Intent，String）或sendOrderedBroadcast（Intent，String，BroadcastReceiver，Handler，int，String，Bundle）时，可以指定权限参数。只有接收者已经通过标签在其清单中请求了该权限（并且随后被许可，如果它是危险的）可以接收广播。例如，以下代码发送广播：

```java
sendBroadcast(new Intent("com.example.NOTIFY"),Manifest.permission.SEND_SMS);
```

要接收广播，接收应用程序必须请求如下所示的权限：
```xml
<uses-permission android:name="android.permission.SEND_SMS"/>
```
您可以指定现有系统权限（如SEND_SMS）或使用<permission>自定义权限

>注意：安装应用程序时注册了自定义权限。定义自定义权限的应用程序必须在使用它的应用程序之前安装。

#### 接收权限

如果在注册广播接收器（或者通过registerReceiver（BroadcastReceiver，IntentFilter，String，Handler）或清单中的<receiver>标签）中指定权限参数时，则只有通过<uses-permission>标签在其清单中（并且随后被许可是危险的）可以向接收者发送意图。

例如，假设您的接收应用程序具有清单声明的接收器，如下所示：

```xml
<receiver android:name=".MyBroadcastReceiver"
          android:permission="android.permission.SEND_SMS">
    <intent-filter>
        <action android:name="android.intent.action.AIRPLANE_MODE"/>
    </intent-filter>
</receiver>
```

或者您的接收应用程序具有上下文注册的接收器，如下所示：

```java
IntentFilter filter = new IntentFilter(Intent.ACTION_AIRPLANE_MODE_CHANGED);
registerReceiver(receiver, filter, Manifest.permission.SEND_SMS, null );
```

然后，为了能够向这些接收者发送广播，发送应用程序必须如下所示请求许可：

```xml
<uses-permission android:name="android.permission.SEND_SMS"/>
```

### 安全考虑和最佳实践

以下是发送和接收广播的一些安全注意事项和最佳做法：

* 如果您不需要向应用程序之外的组件发送广播，则可以使用支持库中提供的LocalBroadcastManager发送和接收本地广播。 LocalBroadcastManager效率更高（不需要进程间通信），并允许您避免考虑与其他可以接收或发送广播的应用程序相关的任何安全问题。本地广播可以用作应用程序中的通用公用/子事件总线，而无需系统广播的任何开销。
* 如果许多应用程序已注册在其清单中接收相同的广播，则可能导致系统启动大量应用程序，从而对设备性能和用户体验造成重大影响。为避免这种情况，更喜欢在清单声明上使用上下文注册。有时，Android系统本身强制使用上下文注册的接收器。例如，CONNECTIVITY_ACTION广播仅传递给上下文注册的接收者。
* 不要使用隐含意图广播敏感信息。任何注册接收广播的应用都可以读取信息。有三种方式可以控制谁可以接收您的广播：
    * 您可以在发送广播时指定权限。
    * 在Android 4.0及更高版本中，您可以在发送广播时指定带有setPackage（String）的包。系统将广播限制为与包相匹配的一组应用程序。
    * 您可以使用LocalBroadcastManager发送本地广播。
* 当您注册接收者时，任何应用都可能会将恶意广播发送到您的应用的接收者。有三种方法限制您的应用收到的广播：
    * 注册广播接收者时可以指定一个权限。
    * 对于清单声明的接收器，您可以在清单中将android：exports属性设置为“false”。接收器不会从应用程序之外的来源接收广播。
    * 您可以将自己限制为仅使用LocalBroadcastManager的本地广播。
* 广播动作的命名空间是全局的。确保操作名称和其他字符串写在您拥有的命名空间中，否则您可能会无意中与其他应用程序冲突。
* 因为接收者的onReceive（Context，Intent）方法在主线程上运行，所以它应该执行并快速返回。如果您需要执行长时间运行的工作，请注意生成线程或启动后台服务，因为系统可以在onReceive（）返回后终止整个进程。有关详细信息，请参阅对进程状态的影响要执行长时间运行的工作，我们建议：
    * 在接收器的onReceive（）方法中调用goAsync（），并将BroadcastReceiver.PendingResult传递给后台线程。这样可以在从onReceive（）返回后保持广播有效。然而，即使使用这种方法，系统也希望您可以快速完成播放（10秒以下）。它允许您将工作移动到另一个线程，以避免毛刺主线程。
    * 使用JobScheduler计划作业。
* 不要从广播接收机开始活动，因为用户体验震惊;特别是如果有多个接收器。而应考虑显示通知。


