
## DiskLruCache使用

```java
//1.创建DiskLruCache对象DiskLruCache diskLruCache = DiskLruCache.open(directory, APP_VERSION, VALUE_COUNT, maxSize);//2.获取Editor对象DiskLruCache.Editor editor = diskLruCache.edit(key);//3.获取输出流OutputStream outputStream = editor.newOutputStream(0);//4.向输出流写入数据//...//5.提交editor.commit();
```


## 创建DiskLruCache

```java
//构造函数，私有private DiskLruCache(File directory, int appVersion, int valueCount, long maxSize) {  this.directory = directory; //存储的目录  this.appVersion = appVersion; //应用版本号  this.journalFile = new File(directory, JOURNAL_FILE);  this.journalFileTmp = new File(directory, JOURNAL_FILE_TEMP);  this.journalFileBackup = new File(directory, JOURNAL_FILE_BACKUP);  this.valueCount = valueCount;//一个key对应value的个数通常为1  this.maxSize = maxSize;//缓存的最大值}
```

```java
public static DiskLruCache open(File directory, int appVersion, int valueCount, long maxSize)    throws IOException {  if (maxSize <= 0) {    throw new IllegalArgumentException("maxSize <= 0");  }  if (valueCount <= 0) {    throw new IllegalArgumentException("valueCount <= 0");  }  // If a bkp file exists, use it instead.  File backupFile = new File(directory, JOURNAL_FILE_BACKUP);  //判断是否存在journal.bkp文件  if (backupFile.exists()) {    //journal.bkp文件存在 则判断journal是否存在    File journalFile = new File(directory, JOURNAL_FILE);    // If journal file also exists just delete backup file.    //如果journal存在，删除journal.bkp    if (journalFile.exists()) {      backupFile.delete();    } else {      //不存在journal文件，则重命名journal.bkp为journal      renameTo(backupFile, journalFile, false);    }  }  // Prefer to pick up where we left off.  //创建DiskLruCache  DiskLruCache cache = new DiskLruCache(directory, appVersion, valueCount, maxSize);  //如果journalFile存在则调用readJournal读取数据  if (cache.journalFile.exists()) {    try {      cache.readJournal();      cache.processJournal();      return cache;    } catch (IOException journalIsCorrupt) {      System.out          .println("DiskLruCache "              + directory              + " is corrupt: "              + journalIsCorrupt.getMessage()              + ", removing");      cache.delete();    }  }  // Create a new empty cache.  directory.mkdirs();  cache = new DiskLruCache(directory, appVersion, valueCount, maxSize);  //如果journalFile不存在调用rebuildJournal方法。  cache.rebuildJournal();  return cache;}
```


### rebuildJournal()

```java
private synchronized void rebuildJournal() throws IOException {    if (journalWriter != null) {      closeWriter(journalWriter);    }    //向journal.tmp写入    Writer writer = new BufferedWriter(        new OutputStreamWriter(new FileOutputStream(journalFileTmp), Util.US_ASCII));    try {      writer.write(MAGIC); //libcore.io.DiskLruCache 类似于class的魔数吧校验journal文件      writer.write("\n");      writer.write(VERSION_1); //1      writer.write("\n");      writer.write(Integer.toString(appVersion)); //版本号      writer.write("\n");      writer.write(Integer.toString(valueCount));      writer.write("\n");      writer.write("\n");      //遍历重新写入      for (Entry entry : lruEntries.values()) {        if (entry.currentEditor != null) {          writer.write(DIRTY + ' ' + entry.key + '\n');        } else {          writer.write(CLEAN + ' ' + entry.key + entry.getLengths() + '\n');        }      }    } finally {      closeWriter(writer);    }    //如果journal存在重命名为journal.bkp    if (journalFile.exists()) {      renameTo(journalFile, journalFileBackup, true);    }    //journal.tmp重命名为journal    renameTo(journalFileTmp, journalFile, false);    //删除备份文件    journalFileBackup.delete();    journalWriter = new BufferedWriter(        new OutputStreamWriter(new FileOutputStream(journalFile, true), Util.US_ASCII));}
```

![](https://malinkang-1253444926.cos.ap-beijing.myqcloud.com/images/java/image-20210719201140396.png)
image-20210719201140396

```java
private void readJournal() throws IOException {  //创建StrictLineReader  StrictLineReader reader = new StrictLineReader(new FileInputStream(journalFile), Util.US_ASCII);  try {    String magic = reader.readLine();    String version = reader.readLine();    String appVersionString = reader.readLine();    String valueCountString = reader.readLine();    String blank = reader.readLine();    if (!MAGIC.equals(magic)        || !VERSION_1.equals(version)        || !Integer.toString(appVersion).equals(appVersionString)        || !Integer.toString(valueCount).equals(valueCountString)        || !"".equals(blank)) {      throw new IOException("unexpected journal header: [" + magic + ", " + version + ", "          + valueCountString + ", " + blank + "]");    }    int lineCount = 0;    while (true) {      try {        //读取行        readJournalLine(reader.readLine());        lineCount++;      } catch (EOFException endOfJournal) {        break;      }    }    redundantOpCount = lineCount - lruEntries.size();    // If we ended on a truncated line, rebuild the journal before appending to it.    if (reader.hasUnterminatedLine()) {      rebuildJournal();    } else {      journalWriter = new BufferedWriter(new OutputStreamWriter(          new FileOutputStream(journalFile, true), Util.US_ASCII));    }  } finally {    Util.closeQuietly(reader);  }}
```

```java
private void readJournalLine(String line) throws IOException {  int firstSpace = line.indexOf(' '); //第一个空格的索引  if (firstSpace == -1) {    throw new IOException("unexpected journal line: " + line);  }  int keyBegin = firstSpace + 1;  int secondSpace = line.indexOf(' ', keyBegin);//第二个空格  final String key;  //不存在第二个空格  if (secondSpace == -1) {    key = line.substring(keyBegin);    //如果是移除 则从Map中移除    if (firstSpace == REMOVE.length() && line.startsWith(REMOVE)) {      lruEntries.remove(key);      return;    }  } else {    key = line.substring(keyBegin, secondSpace);  }  Entry entry = lruEntries.get(key);  //如果key没有加入到lruEntries中，创建并加入  if (entry == null) {    entry = new Entry(key);    lruEntries.put(key, entry);  }  //如果是CLEAN  if (secondSpace != -1 && firstSpace == CLEAN.length() && line.startsWith(CLEAN)) {    String[] parts = line.substring(secondSpace + 1).split(" ");    entry.readable = true;    entry.currentEditor = null;    entry.setLengths(parts);  } else if (secondSpace == -1 && firstSpace == DIRTY.length() && line.startsWith(DIRTY)) {    entry.currentEditor = new Editor(entry);  } else if (secondSpace == -1 && firstSpace == READ.length() && line.startsWith(READ)) {    // This work was already done by calling lruEntries.get().  } else {    throw new IOException("unexpected journal line: " + line);  }}
```

```java
private void processJournal() throws IOException {  deleteIfExists(journalFileTmp);  //遍历所有文件的大小 并赋值给size  for (Iterator<Entry> i = lruEntries.values().iterator(); i.hasNext(); ) {    Entry entry = i.next();    if (entry.currentEditor == null) {      for (int t = 0; t < valueCount; t++) {        size += entry.lengths[t];      }    } else {      entry.currentEditor = null;      for (int t = 0; t < valueCount; t++) {        deleteIfExists(entry.getCleanFile(t));        deleteIfExists(entry.getDirtyFile(t));      }      i.remove();    }  }}
```


## 存入缓存

```java
public Editor edit(String key) throws IOException {  return edit(key, ANY_SEQUENCE_NUMBER);}
```

```java
private synchronized Editor edit(String key, long expectedSequenceNumber) throws IOException {  checkNotClosed();  //从LinkedHashMap中获取Entry  Entry entry = lruEntries.get(key);  if (expectedSequenceNumber != ANY_SEQUENCE_NUMBER && (entry == null      || entry.sequenceNumber != expectedSequenceNumber)) {    return null; // Value is stale.  }  if (entry == null) {      //如果Entry为null创建Entry    entry = new Entry(key);    lruEntries.put(key, entry);  } else if (entry.currentEditor != null) {    return null; // Another edit is in progress.  }  //创建Editor  Editor editor = new Editor(entry);  entry.currentEditor = editor;  //写入一条DIRTY数据  // Flush the journal before creating files to prevent file leaks.  journalWriter.append(DIRTY);  journalWriter.append(' ');  journalWriter.append(key);  journalWriter.append('\n');  flushWriter(journalWriter);  return editor;}
```


### Entry

```java
private Entry(String key) {  this.key = key;  this.lengths = new long[valueCount];  cleanFiles = new File[valueCount];  dirtyFiles = new File[valueCount];  // The names are repetitive so re-use the same builder to avoid allocations.  StringBuilder fileBuilder = new StringBuilder(key).append('.');  int truncateTo = fileBuilder.length();  for (int i = 0; i < valueCount; i++) {      fileBuilder.append(i);      //缓存文件名为key.索引      cleanFiles[i] = new File(directory, fileBuilder.toString());      fileBuilder.append(".tmp");      dirtyFiles[i] = new File(directory, fileBuilder.toString());      fileBuilder.setLength(truncateTo);  }}
```


### newOutputStream()

```java
public OutputStream newOutputStream(int index) throws IOException {  if (index < 0 || index >= valueCount) {    throw new IllegalArgumentException("Expected index " + index + " to "            + "be greater than 0 and less than the maximum value count "            + "of " + valueCount);  }  synchronized (DiskLruCache.this) {    if (entry.currentEditor != this) {      throw new IllegalStateException();    }    if (!entry.readable) {      written[index] = true;    }    File dirtyFile = entry.getDirtyFile(index);    FileOutputStream outputStream;    try {      outputStream = new FileOutputStream(dirtyFile);//输出流    } catch (FileNotFoundException e) {      // Attempt to recreate the cache directory.      directory.mkdirs();      try {        outputStream = new FileOutputStream(dirtyFile);      } catch (FileNotFoundException e2) {        // We are unable to recover. Silently eat the writes.        return NULL_OUTPUT_STREAM;      }    }    return new FaultHidingOutputStream(outputStream);  }}
```

```java
public void commit() throws IOException {  if (hasErrors) {    completeEdit(this, false);    remove(entry.key); // The previous entry is stale.  } else {    completeEdit(this, true);  }  committed = true;}
```

```java
private synchronized void completeEdit(Editor editor, boolean success) throws IOException {  Entry entry = editor.entry; //获取Entry  if (entry.currentEditor != editor) {    throw new IllegalStateException();  }  // If this edit is creating the entry for the first time, every index must have a value.  if (success && !entry.readable) {    for (int i = 0; i < valueCount; i++) {      if (!editor.written[i]) {        editor.abort();        throw new IllegalStateException("Newly created entry didn't create value for index " + i);      }      if (!entry.getDirtyFile(i).exists()) {        editor.abort();        return;      }    }  }  for (int i = 0; i < valueCount; i++) {    File dirty = entry.getDirtyFile(i);    if (success) {      //如果文件存在      if (dirty.exists()) {        File clean = entry.getCleanFile(i);        //重命名为clean        dirty.renameTo(clean);        long oldLength = entry.lengths[i];        //获取文件长度        long newLength = clean.length();        entry.lengths[i] = newLength;        size = size - oldLength + newLength;      }    } else {      //如果失败删除dirty文件      deleteIfExists(dirty);    }  }  redundantOpCount++;  //currentEditor设置为null  entry.currentEditor = null;  //写入CLEAN记录  if (entry.readable | success) {    entry.readable = true;    journalWriter.append(CLEAN);    journalWriter.append(' ');    journalWriter.append(entry.key);    journalWriter.append(entry.getLengths());    journalWriter.append('\n');    if (success) {      entry.sequenceNumber = nextSequenceNumber++;    }  } else {    lruEntries.remove(entry.key);    journalWriter.append(REMOVE);    journalWriter.append(' ');    journalWriter.append(entry.key);    journalWriter.append('\n');  }  flushWriter(journalWriter);  //如果size>maxSize则执行清理任务  if (size > maxSize || journalRebuildRequired()) {    executorService.submit(cleanupCallable);  }}
```

```java
//只有一个线程final ThreadPoolExecutor executorService =    new ThreadPoolExecutor(0, 1, 60L, TimeUnit.SECONDS, new LinkedBlockingQueue<Runnable>(),        new DiskLruCacheThreadFactory());private final Callable<Void> cleanupCallable = new Callable<Void>() {  public Void call() throws Exception {    synchronized (DiskLruCache.this) {      if (journalWriter == null) {        return null; // Closed.      }      trimToSize();      //重建journal      if (journalRebuildRequired()) {        rebuildJournal();        redundantOpCount = 0;      }    }    return null;  }};
```

```java
private boolean journalRebuildRequired() {  final int redundantOpCompactThreshold = 2000;  return redundantOpCount >= redundantOpCompactThreshold //大于2000并且大于map的size      && redundantOpCount >= lruEntries.size();}
```


## 获取

```java
public synchronized Value get(String key) throws IOException {  checkNotClosed();  //获取Entry  Entry entry = lruEntries.get(key);  if (entry == null) {    return null;  }  if (!entry.readable) {    return null;  }  //检查文件是否存在  for (File file : entry.cleanFiles) {      // A file must have been deleted manually!      if (!file.exists()) {          return null;      }  }  redundantOpCount++;  //添加read记录  journalWriter.append(READ);  journalWriter.append(' ');  journalWriter.append(key);  journalWriter.append('\n');  if (journalRebuildRequired()) {    executorService.submit(cleanupCallable);  }  return new Value(key, entry.sequenceNumber, entry.cleanFiles, entry.lengths);}
```

```java
public synchronized boolean remove(String key) throws IOException {  checkNotClosed();  Entry entry = lruEntries.get(key);  if (entry == null || entry.currentEditor != null) {    return false;  }  for (int i = 0; i < valueCount; i++) {    File file = entry.getCleanFile(i);    if (file.exists() && !file.delete()) {      throw new IOException("failed to delete " + file);    }    size -= entry.lengths[i];    entry.lengths[i] = 0;  }  //添加REMOVE记录  redundantOpCount++;  journalWriter.append(REMOVE);  journalWriter.append(' ');  journalWriter.append(key);  journalWriter.append('\n');  lruEntries.remove(key);  if (journalRebuildRequired()) {    executorService.submit(cleanupCallable);  }  return true;}
```

