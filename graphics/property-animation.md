


属性动画系统是一个强大的框架，允许您使几乎任何事物产生动画。您可以定义一个动画以随时间更改任何对象属性，无论它是否绘制到屏幕。属性动画在指定的时间长度内更改属性（对象中的字段）值。要动画某些东西，您可以指定要对其进行动画处理的对象属性，例如对象在屏幕上的位置，要对其进行动画处理的时间以及要在其间进行动画处理的值。

属性动画系统允许您定义动画的以下特征：

* 时间插值：您可以指定如何根据动画当前所用时间计算属性值。
* 重复计数和行为：您可以指定是否在持续时间结束时重复动画，并重复播放动画的次数。您还可以指定是否要相反地播放动画。将其设置为反向播放动画向前，然后反复向后，直到达到重复次数。
* 动画集：您可以将动画组合到一起或顺序播放或指定延迟之后的逻辑集。
* 帧刷新延迟：您可以指定刷新动画帧的频率。默认设置为每10ms更新一次，但是应用程序刷新帧的速度最终取决于系统整体的繁忙程度，以及系统能够为底层定时器提供多长时间的服务。

### 属性动画原理

首先，我们来看一个动画如何工作，一个简单的例子。下图描绘了一个假设的对象，它以x属性为动画，表示其在屏幕上的水平位置。动画的持续时间设置为40 ms，行驶距离为40像素。每10 ms，这是默认的帧刷新率，对象水平移动10像素。在40ms结束时，动画停止，物体在水平位置40处结束。这是具有线性插值的动画的示例，意味着物体以恒定的速度移动。

![图1：线性动画示例](/assets/images/animation-linear.png)


您还可以指定具有非线性内插的动画。下图描绘了在动画开始时加速的假想对象，并且在动画结束时减速。物体仍然在40毫秒内移动40像素，但是非线性。一开始，这个动画加速到中途，然后从中途减速直到动画结束。如下图所示，动画开始和结束时行进的距离小于中间。

![图2：非线性动画示例](/assets/images/animation-nonlinear.png)

我们来详细了解属性动画系统的重要组件如何计算如上所示的动画。下图描绘了主要类之间如何工作。

![图3：如何计算动画](/assets/images/valueanimator.png)

ValueAnimator对象跟踪您的动画的时间，例如动画已运行多长时间，以及动画所属属性的当前值。

ValueAnimator封装了TimeInterpolator，它定义了动画插值，还有一个TypeEvaluator，它定义了如何计算动画属性的值。例如，在图2中，使用的TimeInterpolator将为AccelerateDecelerateInterpolator，TypeEvaluator将为IntEvaluator。

要启动动画，请创建一个ValueAnimator，并为其创建动画的属性以及动画持续时间给出它的开始和结束值。当你调用start（）动画开始。在整个动画过程中，ValueAnimator根据动画的持续时间和经过多少时间，计算0到1之间的经过分数。经过的分数表示动画完成的时间百分比，0表示0％，1表示100％。例如，在图1中，t = 10ms时的经过分数为0.25，因为总持续时间为t = 40ms。

当ValueAnimator完成计算经过的分数时，它调用当前设置的TimeInterpolator，以计算插值分数。插值分数将经过的分数映射到考虑到设置的时间插值的新分数。例如，在图2中，由于动画缓慢加速，所以在t = 10 ms时，内插分数约为.15，小于经过分数.25。在图1中，插值分数总是与经过分数相同。

当计算插值分数时，ValueAnimator将根据插值分数，起始值和动画的结束值，调用相应的TypeEvaluator来计算您要动画化的属性值。例如，在图2中，在t = 10 ms时插值分数为.15，因此该时间的属性值为.15 X（40 - 0）或6。

### 属性动画和View动画的区别

View动画系统提供了只能对View对象进行动画化的功能，因此，如果您想为非View对象设置动画效果，则必须实现自己的代码。视图动画系统也受到限制，因为它仅将View对象的几个方面暴露给动画，例如视图的缩放和旋转，而不是背景颜色。

View动画系统的另一个缺点是它只修改了View的绘制位置，而不是实际的View本身。例如，如果您将动画按钮移动到屏幕上，则按钮正确绘制，但您可以单击按钮的实际位置不会更改，因此您必须实现自己的逻辑来处理此问题。

使用属性动画系统，这些约束被完全删除，您可以对任何对象（视图和非视图）的任何属性进行动画处理，并且对象本身实际上进行了修改。属性动画系统在执行动画的过程中也更为强大。在高层次上，您可以为要动画化的属性（如颜色，位置或大小）分配动画师，并可以定义动画的各个方面，如多个动画制作工具的插值和同步。

然而，视图动画系统需要较少的时间来设置，并且需要较少的代码来写入。如果视图动画完成了您需要执行的所有操作，或者如果现有代码已经按照您想要的方式工作，则不需要使用属性动画系统。如果出现用例，在不同情况下使用动画系统也可能是有意义的。


### API 概览

您可以在android.animation中找到大部分属性动画系统的API。 因为视图动画系统已经在android.view.animation中定义了许多插值器，所以您也可以在属性动画系统中使用这些插值器。 下表描述了属性动画系统的主要组件。

Animator类提供了创建动画的基本结构。 您通常不直接使用此类，因为它只提供必须扩展的最小功能，以完全支持动画值。 以下子类扩展了Animator：

| 类   	   |      描述     | 
|----------|:-------------:|
| ValueAnimator |  属性动画的主要定时引擎，也可以计算要动画的属性的值。它具有计算动画值的所有核心功能，并包含每个动画的时序细节，有关动画重复的信息，接收更新事件的收听者以及设置自定义类型进行评估的能力。动画属性有两部分：计算动画值，并在动画对象和属性上设置这些值。 ValueAnimator不执行第二部分，因此您必须监听由ValueAnimator计算的值的更新，并使用自己的逻辑修改要进行动画化的对象。|
|ObjectAnimator |    ValueAnimator的子类，允许您将目标对象和对象属性设置为动画。 当该类计算动画的新值时，此类将相应地更新该属性。 你想在大多数时候使用ObjectAnimator，因为它使得在目标对象上动画化值的过程更容易。 但是，有时候您希望直接使用ValueAnimator，因为ObjectAnimator还有一些限制，例如需要在目标对象上存在特定的教程方法。   |
| AnimatorSet | 提供一种将动画分组在一起的机制，以便它们相互运行。 您可以将动画设置为一起播放，顺序播放或指定延迟播放。 有关详细信息，请参阅有关使用动画组合编排多个动画的部分。 | 

`Evaluators`告诉属性动画系统如何计算给定属性的值。 它们获取Animator类提供的时间数据，动画的开始和结束值，并根据此数据计算属性的动画值。 属性动画系统提供以下评估者：

表2. Evaluators


| 类/接口  	   |      描述     | 
|----------|:-------------:|
|     IntEvaluator     |   用于计算int属性值的默认Evaluator            |
|     FloatEvaluator     |  用于计算float属性值的默认Evaluator             |
|     ArgbEvaluator     |   用于计算以十六进制值表示的颜色属性的值的默认用于计算float属性值的默认Evaluator。            |
|     TypeEvaluator     |  一个允许您创建自己的Evaluator的接口。 如果要动画的对象属性化不是int，float或color的对象属性，则必须实现TypeEvaluator接口以指定如何计算对象属性的动画值。 如果要处理不同于默认行为的类型，还可以为int，float和color值指定自定义的TypeEvaluator。      |

时间插值器定义如何计算动画中的特定值作为时间的函数。 例如，您可以指定动画在整个动画中线性发生，这意味着动画在整个时间内均匀移动，或者您可以指定使用非线性时间的动画，例如，在开始时加速并在 动画。 表3描述了android.view.animation中包含的插值器。 如果没有提供的插件适合您的需要，请实现TimeInterpolator接口并创建自己的插值器。


表3. 插值器

| 类/接口  	   |      描述     | 
|----------|:-------------:|
|     AccelerateDecelerateInterpolator     |              |
|     AccelerateInterpolator     |          |
|     AnticipateInterpolator     |              |
|     AnticipateOvershootInterpolator    |            |
|     BounceInterpolator     |           |
|     CycleInterpolator     |         |
|     DecelerateInterpolator     |            |
|     LinearInterpolator     |            |
|     OvershootInterpolator     |             |
|     TimeInterpolator|            |

### VuleAnimator 


ValueAnimator类允许您通过指定一组int，float或颜色值来动画化，为动画持续时间对某些类型的值进行动画处理。通过调用其中一种工厂方法获得ValueAnimator：ofInt（），ofFloat（）或orObject（）。例如：

```java
ValueAnimator animation = ValueAnimator.ofFloat(0f, 100f);
animation.setDuration(1000);
animation.start();

```

在此代码中，当start（）方法运行时，ValueAnimator将开始计算0到100之间动画的值，持续时间为1000 ms。

您还可以通过执行以下操作来指定自定义类型以进行动画处理：

```java
ValueAnimator animation = ValueAnimator.ofObject(new MyTypeEvaluator(), startPropertyValue, endPropertyValue);
animation.setDuration(1000);
animation.start();
```

在此代码中，当start（）方法运行时，ValueAnimator将使用MyTypeEvaluator提供的逻辑持续1000 ms，在startPropertyValue和endPropertyValue之间开始计算动画值。

您可以通过向ValueAnimator对象添加AnimatorUpdateListener来使用动画值，如以下代码所示：

```java
animation.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
    @Override
    public void onAnimationUpdate(ValueAnimator updatedAnimation) {
        // You can use the animated value in a property that uses the
        // same type as the animation. In this case, you can use the
        // float value in the translationX property.
        float animatedValue = (float)updatedAnimation.getAnimatedValue();
        textView.setTranslationX(animatedValue);
    }
});
```
在onAnimationUpdate（）方法中，您可以访问更新的动画值，并在其中一个视图的属性中使用它。有关侦听器的更多信息，请参阅有关动态侦听器的部分

### ObjectAnimator

ObjectAnimator是ValueAnimator的一个子类（在前面的部分讨论过），它将ValueAnimator的定时引擎和值计算结合起来，使目标对象的命名属性动画化。这使得任何对象变得更加简单，因为您不再需要实现ValueAnimator.AnimatorUpdateListener，因为动画属性会自动更新。

实例化一个ObjectAnimator类似于一个ValueAnimator，但是你也可以指定该对象和该对象的属性（作为一个String）的名称以及值之间的动画值：

```java
ObjectAnimator animation = ObjectAnimator.ofFloat(textView, "translationX", 100f);
animation.setDuration(1000);
animation.start();
```

要使ObjectAnimator正确地更新属性，您必须执行以下操作：

* 产生动画的属性必须具有`set<PropertyName>()`格式的setter函数 。因为ObjectAnimator在动画过程中自动更新属性，所以它必须能够使用此setter方法访问该属性。例如，如果属性名称为foo，则需要具有setFoo（）方法。如果此setter方法不存在，您有三个选项：
	* 如果您有权这样做，请将setter方法添加到类中。
	* 使用您有权更改的包装类，并使该包装器使用有效的setter方法接收该值并将其转发到原始对象。
	* 使用ValueAnimator代替。
* 如果在ObjectAnimator工厂方法之一中为值...参数指定一个值，则假定它是动画的结束值。因此，您正在动画的对象属性必须具有用于获取动画起始值的getter函数。 getter函数必须以get <PropertyName>（）的形式。例如，如果属性名称为foo，则需要使用getFoo（）方法。
* 您要动画化的属性的getter（如果需要）和setter方法必须与您为ObjectAnimator指定的起始值和结束值相同的类型运行。例如，如果构造以下ObjectAnimator，则必须具有targetObject.setPropName（float）和targetObject.getPropName（float）：

```java
ObjectAnimator.ofFloat(targetObject, "propName", 1f)
```


根据您要动画的属性或对象，您可能需要在视图上调用invalidate（）方法来强制屏幕使用更新的动画值重新绘制。您可以在onAnimationUpdate（）回调中执行此操作。例如，当Drawable对象重新绘制时，可以对Drawable对象的color属性进行动画化，只会导致屏幕更新。 View上的所有属性设置，如setAlpha（）和setTranslationX（）都会使视图正确无效，因此在使用新值调用这些方法时，不需要使视图无效。有关侦听器的更多信息，请参阅有关动态侦听器的部分

### AnimatorSet

个动画启动或完成的动画。 Android系统允许您将动画组合到AnimatorSet中，以便您可以指定是否同时，顺序启动或在指定的延迟之后启动动画。您也可以将AnimatorSet对象嵌套在彼此中。


```java
AnimatorSet bouncer = new AnimatorSet();
bouncer.play(bounceAnim).before(squashAnim1);
bouncer.play(squashAnim1).with(squashAnim2);
bouncer.play(squashAnim1).with(stretchAnim1);
bouncer.play(squashAnim1).with(stretchAnim2);
bouncer.play(bounceBackAnim).after(stretchAnim2);
ValueAnimator fadeAnim = ObjectAnimator.ofFloat(newBall, "alpha", 1f, 0f);
fadeAnim.setDuration(250);
AnimatorSet animatorSet = new AnimatorSet();
animatorSet.play(bouncer).before(fadeAnim);
animatorSet.start();
```
### 动画监听器


### 参考

* [Property Animation](https://developer.android.com/guide/topics/graphics/prop-animation.html)
* [Android属性动画完全解析(上)，初识属性动画的基本用法](http://blog.csdn.net/guolin_blog/article/details/43536355)
* [Android属性动画完全解析(中)，ValueAnimator和ObjectAnimator的高级用法](http://blog.csdn.net/guolin_blog/article/details/43536355)
* [Android属性动画完全解析(下)，Interpolator和ViewPropertyAnimator的用法](http://blog.csdn.net/guolin_blog/article/details/44171115)
* [AnimationEasingFunctions](https://github.com/daimajia/AnimationEasingFunctions)
* [EasingInterpolator](https://github.com/MasayukiSuda/EasingInterpolator)
* [Introducing ViewPropertyAnimator](https://android-developers.googleblog.com/2011/05/introducing-viewpropertyanimator.html)
* [Android animations powered by RxJava](https://pspdfkit.com/blog/2016/android-animations-powered-by-rx-java/)
* [Android-SpinKit](https://github.com/ybq/Android-SpinKit)
* 