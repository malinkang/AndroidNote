## EditText使用

### 控制确认键操作

![](images/imeoptions.png)

通过EditText的` android:imeOptions`属性可以指定动作。

```xml

            <EditText
                android:id="@+id/et_search"
                android:layout_width=“match_parent”
                android:layout_height="match_parent"
                android:singleLine="true"
                android:imeOptions="actionSearch"
               />

```
操作监听器。
```java
   mSearchEditText.setOnEditorActionListener(new TextView.OnEditorActionListener() {
            @Override
            public boolean onEditorAction(TextView v, int actionId, KeyEvent event) {
                if (actionId == EditorInfo.IME_ACTION_SEARCH ||
                        actionId == EditorInfo.IME_ACTION_DONE ||
                        event.getAction() == KeyEvent.ACTION_DOWN &&
                                event.getKeyCode() == KeyEvent.KEYCODE_ENTER) {
                               search();
                    return true;
                }
                return false;
            }
        });
```