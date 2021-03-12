# 应用程序进程启动过程介绍

应用程序进程创建过程的步骤比较多，这里分为两个部分来讲解，分别是AMS发送启动应用程序进程请求，以及Zygote接收请求并创建应用程序进程。

## AMS发送启动应用程序进程请求

这里先给出AMS发送启动应用程序进程请求过程的时序图，然后对每一个步骤进行详细分析，如图所示。

![](../../.gitbook/assets/image%20%2887%29.png)

AMS 如果想要启动应用程序进程，就需要向Zygote进程发送创建应用程序进程的请求，AMS会通过调用startProcessLocked方法向Zygote进程发送请求，如下所示：

```java
//frameworks/base/services/core/java/com/android/server/am/ActivityManagerService.java
final ProcessList mProcessList;
final ProcessRecord startProcessLocked(String processName,
      ApplicationInfo info, boolean knownToBeDead, int intentFlags,
      HostingRecord hostingRecord, int zygotePolicyFlags, boolean allowWhileBooting,
      boolean isolated, boolean keepIfLarge) {
  return mProcessList.startProcessLocked(processName, info, knownToBeDead, intentFlags,
          hostingRecord, zygotePolicyFlags, allowWhileBooting, isolated, 0 /* isolatedUid */,
          keepIfLarge, null /* ABI override */, null /* entryPoint */,
          null /* entryPointArgs */, null /* crashHandler */);
}
```

```java
//frameworks/base/services/core/java/com/android/server/am/ProcessList.java
boolean startProcessLocked(ProcessRecord app, HostingRecord hostingRecord,
        int zygotePolicyFlags, boolean disableHiddenApiChecks, boolean disableTestApiChecks,
        boolean mountExtStorageFull, String abiOverride) {
        //...
    try {
        try {
            final int userId = UserHandle.getUserId(app.uid);
            AppGlobals.getPackageManager().checkPackageStartable(app.info.packageName, userId);
        } catch (RemoteException e) {
            throw e.rethrowAsRuntimeException();
        }
        //获取要创建的应用程序进程的用户ID
        int uid = app.uid;//1
        //
        // Start the process.  It will either succeed and return a result containing
        // the PID of the new process, or else throw a RuntimeException.
        final String entryPoint = "android.app.ActivityThread";//应用线程类名

        return startProcessLocked(hostingRecord, entryPoint, app, uid, gids,
                runtimeFlags, zygotePolicyFlags, mountExternal, seInfo, requiredAbi,
                instructionSet, invokeWith, startTime);
    } catch (RuntimeException e) {
        Slog.e(ActivityManagerService.TAG, "Failure starting process " + app.processName, e);

        // Something went very wrong while trying to start this process; one
        // common case is when the package is frozen due to an active
        // upgrade. To recover, clean up any active bookkeeping related to
        // starting this process. (We already invoked this method once when
        // the package was initially frozen through KILL_APPLICATION_MSG, so
        // it doesn't hurt to use it again.)
        mService.forceStopPackageLocked(app.info.packageName, UserHandle.getAppId(app.uid),
                false, false, true, false, false, app.userId, "start failure");
        return false;
    }
}
```

```java
//frameworks/base/services/core/java/com/android/server/am/ProcessList.java
boolean startProcessLocked(HostingRecord hostingRecord, String entryPoint, ProcessRecord app,
      int uid, int[] gids, int runtimeFlags, int zygotePolicyFlags, int mountExternal,
      String seInfo, String requiredAbi, String instructionSet, String invokeWith,
      long startTime) {
  app.pendingStart = true;
  app.killedByAm = false;
  app.removed = false;
  app.killed = false;
  if (app.startSeq != 0) {
      Slog.wtf(TAG, "startProcessLocked processName:" + app.processName
              + " with non-zero startSeq:" + app.startSeq);
  }
  if (app.pid != 0) {
      Slog.wtf(TAG, "startProcessLocked processName:" + app.processName
              + " with non-zero pid:" + app.pid);
  }
  app.mDisabledCompatChanges = null;
  if (mPlatformCompat != null) {
      app.mDisabledCompatChanges = mPlatformCompat.getDisabledChanges(app.info);
  }
  final long startSeq = app.startSeq = ++mProcStartSeqCounter;
  app.setStartParams(uid, hostingRecord, seInfo, startTime);
  app.setUsingWrapper(invokeWith != null
          || Zygote.getWrapProperty(app.processName) != null);
  mPendingStarts.put(startSeq, app);

  if (mService.mConstants.FLAG_PROCESS_START_ASYNC) {
      if (DEBUG_PROCESSES) Slog.i(TAG_PROCESSES,
              "Posting procStart msg for " + app.toShortString());
      mService.mProcStartHandler.post(() -> handleProcessStart(
              app, entryPoint, gids, runtimeFlags, zygotePolicyFlags, mountExternal,
              requiredAbi, instructionSet, invokeWith, startSeq));
      return true;
  } else {
      try {
      //调用startProcess方法
          final Process.ProcessStartResult startResult = startProcess(hostingRecord,
                  entryPoint, app,
                  uid, gids, runtimeFlags, zygotePolicyFlags, mountExternal, seInfo,
                  requiredAbi, instructionSet, invokeWith, startTime);
          handleProcessStartedLocked(app, startResult.pid, startResult.usingWrapper,
                  startSeq, false);
      } catch (RuntimeException e) {
          Slog.e(ActivityManagerService.TAG, "Failure starting process "
                  + app.processName, e);
          app.pendingStart = false;
          mService.forceStopPackageLocked(app.info.packageName, UserHandle.getAppId(app.uid),
                  false, false, true, false, false, app.userId, "start failure");
      }
      return app.pid > 0;
  }
}
```

```java
   //frameworks/base/services/core/java/com/android/server/am/ProcessList.java
     private Process.ProcessStartResult startProcess(HostingRecord hostingRecord, String entryPoint,
            ProcessRecord app, int uid, int[] gids, int runtimeFlags, int zygotePolicyFlags,
            int mountExternal, String seInfo, String requiredAbi, String instructionSet,
            String invokeWith, long startTime) {
        try {
           
  
            // If it's an isolated process, it should not even mount its own app data directories,
            // since it has no access to them anyway.
            if (app.isolated) {
                pkgDataInfoMap = null;
                whitelistedAppDataInfoMap = null;
            }

            final Process.ProcessStartResult startResult;
            if (hostingRecord.usesWebviewZygote()) {
                startResult = startWebView(entryPoint,
                        app.processName, uid, uid, gids, runtimeFlags, mountExternal,
                        app.info.targetSdkVersion, seInfo, requiredAbi, instructionSet,
                        app.info.dataDir, null, app.info.packageName, app.mDisabledCompatChanges,
                        new String[]{PROC_START_SEQ_IDENT + app.startSeq});
            } else if (hostingRecord.usesAppZygote()) {
                final AppZygote appZygote = createAppZygoteForProcessIfNeeded(app);

                // We can't isolate app data and storage data as parent zygote already did that.
                startResult = appZygote.getProcess().start(entryPoint,
                        app.processName, uid, uid, gids, runtimeFlags, mountExternal,
                        app.info.targetSdkVersion, seInfo, requiredAbi, instructionSet,
                        app.info.dataDir, null, app.info.packageName,
                        /*zygotePolicyFlags=*/ ZYGOTE_POLICY_FLAG_EMPTY, isTopApp,
                        app.mDisabledCompatChanges, pkgDataInfoMap, whitelistedAppDataInfoMap,
                        false, false,
                        new String[]{PROC_START_SEQ_IDENT + app.startSeq});
            } else {
            //调用Process启动进程
                startResult = Process.start(entryPoint,
                        app.processName, uid, uid, gids, runtimeFlags, mountExternal,
                        app.info.targetSdkVersion, seInfo, requiredAbi, instructionSet,
                        app.info.dataDir, invokeWith, app.info.packageName, zygotePolicyFlags,
                        isTopApp, app.mDisabledCompatChanges, pkgDataInfoMap,
                        whitelistedAppDataInfoMap, bindMountAppsData, bindMountAppStorageDirs,
                        new String[]{PROC_START_SEQ_IDENT + app.startSeq});
            }
            checkSlow(startTime, "startProcess: returned from zygote!");
            return startResult;
        } finally {
            Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
        }
    }
```

```java
//frameworks/base/core/java/android/os/Process.java
public static final ZygoteProcess ZYGOTE_PROCESS = new ZygoteProcess();
public static ProcessStartResult start(@NonNull final String processClass,
                                       @Nullable final String niceName,
                                       int uid, int gid, @Nullable int[] gids,
                                       int runtimeFlags,
                                       int mountExternal,
                                       int targetSdkVersion,
                                       @Nullable String seInfo,
                                       @NonNull String abi,
                                       @Nullable String instructionSet,
                                       @Nullable String appDataDir,
                                       @Nullable String invokeWith,
                                       @Nullable String packageName,
                                       int zygotePolicyFlags,
                                       boolean isTopApp,
                                       @Nullable long[] disabledCompatChanges,
                                       @Nullable Map<String, Pair<String, Long>>
                                               pkgDataInfoMap,
                                       @Nullable Map<String, Pair<String, Long>>
                                               whitelistedDataInfoMap,
                                       boolean bindMountAppsData,
                                       boolean bindMountAppStorageDirs,
                                       @Nullable String[] zygoteArgs) {
    return ZYGOTE_PROCESS.start(processClass, niceName, uid, gid, gids,
                runtimeFlags, mountExternal, targetSdkVersion, seInfo,
                abi, instructionSet, appDataDir, invokeWith, packageName,
                zygotePolicyFlags, isTopApp, disabledCompatChanges,
                pkgDataInfoMap, whitelistedDataInfoMap, bindMountAppsData,
                bindMountAppStorageDirs, zygoteArgs);
}
```

在Process的start方法中只调用了ZygoteProcess的start方法，其中ZygoteProcess类用于保持与Zygote进程的通信状态。该start方法如下所示：

```java
//frameworks/base/core/java/android/os/ZygoteProcess.java
public final Process.ProcessStartResult start(@NonNull final String processClass,
                                              final String niceName,
                                              int uid, int gid, @Nullable int[] gids,
                                              int runtimeFlags, int mountExternal,
                                              int targetSdkVersion,
                                              @Nullable String seInfo,
                                              @NonNull String abi,
                                              @Nullable String instructionSet,
                                              @Nullable String appDataDir,
                                              @Nullable String invokeWith,
                                              @Nullable String packageName,
                                              int zygotePolicyFlags,
                                              boolean isTopApp,
                                              @Nullable long[] disabledCompatChanges,
                                              @Nullable Map<String, Pair<String, Long>>
                                                      pkgDataInfoMap,
                                              @Nullable Map<String, Pair<String, Long>>
                                                      whitelistedDataInfoMap,
                                              boolean bindMountAppsData,
                                              boolean bindMountAppStorageDirs,
                                              @Nullable String[] zygoteArgs) {
    // TODO (chriswailes): Is there a better place to check this value?
    if (fetchUsapPoolEnabledPropWithMinInterval()) {
        informZygotesOfUsapPoolStatus();
    }

    try {
        return startViaZygote(processClass, niceName, uid, gid, gids,
                runtimeFlags, mountExternal, targetSdkVersion, seInfo,
                abi, instructionSet, appDataDir, invokeWith, /*startChildZygote=*/ false,
                packageName, zygotePolicyFlags, isTopApp, disabledCompatChanges,
                pkgDataInfoMap, whitelistedDataInfoMap, bindMountAppsData,
                bindMountAppStorageDirs, zygoteArgs);
    } catch (ZygoteStartFailedEx ex) {
        Log.e(LOG_TAG,
                "Starting VM process through Zygote failed");
        throw new RuntimeException(
                "Starting VM process through Zygote failed", ex);
    }
}
```

```java
private Process.ProcessStartResult startViaZygote(@NonNull final String processClass,
                                                  @Nullable final String niceName,
                                                  final int uid, final int gid,
                                                  @Nullable final int[] gids,
                                                  int runtimeFlags, int mountExternal,
                                                  int targetSdkVersion,
                                                  @Nullable String seInfo,
                                                  @NonNull String abi,
                                                  @Nullable String instructionSet,
                                                  @Nullable String appDataDir,
                                                  @Nullable String invokeWith,
                                                  boolean startChildZygote,
                                                  @Nullable String packageName,
                                                  int zygotePolicyFlags,
                                                  boolean isTopApp,
                                                  @Nullable long[] disabledCompatChanges,
                                                  @Nullable Map<String, Pair<String, Long>>
                                                          pkgDataInfoMap,
                                                  @Nullable Map<String, Pair<String, Long>>
                                                          whitelistedDataInfoMap,
                                                  boolean bindMountAppsData,
                                                  boolean bindMountAppStorageDirs,
                                                  @Nullable String[] extraArgs)
                                                  throws ZygoteStartFailedEx {
    //创建字符串列表argsForZygote，并将应用进程的启动参数保存在argsForZygote中
    ArrayList<String> argsForZygote = new ArrayList<>();

    // --runtime-args, --setuid=, --setgid=,
    // and --setgroups= must go first
    argsForZygote.add("--runtime-args");
    argsForZygote.add("--setuid=" + uid);
    argsForZygote.add("--setgid=" + gid);
    argsForZygote.add("--runtime-flags=" + runtimeFlags);
    //...
    synchronized(mLock) {
        // The USAP pool can not be used if the application will not use the systems graphics
        // driver.  If that driver is requested use the Zygote application start path.
        return zygoteSendArgsAndGetResult(openZygoteSocketIfNeeded(abi),
                                          zygotePolicyFlags,
                                          argsForZygote);//启动参数
    }
}
```

```java
private Process.ProcessStartResult zygoteSendArgsAndGetResult(
        ZygoteState zygoteState, int zygotePolicyFlags, @NonNull ArrayList<String> args)
        throws ZygoteStartFailedEx {
    // Throw early if any of the arguments are malformed. This means we can
    // avoid writing a partial response to the zygote.
    for (String arg : args) {
        // Making two indexOf calls here is faster than running a manually fused loop due
        // to the fact that indexOf is a optimized intrinsic.
        if (arg.indexOf('\n') >= 0) {
            throw new ZygoteStartFailedEx("Embedded newlines not allowed");
        } else if (arg.indexOf('\r') >= 0) {
            throw new ZygoteStartFailedEx("Embedded carriage returns not allowed");
        }
    }

    /*
     * See com.android.internal.os.ZygoteArguments.parseArgs()
     * Presently the wire format to the zygote process is:
     * a) a count of arguments (argc, in essence)
     * b) a number of newline-separated argument strings equal to count
     *
     * After the zygote process reads these it will write the pid of
     * the child or -1 on failure, followed by boolean to
     * indicate whether a wrapper process was used.
     */
    String msgStr = args.size() + "\n" + String.join("\n", args) + "\n";

    if (shouldAttemptUsapLaunch(zygotePolicyFlags, args)) {
        try {
            return attemptUsapSendArgsAndGetResult(zygoteState, msgStr);
        } catch (IOException ex) {
            // If there was an IOException using the USAP pool we will log the error and
            // attempt to start the process through the Zygote.
            Log.e(LOG_TAG, "IO Exception while communicating with USAP pool - "
                    + ex.getMessage());
        }
    }

    return attemptZygoteSendArgsAndGetResult(zygoteState, msgStr);
}
```

`zygoteSendArgsAndGetResult`方法的主要作用就是将传入的应用进程的启动参数argsForZygote写入`ZygoteState`中，`ZygoteState`是`ZygoteProcess`的静态内部类，用于表示与Zygote进程通信的状态。结合前面的标注①我们知道`ZygoteState`其实是由`openZygoteSocketIfNeeded`方法返回的，那么我们接着来看`openZygoteSocketIfNeeded`方法做了什么，代码如下所示：

```java
private ZygoteState openZygoteSocketIfNeeded(String abi) throws ZygoteStartFailedEx {
    try {
        attemptConnectionToPrimaryZygote();

        if (primaryZygoteState.matches(abi)) {
            return primaryZygoteState;
        }

        if (mZygoteSecondarySocketAddress != null) {
            // The primary zygote didn't match. Try the secondary.
            attemptConnectionToSecondaryZygote();

            if (secondaryZygoteState.matches(abi)) {
                return secondaryZygoteState;
            }
        }
    } catch (IOException ioe) {
        throw new ZygoteStartFailedEx("Error connecting to zygote", ioe);
    }

    throw new ZygoteStartFailedEx("Unsupported zygote ABI: " + abi);
}
```

```java
private void attemptConnectionToPrimaryZygote() throws IOException {
    if (primaryZygoteState == null || primaryZygoteState.isClosed()) {
        primaryZygoteState =
                ZygoteState.connect(mZygoteSocketAddress, mUsapPoolSocketAddress);

        maybeSetApiDenylistExemptions(primaryZygoteState, false);
        maybeSetHiddenApiAccessLogSampleRate(primaryZygoteState);
    }
}
```

```java
static ZygoteState connect(@NonNull LocalSocketAddress zygoteSocketAddress,
        @Nullable LocalSocketAddress usapSocketAddress)
        throws IOException {
    DataInputStream zygoteInputStream;
    BufferedWriter zygoteOutputWriter;
    final LocalSocket zygoteSessionSocket = new LocalSocket();
    if (zygoteSocketAddress == null) {
        throw new IllegalArgumentException("zygoteSocketAddress can't be null");
    }
    try {
        zygoteSessionSocket.connect(zygoteSocketAddress);
        zygoteInputStream = new DataInputStream(zygoteSessionSocket.getInputStream());
        zygoteOutputWriter =
                new BufferedWriter(
                        new OutputStreamWriter(zygoteSessionSocket.getOutputStream()),
                        Zygote.SOCKET_BUFFER_SIZE);
    } catch (IOException ex) {
        try {
            zygoteSessionSocket.close();
        } catch (IOException ignore) { }

        throw ex;
    }

    return new ZygoteState(zygoteSocketAddress, usapSocketAddress,
                           zygoteSessionSocket, zygoteInputStream, zygoteOutputWriter,
                           getAbiList(zygoteOutputWriter, zygoteInputStream));
}
```





