# LayoutInfalter使用

LayoutInfalter对象可以将XML转化为一个View对象。

## 创建LayoutInfalter对象


1.通过`Context`的`getSystemService`方法来获取

```java

LayoutInflater LayoutInflater =
                (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);

```
2.也可以通过`LayoutInflater`的静态方法`from`来获取，查看from的源码可以看到，本质调用的还是上面的方法。

```java
    /**
     * Obtains the LayoutInflater from the given context.
     */
    public static LayoutInflater from(Context context) {
        LayoutInflater LayoutInflater =
                (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        if (LayoutInflater == null) {
            throw new AssertionError("LayoutInflater not found.");
        }
        return LayoutInflater;
    }



```

## 使用LayoutInfalter

LayoutInfalter提供了两个重载方法来将XML转换为View对象

```java
    /**
     * Inflate a new view hierarchy from the specified xml resource. Throws
     * {@link InflateException} if there is an error.
     *
     * @param resource ID for an XML layout resource to load (e.g.,
     *        <code>R.layout.main_page</code>)
     * @param root Optional view to be the parent of the generated hierarchy.
     * @return The root View of the inflated hierarchy. If root was supplied,
     *         this is the root View; otherwise it is the root of the inflated
     *         XML file.
     */
    public View inflate(int resource, ViewGroup root) {
        return inflate(resource, root, root != null);
    }

```

```java
 /**
     * Inflate a new view hierarchy from the specified xml resource. Throws
     * {@link InflateException} if there is an error.
     *
     * @param resource ID for an XML layout resource to load (e.g.,
     *        <code>R.layout.main_page</code>)
     * @param root Optional view to be the parent of the generated hierarchy (if
     *        <em>attachToRoot</em> is true), or else simply an object that
     *        provides a set of LayoutParams values for root of the returned
     *        hierarchy (if <em>attachToRoot</em> is false.)
     * @param attachToRoot Whether the inflated hierarchy should be attached to
     *        the root parameter? If false, root is only used to create the
     *        correct subclass of LayoutParams for the root view in the XML.
     * @return The root View of the inflated hierarchy. If root was supplied and
     *         attachToRoot is true, this is root; otherwise it is the root of
     *         the inflated XML file.
     */
    public View inflate(int resource, ViewGroup root, boolean attachToRoot) {
        final Resources res = getContext().getResources();
        if (DEBUG) {
            Log.d(TAG, "INFLATING from resource: \"" + res.getResourceName(resource) + "\" ("
                    + Integer.toHexString(resource) + ")");
        }

        final XmlResourceParser parser = res.getLayout(resource);
        try {
            return inflate(parser, root, attachToRoot);
        } finally {
            parser.close();
        }
    }

```

此外除了使用这两种方法以外，还可以通过View的`inflate`方法来将XML转换为View

```java

    /**
     * Inflate a view from an XML resource.  This convenience method wraps the {@link
     * LayoutInflater} class, which provides a full range of options for view inflation.
     *
     * @param context The Context object for your activity or application.
     * @param resource The resource ID to inflate
     * @param root A view group that will be the parent.  Used to properly inflate the
     * layout_* parameters.
     * @see LayoutInflater
     */
    public static View inflate(Context context, int resource, ViewGroup root) {
        LayoutInflater factory = LayoutInflater.from(context);
        return factory.inflate(resource, root);
    }

```

下面我们通过例子来讲解inflate方法的使用

创建一个布局red.xml

```xml
<?xml version="1.0" encoding="utf-8"?>

<TextView xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="100dp"
    android:layout_height="100dp"
    android:text="A"
    android:textSize="32dp"
    android:gravity="center"
    android:background="#ff0000" />
```

activity_main.xml

```xml
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:id="@+id/container"
    android:orientation="vertical"
    tools:context=".MainActivity">
</LinearLayout>
```

MainActivity

```java
@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);
    ViewGroup parent = (ViewGroup) findViewById(R.id.container);
    view = LayoutInflater.from(this).inflate(R.layout.red, null);
    parent.addView(view);
    Log.d(TAG, view.toString());

    view = LayoutInflater.from(this).inflate(R.layout.red, parent, false);
    parent.addView(view);
    Log.d(TAG, view.toString());
    view = LayoutInflater.from(this).inflate(R.layout.red, parent, true);
    Log.d(TAG, view.toString());

}
```

运行结果

![](images/layoutinflatersample.png)

Log

>-22 13:52:48.926  16250-16250/com.malinkang.layoutinflater D/MainActivity﹕ android.widget.TextView{41b6f0a8 V.ED.... ......ID 0,0-0,0}
12-22 13:52:48.926  16250-16250/com.malinkang.layoutinflater D/MainActivity﹕ android.widget.TextView{41b6f870 V.ED.... ......ID 0,0-0,0}
12-22 13:52:48.931  16250-16250/com.malinkang.layoutinflater D/MainActivity﹕ android.widget.LinearLayout{41b6ea50 V.E..... ......I. 0,0-0,0 #7f080000 app:id/container}

所以当不设置Root的时候，XML设置的参数将不起作用，当attachToRoot设置为True时，布局会自动添加到Root，并且返回Root View。




## 阅读更多

* [Making sense of LayoutInflater](http://stackoverflow.com/questions/5026926/making-sense-of-layoutinflater)
* [Layout Inflation as Intended](http://www.doubleencore.com/2013/05/layout-inflation-as-intended/)
* <https://plus.google.com/+SimonVigTherkildsen/posts/Vbtj9fn33Ph>






