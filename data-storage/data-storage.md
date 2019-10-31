# 数据和文件存储概览



Android 提供多种应用数据保存选项。您所选择的解决方案取决于您的特定需求，例如数据需要多少存储空间、需储存哪种类型的数据，以及数据应该是应用的私有数据，还是可供其他应用和用户访问的数据。

本页面介绍 Android 中可使用的不同数据存储选项：

- [内部文件存储](https://developer.android.com/guide/topics/data/data-storage#filesInternal)：在设备文件系统中存储应用私有文件。
- [外部文件存储](https://developer.android.com/guide/topics/data/data-storage#filesExternal)：在共享外部文件系统中存储文件。此方式通常用于共享的用户文件，如照片。
- [共享首选项](https://developer.android.com/guide/topics/data/data-storage#pref)：在键值对中存储私有的原始数据。
- [数据库](https://developer.android.com/guide/topics/data/data-storage#db)：在私有数据库中存储结构化数据。

除了外部存储的某些文件类型外，所有这些选项均适用于应用私有数据（即其他应用无法自然访问的数据）。如果您希望与其他应用共享文件，则应使用 `FileProvider` API。如需了解详情，请阅读[共享文件](https://developer.android.com/training/secure-file-sharing/index.html)。

如果您希望向其他应用公开应用数据，则可使用 `ContentProvider`。借助内容提供程序，您可以完全控制向其他应用提供哪些读取/写入访问权限，无论您为数据选择何种存储介质（尽管通常为数据库）。如需了解更多信息，请阅读[内容提供程序](https://developer.android.com/guide/topics/providers/content-providers.html)。



## 内部存储

默认情况下，保存至内部存储的文件是应用私有文件，其他应用（和用户）不能访问这些文件（除非拥有 Root 访问权限）。如此一来，内部存储便非常适合保存用户无需直接访问的内部应用数据。在文件系统中，系统会为每个应用提供私有目录，您可以在该目录中整理应用所需的任何文件。

当用户卸载您的应用时，保存在内部存储中的文件也将随之移除。由于存在这一行为，您不应使用内部存储来保存用户希望独立于应用而保留的任何数据。例如，如果您的应用允许用户拍摄照片，用户会希望在卸载该应用后仍能访问这些照片。因此，您应改用 [`MediaStore`](https://developer.android.com/reference/android/provider/MediaStore) API 将这些类型的文件保存至合适的媒体集合中。

如需了解详情，请阅读如何[在内部存储中保存文件](https://developer.android.com/training/data-storage/files.html#WriteInternalStorage)，以及如何使用 `MediaStore`，[根据搜索查询播放音乐](https://developer.android.com/guide/components/intents-common#PlaySearch)。

### 内部缓存文件

如果您想暂时保留而非永久存储某些数据，则应使用特殊的缓存目录来保存这些数据。针对这些类型的文件，每个应用都有专门的私有缓存目录。当设备的内部存储空间不足时，Android 可能会删除这些缓存文件以回收空间。但是，您不应依赖系统为您清理这些文件，而应始终自行维护缓存文件，使其占用的空间保持在合理的限制范围内（例如 1 MB）。当用户卸载您的应用时，这些文件也会随之移除。

有关更新信息，请参阅如何[编写缓存文件](https://developer.android.com/training/data-storage/files.html#WriteCacheFileInternal)。

## 外部存储

每个 Android 设备都支持共享的“外部存储”空间，您可以使用该空间存储文件。称其为外部空间的原因是，用户并非始终都能访问该空间。用户可以外部存储设备的形式，将此存储空间安装到计算机中，甚至将其随身携带（如 SD 卡）。保存至外部存储的文件是全局可读取文件，而且当在计算机上启用 USB 大容量存储来传输文件时，用户可对这些文件进行修改。

因此，在尝试访问应用外部存储中的文件时，您应检查外部存储目录及您尝试访问的文件是否可用。

通常，如果用户数据可供其他应用访问，并且即便在用户卸载应用后也可对其进行保存（例如拍摄的照片或下载的文件），则您应为其使用外部存储。针对这些类型的文件，系统会为其提供标准的公共目录，因此用户只需一个位置便可保存该目录下的所有照片、铃声、音乐等数据。

您还可将文件保存至应用特定目录的外部存储中，当用户卸载您的应用时，系统会删除该目录。如果您需要更多存储空间，此选项可能是可替代内部存储的实用方案，但用户并非始终都能访问存储在此空间中的文件，因为其可能会移除存储 SD 卡。但这些文件仍是全局可读取文件，只不过其他应用无法共享保存该文件的位置。

如需了解更多信息，请阅读如何[在外部存储中保存文件](https://developer.android.com/training/data-storage/files.html#WriteExternalStorage)。

##共享首选项

如果您无需存储大量数据和存储结构，则应使用 `SharedPreferences`。借助 `SharedPreferences` API，您可以读取和写入原始数据类型（布尔型、浮点型、整型、长整型和字符串型）的永久性键值对。

系统会将键值对写入 XML 文件，而这类文件会永久保留在用户会话中（即便系统终止应用）。您可以手动指定文件名称，也可使用每个 Activity 的文件来保存数据。

API 名称“共享首选项”有一定的误导性，因为此 API 并不严格用于保存“用户首选项”，例如用户选择的铃声。您可以使用 `SharedPreferences` 来保存任何类型的简单数据，例如用户的高分。但是，如果您*确实*想要保存应用的用户首选项，请阅读如何[创建设置界面](https://developer.android.com/guide/topics/ui/settings.html)，从而使用 AndroidX `Preference Library` 来构建设置屏幕并自动保留用户的设置。

如要了解如何存储任何类型的键值数据，请阅读[使用共享首选项保存键值数据](https://developer.android.com/training/data-storage/shared-preferences.html)。

## 数据库

Android 提供了对 SQLite 数据库的完整支持。只有您的应用才能访问您所创建的任何数据库。但是，我们建议您使用 [Room 持久存储库](https://developer.android.com/training/data-storage/room/index.html)（而非直接使用 SQLite API）创建数据库并与之交互。

Room 库提供对象映射的抽象层，可实现流畅的数据库访问，同时利用 SQLite 的全部功能。

尽管您仍可[使用 SQLite 直接保存数据](https://developer.android.com/training/data-storage/sqlite.html)，但 SQLite API 的层级相当低，使用它时需花费大量时间和精力。例如：

- 原始 SQL 查询没有编译时验证。
- 随着模式的更改，您需手动更新受影响的 SQL 查询。此过程可能非常耗时且容易出错。
- 您需要编写大量样板文件代码，以便在 SQL 查询和 Java 数据对象之间进行转换。

在通过 SQLite 提供抽象层时，[Room 持久存储库](https://developer.android.com/training/data-storage/room/index.html)可为您解决这些问题。

有关演示如何使用 Room 的示例应用，请参阅 GitHub 上的以下内容：

- [Android 架构组件基本示例](https://github.com/googlesamples/android-architecture-components/tree/master/BasicSample)
- [Room 和 RxJava 示例](https://github.com/googlesamples/android-architecture-components/tree/master/BasicRxJavaSample)
- [Room 迁移示例](https://github.com/googlesamples/android-architecture-components/tree/master/PersistenceMigrationsSample)

### 数据库调试

Android SDK 包含一项 `sqlite3` 数据库工具，利用此工具可以浏览表内容、运行 SQL 命令，以及在 SQLite 数据库上执行其他实用功能。如需了解详细信息，请参阅 [adb 文档](https://developer.android.com/studio/command-line/adb.html#othershellcommands)。

## 其他资源

如需了解有关数据存储的更多信息，请参阅以下资源。

### Codelab

- [保持敏感数据的安全性和私密性](https://codelabs.developers.google.com/codelabs/android-storage-permissions/)