---
title: SystemServer启动流程
date: 2020-01-18 14:04:10
tags: ["源码分析"]
---

`SystemServer`进程主要用于创建系统服务，我们熟知的AMS、WMS和PMS都是由它来创建的。

一旦在`init.rc`中为`Zygote`制定了启动参数`--start-system-server`，那么`ZygoteInit`就会调用`startSystemServer`来启动`SystemServer`集成。

<!--more-->

## run

```java
//frameworks/base/services/java/com/android/server/SystemServer.java
private void run() {
    try {
        Trace.traceBegin(Trace.TRACE_TAG_SYSTEM_SERVER, "InitBeforeStartServices");
        // If a device's clock is before 1970 (before 0), a lot of
        // APIs crash dealing with negative numbers, notably
        // java.io.File#setLastModified, so instead we fake it and
        // hope that time from cell towers or NTP fixes it shortly.
        if (System.currentTimeMillis() < EARLIEST_SUPPORTED_TIME) {
            Slog.w(TAG, "System clock is before 1970; setting to 1970.");
            SystemClock.setCurrentTimeMillis(EARLIEST_SUPPORTED_TIME);
        }

        // If the system has "persist.sys.language" and friends set, replace them with
        // "persist.sys.locale". Note that the default locale at this point is calculated
        // using the "-Duser.locale" command line flag. That flag is usually populated by
        // AndroidRuntime using the same set of system properties, but only the system_server
        // and system apps are allowed to set them.
        //
        // NOTE: Most changes made here will need an equivalent change to
        // core/jni/AndroidRuntime.cpp
        if (!SystemProperties.get("persist.sys.language").isEmpty()) {
            final String languageTag = Locale.getDefault().toLanguageTag();

            SystemProperties.set("persist.sys.locale", languageTag);
            SystemProperties.set("persist.sys.language", "");
            SystemProperties.set("persist.sys.country", "");
            SystemProperties.set("persist.sys.localevar", "");
        }

        // Here we go!
        Slog.i(TAG, "Entered the Android system server!");
        EventLog.writeEvent(EventLogTags.BOOT_PROGRESS_SYSTEM_RUN, SystemClock.uptimeMillis());

        // In case the runtime switched since last boot (such as when
        // the old runtime was removed in an OTA), set the system
        // property so that it is in sync. We can't do this in
        // libnativehelper's JniInvocation::Init code where we already
        // had to fallback to a different runtime because it is
        // running as root and we need to be the system user to set
        // the property. http://b/11463182
        SystemProperties.set("persist.sys.dalvik.vm.lib.2", VMRuntime.getRuntime().vmLibrary());

        // Enable the sampling profiler.
        if (SamplingProfilerIntegration.isEnabled()) {
            SamplingProfilerIntegration.start();
            mProfilerSnapshotTimer = new Timer();
            mProfilerSnapshotTimer.schedule(new TimerTask() {
                    @Override
                    public void run() {
                        SamplingProfilerIntegration.writeSnapshot("system_server", null);
                    }
                }, SNAPSHOT_INTERVAL, SNAPSHOT_INTERVAL);
        }

        // Mmmmmm... more memory!
        VMRuntime.getRuntime().clearGrowthLimit();

        // The system server has to run all of the time, so it needs to be
        // as efficient as possible with its memory usage.
        VMRuntime.getRuntime().setTargetHeapUtilization(0.8f);

        // Some devices rely on runtime fingerprint generation, so make sure
        // we've defined it before booting further.
        Build.ensureFingerprintProperty();

        // Within the system server, it is an error to access Environment paths without
        // explicitly specifying a user.
        Environment.setUserRequired(true);

        // Within the system server, any incoming Bundles should be defused
        // to avoid throwing BadParcelableException.
        BaseBundle.setShouldDefuse(true);

        // Ensure binder calls into the system always run at foreground priority.
        BinderInternal.disableBackgroundScheduling(true);

        // Increase the number of binder threads in system_server
        BinderInternal.setMaxThreads(sMaxBinderThreads);

        // Prepare the main looper thread (this thread).
        android.os.Process.setThreadPriority(
            android.os.Process.THREAD_PRIORITY_FOREGROUND);
        android.os.Process.setCanSelfBackground(false);
        Looper.prepareMainLooper();

        // Initialize native services.
        System.loadLibrary("android_servers");//加载native服务

        // Check whether we failed to shut down last time we tried.
        // This call may not return.
        performPendingShutdown();

        // Initialize the system context.
        createSystemContext();

        // Create the system service manager.
        mSystemServiceManager = new SystemServiceManager(mSystemContext);//创建SystemServiceManager
        mSystemServiceManager.setRuntimeRestarted(mRuntimeRestart);
        LocalServices.addService(SystemServiceManager.class, mSystemServiceManager);
    } finally {
        Trace.traceEnd(Trace.TRACE_TAG_SYSTEM_SERVER);
    }

    // Start services.
    try {
        Trace.traceBegin(Trace.TRACE_TAG_SYSTEM_SERVER, "StartServices");
        startBootstrapServices();//启动引导服务
        startCoreServices();//启动核心服务
        startOtherServices();//启动其他服务
    } catch (Throwable ex) {
        Slog.e("System", "******************************************");
        Slog.e("System", "************ Failure starting system services", ex);
        throw ex;
    } finally {
        Trace.traceEnd(Trace.TRACE_TAG_SYSTEM_SERVER);
    }

    // For debug builds, log event loop stalls to dropbox for analysis.
    if (StrictMode.conditionallyEnableDebugLogging()) {
        Slog.i(TAG, "Enabled StrictMode for system server main thread.");
    }

    // Loop forever.
    Looper.loop();
    throw new RuntimeException("Main thread loop unexpectedly exited");
}
```



```cpp
//frameworks/base/services/core/jni/com_android_server_SystemServer.cpp
//SensorService的启动和初始化
static void android_server_SystemServer_startSensorService(JNIEnv* /* env */, jobject /* clazz */) {
    char propBuf[PROPERTY_VALUE_MAX];
    property_get("system_init.startsensorservice", propBuf, "1");
    if (strcmp(propBuf, "1") == 0) {
        // Start the sensor service in a new thread
        createThreadEtc(start_sensor_service, nullptr,
                        "StartSensorThread", PRIORITY_FOREGROUND);
    }
}
```

## startBootstrapServices

```java
private void startBootstrapServices() {
      // Wait for installd to finish starting up so that it has a chance to
      // create critical directories such as /data/user with the appropriate
      // permissions.  We need this to complete before we initialize other services.
      Installer installer = mSystemServiceManager.startService(Installer.class);

      // Activity manager runs the show.
      mActivityManagerService = mSystemServiceManager.startService(
              ActivityManagerService.Lifecycle.class).getService();
      mActivityManagerService.setSystemServiceManager(mSystemServiceManager);
      mActivityManagerService.setInstaller(installer);

      // Power manager needs to be started early because other services need it.
      // Native daemons may be watching for it to be registered so it must be ready
      // to handle incoming binder calls immediately (including being able to verify
      // the permissions for those calls).
      mPowerManagerService = mSystemServiceManager.startService(PowerManagerService.class);

      // Now that the power manager has been started, let the activity manager
      // initialize power management features.
      Trace.traceBegin(Trace.TRACE_TAG_SYSTEM_SERVER, "InitPowerManagement");
      mActivityManagerService.initPowerManagement();
      Trace.traceEnd(Trace.TRACE_TAG_SYSTEM_SERVER);

      // Manages LEDs and display backlight so we need it to bring up the display.
      mSystemServiceManager.startService(LightsService.class);

      // Display manager is needed to provide display metrics before package manager
      // starts up.
      mDisplayManagerService = mSystemServiceManager.startService(DisplayManagerService.class);

      // We need the default display before we can initialize the package manager.
      mSystemServiceManager.startBootPhase(SystemService.PHASE_WAIT_FOR_DEFAULT_DISPLAY);

      // Only run "core" apps if we're encrypting the device.
      String cryptState = SystemProperties.get("vold.decrypt");
      if (ENCRYPTING_STATE.equals(cryptState)) {
          Slog.w(TAG, "Detected encryption in progress - only parsing core apps");
          mOnlyCore = true;
      } else if (ENCRYPTED_STATE.equals(cryptState)) {
          Slog.w(TAG, "Device encrypted - only parsing core apps");
          mOnlyCore = true;
      }

      // Start the package manager.
      traceBeginAndSlog("StartPackageManagerService");
      mPackageManagerService = PackageManagerService.main(mSystemContext, installer,
              mFactoryTestMode != FactoryTest.FACTORY_TEST_OFF, mOnlyCore);
      mFirstBoot = mPackageManagerService.isFirstBoot();
      mPackageManager = mSystemContext.getPackageManager();
      Trace.traceEnd(Trace.TRACE_TAG_SYSTEM_SERVER);

      // Manages A/B OTA dexopting. This is a bootstrap service as we need it to rename
      // A/B artifacts after boot, before anything else might touch/need them.
      // Note: this isn't needed during decryption (we don't have /data anyways).
      if (!mOnlyCore) {
          boolean disableOtaDexopt = SystemProperties.getBoolean("config.disable_otadexopt",
                  false);
          if (!disableOtaDexopt) {
              traceBeginAndSlog("StartOtaDexOptService");
              try {
                  OtaDexoptService.main(mSystemContext, mPackageManagerService);
              } catch (Throwable e) {
                  reportWtf("starting OtaDexOptService", e);
              } finally {
                  Trace.traceEnd(Trace.TRACE_TAG_SYSTEM_SERVER);
              }
          }
      }

      traceBeginAndSlog("StartUserManagerService");
      mSystemServiceManager.startService(UserManagerService.LifeCycle.class);
      Trace.traceEnd(Trace.TRACE_TAG_SYSTEM_SERVER);

      // Initialize attribute cache used to cache resources from packages.
      AttributeCache.init(mSystemContext);

      // Set up the Application instance for the system process and get started.
      mActivityManagerService.setSystemProcess();

      // The sensor service needs access to package manager service, app ops
      // service, and permissions service, therefore we start it after them.
      startSensorService();
}
```

## SystemServiceManager

```java
//frameworks/base/services/core/java/com/android/server/SystemServiceManager.java
private final Context mContext; 
public SystemServiceManager(Context context) {
   mContext = context;
}
```

```java
//frameworks/base/services/core/java/com/android/server/SystemServiceManager.java
//frameworks/base/services/core/java/com/android/server/SystemService.java
private final ArrayList<SystemService> mServices = new ArrayList<SystemService>();
@SuppressWarnings("unchecked")
public <T extends SystemService> T startService(Class<T> serviceClass) {
    try {
        final String name = serviceClass.getName();
        Slog.i(TAG, "Starting " + name);
        Trace.traceBegin(Trace.TRACE_TAG_SYSTEM_SERVER, "StartService " + name);

        // Create the service.
        if (!SystemService.class.isAssignableFrom(serviceClass)) {
            throw new RuntimeException("Failed to create " + name
                    + ": service must extend " + SystemService.class.getName());
        }
        final T service;
        try {
            Constructor<T> constructor = serviceClass.getConstructor(Context.class);
            service = constructor.newInstance(mContext);
        } catch (InstantiationException ex) {
            throw new RuntimeException("Failed to create service " + name
                    + ": service could not be instantiated", ex);
        } catch (IllegalAccessException ex) {
            throw new RuntimeException("Failed to create service " + name
                    + ": service must have a public constructor with a Context argument", ex);
        } catch (NoSuchMethodException ex) {
            throw new RuntimeException("Failed to create service " + name
                    + ": service must have a public constructor with a Context argument", ex);
        } catch (InvocationTargetException ex) {
            throw new RuntimeException("Failed to create service " + name
                    + ": service constructor threw an exception", ex);
        }

        // Register it.
        mServices.add(service);

        // Start it.
        try {
            service.onStart();
        } catch (RuntimeException ex) {
            throw new RuntimeException("Failed to start service " + name
                    + ": onStart threw an exception", ex);
        }
        return service;
    } finally {
        Trace.traceEnd(Trace.TRACE_TAG_SYSTEM_SERVER);
    }
}
```

{% plantuml %}

class SystemServiceManager{

​	startService()

}

abstract class SystemService{

}

{% endplantuml %}
