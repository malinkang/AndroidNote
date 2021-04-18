# databinding坑

## EditText 

```markup
<TextView
    android:id="@+id/btn_login"
    android:onClick="@{()->handlers.login(etLoginUsername.text.toString(),etLoginPsw.text.toString())}"
    android:layout_width="match_parent"
    android:layout_height="@dimen/dp_68"
    android:layout_below="@+id/rl_netsetting"
    android:layout_marginLeft="@dimen/dp_53"
    android:layout_marginTop="@dimen/dp_90"
    android:layout_marginRight="@dimen/dp_53"
    android:background="@drawable/selector_login_common_btn_bg"
    android:gravity="center"
    android:text="@string/tpLogin_Login_btn"
    android:textColor="@color/color_FFFFFF"
    android:textSize="@dimen/sp_27" />
```

![](../.gitbook/assets/image%20%2810%29.png)

两个EditText一个报错，另外一个不报错，不报错的EditText，每次输入新内容，获取的值也没变化，解决方案text改成getText\(\)

[https://stackoverflow.com/questions/51678059/how-to-use-android-data-binding-properly](https://stackoverflow.com/questions/51678059/how-to-use-android-data-binding-properly)

