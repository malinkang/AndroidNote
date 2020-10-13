# Context的关联类

Context意为上下文，是一个应用程序环境信息的接口。



在开发中我们经常使用Context，它的使用场景总的来说分为两大类，它们分别是：

* 使用Context调用方法，比如启动Activity、访问资源、调用系统级服务等。
* 调用方法时传入Context，比如弹出Toast、创建Dialog等。

Activity、Service和Application都间接地继承自Context，因此我们可以计算出一个应用程序进程中有多少个Context，这个数量等于Activity和Service的总个数加1，1指的是Application的数量。

Context 是一个抽象类，它的内部定义了很多方法以及静态常量，它的具体实现类为ContextImpl。和Context相关联的类，除了ContextImpl，还有ContextWrapper、ContextThemeWrapper和Activity等，如图所示。

![](../../.gitbook/assets/image%20%2873%29.png)

`ContextImpl`和`ContextWrapper`继承自`Context`，`ContextWrapper`内部包含`Context`类型的mBase对象，mBase 具体指向ContextImpl。ContextImpl 提供了很多功能，但是外界需要使用并拓展ContextImpl的功能，因此设计上使用了装饰模式，ContextWrapper是装饰类，它对ContextImpl进行包装，ContextWrapper主要是起了方法传递的作用，ContextWrapper中几乎所有的方法都是调用ContextImpl的相应方法来实现的。ContextThemeWrapper、Service和Application都继承自ContextWrapper，这样它们都可以通过mBase来使用Context的方法，同时它们也是装饰类，在ContextWrapper的基础上又添加了不同的功能。ContextThemeWrapper中包含和主题相关的方法（比如getTheme方法），因此，需要主题的Activity继承ContextThemeWrapper，而不需要主题的Service继承ContextWrapper。

Context的关联类采用了装饰模式，主要有以下的优点：

* 使用者（比如Service）能够更方便地使用Context。
* 如果ContextImpl发生了变化，它的装饰类ContextWrapper不需要做任何修改。· ContextImpl的实现不会暴露给使用者，使用者也不必关心ContextImpl的实现。
* 通过组合而非继承的方式，拓展ContextImpl的功能，在运行时选择不同的装饰类，实现不同的功能。



为了更好地理解Context的关联类的设计理念，就需要理解Application、Activity、Service的Context的创建过程，下面分别对它们进行介绍。

[https://github.com/Moosphan/Android-Daily-Interview/issues/14](https://github.com/Moosphan/Android-Daily-Interview/issues/14)

[https://juejin.im/post/6844904179060703246](https://juejin.im/post/6844904179060703246)

