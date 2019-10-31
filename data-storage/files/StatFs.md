## StatFs 类

[StatFs](https://developer.android.com/reference/android/os/StatFs.html)用于获取文件系统的所有空间信息，这是一个对unix中的`statvfs()`函数的包装。

StatFs 的构造函数需要传入一个路径。

StatFs (String path)

常用方法包括如下：

* getAvailableBlocks()：获取可用空间的块数。这个方法在API 18的时候过时，用getAvailableBlocksLong()替代。
* getAvailableBytes()：获取可用的字节数。
* getBlockCount()：获取总的块数。这个方法在API 18的时候过时，用getBlockCountLong()替代。
* getBlockSize()：获取每块的字节数。这个方法在API 18的时候过时，用getBlockSizeLong()替代。
* getFreeBlocks()：获取文件系统中，总的空闲块数，包括保留的块数。这个方法在API 18的时候过时，用getFreeBlocksLong()替代。
* getFreeBytes()：获取文件系统中，总的空闲大小(字节数)，包括保留块。
* getTotalBytes()：获取问价系统中支持的最大字节数。
* restat()：

获取SD卡总的空间大小

```java
//获取SD卡总的空间大小
public static String getSDTotalSize(Context context) {
    File sdcardDir = Environment.getExternalStorageDirectory();
    StatFs statFs = new StatFs(sdcardDir.getPath());
    long blockSize = 0;
    long blockCount =0;
    if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.JELLY_BEAN_MR2){
        blockSize = statFs.getBlockSizeLong();
        blockCount = statFs.getBlockCountLong();
    }else{
        blockSize = statFs.getBlockSize();
        blockCount = statFs.getBlockCount();
    }
    return Formatter.formatFileSize(context,blockSize * blockCount);
}

```
获取SD卡可用空间大小
```java
//获取SD卡可用空间大小
public static String getSdAvaliableSize(Context context) {
    File path = Environment.getExternalStorageDirectory();
    StatFs statFs = new StatFs(path.getPath());
    long blockSize=0;
    long availableBlocks = 0;
    if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.JELLY_BEAN_MR2){
        blockSize = statFs.getBlockSizeLong();
        availableBlocks = statFs.getAvailableBlocksLong();
    }else{
        blockSize = statFs.getBlockSize();
        availableBlocks = statFs.getAvailableBlocks();
    }
    return Formatter.formatFileSize(context,blockSize* availableBlocks);
}
```
```java
Log.d(TAG,"SD 卡总的大小是"+ FileUtil.getSDTotalSize(this));
Log.d(TAG,"SD 卡总的可用大小"+ FileUtil.getSdAvaliableSize(this));
StatFs statFs=new StatFs(Environment.getExternalStorageDirectory().getPath());
//API>=18时可以直接调用这两个方法来获取总的大小和可用大小
Log.d(TAG,"getTotalBytes() "+ Formatter.formatFileSize(this,statFs.getTotalBytes()));
Log.d(TAG,"getAvailableBytes() "+ Formatter.formatFileSize(this,statFs.getAvailableBytes()));
```

日志输出：

```
D/MainActivity: SD 卡总的大小是12.55 GB
D/MainActivity: SD 卡总的可用大小7.72 GB
D/MainActivity: getTotalBytes() 12.55 GB
D/MainActivity: getAvailableBytes() 7.72 GB
```
