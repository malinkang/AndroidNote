# 了解 Activity 生命周期



当用户浏览、退出和返回到您的应用时，您应用中的 [`Activity`](https://developer.android.com/reference/android/app/Activity) 实例会在其生命周期的不同状态间转换。[`Activity`](https://developer.android.com/reference/android/app/Activity) 类会提供许多回调，这些回调会让 Activity 知晓某个状态已经更改：系统正在创建、停止或恢复某个 Activity，或者正在销毁该 Activity 所在的进程。

在生命周期回调方法中，您可以声明用户离开和再次进入 Activity 时 Activity 的行为方式。例如，如果您正构建流媒体视频播放器，当用户切换至另一应用时，您可能要暂停视频或终止网络连接。当用户返回时，您可以重新连接网络并允许用户从同一位置继续播放视频。换言之，每个回调都支持您执行适合给定状态变更的特定作业。在合适的时间执行正确的作业，并妥善处理转换，这将提升应用的稳健性和性能。例如，良好的生命周期回调实现有助于防止应用出现以下问题：

* 当用户在使用应用时接听来电，或切换至另一应用时崩溃。
* 当用户未主动使用它时，消耗宝贵的系统资源。
* 当用户离开应用并在稍后返回时，丢失用户的进度。
* 当屏幕在横向和纵向之间旋转时，崩溃或丢失用户的进度。

本文档将详细介绍 Activity 生命周期。首先介绍生命周期范例。接着介绍每个回调：它们执行时内部发生了什么，以及您应该在执行期间实现什么。然后，简要介绍 Activity 状态与导致进程被系统终止的漏洞之间的关系。最后，讨论与在 Activity 状态之间转换相关的若干主题。

如需了解有关处理生命周期的信息（包括最佳做法的相关指导），请参阅[使用生命周期感知型组件处理生命周期](https://developer.android.com/topic/libraries/architecture/lifecycle)和[保存界面状态](https://developer.android.com/topic/libraries/architecture/saving-states)。如需了解如何将 Activity 与架构组件结合使用，以构建生产质量的稳健应用，请参阅[应用架构指南](https://developer.android.com/topic/libraries/architecture/guide)。

## Activity 生命周期概念

为了在 Activity 生命周期的各个阶段之间导航转换，Activity 类提供六个核心回调：[`onCreate()`](https://developer.android.com/reference/android/app/Activity#onCreate%28android.os.Bundle%29)、[`onStart()`](https://developer.android.com/reference/android/app/Activity#onStart%28%29)、[`onResume()`](https://developer.android.com/reference/android/app/Activity#onResume%28%29)、[`onPause()`](https://developer.android.com/reference/android/app/Activity#onPause%28%29)、[`onStop()`](https://developer.android.com/reference/android/app/Activity#onStop%28%29) 和 [`onDestroy()`](https://developer.android.com/reference/android/app/Activity#onDestroy%28%29)。当 Activity 进入新状态时，系统会调用其中每个回调。

![](../../.gitbook/assets/image%20%2842%29.png)

当用户开始离开 Activity 时，系统会调用方法来销毁该 Activity。在某些情况下，此销毁只是部分销毁；Activity 仍然驻留在内存中（例如当用户切换至另一应用时），并且仍然可以返回到前台。如果用户返回到该 Activity，Activity 会从用户离开时的位置继续运行。除了少数例外，应用[在后台运行时会受到限制，无法启动 Activity](https://developer.android.com/guide/components/activities/background-starts)。

系统终止给定进程及其中 Activity 的可能性取决于当时 Activity 的状态。[Activity 状态和从内存中弹出](https://developer.android.com/guide/components/activities/activity-lifecycle#asem) 会更详细地介绍状态与弹出漏洞之间的关系。

根据 Activity 的复杂程度，您可能不需要实现所有生命周期方法。但是，请务必了解每个方法，并实现能够确保应用按用户预期方式运行的方法，这非常重要。

在下一部分中，本文档将详细介绍用于处理状态间转换的回调。

## 生命周期回调

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

