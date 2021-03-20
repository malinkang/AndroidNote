# Untitled

> As I’ve written before, you can bind data to automatically set user input into a view model. For example, you might want to bind a user’s name so that when it is changed by the user, it is available immediately in the view model:

正如我之前写过的，你可以绑定数据来自动设置用户输入到视图模型中。例如，你可能想绑定一个用户的名字，这样当用户更改名字时，它就可以立即在`ViewMode`中使用。

```markup
<EditText
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:text="@={data.firstName}"
    android:textSize="16sp"/>
```

> Directly binding a property to an attribute works well when the view model’s type matches the attribute type. Unfortunately, this isn’t always the case. If the user enters a numeric value in an EditText, it won’t automatically be converted to an integer.

当视图模型的类型与属性类型相匹配时，将属性直接绑定到属性上的效果很好。不幸的是，这并非总是如此。如果用户在EditText中输入一个数值，它不会自动转换为一个整数。

### 单向转换功能

