# 将文件保存在内部存储中

> 原文：https://developer.android.com/training/data-storage/files/internal

应用程序的内部存储目录由应用程序的程序包名称在Android文件系统的特殊位置指定，可以通过以下API进行访问。

> **注意：**与[外部存储目录](https://developer.android.com/training/data-storage/files/external)不同，您的应用不需要任何系统权限即可读写这些方法返回的内部目录。

## 查询可用空间

如果您提前知道要保存多少数据，则可以通过调用 [`getFreeSpace()`](https://developer.android.com/reference/java/io/File.html#getFreeSpace())或 [`getTotalSpace()`](https://developer.android.com/reference/java/io/File.html#getTotalSpace())来查找是否有足够的可用空间，而不会引起[`IOException`](https://developer.android.com/reference/java/io/IOException) 。这些方法分别提供了存储空间中的当前可用空间和总空间。该信息还可用于避免将存储量填满到某个阈值以上。

但是，系统无法保证您可以写入`getFreeSpace()`所显示的字节数。如果返回的数字比要保存的数据大小大几个MB，或者文件系统的存储空间不足90％，则可以继续。否则，您可能不应该写入存储。

> 获取可用空间大小还可以使用[StatFs](data-storage/files/StatFs.md)类来获取。

## 写一个文件

将文件保存到内部存储器时，可以通过调用以下方法之一来获取适当的目录作为[`File`](https://developer.android.com/reference/java/io/File)对象：

* [getFilesDir()](https://developer.android.com/reference/android/content/Context.html#getFilesDir())：返回代表应用程序内部目录的`File` 。
* [getCacheDir()](https://developer.android.com/reference/android/content/Context.html#getCacheDir())：返回一个代表应用程序临时缓存文件的内部目录的`File` 。请确保在不再需要每个文件后将其删除，并对在任何给定时间使用的内存量实施合理的大小限制，例如1 MB。

> **注意：**如果系统存储空间不足，则可能会在没有警告的情况下删除缓存文件。

要在这些目录之一中创建新文件，可以使用`File()` 构造函数，并传递通过上述指定内部存储目录的方法之一提供的[`File`](https://developer.android.com/reference/java/io/File)。例如：

```java
File file = new File(context.getFilesDir(), filename);
```

要获得更安全的解决方案，请使用[Jetpack安全性](https://developer.android.com/topic/security/data) 库，如以下代码片段所示：

```java
// Although you can define your own key generation parameter specification, it's
// recommended that you use the value specified here.
KeyGenParameterSpec keyGenParameterSpec = MasterKeys.AES256_GCM_SPEC;
String masterKeyAlias = MasterKeys.getOrCreate(keyGenParameterSpec);

// Creates a file with this name, or replaces an existing file
// that has the same name. Note that the file name cannot contain
// path separators.
String fileToWrite = "my_sensitive_data.txt";
try {
    EncryptedFile encryptedFile = new EncryptedFile.Builder(
            new File(directory, fileToWrite),
            context,
            masterKeyAlias,
            EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB
    ).build();

    // Write to a file.
    BufferedWriter writer = new BufferedWriter(new FileWriter(encryptedFile));
    writer.write("MY SUPER-SECRET INFORMATION");
} catch (GeneralSecurityException gse) {
    // Error occurred getting or creating keyset.
} catch (IOException ex) {
    // Error occurred opening file for writing.
}
```

或者，您可以调用 `openFileOutput()`获取一个写入内部目录中文件的[`FileOutputStream`](https://developer.android.com/reference/java/io/FileOutputStream)。例如，以下是将一些文本写入文件的方法：

```java
String filename = "myfile";
String fileContents = "Hello world!";
FileOutputStream outputStream;

try {
    outputStream = openFileOutput(filename, Context.MODE_PRIVATE);
    outputStream.write(fileContents.getBytes());
    outputStream.close();
} catch (Exception e) {
    e.printStackTrace();
}
```

请注意，该`openFileOutput()`方法需要文件模式参数。通过[`MODE_PRIVATE`](https://developer.android.com/reference/android/content/Context.html#MODE_PRIVATE) 使它对您的应用变为私有。从API级别17开始，其他模式选项 [`MODE_WORLD_READABLE`](https://developer.android.com/reference/android/content/Context.html#MODE_WORLD_READABLE") 和 [`MODE_WORLD_WRITEABLE`](https://developer.android.com/reference/android/content/Context.html#MODE_WORLD_WRITEABLE)已被弃用。从Android 7.0（API级别24）开始，如果使用它们，则Android抛出[`SecurityException`](https://developer.android.com/reference/java/lang/SecurityException) 。如果您的应用程序需要与其他应用程序共享私有文件，则应改为使用带有 [`FLAG_GRANT_READ_URI_PERMISSION`](https://developer.android.com/reference/android/content/Intent.html#FLAG_GRANT_READ_URI_PERMISSION) 属性的[`FileProvider`](https://developer.android.com/reference/androidx/core/content/FileProvider)。有关更多信息，请参见[共享文件](https://developer.android.com/training/secure-file-sharing)。

在Android 6.0（API级别23）及更低版本上，如果您将文件模式设置为全球可读，则其他应用程序可以读取您的内部文件。但是，另一个应用程序必须知道您的应用程序包名称和文件名。除非您明确将文件设置为可读或可写，否则其他应用程序将无法浏览您的内部目录并且没有读取或写入权限。因此，只要您在内部存储上为文件使用`MODE_PRIVATE`，其他应用程序就永远无法访问它们。

## 写一个缓存文件

如果您需要缓存某些文件，则应使用 `createTempFile()`。例如，以下方法从[`URL`](https://developer.android.com/reference/java/net/URL)对象中提取文件名， 并在您应用的内部缓存目录中创建一个具有该名称的文件：

```java
private File getTempFile(Context context, String url) {
    // For a more secure solution, use EncryptedFile from the Security library
    // instead of File.
    File file;
    try {
        String fileName = Uri.parse(url).getLastPathSegment();
        file = File.createTempFile(fileName, null, context.getCacheDir());
    } catch (IOException e) {
        // Error while creating file
    }
    return file;
}
```

使用`createTempFile()`创建的文件放置在应用程序专用的缓存目录中。您应该定期[删除](https://developer.android.com/training/data-storage/files/internal#DeleteFile)不再需要[的文件](https://developer.android.com/training/data-storage/files/internal#DeleteFile)。

> **注意：**如果系统存储空间不足，它可能会删除缓存文件而不会发出警告，因此请确保在读取缓存文件之前检查它们是否存在。

## 打开现有文件

您可以使用“ [安全性”库](https://developer.android.com/topic/security/data)以更安全的方式读取文件，如以下代码片段所示：

```java
// Although you can define your own key generation parameter specification, it's
// recommended that you use the value specified here.
KeyGenParameterSpec keyGenParameterSpec = MasterKeys.AES256_GCM_SPEC;
String masterKeyAlias = MasterKeys.getOrCreate(keyGenParameterSpec);

String fileToRead = "my_sensitive_data.txt";
ByteArrayOutputStream byteStream;

EncryptedFile encryptedFile = new EncryptedFile.Builder(
        File(directory, fileToRead),
        context,
        masterKeyAlias,
        EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB
).build();

StringBuffer stringBuffer = new StringBuffer();
try (BufferedReader reader =
             new BufferedReader(new FileReader(encryptedFile))) {

    String line = reader.readLine();
    while (line != null) {
        stringBuffer.append(line).append('\n');
        line = reader.readLine();
    }
} catch (IOException e) {
    // Error occurred opening raw file for reading.
} finally {
    String contents = stringBuffer.toString();
}
```

或者，您可以调用 [`openFileInput(name)`](https://developer.android.com/reference/android/content/Context.html#openFileInput(java.lang.String))，并传递文件名。

您可以通过调用来获取所有应用程序文件名的数组 [`fileList()`](https://developer.android.com/training/data-storage/files/reference/android/content/Context.html#fileList())。

> **注意：**如果需要在安装时将文件打包为可在应用程序中访问的文件，请将文件保存在项目`/res/raw`目录中。您可以使用来打开这些文件 [`openRawResource()`](https://developer.android.com/reference/android/content/res/Resources.html#openRawResource(int))，并传入带有前缀的文件名`R.raw`作为资源ID。此方法返回[`InputStream`](https://developer.android.com/reference/java/io/InputStream)，您可以用来读取文件。您无法写入原始文件。

## 打开目录

您可以使用以下方法在内部文件系统上打开目录：

- `getFilesDir()`

  返回一个`File`对象，该对象表示与您的应用程序唯一关联的文件系统上的目录。

- `getDir(name, mode)`

  在您应用的唯一文件系统目录中创建一个新目录（或打开现有目录）。这个新目录出现在所提供的目录内`getFilesDir()`。

- `getCacheDir()`

  返回一个`File`对象，该对象表示与应用程序唯一关联的文件系统上的缓存目录。该目录用于临时文件，应定期清理。如果磁盘空间不足，系统可能会在那里删除文件，因此请确保在读取缓存文件之前检查它们是否存在。

要在这些目录之一中创建新文件，可以使用`File()` 构造函数，并传递[`File`](https://developer.android.com/reference/java/io/File)上述方法之一指定的内部存储目录所提供的对象。例如：

```java
File directory = context.getFilesDir();
File file = new File(directory, filename);
```

## 删除文件

您应该始终删除应用不再需要的文件。删除文件的最简单的方法是调用 [`File`](https://developer.android.com/reference/java/io/File)上的 [`delete()`](https://developer.android.com/reference/java/io/File.html#delete())对象：

如果文件保存在内部存储器中，您还可以`Context`通过调用 [`deleteFile()`](https://developer.android.com/reference/android/content/Context.html#deleteFile(java.lang.String))来要求查找和删除文件：

>**注意：**当用户卸载您的应用时，Android系统会删除以下内容：
>
>* 您保存在内部存储器中的所有文件。
>
>* 您使用保存了外部存储的所有文件`getExternalFilesDir()`。
>
>  但是，您应该手动删除`getCacheDir()` 定期创建的所有缓存文件， 并定期删除不再需要的其他文件。



## 额外资源

有关将文件保存到设备的存储器的更多信息，请查阅以下资源。

### 代码实验室

* [保持敏感数据的安全和私有](https://codelabs.developers.google.com/codelabs/android-storage-permissions/)