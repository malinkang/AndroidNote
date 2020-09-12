# 数据和文件存储

Android 使用的文件系统类似于其他平台上基于磁盘的文件系统。该系统为您提供了以下几种保存应用数据的选项：

* **应用专属存储空间**：存储仅供应用使用的文件，可以存储到内部存储卷中的专属目录或外部存储空间中的其他专属目录。使用内部存储空间中的目录保存其他应用不应访问的敏感信息。
* **共享存储**：存储您的应用打算与其他应用共享的文件，包括媒体、文档和其他文件。
* **偏好设置**：以键值对形式存储私有原始数据。
* **数据库**：使用 Room 持久性库将结构化数据存储在专用数据库中。

下表汇总了这些选项的特点：

| 内容类型 | 访问方法 | 所需权限 | 其他应用是否可以访问？ | 卸载应用时是否移除文件？ |  |
| :--- | :---: | :--- | :--- | :--- | :--- |
| [应用专属文件](https://developer.android.com/training/data-storage/app-specific) | 仅供您的应用使用的文件 | 从内部存储空间访问，可以使用 `getFilesDir()` 或 `getCacheDir()` 方法  从外部存储空间访问，可以使用 `getExternalFilesDir()` 或 `getExternalCacheDir()` 方法 | 从内部存储空间访问不需要任何权限  如果应用在搭载 Android 4.4（API 级别 19）或更高版本的设备上运行，从外部存储空间访问不需要任何权限 | 如果文件存储在内部存储空间中的目录内，则不能访问  如果文件存储在外部存储空间中的目录内，则可以访问 | 是 |
| [媒体](https://developer.android.com/training/data-storage/shared/media) | 可共享的媒体文件（图片、音频文件、视频） | `MediaStore` API | 在 Android 10（API 级别 29）或更高版本中，访问其他应用的文件需要 `READ_EXTERNAL_STORAGE` 或 `WRITE_EXTERNAL_STORAGE` 权限  在 Android 9（API 级别 28）或更低版本中，访问**所有**文件均需要相关权限 | 是，但其他应用需要 `READ_EXTERNAL_STORAGE` 权限 | 否 |
| [文档和其他文件](https://developer.android.com/training/data-storage/shared/documents-files) | 其他类型的可共享内容，包括已下载的文件 | 存储访问框架 | 无 | 是，可以通过系统文件选择器访问 | 否 |
| [应用偏好设置](https://developer.android.com/training/data-storage/shared-preferences) | 键值对 | [Jetpack Preferences](https://developer.android.com/guide/topics/ui/settings/use-saved-values) 库 | 无 | 否 | 是 |
| 数据库 | 结构化数据 | [Room](https://developer.android.com/training/data-storage/room) 持久性库 | 无 | 否 | 是 |

您应根据自己的具体需求选择解决方案：

 **您的数据需要占用多少空间**

 内部存储空间中用于存储应用专属数据的空间有限。如果您需要保存大量数据，请使用其他类型的存储空间。 

**数据访问需要达到怎样的可靠程度？**

 如果应用的基本功能需要某些数据（例如应用启动时需要的数据），可以将相应数据存放到内部存储目录或数据库中。存储在外部存储空间中的应用专属文件并非一直可以访问，因为有些设备允许用户移除提供外部存储空间的实体设备。

 **您需要存储哪类数据？**

 如果数据仅供您的应用使用，应使用应用专属存储空间。对于可分享的媒体内容，应使用共享的存储空间，以便其他应用可以访问相应内容。对于结构化数据，应使用偏好设置（适合键值对数据）或数据库（适合包含 2 个以上列的数据）。

 **数据是否应仅供您的应用使用？**

 在存储敏感数据（不可通过任何其他应用访问的数据）时，应使用内部存储空间、偏好设置或数据库。内部存储空间的一个额外优势是用户无法看到相应数据。

## 存储位置的类别

Android 提供两类物理存储位置：内部存储空间和外部存储空间。在大多数设备上，内部存储空间小于外部存储空间。不过，所有设备上的内部存储空间都是始终可用的，因此在存储应用所依赖的数据时更为可靠。

可移除卷（例如 SD 卡）在文件系统中属于外部存储空间。Android 使用路径（例如 `/sdcard`）表示这些存储设备。

{% hint style="info" %}
**注意**：可用于保存文件的确切位置可能因设备而异。因此，请勿使用硬编码的文件路径。
{% endhint %}

默认情况下，应用本身存储在内部存储空间中。不过，如果您的 APK 非常大，也可以在应用的清单文件中指明偏好设置，以便将应用安装到外部存储空间：

```markup
    <manifest ...
      android:installLocation="preferExternal">
      ...
    </manifest>
```

## 对外部存储空间的访问和所需权限

Android 为对外部存储空间的读写访问定义了以下权限：[`READ_EXTERNAL_STORAGE`](https://developer.android.com/reference/android/Manifest.permission#READ_EXTERNAL_STORAGE) 和 [`WRITE_EXTERNAL_STORAGE`](https://developer.android.com/reference/android/Manifest.permission#WRITE_EXTERNAL_STORAGE)。

在较低版本的 Android 系统中，应用需要声明这些权限才能访问位于外部存储空间中[应用专属目录](https://developer.android.com/training/data-storage/app-specific#external)之外的任何文件。Android 系统的版本越新，就越依赖于文件的用途而不是位置来确定应用对文件的访问能力。这种基于用途的存储模型可增强用户隐私保护，因为应用只能访问其在设备文件系统中实际使用的区域。

### 分区存储

为了让用户更好地管理自己的文件并减少混乱，以 Android 10（API 级别 29）及更高版本为目标平台的应用在默认情况下被赋予了对外部存储空间的分区访问权限（即分区存储）。此类应用只能访问外部存储空间上的应用专属目录，以及本应用所创建的特定类型的媒体文件。

{% hint style="info" %}
**注意**：如果您的应用在运行时请求与存储空间相关的权限，面向用户的对话框会表明您的应用正在请求对外部存储空间的广泛访问，即使已启用分区存储也是如此。
{% endhint %}

除非您的应用需要访问存储在[应用专属目录](https://developer.android.com/training/data-storage/app-specific)和 [`MediaStore`](https://developer.android.com/reference/android/provider/MediaStore) API 可以访问的目录之外的文件，否则请使用分区存储。如果您将应用专属文件存储在外部存储空间中，则可以将这些文件存放在[外部存储空间中的应用专属目录](https://developer.android.com/training/data-storage/app-specific#external)内，以便更加轻松地采用分区存储。这样，在启用分区存储后，您的应用将可以继续访问这些文件。

如果应用的其他用例不在分区存储的涵盖范围内，请[提交功能请求](https://source.android.com/setup/contribute/report-bugs)并[使用平台提供的应用兼容性功能](https://developer.android.com/training/data-storage/compatibility)。

## 对文件执行操作的最佳做法

本部分介绍了一些从应用打开和共享文件的一般最佳法。

#### 请勿反复打开和关闭文件 <a id="open-close-files"></a>

为确保应用的性能不受影响，请勿多次打开和关闭同一文件。对于系统来说，打开文件并首次读取文件的成本很高。

#### 共享单个文件 <a id="share-individual-files"></a>

如果您需要与其他应用共享单个文件或应用数据，可以使用 Android 提供的以下 API：

* 如果您需要[与其他应用共享特定文件](https://developer.android.com/training/secure-file-sharing)，请使用 [`FileProvider`](https://developer.android.com/reference/androidx/core/content/FileProvider) API。
* 如果您需要向其他应用提供数据，可以使用[内容提供器](https://developer.android.com/guide/topics/providers/content-providers)。借助内容提供器，您可以完全控制向其他应用提供的读取和写入访问权限。尽管您可以将内容提供器与任何存储媒介一起使用，但它们通常与数据库一起使用。

## 查看设备上的文件

您可以使用 Android Studio 的[设备文件浏览器](https://developer.android.com/studio/debug/device-file-explorer)查看存储在设备上的文件。

## 参考

* [为采用分区存储做好准备（2019 年 Android 开发者峰会）](https://www.youtube.com/watch?v=UnJ3amzJM94)

###  

  


