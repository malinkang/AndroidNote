
## Touch事件的分发和消费机制

Android中Touch事件相关的方法包括`dispatchTouchEvent(MotionEvent ev)`、`onInterceptTouchEvent(MotionEvent ev)`、`onTouchEvent(MotionEvent ev) `。能够响应这些方法的控件包括ViewGroup、View、Activity。方法和控件的对应关系如下：

| Touch事件相关的方法包括| 方法功能 | ViewGroup | View | Activity |
| -- | -- | -- | -- | -- |
| dispatchTouchEvent|事件分发 | √ | √ |√  |
| onInterceptTouchEvent | 事件拦截| √  |× | × |
| onTouchEvent | 事件响应 | √ | √  | √ |

当Touch事件发生时，如果Activity的dispatchTouchEvent方法返回false，触摸事件会依次向下传递，如果返回true，则会将事件传递给activity的onTouchEvent进行消费。同理，如果在ViewGroup中返回false，触摸事件会向下传递；否则，将事件传递给onTouchEvent进行消费。

如果dispatchTouchEvent方法返回false，会将事件传递给当前控件的onInterceptTouchEvent方法。如果onInterceptTouchEvent返回true，则对事件进行拦截，将当前事件传递给当前控件的onTouchEvent进行消费,如果当前控件的onTouchEvent不进行消费，则向上传递。如果返回false，对事件进行放行，将事件传递给View，再由子View的dispatchTouchEvent来分发这个事件。

当onTouchEvent返回false，表示不消费当前事件，如果返回true表示消费当前事件，事件将不会继续传递。如果事件从上往下的传递过程中一直没有停止，并且最底层的View没有消费事件，事件会向上传递给父View进行消费。如果一直没有被消费的话，最后会传递给activity的onTouchEvent进行消费。如果View没有对ACTION_DOWN进行消费的话，之后的其他事件也不会传递过来。

下面我们将通过实例来观察Touch事件的分发和消费。

分别继承FrameLayout、LinearLayout和TextView，并复写事件处理的相关方法。

MyFrameLayout

```java
public class MyFrameLayout extends FrameLayout {
    @Override
    public boolean onInterceptTouchEvent(MotionEvent ev) {
        Log.d("MyFrameLayout", "onInterceptTouchEvent方法执行：" + Utils.getNameForEvent(ev));
        boolean retVal=super.onInterceptTouchEvent(ev);
        Log.d("MyFrameLayout", "onInterceptTouchEvent方法返回：" + retVal);
        return retVal;
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        Log.d("MyFrameLayout", "dispatchTouchEvent方法执行：" + Utils.getNameForEvent(ev));
       boolean retVal= super.dispatchTouchEvent(ev);
        Log.d("MyFrameLayout", "dispatchTouchEvent方法返回："+ retVal);
        return retVal;
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        Log.d("MyFrameLayout", "onTouchEvent方法执行：" + Utils.getNameForEvent(event));
        boolean retVal= super.onTouchEvent(event);
        Log.d("MyFrameLayout", "onTouchEvent方法返回：" +  retVal);
        return retVal;
    }
}
```

MyLinearLayout

```java
public class MyLinearLayout extends LinearLayout {

    @Override
    public boolean onInterceptTouchEvent(MotionEvent ev) {
        Log.d("MyLinearLayout","onInterceptTouchEvent方法执行："+Utils.getNameForEvent(ev));
        boolean retVal=super.onInterceptTouchEvent(ev);
        Log.d("MyLinearLayout","onInterceptTouchEvent返回："+ retVal);
        return retVal;
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        Log.d("MyLinearLayout","dispatchTouchEvent方法执行："+Utils.getNameForEvent(ev));
        boolean retVal=super.dispatchTouchEvent(ev);
        Log.d("MyLinearLayout","dispatchTouchEvent返回："+retVal);
        return retVal;
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        Log.d("MyLinearLayout","onTouchEvent执行："+Utils.getNameForEvent(event));
        boolean retVal=super.onTouchEvent(event);
        Log.d("MyLinearLayout","onTouchEvent返回" +retVal);
        return retVal;
    }
}
```

MyTextView

```java
public class MyTextView extends TextView {
    @Override
    public boolean dispatchTouchEvent(MotionEvent event) {
        Log.d("MyTextView", "dispatchTouchEvent执行：" + Utils.getNameForEvent(event));
       boolean retVal= super.dispatchTouchEvent(event);
        Log.d("MyTextView", "dispatchTouchEvent返回：" + retVal);
        return retVal;
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        Log.d("MyTextView", "onTouchEvent执行：" + Utils.getNameForEvent(event));
        boolean retVal= super.onTouchEvent(event);
        Log.d("MyTextView", "onTouchEvent返回：" + retVal);
        return retVal;
    }
}
```
定义一个activity TouchEventActivity，其布局文件如下：

```xml
<com.malinkang.touchsample.widget.MyFrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#ff0000"
    android:orientation="vertical">

    <com.malinkang.touchsample.widget.MyLinearLayout
        android:layout_width="200dp"
        android:layout_height="200dp"
        android:background="#00ff00"
        android:layout_gravity="center"
        android:gravity="center">

        <com.malinkang.touchsample.widget.MyTextView
            android:layout_width="100dp"
            android:layout_height="100dp"
            android:background="#0000ff" />
    </com.malinkang.touchsample.widget.MyLinearLayout>

</com.malinkang.touchsample.widget.MyFrameLayout>

```
Java代码如下

```java
public class TouchEventActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.touch_event);
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        Log.d("TouchEventActivity","dispatchTouchEvent方法执行："+Utils.getNameForEvent(ev));
        boolean retVal=super.dispatchTouchEvent(ev);
        Log.d("TouchEventActivity", "dispatchTouchEvent默认返回："+retVal);
        return retVal;
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        Log.d("TouchEventActivity", "onTouchEvent方法执行："+ Utils.getNameForEvent(event));
        boolean retVal=super.onTouchEvent(event);
        Log.d("TouchEventActivity", "onTouchEvent默认返回："+retVal);
        return retVal;
    }


}
```

当我们触摸蓝色区域，打印日志如下：

![](log1.png)

当修改MyTextView的onTouchEvent返回值为true,日志如下：

![](log2.png)

当修改MyLinearLayout的onInterceptTouchEvent返回值为true，日志如下：

![](log3.png)


### 参考
* [Managing Touch Events in a ViewGroup](http://developer.android.com/training/gestures/viewgroup.html)
* [Android 编程下 Touch 事件的分发和消费机制](http://www.cnblogs.com/sunzn/archive/2013/05/10/3064129.html)






