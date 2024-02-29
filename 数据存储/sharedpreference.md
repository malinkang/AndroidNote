
## 获取SharedPreferences对象


### getPreferences()

```java
//frameworks/base/core/java/android/app/Activity.java
public SharedPreferences getPreferences(@Context.PreferencesMode int mode) {
    return getSharedPreferences(getLocalClassName(), mode);
}
//frameworks/base/core/java/android/content/ContextWrapper.java
public SharedPreferences getSharedPreferences(String name, int mode) {
    return mBase.getSharedPreferences(name, mode);
}
```


### getLocalClassName()

```java
//frameworks/base/core/java/android/app/Activity.java
public String getLocalClassName() {
    final String pkg = getPackageName();
    final String cls = mComponent.getClassName();
    int packageLen = pkg.length();
    if (!cls.startsWith(pkg) || cls.length() <= packageLen
            || cls.charAt(packageLen) != '.') {
        return cls;
    }
    return cls.substring(packageLen+1);
}
```


### getSharedPreferences()

```java
//frameworks/base/core/java/android/app/ContextImpl.java
private ArrayMap<String, File> mSharedPrefsPaths;
@Override
public SharedPreferences getSharedPreferences(String name, int mode) {
    // At least one application in the world actually passes in a null
    // name.  This happened to work because when we generated the file name
    // we would stringify it to "null.xml".  Nice.
    if (mPackageInfo.getApplicationInfo().targetSdkVersion <
            Build.VERSION_CODES.KITKAT) {
        if (name == null) {
            name = "null";
        }
    }

    File file;
    synchronized (ContextImpl.class) {
        if (mSharedPrefsPaths == null) {
            mSharedPrefsPaths = new ArrayMap<>();
        }
        file = mSharedPrefsPaths.get(name);
        if (file == null) {
					  //获取路径
            file = getSharedPreferencesPath(name);
            mSharedPrefsPaths.put(name, file);
        }
    }
		//调用重载方法getSharedPreferences
    return getSharedPreferences(file, mode);
}
```


### getSharedPreferencesPath()

```java
@Override
public File getSharedPreferencesPath(String name) {
    return makeFilename(getPreferencesDir(), name + ".xml");
}
```


### getPreferencesDir()

```java
//frameworks/base/core/java/android/app/ContextImpl.java
private File getPreferencesDir() {
    synchronized (mSync) {
        if (mPreferencesDir == null) {
            mPreferencesDir = new File(getDataDir(), "shared_prefs");
        }
        return ensurePrivateDirExists(mPreferencesDir);
    }
}
```

```kotlin
private static File ensurePrivateDirExists(File file) {
        return ensurePrivateDirExists(file, 0771, -1, null);
}
```


### getDataDir()

```java
@Override
public File getDataDir() {
    if (mPackageInfo != null) {
        File res = null;
        if (isCredentialProtectedStorage()) {
            res = mPackageInfo.getCredentialProtectedDataDirFile();
        } else if (isDeviceProtectedStorage()) {
            res = mPackageInfo.getDeviceProtectedDataDirFile();
        } else {
            res = mPackageInfo.getDataDirFile();
        }
        if (res != null) {
            if (!res.exists() && android.os.Process.myUid() == android.os.Process.SYSTEM_UID) {
                Log.wtf(TAG, "Data directory doesn't exist for package " + getPackageName(),
                        new Throwable());
            }
            return res;
        } else {
            throw new RuntimeException(
                    "No data directory found for package " + getPackageName());
        }
    } else {
        throw new RuntimeException(
                "No package details found for package " + getPackageName());
    }
}
```


### ensurePrivateDirExists()

```java
//frameworks/base/core/java/android/app/ContextImpl.java
private static File ensurePrivateDirExists(File file, int mode, int gid, String xattr) {
	  //如果不存在
    if (!file.exists()) {
        final String path = file.getAbsolutePath();
        try {
            Os.mkdir(path, mode);
            Os.chmod(path, mode);
            if (gid != -1) {
                Os.chown(path, -1, gid);
            }
        } catch (ErrnoException e) {
            if (e.errno == OsConstants.EEXIST) {
                // We must have raced with someone; that's okay
            } else {
                Log.w(TAG, "Failed to ensure " + file + ": " + e.getMessage());
            }
        }

        if (xattr != null) {
            try {
                final StructStat stat = Os.stat(file.getAbsolutePath());
                final byte[] value = new byte[8];
                Memory.pokeLong(value, 0, stat.st_ino, ByteOrder.nativeOrder());
                Os.setxattr(file.getParentFile().getAbsolutePath(), xattr, value, 0);
            } catch (ErrnoException e) {
                Log.w(TAG, "Failed to update " + xattr + ": " + e.getMessage());
            }
        }
    }
    return file;
}
```


### getSharedPreferences()

```java
@Override
public SharedPreferences getSharedPreferences(File file, int mode) {
    SharedPreferencesImpl sp;
    synchronized (ContextImpl.class) {
        final ArrayMap<File, SharedPreferencesImpl> cache = getSharedPreferencesCacheLocked();
        sp = cache.get(file);
        if (sp == null) {
            checkMode(mode);
            if (getApplicationInfo().targetSdkVersion >= android.os.Build.VERSION_CODES.O) {
                if (isCredentialProtectedStorage()
                        && !getSystemService(UserManager.class)
                                .isUserUnlockingOrUnlocked(UserHandle.myUserId())) {
                    throw new IllegalStateException("SharedPreferences in credential encrypted "
                            + "storage are not available until after user is unlocked");
                }
            }
            //创建SharedPreferencesImpl
            sp = new SharedPreferencesImpl(file, mode);
            cache.put(file, sp);
            return sp;
        }
    }
    //指定多进程模式，则当文件被其他进程修改时，则会重新加载
    if ((mode & Context.MODE_MULTI_PROCESS) != 0 ||
        getApplicationInfo().targetSdkVersion < android.os.Build.VERSION_CODES.HONEYCOMB) {
        // If somebody else (some other process) changed the prefs
        // file behind our back, we reload it.  This has been the
        // historical (if undocumented) behavior.
        sp.startReloadIfChangedUnexpectedly();
    }
    return sp;
}
```


### checkMode()

```java
private void checkMode(int mode) {
     //7.0之后使用MODE_WORLD_READABLE和MODE_WORLD_WRITEABLE会抛异常
    if (getApplicationInfo().targetSdkVersion >= Build.VERSION_CODES.N) {
        if ((mode & MODE_WORLD_READABLE) != 0) {
            throw new SecurityException("MODE_WORLD_READABLE no longer supported");
        }
        if ((mode & MODE_WORLD_WRITEABLE) != 0) {
            throw new SecurityException("MODE_WORLD_WRITEABLE no longer supported");
        }
    }
}
```


### getSharedPreferencesCacheLocked()

```java
private static ArrayMap<String, ArrayMap<File, SharedPreferencesImpl>> sSharedPrefsCache;
private ArrayMap<File, SharedPreferencesImpl> getSharedPreferencesCacheLocked() {
    if (sSharedPrefsCache == null) {
        sSharedPrefsCache = new ArrayMap<>();
    }
    final String packageName = getPackageName();
    ArrayMap<File, SharedPreferencesImpl> packagePrefs = sSharedPrefsCache.get(packageName);
    if (packagePrefs == null) {
        packagePrefs = new ArrayMap<>();
        sSharedPrefsCache.put(packageName, packagePrefs);
    }
    return packagePrefs;
}
```



## **SharedPreferencesImpl分析**



### **SharedPreferencesImpl构造函数**


```java
//frameworks/base/core/java/android/app/SharedPreferencesImpl.java
SharedPreferencesImpl(File file, int mode) {
    //赋值给全局变量
    mFile = file;
    //创建以.bak为后缀的备份文件 发生异常时，可通过备份文件来恢复数据
    mBackupFile = makeBackupFile(file);
    mMode = mode;
    mLoaded = false;
    mMap = null;
    mThrowable = null;
    startLoadFromDisk();
}
```



### **startLoadFromDisk()**

```java
private void startLoadFromDisk() {
    //mLoaded用于标记SP文件已经加载到内存中
    synchronized (mLock) {
        mLoaded = false;
    }
    //开启新线程从硬盘加载
    new Thread("SharedPreferencesImpl-load") {
        public void run() {
            loadFromDisk();
        }
    }.start();
}
```


### **loadFromDisk()**

```java

private void loadFromDisk() {
    synchronized (mLock) {
        if (mLoaded) {
            return;
        }
        if (mBackupFile.exists()) {
            mFile.delete();
            mBackupFile.renameTo(mFile);
        }
    }

    // Debugging
    if (mFile.exists() && !mFile.canRead()) {
        Log.w(TAG, "Attempt to read preferences file " + mFile + " without permission");
    }

    Map<String, Object> map = null;
    StructStat stat = null;
    Throwable thrown = null;
    try {
        stat = Os.stat(mFile.getPath());
        if (mFile.canRead()) {
            BufferedInputStream str = null;
            try {
                //读取流
                str = new BufferedInputStream(
                        new FileInputStream(mFile), 16 * 1024);
                //解析xml
                map = (Map<String, Object>) XmlUtils.readMapXml(str);
            } catch (Exception e) {
                Log.w(TAG, "Cannot read " + mFile.getAbsolutePath(), e);
            } finally {
                IoUtils.closeQuietly(str);
            }
        }
    } catch (ErrnoException e) {
        // An errno exception means the stat failed. Treat as empty/non-existing by
        // ignoring.
    } catch (Throwable t) {
        thrown = t;
    }

    synchronized (mLock) {
        mLoaded = true;
        mThrowable = thrown;

        // It's important that we always signal waiters, even if we'll make
        // them fail with an exception. The try-finally is pretty wide, but
        // better safe than sorry.
        try {
            if (thrown == null) {
                if (map != null) {
                    mMap = map;
                    mStatTimestamp = stat.st_mtim;
                    mStatSize = stat.st_size;
                } else {
                    mMap = new HashMap<>();
                }
            }
            // In case of a thrown exception, we retain the old map. That allows
            // any open editors to commit and store updates.
        } catch (Throwable t) {
            mThrowable = t;
        } finally {
							//提醒
            mLock.notifyAll();
        }
    }
}
```


### getString()

```java
//frameworks/base/core/java/android/app/SharedPreferencesImpl.java
@Override
@Nullable
public String getString(String key, @Nullable String defValue) {
    synchronized (mLock) {
       //检查是否加载完成
        awaitLoadedLocked();
        String v = (String)mMap.get(key);
        return v != null ? v : defValue;
    }
}
```


### awaitLoadedLocked()

```java
private void awaitLoadedLocked() {
    if (!mLoaded) {
        // Raise an explicit StrictMode onReadFromDisk for this
        // thread, since the real read will be in a different
        // thread and otherwise ignored by StrictMode.
        BlockGuard.getThreadPolicy().onReadFromDisk();
    }
    while (!mLoaded) {
        try {
            //当没有加载完成，则进入等待状态
            mLock.wait();
        } catch (InterruptedException unused) {
        }
    }
    if (mThrowable != null) {
        throw new IllegalStateException(mThrowable);
    }
}
```


## **EditorImpl分析**


### edit()

```java
@Override
public Editor edit() {
    // TODO: remove the need to call awaitLoadedLocked() when
    // requesting an editor.  will require some work on the
    // Editor, but then we should be able to do:
    //
    //      context.getSharedPreferences(..).edit().putString(..).apply()
    //
    // ... all without blocking.
    synchronized (mLock) {
        awaitLoadedLocked();
    }
    return new EditorImpl();
}
```


### EditorImpl

```java
//EditorImpl是SharedPreferencesImpl的内部类
public final class EditorImpl implements Editor {
        private final Object mEditorLock = new Object();
        //创建EditorImpl会创建一个Map，并把这些put的数据存储到Map中，当commit的时候，遍历
        //map，并存到mMap中
        @GuardedBy("mEditorLock")
        private final Map<String, Object> mModified = new HashMap<>();

        @GuardedBy("mEditorLock")
        private boolean mClear = false;

        @Override
        public Editor putString(String key, @Nullable String value) {
            synchronized (mEditorLock) {
                mModified.put(key, value);
                return this;
            }
        }
        @Override
        public Editor remove(String key) {
            synchronized (mEditorLock) {
                mModified.put(key, this);
                return this;
            }
        }
        

        @Override
        public Editor clear() {
            synchronized (mEditorLock) {
                mClear = true;
                return this;
            }
        }
}
```


### commit()

```java
@Override
public boolean commit() {
    long startTime = 0;
    if (DEBUG) {
        startTime = System.currentTimeMillis();
    }
    //将数据更新到内存
    MemoryCommitResult mcr = commitToMemory();
    //将内存数据同步到文件
    SharedPreferencesImpl.this.enqueueDiskWrite(
        mcr, null /* sync write on this thread okay */);
    try {
        //进入等待状态，直到写入文件的操作完成
        mcr.writtenToDiskLatch.await();
    } catch (InterruptedException e) {
        return false;
    } finally {
        if (DEBUG) {
            Log.d(TAG, mFile.getName() + ":" + mcr.memoryStateGeneration
                    + " committed after " + (System.currentTimeMillis() - startTime)
                    + " ms");
        }
    }
    //通知监听
    notifyListeners(mcr);
    //返回文件操作的结果数据
    return mcr.writeToDiskResult;
}
```


### commitToMemory()


```java
// Returns true if any changes were made
private MemoryCommitResult commitToMemory() {
    long memoryStateGeneration;
    boolean keysCleared = false;
    List<String> keysModified = null;
    Set<OnSharedPreferenceChangeListener> listeners = null;
    Map<String, Object> mapToWriteToDisk;

    synchronized (SharedPreferencesImpl.this.mLock) {
        // We optimistically don't make a deep copy until
        // a memory commit comes in when we're already
        // writing to disk.
        if (mDiskWritesInFlight > 0) {
            // We can't modify our mMap as a currently
            // in-flight write owns it.  Clone it before
            // modifying it.
            // noinspection unchecked
            mMap = new HashMap<String, Object>(mMap);
        }
        //赋值
        mapToWriteToDisk = mMap;
        mDiskWritesInFlight++;

        boolean hasListeners = mListeners.size() > 0;
        if (hasListeners) {
            keysModified = new ArrayList<String>();
            listeners = new HashSet<OnSharedPreferenceChangeListener>(mListeners.keySet());
        }

        synchronized (mEditorLock) {
            boolean changesMade = false;

            if (mClear) {
                if (!mapToWriteToDisk.isEmpty()) {
                    changesMade = true;
                    mapToWriteToDisk.clear();
                }
                keysCleared = true;
                mClear = false;
            }
            //遍历
            for (Map.Entry<String, Object> e : mModified.entrySet()) {
                String k = e.getKey();
                Object v = e.getValue();
                // "this" is the magic value for a removal mutation. In addition,
                // setting a value to "null" for a given key is specified to be
                // equivalent to calling remove on that key.
                if (v == this || v == null) {
                    //不包含跳出本次循环
                    if (!mapToWriteToDisk.containsKey(k)) {
                        continue;
                    }
                    //包含，调用remove方法
                    mapToWriteToDisk.remove(k);
                } else {
                    //存在key 并且存入的value和将要存入的值相同则跳出本次循环
                    if (mapToWriteToDisk.containsKey(k)) {
                        Object existingValue = mapToWriteToDisk.get(k);
                        if (existingValue != null && existingValue.equals(v)) {
                            continue;
                        }
                    }
                    mapToWriteToDisk.put(k, v);
                }
                //如果执行到这里 说明发生改变
                changesMade = true;
                if (hasListeners) {
                    keysModified.add(k);
                }
            }
            //清理
            mModified.clear();
            //发生改变++
            if (changesMade) {
                mCurrentMemoryStateGeneration++;
            }

            memoryStateGeneration = mCurrentMemoryStateGeneration;
        }
    }
    return new MemoryCommitResult(memoryStateGeneration, keysCleared, keysModified,
            listeners, mapToWriteToDisk);
}
```


### **writeToFile()**

```java
private void writeToFile(MemoryCommitResult mcr, boolean isFromSyncCommit) {
    long startTime = 0;
    long existsTime = 0;
    long backupExistsTime = 0;
    long outputStreamCreateTime = 0;
    long writeTime = 0;
    long fsyncTime = 0;
    long setPermTime = 0;
    long fstatTime = 0;
    long deleteTime = 0;

    boolean fileExists = mFile.exists();


    // Rename the current file so it may be used as a backup during the next read
    if (fileExists) {
         //判断是否需要写入
        boolean needsWrite = false;

        // Only need to write if the disk state is older than this commit
    
        if (mDiskStateGeneration < mcr.memoryStateGeneration) {
            if (isFromSyncCommit) {
                needsWrite = true;
            } else {
                synchronized (mLock) {
                    // No need to persist intermediate states. Just wait for the latest state to
                    // be persisted.
                    if (mCurrentMemoryStateGeneration == mcr.memoryStateGeneration) {
                        needsWrite = true;
                    }
                }
            }
        }
        //不需要写入直接return
        if (!needsWrite) {
            mcr.setDiskWriteResult(false, true);
            return;
        }

        boolean backupFileExists = mBackupFile.exists();
        //备份文件不存在 将当前文件名修改为备份文件
        if (!backupFileExists) {
            if (!mFile.renameTo(mBackupFile)) {
                Log.e(TAG, "Couldn't rename file " + mFile
                        + " to backup file " + mBackupFile);
                mcr.setDiskWriteResult(false, false);
                return;
            }
        } else {
            //存在删除文件
            mFile.delete();
        }
    }

    // Attempt to write the file, delete the backup and return true as atomically as
    // possible.  If any exception occurs, delete the new file; next time we will restore
    // from the backup.
    try {
        FileOutputStream str = createFileOutputStream(mFile);

        if (str == null) {
            mcr.setDiskWriteResult(false, false);
            return;
        }
        XmlUtils.writeMapXml(mcr.mapToWriteToDisk, str);

        writeTime = System.currentTimeMillis();

        FileUtils.sync(str);

        fsyncTime = System.currentTimeMillis();

        str.close();
        ContextImpl.setFilePermissionsFromMode(mFile.getPath(), mMode, 0);

        try {
            final StructStat stat = Os.stat(mFile.getPath());
            synchronized (mLock) {
                mStatTimestamp = stat.st_mtim;
                mStatSize = stat.st_size;
            }
        } catch (ErrnoException e) {
            // Do nothing
        }


        // Writing was successful, delete the backup file if there is one.
        //写入成功删除备份文件
        mBackupFile.delete();

        if (DEBUG) {
            deleteTime = System.currentTimeMillis();
        }

        mDiskStateGeneration = mcr.memoryStateGeneration;
        //返回写入成功，唤醒等待线程
        mcr.setDiskWriteResult(true, true);


        long fsyncDuration = fsyncTime - writeTime;
        mSyncTimes.add((int) fsyncDuration);
        mNumSync++;

        return;
    } catch (XmlPullParserException e) {
        Log.w(TAG, "writeToFile: Got exception:", e);
    } catch (IOException e) {
        Log.w(TAG, "writeToFile: Got exception:", e);
    }

    // Clean up an unsuccessfully written file
    //文件写入失败，则删除未成功写入的文件
    if (mFile.exists()) {
        if (!mFile.delete()) {
            Log.e(TAG, "Couldn't clean up partially-written file " + mFile);
        }
    }
    mcr.setDiskWriteResult(false, false);
}
```


### **apply()**

```java
@Override
public void apply() {
    final long startTime = System.currentTimeMillis();

    final MemoryCommitResult mcr = commitToMemory();
    final Runnable awaitCommit = new Runnable() {
            @Override
            public void run() {
                try {
                    //进入等待状态
                    mcr.writtenToDiskLatch.await();
                } catch (InterruptedException ignored) {
                }

                if (DEBUG && mcr.wasWritten) {
                    Log.d(TAG, mFile.getName() + ":" + mcr.memoryStateGeneration
                            + " applied after " + (System.currentTimeMillis() - startTime)
                            + " ms");
                }
            }
        };

    QueuedWork.addFinisher(awaitCommit);

    Runnable postWriteRunnable = new Runnable() {
            @Override
            public void run() {
                awaitCommit.run();
                QueuedWork.removeFinisher(awaitCommit);
            }
        };

    SharedPreferencesImpl.this.enqueueDiskWrite(mcr, postWriteRunnable);

    // Okay to notify the listeners before it's hit disk
    // because the listeners should always get the same
    // SharedPreferences instance back, which has the
    // changes reflected in memory.
    notifyListeners(mcr);
}
```

`apply` 与`commit`的对比


* apply没有返回值, commit有返回值能知道修改是否提交成功

* apply是将修改提交到内存，再异步提交到磁盘文件; commit是同步的提交到磁盘文件;

* 多并发的提交commit时，需等待正在处理的commit数据更新到磁盘文件后才会继续往下执行，从而降低效率; 而apply只是原子更新到内存，后调用apply函数会直接覆盖前面内存数据，从一定程度上提高很多效率。

获取SP与Editor:

* `getSharedPreferences()`是从`ContextImpl.sSharedPrefsCache`唯一的SPI对象;

* `edit()`每次都是创建新的`EditorImpl`对象.



## 缺点

虽然 `SharedPreferences` 使用非常简便，但也是我们诟病比较多的存储方法。它的性能问题比较多，我可以轻松地说出它的“七宗罪”。

* 跨进程不安全。由于没有使用跨进程的锁，就算使用MODE\_MULTI\_PROCESS，SharedPreferences 在跨进程频繁读写有可能导致数据全部丢失。根据线上统计，SP 大约会有万分之一的损坏率。

* 加载缓慢。`SharedPreferences` 文件的加载使用了异步线程，而且加载线程并没有设置线程优先级，如果这个时候主线程读取数据就需要等待文件加载线程的结束。这就导致出现主线程等待低优先级线程锁的问题，比如一个 100KB 的 SP 文件读取等待时间大约需要 50\~100ms，我建议提前用异步线程预加载启动过程用到的 SP 文件。

* 全量写入。无论是调用 commit() 还是 apply()，即使我们只改动其中的一个条目，都会把整个内容全部写到文件。而且即使我们多次写入同一个文件，SP 也没有将多次修改合并为一次，这也是性能差的重要原因之一。

* 卡顿。由于提供了异步落盘的 apply 机制，在崩溃或者其他一些异常情况可能会导致数据丢失。所以当应用收到系统广播，或者被调用 onPause 等一些时机，系统会强制把所有的 SharedPreferences 对象数据落地到磁盘。如果没有落地完成，这时候主线程会被一直阻塞。这样非常容易造成卡顿，甚至是 ANR，从线上数据来看 SP 卡顿占比一般会超过 5%。


## 参考

* [保存键值对数据](https://developer.android.com/training/data-storage/shared-preferences)

* [全面剖析SharedPreferences](http://gityuan.com/2017/06/18/SharedPreferences/)

* [今日头条 ANR 优化实践系列 - 告别 SharedPreference 等待](https://mp.weixin.qq.com/s/kfF83UmsGM5w43rDCH544g)

* [每日一问 对于SharedPreferences你觉得有什么优缺点？](https://www.wanandroid.com/wenda/show/8656)


