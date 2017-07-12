#### 动态参数

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


#### 属性 Setters

无论何时绑定值改变，生成的binding类必须调用一个setter方法。Data binding框架有一些方法来定制调用哪个方法来设置值。

##### 自动 Setters

对于一个属性，Data Binding会试图寻找属性相对应的set方法。例如TextView的android:text属性的表达式会寻找一个setText的方法。如果相关的set方法没有相应的属性，您可以通过Data Binding轻松地为任何setter“创造”属性。例如，DrawerLayout没有任何属性，但大量的setters。您可以自定义属性来调用相应的set方法。

```xml
<android.support.v4.widget.DrawerLayout
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    app:scrimColor="@{@color/scrim}"
    app:drawerListener="@{fragment.drawerListener}"/>
```

##### 重命名的Setters

一些有setters的属性按名称并不匹配,例如`android:tint`属性与setImageTintList相关联，而不与setTint相关。`BindingMethods`可以重新为属性指定方法。

```java
@BindingMethods({
       @BindingMethod(type = "android.widget.ImageView",
                      attribute = "android:tint",
                      method = "setImageTintList"),
})
```

##### 自定义Setters

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





