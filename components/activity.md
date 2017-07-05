



Activity 是一个应用组件，用户可与其提供的屏幕进行交互，以执行拨打电话、拍摄照片、发送电子邮件或查看地图等操作。 每个 Activity 都会获得一个用于绘制其用户界面的窗口。窗口通常会充满屏幕，但也可小于屏幕并浮动在其他窗口之上。

一个应用通常由多个彼此松散联系的 Activity 组成。 一般会指定应用中的某个 Activity 为“主”Activity，即首次启动应用时呈现给用户的那个 Activity。 而且每个 Activity 均可启动另一个 Activity，以便执行不同的操作。 每次新 Activity 启动时，前一 Activity 便会停止，但系统会在堆栈（“返回栈”）中保留该 Activity。 当新 Activity 启动时，系统会将其推送到返回栈上，并取得用户焦点。 返回栈遵循基本的“后进先出”堆栈机制，因此，当用户完成当前 Activity 并按“返回”按钮时，系统会从堆栈中将其弹出（并销毁），然后恢复前一 Activity。 

当一个 Activity 因某个新 Activity 启动而停止时，系统会通过该 Activity 的生命周期回调方法通知其这一状态变化。Activity 因状态变化—系统是创建 Activity、停止 Activity、恢复 Activity 还是销毁 Activity— 而收到的回调方法可能有若干种，每一种回调都会为您提供执行与该状态变化相应的特定操作的机会。 例如，停止时，您的 Activity 应释放任何大型对象，例如网络或数据库连接。 当 Activity 恢复时，您可以重新获取所需资源，并恢复执行中断的操作。 这些状态转变都是 Activity 生命周期的一部分。


### 1. 创建 Activity

要创建 Activity，您必须创建 Activity 的子类（或使用其现有子类）。您需要在子类中实现 Activity 在其生命周期的各种状态之间转变时（例如创建 Activity、停止 Activity、恢复 Activity 或销毁 Activity 时）系统调用的回调方法。 两个最重要的回调方法是：

* onCreate()

您必须实现此方法。系统会在创建您的 Activity 时调用此方法。您应该在实现内初始化 Activity 的必需组件。 最重要的是，您必须在此方法内调用 setContentView()，以定义 Activity 用户界面的布局。

* onPause()

系统将此方法作为用户离开 Activity 的第一个信号（但并不总是意味着 Activity 会被销毁）进行调用。 您通常应该在此方法内确认在当前用户会话结束后仍然有效的任何更改（因为用户可能不会返回）。
您还应使用几种其他生命周期回调方法，以便提供流畅的 Activity 间用户体验，以及处理导致您的 Activity 停止甚至被销毁的意外中断。


#### 1.1 实现用户界面

Activity 的用户界面是由层级式视图 — 衍生自 View 类的对象 — 提供的。每个视图都控制 Activity 窗口内的特定矩形空间，可对用户交互作出响应。 例如，视图可以是在用户触摸时启动某项操作的按钮。

您可以利用 Android 提供的许多现成视图设计和组织您的布局。“小部件”是提供按钮、文本字段、复选框或仅仅是一幅图像等屏幕视觉（交互式）元素的视图。 “布局”是衍生自 ViewGroup 的视图，为其子视图提供唯一布局模型，例如线性布局、网格布局或相对布局。 您还可以为 View 类和 ViewGroup 类创建子类（或使用其现有子类）来自行创建小部件和布局，然后将它们应用于您的 Activity 布局。

利用视图定义布局的最常见方法是借助保存在您的应用资源内的 XML 布局文件。这样一来，您就可以将用户界面的设计与定义 Activity 行为的源代码分开维护。 您可以通过 setContentView() 将布局设置为 Activity 的 UI，从而传递布局的资源 ID。不过，您也可以在 Activity 代码中创建新 View，并通过将新 View 插入 ViewGroup 来创建视图层次，然后通过将根 ViewGroup 传递到 setContentView() 来使用该布局。


#### 1.2 在清单文件中声明 Activity
您必须在清单文件中声明您的 Activity，这样系统才能访问它。 要声明您的 Activity，请打开您的清单文件，并将 <activity> 元素添加为 <application> 元素的子项。例如：
```xml
<manifest ... >
  <application ... >
      <activity android:name=".ExampleActivity" />
      ...
  </application ... >
  ...
</manifest >
```
您还可以在此元素中加入几个其他特性，以定义 Activity 标签、Activity 图标或风格主题等用于设置 Activity UI 风格的属性。 android:name 属性是唯一必需的属性—它指定 Activity 的类名。应用一旦发布，即不应更改此类名，否则，可能会破坏诸如应用快捷方式等一些功能。

请参阅 <activity> 元素参考文档，了解有关在清单文件中声明 Activity 的详细信息。

##### 使用 Intent 过滤器

<activity> 元素还可指定各种 Intent 过滤器—使用 <intent-filter> 元素—以声明其他应用组件激活它的方法。

当您使用 Android SDK 工具创建新应用时，系统自动为您创建的存根 Activity 包含一个 Intent 过滤器，其中声明了该 Activity 响应“主”操作且应置于“launcher”类别内。 Intent 过滤器的内容如下所示：
```xml
<activity android:name=".ExampleActivity" android:icon="@drawable/app_icon">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
</activity>
<action> 
```
元素指定这是应用的“主”入口点。<category> 元素指定此 Activity 应列入系统的应用启动器内（以便用户启动该 Activity）。

如果您打算让应用成为独立应用，不允许其他应用激活其 Activity，则您不需要任何其他 Intent 过滤器。 正如前例所示，只应有一个 Activity 具有“主”操作和“launcher”类别。 您不想提供给其他应用的 Activity 不应有任何 Intent 过滤器，您可以利用显式 Intent 自行启动它们（下文对此做了阐述）。

不过，如果您想让 Activity 对衍生自其他应用（以及您的自有应用）的隐式 Intent 作出响应，则必须为 Activity 定义其他 Intent 过滤器。 对于您想要作出响应的每一个 Intent 类型，您都必须加入相应的 <intent-filter>，其中包括一个 <action> 元素，还可选择性地包括一个 <category> 元素和/或一个 <data> 元素。这些元素指定您的 Activity 可以响应的 Intent 类型。

如需了解有关您的 Activity 如何响应 Intent 的详细信息，请参阅 Intent 和 Intent 过滤器文档。

### 2. 启动 Activity

您可以通过调用 startActivity()，并将其传递给描述您想启动的 Activity 的 Intent 来启动另一个 Activity。Intent 对象会指定您想启动的具体 Activity 或描述您想执行的操作类型（系统会为您选择合适的 Activity，甚至是来自其他应用的 Activity）。 Intent 对象还可能携带少量供所启动 Activity 使用的数据。

在您的自有应用内工作时，您经常只需要启动某个已知 Activity。 您可以通过使用类名创建一个显式定义您想启动的 Activity 的 Intent 对象来实现此目的。 例如，可以通过以下代码让一个 Activity 启动另一个名为 SignInActivity 的 Activity：
```java
Intent intent = new Intent(this, SignInActivity.class);
startActivity(intent);
```
不过，您的应用可能还需要利用您的 Activity 数据执行某项操作，例如发送电子邮件、短信或状态更新。 在这种情况下，您的应用自身可能不具有执行此类操作所需的 Activity，因此您可以改为利用设备上其他应用提供的 Activity 为您执行这些操作。 这便是 Intent 对象的真正价值所在 — 您可以创建一个 Intent 对象，对您想执行的操作进行描述，系统会从其他应用启动相应的 Activity。 如果有多个 Activity 可以处理 Intent，则用户可以选择要使用哪一个。 例如，如果您想允许用户发送电子邮件，可以创建以下 Intent：
```java
Intent intent = new Intent(Intent.ACTION_SEND);
intent.putExtra(Intent.EXTRA_EMAIL, recipientArray);
startActivity(intent);
```
添加到 Intent 中的 EXTRA_EMAIL extra 是一个字符串数组，其中包含应将电子邮件发送到的电子邮件地址。 当电子邮件应用响应此 Intent 时，它会读取 extra 中提供的字符串数组，并将它们放入电子邮件撰写窗体的“收件人”字段。 在这种情况下，电子邮件应用的 Activity 启动，并且当用户完成操作时，您的 Activity 会恢复执行。

#### 启动 Activity 以获得结果

有时，您可能需要从启动的 Activity 获得结果。在这种情况下，请通过调用 startActivityForResult()（而非 startActivity()）来启动 Activity。 要想在随后收到后续 Activity 的结果，请实现 onActivityResult() 回调方法。 当后续 Activity 完成时，它会使用 Intent 向您的 onActivityResult() 方法返回结果。

例如，您可能希望用户选取其中一位联系人，以便您的 Activity 对该联系人中的信息执行某项操作。 您可以通过以下代码创建此类 Intent 并处理结果：
```java
private void pickContact() {
    // Create an intent to "pick" a contact, as defined by the content provider URI
    Intent intent = new Intent(Intent.ACTION_PICK, Contacts.CONTENT_URI);
    startActivityForResult(intent, PICK_CONTACT_REQUEST);
}

@Override
protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    // If the request went well (OK) and the request was PICK_CONTACT_REQUEST
    if (resultCode == Activity.RESULT_OK && requestCode == PICK_CONTACT_REQUEST) {
        // Perform a query to the contact's content provider for the contact's name
        Cursor cursor = getContentResolver().query(data.getData(),
        new String[] {Contacts.DISPLAY_NAME}, null, null, null);
        if (cursor.moveToFirst()) { // True if the cursor is not empty
            int columnIndex = cursor.getColumnIndex(Contacts.DISPLAY_NAME);
            String name = cursor.getString(columnIndex);
            // Do something with the selected contact's name...
        }
    }
}
```
上例显示的是，您在处理 Activity 结果时应该在 onActivityResult() 方法中使用的基本逻辑。 第一个条件检查请求是否成功（如果成功，则resultCode 将为 RESULT_OK）以及此结果响应的请求是否已知 — 在此情况下，requestCode与随 startActivityForResult() 发送的第二个参数匹配。 代码通过查询 Intent 中返回的数据（data 参数）从该处开始处理 Activity 结果。

实际情况是，ContentResolver 对一个内容提供程序执行查询，后者返回一个 Cursor，让查询的数据能够被读取。如需了解详细信息，请参阅内容提供程序文档。

如需了解有关 Intent 用法的详细信息，请参阅 Intent 和 Intent 过滤器文档。

### 3. 结束 Activity
您可以通过调用 Activity 的 finish() 方法来结束该 Activity。您还可以通过调用 finishActivity() 结束您之前启动的另一个 Activity。

注：在大多数情况下，您不应使用这些方法显式结束 Activity。 正如下文有关 Activity 生命周期的部分所述，Android 系统会为您管理 Activity 的生命周期，因此您无需结束自己的 Activity。 调用这些方法可能对预期的用户体验产生不良影响，因此只应在您确实不想让用户返回此 Activity 实例时使用。

### 4. 管理 Activity 生命周期

通过实现回调方法管理 Activity 的生命周期对开发强大而又灵活的应用至关重要。 Activity 的生命周期会直接受到 Activity 与其他 Activity、其任务及返回栈的关联性的影响。

Activity 基本上以三种状态存在：

* 继续：此 Activity 位于屏幕前台并具有用户焦点。（有时也将此状态称作“运行中”。）

* 暂停：另一个 Activity 位于屏幕前台并具有用户焦点，但此 Activity 仍可见。也就是说，另一个 Activity 显示在此 Activity 上方，并且该 Activity 部分透明或未覆盖整个屏幕。 暂停的 Activity 处于完全活动状态（Activity 对象保留在内存中，它保留了所有状态和成员信息，并与窗口管理器保持连接），但在内存极度不足的情况下，可能会被系统终止。

* 停止：该 Activity 被另一个 Activity 完全遮盖（该 Activity 目前位于“后台”）。 已停止的 Activity 同样仍处于活动状态（Activity 对象保留在内存中，它保留了所有状态和成员信息，但未与窗口管理器连接）。 不过，它对用户不再可见，在他处需要内存时可能会被系统终止。
如果 Activity 处于暂停或停止状态，系统可通过要求其结束（调用其 finish() 方法）或直接终止其进程，将其从内存中删除。（将其结束或终止后）再次打开 Activity 时，必须重建。

#### 4.1 实现生命周期回调

当一个 Activity 转入和转出上述不同状态时，系统会通过各种回调方法向其发出通知。 所有回调方法都是挂钩，您可以在 Activity 状态发生变化时替代这些挂钩来执行相应操作。 以下框架 Activity 包括每一个基本生命周期方法：
```java
public class ExampleActivity extends Activity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // The activity is being created.
    }
    @Override
    protected void onStart() {
        super.onStart();
        // The activity is about to become visible.
    }
    @Override
    protected void onResume() {
        super.onResume();
        // The activity has become visible (it is now "resumed").
    }
    @Override
    protected void onPause() {
        super.onPause();
        // Another activity is taking focus (this activity is about to be "paused").
    }
    @Override
    protected void onStop() {
        super.onStop();
        // The activity is no longer visible (it is now "stopped")
    }
    @Override
    protected void onDestroy() {
        super.onDestroy();
        // The activity is about to be destroyed.
    }
}
```

>注：正如以上示例所示，您在实现这些生命周期方法时必须始终先调用超类实现，然后再执行任何操作。

这些方法共同定义 Activity 的整个生命周期。您可以通过实现这些方法监控 Activity 生命周期中的三个嵌套循环：

* Activity 的**整个生命周期**发生在 onCreate() 调用与 onDestroy() 调用之间。您的 Activity 应在 onCreate() 中执行“全局”状态设置（例如定义布局），并释放 onDestroy() 中的所有其余资源。例如，如果您的 Activity 有一个在后台运行的线程，用于从网络上下载数据，它可能会在 onCreate() 中创建该线程，然后在 onDestroy() 中停止该线程。

* Activity 的**可见生命周期**发生在 onStart() 调用与 onStop() 调用之间。在这段时间，用户可以在屏幕上看到 Activity 并与其交互。 例如，当一个新 Activity 启动，并且此 Activity 不再可见时，系统会调用 onStop()。您可以在调用这两个方法之间保留向用户显示 Activity 所需的资源。 例如，您可以在 onStart() 中注册一个 BroadcastReceiver 以监控影响 UI 的变化，并在用户无法再看到您显示的内容时在 onStop() 中将其取消注册。在 Activity 的整个生命周期，当 Activity 在对用户可见和隐藏两种状态中交替变化时，系统可能会多次调用 onStart() 和 onStop()。

* Activity 的**前台生命周期**发生在 onResume() 调用与 onPause() 调用之间。在这段时间，Activity 位于屏幕上的所有其他 Activity 之前，并具有用户输入焦点。 Activity 可频繁转入和转出前台 — 例如，当设备转入休眠状态或出现对话框时，系统会调用 onPause()。 由于此状态可能经常发生转变，因此这两个方法中应采用适度轻量级的代码，以避免因转变速度慢而让用户等待。

图 1 说明了这些循环以及 Activity 在状态转变期间可能经过的路径。矩形表示回调方法，当 Activity 在不同状态之间转变时，您可以实现这些方法来执行操作。

![图 1. Activity 生命周期。](/assets/images/activity_lifecycle.png)



表 1 列出了相同的生命周期回调方法，其中对每一种回调方法做了更详细的描述，并说明了每一种方法在 Activity 整个生命周期内的位置，包括在回调方法完成后系统能否终止 Activity。

表 1. Activity 生命周期回调方法汇总表。

|  方法  | 说明  |  是否能事后终止？ |  后接 |
|---|---|---|---|
| onCreate() | 首次创建 Activity 时调用。 您应该在此方法中执行所有正常的静态设置 — 创建视图、将数据绑定到列表等等。 系统向此方法传递一个 Bundle 对象，其中包含 Activity 的上一状态，不过前提是捕获了该状态。始终后接 onStart()。 |  否 |    onStart()  |
| onRestart()  |   在 Activity 已停止并即将再次启动前调用。始终后接 onStart()  |  否  |   onStart()  |
|onStart()    | 在 Activity 即将对用户可见之前调用。如果 Activity 转入前台，则后接 onResume()，{% em type="red" %}如果 Activity 转入隐藏状态，则后接 onStop()。{% endem %}  |否   | onResume()或onStop() |
| onResume()  |   在 Activity 即将开始与用户进行交互之前调用。 此时，Activity 处于 Activity 堆栈的顶层，并具有用户输入焦点。始终后接 onPause()。 |  否  |  onPause() |
|  onPause()  | 当系统即将开始继续另一个 Activity 时调用。 此方法通常用于确认对持久性数据的未保存更改、停止动画以及其他可能消耗 CPU 的内容，诸如此类。 它应该非常迅速地执行所需操作，因为它返回后，下一个 Activity 才能继续执行。如果 Activity 返回前台，则后接 onResume()，如果 Activity 转入对用户不可见状态，则后接 onStop()。  | 是  | onResume() 或onStop()  |
| onStop()   |  在 Activity 对用户不再可见时调用。如果 Activity 被销毁，或另一个 Activity（一个现有 Activity 或新 Activity）继续执行并将其覆盖，就可能发生这种情况。如果 Activity 恢复与用户的交互，则后接 onRestart()，如果 Activity 被销毁，则后接 onDestroy()。 | 是  |  onRestart()或onDestroy() |
|  onDestroy()  | 在 Activity 被销毁前调用。这是 Activity 将收到的最后调用。 当 Activity 结束（有人对 Activity 调用了 finish()），或系统为节省空间而暂时销毁该 Activity 实例时，可能会调用它。 您可以通过 isFinishing() 方法区分这两种情形。 | 是  |  无 |

名为“是否能事后终止？”的列表示系统是否能在不执行另一行 Activity 代码的情况下，在方法返回后随时终止承载 Activity 的进程。 有三个方法带有“是”标记：(onPause()、onStop() 和 onDestroy())。由于 onPause() 是这三个方法中的第一个，因此 Activity 创建后，onPause() 必定成为最后调用的方法，然后才能终止进程 — 如果系统在紧急情况下必须恢复内存，则可能不会调用 onStop() 和 onDestroy()。因此，您应该使用 onPause() 向存储设备写入至关重要的持久性数据（例如用户编辑）。不过，您应该对 onPause() 调用期间必须保留的信息有所选择，因为该方法中的任何阻止过程都会妨碍向下一个 Activity 的转变并拖慢用户体验。

在是否能在事后终止？列中标记为“否”的方法可从系统调用它们的一刻起防止承载 Activity 的进程被终止。 因此，在从 onPause() 返回的时间到 onResume() 被调用的时间，系统可以终止 Activity。在 onPause() 被再次调用并返回前，将无法再次终止 Activity。

>注：根据表 1 中的定义属于技术上无法“终止”的 Activity 仍可能被系统终止 — 但这种情况只有在无任何其他资源的极端情况下才会发生。进程和线程处理文档对可能会终止 Activity 的情况做了更详尽的阐述。

#### 4.2 保存 Activity 状态
当 Activity 暂停或停止时，Activity 的状态会得到保留。 确实如此，因为当 Activity 暂停或停止时，Activity 对象仍保留在内存中 — 有关其成员和当前状态的所有信息仍处于活动状态。 因此，用户在 Activity 内所做的任何更改都会得到保留，这样一来，当 Activity 返回前台（当它“继续”）时，这些更改仍然存在。

不过，当系统为了恢复内存而销毁某项 Activity 时，Activity 对象也会被销毁，因此系统在继续 Activity 时根本无法让其状态保持完好，而是必须在用户返回 Activity 时重建 Activity 对象。但用户并不知道系统销毁 Activity 后又对其进行了重建，因此他们很可能认为 Activity 状态毫无变化。 在这种情况下，您可以实现另一个回调方法对有关 Activity 状态的信息进行保存，以确保有关 Activity 状态的重要信息得到保留：onSaveInstanceState()。

系统会先调用 onSaveInstanceState()，然后再使 Activity 变得易于销毁。系统会向该方法传递一个 Bundle，您可以在其中使用 putString() 和 putInt() 等方法以名称-值对形式保存有关 Activity 状态的信息。然后，如果系统终止您的应用进程，并且用户返回您的 Activity，则系统会重建该 Activity，并将 Bundle 同时传递给 onCreate() 和 onRestoreInstanceState()。您可以使用上述任一方法从 Bundle 提取您保存的状态并恢复该 Activity 状态。如果没有状态信息需要恢复，则传递给您的 Bundle 是空值（如果是首次创建该 Activity，就会出现这种情况）。

![图 2. 在两种情况下，Activity 重获用户焦点时可保持状态完好：系统在销毁 Activity 后重建 Activity，Activity 必须恢复之前保存的状态；系统停止 Activity 后继续执行 Activity，并且 Activity 状态保持完好。](/assets/images/restore_instance.png)


>注：无法保证系统会在销毁您的 Activity 前调用 onSaveInstanceState()，因为存在不需要保存状态的情况（例如用户使用“返回”按钮离开您的 Activity 时，因为用户的行为是在显式关闭 Activity）。 如果系统调用 onSaveInstanceState()，它会在调用 onStop() 之前，并且可能会在调用 onPause() 之前进行调用。

不过，即使您什么都不做，也不实现 onSaveInstanceState()，Activity 类的 onSaveInstanceState() 默认实现也会恢复部分 Activity 状态。具体地讲，默认实现会为布局中的每个 View 调用相应的 onSaveInstanceState() 方法，让每个视图都能提供有关自身的应保存信息。Android 框架中几乎每个小部件都会根据需要实现此方法，以便在重建 Activity 时自动保存和恢复对 UI 所做的任何可见更改。例如，EditText 小部件保存用户输入的任何文本，CheckBox 小部件保存复选框的选中或未选中状态。您只需为想要保存其状态的每个小部件提供一个唯一的 ID（通过 android:id 属性）。如果小部件没有 ID，则系统无法保存其状态。

您还可以通过将`android:saveEnabled`属性设置为 "false" 或通过调用 setSaveEnabled() 方法显式阻止布局内的视图保存其状态。您通常不应将该属性停用，但如果您想以不同方式恢复 Activity UI 的状态，就可能需要这样做。
尽管 onSaveInstanceState() 的默认实现会保存有关您的Activity UI 的有用信息，您可能仍需替换它以保存更多信息。例如，您可能需要保存在 Activity 生命周期内发生了变化的成员值（它们可能与 UI 中恢复的值有关联，但默认情况下系统不会恢复储存这些 UI 值的成员）。

由于 onSaveInstanceState() 的默认实现有助于保存 UI 的状态，因此如果您为了保存更多状态信息而替换该方法，应始终先调用 onSaveInstanceState() 的超类实现，然后再执行任何操作。 同样，如果您替换 onRestoreInstanceState() 方法，也应调用它的超类实现，以便默认实现能够恢复视图状态。

>注：由于无法保证系统会调用 onSaveInstanceState()，因此您只应利用它来记录 Activity 的瞬态（UI 的状态）— 切勿使用它来存储持久性数据，而应使用 onPause() 在用户离开 Activity 后存储持久性数据（例如应保存到数据库的数据）。

您只需旋转设备，让屏幕方向发生变化，就能有效地测试您的应用的状态恢复能力。 当屏幕方向变化时，系统会销毁并重建 Activity，以便应用可供新屏幕配置使用的备用资源。 单凭这一理由，您的 Activity 在重建时能否完全恢复其状态就显得非常重要，因为用户在使用应用时经常需要旋转屏幕。

#### 4.3 处理运行时变更


有些设备配置可能会在运行时发生变化（例如屏幕方向、键盘可用性及语言）。 发生这种变化时，Android 会重启正在运行的 Activity（先后调用 onDestroy() 和 onCreate()）。重启行为旨在通过利用与新设备配置匹配的备用资源自动重新加载您的应用，来帮助它适应新配置。

要妥善处理重启行为，Activity 必须通过常规的Activity 生命周期恢复其以前的状态，在 Activity 生命周期中，Android 会在销毁 Activity 之前调用 onSaveInstanceState()，以便您保存有关应用状态的数据。 然后，您可以在 onCreate() 或 onRestoreInstanceState() 期间恢复 Activity 状态。

要测试应用能否在保持应用状态完好的情况下自行重启，您应该在应用中执行各种任务时调用配置变更（例如，更改屏幕方向）。 您的应用应该能够在不丢失用户数据或状态的情况下随时重启，以便处理如下事件：配置发生变化，或者用户收到来电并在应用进程被销毁很久之后返回到应用。 要了解如何恢复 Activity 状态，请阅读 Activity 生命周期。

但是，您可能会遇到这种情况：重启应用并恢复大量数据不仅成本高昂，而且给用户留下糟糕的使用体验。 在这种情况下，您有两个其他选择：

##### 1. 在配置变更期间保留对象

允许 Activity 在配置变更时重启，但是要将有状态对象传递给 Activity 的新实例。
自行处理配置变更
阻止系统在某些配置变更期间重启 Activity，但要在配置确实发生变化时接收回调，这样，您就能够根据需要手动更新 Activity。
在配置变更期间保留对象
{% em type="red" %}如果重启 Activity 需要恢复大量数据、重新建立网络连接或执行其他密集操作，那么因配置变更而引起的完全重启可能会给用户留下应用运行缓慢的体验。 此外，依靠系统通过onSaveInstanceState() 回调为您保存的 Bundle，可能无法完全恢复 Activity 状态，因为它并非设计用于携带大型对象（例如位图），而且其中的数据必须先序列化，再进行反序列化，这可能会消耗大量内存并使得配置变更速度缓慢。 在这种情况下，如果 Activity 因配置变更而重启，则可通过保留 Fragment 来减轻重新初始化 Activity 的负担。此片段可能包含对您要保留的有状态对象的引用。{% endem %}

当 Android 系统因配置变更而关闭 Activity 时，不会销毁您已标记为要保留的 Activity 的片段。 您可以将此类片段添加到 Activity 以保留有状态的对象。

要在运行时配置变更期间将有状态的对象保留在片段中，请执行以下操作：

扩展 Fragment 类并声明对有状态对象的引用。
在创建片段后调用 setRetainInstance(boolean)。
将片段添加到 Activity。
重启 Activity 后，使用 FragmentManager 检索片段。
例如，按如下方式定义片段：
```java
public class RetainedFragment extends Fragment {

    // data object we want to retain
    private MyDataObject data;

    // this method is only called once for this fragment
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // retain this fragment
        setRetainInstance(true);
    }

    public void setData(MyDataObject data) {
        this.data = data;
    }

    public MyDataObject getData() {
        return data;
    }
}
```

>注意：尽管您可以存储任何对象，但是切勿传递与 Activity 绑定的对象，例如，Drawable、Adapter、View 或其他任何与 Context 关联的对象。否则，它将泄漏原始 Activity 实例的所有视图和资源。 （泄漏资源意味着应用将继续持有这些资源，但是无法对其进行垃圾回收，因此可能会丢失大量内存。）

然后，使用 FragmentManager 将片段添加到 Activity。在运行时配置变更期间再次启动 Activity 时，您可以获得片段中的数据对象。 例如，按如下方式定义 Activity：
```java
public class MyActivity extends Activity {

    private RetainedFragment dataFragment;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.main);

        // find the retained fragment on activity restarts
        FragmentManager fm = getFragmentManager();
        dataFragment = (DataFragment) fm.findFragmentByTag(“data”);

        // create the fragment and data the first time
        if (dataFragment == null) {
            // add the fragment
            dataFragment = new DataFragment();
            fm.beginTransaction().add(dataFragment, “data”).commit();
            // load the data from the web
            dataFragment.setData(loadMyData());
        }

        // the data is available in dataFragment.getData()
        ...
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        // store the data in the fragment
        dataFragment.setData(collectMyLoadedData());
    }
}
```

在此示例中，onCreate() 添加了一个片段或恢复了对它的引用。此外，onCreate() 还将有状态的对象存储在片段实例内部。onDestroy() 对所保留的片段实例内的有状态对象进行更新。

##### 2. 自行处理配置变更

如果应用在特定配置变更期间无需更新资源，并且因性能限制您需要尽量避免重启，则可声明 Activity 将自行处理配置变更，这样可以阻止系统重启 Activity。

注：自行处理配置变更可能导致备用资源的使用更为困难，因为系统不会为您自动应用这些资源。 只能在您必须避免 Activity 因配置变更而重启这一万般无奈的情况下，才考虑采用自行处理配置变更这种方法，而且对于大多数应用并不建议使用此方法。

要声明由 Activity 处理配置变更，请在清单文件中编辑相应的 <activity> 元素，以包含 android:configChanges 属性以及代表要处理的配置的值。android:configChanges 属性的文档中列出了该属性的可能值（最常用的值包括 "orientation" 和 "keyboardHidden"，分别用于避免因屏幕方向和可用键盘改变而导致重启）。您可以在该属性中声明多个配置值，方法是用管道 | 字符分隔这些配置值。

例如，以下清单文件代码声明的 Activity 可同时处理屏幕方向变更和键盘可用性变更：
```xml
<activity android:name=".MyActivity"
          android:configChanges="orientation|keyboardHidden"
          android:label="@string/app_name">
```
现在，当其中一个配置发生变化时，MyActivity 不会重启。相反，MyActivity 会收到对 onConfigurationChanged() 的调用。向此方法传递 Configuration 对象指定新设备配置。您可以通过读取 Configuration 中的字段，确定新配置，然后通过更新界面中使用的资源进行适当的更改。调用此方法时，Activity 的 Resources 对象会相应地进行更新，以根据新配置返回资源，这样，您就能够在系统不重启 Activity 的情况下轻松重置 UI 的元素。

>注意：从 Android 3.2（API 级别 13）开始，当设备在纵向和横向之间切换时，“屏幕尺寸”也会发生变化。因此，在开发针对 API 级别 13 或更高版本（正如 minSdkVersion 和 targetSdkVersion 属性中所声明）的应用时，若要避免由于设备方向改变而导致运行时重启，则除了 "orientation" 值以外，您还必须添加 "screenSize" 值。 也就是说，您必须声明 android:configChanges="orientation|screenSize"。但是，如果您的应用面向 API 级别 12 或更低版本，则 Activity 始终会自行处理此配置变更（即便是在 Android 3.2 或更高版本的设备上运行，此配置变更也不会重启 Activity）。

例如，以下 onConfigurationChanged() 实现检查当前设备方向：
```java
@Override
public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);

    // Checks the orientation of the screen
    if (newConfig.orientation == Configuration.ORIENTATION_LANDSCAPE) {
        Toast.makeText(this, "landscape", Toast.LENGTH_SHORT).show();
    } else if (newConfig.orientation == Configuration.ORIENTATION_PORTRAIT){
        Toast.makeText(this, "portrait", Toast.LENGTH_SHORT).show();
    }
}
```
Configuration 对象代表所有当前配置，而不仅仅是已经变更的配置。大多数时候，您并不在意配置具体发生了哪些变更，而且您可以轻松地重新分配所有资源，为您正在处理的配置提供备用资源。 例如，由于 Resources 对象现已更新，因此您可以通过 setImageResource() 重置任何 ImageView，并且使用适合于新配置的资源（如提供资源中所述）。

请注意，Configuration 字段中的值是与 Configuration 类中的特定常量匹配的整型数。有关要对每个字段使用哪些常量的文档，请参阅 Configuration 参考文档中的相应字段。

请谨记：在声明由 Activity 处理配置变更时，您有责任重置要为其提供备用资源的所有元素。 如果您声明由 Activity 处理方向变更，而且有些图像应该在横向和纵向之间切换，则必须在 onConfigurationChanged() 期间将每个资源重新分配给每个元素。

如果无需基于这些配置变更更新应用，则可不用实现 onConfigurationChanged()。在这种情况下，仍将使用在配置变更之前用到的所有资源，只是您无需重启 Activity。 但是，应用应该始终能够在保持之前状态完好的情况下关闭和重启，因此您不得试图通过此方法来逃避在正常 Activity 生命周期期间保持您的应用状态。 这不仅仅是因为还存在其他一些无法禁止重启应用的配置变更，还因为有些事件必须由您处理，例如用户离开应用，而在用户返回应用之前该应用已被销毁。。



#### 4.4 协调 Activity
当一个 Activity 启动另一个 Activity 时，它们都会体验到生命周期转变。第一个 Activity 暂停并停止（但如果它在后台仍然可见，则不会停止）时，同时系统会创建另一个 Activity。 如果这些 Activity 共用保存到磁盘或其他地方的数据，必须了解的是，在创建第二个 Activity 前，第一个 Activity 不会完全停止。更确切地说，启动第二个 Activity 的过程与停止第一个 Activity 的过程存在重叠。

生命周期回调的顺序经过明确定义，当两个 Activity 位于同一进程，并且由一个 Activity 启动另一个 Activity 时，其定义尤其明确。 以下是当 Activity A 启动 Activity B 时一系列操作的发生顺序：

Activity A 的 onPause() 方法执行。
Activity B 的 onCreate()、onStart() 和 onResume() 方法依次执行。（Activity B 现在具有用户焦点。）
然后，如果 Activity A 在屏幕上不再可见，则其 onStop() 方法执行。
您可以利用这种可预测的生命周期回调顺序管理从一个 Activity 到另一个 Activity 的信息转变。 例如，如果您必须在第一个 Activity 停止时向数据库写入数据，以便下一个 Activity 能够读取该数据，则应在 onPause() 而不是 onStop() 执行期间向数据库写入数据。

### 5. 任务和返回栈

应用通常包含多个 Activity。每个 Activity 均应围绕用户可以执行的特定操作设计，并且能够启动其他 Activity。 例如，电子邮件应用可能有一个 Activity 显示新邮件的列表。用户选择某邮件时，会打开一个新 Activity 以查看该邮件。

一个 Activity 甚至可以启动设备上其他应用中存在的 Activity。例如，如果应用想要发送电子邮件，则可将 Intent 定义为执行“发送”操作并加入一些数据，如电子邮件地址和电子邮件。 然后，系统将打开其他应用中声明自己处理此类 Intent 的 Activity。在这种情况下，Intent 是要发送电子邮件，因此将启动电子邮件应用的“撰写”Activity（如果多个 Activity 支持相同 Intent，则系统会让用户选择要使用的 Activity）。发送电子邮件时，Activity 将恢复，看起来好像电子邮件 Activity 是您的应用的一部分。 即使这两个 Activity 可能来自不同的应用，但是 Android 仍会将 Activity 保留在相同的任务中，以维护这种无缝的用户体验。

任务是指在执行特定作业时与用户交互的一系列 Activity。 这些 Activity 按照各自的打开顺序排列在堆栈（即返回栈）中。

设备主屏幕是大多数任务的起点。当用户触摸应用启动器中的图标（或主屏幕上的快捷方式）时，该应用的任务将出现在前台。 如果应用不存在任务（应用最近未曾使用），则会创建一个新任务，并且该应用的“主”Activity 将作为堆栈中的根 Activity 打开。

当前 Activity 启动另一个 Activity 时，该新 Activity 会被推送到堆栈顶部，成为焦点所在。 前一个 Activity 仍保留在堆栈中，但是处于停止状态。Activity 停止时，系统会保持其用户界面的当前状态。 用户按“返回”按钮时，当前 Activity 会从堆栈顶部弹出（Activity 被销毁），而前一个 Activity 恢复执行（恢复其 UI 的前一状态）。 堆栈中的 Activity 永远不会重新排列，仅推入和弹出堆栈：由当前 Activity 启动时推入堆栈；用户使用“返回”按钮退出时弹出堆栈。 因此，返回栈以“后进先出”对象结构运行。 图 1 通过时间线显示 Activity 之间的进度以及每个时间点的当前返回栈，直观呈现了这种行为。

如果用户继续按“返回”，堆栈中的相应 Activity 就会弹出，以显示前一个 Activity，直到用户返回主屏幕为止（或者，返回任务开始时正在运行的任意 Activity）。 当所有 Activity 均从堆栈中移除后，任务即不复存在。

任务是一个有机整体，当用户开始新任务或通过“主页”按钮转到主屏幕时，可以移动到“后台”。 尽管在后台时，该任务中的所有 Activity 全部停止，但是任务的返回栈仍旧不变，也就是说，当另一个任务发生时，该任务仅仅失去焦点而已，如图 2 中所示。然后，任务可以返回到“前台”，用户就能够回到离开时的状态。 例如，假设当前任务（任务 A）的堆栈中有三个 Activity，即当前 Activity 下方还有两个 Activity。 用户先按“主页”按钮，然后从应用启动器启动新应用。 显示主屏幕时，任务 A 进入后台。新应用启动时，系统会使用自己的 Activity 堆栈为该应用启动一个任务（任务 B）。与该应用交互之后，用户再次返回主屏幕并选择最初启动任务 A 的应用。现在，任务 A 出现在前台，其堆栈中的所有三个 Activity 保持不变，而位于堆栈顶部的 Activity 则会恢复执行。 此时，用户还可以通过转到主屏幕并选择启动该任务的应用图标（或者，通过从概览屏幕选择该应用的任务）切换回任务 B。这是 Android 系统中的一个多任务示例。

![图 2. 两个任务：任务 B 在前台接收用户交互，而任务 A 则在后台等待恢复。](/assets/images/diagram_multitasking.png)

注：后台可以同时运行多个任务。但是，如果用户同时运行多个后台任务，则系统可能会开始销毁后台 Activity，以回收内存资源，从而导致 Activity 状态丢失。请参阅下面有关 Activity 状态的部分。

由于返回栈中的 Activity 永远不会重新排列，因此如果应用允许用户从多个 Activity 中启动特定 Activity，则会创建该 Activity 的新实例并推入堆栈中（而不是将 Activity 的任一先前实例置于顶部）。 因此，应用中的一个 Activity 可能会多次实例化（即使 Activity 来自不同的任务），如图 3 所示。因此，如果用户使用“返回”按钮向后导航，则会按 Activity 每个实例的打开顺序显示这些实例（每个实例的 UI 状态各不相同）。 但是，如果您不希望 Activity 多次实例化，则可修改此行为。 具体操作方法将在后面的管理任务部分中讨论。


![图 3. 一个 Activity 将多次实例化。](/assets/images/diagram_multiple_instances.png)


Activity 和任务的默认行为总结如下：

当 Activity A 启动 Activity B 时，Activity A 将会停止，但系统会保留其状态（例如，滚动位置和已输入表单中的文本）。如果用户在处于 Activity B 时按“返回”按钮，则 Activity A 将恢复其状态，继续执行。
用户通过按“主页”按钮离开任务时，当前 Activity 将停止且其任务会进入后台。 系统将保留任务中每个 Activity 的状态。如果用户稍后通过选择开始任务的启动器图标来恢复任务，则任务将出现在前台并恢复执行堆栈顶部的 Activity。
如果用户按“返回”按钮，则当前 Activity 会从堆栈弹出并被销毁。 堆栈中的前一个 Activity 恢复执行。销毁 Activity 时，系统不会保留该 Activity 的状态。
即使来自其他任务，Activity 也可以多次实例化。
导航设计
如需了解有关 Android 应用导航工作方式的详细信息，请阅读 Android 设计的导航指南。
保存 Activity 状态
正如上文所述，当 Activity 停止时，系统的默认行为会保留其状态。 这样一来，当用户导航回到上一个 Activity 时，其用户界面与用户离开时一样。 但是，在 Activity 被销毁且必须重建时，您可以而且应当主动使用回调方法保留 Activity 的状态。

系统停止您的一个 Activity 时（例如，新 Activity 启动或任务转到前台），如果系统需要回收系统内存资源，则可能会完全销毁该 Activity。 发生这种情况时，有关该 Activity 状态的信息将会丢失。如果发生这种情况，系统仍会知道该 Activity 存在于返回栈中，但是当该 Activity 被置于堆栈顶部时，系统一定会重建 Activity（而不是恢复 Activity）。 为了避免用户的工作丢失，您应主动通过在 Activity 中实现 onSaveInstanceState() 回调方法来保留工作。

如需了解有关如何保存 Activity 状态的详细信息，请参阅 Activity 文档。

### 6.管理任务

Android 管理任务和返回栈的方式（如上所述，即：将所有连续启动的 Activity 放入同一任务和“后进先出”堆栈中）非常适用于大多数应用，而您不必担心 Activity 如何与任务关联或者如何存在于返回栈中。 但是，您可能会决定要中断正常行为。 也许您希望应用中的 Activity 在启动时开始新任务（而不是放置在当前任务中）；或者，当启动 Activity 时，您希望将其现有实例上移一层（而不是在返回栈的顶部创建新实例）；或者，您希望在用户离开任务时，清除返回栈中除根 Activity 以外的所有其他 Activity。

通过使用 <activity> 清单文件元素中的属性和传递给 startActivity() 的 Intent 中的标志，您可以执行所有这些操作以及其他操作。

在这一方面，您可以使用的主要 <activity> 属性包括：

taskAffinity
launchMode
allowTaskReparenting
clearTaskOnLaunch
alwaysRetainTaskState
finishOnTaskLaunch
您可以使用的主要 Intent 标志包括：

FLAG_ACTIVITY_NEW_TASK
FLAG_ACTIVITY_CLEAR_TOP
FLAG_ACTIVITY_SINGLE_TOP
在下文中，您将了解如何使用这些清单文件属性和 Intent 标志定义 Activity 与任务的关联方式，以及 Activity 在返回栈中的行为方式。

此外，我们还单独介绍了有关如何在概览屏幕中显示和管理任务与 Activity 的注意事项。 如需了解详细信息，请参阅概览屏幕。 通常，您应该允许系统定义任务和 Activity 在概览屏幕中的显示方法，并且无需修改此行为。

注意：大多数应用都不得中断 Activity 和任务的默认行为： 如果确定您的 Activity 必须修改默认行为，当使用“返回”按钮从其他 Activity 和任务导航回到该 Activity 时，请务必要谨慎并确保在启动期间测试该 Activity 的可用性。请确保测试导航行为是否有可能与用户的预期行为冲突。

#### 6.1 定义启动模式
启动模式允许您定义 Activity 的新实例如何与当前任务关联。 您可以通过两种方法定义不同的启动模式：

* 使用清单文件

在清单文件中声明 Activity 时，您可以指定 Activity 在启动时应该如何与任务关联。
* 使用 Intent 标志

调用 startActivity() 时，可以在 Intent 中加入一个标志，用于声明新 Activity 如何（或是否）与当前任务关联。
因此，如果 Activity A 启动 Activity B，则 Activity B 可以在其清单文件中定义它应该如何与当前任务关联（如果可能），并且 Activity A 还可以请求 Activity B 应该如何与当前任务关联。如果这两个 Activity 均定义 Activity B 应该如何与任务关联，则 Activity A 的请求（如 Intent 中所定义）优先级要高于 Activity B 的请求（如其清单文件中所定义）。

注：某些适用于清单文件的启动模式不可用作 Intent 标志，同样，某些可用作 Intent 标志的启动模式无法在清单文件中定义。

##### 使用清单文件
在清单文件中声明 Activity 时，您可以使用 <activity> 元素的 launchMode 属性指定 Activity 应该如何与任务关联。

launchMode 属性指定有关应如何将 Activity 启动到任务中的指令。您可以分配给 launchMode 属性的启动模式共有四种：

* "standard"（默认模式）：默认。系统在启动 Activity 的任务中创建 Activity 的新实例并向其传送 Intent。Activity 可以多次实例化，而每个实例均可属于不同的任务，并且一个任务可以拥有多个实例。

* "singleTop"：如果当前任务的顶部已存在 Activity 的一个实例，则系统会通过调用该实例的 onNewIntent() 方法向其传送 Intent，而不是创建 Activity 的新实例。Activity 可以多次实例化，而每个实例均可属于不同的任务，并且一个任务可以拥有多个实例（但前提是位于返回栈顶部的 Activity 并不是 Activity 的现有实例）。

例如，假设任务的返回栈包含根 Activity A 以及 Activity B、C 和位于顶部的 D（堆栈是 A-B-C-D；D 位于顶部）。收到针对 D 类 Activity 的 Intent。如果 D 具有默认的 "standard" 启动模式，则会启动该类的新实例，且堆栈会变成 A-B-C-D-D。但是，如果 D 的启动模式是 "singleTop"，则 D 的现有实例会通过 onNewIntent() 接收 Intent，因为它位于堆栈的顶部；而堆栈仍为 A-B-C-D。但是，如果收到针对 B 类 Activity 的 Intent，则会向堆栈添加 B 的新实例，即便其启动模式为 "singleTop" 也是如此。

注：为某个 Activity 创建新实例时，用户可以按“返回”按钮返回到前一个 Activity。 但是，当 Activity 的现有实例处理新 Intent 时，则在新 Intent 到达 onNewIntent() 之前，用户无法按“返回”按钮返回到 Activity 的状态。

* "singleTask"：如果该Activity的一个实例已存，则销毁该Activity之上的所有Activity，系统会通过调用现有实例的onNewIntent()方法向其传送Intent。只能存在 Activity 的一个实例。


* "singleInstance"：与 "singleTask" 相同，只是系统不会将任何其他 Activity 启动到包含实例的任务中。该 Activity 始终是其任务唯一仅有的成员；由此 Activity 启动的任何 Activity 均在单独的任务中打开。

我们再来看另一示例，Android 浏览器应用声明网络浏览器 Activity 应始终在其自己的任务中打开（通过在 <activity> 元素中指定 singleTask 启动模式）。这意味着，如果您的应用发出打开 Android 浏览器的 Intent，则其 Activity 与您的应用位于不同的任务中。相反，系统会为浏览器启动新任务，或者如果浏览器已有任务正在后台运行，则会将该任务上移一层以处理新 Intent。

无论 Activity 是在新任务中启动，还是在与启动 Activity 相同的任务中启动，用户按“返回”按钮始终会转到前一个 Activity。 但是，如果启动指定 singleTask 启动模式的 Activity，则当某后台任务中存在该 Activity 的实例时，整个任务都会转移到前台。此时，返回栈包括上移到堆栈顶部的任务中的所有 Activity。 图 4 显示了这种情况。

![图 4. 显示如何将启动模式为“singleTask”的 Activity 添加到返回栈。 如果 Activity 已经是某个拥有自己的返回栈的后台任务的一部分，则整个返回栈也会上移到当前任务的顶部。](/assets/images/diagram_backstack_singletask_multiactivity.png)


如需了解有关在清单文件中使用启动模式的详细信息，请参阅 <activity> 元素文档，其中更详细地讨论了 launchMode 属性和可接受的值。

注：使用 launchMode 属性为 Activity 指定的行为可由 Intent 附带的 Activity 启动标志替代，下文将对此进行讨论。

##### 使用 Intent 标志

启动 Activity 时，您可以通过在传递给 startActivity() 的 Intent 中加入相应的标志，修改 Activity 与其任务的默认关联方式。可用于修改默认行为的标志包括：

FLAG_ACTIVITY_NEW_TASK

在新任务中启动 Activity。如果已为正在启动的 Activity 运行任务，则该任务会转到前台并恢复其最后状态，同时 Activity 会在 onNewIntent() 中收到新 Intent。
正如前文所述，这会产生与 "singleTask"launchMode 值相同的行为。

FLAG_ACTIVITY_SINGLE_TOP

如果正在启动的 Activity 是当前 Activity（位于返回栈的顶部），则 现有实例会接收对 onNewIntent() 的调用，而不是创建 Activity 的新实例。
正如前文所述，这会产生与 "singleTop"launchMode 值相同的行为。

FLAG_ACTIVITY_CLEAR_TOP

如果正在启动的 Activity 已在当前任务中运行，则会销毁当前任务顶部的所有 Activity，并通过 onNewIntent() 将此 Intent 传递给 Activity 已恢复的实例（现在位于顶部），而不是启动该 Activity 的新实例。
产生这种行为的 launchMode 属性没有值。

FLAG_ACTIVITY_CLEAR_TOP 通常与 FLAG_ACTIVITY_NEW_TASK 结合使用。一起使用时，通过这些标志，可以找到其他任务中的现有 Activity，并将其放入可从中响应 Intent 的位置。

注：如果指定 Activity 的启动模式为 "standard"，则该 Activity 也会从堆栈中移除，并在其位置启动一个新实例，以便处理传入的 Intent。 这是因为当启动模式为 "standard" 时，将始终为新 Intent 创建新实例。

#### 6.2 处理关联

“关联”指示 Activity 优先属于哪个任务。默认情况下，同一应用中的所有 Activity 彼此关联。 因此，默认情况下，同一应用中的所有 Activity 优先位于相同任务中。 不过，您可以修改 Activity 的默认关联。 在不同应用中定义的 Activity 可以共享关联，或者可为在同一应用中定义的 Activity 分配不同的任务关联。

可以使用 <activity> 元素的 taskAffinity 属性修改任何给定 Activity 的关联。

taskAffinity 属性取字符串值，该值必须不同于在 <manifest> 元素中声明的默认软件包名称，因为系统使用该名称标识应用的默认任务关联。

在两种情况下，关联会起作用：

1. 启动 Activity 的 Intent 包含 FLAG_ACTIVITY_NEW_TASK 标志。
默认情况下，新 Activity 会启动到调用 startActivity() 的 Activity 任务中。它将推入与调用方相同的返回栈。 但是，如果传递给 startActivity() 的 Intent 包含 FLAG_ACTIVITY_NEW_TASK 标志，则系统会寻找其他任务来储存新 Activity。这通常是新任务，但未做强制要求。 如果现有任务与新 Activity 具有相同关联，则会将 Activity 启动到该任务中。 否则，将开始新任务。
如果此标志导致 Activity 开始新任务，且用户按“主页”按钮离开，则必须为用户提供导航回任务的方式。 有些实体（如通知管理器）始终在外部任务中启动 Activity，而从不作为其自身的一部分启动 Activity，因此它们始终将 FLAG_ACTIVITY_NEW_TASK 放入传递给 startActivity() 的 Intent 中。请注意，如果 Activity 能够由可以使用此标志的外部实体调用，则用户可以通过独立方式返回到启动的任务，例如，使用启动器图标（任务的根 Activity 具有 CATEGORY_LAUNCHER Intent 过滤器；）。

2. Activity 将其 allowTaskReparenting 属性设置为 "true"。
在这种情况下，Activity 可以从其启动的任务移动到与其具有关联的任务（如果该任务出现在前台）。
例如，假设将报告所选城市天气状况的 Activity 定义为旅行应用的一部分。 它与同一应用中的其他 Activity 具有相同的关联（默认应用关联），并允许利用此属性重定父级。当您的一个 Activity 启动天气预报 Activity 时，它最初所属的任务与您的 Activity 相同。 但是，当旅行应用的任务出现在前台时，系统会将天气预报 Activity 重新分配给该任务并显示在其中。
提示：如果从用户的角度来看，一个 .apk 文件包含多个“应用”，则您可能需要使用 taskAffinity 属性将不同关联分配给与每个“应用”相关的 Activity。

#### 6.3 清理返回栈

如果用户长时间离开任务，则系统会清除所有 Activity 的任务，根 Activity 除外。 当用户再次返回到任务时，仅恢复根 Activity。系统这样做的原因是，经过很长一段时间后，用户可能已经放弃之前执行的操作，返回到任务是要开始执行新的操作。

您可以使用下列几个 Activity 属性修改此行为：

* alwaysRetainTaskState：如果在任务的根 Activity 中将此属性设置为 "true"，则不会发生刚才所述的默认行为。即使在很长一段时间后，任务仍将所有 Activity 保留在其堆栈中。

* clearTaskOnLaunch：如果在任务的根 Activity 中将此属性设置为 "true"，则每当用户离开任务然后返回时，系统都会将堆栈清除到只剩下根 Activity。 换而言之，它与 alwaysRetainTaskState 正好相反。 即使只离开任务片刻时间，用户也始终会返回到任务的初始状态。
* finishOnTaskLaunch：此属性类似于 clearTaskOnLaunch，但它对单个 Activity 起作用，而非整个任务。 此外，它还有可能会导致任何 Activity 停止，包括根 Activity。 设置为 "true" 时，Activity 仍是任务的一部分，但是仅限于当前会话。如果用户离开然后返回任务，则任务将不复存在。

#### 6.4 启动任务

通过为 Activity 提供一个以 "android.intent.action.MAIN" 为指定操作、以 "android.intent.category.LAUNCHER" 为指定类别的 Intent 过滤器，您可以将 Activity 设置为任务的入口点。 例如：
```xml
<activity ... >
    <intent-filter ... >
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
    ...
</activity>
```

此类 Intent 过滤器会使 Activity 的图标和标签显示在应用启动器中，让用户能够启动 Activity 并在启动之后随时返回到创建的任务中。

第二个功能非常重要：用户必须能够在离开任务后，再使用此 Activity 启动器返回该任务。 因此，只有在 Activity 具有 ACTION_MAIN 和 CATEGORY_LAUNCHER 过滤器时，才应该使用将 Activity 标记为“始终启动任务”的两种启动模式，即 "singleTask" 和 "singleInstance"。例如，我们可以想像一下如果缺少过滤器会发生什么情况： Intent 启动一个 "singleTask" Activity，从而启动一个新任务，并且用户花了些时间处理该任务。然后，用户按“主页”按钮。 任务现已发送到后台，而且不可见。现在，用户无法返回到任务，因为该任务未显示在应用启动器中。

如果您并不想用户能够返回到 Activity，对于这些情况，请将 <activity> 元素的 finishOnTaskLaunch 设置为 "true"（请参阅清理堆栈）。


### 参考

* [Activities](https://developer.android.com/guide/components/activities/index.html)
* [管理 Activity 生命周期](https://developer.android.com/training/basics/activity-lifecycle/index.html)
* [Understand Android Activity's launchMode: standard, singleTop, singleTask and singleInstance](https://inthecheesefactory.com/blog/understand-android-activity-launchmode/en)
* [Activity的四种launchMode](http://blog.csdn.net/liuhe688/article/details/6754323)
* [Activity的task相关](http://blog.csdn.net/liuhe688/article/details/6761337)
* [处理运行时变更](https://developer.android.com/guide/topics/resources/runtime-changes.html)
* [dumpsys命令用法](http://gityuan.com/2016/05/14/dumpsys-command/)


