## DownloadProvider

### 目录

* [1.DowloadProvider源码分析](#1.DowloadProvider源码分析)
    * [1.1DownloadManager](#1.1DownloadManager)
    * [1.2DownloadProvider](#1.2DownloadProvider)
    * [1.3DownloadService](#1.3DownloadService)
    * [1.4DownloadThread](#1.4DownloadThread)

----------------------------------------------------

<h3 id="1.DowloadProvider源码分析">1.DowloadProvider源码分析</h3>

源码地址:https://github.com/yxl/DownloadProvider

<h4 id="1.1DownloadManager">1.1DownloadManager</h4>

`DownloadManager`包含了两个静态内部类
* Query：查询下载信息

* Request：请求一个下载

DownloadManager主要方法

enqueue方法用于开启一个下载
```java

    /**
     * Enqueue a new download. The download will start automatically once the
     * download manager is ready to execute it and connectivity is available.
     *
     * @param request the parameters specifying this download
     * @return an ID for the download, unique across the system. This ID is used
     * to make future calls related to this download.
     */
    public long enqueue(Request request) {
        ContentValues values = request.toContentValues(mPackageName);
        Uri downloadUri = mResolver.insert(Downloads.CONTENT_URI, values);
        long id = Long.parseLong(downloadUri.getLastPathSegment());
        return id;
    }


```
```java
/**
         * @return ContentValues to be passed to DownloadProvider.insert()
         */
        ContentValues toContentValues(String packageName) {
            ContentValues values = new ContentValues();
            assert mUri != null;
            values.put(Downloads.COLUMN_URI, mUri.toString());//Uri
            values.put(Downloads.COLUMN_IS_PUBLIC_API, true);
            values.put(Downloads.COLUMN_NOTIFICATION_PACKAGE, packageName);

            if (mDestinationUri != null) {
                values.put(Downloads.COLUMN_DESTINATION,
                        Downloads.DESTINATION_FILE_URI);
                values.put(Downloads.COLUMN_FILE_NAME_HINT,
                        mDestinationUri.toString());
            } else {
                values.put(Downloads.COLUMN_DESTINATION,
                        Downloads.DESTINATION_EXTERNAL);
            }

            if (!mRequestHeaders.isEmpty()) {
                encodeHttpHeaders(values);
            }

            putIfNonNull(values, Downloads.COLUMN_TITLE, mTitle);//标题
            putIfNonNull(values, Downloads.COLUMN_DESCRIPTION, mDescription);
            putIfNonNull(values, Downloads.COLUMN_MIME_TYPE, mMimeType);

            values.put(Downloads.COLUMN_VISIBILITY,
                    mShowNotification ? Downloads.VISIBILITY_VISIBLE
                            : Downloads.VISIBILITY_HIDDEN);

            values.put(Downloads.COLUMN_ALLOWED_NETWORK_TYPES,
                    mAllowedNetworkTypes);
            values.put(Downloads.COLUMN_ALLOW_ROAMING, mRoamingAllowed);
            values.put(Downloads.COLUMN_IS_VISIBLE_IN_DOWNLOADS_UI,
                    mIsVisibleInDownloadsUi);

            values.put(Downloads.COLUMN_NO_INTEGRITY, 1);

            return values;
        }

```

remove方法删除一个下载

```java
 /**
     * Cancel downloads and remove them from the download manager. Each download
     * will be stopped if it was running, and it will no longer be accessible
     * through the download manager. If a file was already downloaded to
     * external storage, it will not be deleted.
     *
     * @param ids the IDs of the downloads to remove
     * @return the number of downloads actually removed
     */
    public int remove(long... ids) {
        if (ids == null || ids.length == 0) {
            // called with nothing to remove!
            throw new IllegalArgumentException(
                    "input param 'ids' can't be null");
        }
        return mResolver.delete(mBaseUri, getWhereClauseForIds(ids),
                getWhereArgsForIds(ids));
    }
```


query方法用于查询下载信息

```java
   /**
     * Query the download manager about downloads that have been requested.
     *
     * @param query parameters specifying filters for this query
     * @return a Cursor over the result set of downloads, with columns
     * consisting of all the COLUMN_* constants.
     */
    public Cursor query(Query query) {
        Cursor underlyingCursor = query.runQuery(mResolver, UNDERLYING_COLUMNS,
                mBaseUri);
        if (underlyingCursor == null) {
            return null;
        }
        return new CursorTranslator(underlyingCursor, mBaseUri);
    }
```


<h5 id="1.1.1Request">1.1.1Request</h5>

Request常用方法

* setDestinationInExternalPublicDir：设置本地存放路径
```java
   * Set the local destination for the downloaded file to a path within
         * the public external storage directory (as returned by
         * {@link Environment#getExternalStoragePublicDirectory(String)}.
         *
         * @param dirType the directory type to pass to
         *                {@link Environment#getExternalStoragePublicDirectory(String)}
         * @param subPath the path within the external directory. If subPath is a
         *                directory(ending with "/"), destination filename will be
         *                generated.
         * @return this object
         */
        public Request setDestinationInExternalPublicDir(String dirType,
                                                         String subPath) {
            setDestinationFromBase(
                    Environment.getExternalStoragePublicDirectory(dirType),
                    subPath);
            return this;
        }
```
<h4 id="1.2DownloadProvider">1.2DownloadProvider</h4>

```java
    /**
     * Inserts a row in the database
     */
    @Override
    public Uri insert(final Uri uri, final ContentValues values) {
        checkInsertPermissions(values);
        SQLiteDatabase db = mOpenHelper.getWritableDatabase();

        // note we disallow inserting into ALL_DOWNLOADS
        int match = sURIMatcher.match(uri);
        if (match != MY_DOWNLOADS) {
            Log.d(Constants.TAG, "calling insert on an unknown/invalid URI: "
                    + uri);
            throw new IllegalArgumentException("Unknown/Invalid URI " + uri);
        }

        ContentValues filteredValues = new ContentValues();

        copyString(Downloads.COLUMN_URI, values, filteredValues);
        copyString(Downloads.COLUMN_APP_DATA, values, filteredValues);
        copyBoolean(Downloads.COLUMN_NO_INTEGRITY, values, filteredValues);
        copyString(Downloads.COLUMN_FILE_NAME_HINT, values, filteredValues);
        copyString(Downloads.COLUMN_MIME_TYPE, values, filteredValues);

        copyBoolean(Downloads.COLUMN_IS_PUBLIC_API, values, filteredValues);
        boolean isPublicApi = values
                .getAsBoolean(Downloads.COLUMN_IS_PUBLIC_API) == Boolean.TRUE;

        Integer dest = values.getAsInteger(Downloads.COLUMN_DESTINATION);
        if (dest != null) {
            if (getContext().checkCallingPermission(
                    Downloads.PERMISSION_ACCESS_ADVANCED) != PackageManager.PERMISSION_GRANTED
                    && dest != Downloads.DESTINATION_EXTERNAL
                    && dest != Downloads.DESTINATION_FILE_URI) {
                throw new SecurityException("unauthorized destination code");
            }
            if (dest == Downloads.DESTINATION_FILE_URI) {
                getContext()
                        .enforcePermission(
                                android.Manifest.permission.WRITE_EXTERNAL_STORAGE,
                                Binder.getCallingPid(), Binder.getCallingUid(),
                                "need WRITE_EXTERNAL_STORAGE permission to use DESTINATION_FILE_URI");
                checkFileUriDestination(values);
            }
            filteredValues.put(Downloads.COLUMN_DESTINATION, dest);
        }
        Integer vis = values.getAsInteger(Downloads.COLUMN_VISIBILITY);
        if (vis == null) {
            if (dest == Downloads.DESTINATION_EXTERNAL) {
                filteredValues.put(Downloads.COLUMN_VISIBILITY,
                        Downloads.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            } else {
                filteredValues.put(Downloads.COLUMN_VISIBILITY,
                        Downloads.VISIBILITY_HIDDEN);
            }
        } else {
            filteredValues.put(Downloads.COLUMN_VISIBILITY, vis);
        }
        copyInteger(Downloads.COLUMN_CONTROL, values, filteredValues);
        filteredValues.put(Downloads.COLUMN_STATUS, Downloads.STATUS_PENDING);
        filteredValues.put(Downloads.COLUMN_LAST_MODIFICATION,
                mSystemFacade.currentTimeMillis());

        String pckg = values.getAsString(Downloads.COLUMN_NOTIFICATION_PACKAGE);
        String clazz = values.getAsString(Downloads.COLUMN_NOTIFICATION_CLASS);
        if (pckg != null && (clazz != null || isPublicApi)) {
            int uid = Binder.getCallingUid();
            try {
                if (uid == 0 || mSystemFacade.userOwnsPackage(uid, pckg)) {
                    filteredValues.put(Downloads.COLUMN_NOTIFICATION_PACKAGE,
                            pckg);
                    if (clazz != null) {
                        filteredValues.put(Downloads.COLUMN_NOTIFICATION_CLASS,
                                clazz);
                    }
                }
            } catch (PackageManager.NameNotFoundException ex) {
        /* ignored for now */
            }
        }
        copyString(Downloads.COLUMN_NOTIFICATION_EXTRAS, values, filteredValues);
        copyString(Downloads.COLUMN_COOKIE_DATA, values, filteredValues);
        copyString(Downloads.COLUMN_USER_AGENT, values, filteredValues);
        copyString(Downloads.COLUMN_REFERER, values, filteredValues);
        if (getContext().checkCallingPermission(
                Downloads.PERMISSION_ACCESS_ADVANCED) == PackageManager.PERMISSION_GRANTED) {
            copyInteger(Downloads.COLUMN_OTHER_UID, values, filteredValues);
        }
        filteredValues.put(Constants.UID, Binder.getCallingUid());
        if (Binder.getCallingUid() == 0) {
            copyInteger(Constants.UID, values, filteredValues);
        }
        copyStringWithDefault(Downloads.COLUMN_TITLE, values, filteredValues,
                "");
        copyStringWithDefault(Downloads.COLUMN_DESCRIPTION, values,
                filteredValues, "");
        filteredValues.put(Downloads.COLUMN_TOTAL_BYTES, -1);
        filteredValues.put(Downloads.COLUMN_CURRENT_BYTES, 0);

        if (values.containsKey(Downloads.COLUMN_IS_VISIBLE_IN_DOWNLOADS_UI)) {
            copyBoolean(Downloads.COLUMN_IS_VISIBLE_IN_DOWNLOADS_UI, values,
                    filteredValues);
        } else {
            // by default, make external downloads visible in the UI
            boolean isExternal = (dest == null || dest == Downloads.DESTINATION_EXTERNAL);
            filteredValues.put(Downloads.COLUMN_IS_VISIBLE_IN_DOWNLOADS_UI,
                    isExternal);
        }

        if (isPublicApi) {
            copyInteger(Downloads.COLUMN_ALLOWED_NETWORK_TYPES, values,
                    filteredValues);
            copyBoolean(Downloads.COLUMN_ALLOW_ROAMING, values, filteredValues);
        }

        if (Constants.LOGVV) {
            Log.v(Constants.TAG, "initiating download with UID "
                    + filteredValues.getAsInteger(Constants.UID));
            if (filteredValues.containsKey(Downloads.COLUMN_OTHER_UID)) {
                Log.v(Constants.TAG,
                        "other UID "
                                + filteredValues
                                .getAsInteger(Downloads.COLUMN_OTHER_UID));
            }
        }
        //开启服务
        Context context = getContext();
        context.startService(new Intent(context, DownloadService.class));

        long rowID = db.insert(DB_TABLE, null, filteredValues);
        if (rowID == -1) {
            Log.d(Constants.TAG, "couldn't insert into downloads database");
            return null;
        }

        insertRequestHeaders(db, rowID, values);
        context.startService(new Intent(context, DownloadService.class));
        notifyContentChanged(uri, match);
        return ContentUris.withAppendedId(Downloads.CONTENT_URI, rowID);
    }
```
<h4 id="1.3DownloadService">1.3DownloadService</h4>

```java

    /**
     * Receives notifications when the data in the content provider changes
     */
    private class DownloadManagerContentObserver extends ContentObserver {

        public DownloadManagerContentObserver() {
            super(new Handler());
        }

        /**
         * Receives notification when the data in the observed content provider
         * changes.
         */
        public void onChange(final boolean selfChange) {
            if (Constants.LOGVV) {
                Log.v(Constants.TAG,
                        "Service ContentObserver received notification");
            }
            updateFromProvider();
        }

    }

```
updateFromProvider
```java
    /**
     * Parses data from the content provider into private array
     */
    private void updateFromProvider() {
        synchronized (this) {
            mPendingUpdate = true;
            if (mUpdateThread == null) {
                mUpdateThread = new UpdateThread();
                mSystemFacade.startThread(mUpdateThread);
            }
        }
    }
```
UpdateThread更新数据线程。
```java
 private class UpdateThread extends Thread {
        public UpdateThread() {
            super("Download Service");
        }

        public void run() {
            Process.setThreadPriority(Process.THREAD_PRIORITY_BACKGROUND);

            trimDatabase();
            removeSpuriousFiles();

            boolean keepService = false;
            // for each update from the database, remember which download is
            // supposed to get restarted soonest in the future
            long wakeUp = Long.MAX_VALUE;
            for (; ; ) {
                synchronized (DownloadService.this) {
                    if (mUpdateThread != this) {
                        throw new IllegalStateException(
                                "multiple UpdateThreads in DownloadService");
                    }
                    if (!mPendingUpdate) {
                        mUpdateThread = null;
                        if (!keepService) {
                            stopSelf();
                        }
                        if (wakeUp != Long.MAX_VALUE) {
                            scheduleAlarm(wakeUp);
                        }
                        return;
                    }
                    mPendingUpdate = false;
                }

                long now = mSystemFacade.currentTimeMillis();
                keepService = false;
                wakeUp = Long.MAX_VALUE;
                Set<Long> idsNoLongerInDatabase = new HashSet<Long>(
                        mDownloads.keySet());

                Cursor cursor = getContentResolver().query(
                        Downloads.ALL_DOWNLOADS_CONTENT_URI, null, null, null,
                        null);
                if (cursor == null) {
                    continue;
                }
                try {
                    DownloadInfo.Reader reader = new DownloadInfo.Reader(
                            getContentResolver(), cursor);
                    int idColumn = cursor.getColumnIndexOrThrow(Downloads._ID);

                    for (cursor.moveToFirst(); !cursor.isAfterLast(); cursor
                            .moveToNext()) {
                        long id = cursor.getLong(idColumn);
                        idsNoLongerInDatabase.remove(id);
                        DownloadInfo info = mDownloads.get(id);
                        if (info != null) {
                            updateDownload(reader, info, now);
                        } else {
                            info = insertDownload(reader, now);
                        }
                        if (info.hasCompletionNotification()) {
                            keepService = true;
                        }
                        long next = info.nextAction(now);
                        if (next == 0) {
                            keepService = true;
                        } else if (next > 0 && next < wakeUp) {
                            wakeUp = next;
                        }
                    }
                } finally {
                    cursor.close();
                }

                for (Long id : idsNoLongerInDatabase) {
                    deleteDownload(id);
                }

                // is there a need to start the DownloadService? yes, if there
                // are rows to be deleted.

                for (DownloadInfo info : mDownloads.values()) {
                    if (info.mDeleted) {
                        keepService = true;
                        break;
                    }
                }

                mNotifier.updateNotification(mDownloads.values());

                // look for all rows with deleted flag set and delete the rows
                // from the database
                // permanently
                for (DownloadInfo info : mDownloads.values()) {
                    if (info.mDeleted) {
                        Helpers.deleteFile(getContentResolver(), info.mId,
                                info.mFileName, info.mMimeType);
                    }
                }
            }
        }

```



<h4 id="1.4DownloadThread">1.4DownloadThread</h4>

executeDownload方法执行下载

```java
 /**
     * Fully execute a single download request - setup and send the request,
     * handle the response, and transfer the data to the destination file.
     */
    private void executeDownload(State state, AndroidHttpClient client,
                                 HttpGet request) throws StopRequest, RetryDownload {
        InnerState innerState = new InnerState();
        byte data[] = new byte[Constants.BUFFER_SIZE];

        setupDestinationFile(state, innerState);
        addRequestHeaders(innerState, request);

        // check just before sending the request to avoid using an invalid
        // connection at all
        checkConnectivity(state);

        HttpResponse response = sendRequest(state, client, request);
        handleExceptionalStatus(state, innerState, response);

        if (Constants.LOGV) {
            Log.v(Constants.TAG, "received response for " + mInfo.mUri);
        }

        processResponseHeaders(state, innerState, response);
        InputStream entityStream = openResponseEntity(state, response);
        transferData(state, innerState, data, entityStream);
    }


```
setupDestinationFile设置本地文件用于接受数据，如果文件存在，则续传下载
```java
  /**
     * Prepare the destination file to receive data. If the file already exists,
     * we'll set up appropriately for resumption.
     */
    private void setupDestinationFile(State state, InnerState innerState)
            throws StopRequest {
        if (!TextUtils.isEmpty(state.mFilename)) { // only true if we've already
            // run a thread for this
            // download
            if (!Helpers.isFilenameValid(state.mFilename)) {
                // this should never happen
                throw new StopRequest(Downloads.STATUS_FILE_ERROR,
                        "found invalid internal destination filename");
            }
            // We're resuming a download that got interrupted
            File f = new File(state.mFilename);
            if (f.exists()) {
                long fileLength = f.length();
                if (fileLength == 0) {
                    // The download hadn't actually started, we can restart from
                    // scratch
                    f.delete();
                    state.mFilename = null;
                } else if (mInfo.mETag == null && !mInfo.mNoIntegrity) {
                    // This should've been caught upon failure
                    f.delete();
                    throw new StopRequest(Downloads.STATUS_CANNOT_RESUME,
                            "Trying to resume a download that can't be resumed");
                } else {
                    // All right, we'll be able to resume this download
                    try {
                        state.mStream = new FileOutputStream(state.mFilename,
                                true);
                    } catch (FileNotFoundException exc) {
                        throw new StopRequest(Downloads.STATUS_FILE_ERROR,
                                "while opening destination for resuming: "
                                        + exc.toString(), exc);
                    }
                    innerState.mBytesSoFar = (int) fileLength;
                    if (mInfo.mTotalBytes != -1) {
                        innerState.mHeaderContentLength = Long
                                .toString(mInfo.mTotalBytes);
                    }
                    innerState.mHeaderETag = mInfo.mETag;
                    innerState.mContinuingDownload = true;
                }
            }
        }

        if (state.mStream != null
                && mInfo.mDestination == Downloads.DESTINATION_EXTERNAL) {
            closeDestination(state);
        }
    }
```

```java
 /**
     * Transfer as much data as possible from the HTTP response to the
     * destination file.
     *
     * @param data         buffer to use to read data
     * @param entityStream stream for reading the HTTP response entity
     */
    private void transferData(State state, InnerState innerState, byte[] data,
                              InputStream entityStream) throws StopRequest {
        for (; ; ) {
            int bytesRead = readFromResponse(state, innerState, data,
                    entityStream);
            if (bytesRead == -1) { // success, end of stream already reached
                handleEndOfStream(state, innerState);
                return;
            }

            state.mGotData = true;
            writeDataToDestination(state, data, bytesRead);
            innerState.mBytesSoFar += bytesRead;
            reportProgress(state, innerState);

            if (Constants.LOGVV) {
                Log.v(Constants.TAG, "downloaded " + innerState.mBytesSoFar
                        + " for " + mInfo.mUri);
            }
            //检查是否暂停或者取消
            checkPausedOrCanceled(state);
        }
    }
```






<h3 id="参考">参考</h3>

* [Android系统下载管理DownloadManager功能介绍及使用示例](http://www.trinea.cn/android/android-downloadmanager/)
* [
Android下载管理DownloadManager功能扩展和bug修改](http://www.trinea.cn/android/android-downloadmanager-pro/)

