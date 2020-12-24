# Activity简介

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

## 

## 了解任务和返回堆栈

任务是用户在执行某项工作时与之互动的一系列 `Activity` 的集合。这些 Activity 按照每个 Activity 打开的顺序排列在一个返回堆栈中。例如，电子邮件应用可能有一个 `Activity` 来显示新邮件列表。当用户选择一封邮件时，系统会打开一个新的 `Activity` 来显示该邮件。这个新的 `Activity` 会添加到返回堆栈中。如果用户按**返回**按钮，这个新的 `Activity` 即会完成并从堆栈中退出。通过以下视频可以大致了解返回堆栈的工作原理。

{% embed url="https://youtu.be/MvIlVsXxXmY" %}



Android 7.0（API 级别 24）及更高版本支持[多窗口环境](https://developer.android.com/guide/topics/ui/multi-window)，当应用在这种环境中同时运行时，系统会单独管理每个窗口的任务；而每个窗口可能包含多项任务。[在 Chromebook 上运行的 Android 应用](https://developer.android.com/topic/arc)也是如此：系统按窗口管理任务或任务组。

大多数任务都从设备主屏幕上启动。当用户轻触应用启动器中的图标（或主屏幕上的快捷方式）时，该应用的任务就会转到前台运行。如果该应用没有任务存在（应用最近没有使用过），则会创建一个新的任务，并且该应用的“主”Activity 将会作为堆栈的根 Activity 打开。

在当前 Activity 启动另一个 Activity 时，新的 Activity 将被推送到堆栈顶部并获得焦点。上一个 Activity 仍保留在堆栈中，但会停止。当 Activity 停止时，系统会保留其界面的当前状态。当用户按**返回**按钮时，当前 Activity 会从堆栈顶部退出（该 Activity 销毁），上一个 Activity 会恢复（界面会恢复到上一个状态）。堆栈中的 Activity 永远不会重新排列，只会被送入和退出，在当前 Activity 启动时被送入堆栈，在用户使用**返回**按钮离开时从堆栈中退出。因此，返回堆栈按照“后进先出”的对象结构运作。图 1 借助一个时间轴直观地显示了这种行为。该时间轴显示了 Activity 之间的进展以及每个时间点的当前返回堆栈。  


![](../../.gitbook/assets/image%20%2848%29.png)

如果用户继续按**返回**，则堆栈中的 Activity 会逐个退出，以显示前一个 Activity，直到用户返回到主屏幕（或任务开始时运行的 Activity）。移除堆栈中的所有 Activity 后，该任务将不复存在。

任务是一个整体单元，当用户开始一个新任务或通过主屏幕按钮进入主屏幕时，任务可移至“后台”。在后台时，任务中的所有 Activity 都会停止，但任务的返回堆栈会保持不变，当其他任务启动时，当前任务只是失去了焦点，如图 2 所示。这样一来，任务就可以返回到“前台”，以便用户可以从他们离开的地方继续操作。举例来说，假设当前任务（任务 A）的堆栈中有 3 个 Activity，当前 Activity 下有 2 个 Activity。用户按主屏幕按钮，然后从应用启动器中启动新应用。主屏幕出现后，任务 A 转到后台。当新应用启动时，系统会启动该应用的任务（任务 B），该任务具有自己的 Activity 堆栈。与该应用互动后，用户再次返回到主屏幕并选择最初启动任务 A 的应用。现在，任务 A 进入前台，其堆栈中的所有三个 Activity 都完好如初，堆栈顶部的 Activity 恢复运行。此时，用户仍可通过以下方式切换到任务 B：转到主屏幕并选择启动该任务的应用图标（或者从[**最近使用的应用**屏幕中](https://developer.android.com/guide/components/recents)选择该应用的任务）。这就是在 Android 上进行多任务处理的一个例子。  


![](../../.gitbook/assets/image%20%2845%29.png)

{% hint style="info" %}
**注意**：多个任务可以同时在后台进行。但是，如果用户同时运行很多后台任务，系统可能会为了恢复内存而开始销毁后台 Activity，导致 Activity 状态丢失。
{% endhint %}



由于返回堆栈中的 Activity 不会被重新排列，如果您的应用允许用户从多个 Activity 启动特定的 Activity，系统便会创建该 Activity 的新实例并将其推送到堆栈中（而不是将该 Activity 的某个先前的实例移至堆栈顶部）。这样一来，应用中的一个 Activity 就可能被多次实例化（甚至是从其他任务对其进行实例化），如图 3 所示。因此，如果用户使用**返回**按钮向后导航，Activity 的每个实例将按照它们被打开的顺序显示出来（每个实例都有自己的界面状态）。不过，如果您不希望某个 Activity 被实例化多次，可以修改此行为。有关如何实现此操作，将在后面的[管理任务](https://developer.android.com/guide/components/activities/tasks-and-back-stack#ManagingTasks)部分中讨论。

Activity 和任务的默认行为总结如下：

* 当 Activity A 启动 Activity B 时，Activity A 会停止，但系统会保留其状态（例如滚动位置和输入到表单中的文本）。如果用户在 Activity B 中按**返回**按钮，系统会恢复 Activity A 及其状态。
* 当用户通过按主屏幕按钮离开任务时，当前 Activity 会停止，其任务会转到后台。系统会保留任务中每个 Activity 的状态。如果用户稍后通过点按该任务的启动器图标来恢复该任务，该任务会进入前台并恢复堆栈顶部的 Activity。
* 如果用户按**返回**按钮，当前 Activity 将从堆栈中退出并销毁。堆栈中的上一个 Activity 将恢复。Activity 被销毁后，系统不会保留该 Activity 的状态。
* Activity 可以多次实例化，甚至是从其他任务对其进行实例化。

![](../../.gitbook/assets/image%20%2847%29.png)

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

![](../../.gitbook/assets/image%20%2843%29.png)

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

