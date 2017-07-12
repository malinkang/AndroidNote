

### 优化layout的层级


一个常见的误区是，用最基础的 Layout 结构可以提高 Layout 的 性能。然而，因为程序的每个组件和 Layout 都需要经过初始化、布局和绘制的过程，如果布局嵌套导致层级过深，上面的初始化，布局和绘制操作就更加耗时。例如，使用嵌套的 LinearLayout 可能会使得 View 的层级结构过深，此外，{% em type="red"%}嵌套使用了 layout_weight 参数的 LinearLayout 的计算量会尤其大，因为每个子元素都需要被测量两次{%endem%}。这对需要多次重复 inflate 的 Layout 尤其需要注意，比如嵌套在 ListView 或 GridView 时。

#### 检查Layout

Android SDK 工具箱中有一个叫做 Hierarchy Viewer 的工具，能够在程序运行时分析 Layout。你可以用这个工具找到 Layout 的性能瓶颈。

Hierarchy Viewer 会让你选择设备或者模拟器上正在运行的进程，然后显示其 Layout 的树型结构。每个块上的交通灯分别代表了它在测量、布局和绘画时的性能，帮你找出瓶颈部分。

比如，下图是 ListView 中一个列表项的 Layout 。列表项里，左边放一个小位图，右边是两个层叠的文字。像这种需要被多次 inflate 的 Layout ，优化它们会有事半功倍的效果。

![](/assets/images/layout-listitem.png)

hierarchyviewer 这个工具在 <sdk>/tools/ 中。当打开时，它显示一张可使用设备的列表，和它正在运行的组件。点击 Load View Hierarchy 来查看所选组件的层级。比如，下图就是前一个图中所示 Layout 的层级关系。

![](/assets/images/hierarchy-linearlayout.png)

在上图中，你可以看到一个三层结构，其中右下角的 TextView 在布局的时候有问题。点击这个TextView可以看到每个步骤所花费的时间。

可以看到，渲染一个完整的列表项的时间就是：

* 测量: 0.977ms
* 布局: 0.167ms
* 绘制: 2.717ms

#### 修正 Layout

上面的 Layout 由于有这个嵌套的 LinearLayout 导致性能太慢，可能的解决办法是将 Layout 层级扁平化 - 变浅变宽，而不是又窄又深。RelativeaLayout 作为根节点时就可以达到目的。所以，当换成基于 RelativeLayout 的设计时，你的 Layout 变成了两层。新的 Layout 变成这样：

![](/assets/images/hierarchy-relativelayout.png)


现在渲染列表项的时间：

* 测量: 0.598ms
* 布局: 0.110ms
* 绘制: 2.146ms

可能看起来是很小的进步，但是由于它对列表中每个项都有效，这个时间要翻倍。

这个时间的主要差异是由于在 LinearLayout 中使用 layout_weight 所致，因为会减慢“测量”的速度。这只是一个正确使用各种 Layout 的例子，当你使用 layout_weight 时有必要慎重。

#### 使用 Lint

运行 Lint 工具来检查 Layout 可能的优化方法，是个很好的实践。Lint 已经取代了 Layoutopt 工具，它拥有更强大的功能。Lint 中包含的一些检测规则有：

* 使用compound drawable — 用一个compound drawable 替代一个包含 ImageView 和 TextView 的 LinearLayout 会更有效率。
* 合并根 frame — 如果 FrameLayout 是 Layout 的根节点，并且没有使用 padding 或者背景等，那么用 merge 标签替代他们会稍微高效些。
* 没用的子节点 — 一个没有子节点或者背景的 Layout 应该被去掉，来获得更扁平的层级
* 没用的父节点 — 一个节点如果没有兄弟节点，并且它不是 ScrollView 或根节点，没有背景，这样的节点应该直接被子节点取代，来获得更扁平的层级
* 太深的 Layout — Layout 的嵌套层数太深对性能有很大影响。尝试使用更扁平的 Layout ，比如 RelativeLayout 或 GridLayout 来提高性能。一般最多不超过10层。

另一个使用 Lint 的好处就是，它内置于 Android Studio 中。Lint 在你导编译程序时自动运行。Android Studio 中，你可以为单独的 build variant 或者所有 variant 运行 lint。

你也可以在 Android Studio 中管理检测选项，在 File > Settings > Project Settings 中。检测配置页面会显示支持的检测项目。

![](/assets/images/studio-inspections-config.png)

Lint 有自动修复、提示建议和直接跳转到问题处的功能。

### 重用layouts

虽然 Android 提供很多小的可重用的交互组件，你仍然可能需要重用复杂一点的组件，这也许会用到 Layout。为了高效重用整个的 Layout，你可以使用 <include/> 和 <merge/> 标签把其他 Layout 嵌入当前 Layout。

重用 Layout 非常强大，它让你可以创建复杂的可重用 Layout。比如，一个 yes/no 按钮面板，或者带有文字的自定义进度条。这也意味着，任何在多个 Layout 中重复出现的元素可以被提取出来，被单独管理，再添加到 Layout 中。所以，虽然可以添加一个自定义 View 来实现单独的 UI 组件，你可以更简单的直接重用某个 Layout 文件。

#### 创建可重用 Layout

如果你已经知道你需要重用的 Layout，就先创建一个新的 XML 文件并定义 Layout 。比如，定义了一个需要添加到每个 Activity 中的标题栏（titlebar.xml)：

```xml
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width=”match_parent”
    android:layout_height="wrap_content"
    android:background="@color/titlebar_bg">

    <ImageView android:layout_width="wrap_content"
               android:layout_height="wrap_content"
               android:src="@drawable/gafricalogo" />
</FrameLayout>
```
根节点 View 就是你想添加入的 Layout 类型。

#### 使用<include>标签

使用 <include> 标签，可以在 Layout 中添加可重用的组件。

你也可以覆写被添加的 Layout 的所有 Layout 参数（任何 android:layout_* 属性），通过在 <include/> 中声明他们来完成。比如：
```xml
<include android:id="@+id/news_title"
         android:layout_width="match_parent"
         android:layout_height="match_parent"
         layout="@layout/title"/>
```
然而，如果你要在 <include> 中覆写某些属性，你必须先覆写 android:layout_height 和 android:layout_width。

### 使用<merge>标签

<merge /> 标签在你嵌套 Layout 时取消了 UI 层级中冗余的 ViewGroup 。比如，如果你有一个 Layout 是一个竖直方向的 LinearLayout，其中包含两个连续的 View 可以在别的 Layout 中重用，那么你会做一个 LinearLayout 来包含这两个 View ，以便重用。不过，当使用一个 LinearLayout 作为另一个 LinearLayout 的根节点时，这种嵌套 LinearLayout 的方式除了减慢你的 UI 性能外没有任何意义。

为了避免这种情况，你可以用 <merge> 元素来替代可重用 Layout 的根节点。例如：
```xml
<merge xmlns:android="http://schemas.android.com/apk/res/android">

    <Button
        android:layout_width="fill_parent"
        android:layout_height="wrap_content"
        android:text="@string/add"/>

    <Button
        android:layout_width="fill_parent"
        android:layout_height="wrap_content"
        android:text="@string/delete"/>

</merge>
```
现在，当你要将这个 Layout 包含到另一个 Layout 中时（并且使用了 <include/> 标签），系统会忽略 <merge> 标签，直接把两个 Button 放到 Layout 中 <include> 的所在位置。

### 按需加载视图

有时你的 Layout 会用到不怎么重用的复杂视图。不管它是列表项 细节，进度显示器，或是撤销时的提示信息，你可以仅在需要的时候载入它们，提高 UI 渲染速度。

#### 定义 ViewStub

ViewStub 是一个轻量的视图，不需要大小信息，也不会在被加入的 Layout 中绘制任何东西。每个 ViewStub 只需要设置 android:layout 属性来指定需要被 inflate 的 Layout 类型。

以下 ViewStub 是一个半透明的进度条覆盖层。功能上讲，它应该只在新的数据项被导入到应用程序时可见。
```xml
<ViewStub
    android:id="@+id/stub_import"
    android:inflatedId="@+id/panel_import"
    android:layout="@layout/progress_overlay"
    android:layout_width="fill_parent"
    android:layout_height="wrap_content"
    android:layout_gravity="bottom" />
```

#### 载入 ViewStub Layout

当你要载入用 ViewStub 声明的 Layout 时，要么用 setVisibility(View.VISIBLE) 设置它的可见性，要么调用其 inflate() 方法。
```java
((ViewStub) findViewById(R.id.stub_import)).setVisibility(View.VISIBLE);
// or
View importPanel = ((ViewStub) findViewById(R.id.stub_import)).inflate();
```

>Notes：inflate() 方法会在渲染完成后返回被 inflate 的视图，所以如果你需要和这个 Layout 交互的话， 你不需要再调用 findViewById() 去查找这个元素。

一旦 ViewStub 可见或是被 inflate 了，ViewStub 就不再继续存在View的层级机构中了。取而代之的是被 inflate 的 Layout，其 id 是 ViewStub 上的 android:inflatedId 属性。（ViewStub 的 android:id 属性仅在 ViewStub 可见以前可用）

>Notes：ViewStub 的一个缺陷是，它目前不支持使用 <merge/> 标签的 Layout 。



