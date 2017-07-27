

zipalign是一个归档对齐工具，可为Android应用程序（APK）文件提供重要优化。目的是确保所有未压缩的数据以相对于文件开头的特定对齐开始。特别地，它会使APK内的所有未压缩数据（如图像或原始文件）在4字节边界上对齐。这允许使用mmap（）直接访问所有部分，即使它们包含具有对齐限制的二进制数据。这有利于是减少运行应用程序时使用的RAM量。


通过修改zip本地文件头部分中的“额外”字段的大小来进行调整。Android构建工具可以为您处理。 Android Studio会自动对齐您的APK。

>注意：您必须在应用程序构建过程的两个特定点之一使用zipalign，具体取决于您使用的是哪个应用程序签名工具：
如果您使用apksigner，则只能在APK文件签名之前执行zipalign。如果您使用apksigner签名APK并对APK进行进一步更改，则其签名将无效。
如果您使用jarsigner，则只能在APK文件签名后执行zipalign。


https://developer.android.com/studio/command-line/zipalign.html