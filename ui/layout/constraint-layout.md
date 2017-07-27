


### 介绍


ConstraintLayout允许您使用平面视图层次结构创建大而复杂的布局（无嵌套视图组）。它类似于RelativeLayout，因为所有视图都是根据兄弟视图和父布局之间的关系来布局的，但它比RelativeLayout更灵活，并且更易于与Android Studio的布局编辑器一起使用。

ConstraintLayout的所有功能都可以直接从布局编辑器的可视化工具中获得，因为布局API和布局编辑器是专门为彼此构建的。因此，您可以使用ConstraintLayout完全通过拖放而不是编辑XML来构建布局。

ConstraintLayout适用于与Android 2.3（API级别9）及更高版本兼容的API库。

要在ConstraintLayout中定义视图的位置，您必须为视图添加至少一个水平和一个垂直约束。每个约束表示与另一个视图，父布局或不可见的`guideline`的连接或对齐。每个约束定义视图在垂直或水平轴上的位置;因此每个视图必须对每个轴至少有一个约束，但通常需要更多的约束。

当您将视图拖放到布局编辑器中时，即使没有约束，它仍然保留在您离开的位置。但是，这只是使编辑更容易;如果视图在设备上运行布局时没有约束，则绘制在位置[0,0]（左上角）。

在下图中视图C上没有垂直约束。当此布局绘制在设备上时，视图C与视图A居中对齐，但出现在A的顶部，因为它没有垂直的约束。

![](/assets/images/constraintlayout-2.jpeg)

![](/assets/images/constraintlayout-3.jpeg)

虽然缺少的约束不会导致编译错误，但是布局编辑器则指出缺少的约束作为工具栏中的错误。要查看错误和其他警告，请单击显示警告和错误。为了帮助您避免缺少约束，布局编辑器可以使用自动连接和推断约束功能为您自动添加约束。


### 添加ConstraintLayout到项目中

要在项目中使用ConstraintLayout，请按照下列步骤操作：

1. 确保您的模块级build.gradle文件中声明了`maven.google.com`存储库

	```gradle
	repositories {
	    maven {
	        url 'https://maven.google.com'
	    }
	}
	```

2. 在相同的build.gradle文件中将库添加为依赖关系：

	```gradle
	dependencies {
    compile 'com.android.support.constraint:constraint-layout:1.0.2'
}
	```

3. 在工具栏或同步通知中，单击同步项目与Gradle文件。

现在，您可以使用ConstraintLayout构建您的布局。


#### 转换布局


要将现有布局转换为约束布局，请按照下列步骤操作：

1. 在Android Studio中打开您的布局，然后单击编辑器窗口底部的“设计”选项卡。
2. 在“组件树”窗口中，右键单击布局，然后单击“将布局转换为ConstraintLayout”。

#### 创建一个新的布局

要启动新的约束布局文件，请按照下列步骤操作：

* 在项目窗口中，单击模块文件夹，然后选择文件>新建> XML>布局XML。
* 输入布局文件的名称，并为根标记输入“android.support.constraint.ConstraintLayout”。
单击完成。


### 添加约束



### 参考

* [Build a Responsive UI with ConstraintLayout](https://developer.android.com/training/constraint-layout/index.html)
* [ConstraintLayout完全解析](http://blog.csdn.net/guolin_blog/article/details/53122387)