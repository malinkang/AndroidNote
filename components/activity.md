# Activity

[`Activity`](https://developer.android.com/reference/android/app/Activity) 类是 `Android` 应用的关键组件，而 Activity 的启动和组合方式则是该平台应用模型的基本组成部分。在编程范式中，应用是通过 `main()` 方法启动的，而 Android 系统与此不同，它会调用与其生命周期特定阶段相对应的特定回调方法来启动 [`Activity`](https://developer.android.com/reference/android/app/Activity) 实例中的代码。

本文介绍了 `Activity` 的概念，并提供了有关如何使用 `Activity` 的简要说明。要详细了解有关设计应用架构的最佳做法，请参阅[应用架构指南](https://developer.android.com/topic/libraries/architecture/guide)。

## Activity 的概念

移动应用体验与桌面体验的不同之处在于，用户与应用的互动并不总是在同一位置开始，而是经常以不确定的方式开始。例如，如果您从主屏幕打开电子邮件应用，可能会看到电子邮件列表，如果您通过社交媒体应用启动电子邮件应用，则可能会直接进入电子邮件应用的邮件撰写界面。

[`Activity`](https://developer.android.com/reference/android/app/Activity) 类的目的就是促进这种范式的实现。当一个应用调用另一个应用时，调用方应用会调用另一个应用中的 Activity，而不是整个应用。通过这种方式，Activity 充当了应用与用户互动的入口点。您可以将 Activity 实现为 [`Activity`](https://developer.android.com/reference/android/app/Activity) 类的子类。

Activity 提供窗口供应用在其中绘制界面。此窗口通常会填满屏幕，但也可能比屏幕小，并浮动在其他窗口上面。通常，一个 Activity 实现应用中的一个屏幕。例如，应用中的一个 Activity 实现“偏好设置”屏幕，而另一个 Activity 实现“选择照片”屏幕。

大多数应用包含多个屏幕，这意味着它们包含多个 Activity。通常，应用中的一个 Activity 会被指定为主 Activity，这是用户启动应用时出现的第一个屏幕。然后，每个 Activity 可以启动另一个 Activity，以执行不同的操作。例如，一个简单的电子邮件应用中的主 Activity 可能会提供显示电子邮件收件箱的屏幕。主 Activity 可能会从该屏幕启动其他 Activity，以提供执行写邮件和打开邮件这类任务的屏幕。

虽然应用中的各个 Activity 协同工作形成统一的用户体验，但每个 Activity 与其他 Activity 之间只存在松散的关联，应用内不同 Activity 之间的依赖关系通常很小。事实上，Activity 经常会启动属于其他应用的 Activity。例如，浏览器应用可能会启动社交媒体应用的“分享”Activity。

要在应用中使用 Activity，您必须在应用的清单中注册关于 Activity 的信息，并且必须适当地管理 Activity 的生命周期。本文的后续内容将介绍这些主题。

## 配置清单

要使应用能够使用 Activity，您必须在清单中声明 Activity 及其特定属性。

### 声明 Activity

要声明 Activity，请打开清单文件，并添加 [&lt;activity&gt;](https://developer.android.com/guide/topics/manifest/activity-element) 元素作为 [&lt;application&gt;](https://developer.android.com/guide/topics/manifest/application-element) 元素的子元素。例如：

```markup
    <manifest ... >
      <application ... >
          <activity android:name=".ExampleActivity" />
          ...
      </application ... >
      ...
    </manifest >
```

此元素唯一的必要属性是 [android:name](https://developer.android.com/guide/topics/manifest/activity-element#nm)，该属性用于指定 Activity 的类名称。您也可以添加用于定义标签、图标或界面主题等 Activity 特征的属性。如需详细了解上述及其他属性，请参阅 [&lt;activity&gt;](https://developer.android.com/guide/topics/manifest/activity-element) 元素参考文档。

{% hint style="info" %}
**注意**：发布应用后，就不应再更改 Activity 名称，否则可能会破坏某些功能，例如应用快捷方式。如需详细了解发布后应避免的更改，请参阅[不可更改的内容](http://android-developers.blogspot.com/2011/06/things-that-cannot-change.html)。
{% endhint %}

### 声明 intent 过滤器

[Intent 过滤器](https://developer.android.com/guide/components/intents-filters)是 Android 平台的一项非常强大的功能。借助这项功能，您不但可以根据显式请求启动 Activity，还可以根据隐式请求启动 Activity。例如，显式请求可能会告诉系统“在 Gmail 应用中启动‘发送电子邮件’Activity”，而隐式请求可能会告诉系统“在任何能够完成此工作的 Activity 中启动‘发送电子邮件’屏幕”。当系统界面询问用户使用哪个应用来执行任务时，这就是 intent 过滤器在起作用。

要使用此功能，您需要在 [&lt;activity&gt;](https://developer.android.com/guide/topics/manifest/activity-element) 元素中声明 [&lt;intent-filter&gt;](https://developer.android.com/guide/topics/manifest/intent-filter-element) 属性。此元素的定义包括 [&lt;action&gt;](https://developer.android.com/guide/topics/manifest/action-element) 元素，以及可选的 [&lt;category&gt;](https://developer.android.com/guide/topics/manifest/category-element) 元素和/或 [&lt;data&gt;](https://developer.android.com/guide/topics/manifest/data-element) 元素。这些元素组合在一起，可以指定 Activity 能够响应的 intent 类型。例如，以下代码段展示了如何配置一个发送文本数据并接收其他 Activity 的文本数据发送请求的 Activity：

```markup
    <activity android:name=".ExampleActivity" android:icon="@drawable/app_icon">
        <intent-filter>
            <action android:name="android.intent.action.SEND" />
            <category android:name="android.intent.category.DEFAULT" />
            <data android:mimeType="text/plain" />
        </intent-filter>
    </activity>
```

在此示例中，[&lt;action&gt;](https://developer.android.com/guide/topics/manifest/action-element) 元素指定该 Activity 会发送数据。将 [&lt;category&gt;](https://developer.android.com/guide/topics/manifest/category-element) 元素声明为 `DEFAULT` 可使 Activity 能够接收启动请求。[&lt;data&gt;](https://developer.android.com/guide/topics/manifest/data-element) 元素指定此 Activity 可以发送的数据类型。以下代码段展示了如何调用上述 Activity：

```java
    // Create the text message with a string
    Intent sendIntent = new Intent();
    sendIntent.setAction(Intent.ACTION_SEND);
    sendIntent.setType("text/plain");
    sendIntent.putExtra(Intent.EXTRA_TEXT, textMessage);
    // Start the activity
    startActivity(sendIntent);
```

如果您打算构建一个独立的应用，不允许其他应用激活其 Activity，则不需要任何其他 intent 过滤器。您不想让其他应用访问的 Activity 不应包含 intent 过滤器，您可以自己使用显式 intent 启动它们。如需详细了解 Activity 如何响应 Intent，请参阅 [Intent 和 Intent 过滤器](https://developer.android.com/guide/components/intents-filters)。

### 声明权限

您可以使用清单的 [`<activity>`](https://developer.android.com/guide/topics/manifest/activity-element) 标记来控制哪些应用可以启动某个 Activity。父 Activity 和子 Activity 必须在其清单中具有相同的权限，前者才能启动后者。如果您为父 Activity 声明了 [`<uses-permission>`](https://developer.android.com/guide/topics/manifest/uses-permission-element) 元素，则每个子 Activity 都必须具有匹配的 [`<uses-permission>`](https://developer.android.com/guide/topics/manifest/uses-permission-element)元素。

例如，假设您的应用想要使用一个名为 SocialApp 的应用在社交媒体上分享文章，则 SocialApp 本身必须定义调用它的应用所需具备的权限：

```markup
    <manifest>
    <activity android:name="...."
       android:permission=”com.google.socialapp.permission.SHARE_POST”

    />
```

然后，为了能够调用 SocialApp，您的应用必须匹配 SocialApp 清单中设置的权限：

```markup
    <manifest>
       <uses-permission android:name="com.google.socialapp.permission.SHARE_POST" />
    </manifest>
```

如需详细了解权限和安全性，请参阅[安全性和权限](https://developer.android.com/guide/topics/security/security)。

## 了解 Activity 生命周期

当用户浏览、退出和返回到您的应用时，您应用中的 [`Activity`](https://developer.android.com/reference/android/app/Activity) 实例会在其生命周期的不同状态间转换。[`Activity`](https://developer.android.com/reference/android/app/Activity) 类会提供许多回调，这些回调会让 Activity 知晓某个状态已经更改：系统正在创建、停止或恢复某个 Activity，或者正在销毁该 Activity 所在的进程。

在生命周期回调方法中，您可以声明用户离开和再次进入 Activity 时 Activity 的行为方式。例如，如果您正构建流媒体视频播放器，当用户切换至另一应用时，您可能要暂停视频或终止网络连接。当用户返回时，您可以重新连接网络并允许用户从同一位置继续播放视频。换言之，每个回调都支持您执行适合给定状态变更的特定作业。在合适的时间执行正确的作业，并妥善处理转换，这将提升应用的稳健性和性能。例如，良好的生命周期回调实现有助于防止应用出现以下问题：

* 当用户在使用应用时接听来电，或切换至另一应用时崩溃。
* 当用户未主动使用它时，消耗宝贵的系统资源。
* 当用户离开应用并在稍后返回时，丢失用户的进度。
* 当屏幕在横向和纵向之间旋转时，崩溃或丢失用户的进度。

本文档将详细介绍 Activity 生命周期。首先介绍生命周期范例。接着介绍每个回调：它们执行时内部发生了什么，以及您应该在执行期间实现什么。然后，简要介绍 Activity 状态与导致进程被系统终止的漏洞之间的关系。最后，讨论与在 Activity 状态之间转换相关的若干主题。

如需了解有关处理生命周期的信息（包括最佳做法的相关指导），请参阅[使用生命周期感知型组件处理生命周期](https://developer.android.com/topic/libraries/architecture/lifecycle)和[保存界面状态](https://developer.android.com/topic/libraries/architecture/saving-states)。如需了解如何将 Activity 与架构组件结合使用，以构建生产质量的稳健应用，请参阅[应用架构指南](https://developer.android.com/topic/libraries/architecture/guide)。

### Activity 生命周期概念

为了在 Activity 生命周期的各个阶段之间导航转换，Activity 类提供六个核心回调：[`onCreate()`](https://developer.android.com/reference/android/app/Activity#onCreate%28android.os.Bundle%29)、[`onStart()`](https://developer.android.com/reference/android/app/Activity#onStart%28%29)、[`onResume()`](https://developer.android.com/reference/android/app/Activity#onResume%28%29)、[`onPause()`](https://developer.android.com/reference/android/app/Activity#onPause%28%29)、[`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29) 和 [`onDestroy()`](https://developer.android.com/reference/android/app/Activity#onDestroy%28%29)。当 Activity 进入新状态时，系统会调用其中每个回调。

![](../.gitbook/assets/image%20%2842%29.png)

当用户开始离开 Activity 时，系统会调用方法来销毁该 Activity。在某些情况下，此销毁只是部分销毁；Activity 仍然驻留在内存中（例如当用户切换至另一应用时），并且仍然可以返回到前台。如果用户返回到该 Activity，Activity 会从用户离开时的位置继续运行。除了少数例外，应用[在后台运行时会受到限制，无法启动 Activity](https://developer.android.com/guide/components/activities/background-starts)。

系统终止给定进程及其中 Activity 的可能性取决于当时 Activity 的状态。[Activity 状态和从内存中弹出](https://developer.android.com/guide/components/activities/activity-lifecycle#asem) 会更详细地介绍状态与弹出漏洞之间的关系。

根据 Activity 的复杂程度，您可能不需要实现所有生命周期方法。但是，请务必了解每个方法，并实现能够确保应用按用户预期方式运行的方法，这非常重要。

在下一部分中，本文档将详细介绍用于处理状态间转换的回调。

### 生命周期回调 <a id="lc"></a>

本部分介绍 Activity 生命周期中所用回调方法的相关概念及实现信息。

某些操作（例如调用 [`setContentView()`](https://developer.android.com/reference/android/app/Activity#setContentView%28int%29)）属于 Activity 生命周期方法本身。不过，用于实现依赖组件操作的代码应放在组件本身内。为此，您必须使依赖组件具有生命周期感知能力。请参阅[使用生命周期感知型组件处理生命周期](https://developer.android.com/topic/libraries/architecture/lifecycle)，了解如何让您的依赖组件获得生命周期感知能力。

#### onCreate\(\)

您必须实现此回调，它会在系统首次创建 Activity 时触发。Activity 会在创建后进入**“已创建”**状态。在 [`onCreate()`](https://developer.android.com/reference/android/app/Activity#onCreate%28android.os.Bundle%29) 方法中，您需执行基本应用启动逻辑，该逻辑在 Activity 的整个生命周期中只应发生一次。例如，[`onCreate()`](https://developer.android.com/reference/android/app/Activity#onCreate%28android.os.Bundle%29) 的实现可能会将数据绑定到列表，将 Activity 与 [`ViewModel`](https://developer.android.com/reference/androidx/lifecycle/ViewModel) 相关联，并实例化某些类作用域变量。此方法会接收 `savedInstanceState` 参数，后者是包含 Activity 先前保存状态的 [`Bundle`](https://developer.android.com/reference/android/os/Bundle) 对象。如果 Activity 此前未曾存在，[`Bundle`](https://developer.android.com/reference/android/os/Bundle) 对象的值为 null。

如果您有一个生命周期感知型组件与您的 Activity 生命周期相关联，该组件将收到 [`ON_CREATE`](https://developer.android.com/reference/androidx/lifecycle/Lifecycle.Event#ON_CREATE) 事件。系统将调用带有 @OnLifecycleEvent 注释的方法，以使您的生命周期感知型组件可以执行已创建状态所需的任何设置代码。

[`onCreate()`](https://developer.android.com/reference/android/app/Activity#onCreate%28android.os.Bundle%29) 方法的以下示例显示执行 Activity 某些基本设置的一些代码，例如声明界面（在 XML 布局文件中定义）、定义成员变量，以及配置某些界面。在本示例中，系统通过将文件的资源 ID `R.layout.main_activity` 传递给 [`setContentView()`](https://developer.android.com/reference/android/app/Activity#setContentView%28android.view.View%29) 来指定 XML 布局文件。

```java
TextView textView;

// some transient state for the activity instance
String gameState;

@Override
public void onCreate(Bundle savedInstanceState) {
    // call the super class onCreate to complete the creation of activity like
    // the view hierarchy
    super.onCreate(savedInstanceState);

    // recovering the instance state
    if (savedInstanceState != null) {
        gameState = savedInstanceState.getString(GAME_STATE_KEY);
    }

    // set the user interface layout for this activity
    // the layout file is defined in the project res/layout/main_activity.xml file
    setContentView(R.layout.main_activity);

    // initialize member TextView so we can manipulate it later
    textView = (TextView) findViewById(R.id.text_view);
}

// This callback is called only when there is a saved instance that is previously saved by using
// onSaveInstanceState(). We restore some state in onCreate(), while we can optionally restore
// other state here, possibly usable after onStart() has completed.
// The savedInstanceState Bundle is same as the one used in onCreate().
@Override
public void onRestoreInstanceState(Bundle savedInstanceState) {
    textView.setText(savedInstanceState.getString(TEXT_VIEW_KEY));
}

// invoked when the activity may be temporarily destroyed, save the instance state here
@Override
public void onSaveInstanceState(Bundle outState) {
    outState.putString(GAME_STATE_KEY, gameState);
    outState.putString(TEXT_VIEW_KEY, textView.getText());

    // call superclass to save any view hierarchy
    super.onSaveInstanceState(outState);
}
```

除了定义 XML 文件，然后将其传递给 [`setContentView()`](https://developer.android.com/reference/android/app/Activity#setContentView%28android.view.View%29)，您还可以在 Activity 代码中新建 [`View`](https://developer.android.com/reference/android/view/View) 对象，并将新建的 [`View`](https://developer.android.com/reference/android/view/View) 插入到 [`ViewGroup`](https://developer.android.com/reference/android/view/ViewGroup) 中，以构建视图层次结构。然后，将根 [`ViewGroup`](https://developer.android.com/reference/android/view/ViewGroup) 传递给 [`setContentView()`](https://developer.android.com/reference/android/app/Activity#setContentView%28android.view.View%29) 以使用该布局。如需详细了解如何创建界面，请参阅[界面](https://developer.android.com/guide/topics/ui)文档。

您的 Activity 并未处于“已创建”状态。[`onCreate()`](https://developer.android.com/reference/android/app/Activity#onCreate%28android.os.Bundle%29) 方法完成执行后，Activity 进入“已开始”状态，系统会相继调用 [`onStart()`](https://developer.android.com/reference/android/app/Activity#onStart%28%29) 和 [`onResume()`](https://developer.android.com/reference/android/app/Activity#onResume%28%29) 方法。下一部分将介绍 [`onStart()`](https://developer.android.com/reference/android/app/Activity#onStart%28%29) 回调。

#### onStart\(\) <a id="onstart"></a>

当 Activity 进入**“已开始”**状态时，系统会调用此回调。[`onStart()`](https://developer.android.com/reference/android/app/Activity#onStart%28%29) 调用使 Activity 对用户可见，因为应用会为 Activity 进入前台并支持互动做准备。例如，应用通过此方法来初始化维护界面的代码。

当 Activity 进入已开始状态时，与 Activity 生命周期相关联的所有生命周期感知型组件都将收到 [`ON_START`](https://developer.android.com/reference/androidx/lifecycle/Lifecycle.Event#ON_START) 事件。

[`onStart()`](https://developer.android.com/reference/android/app/Activity#onStart%28%29) 方法会非常快速地完成，并且与“已创建”状态一样，Activity 不会一直处于“已开始”状态。一旦此回调结束，Activity 便会进入“已恢复”状态，系统将调用 [`onResume()`](https://developer.android.com/reference/android/app/Activity#onResume%28%29) 方法。

#### onResume\(\) <a id="onresume"></a>

Activity 会在进入“已恢复”状态时来到前台，然后系统调用 [`onResume()`](https://developer.android.com/reference/android/app/Activity#onResume%28%29) 回调。这是应用与用户互动的状态。应用会一直保持这种状态，直到某些事件发生，让焦点远离应用。此类事件包括接到来电、用户导航到另一个 Activity，或设备屏幕关闭。

当 Activity 进入已恢复状态时，与 Activity 生命周期相关联的所有生命周期感知型组件都将收到 [`ON_RESUME`](https://developer.android.com/reference/androidx/lifecycle/Lifecycle.Event#ON_RESUME) 事件。这时，生命周期组件可以启用在组件可见且位于前台时需要运行的任何功能，例如启动相机预览。

当发生中断事件时，Activity 进入“已暂停”状态，系统调用 [`onPause()`](https://developer.android.com/reference/android/app/Activity#onPause%28%29) 回调。

如果 Activity 从“已暂停”状态返回“已恢复”状态，系统将再次调用 [`onResume()`](https://developer.android.com/reference/android/app/Activity#onResume%28%29) 方法。因此，您应实现 [`onResume()`](https://developer.android.com/reference/android/app/Activity#onResume%28%29)，以初始化在 [`onPause()`](https://developer.android.com/reference/android/app/Activity#onPause%28%29) 期间释放的组件，并执行每次 Activity 进入“已恢复”状态时必须完成的任何其他初始化操作。

以下是生命周期感知型组件的示例，该组件在收到 [`ON_RESUME`](https://developer.android.com/reference/androidx/lifecycle/Lifecycle.Event#ON_RESUME) 事件时访问相机：

```java
public class CameraComponent implements LifecycleObserver {

    ...

    @OnLifecycleEvent(Lifecycle.Event.ON_RESUME)
    public void initializeCamera() {
        if (camera == null) {
            getCamera();
        }
    }

    ...
}
```

[`LifecycleObserver`](https://developer.android.com/reference/androidx/lifecycle/LifecycleObserver) 收到 ON\_RESUME 事件后，上述代码便会初始化相机。然而，在多窗口模式下，即使处于“已暂停”状态，您的 Activity 也可能完全可见。例如，当用户处于多窗口模式，并点按另一个不包含 Activity 的窗口时，您的 Activity 将进入“已暂停”状态。如果您希望相机仅在应用处于“已恢复”（可见且在前台运行）状态时可用，请在收到上述 ON\_RESUME 事件后初始化相机。如果您希望在 Activity 处于“已暂停”状态但可见时（例如在多窗口模式下）保持相机可用，应在收到 ON\_START 事件后初始化相机。但请注意，若要让相机在 Activity 处于“已暂停”状态时可用，可能会导致系统在多窗口模式下拒绝其他处于“已恢复”状态的应用访问相机。有时可能有必要让相机在 Activity 处于“已暂停”状态时保持可用，但这样做实际可能会降低整体用户体验。请仔细考虑，生命周期的哪个阶段更适合在多窗口环境下控制共享系统资源。如需详细了解如何支持多窗口模式，请参阅[多窗口支持](https://developer.android.com/guide/topics/ui/multi-window)。

无论您选择在哪个构建事件中执行初始化操作，都请务必使用相应的生命周期事件来释放资源。如果您在收到 ON\_START 事件后初始化某些内容，请在收到 ON\_STOP 事件后释放或终止相应内容。如果您在收到 ON\_RESUME 事件后初始化某些内容，请在收到 ON\_PAUSE 事件后将其释放。

请注意，上述代码段将相机初始化代码放置在生命周期感知型组件中。您也可以直接将此代码放入 Activity 生命周期回调（例如 [`onStart()`](https://developer.android.com/reference/android/app/Activity#onStart%28%29) 和 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29)），但我们不建议您这样做。通过将此逻辑添加到独立的生命周期感知型组件中，您可以对多个 Activity 重复使用该组件，而无需复制代码。请参阅[使用生命周期感知型组件处理生命周期](https://developer.android.com/topic/libraries/architecture/lifecycle)，了解如何创建生命周期感知型组件。

#### onPause\(\) <a id="onpause"></a>

系统将此方法视为用户将要离开您的 Activity 的第一个标志（尽管这并不总是意味着 Activity 会被销毁）；此方法表示 Activity 不再位于前台（尽管在用户处于多窗口模式时 Activity 仍然可见）。使用 [`onPause()`](https://developer.android.com/reference/android/app/Activity#onPause%28%29) 方法暂停或调整当 [`Activity`](https://developer.android.com/reference/android/app/Activity) 处于“已暂停”状态时不应继续（或应有节制地继续）的操作，以及您希望很快恢复的操作。Activity 进入此状态的原因有很多。例如：

* 如 [onResume\(\)](https://developer.android.com/guide/components/activities/activity-lifecycle#onresume) 部分所述，某个事件会中断应用执行。这是最常见的情况。
* 在 Android 7.0（API 级别 24）或更高版本中，有多个应用在多窗口模式下运行。无论何时，都只有一个应用（窗口）可以拥有焦点，因此系统会暂停所有其他应用。
* 有新的半透明 Activity（例如对话框）处于开启状态。只要 Activity 仍然部分可见但并未处于焦点之中，它便会一直暂停。

当 Activity 进入已暂停状态时，与 Activity 生命周期相关联的所有生命周期感知型组件都将收到 [`ON_PAUSE`](https://developer.android.com/reference/androidx/lifecycle/Lifecycle.Event#ON_PAUSE) 事件。这时，生命周期组件可以停止在组件未位于前台时无需运行的任何功能，例如停止相机预览。

您还可以使用 [`onPause()`](https://developer.android.com/reference/android/app/Activity#onPause%28%29) 方法释放系统资源、传感器（例如 GPS）手柄，或当您的 Activity 暂停且用户不需要它们时仍然可能影响电池续航时间的任何资源。然而，正如上文的 onResume\(\) 部分所述，如果处于多窗口模式，“已暂停”的 Activity 仍完全可见。因此，您应该考虑使用 onStop\(\) 而非 onPause\(\) 来完全释放或调整与界面相关的资源和操作，以便更好地支持多窗口模式。

响应 ON\_PAUSE 事件的以下 [`LifecycleObserver`](https://developer.android.com/reference/androidx/lifecycle/LifecycleObserver) 示例与上述 ON\_RESUME 事件示例相对应，会释放在收到 ON\_RESUME 事件后初始化的相机：  


```java
public class JavaCameraComponent implements LifecycleObserver {

    ...

    @OnLifecycleEvent(Lifecycle.Event.ON_PAUSE)
    public void releaseCamera() {
        if (camera != null) {
            camera.release();
            camera = null;
        }
    }

    ...
}
```

请注意，上述代码段在 LifecycleObserver 收到 ON\_PAUSE 事件后放置相机释放代码。如前所述，请参阅[使用生命周期感知型组件处理生命周期](https://developer.android.com/topic/libraries/architecture/lifecycle)了解如何创建生命周期感知型组件。

[`onPause()`](https://developer.android.com/reference/android/app/Activity#onPause%28%29) 执行非常简单，而且不一定要有足够的时间来执行保存操作。因此，您**不**应使用 [`onPause()`](https://developer.android.com/reference/android/app/Activity#onPause%28%29) 来保存应用或用户数据、进行网络调用或执行数据库事务。因为在该方法完成之前，此类工作可能无法完成。相反，您应在 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29) 期间执行高负载的关闭操作。如需详细了解在 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29) 期间执行的合适操作，请参阅 [onStop\(\)](https://developer.android.com/guide/components/activities/activity-lifecycle#onstop)。如需详细了解如何保存数据，请参阅[保存和恢复 Activity 状态](https://developer.android.com/guide/components/activities/activity-lifecycle#saras)。

[`onPause()`](https://developer.android.com/reference/android/app/Activity#onPause%28%29) 方法的完成并不意味着 Activity 离开“已暂停”状态。相反，Activity 会保持此状态，直到其恢复或变成对用户完全不可见。如果 Activity 恢复，系统将再次调用 [`onResume()`](https://developer.android.com/reference/android/app/Activity#onResume%28%29) 回调。如果 Activity 从“已暂停”状态返回“已恢复”状态，系统会让 [`Activity`](https://developer.android.com/reference/android/app/Activity) 实例继续驻留在内存中，并会在系统调用 [`onResume()`](https://developer.android.com/reference/android/app/Activity#onResume%28%29) 时重新调用该实例。在这种情况下，您无需重新初始化在任何回调方法导致 Activity 进入“已恢复”状态期间创建的组件。如果 Activity 变为完全不可见，系统会调用 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29)。下一部分将介绍 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29) 回调。  


#### onStop\(\) <a id="onstop"></a>

如果您的 Activity 不再对用户可见，说明其已进入“已停止”状态，因此系统将调用 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29) 回调。例如，当新启动的 Activity 覆盖整个屏幕时，可能会发生这种情况。如果 Activity 已结束运行并即将终止，系统还可以调用 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29)。

当 Activity 进入已停止状态时，与 Activity 生命周期相关联的所有生命周期感知型组件都将收到 [`ON_STOP`](https://developer.android.com/reference/androidx/lifecycle/Lifecycle.Event#ON_STOP) 事件。这时，生命周期组件可以停止在组件未显示在屏幕上时无需运行的任何功能。

在 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29) 方法中，应用应释放或调整在应用对用户不可见时的无用资源。例如，应用可以暂停动画效果，或从精确位置更新切换到粗略位置更新。使用 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29) 而非 [`onPause()`](https://developer.android.com/reference/android/app/Activity#onPause%28%29) 可确保与界面相关的工作继续进行，即使用户在多窗口模式下查看您的 Activity 也能如此。

您还应使用 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29) 执行 CPU 相对密集的关闭操作。例如，如果您无法找到更合适的时机来将信息保存到数据库，可以在 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29) 期间执行此操作。以下示例展示了 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29) 的实现，它将草稿笔记内容保存到持久性存储空间中：

```java
@Override
protected void onStop() {
    // call the superclass method first
    super.onStop();

    // save the note's current draft, because the activity is stopping
    // and we want to be sure the current note progress isn't lost.
    ContentValues values = new ContentValues();
    values.put(NotePad.Notes.COLUMN_NAME_NOTE, getCurrentNoteText());
    values.put(NotePad.Notes.COLUMN_NAME_TITLE, getCurrentNoteTitle());

    // do this update in background on an AsyncQueryHandler or equivalent
    asyncQueryHandler.startUpdate (
            mToken,  // int token to correlate calls
            null,    // cookie, not used here
            uri,    // The URI for the note to update.
            values,  // The map of column names and new values to apply to them.
            null,    // No SELECT criteria are used.
            null     // No WHERE columns are used.
    );
}
```

请注意，上述代码示例直接使用 SQLite。但您应该改用 Room，这是一个通过 SQLite 提供抽象层的持久性库。如需详细了解使用 Room 的好处，以及如何在应用中实现 Room，请参阅 [Room 持久性库](https://developer.android.com/topic/libraries/architecture/room)指南。

当您的 Activity 进入“已停止”状态时，[`Activity`](https://developer.android.com/reference/android/app/Activity) 对象会继续驻留在内存中：该对象将维护所有状态和成员信息，但不会附加到窗口管理器。Activity 恢复后，Activity 会重新调用这些信息。您无需重新初始化在任何回调方法导致 Activity 进入“已恢复”状态期间创建的组件。系统还会追踪布局中每个 [`View`](https://developer.android.com/reference/android/view/View) 对象的当前状态，如果用户在 [`EditText`](https://developer.android.com/reference/android/widget/EditText) 微件中输入文本，系统将保留文本内容，因此您无需保存和恢复文本。  


{% hint style="info" %}
**注意**：Activity 停止后，如果系统需要恢复内存，可能会销毁包含该 Activity 的进程。即使系统在 Activity 停止后销毁相应进程，系统仍会保留 [`Bundle`](https://developer.android.com/reference/android/os/Bundle)（键值对的 blob）中 [`View`](https://developer.android.com/reference/android/view/View) 对象（例如 [`EditText`](https://developer.android.com/reference/android/widget/EditText) 微件中的文本）的状态，并在用户返回 Activity 时恢复这些对象。如需详细了解如何恢复用户返回的 Activity，请参阅[保存和恢复 Activity 状态](https://developer.android.com/guide/components/activities/activity-lifecycle#saras)。
{% endhint %}

进入“已停止”状态后，Activity 要么返回与用户互动，要么结束运行并消失。如果 Activity 返回，系统将调用 [`onRestart()`](https://developer.android.com/reference/android/app/Activity#onRestart%28%29)。如果 [`Activity`](https://developer.android.com/reference/android/app/Activity) 结束运行，系统将调用 [`onDestroy()`](https://developer.android.com/reference/android/app/Activity#onDestroy%28%29)。下一部分将介绍 [`onDestroy()`](https://developer.android.com/reference/android/app/Activity#onDestroy%28%29) 回调。

#### onDestroy\(\) <a id="ondestroy"></a>

销毁 Ativity 之前，系统会先调用 [`onDestroy()`](https://developer.android.com/reference/android/app/Activity#onDestroy%28%29)。系统调用此回调的原因如下：

1. Activity 即将结束（由于用户彻底关闭 Activity 或由于系统为 Activity 调用 [`finish()`](https://developer.android.com/reference/android/app/Activity#finish%28%29)），或者
2. 由于配置变更（例如设备旋转或多窗口模式），系统暂时销毁 Activity

当 Activity 进入已销毁状态时，与 Activity 生命周期相关联的所有生命周期感知型组件都将收到 [`ON_DESTROY`](https://developer.android.com/reference/androidx/lifecycle/Lifecycle.Event#ON_DESTROY) 事件。这时，生命周期组件可以在 Activity 被销毁之前清理所需的任何数据。

您应使用 [`ViewModel`](https://developer.android.com/reference/androidx/lifecycle/ViewModel) 对象来包含 Activity 的相关视图数据，而不是在您的 Activity 中加入逻辑来确定 Activity 被销毁的原因。如果因配置变更而重新创建 Activity，ViewModel 不必执行任何操作，因为系统将保留 ViewModel 并将其提供给下一个 Activity 实例。如果不重新创建 Activity，ViewModel 将调用 [`onCleared()`](https://developer.android.com/reference/androidx/lifecycle/ViewModel#onCleared%28%29) 方法，以便在 Activity 被销毁前清除所需的任何数据。

您可以使用 [`isFinishing()`](https://developer.android.com/reference/android/app/Activity#isFinishing%28%29) 方法区分这两种情况。

如果 Activity 即将结束，onDestroy\(\) 是 Activity 收到的最后一个生命周期回调。如果由于配置变更而调用 onDestroy\(\)，系统会立即新建 Activity 实例，然后在新配置中为新实例调用 [`onCreate()`](https://developer.android.com/reference/android/app/Activity#onCreate%28android.os.Bundle%29)。

[`onDestroy()`](https://developer.android.com/reference/android/app/Activity#onDestroy%28%29) 回调应释放先前的回调（例如 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29)）尚未释放的所有资源。

## Activity 状态和从内存中弹出

系统会在需要释放 RAM 时终止进程；系统终止给定进程的可能性取决于当时进程的状态。反之，进程状态取决于在进程中运行的 Activity 的状态。表 1 展示了进程状态、Activity 状态以及系统终止进程的可能性之间的关系。

| 系统终止进程的可能性 | 进程状态 | Activity 状态 |
| :--- | :--- | :--- |
| 较小 | 前台（拥有或即将获得焦点） | 已创建 已开始 已恢复 |
| 较大 | 后台（失去焦点） | 已暂停 |
| 最大 | 后台（不可见） | 已停止 |
| 空 | 已销毁 |  |

表 1. 进程生命周期和 Activity 状态之间的关系

系统永远不会直接终止 Activity 以释放内存，而是会终止 Activity 所在的进程。系统不仅会销毁 Activity，还会销毁在该进程中运行的所有其他内容。如需了解如何在系统启动的进程被终止时保留和恢复 Activity 的界面状态，请参阅[保存和恢复 Activity 状态](https://developer.android.com/guide/components/activities/activity-lifecycle#saras)。

用户还可以使用“设置”下的“应用管理器”来终止进程，以终止相应的应用。

如需详细了解一般进程，请参阅[进程和线程](https://developer.android.com/guide/components/processes-and-threads)。如需详细了解进程生命周期如何与其中 Activity 的状态相关联，请参阅相应页面的[进程生命周期](https://developer.android.com/guide/components/processes-and-threads#Lifecycle)部分。

## 保存和恢复瞬时界面状态

用户期望 Activity 的界面状态在整个配置变更（例如旋转或切换到多窗口模式）期间保持不变。但是，默认情况下，系统会在发生此类配置更改时销毁 Activity，从而清除存储在 Activity 实例中的任何界面状态。同样，如果用户暂时从您的应用切换到其他应用，并在稍后返回您的应用，他们也希望界面状态保持不变。但是，当用户离开应用且您的 Activity 停止时，系统可能会销毁该应用的进程。

当 Activity 因系统限制而被销毁时，您应组合使用 [`ViewModel`](https://developer.android.com/reference/androidx/lifecycle/ViewModel)、[`onSaveInstanceState()`](https://developer.android.com/reference/android/app/Activity#onSaveInstanceState%28android.os.Bundle%29) 和/或本地存储来保留用户的瞬时界面状态。如需详细了解用户期望与系统行为，以及如何在系统启动的 Activity 和进程被终止后最大程度地保留复杂的界面状态数据，请参阅[保存界面状态](https://developer.android.com/topic/libraries/architecture/saving-states)。

本部分概述了实例状态的定义，以及如何实现 onSaveInstance\(\) 方法，该方法是对 Activity 本身的回调。如果界面数据简单且轻量，例如原始数据类型或简单对象（比如 String），您可以单独使用 onSaveInstanceState\(\) 使界面状态在配置更改和系统启动的进程被终止时保持不变。但在大多数情况下，您应使用 ViewModel 和 onSaveInstanceState\(\)（如[ 保存界面状态](https://developer.android.com/topic/libraries/architecture/saving-states)中所述），因为 onSaveInstanceState\(\) 会产生序列化/反序列化费用。

### 实例状态

在某些情况下，您的 Activity 会因正常的应用行为而被销毁，例如当用户按下返回按钮或您的 Activity 通过调用 [`finish()`](https://developer.android.com/reference/android/app/Activity#finish%28%29) 方法发出销毁信号时。当您的 Activity 因用户按下返回按钮或因其自行结束而被销毁时，系统和用户对该 [`Activity`](https://developer.android.com/reference/android/app/Activity) 实例的概念将永远消失。在这些情况下，用户的期望与系统行为相匹配，您无需完成任何额外工作。

但是，如果系统因系统限制（例如配置变更或内存压力）而销毁 Activity，虽然实际的 [`Activity`](https://developer.android.com/reference/android/app/Activity) 实例会消失，但系统会记住它曾经存在过。如果用户尝试回退到该 Activity，系统将使用一组描述 Activity 销毁时状态的已保存数据新建该 Activity 的实例。

系统用于恢复先前状态的已保存数据称为实例状态，是存储在 [`Bundle`](https://developer.android.com/reference/android/os/Bundle) 对象中的键值对集合。默认情况下，系统使用 [`Bundle`](https://developer.android.com/reference/android/os/Bundle) 实例状态来保存 Activity 布局中每个 [`View`](https://developer.android.com/reference/android/view/View) 对象的相关信息（例如在 [`EditText`](https://developer.android.com/reference/android/widget/EditText) 微件中输入的文本值）。这样，如果您的 Activity 实例被销毁并重新创建，布局状态便会恢复为其先前的状态，且您无需编写代码。但是，您的 Activity 可能包含您要恢复的更多状态信息，例如追踪用户在 Activity 中的进程的成员变量。

{% hint style="info" %}
**注意**：为了使 Android 系统恢复 Activity 中视图的状态，每个视图必须具有 `android:id` 属性提供的唯一 ID。
{% endhint %}

[`Bundle`](https://developer.android.com/reference/android/os/Bundle) 对象并不适合保留大量数据，因为它需要在主线程上进行序列化处理并占用系统进程内存。如需保存大量数据，您应组合使用持久性本地存储、[`onSaveInstanceState()`](https://developer.android.com/reference/android/app/Activity#onSaveInstanceState%28android.os.Bundle%29) 方法和 [`ViewModel`](https://developer.android.com/reference/androidx/lifecycle/ViewModel) 类来保存数据，正如[保存界面状态](https://developer.android.com/topic/libraries/architecture/saving-states)中所述。

### 使用 onSaveInstanceState\(\) 保存简单轻量的界面状态

当您的 Activity 开始停止时，系统会调用 [`onSaveInstanceState()`](https://developer.android.com/reference/android/app/Activity#onSaveInstanceState%28android.os.Bundle%29) 方法，以便您的 Activity 可以将状态信息保存到实例状态 Bundle 中。此方法的默认实现保存有关 Activity 视图层次结构状态的瞬时信息，例如 [`EditText`](https://developer.android.com/reference/android/widget/EditText) 微件中的文本或 [`ListView`](https://developer.android.com/reference/android/widget/ListView) 微件的滚动位置。

如需保存 Activity 的其他实例状态信息，您必须替换 [`onSaveInstanceState()`](https://developer.android.com/reference/android/app/Activity#onSaveInstanceState%28android.os.Bundle%29)，并将键值对添加到您的 Activity 意外销毁时事件中所保存的 [`Bundle`](https://developer.android.com/reference/android/os/Bundle) 对象中。替换 onSaveInstanceState\(\) 时，如果您希望默认实现保存视图层次结构的状态，必须调用父类实现。例如：  


```java
static final String STATE_SCORE = "playerScore";
static final String STATE_LEVEL = "playerLevel";
// ...

@Override
public void onSaveInstanceState(Bundle savedInstanceState) {
    // Save the user's current game state
    savedInstanceState.putInt(STATE_SCORE, currentScore);
    savedInstanceState.putInt(STATE_LEVEL, currentLevel);

    // Always call the superclass so it can save the view hierarchy state
    super.onSaveInstanceState(savedInstanceState);
}
```

{% hint style="info" %}
**注意**：当用户显式关闭 Activity 时，或者在其他情况下调用 `finish()` 时，系统不会调用 [`onSaveInstanceState()`](https://developer.android.com/reference/android/app/Activity#onSaveInstanceState%28android.os.Bundle%29)。
{% endhint %}

  
如需保存持久性数据（例如用户首选项或数据库中的数据），您应在 Activity 位于前台时抓住合适机会。如果没有这样的时机，您应在执行 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29) 方法期间保存此类数据。

### 使用保存的实例状态恢复 Activity 界面状态

重建先前被销毁的 Activity 后，您可以从系统传递给 Activity 的 [`Bundle`](https://developer.android.com/reference/android/os/Bundle) 中恢复保存的实例状态。[`onCreate()`](https://developer.android.com/reference/android/app/Activity#onCreate%28android.os.Bundle%29) 和 [`onRestoreInstanceState()`](https://developer.android.com/reference/android/app/Activity#onRestoreInstanceState%28android.os.Bundle%29) 回调方法均会收到包含实例状态信息的相同 [`Bundle`](https://developer.android.com/reference/android/os/Bundle)。

因为无论系统是新建 Activity 实例还是重新创建之前的实例，都会调用 [`onCreate()`](https://developer.android.com/reference/android/app/Activity#onCreate%28android.os.Bundle%29) 方法，所以在尝试读取之前，您必须检查状态 Bundle 是否为 null。如果为 null，系统将新建 Activity 实例，而不会恢复之前销毁的实例。

例如，以下代码段显示如何在 [`onCreate()`](https://developer.android.com/reference/android/app/Activity#onCreate%28android.os.Bundle%29) 中恢复某些状态数据：  


```java
@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState); // Always call the superclass first

    // Check whether we're recreating a previously destroyed instance
    if (savedInstanceState != null) {
        // Restore value of members from saved state
        currentScore = savedInstanceState.getInt(STATE_SCORE);
        currentLevel = savedInstanceState.getInt(STATE_LEVEL);
    } else {
        // Probably initialize members with default values for a new instance
    }
    // ...
}
```

您可以选择实现系统在 [`onStart()`](https://developer.android.com/reference/android/app/Activity#onStart%28%29) 方法之后调用的 [`onRestoreInstanceState()`](https://developer.android.com/reference/android/app/Activity#onRestoreInstanceState%28android.os.Bundle%29)，而不是在 [`onCreate()`](https://developer.android.com/reference/android/app/Activity#onCreate%28android.os.Bundle%29) 期间恢复状态。仅当存在要恢复的已保存状态时，系统才会调用 [`onRestoreInstanceState()`](https://developer.android.com/reference/android/app/Activity#onRestoreInstanceState%28android.os.Bundle%29)，因此您无需检查 [`Bundle`](https://developer.android.com/reference/android/os/Bundle) 是否为 null：  


```java
public void onRestoreInstanceState(Bundle savedInstanceState) {
    // Always call the superclass so it can restore the view hierarchy
    super.onRestoreInstanceState(savedInstanceState);

    // Restore state members from saved instance
    currentScore = savedInstanceState.getInt(STATE_SCORE);
    currentLevel = savedInstanceState.getInt(STATE_LEVEL);
}
```

{% hint style="info" %}
注意：您应始终调用 [`onRestoreInstanceState()`](https://developer.android.com/reference/android/app/Activity#onRestoreInstanceState%28android.os.Bundle%29) 的父类实现，以便默认实现可以恢复视图层次结构的状态。
{% endhint %}

## 在 Activity 之间导航

在应用的生命周期中，应用很可能会多次进入和退出 Activity。例如，用户可以点按设备的返回按钮，或者 Activity 可能需要启动不同的 Activity。本部分介绍了实现成功的 Activity 转换需要了解的主题。这些主题包括从另一个 Activity 启动 Activity、保存 Activity 状态，以及恢复 Activity 状态。

### 从一个 Activity 启动另一个 Activity

Activity 通常需要在某个时刻启动另一个 Activity。例如，当应用需要从当前屏幕移动到新屏幕时，就会出现这种需求。

根据您的 Activity 是否希望从即将启动的新 Activity 中获取返回结果，您可以使用 [`startActivity()`](https://developer.android.com/reference/android/app/Activity#startActivity%28android.content.Intent,%20android.os.Bundle%29) 或 [`startActivityForResult()`](https://developer.android.com/reference/android/app/Activity#startActivityForResult%28android.content.Intent,%20int%29) 方法启动新 Activity。这两种方法都需要传入一个 [`Intent`](https://developer.android.com/reference/android/content/Intent) 对象。

[`Intent`](https://developer.android.com/reference/android/content/Intent) 对象指定您要启动的具体 Activity，或描述您要执行的操作类型（系统为您选择相应的 Activity，该 Activity 甚至可以来自不同应用）。[`Intent`](https://developer.android.com/reference/android/content/Intent) 对象还可以携带由已启动的 Activity 使用的少量数据。如需详细了解 [`Intent`](https://developer.android.com/reference/android/content/Intent) 类，请参阅 [Intent 和 Intent 过滤器](https://developer.android.com/guide/components/intents-filters)。

#### **startActivity\(\)**

如果新启动的 Activity 不需要返回结果，当前 Activity 可以通过调用 [`startActivity()`](https://developer.android.com/reference/android/app/Activity#startActivity%28android.content.Intent,%20android.os.Bundle%29) 方法来启动它。

在自己的应用中工作时，您通常只需启动已知 Activity。例如，以下代码段显示如何启动一个名为 `SignInActivity` 的 Activity。

```java
Intent intent = new Intent(this, SignInActivity.class);
startActivity(intent);
```

您的应用可能还希望使用 Activity 中的数据执行某些操作，例如发送电子邮件、短信或状态更新。在这种情况下，您的应用自身可能不具有执行此类操作所需的 Activity，因此您可以改为利用设备上其他应用提供的 Activity 为您执行这些操作。这便是 intent 的真正价值所在。您可以创建一个 intent，对您想执行的操作进行描述，系统会从其他应用启动相应的 Activity。如果有多个 Activity 可以处理 intent，用户可以选择要使用哪一个。例如，如果您想允许用户发送电子邮件，可以创建以下 intent：

```java
Intent intent = new Intent(Intent.ACTION_SEND);
intent.putExtra(Intent.EXTRA_EMAIL, recipientArray);
startActivity(intent);
```

添加到 intent 中的 `EXTRA_EMAIL` extra 是一个字符串数组，其中包含电子邮件的收件人电子邮件地址。当电子邮件应用响应此 intent 时，该应用会读取 extra 中提供的字符串数组，并将该数组放入电子邮件撰写表单的“收件人”字段。在这种情况下，电子邮件应用的 Activity 会启动，并且当用户完成操作时，您的 Activity 会继续运行。

**startActivityForResult\(\)**

有时，您会希望在 Activity 结束时从 Activity 中获取返回结果。例如，您可以启动一项 Activity，让用户在联系人列表中选择收件人；当 Activity 结束时，系统将返回用户选择的收件人。为此，您可以调用 [`startActivityForResult(Intent, int)`](https://developer.android.com/reference/android/app/Activity#startActivityForResult%28android.content.Intent,%20int%29) 方法，其中整数参数会标识该调用。此标识符用于消除来自同一 Activity 的多次 [`startActivityForResult(Intent, int)`](https://developer.android.com/reference/android/app/Activity#startActivityForResult%28android.content.Intent,%20int%29) 调用之间的歧义。这不是全局标识符，不存在与其他应用或 Activity 冲突的风险。结果通过 [`onActivityResult(int, int, Intent)`](https://developer.android.com/reference/android/app/Activity#onActivityResult%28int,%20int,%20android.content.Intent%29) 方法返回。

当子级 Activity 退出时，它可以调用 `setResult(int)` 将数据返回到其父级。子级 Activity 必须始终提供结果代码，该结果代码可以是标准结果 `RESULT_CANCELED`、`RESULT_OK`，也可以是从 `RESULT_FIRST_USER` 开始的任何自定义值。此外，子级 Activity 可以根据需要返回包含它所需的任何其他数据的 [`Intent`](https://developer.android.com/reference/android/content/Intent) 对象。父级 Activity 使用 [`onActivityResult(int, int, Intent)`](https://developer.android.com/reference/android/app/Activity#onActivityResult%28int,%20int,%20android.content.Intent%29) 方法，以及父级 Activity 最初提供的整数标识符来接收信息。

如果子级 Activity 由于任何原因（例如崩溃）而失败，父级 Activity 将收到代码为 `RESULT_CANCELED` 的结果。

```java
public class MyActivity extends Activity {
     // ...

     static final int PICK_CONTACT_REQUEST = 0;

     public boolean onKeyDown(int keyCode, KeyEvent event) {
         if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER) {
             // When the user center presses, let them pick a contact.
             startActivityForResult(
                 new Intent(Intent.ACTION_PICK,
                 new Uri("content://contacts")),
                 PICK_CONTACT_REQUEST);
            return true;
         }
         return false;
     }

     protected void onActivityResult(int requestCode, int resultCode,
             Intent data) {
         if (requestCode == PICK_CONTACT_REQUEST) {
             if (resultCode == RESULT_OK) {
                 // A contact was picked.  Here we will just display it
                 // to the user.
                 startActivity(new Intent(Intent.ACTION_VIEW, data));
             }
         }
     }
 }
```

**协调 Activity**

当一个 Activity 启动另一个 Activity 时，它们都会经历生命周期转换。第一个 Activity 停止运行并进入“已暂停”或“已停止”状态，同时创建另一个 Activity。如果这些 Activity 共享保存到磁盘或其他位置的数据，必须要明确第一个 Activity 在创建第二个 Activity 之前并未完全停止。相反，启动第二个 Activity 的过程与停止第一个 Activity 的过程重叠。

生命周期回调的顺序已有明确定义，**特别是当两个 Activity 在同一个进程（应用）中，并且其中一个要启动另一个时。以下是 Activity A 启动 Activity B 时的操作发生顺序**：

1. Activity A 的 [`onPause()`](https://developer.android.com/reference/android/app/Activity#onPause%28%29) 方法执行。
2. Activity B 的 [`onCreate()`](https://developer.android.com/reference/android/app/Activity#onCreate%28android.os.Bundle%29)、[`onStart()`](https://developer.android.com/reference/android/app/Activity#onStart%28%29) 和 [`onResume()`](https://developer.android.com/reference/android/app/Activity#onResume%28%29) 方法依次执行（Activity B 现在具有用户焦点）。
3. 然后，如果 Activity A 在屏幕上不再显示，其 [`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29) 方法执行。

您可以利用这种可预测的生命周期回调顺序管理从一个 Activity 到另一个 Activity 的信息转换。

## 了解任务和返回堆栈

任务是用户在执行某项工作时与之互动的一系列 `Activity` 的集合。这些 Activity 按照每个 Activity 打开的顺序排列在一个返回堆栈中。例如，电子邮件应用可能有一个 `Activity` 来显示新邮件列表。当用户选择一封邮件时，系统会打开一个新的 `Activity` 来显示该邮件。这个新的 `Activity` 会添加到返回堆栈中。如果用户按**返回**按钮，这个新的 `Activity` 即会完成并从堆栈中退出。通过以下视频可以大致了解返回堆栈的工作原理。

{% embed url="https://youtu.be/MvIlVsXxXmY" %}



Android 7.0（API 级别 24）及更高版本支持[多窗口环境](https://developer.android.com/guide/topics/ui/multi-window)，当应用在这种环境中同时运行时，系统会单独管理每个窗口的任务；而每个窗口可能包含多项任务。[在 Chromebook 上运行的 Android 应用](https://developer.android.com/topic/arc)也是如此：系统按窗口管理任务或任务组。

大多数任务都从设备主屏幕上启动。当用户轻触应用启动器中的图标（或主屏幕上的快捷方式）时，该应用的任务就会转到前台运行。如果该应用没有任务存在（应用最近没有使用过），则会创建一个新的任务，并且该应用的“主”Activity 将会作为堆栈的根 Activity 打开。

在当前 Activity 启动另一个 Activity 时，新的 Activity 将被推送到堆栈顶部并获得焦点。上一个 Activity 仍保留在堆栈中，但会停止。当 Activity 停止时，系统会保留其界面的当前状态。当用户按**返回**按钮时，当前 Activity 会从堆栈顶部退出（该 Activity 销毁），上一个 Activity 会恢复（界面会恢复到上一个状态）。堆栈中的 Activity 永远不会重新排列，只会被送入和退出，在当前 Activity 启动时被送入堆栈，在用户使用**返回**按钮离开时从堆栈中退出。因此，返回堆栈按照“后进先出”的对象结构运作。图 1 借助一个时间轴直观地显示了这种行为。该时间轴显示了 Activity 之间的进展以及每个时间点的当前返回堆栈。  


![](../.gitbook/assets/image%20%2848%29.png)

如果用户继续按**返回**，则堆栈中的 Activity 会逐个退出，以显示前一个 Activity，直到用户返回到主屏幕（或任务开始时运行的 Activity）。移除堆栈中的所有 Activity 后，该任务将不复存在。

任务是一个整体单元，当用户开始一个新任务或通过主屏幕按钮进入主屏幕时，任务可移至“后台”。在后台时，任务中的所有 Activity 都会停止，但任务的返回堆栈会保持不变，当其他任务启动时，当前任务只是失去了焦点，如图 2 所示。这样一来，任务就可以返回到“前台”，以便用户可以从他们离开的地方继续操作。举例来说，假设当前任务（任务 A）的堆栈中有 3 个 Activity，当前 Activity 下有 2 个 Activity。用户按主屏幕按钮，然后从应用启动器中启动新应用。主屏幕出现后，任务 A 转到后台。当新应用启动时，系统会启动该应用的任务（任务 B），该任务具有自己的 Activity 堆栈。与该应用互动后，用户再次返回到主屏幕并选择最初启动任务 A 的应用。现在，任务 A 进入前台，其堆栈中的所有三个 Activity 都完好如初，堆栈顶部的 Activity 恢复运行。此时，用户仍可通过以下方式切换到任务 B：转到主屏幕并选择启动该任务的应用图标（或者从[**最近使用的应用**屏幕中](https://developer.android.com/guide/components/recents)选择该应用的任务）。这就是在 Android 上进行多任务处理的一个例子。  


![](../.gitbook/assets/image%20%2845%29.png)

{% hint style="info" %}
**注意**：多个任务可以同时在后台进行。但是，如果用户同时运行很多后台任务，系统可能会为了恢复内存而开始销毁后台 Activity，导致 Activity 状态丢失。
{% endhint %}



由于返回堆栈中的 Activity 不会被重新排列，如果您的应用允许用户从多个 Activity 启动特定的 Activity，系统便会创建该 Activity 的新实例并将其推送到堆栈中（而不是将该 Activity 的某个先前的实例移至堆栈顶部）。这样一来，应用中的一个 Activity 就可能被多次实例化（甚至是从其他任务对其进行实例化），如图 3 所示。因此，如果用户使用**返回**按钮向后导航，Activity 的每个实例将按照它们被打开的顺序显示出来（每个实例都有自己的界面状态）。不过，如果您不希望某个 Activity 被实例化多次，可以修改此行为。有关如何实现此操作，将在后面的[管理任务](https://developer.android.com/guide/components/activities/tasks-and-back-stack#ManagingTasks)部分中讨论。

Activity 和任务的默认行为总结如下：

* 当 Activity A 启动 Activity B 时，Activity A 会停止，但系统会保留其状态（例如滚动位置和输入到表单中的文本）。如果用户在 Activity B 中按**返回**按钮，系统会恢复 Activity A 及其状态。
* 当用户通过按主屏幕按钮离开任务时，当前 Activity 会停止，其任务会转到后台。系统会保留任务中每个 Activity 的状态。如果用户稍后通过点按该任务的启动器图标来恢复该任务，该任务会进入前台并恢复堆栈顶部的 Activity。
* 如果用户按**返回**按钮，当前 Activity 将从堆栈中退出并销毁。堆栈中的上一个 Activity 将恢复。Activity 被销毁后，系统不会保留该 Activity 的状态。
* Activity 可以多次实例化，甚至是从其他任务对其进行实例化。

![](../.gitbook/assets/image%20%2846%29.png)

{% hint style="info" %}
**导航设计**

要详细了解 Android 上的应用导航如何运作，请参阅 Android 设计中的[导航](https://developer.android.com/design/patterns/navigation)指南。
{% endhint %}

## 管理任务

如上文所述，`Android` 管理任务和返回堆栈的方式是将所有接连启动的 Activity 放到同一任务和一个“后进先出”堆栈中，这对于大多数应用都很有效，而且您不必担心 Activity 如何与任务相关联，或者它们如何存在于返回堆栈中。不过，您可能需要决定是否要打破正常行为。或许您希望应用中的某个 Activity 在启动时开启一个新的任务（而不是被放入当前的任务中），或者当您启动某个 Activity 时，您希望调用它的一个现有实例（而不是在返回堆栈顶部创建一个新实例），或者您希望在用户离开任务时清除返回堆栈中除根 Activity 以外的所有 Activity。

您可以借助 [`<activity>`](https://developer.android.com/guide/topics/manifest/activity-element) 清单元素中的属性以及您传递给 [`startActivity()`](https://developer.android.com/reference/android/app/Activity#startActivity%28android.content.Intent%29) 的 intent 中的标记来实现上述目的。

在这方面，您可以使用的主要 [`<activity>`](https://developer.android.com/guide/topics/manifest/activity-element) 属性包括：

* [`taskAffinity`](https://developer.android.com/guide/topics/manifest/activity-element#aff)
* [`launchMode`](https://developer.android.com/guide/topics/manifest/activity-element#lmode)
* [`allowTaskReparenting`](https://developer.android.com/guide/topics/manifest/activity-element#reparent)
* [`clearTaskOnLaunch`](https://developer.android.com/guide/topics/manifest/activity-element#clear)
* [`alwaysRetainTaskState`](https://developer.android.com/guide/topics/manifest/activity-element#always)
* [`finishOnTaskLaunch`](https://developer.android.com/guide/topics/manifest/activity-element#finish)

您可以使用的主要 intent 标记包括：

* [`FLAG_ACTIVITY_NEW_TASK`](https://developer.android.com/reference/android/content/Intent#FLAG_ACTIVITY_NEW_TASK)
* [`FLAG_ACTIVITY_CLEAR_TOP`](https://developer.android.com/reference/android/content/Intent#FLAG_ACTIVITY_CLEAR_TOP)
* [`FLAG_ACTIVITY_SINGLE_TOP`](https://developer.android.com/reference/android/content/Intent#FLAG_ACTIVITY_SINGLE_TOP)

在下面几节中，您将了解到如何使用这些清单属性和 intent 标记来定义 Activity 与任务之间的关联方式，以及它们在返回堆栈中的行为。

另外，下面还分别介绍了如何在**最近使用的应用**屏幕中表示和管理任务与 Activity。有关详情，请参阅[“最近使用的应用”屏幕](https://developer.android.com/guide/components/recents)。通常，您应允许系统定义任务和 Activity 在**最近使用的应用**屏幕中的表示方式，您无需修改此行为。

{% hint style="info" %}
**注意**：大多数应用不应打破 Activity 和任务的默认行为。如果您确定需要让 Activity 改变默认行为，请谨慎操作，并且务必要测试该 Activity 在以下情况下的可用性：启动期间以及您通过**返回**按钮从其他 Activity 和任务返回该 Activity 时。务必要测试是否存在可能与用户预期的行为冲突的导航行为。
{% endhint %}

### 定义启动模式

您可以通过启动模式定义 Activity 的新实例如何与当前任务关联。您可以通过两种方式定义不同的启动模式：

* [使用清单文件](https://developer.android.com/guide/components/activities/tasks-and-back-stack#ManifestForTasks)

  当您在清单文件中声明 Activity 时，您可以指定该 Activity 在启动时如何与任务关联。

* [使用 Intent 标记](https://developer.android.com/guide/components/activities/tasks-and-back-stack#IntentFlagsForTasks)

  当您调用 [`startActivity()`](https://developer.android.com/reference/android/app/Activity#startActivity%28android.content.Intent%29) 时，可以在 [`Intent`](https://developer.android.com/reference/android/content/Intent) 中添加一个标记，用于声明新 Activity 如何（或是否）与当前任务相关联。

因此，如果 Activity A 启动 Activity B，Activity B 可在其清单中定义如何与当前任务相关联（如果关联的话），Activity A 也可以请求 Activity B 应该如何与当前任务关联。如果两个 Activity 都定义了 Activity B 应如何与任务关联，将优先遵循 Activity A 的请求（在 intent 中定义），而不是 Activity B 的请求（在清单中定义）。

{% hint style="info" %}
**注意**：有些启动模式可通过清单文件定义，但不能通过 intent 标记定义，同样，有些启动模式可通过 intent 标记定义，却不能在清单中定义。
{% endhint %}

**使用清单文件**

在清单文件中声明 Activity 时，可以使用 [`<activity>`](https://developer.android.com/guide/topics/manifest/activity-element) 元素的 [`launchMode`](https://developer.android.com/guide/topics/manifest/activity-element#lmode) 属性指定 Activity 应该如何与任务关联。

[`launchMode`](https://developer.android.com/guide/topics/manifest/activity-element#lmode) 属性说明了 Activity 应如何启动到任务中。您可以为 [`launchMode`](https://developer.android.com/guide/topics/manifest/activity-element#lmode) 属性指定 4 种不同的启动模式：

\`\`

`"standard"`（默认模式）默认值。系统在启动该 Activity 的任务中创建 Activity 的新实例，并将 intent 传送给该实例。Activity 可以多次实例化，每个实例可以属于不同的任务，一个任务可以拥有多个实例。

`"singleTop"`如果当前任务的顶部已存在 Activity 的实例，则系统会通过调用其 [`onNewIntent()`](https://developer.android.com/reference/android/app/Activity#onNewIntent%28android.content.Intent%29) 方法来将 intent 转送给该实例，而不是创建 Activity 的新实例。Activity 可以多次实例化，每个实例可以属于不同的任务，一个任务可以拥有多个实例（但前提是返回堆栈顶部的 Activity 不是该 Activity 的现有实例）。

例如，假设任务的返回堆栈包含根 Activity A 以及 Activity B、C 和位于顶部的 D（堆栈为 A-B-C-D；D 位于顶部）。收到以 D 类型 Activity 为目标的 intent。如果 D 采用默认的 `"standard"` 启动模式，则会启动该类的新实例，并且堆栈将变为 A-B-C-D-D。但是，如果 D 的启动模式为 `"singleTop"`，则 D 的现有实例会通过 [`onNewIntent()`](https://developer.android.com/reference/android/app/Activity#onNewIntent%28android.content.Intent%29) 接收 intent，因为它位于堆栈顶部，堆栈仍为 A-B-C-D。但是，如果收到以 B 类型 Activity 为目标的 intent，则会在堆栈中添加 B 的新实例，即使其启动模式为 `"singleTop"` 也是如此。

{% hint style="info" %}
**注意**：创建 Activity 的新实例后，用户可以按**返回**按钮返回到上一个 Activity。但是，当由 Activity 的现有实例处理新 intent 时，用户将无法通过按**返回**按钮返回到 [`onNewIntent()`](https://developer.android.com/reference/android/app/Activity#onNewIntent%28android.content.Intent%29) 收到新 intent 之前的 Activity 状态。
{% endhint %}

`"singleTask"`系统会创建新任务，并实例化新任务的根 Activity。但是，如果另外的任务中已存在该 Activity 的实例，则系统会通过调用其 [`onNewIntent()`](https://developer.android.com/reference/android/app/Activity#onNewIntent%28android.content.Intent%29) 方法将 intent 转送到该现有实例，而不是创建新实例。Activity 一次只能有一个实例存在。

{% hint style="info" %}
**注意**：虽然 Activity 在新任务中启动，但用户按**返回**按钮仍会返回到上一个 Activity。
{% endhint %}

`"singleInstance"`与 `"singleTask"` 相似，唯一不同的是系统不会将任何其他 Activity 启动到包含该实例的任务中。该 Activity 始终是其任务唯一的成员；由该 Activity 启动的任何 Activity 都会在其他的任务中打开。  
再举个例子，Android 浏览器应用在 [`<activity>`](https://developer.android.com/guide/topics/manifest/activity-element) 元素中指定 `singleTask` 启动模式，由此声明网络浏览器 Activity 应始终在它自己的任务中打开。这意味着，如果您的应用发出打开 Android 浏览器的 intent，系统不会将其 Activity 置于您的应用所在的任务中，而是会为浏览器启动一个新任务，如果浏览器已经有任务在后台运行，则会将该任务转到前台来处理新 intent。

无论 Activity 是在新任务中启动的，还是在和启动它的 Activity 相同的任务中启动，用户按**返回**按钮都会回到上一个 Activity。但是，如果您启动了指定 `singleTask` 启动模式的 Activity，而后台任务中已存在该 Activity 的实例，则系统会将该后台任务整个转到前台运行。此时，返回堆栈包含了转到前台的任务中的所有 Activity，这些 Activity 都位于堆栈的顶部。图 4 展示了具体的情景。

![](../.gitbook/assets/image%20%2843%29.png)

要详细了解如何在清单文件中设置启动模式，请参阅 [`<activity>`](https://developer.android.com/guide/topics/manifest/activity-element) 元素的说明文档，里面详细介绍了 `launchMode` 属性和可接受的值。

{% hint style="info" %}
**注意**：您通过 [`launchMode`](https://developer.android.com/guide/topics/manifest/activity-element#lmode) 属性为 Activity 指定的行为，可被启动 Activity 的 intent 所包含的标记替换。下一节将对此进行介绍。
{% endhint %}

**使用 Intent 标记**

启动 Activity 时，您可以在传送给 [`startActivity()`](https://developer.android.com/reference/android/app/Activity#startActivity%28android.content.Intent%29) 的 intent 中添加相应的标记来修改 Activity 与其任务的默认关联。您可以使用以下标记来修改默认行为：

  
[`FLAG_ACTIVITY_NEW_TASK`](https://developer.android.com/reference/android/content/Intent#FLAG_ACTIVITY_NEW_TASK)在新任务中启动 Activity。如果您现在启动的 Activity 已经有任务在运行，则系统会将该任务转到前台并恢复其最后的状态，而 Activity 将在 [`onNewIntent()`](https://developer.android.com/reference/android/app/Activity#onNewIntent%28android.content.Intent%29) 中收到新的 intent。这与上一节中介绍的 `"singleTask"` [`launchMode`](https://developer.android.com/guide/topics/manifest/activity-element#lmode) 值产生的行为相同。



[`FLAG_ACTIVITY_SINGLE_TOP`](https://developer.android.com/reference/android/content/Intent#FLAG_ACTIVITY_SINGLE_TOP)如果要启动的 Activity 是当前 Activity（即位于返回堆栈顶部的 Activity），则现有实例会收到对 [`onNewIntent()`](https://developer.android.com/reference/android/app/Activity#onNewIntent%28android.content.Intent%29) 的调用，而不会创建 Activity 的新实例。这与上一节中介绍的 `"singleTop"` [`launchMode`](https://developer.android.com/guide/topics/manifest/activity-element#lmode) 值产生的行为相同。

[`FLAG_ACTIVITY_CLEAR_TOP`](https://developer.android.com/reference/android/content/Intent#FLAG_ACTIVITY_CLEAR_TOP)如果要启动的 Activity 已经在当前任务中运行，则不会启动该 Activity 的新实例，而是会销毁位于它之上的所有其他 Activity，并通过 [`onNewIntent()`](https://developer.android.com/reference/android/app/Activity#onNewIntent%28android.content.Intent%29) 将此 intent 传送给它的已恢复实例（现在位于堆栈顶部）。[`launchMode`](https://developer.android.com/guide/topics/manifest/activity-element#lmode) 属性没有可产生此行为的值。

`FLAG_ACTIVITY_CLEAR_TOP` 最常与 `FLAG_ACTIVITY_NEW_TASK` 结合使用。将这两个标记结合使用，可以查找其他任务中的现有 Activity，并将其置于能够响应 intent 的位置。

{% hint style="info" %}
**注意**：如果指定 Activity 的启动模式为 `"standard"`，系统也会将其从堆栈中移除，并在它的位置启动一个新实例来处理传入的 intent。这是因为当启动模式为 `"standard"` 时，始终会为新 intent 创建新的实例。
{% endhint %}

### 处理亲和性

“亲和性”表示 Activity 倾向于属于哪个任务。默认情况下，同一应用中的所有 Activity 彼此具有亲和性。因此，在默认情况下，同一应用中的所有 Activity 都倾向于位于同一任务。不过，您可以修改 Activity 的默认亲和性。在不同应用中定义的 Activity 可以具有相同的亲和性，或者在同一应用中定义的 Activity 也可以被指定不同的任务亲和性。

您可以使用 [`<activity>`](https://developer.android.com/guide/topics/manifest/activity-element) 元素的 [`taskAffinity`](https://developer.android.com/guide/topics/manifest/activity-element#aff) 属性修改任何给定 Activity 的亲和性。

[`taskAffinity`](https://developer.android.com/guide/topics/manifest/activity-element#aff) 属性采用字符串值，该值必须不同于 [`<manifest>`](https://developer.android.com/guide/topics/manifest/manifest-element) 元素中声明的默认软件包名称，因为系统使用该名称来标识应用的默认任务亲和性。

亲和性可在两种情况下发挥作用：

* 当启动 Activity 的 intent 包含 [`FLAG_ACTIVITY_NEW_TASK`](https://developer.android.com/reference/android/content/Intent#FLAG_ACTIVITY_NEW_TASK) 标记时。

  默认情况下，新 Activity 会启动到调用 [`startActivity()`](https://developer.android.com/reference/android/app/Activity#startActivity%28android.content.Intent%29) 的 Activity 的任务中。它会被推送到调用方 Activity 所在的返回堆栈中。但是，如果传递给 [`startActivity()`](https://developer.android.com/reference/android/app/Activity#startActivity%28android.content.Intent%29) 的 intent 包含 [`FLAG_ACTIVITY_NEW_TASK`](https://developer.android.com/reference/android/content/Intent#FLAG_ACTIVITY_NEW_TASK) 标记，则系统会寻找其他任务来容纳新 Activity。通常会是一个新任务，但也可能不是。如果已存在与新 Activity 具有相同亲和性的现有任务，则会将 Activity 启动到该任务中。如果不存在，则会启动一个新任务。

  如果此标记导致 Activity 启动一个新任务，而用户按下主屏幕按钮离开该任务，则必须为用户提供某种方式来返回到该任务。有些实体（例如通知管理器）总是在外部任务中启动 Activity，而不在它们自己的任务中启动，因此它们总是将 `FLAG_ACTIVITY_NEW_TASK` 添加到传递给 [`startActivity()`](https://developer.android.com/reference/android/app/Activity#startActivity%28android.content.Intent%29) 的 intent 中。如果您的 Activity 可由外部实体调用，而该实体可能使用此标记，请注意用户可以通过一种独立的方式返回到所启动的任务，例如使用启动器图标（任务的根 Activity 具有一个 [`CATEGORY_LAUNCHER`](https://developer.android.com/reference/android/content/Intent#CATEGORY_LAUNCHER) intent 过滤器；请参阅下面的[启动任务](https://developer.android.com/guide/components/activities/tasks-and-back-stack#Starting)部分）。

* 当 Activity 的 [`allowTaskReparenting`](https://developer.android.com/guide/topics/manifest/activity-element#reparent) 属性设为 `"true"` 时。

  在这种情况下，一旦和 Activity 有亲和性的任务进入前台运行，Activity 就可从其启动的任务转移到该任务。

  举例来说，假设一款旅行应用中定义了一个报告特定城市天气状况的 Activity。该 Activity 与同一应用中的其他 Activity 具有相同的亲和性（默认应用亲和性），并通过此属性支持重新归属。当您的某个 Activity 启动该天气预报 Activity 时，该天气预报 Activity 最初会和您的 Activity 同属于一个任务。不过，当旅行应用的任务进入前台运行时，该天气预报 Activity 就会被重新分配给该任务并显示在其中。

{% hint style="info" %}
**提示**：如果一个 APK 文件中包含了就用户角度而言的多个“应用”，您可能需要使用 [`taskAffinity`](https://developer.android.com/guide/topics/manifest/activity-element#aff) 属性为每个“应用”所关联的 Activity 指定不同的亲和性。
{% endhint %}

### 清除返回堆栈

如果用户离开任务较长时间，系统会清除任务中除根 Activity 以外的所有 Activity。当用户再次返回到该任务时，只有根 Activity 会恢复。系统之所以采取这种行为方式是因为，经过一段时间后，用户可能已经放弃了之前执行的操作，现在返回任务是为了开始某项新的操作。

您可以使用一些 Activity 属性来修改此行为：

[`alwaysRetainTaskState`](https://developer.android.com/guide/topics/manifest/activity-element#always)如果在任务的根 Activity 中将该属性设为 `"true"`，则不会发生上述默认行为。即使经过很长一段时间后，任务仍会在其堆栈中保留所有 Activity。

[`clearTaskOnLaunch`](https://developer.android.com/guide/topics/manifest/activity-element#clear)如果在任务的根 Activity 中将该属性设为 `"true"`，那么只要用户离开任务再返回，堆栈就会被清除到只剩根 Activity。也就是说，它与 [`alwaysRetainTaskState`](https://developer.android.com/guide/topics/manifest/activity-element#always) 正好相反。用户始终会返回到任务的初始状态，即便只是短暂离开任务也是如此。

[`finishOnTaskLaunch`](https://developer.android.com/guide/topics/manifest/activity-element#finish)该属性与 [`clearTaskOnLaunch`](https://developer.android.com/guide/topics/manifest/activity-element#clear) 类似，但它只会作用于单个 Activity 而非整个任务。它还可导致任何 Activity 消失，包括根 Activity。如果将该属性设为 `"true"`，则 Activity 仅在当前会话中归属于任务。如果用户离开任务再返回，则该任务将不再存在。

### 启动任务

您可以设置一个 Activity 作为任务的入口点，方法是为该 Activity 提供一个 intent 过滤器，并将 `"android.intent.action.MAIN"` 作为指定操作，将 `"android.intent.category.LAUNCHER"` 作为指定类别。例如：

```markup
    <activity ... >
        <intent-filter ... >
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
        ...
    </activity>
```

这种 intent 过滤器可在应用启动器中显示 Activity 的图标和标签，让用户可以启动 Activity 并在启动后随时返回到该 Activity 创建的任务。

第二个作用非常重要：用户必须能够离开任务，之后再使用此 Activity 启动器返回到该任务。因此，只有当 Activity 具有 [`ACTION_MAIN`](https://developer.android.com/reference/android/content/Intent#ACTION_MAIN) 和 [`CATEGORY_LAUNCHER`](https://developer.android.com/reference/android/content/Intent#CATEGORY_LAUNCHER) 过滤器时，才应使用 `"singleTask"` 和 `"singleInstance"` 这两种启动模式，它们会将 Activity 标记为始终启动任务。比如，可以想象一下，如果缺少该过滤器会发生什么情况：intent 会启动 `"singleTask"` Activity，随之启动新任务，用户花了一些时间在该任务上。然后，用户按主屏幕按钮。此时，该任务会转到后台，不再可见。现在，用户无法返回到该任务，因为它未显示在应用启动器中。

对于那些您不希望用户能够返回到 Activity 的情况，请将 [`<activity>`](https://developer.android.com/guide/topics/manifest/activity-element) 元素的 [`finishOnTaskLaunch`](https://developer.android.com/guide/topics/manifest/activity-element#finish) 设置为 `"true"`（请参阅[清除返回堆栈](https://developer.android.com/guide/components/activities/tasks-and-back-stack#Clearing)）。

如需详细了解如何在**概览**屏幕中显示和管理任务及 Activity，请参阅[“最近使用的应用”屏幕](https://developer.android.com/guide/components/activities/recents)。





## 参考

* [Activities](https://developer.android.com/guide/components/activities/index.html)
* [管理 Activity 生命周期](https://developer.android.com/training/basics/activity-lifecycle/index.html)
* [Understand Android Activity's launchMode: standard, singleTop, singleTask and singleInstance](https://inthecheesefactory.com/blog/understand-android-activity-launchmode/en)
* [Activity的四种launchMode](http://blog.csdn.net/liuhe688/article/details/6754323)
* [Activity的task相关](http://blog.csdn.net/liuhe688/article/details/6761337)
* [处理运行时变更](https://developer.android.com/guide/topics/resources/runtime-changes.html)
* [dumpsys命令用法](http://gityuan.com/2016/05/14/dumpsys-command/)

