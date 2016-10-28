
ButterKnife是一个Android View注入的库。

### 1 配置Eclipse

在使用ButterKnife需要先配置一下Eclipse。

项目右键-Properties-Java Complier-Annotation Processing 确保设置和下图一致

![](http://jakewharton.github.io/butterknife/static/ide-eclipse1.png)

接着展开Annotation Processing选择Factory Path,选中Enable project specific settings。然后点击 Add JARs...,选中ButterKnife的jar包

![](http://jakewharton.github.io/butterknife/static/ide-eclipse2.png)

然后点击ok保存设置，Eclipse将问你是否重新构建新项目，点击Yes。

确保你项目的根目录里有一个.apt_generated的文件夹，文件夹中包含YOURACTIVITY$$ViewInjector.java这样的文件。

## 2 使用注解

在Activity中使用注解

```java
class ExampleActivity extends Activity {
  @InjectView(R.id.title) TextView title;
  @InjectView(R.id.subtitle) TextView subtitle;
  @InjectView(R.id.footer) TextView footer;

  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.simple_activity);
    ButterKnife.inject(this);
    // TODO Use "injected" views...
  }
}
```

Fragment中使用注解

```java

public class FancyFragment extends Fragment {
  @InjectView(R.id.button1) Button button1;
  @InjectView(R.id.button2) Button button2;

  @Override View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
    View view = inflater.inflate(R.layout.fancy_fragment, container, false);
    ButterKnife.inject(this, view);
    // TODO Use "injected" views...
    return view;
  }
}

```

Adapter中使用注解


```java
public class MyAdapter extends BaseAdapter {
  @Override public View getView(int position, View view, ViewGroup parent) {
    ViewHolder holder;
    if (view != null) {
      holder = (ViewHolder) view.getTag();
    } else {
      view = inflater.inflate(R.layout.whatever, parent, false);
      holder = new ViewHolder(view);
      view.setTag(holder);
    }

    holder.name.setText("John Doe");
    // etc...

    return convertView;
  }

  static class ViewHolder {
    @InjectView(R.id.title) TextView name;
    @InjectView(R.id.job_title) TextView jobTitle;

    public ViewHolder(View view) {
      ButterKnife.inject(this, view);
    }
  }
}

```

## 3.事件注入

点击事件注入
```java

@OnClick(R.id.submit)
public void sayHi(Button button) {
  button.setText("Hello!");
}
```

多个控件具有相同的事件
```java
@OnClick({ R.id.door1, R.id.door2, R.id.door3 })
public void pickDoor(DoorView door) {
  if (door.hasPrizeBehind()) {
    Toast.makeText(this, "You win!", LENGTH_SHORT).show();
  } else {
    Toast.makeText(this, "Try again", LENGTH_SHORT).show();
  }
}
```

## 4.重置注入


```
public class FancyFragment extends Fragment {
  @InjectView(R.id.button1) Button button1;
  @InjectView(R.id.button2) Button button2;

  @Override View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
    View view = inflater.inflate(R.layout.fancy_fragment, container, false);
    ButterKnife.inject(this, view);
    // TODO Use "injected" views...
    return view;
  }

  @Override void onDestroyView() {
    super.onDestroyView();
    ButterKnife.reset(this);
  }
}

```

## 可选注入

默认情况下@InjectView和@OnClick注入是必选的，如果view未找到将出现异常。为了避免出现异常，添加一个@Optional注解。

##其它
ButterKnife还包含了两个findById方法。

```

View view = LayoutInflater.from(context).inflate(R.layout.thing, null);
TextView firstName = ButterKnife.findById(view, R.id.first_name);
TextView lastName = ButterKnife.findById(view, R.id.last_name);
ImageView photo = ButterKnife.findById(view, R.id.photo);

```

##混淆
为避免混淆的时代码被移除，所以要在proguard-project.txt中添加如下代码避免混淆

```
-dontwarn butterknife.internal.**
-keep class **$$ViewInjector { *; }
-keepnames class * { @butterknife.InjectView *;}

```


##扩展阅读
[Butterknife](http://jakewharton.github.io/butterknife/)














