### 构建环境

要使用Data Binding，需要添加`dataBinding`元素到app模块下的`build.gradle`文件下。

```java
android {
    ....
    dataBinding {
        enabled = true    
    }    
}
```

### 创建数据绑定布局文件

数据绑定的布局文件和普通的布局文件对比有如下不同：根标签是`layout`，接下来是一个`data`元素和一个view的根元素。

```xml 
<layout xmlns:android="http://schemas.android.com/apk/res/android">
  <data>
    <variable name="user" type="cn.malinkang.databinding.User"/>
  </data>
  <LinearLayout
      android:orientation="vertical"
      android:layout_width="match_parent"
      android:layout_height="match_parent">
    <TextView android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="@{user.firstName}"/>
    <TextView android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="@{user.lastName}"/>
  </LinearLayout>
</layout>
```


`variable`元素用来定义变量，`type`是变量类型，name是变量名。

在布局中通过`@{}`语法将变量的属性值设置给View的属性。

数据绑定中的data可以是POJO对象，也可以是JavaBean对象。在POJO对象中`@{}`获取的值是直接调用属性的值，而JavaBean则是通过属性的get方法获取值。例如上面的例子中`android:text="@{user.firstName}`，如果User是POJO对象，则访问的是`firstName`属性，如果是JavaBean，则是通过调用`getFirstName()`方法获取值。


POJO对象：

```java
public class User {
   public final String firstName;
   public final String lastName;
   public User(String firstName, String lastName) {
       this.firstName = firstName;
       this.lastName = lastName;
   }
}
```

JavaBean对象：

```java
public class User {
   private final String firstName;
   private final String lastName;
   public User(String firstName, String lastName) {
       this.firstName = firstName;
       this.lastName = lastName;
   }
   public String getFirstName() {
       return this.firstName;
   }
   public String getLastName() {
       return this.lastName;
   }
}
```

#### 导入

数据绑定的布局文件允许利用`import`元素像Java一样导入其他数据类型。例如下面代码就导入一个View。

```xml
<data>
    <import type="android.view.View"/>
</data>
```

现在，View对象可以在绑定表达式中使用。

```java
<TextView
   android:text="@{user.lastName}"
   android:layout_width="wrap_content"
   android:layout_height="wrap_content"
   android:visibility="@{user.isAdult ? View.VISIBLE : View.GONE}"/>
```

当类名出现冲突，可以指定一个别名

```java
<import type="android.view.View"/>
<import type="com.example.real.estate.View"
        alias="Vista"/>

```

除了可以在表达式中使用，也可以在`variable`中使用。

```xml
<data>
    <import type="com.example.User"/>
    <import type="java.util.List"/>
    <variable name="user" type="User"/>
    <variable name="userList" type="List&lt;User&gt;"/>
 </data>

```

导入的类型还可以在表达式中使用static属性和方法

```xml
<data>
    <import type="com.example.MyStringUtils"/>
    <variable name="user" type="com.example.User"/>
</data>
…
<TextView
   android:text="@{MyStringUtils.capitalize(user.lastName)}"
   android:layout_width="wrap_content"
   android:layout_height="wrap_content"/>
```
#### 引入

如果相同的布局被重复使用，我们会把他单独放在一个布局文件中使用`include`标签引入。数据绑定可以使用应用命名空间和变量名将变量从容器布局中传递到被包含的布局中。

被包含的布局文件`user.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<layout xmlns:android="http://schemas.android.com/apk/res/android">
  <data>
    <import type="cn.malinkang.databinding.User"/>
    <variable
        name="user"
        type="User"
        />
  </data>
  <LinearLayout
      android:layout_width="match_parent"
      android:layout_height="wrap_content"
      android:orientation="vertical"
      >
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="@{user.firstName}"
        />
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="@{user.lastName}"
        />
  </LinearLayout>
</layout>
```

容器布局文件`activity_main.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<layout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:bind="http://schemas.android.com/apk/res-auto"
    >
  <data>
    <variable
        name="user"
        type="cn.malinkang.databinding.User"
        />
  </data>
  <LinearLayout
      android:layout_width="match_parent"
      android:layout_height="match_parent"
      android:orientation="vertical"
      >
    <include
        layout="@layout/user"
        bind:user="@{user}"
        />
    <include
        layout="@layout/user"
        bind:user="@{user}"
        />
  </LinearLayout>
</layout>
```




### 绑定数据

数据绑定是通过`Binding`类进行绑定的，创建一个数据绑定布局，编译器会自动生成一个`Binding`类。该类包含了设置变量的方法，比如上面的布局生成的绑定类会有一个`setUser(User User)`方法。

默认情况下，一个Binding类会基于布局文件的名称而产生，将布局文件名改为驼峰命名，并添加“Binding”后缀。例如布局文件为`activity_main.xml`，则会生的类名为`ActivityMainBinding`。


在Activity中创建`Binding`类的实例可以通过`DataBindingUtil`的`setContentView`方法来创建。

```java
ActivityMainBinding binding = DataBindingUtil.setContentView(this, R.layout.activity_main);
User user = new User("linkang","ma");
binding.setUser(user);
```
也可以通过生成的Binding类的inflate方法获取View，该方法只会生成View不会添加到Activity上。

```java
ActivityMainBinding binding = ActivityMainBinding.inflate(getLayoutInflater());
User user = new User("linkang","ma");
binding.setUser(user);
setContentView(binding.getRoot());
```

在Fragment中创建Binding类。

```java
FragmentBinding binding =
        FragmentBinding.inflate(inflater, container, false);
//或者
FragmentBinding binding =
    DataBindingUtil.inflate(inflater, R.layout.fragment_my, container, false);
User user = new User("linkang", "ma");
binding.setUser(user);
return binding.getRoot();
```


上面已经了解了`Binding`类名的生成规则，我们也可以自定义生成的`Binding`类的类名。`data`元素的class属性可以指定生成的类名。

```xml
<data class="MainBinding">
...
</data>
```

生成的MainBinding类位于MainActivity包下的`databinding`包中，比如MainActivity位于`cn.malinkang.databinding`的包中，MainBinding位于`cn.malinkang.databinding.databinding`包中。还可以通过`.`前缀指定相对包名，例如在`MainBinding`前面添加`.`，生成的MainBinding类位于`cn.malinkang.databinding`包中。

```xml
<data class=".MainBinding">
...
</data>
```

也可以指定全包名

```java
<data class="com.malinkang.MainBinding">
...
</data>
```

### 事件处理

数据绑定允许写表达式来处理views分发的事件，比如`onClick`事件。事件属性名称与监听器方法的名称一致，例如`View.OnLongClickListener`监听器方法为`onLongClick()`，对应属性为`android:onLongClick`。

有两种处理事件的方法：

* 方法引用
* 监听器绑定

#### 方法引用

当设置的方法的参数签名和监听器实现方法的签名一致时，则采用方法引用。数据绑定将方法引用和当前View对象一起传递给一个监听器，并将这个监听器设置给当前View对象。

```java
public class MyHandlers {
  public static final String TAG = MyHandlers.class.getSimpleName();

  public void showLog(View view) {
    Log.d(TAG, "showLog: " + view);
  }
  public void showToast(View view,User user){
    Toast.makeText(view.getContext(), "hello,"+user.getFirstName(), Toast.LENGTH_SHORT).show();
  }
}
```
`showLog(View view)`签名与`onClick(View view)`方法签名一致，采用方法引用

```xml
<layout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:bind="http://schemas.android.com/apk/res-auto"
    >
  <data>
    <variable
        name="handlers"
        type="cn.malinkang.databinding.MyHandlers"
        />

  </data>
  <LinearLayout
      android:layout_width="match_parent"
      android:layout_height="match_parent"
      android:orientation="vertical"
      >
    <Button
        android:text="Handle Event"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:onClick="@{handlers::showLog}"
        />
  </LinearLayout>
</layout>
```

#### 监听器绑定

监听器绑定是当事件发生时运行的绑定表达式。它们与方法引用类似，但它们允许你运行任意数据绑定表达式。

在方法引用中，方法的参数必须与事件监听器的参数匹配。当方法签名与监听器方法签名不一致时，采用监听器绑定。上面的showToast方法与方法签名不一致，则采用监听器绑定。

```xml
<?xml version="1.0" encoding="utf-8"?>
<layout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:bind="http://schemas.android.com/apk/res-auto"
    >
  <data>
    <variable
        name="handlers"
        type="cn.malinkang.databinding.MyHandlers"
        />

  </data>
  <LinearLayout
      android:layout_width="match_parent"
      android:layout_height="match_parent"
      android:orientation="vertical"
      >
    <Button
        android:text="Handle Event"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:onClick="@{(v) -> handlers.showToast(v,user)}"
        />
  </LinearLayout>
</layout>
```

### 表达语言

#### 常见特性


表达式语言看起来很像Java表达式。下面这些表达式用法是一样的：

* 数学运算符`+``-``*``/``%`
* 字符串连接符 `+`
* 逻辑运算符 `&& `||`
* 位运算符 `&` `|` `^`
* 一元运算`+``-``!``~`
* 移位 `>>` `>>>` `<<`
* 比较运算符 `==` `>` `<` `>=` `<=`
* instanceof
* 分组()
* null
* Cast
* 方法调用
* 数组访问 `[]`
* 三元运算 `?:`

#### 不支持的操作

* this
* super
* new
* 显式泛型调用


#### Null合并操作

`??`- 左边的对象如果它不是`null`，选择左边的对象；或者如果它是`null`，选择右边的对象。例如下面的例子中如果displayName不为空则将user.displayName设置给text属性，如果为空则将user.lastName设置给text属性。

```java
android:text="@{user.displayName ?? user.lastName}"
```
上面表达式等价于下面的表达式

```java
android:text="@{user.displayName != null ? user.displayName : user.lastName}"
```

#### 避免空指针

Data Binding代码生成时自动检查是否为nulls来避免出现空指针错误。例如，在表达式@{user.name}中，如果user是null，user.name会赋予它的默认值（null）。如果你引用user.age，age是int类型，那么它的默认值是0。


#### 集合

常用的集合包括`Arrays`、`List`、`SparseArray`和`Map`，这些都可以使用`[]`操作符来访问

```xml
<data>
    <import type="android.util.SparseArray"/>
    <import type="java.util.Map"/>
    <import type="java.util.List"/>
    <variable name="list" type="List&lt;String&gt;"/>
    <variable name="sparse" type="SparseArray&lt;String&gt;"/>
    <variable name="map" type="Map&lt;String, String&gt;"/>
    <variable name="index" type="int"/>
    <variable name="key" type="String"/>
</data>
…
android:text="@{list[index]}"
…
android:text="@{sparse[index]}"
…
android:text="@{map[key]}"

```

#### 字符串字面量

如果想要在表达式中使用字符串字面量，则属性值需要设置成单引号

```xml
android:text='@{map["firstName"]}'
```
也可以将字符串使用单引号或者使用`

```xml
android:text="@{map[`firstName`}"
android:text="@{map['firstName']}"
```

#### 资源

也可以在表达式中访问资源

```xml
android:padding="@{large? @dimen/largePadding : @dimen/smallPadding}"
```

支持字符串的格式化

```xml
<string name="info">first name is %1$s last name is %2$s age is %3$d</string>

<TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text='@{@string/info(user.firstName,user.lastName,user.age)}'
        />
```

在表达式中引用一些资源与直接引用资源有所不同，需要显示判断类型


| 类型   |      正常引用     |  表达式引用 |
|----------|:-------------:|------:|
|String[] |  @array | @stringArray |
| int[]   |       @array  |   @intArray |
| TypedArray | @array |   @typedArray|
| Animator | @animator|   @animator|
| StateListAnimator | @animator |   @stateListAnimator|
| color int | @color |   @color|
| ColorStateList | @color |   @color|


### 数据对象

前面已经介绍了如何将绑定对象，但是当数据发生改变时，不会导致UI更新。

数据绑定可以通过以下三种方式实现数据变化通知：

* Observable对象
* Observable字段
* Observable集合


#### Observable对象

实现android.databinding.Observable接口的类可以允许附加一个监听器到绑定对象以便监听对象上的所有属性的变化。

Observable接口负责添加和删除监听器，但通知与否由开发人员管理。为了简化开发，创建了一个基类BaseObservable，以实现侦听器注册机制。数据类实现者仍然负责通知属性何时改变。这是通过将Bindable注释分配给getter并在setter中通知的。

```java
public class User extends BaseObservable {
  private String firstName;
  private String lastName;
  private int age;

  public User(String firstName, String lastName, int age) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.age = age;
  }

  @Bindable public String getFirstName() {
    return firstName;
  }

  public void setFirstName(String firstName) {
    this.firstName = firstName;
    notifyPropertyChanged(BR.firstName);
  }

  @Bindable public String getLastName() {
    return lastName;
  }

  public void setLastName(String lastName) {
    this.lastName = lastName;
    notifyPropertyChanged(BR.lastName);
  }

  @Bindable public int getAge() {
    return age;
  }

  public void setAge(int age) {
    this.age = age;
    notifyPropertyChanged(BR.age);
  }
}

```
在MyHandlers中定义修改年龄的方法

```java
public class MyHandlers {
  public void changeAge(User user){
    user.setAge(user.getAge()+1);
  }
}
```

```xml
<?xml version="1.0" encoding="utf-8"?>
<layout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:bind="http://schemas.android.com/apk/res-auto"
    >
  <data>
    <variable
        name="user"
        type="cn.malinkang.databinding.User"
        />
    <variable
        name="handlers"
        type="cn.malinkang.databinding.MyHandlers"
        />

  </data>
  <LinearLayout
      android:layout_width="match_parent"
      android:layout_height="match_parent"
      android:orientation="vertical"
      >
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text='@{@string/info(user.firstName,user.lastName,user.age)}'
        />
    <Button
        android:text="Chage Age"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:onClick="@{() -> handlers.changeAge(user)}"
        />
  </LinearLayout>
</layout>
```

在编译期间，Bindable注解在BR类文件中生成一个Entry。BR类文件会在模块包内生成。如果数据类的基类不能改变，Observable接口通过方便的PropertyChangeRegistry来实现用于储存和有效地通知监听器。

#### Observable字段

ObservableField用于将字段包装成一个可观察的对象。数据绑定提供了如下类 ObservableBoolean, ObservableByte, ObservableChar, ObservableShort, ObservableInt, ObservableLong, ObservableFloat, ObservableDouble, and ObservableParcelable.这些类中都持有一个基本类型，当内部的基本类型发生改变，ui将进行刷新。



```java
public class User  {
  public ObservableField<String> firstName;
  public ObservableField<String> lastName;
  public ObservableInt age;

  public User(String firstName, String lastName, int age) {
    this.firstName = new ObservableField<>(firstName);
    this.lastName = new ObservableField<>(lastName);
    this.age = new ObservableInt(age);
  }
  
}
```

```java
public class MyHandlers {
  public void changeAge(User user){
    user.age.set(user.age.get()+1);
  }
}
```

#### Observable集合

数据绑定提供了`ObservableArrayList`、`ObservableArrayMap`等可观察的集合类，当集合中数据发生改变，则自动刷新数据。




### 动态参数

RecyclerView的Adapter的Data Binding需要动态生成。因此我们可以在 onCreateViewHolder 的时候创建这个 DataBinding，然后在 onBindViewHolder 中获取这个 DataBinding。

```java
public class UserAdapter extends RecyclerView.Adapter<UserAdapter.UserViewHolder>{
    private Context mContext;
    private List<User> mUsers;
    public UserAdapter(Context context, List<User> users){
        this.mContext = context;
        this.mUsers = users;
    }

    @Override
    public UserViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(mContext).inflate(R.layout.item_user,parent,false);
        return new UserViewHolder(view);
    }

    @Override
    public void onBindViewHolder(UserViewHolder holder, int position) {
        holder.getBinding().setUser(mUsers.get(position));
        holder.getBinding().executePendingBindings();
    }

    @Override
    public int getItemCount() {
        return mUsers.size();
    }

    static class UserViewHolder extends RecyclerView.ViewHolder{
        ItemUserBinding binding;
        public UserViewHolder(View itemView) {
            super(itemView);
            binding = DataBindingUtil.bind(itemView);
        }
        public ItemUserBinding getBinding(){
            return binding;
        }
    }
}
```


### 属性 Setters

无论何时绑定值改变，生成的binding类必须调用一个setter方法。Data binding框架有一些方法来定制调用哪个方法来设置值。

#### 自动 Setters

对于一个属性，Data Binding会试图寻找属性相对应的set方法。例如TextView的android:text属性的表达式会寻找一个setText的方法。如果相关的set方法没有相应的属性，您可以通过Data Binding轻松地为任何setter“创造”属性。例如，DrawerLayout没有任何属性，但大量的setters。您可以自定义属性来调用相应的set方法。

```xml
<android.support.v4.widget.DrawerLayout
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    app:scrimColor="@{@color/scrim}"
    app:drawerListener="@{fragment.drawerListener}"/>
```

#### 重命名的Setters

一些有setters的属性按名称并不匹配,例如`android:tint`属性与setImageTintList相关联，而不与setTint相关。`BindingMethods`可以重新为属性指定方法。

```java
@BindingMethods({
       @BindingMethod(type = "android.widget.ImageView",
                      attribute = "android:tint",
                      method = "setImageTintList"),
})
```

#### 自定义Setters

有些属性需要自定义绑定逻辑。例如，对于android:paddingLeft属性并没有相关setter。相反，setPadding(left, top, right, bottom)是存在在。`BindingAdapter`注解允许开发者自定义setter方法。
```java
@BindingAdapter("android:paddingLeft")
public static void setPaddingLeft(View view, int padding) {
   view.setPadding(padding,
                   view.getPaddingTop(),
                   view.getPaddingRight(),
                   view.getPaddingBottom());
}
```
当有冲突时，开发人员创建的Binding适配器将覆盖Data Binding默认适配器。

您也可以创建可以接收多个参数的适配器。

```java
@BindingAdapter({"bind:imageUrl", "bind:error"})
public static void loadImage(ImageView view, String url, Drawable error) {
   Picasso.with(view.getContext()).load(url).error(error).into(view);
}
```

```xml
<ImageView app:imageUrl=“@{venue.imageUrl}”
app:error=“@{@drawable/venueError}”/>
```



### 常见问题

* [Android DataBinding Custom Binding Adapter Warning](https://stackoverflow.com/questions/35313466/android-databinding-custom-binding-adapter-warning)
### 参考

* [Data Binding Guide](https://developer.android.com/tools/data-binding/guide.html)
* [Google数据绑定系列文章](https://medium.com/@georgemount007)
* [Two-way Android Data Binding](https://medium.com/@fabioCollini/android-data-binding-f9f9d3afc761)
* [MVVM on Android using the Data Binding Library](http://stablekernel.com/blog/mvvm-on-android-using-the-data-binding-library/)



