## 获取AndroidManifest.xml信息


相关对象：

* PackageManager：包管理器
* PackageInfo：包含AndroidManifest中所有的信息。
* ApplicationInfo：包含`<application>`标签内的信息。


获取VersionCode

```java
    // 获取版本号
    public int getVersionCode() {
        PackageManager manager = this.getPackageManager();
        try {
            PackageInfo info = manager.getPackageInfo(this.getPackageName(), 0);
            return info.versionCode;
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
            return -1;
        }
    }
```


获取MetaDat信息

```java
public String getMetaData() {
            ApplicationInfo info;
            try {
                info = this.getPackageManager().getApplicationInfo(this.getPackageName(), PackageManager.GET_META_DATA);
return info.metaData.getString("meta-data key");//
            } catch (PackageManager.NameNotFoundException e) {
                e.printStackTrace();
                return null;
            }
        }

    }
```



