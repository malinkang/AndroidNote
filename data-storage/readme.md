# 数据存储

## 管理存储设备上的所有文件

### 申请权限

```xml
<!--清单文件中注册-->
<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE"/>
```

```java
//判断是否大于Android11 并且没有权限
if(!Environment.isExternalStorageManager()){
    Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
    Uri uri = Uri.fromParts("package", "com.gbwhatsapp", null);
    intent.setData(uri);
    context.startActivity(intent);
}
```

```shell
#通过adb 打开
adb shell am start -a android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION
```