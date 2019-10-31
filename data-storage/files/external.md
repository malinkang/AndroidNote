# 将文件保存到外部存储中

使用外部存储非常适合您要与其他应用程序共享或允许用户使用计算机访问的文件。

外部存储设备通常可以通过可移动设备（例如SD卡）获得。Android使用路径表示这些设备，例如`/sdcard`。

在[请求存储权限](https://developer.android.com/training/data-storage/files/external#ExternalStoragePermissions)并[确认存储可用之后](https://developer.android.com/training/data-storage/files/external#CheckExternalAvail)，您可以保存以下类型的文件：

- [公用文件](https://developer.android.com/training/data-storage/files/external#PublicFiles)：应可供其他应用和用户自由使用的文件。当用户卸载您的应用程序时，这些文件应保持对用户可用。例如，您的应用捕获的照片应另存为公共文件。
- [私人文件](https://developer.android.com/training/data-storage/files/external#PrivateFiles)：存储在特定于应用程序的目录中的文件-使用 [`Context.getExternalFilesDir()`](https://developer.android.com/reference/android/content/Context.html#getExternalFilesDir(java.lang.String))访问。用户卸载您的应用程序时，将清理这些文件。尽管这些文件位于外部存储上，但从技术上讲用户和其他应用程序都可以访问这些文件，但它们无法为应用程序外部的用户提供价值。使用此目录存储您不想与其他应用程序共享的文件。

> **警告：**如果用户卸下或断开外部存储设备（例如SD卡）的连接，则存储在外部存储中的文件可能变得不可用。如果您的应用程序的功能取决于这些文件，则应改为将文件写入[内部存储](https://developer.android.com/training/data-storage/files/internal)。

本指南介绍了如何管理设备外部存储设备上可用的文件。有关如何使用内部存储中文件的指南，请参阅有关如何[管理内部存储中文件](https://developer.android.com/training/data-storage/files/internal)的指南。

## 设置虚拟外部存储设备

在没有可移动外部存储的设备上，使用以下命令启用虚拟磁盘以进行测试：

```she
adb shell sm set-virtual-disk true
```

## 请求外部存储权限

Android包含以下访问外部存储中文件的权限：

* [`READ_EXTERNAL_STORAGE`](https://developer.android.com/reference/android/Manifest.permission.html#READ_EXTERNAL_STORAGE)允许应用访问外部存储设备中的文件。

* [`WRITE_EXTERNAL_STORAGE`](https://developer.android.com/reference/android/Manifest.permission.html#WRITE_EXTERNAL_STORAGE)允许应用写入和修改外部存储设备中的文件。拥有此权限的应用程序也会自动获得`READ_EXTERNAL_STORAGE` 权限。

从Android 4.4（API级别19）开始，在特定于应用的目录中读写文件不需要任何与存储相关的权限。因此，如果您的应用程序支持Android 4.3（API级别18）及更低版本，并且您只想访问特定于应用程序的目录，则应通过添加以下[`maxSdkVersion`](https://developer.android.com/guide/topics/manifest/uses-permission-element.html#maxSdk) 属性来声明仅在较低版本的Android上请求权限 ：

```java
<manifest ...>
    <!-- If you need to modify files in external storage, request
         WRITE_EXTERNAL_STORAGE instead. -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
                     android:maxSdkVersion="18" />
</manifest>
```

> **注意：**如果您的应用程序使用[作用域存储](https://developer.android.com/training/data-storage/files/external-scoped)，则无需声明任何与存储相关的权限，除非您的应用程序访问其他应用程序创建的文件。

## 验证外部存储是否可用

由于外部存储可能不可用（例如，当用户将存储安装在另一台计算机上或已卸下提供外部存储的SD卡时），因此在访问卷之前，应始终验证该卷是否可用。您可以通过调用 [`getExternalStorageState()`](https://developer.android.com/reference/android/os/Environment.html#getExternalStorageState())来查询外部存储状态。如果返回状态为[`MEDIA_MOUNTED`](https://developer.android.com/reference/android/os/Environment.html#MEDIA_MOUNTED)，则可以读取和写入文件。如果是 [`MEDIA_MOUNTED_READ_ONLY`](https://developer.android.com/reference/android/os/Environment.html#MEDIA_MOUNTED_READ_ONLY)，则只能读取文件。

例如，以下方法对于确定存储可用性很有用：

```java
/* Checks if external storage is available for read and write */
public boolean isExternalStorageWritable() {
    String state = Environment.getExternalStorageState();
    if (Environment.MEDIA_MOUNTED.equals(state)) {
        return true;
    }
    return false;
}

/* Checks if external storage is available to at least read */
public boolean isExternalStorageReadable() {
    String state = Environment.getExternalStorageState();
    if (Environment.MEDIA_MOUNTED.equals(state) ||
        Environment.MEDIA_MOUNTED_READ_ONLY.equals(state)) {
        return true;
    }
    return false;
}
```

如果要从“媒体扫描器”隐藏文件，请在应用程序特定目录中包含一个命名为`.nomedia`的空文件（注意文件名中的点前缀）。这样可以防止媒体扫描器读取您的媒体文件，并通过[`MediaStore`](https://developer.android.com/reference/android/provider/MediaStore)API 将其提供给其他应用 。

## 保存到私人目录

如果您想将应用程序专用的文件保存到外部存储中，则可以通过调用[`getExternalFilesDir()`](https://developer.android.com/reference/android/content/Context.html#getExternalFilesDir(java.lang.String)) 并传递一个名称来表示您想要的目录类型来获取应用程序特定的目录 。以这种方式创建的每个目录都将添加到一个父目录，该目录封装了您应用程序的所有外部存储文件，当用户卸载您的应用程序时，系统会对其进行清理。

以下代码段显示了如何为单个相册创建目录：

```java
public File getPrivateAlbumStorageDir(Context context, String albumName) {
    // Get the directory for the app's private pictures directory.
    File file = new File(context.getExternalFilesDir(
            Environment.DIRECTORY_PICTURES), albumName);
    if (!file.mkdirs()) {
        Log.e(LOG_TAG, "Directory not created");
    }
    return file;
}
```

请务必使用API常量（如）提供的目录名称 [`DIRECTORY_PICTURES`](https://developer.android.com/reference/android/os/Environment.html#DIRECTORY_PICTURES)。这些目录名称可确保系统正确处理文件。例如， 系统媒体扫描器将保存到[`DIRECTORY_RINGTONES`](https://developer.android.com/reference/android/os/Environment.html#DIRECTORY_RINGTONES)的文件分类为铃声而不是音乐。

如果没有一个预定义的子目录名称适合您的文件，则可以调用`getExternalFilesDir()`和传递`null`。这将在外部存储上返回您应用的私有目录的根目录。

## 在多个存储位置之间选择

有时，分配内部存储器分区以用作外部存储器的设备*还会*提供SD卡插槽。这意味着该设备具有两个不同的外部存储目录，因此在将“专用”文件写入外部存储时，需要选择要使用的目录。

从Android 4.4（API级别19）开始，您可以通过调用`getExternalFilesDirs()`来访问两个位置 ，这将返回一个[`File`](https://developer.android.com/reference/java/io/File)数组，其中包含每个存储位置的条目。阵列中的第一个条目被视为主要的外部存储，除非该位置已满或不可用，否则应使用该位置。

如果您的应用支持Android 4.3及更低版本，则应使用支持库的静态方法 `ContextCompat.getExternalFilesDirs()`。这总是返回一个`File`数组，但是如果设备运行的是Android 4.3及更低版本，则它仅包含一个用于主要外部存储的条目。（如果还有第二个存储位置，则无法在Android 4.3及更低版本上访问它。）

###  唯一的卷名

面向Android 10（API级别29）或更高版本的应用可以访问系统为每个外部存储设备分配的唯一名称。该命名系统可以帮助您有效地组织内容并为其编制索引，并且可以控制新内容的存储位置。

主共享存储设备始终称为`VOLUME_EXTERNAL_PRIMARY`。您可以通过调用查找其他卷 [`MediaStore.getExternalVolumeNames()`](https://developer.android.com/reference/android/provider/MediaStore.html#getExternalVolumeNames(android.content.Context))。

要查询，插入，更新或删除特定的卷，请将卷名传递给 [`MediaStore`](https://developer.android.com/reference/android/provider/MediaStore)API中任何可用的`getContentUri()`方法，例如以下代码段：

```java
// Assumes that the storage device of interest is the 2nd one
// that your app recognizes.
val volumeNames = MediaStore.getExternalVolumeNames(context)
val selectedVolumeName = volumeNames[1]
val collection = MediaStore.Audio.Media.getContentUri(selectedVolumeName)
// ... Use a ContentResolver to add items to the returned media collection.
```

## 额外资源

有关将文件保存到设备的存储器的更多信息，请查阅以下资源。

### 代码实验室

- [保持敏感数据的安全和私有](https://codelabs.developers.google.com/codelabs/android-storage-permissions/)