# 保存键值对数据

> 原文：[https://developer.android.com/training/data-storage/shared-preferences](https://developer.android.com/training/data-storage/shared-preferences)

如果您要保存的键值集合相对较小，则应使用`SharedPreferences`API。一个`SharedPreferences`对象指向一个包含键-值对的文件，并提供简单的方法来读取和写入它们。`shared preference`文件以xml格式存储在`/data/data/<package name>/shared_prefs`目录下。每个 `SharedPreferences`文件都由框架管理，可以是私有的也可以是共享的。

该页面显示了如何使用`SharedPreferences`API来存储和检索简单值。

> **注意：**这些`SharedPreferences`API用于读取和写入键值对，因此请勿将它们与`Preference`API 混淆 ，以帮助您为应用程序设置构建用户界面（尽管它们也用于`SharedPreferences`保存用户的设置）。

## 获取SharedPreference

您可以通过调用以下方法之一来创建新的共享首选项文件或访问现有的文件：

* `getSharedPreferences()`—如果需要多个用名称标识的`shared preference`文件，请使用此方法，并用第一个参数指定名称。您可以从应用程序中的任何一个`Context`调用它 。
* `getPreferences()`— 如果只需要为`Activity`使用一个`shared preference`文件，则从中使用此 选项。因为这会检索属于该活动的默认共享首选项文件，所以您无需提供名称。

例如，以下代码访问由资源字符串标识的共享首选项文件，`R.string.preference_file_key`并使用私有模式将其打开，因此仅您的应用可以访问该文件：

```java
Context context = getActivity();
SharedPreferences sharedPref = context.getSharedPreferences(
        getString(R.string.preference_file_key), Context.MODE_PRIVATE);
```

命名共享首选项文件时，应使用可唯一识别您的应用程序的名称。一种简单的方法是在文件名前加上[应用程序ID](https://developer.android.com/studio/build/application-id.html)。例如： `"com.example.myapp.PREFERENCE_FILE_KEY"`

另外，对于`Activity`如果您只需要一个共享的首选项文件来，则可以使用以下 `getPreferences()`方法

```java
SharedPreferences sharedPref = getActivity().getPreferences(Context.MODE_PRIVATE);
```

> 注意：`MODE_WORLD_READABLE` 和`MODE_WORLD_WRITEABLE`从API17开始已经过时，Android7.0开始，如果使用这两种模式将会抛出`SecurityException`异常。如果你的应用需要和其他app共享私有数据，应当使用 `FileProvider`

如果您使用`SharedPreferences`API来保存应用程序设置，则应改为使用`getDefaultSharedPreferences()`来获取整个应用程序的默认共享首选项文件。

## 写Shared Preference

要写入共享的首选项文件，通过调用`SharedPreferences`的`edit()`方法创建一个`SharedPreferences.Editor`对象。

通过如`putInt()`和`puString()`等方法传递你想要写入的key和value。然后调用 `apply()`或 `commit()`保存更改。例如：

```java
SharedPreferences sharedPref = getActivity().getPreferences(Context.MODE_PRIVATE);
SharedPreferences.Editor editor = sharedPref.edit();
editor.putInt(getString(R.string.saved_high_score_key), newHighScore);
editor.commit();
```

`apply()`会立即改变内存中的[SharedPreferences](https://developer.android.com/reference/android/content/SharedPreferences.html)对象，但是异步写入更新到硬盘。或者，你可以使用`commit()`同步写入数据到硬盘。因为`commit()`是同步的，你应该避免在主线程调用它，因为它可能暂停你的UI渲染。

## 读Shared Preference

为了从`shared preference`中读取数据，可以通过类似于 `getInt()` 和`getString()`等方法来读取。在那些方法里面传递我们想要获取的value对应的key，并提供一个默认的`value`作为查找的`key`不存在时函数的返回值。如下：

```java
SharedPreferences sharedPref = getActivity().getPreferences(Context.MODE_PRIVATE);
int defaultValue = getResources().getInteger(R.integer.saved_high_score_default_key);
int highScore = sharedPref.getInt(getString(R.string.saved_high_score_key), defaultValue);
```

## 其他资源

* [全面剖析SharedPreferences](http://gityuan.com/2017/06/18/SharedPreferences/)

