---
layout: posts
title: bindService流程分析
date: 2020-2-29 19:18:41
tags: ["源码分析"]
---



## ContextWrapper

### bindService
```java
//frameworks/base/core/java/android/content/ContextWrapper.java
@Override
public boolean bindService(Intent service, ServiceConnection conn,int flags) {
    return mBase.bindService(service, conn, flags);
}
```

## ContextImpl

### bindService

```java
//frameworks/base/core/java/android/app/ContextImpl.java
@Override
public boolean bindService(Intent service, ServiceConnection conn,int flags) {
    warnIfCallingFromSystemProcess();
    return bindServiceCommon(service, conn, flags, mMainThread.getHandler(),
            Process.myUserHandle());
}

```

### bindServiceCommon

```java
final LoadedApk mPackageInfo;
private boolean bindServiceCommon(Intent service, ServiceConnection conn, int flags, Handler
            handler, UserHandle user) {
    IServiceConnection sd;
    if (conn == null) {
        throw new IllegalArgumentException("connection is null");
    }
    if (mPackageInfo != null) {
        //获取的是内部静态类InnerConnection
        sd = mPackageInfo.getServiceDispatcher(conn, getOuterContext(), handler, flags);
    } else {
        throw new RuntimeException("Not supported in system context");
    }
    validateServiceIntent(service);
    try {
        IBinder token = getActivityToken();
        if (token == null && (flags&BIND_AUTO_CREATE) == 0 && mPackageInfo != null
                && mPackageInfo.getApplicationInfo().targetSdkVersion
                < android.os.Build.VERSION_CODES.ICE_CREAM_SANDWICH) {
            flags |= BIND_WAIVE_PRIORITY;
        }
        service.prepareToLeaveProcess(this); 
        //调用AMP bindService
        int res = ActivityManagerNative.getDefault().bindService(
            mMainThread.getApplicationThread(), getActivityToken(), service,
            service.resolveTypeIfNeeded(getContentResolver()),
            sd, flags, getOpPackageName(), user.getIdentifier());
        if (res < 0) {
            throw new SecurityException(
                    "Not allowed to bind to service " + service);
        }
        return res != 0;
    } catch (RemoteException e) {
        throw e.rethrowFromSystemServer();
    }
}
```

## LoadedApk

### getServiceDispatcher

```java
//frameworks/base/core/java/android/app/LoadedApk.java
private final ArrayMap<Context, ArrayMap<ServiceConnection, LoadedApk.ServiceDispatcher>> mServices
        = new ArrayMap<Context, ArrayMap<ServiceConnection, LoadedApk.ServiceDispatcher>>();
public final IServiceConnection getServiceDispatcher(ServiceConnection c,
            Context context, Handler handler, int flags) {
  synchronized (mServices) {
      LoadedApk.ServiceDispatcher sd = null;
      ArrayMap<ServiceConnection, LoadedApk.ServiceDispatcher> map = mServices.get(context);
      if (map != null) {
          sd = map.get(c);
      }
      if (sd == null) {
          sd = new ServiceDispatcher(c, context, handler, flags);//创建ServiceDispatcher
          if (map == null) {
              map = new ArrayMap<ServiceConnection, LoadedApk.ServiceDispatcher>();
              mServices.put(context, map);
          }
          map.put(c, sd);
      } else {
          sd.validate(context, handler);
      }
    //调用ServiceDispatcher的getIServiceConnection获取IServiceConnection
      return sd.getIServiceConnection();
  }
}
```

## ServiceDispatcher

```java
//frameworks/base/core/java/android/app/LoadedApk.java
ServiceDispatcher(ServiceConnection conn,
                Context context, Handler activityThread, int flags) {
    mIServiceConnection = new InnerConnection(this); //创建
    mConnection = conn; //传递进来的
    mContext = context;
    mActivityThread = activityThread;
    mLocation = new ServiceConnectionLeaked(null);
    mLocation.fillInStackTrace();
    mFlags = flags;
}
```

### getIServiceConnection

```java
IServiceConnection getIServiceConnection() {
  return mIServiceConnection;
}
```

### InnerConnection

```java
private static class InnerConnection extends IServiceConnection.Stub {
    final WeakReference<LoadedApk.ServiceDispatcher> mDispatcher;

    InnerConnection(LoadedApk.ServiceDispatcher sd) {
        mDispatcher = new WeakReference<LoadedApk.ServiceDispatcher>(sd);
    }

    public void connected(ComponentName name, IBinder service) throws RemoteException {
        LoadedApk.ServiceDispatcher sd = mDispatcher.get();
        if (sd != null) {
            sd.connected(name, service); //调用传入的ServiceDispatcher的connected方法
        }
    }
}
```

### connected

```java
public void connected(ComponentName name, IBinder service) {
    if (mActivityThread != null) {
        mActivityThread.post(new RunConnection(name, service, 0));
    } else {
        doConnected(name, service);
    }
}
```

### RunConnection

```java
private final class RunConnection implements Runnable {
    RunConnection(ComponentName name, IBinder service, int command) {
        mName = name;
        mService = service;
        mCommand = command;
    }

    public void run() {
        if (mCommand == 0) {
            doConnected(mName, mService);
        } else if (mCommand == 1) {
            doDeath(mName, mService);
        }
    }

    final ComponentName mName;
    final IBinder mService;
    final int mCommand;
}
```

### doConnected

```java
public void doConnected(ComponentName name, IBinder service) {
    ServiceDispatcher.ConnectionInfo old;
    ServiceDispatcher.ConnectionInfo info;

    synchronized (this) {
        if (mForgotten) {
            // We unbound before receiving the connection; ignore
            // any connection received.
            return;
        }
        old = mActiveConnections.get(name);
        if (old != null && old.binder == service) {
            // Huh, already have this one.  Oh well!
            return;
        }

        if (service != null) {
            // A new service is being connected... set it all up.
            info = new ConnectionInfo();
            info.binder = service;
            info.deathMonitor = new DeathMonitor(name, service);
            try {
                service.linkToDeath(info.deathMonitor, 0);
                mActiveConnections.put(name, info);
            } catch (RemoteException e) {
                // This service was dead before we got it...  just
                // don't do anything with it.
                mActiveConnections.remove(name);
                return;
            }

        } else {
            // The named service is being disconnected... clean up.
            mActiveConnections.remove(name);
        }

        if (old != null) {
            old.binder.unlinkToDeath(old.deathMonitor, 0);
        }
    }

    // If there was an old service, it is now disconnected.
    if (old != null) {
        mConnection.onServiceDisconnected(name);
    }
    // If there is a new service, it is now connected.
    if (service != null) {
        mConnection.onServiceConnected(name, service);
    }
}
```

## ActivityManagerProxy

```java
//frameworks/base/core/java/android/app/ActivityManagerNative.java
//AMP
public int bindService(IApplicationThread caller, IBinder token,
        Intent service, String resolvedType, IServiceConnection connection,
        int flags,  String callingPackage, int userId) throws RemoteException {
    Parcel data = Parcel.obtain();
    Parcel reply = Parcel.obtain();
    data.writeInterfaceToken(IActivityManager.descriptor);
    data.writeStrongBinder(caller != null ? caller.asBinder() : null);
    data.writeStrongBinder(token);
    service.writeToParcel(data, 0);
    data.writeString(resolvedType);
    //将InnerConnection对象传递system_server
    data.writeStrongBinder(connection.asBinder());
    data.writeInt(flags);
    data.writeString(callingPackage);
    data.writeInt(userId);
  	//经过Binder IPC进入system_server进程
    mRemote.transact(BIND_SERVICE_TRANSACTION, data, reply, 0);
    reply.readException();
    int res = reply.readInt();
    data.recycle();
    reply.recycle();
    return res;
}
```

## ActivityManagerNative

```java
 public boolean onTransact(int code, Parcel data, Parcel reply, int flags)
            throws RemoteException {
        switch (code) {
          case BIND_SERVICE_TRANSACTION: {
              data.enforceInterface(IActivityManager.descriptor);
              IBinder b = data.readStrongBinder();
              IApplicationThread app = ApplicationThreadNative.asInterface(b);
              IBinder token = data.readStrongBinder();
              Intent service = Intent.CREATOR.createFromParcel(data);
              String resolvedType = data.readString();
              b = data.readStrongBinder();
              int fl = data.readInt();
              String callingPackage = data.readString();
              int userId = data.readInt();
              IServiceConnection conn = IServiceConnection.Stub.asInterface(b);
              int res = bindService(app, token, service, resolvedType, conn, fl,
                      callingPackage, userId); //调用ams的bindService
              reply.writeNoException();
              reply.writeInt(res);
              return true;
          }
        }
}
```

## ActivityManagerService

### bindService

```java
//frameworks/base/services/core/java/com/android/server/am/ActivityManagerService.java
final ActiveServices mServices;
public int bindService(IApplicationThread caller, IBinder token, Intent service,
            String resolvedType, IServiceConnection connection, int flags, String callingPackage,
            int userId) throws TransactionTooLargeException {
    enforceNotIsolatedCaller("bindService");

    // Refuse possible leaked file descriptors
    if (service != null && service.hasFileDescriptors() == true) {
        throw new IllegalArgumentException("File descriptors passed in Intent");
    }

    if (callingPackage == null) {
        throw new IllegalArgumentException("callingPackage cannot be null");
    }

    synchronized(this) {
        return mServices.bindServiceLocked(caller, token, service,
                resolvedType, connection, flags, callingPackage, userId);
    }
}
```

### publishService

```java
public void publishService(IBinder token, Intent intent, IBinder service) {
    // Refuse possible leaked file descriptors
    if (intent != null && intent.hasFileDescriptors() == true) {
        throw new IllegalArgumentException("File descriptors passed in Intent");
    }

    synchronized(this) {
        if (!(token instanceof ServiceRecord)) {
            throw new IllegalArgumentException("Invalid service token");
        }
        //调用publishServiceLocked
        mServices.publishServiceLocked((ServiceRecord)token, intent, service);
    }
}
```



## ActiveServices

### bindServiceLocked

```java
//frameworks/base/services/core/java/com/android/server/am/ActiveServices.java
int bindServiceLocked(IApplicationThread caller, IBinder token, Intent service,
        String resolvedType, final IServiceConnection connection, int flags,
        String callingPackage, final int userId) throws TransactionTooLargeException {
    if (DEBUG_SERVICE) Slog.v(TAG_SERVICE, "bindService: " + service
            + " type=" + resolvedType + " conn=" + connection.asBinder()
            + " flags=0x" + Integer.toHexString(flags));
    final ProcessRecord callerApp = mAm.getRecordForAppLocked(caller);
    if (callerApp == null) {
        throw new SecurityException(
                "Unable to find app for caller " + caller
                + " (pid=" + Binder.getCallingPid()
                + ") when binding service " + service);
    }

    ActivityRecord activity = null;
    if (token != null) {
        activity = ActivityRecord.isInStackLocked(token);
        if (activity == null) {
            Slog.w(TAG, "Binding with unknown activity: " + token);
            return 0;
        }
    }

    int clientLabel = 0;
    PendingIntent clientIntent = null;
    final boolean isCallerSystem = callerApp.info.uid == Process.SYSTEM_UID;

    if (isCallerSystem) {
        // Hacky kind of thing -- allow system stuff to tell us
        // what they are, so we can report this elsewhere for
        // others to know why certain services are running.
        service.setDefusable(true);
        clientIntent = service.getParcelableExtra(Intent.EXTRA_CLIENT_INTENT);
        if (clientIntent != null) {
            clientLabel = service.getIntExtra(Intent.EXTRA_CLIENT_LABEL, 0);
            if (clientLabel != 0) {
                // There are no useful extras in the intent, trash them.
                // System code calling with this stuff just needs to know
                // this will happen.
                service = service.cloneFilter();
            }
        }
    }

    if ((flags&Context.BIND_TREAT_LIKE_ACTIVITY) != 0) {
        mAm.enforceCallingPermission(android.Manifest.permission.MANAGE_ACTIVITY_STACKS,
                "BIND_TREAT_LIKE_ACTIVITY");
    }

    if ((flags & Context.BIND_ALLOW_WHITELIST_MANAGEMENT) != 0 && !isCallerSystem) {
        throw new SecurityException(
                "Non-system caller " + caller + " (pid=" + Binder.getCallingPid()
                + ") set BIND_ALLOW_WHITELIST_MANAGEMENT when binding service " + service);
    }

    final boolean callerFg = callerApp.setSchedGroup != ProcessList.SCHED_GROUP_BACKGROUND;
    final boolean isBindExternal = (flags & Context.BIND_EXTERNAL_SERVICE) != 0;
    //检索服务
    ServiceLookupResult res =
        retrieveServiceLocked(service, resolvedType, callingPackage, Binder.getCallingPid(),
                Binder.getCallingUid(), userId, true, callerFg, isBindExternal);
    if (res == null) {
        return 0;
    }
    if (res.record == null) {
        return -1;
    }
    ServiceRecord s = res.record;

    boolean permissionsReviewRequired = false;

    // If permissions need a review before any of the app components can run,
    // we schedule binding to the service but do not start its process, then
    // we launch a review activity to which is passed a callback to invoke
    // when done to start the bound service's process to completing the binding.
    if (Build.PERMISSIONS_REVIEW_REQUIRED) {
        if (mAm.getPackageManagerInternalLocked().isPermissionsReviewRequired(
                s.packageName, s.userId)) {

            permissionsReviewRequired = true;

            // Show a permission review UI only for binding from a foreground app
            if (!callerFg) {
                Slog.w(TAG, "u" + s.userId + " Binding to a service in package"
                        + s.packageName + " requires a permissions review");
                return 0;
            }

            final ServiceRecord serviceRecord = s;
            final Intent serviceIntent = service;

            RemoteCallback callback = new RemoteCallback(
                    new RemoteCallback.OnResultListener() {
                @Override
                public void onResult(Bundle result) {
                    synchronized(mAm) {
                        final long identity = Binder.clearCallingIdentity();
                        try {
                            if (!mPendingServices.contains(serviceRecord)) {
                                return;
                            }
                            // If there is still a pending record, then the service
                            // binding request is still valid, so hook them up. We
                            // proceed only if the caller cleared the review requirement
                            // otherwise we unbind because the user didn't approve.
                            if (!mAm.getPackageManagerInternalLocked()
                                    .isPermissionsReviewRequired(
                                            serviceRecord.packageName,
                                            serviceRecord.userId)) {
                                try { //拉起目标服务
                                    bringUpServiceLocked(serviceRecord,
                                            serviceIntent.getFlags(),
                                            callerFg, false, false);
                                } catch (RemoteException e) {
                                    /* ignore - local call */
                                }
                            } else {
                                unbindServiceLocked(connection);
                            }
                        } finally {
                            Binder.restoreCallingIdentity(identity);
                        }
                    }
                }
            });

            final Intent intent = new Intent(Intent.ACTION_REVIEW_PERMISSIONS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                    | Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS);
            intent.putExtra(Intent.EXTRA_PACKAGE_NAME, s.packageName);
            intent.putExtra(Intent.EXTRA_REMOTE_CALLBACK, callback);

            if (DEBUG_PERMISSIONS_REVIEW) {
                Slog.i(TAG, "u" + s.userId + " Launching permission review for package "
                        + s.packageName);
            }

            mAm.mHandler.post(new Runnable() {
                @Override
                public void run() {
                    mAm.mContext.startActivityAsUser(intent, new UserHandle(userId));
                }
            });
        }
    }

    final long origId = Binder.clearCallingIdentity();

    try {
        if (unscheduleServiceRestartLocked(s, callerApp.info.uid, false)) {
            if (DEBUG_SERVICE) Slog.v(TAG_SERVICE, "BIND SERVICE WHILE RESTART PENDING: "
                    + s);
        }

        if ((flags&Context.BIND_AUTO_CREATE) != 0) {
            s.lastActivity = SystemClock.uptimeMillis();
            if (!s.hasAutoCreateConnections()) {
                // This is the first binding, let the tracker know.
                ServiceState stracker = s.getTracker();
                if (stracker != null) {
                    stracker.setBound(true, mAm.mProcessStats.getMemFactorLocked(),
                            s.lastActivity);
                }
            }
        }

        mAm.startAssociationLocked(callerApp.uid, callerApp.processName, callerApp.curProcState,
                s.appInfo.uid, s.name, s.processName);
        //获取AppBindRecord
        AppBindRecord b = s.retrieveAppBindingLocked(service, callerApp);
        ConnectionRecord c = new ConnectionRecord(b, activity,
                connection, flags, clientLabel, clientIntent);

        IBinder binder = connection.asBinder();
        ArrayList<ConnectionRecord> clist = s.connections.get(binder);
        if (clist == null) {
            clist = new ArrayList<ConnectionRecord>();
            s.connections.put(binder, clist);
        }
        clist.add(c);
        b.connections.add(c);
        if (activity != null) {
            if (activity.connections == null) {
                activity.connections = new HashSet<ConnectionRecord>();
            }
            activity.connections.add(c);
        }
        b.client.connections.add(c);
        if ((c.flags&Context.BIND_ABOVE_CLIENT) != 0) {
            b.client.hasAboveClient = true;
        }
        if ((c.flags&Context.BIND_ALLOW_WHITELIST_MANAGEMENT) != 0) {
            s.whitelistManager = true;
        }
        if (s.app != null) {
            updateServiceClientActivitiesLocked(s.app, c, true);
        }
        clist = mServiceConnections.get(binder);
        if (clist == null) {
            clist = new ArrayList<ConnectionRecord>();
            mServiceConnections.put(binder, clist);
        }
        clist.add(c);

        if ((flags&Context.BIND_AUTO_CREATE) != 0) {
            s.lastActivity = SystemClock.uptimeMillis();
            if (bringUpServiceLocked(s, service.getFlags(), callerFg, false,
                    permissionsReviewRequired) != null) {
                return 0;
            }
        }

        if (s.app != null) {
            if ((flags&Context.BIND_TREAT_LIKE_ACTIVITY) != 0) {
                s.app.treatLikeActivity = true;
            }
            if (s.whitelistManager) {
                s.app.whitelistManager = true;
            }
            // This could have made the service more important.
            mAm.updateLruProcessLocked(s.app, s.app.hasClientActivities
                    || s.app.treatLikeActivity, b.client);
            mAm.updateOomAdjLocked(s.app);
        }

        if (DEBUG_SERVICE) Slog.v(TAG_SERVICE, "Bind " + s + " with " + b
                + ": received=" + b.intent.received
                + " apps=" + b.intent.apps.size()
                + " doRebind=" + b.intent.doRebind);

        if (s.app != null && b.intent.received) {
            // Service is already running, so we can immediately
            // publish the connection.
            try { //? binder哪里创建的？？？
                c.conn.connected(s.name, b.intent.binder);
            } catch (Exception e) {
                Slog.w(TAG, "Failure sending service " + s.shortName
                        + " to connection " + c.conn.asBinder()
                        + " (in " + c.binding.client.processName + ")", e);
            }

            // If this is the first app connected back to this binding,
            // and the service had previously asked to be told when
            // rebound, then do so.
            if (b.intent.apps.size() == 1 && b.intent.doRebind) {
                requestServiceBindingLocked(s, b.intent, callerFg, true);
            }
        } else if (!b.intent.requested) {
            requestServiceBindingLocked(s, b.intent, callerFg, false);
        }

        getServiceMap(s.userId).ensureNotStartingBackground(s);

    } finally {
        Binder.restoreCallingIdentity(origId);
    }

    return 1;
}
```

### retrieveServiceLocked

```java
private ServiceLookupResult retrieveServiceLocked(Intent service,
      String resolvedType, String callingPackage, int callingPid, int callingUid, int userId,
      boolean createIfNeeded, boolean callingFromFg, boolean isBindExternal) {
  ServiceRecord r = null;
  if (DEBUG_SERVICE) Slog.v(TAG_SERVICE, "retrieveServiceLocked: " + service
          + " type=" + resolvedType + " callingUid=" + callingUid);

  userId = mAm.mUserController.handleIncomingUser(callingPid, callingUid, userId, false,
          ActivityManagerService.ALLOW_NON_FULL_IN_PROFILE, "service", null);

  ServiceMap smap = getServiceMap(userId);
  final ComponentName comp = service.getComponent();
  if (comp != null) {
      r = smap.mServicesByName.get(comp);
  }
  if (r == null && !isBindExternal) {
      Intent.FilterComparison filter = new Intent.FilterComparison(service);
      r = smap.mServicesByIntent.get(filter);
  }
  if (r != null && (r.serviceInfo.flags & ServiceInfo.FLAG_EXTERNAL_SERVICE) != 0
          && !callingPackage.equals(r.packageName)) {
      // If an external service is running within its own package, other packages
      // should not bind to that instance.
      r = null;
  }
  if (r == null) {
      try {
          // TODO: come back and remove this assumption to triage all services
          ResolveInfo rInfo = AppGlobals.getPackageManager().resolveService(service,
                  resolvedType, ActivityManagerService.STOCK_PM_FLAGS
                          | PackageManager.MATCH_DEBUG_TRIAGED_MISSING,
                  userId);
          ServiceInfo sInfo =
              rInfo != null ? rInfo.serviceInfo : null;
          if (sInfo == null) {
              Slog.w(TAG_SERVICE, "Unable to start service " + service + " U=" + userId +
                    ": not found");
              return null;
          }
          ComponentName name = new ComponentName(
                  sInfo.applicationInfo.packageName, sInfo.name);
          if ((sInfo.flags & ServiceInfo.FLAG_EXTERNAL_SERVICE) != 0) {
              if (isBindExternal) {
                  if (!sInfo.exported) {
                      throw new SecurityException("BIND_EXTERNAL_SERVICE failed, " + name +
                              " is not exported");
                  }
                  if ((sInfo.flags & ServiceInfo.FLAG_ISOLATED_PROCESS) == 0) {
                      throw new SecurityException("BIND_EXTERNAL_SERVICE failed, " + name +
                              " is not an isolatedProcess");
                  }
                  // Run the service under the calling package's application.
                  ApplicationInfo aInfo = AppGlobals.getPackageManager().getApplicationInfo(
                          callingPackage, ActivityManagerService.STOCK_PM_FLAGS, userId);
                  if (aInfo == null) {
                      throw new SecurityException("BIND_EXTERNAL_SERVICE failed, " +
                              "could not resolve client package " + callingPackage);
                  }
                  sInfo = new ServiceInfo(sInfo);
                  sInfo.applicationInfo = new ApplicationInfo(sInfo.applicationInfo);
                  sInfo.applicationInfo.packageName = aInfo.packageName;
                  sInfo.applicationInfo.uid = aInfo.uid;
                  name = new ComponentName(aInfo.packageName, name.getClassName());
                  service.setComponent(name);
              } else {
                  throw new SecurityException("BIND_EXTERNAL_SERVICE required for " +
                          name);
              }
          } else if (isBindExternal) {
              throw new SecurityException("BIND_EXTERNAL_SERVICE failed, " + name +
                      " is not an externalService");
          }
          if (userId > 0) {
              if (mAm.isSingleton(sInfo.processName, sInfo.applicationInfo,
                      sInfo.name, sInfo.flags)
                      && mAm.isValidSingletonCall(callingUid, sInfo.applicationInfo.uid)) {
                  userId = 0;
                  smap = getServiceMap(0);
              }
              sInfo = new ServiceInfo(sInfo);
              sInfo.applicationInfo = mAm.getAppInfoForUser(sInfo.applicationInfo, userId);
          }
          r = smap.mServicesByName.get(name);
          if (r == null && createIfNeeded) {
              Intent.FilterComparison filter
                      = new Intent.FilterComparison(service.cloneFilter());
              ServiceRestarter res = new ServiceRestarter();
              BatteryStatsImpl.Uid.Pkg.Serv ss = null;
              BatteryStatsImpl stats = mAm.mBatteryStatsService.getActiveStatistics();
              synchronized (stats) {
                  ss = stats.getServiceStatsLocked(
                          sInfo.applicationInfo.uid, sInfo.packageName,
                          sInfo.name);
              }
              r = new ServiceRecord(mAm, ss, name, filter, sInfo, callingFromFg, res);
              res.setService(r);
              smap.mServicesByName.put(name, r);
              smap.mServicesByIntent.put(filter, r);

              // Make sure this component isn't in the pending list.
              for (int i=mPendingServices.size()-1; i>=0; i--) {
                  ServiceRecord pr = mPendingServices.get(i);
                  if (pr.serviceInfo.applicationInfo.uid == sInfo.applicationInfo.uid
                          && pr.name.equals(name)) {
                      mPendingServices.remove(i);
                  }
              }
          }
      } catch (RemoteException ex) {
          // pm is in same process, this will never happen.
      }
  }
  if (r != null) {
      if (mAm.checkComponentPermission(r.permission,
              callingPid, callingUid, r.appInfo.uid, r.exported)
              != PackageManager.PERMISSION_GRANTED) {
          if (!r.exported) {
              Slog.w(TAG, "Permission Denial: Accessing service " + r.name
                      + " from pid=" + callingPid
                      + ", uid=" + callingUid
                      + " that is not exported from uid " + r.appInfo.uid);
              return new ServiceLookupResult(null, "not exported from uid "
                      + r.appInfo.uid);
          }
          Slog.w(TAG, "Permission Denial: Accessing service " + r.name
                  + " from pid=" + callingPid
                  + ", uid=" + callingUid
                  + " requires " + r.permission);
          return new ServiceLookupResult(null, r.permission);
      } else if (r.permission != null && callingPackage != null) {
          final int opCode = AppOpsManager.permissionToOpCode(r.permission);
          if (opCode != AppOpsManager.OP_NONE && mAm.mAppOpsService.noteOperation(
                  opCode, callingUid, callingPackage) != AppOpsManager.MODE_ALLOWED) {
              Slog.w(TAG, "Appop Denial: Accessing service " + r.name
                      + " from pid=" + callingPid
                      + ", uid=" + callingUid
                      + " requires appop " + AppOpsManager.opToName(opCode));
              return null;
          }
      }

      if (!mAm.mIntentFirewall.checkService(r.name, service, callingUid, callingPid,
              resolvedType, r.appInfo)) {
          return null;
      }
      return new ServiceLookupResult(r, null);
  }
  return null;
}
```

### bringUpServiceLocked

```java
private String bringUpServiceLocked(ServiceRecord r, int intentFlags, boolean execInFg,
        boolean whileRestarting, boolean permissionsReviewRequired)
        throws TransactionTooLargeException {
    //Slog.i(TAG, "Bring up service:");
    //r.dump("  ");

    if (r.app != null && r.app.thread != null) {
        sendServiceArgsLocked(r, execInFg, false);
        return null;
    }

    if (!whileRestarting && r.restartDelay > 0) {
        // If waiting for a restart, then do nothing.
        return null;
    }

    if (DEBUG_SERVICE) Slog.v(TAG_SERVICE, "Bringing up " + r + " " + r.intent);

    // We are now bringing the service up, so no longer in the
    // restarting state.
    if (mRestartingServices.remove(r)) {
        r.resetRestartCounter();
        clearRestartingIfNeededLocked(r);
    }

    // Make sure this service is no longer considered delayed, we are starting it now.
    if (r.delayed) {
        if (DEBUG_DELAYED_STARTS) Slog.v(TAG_SERVICE, "REM FR DELAY LIST (bring up): " + r);
        getServiceMap(r.userId).mDelayedStartList.remove(r);
        r.delayed = false;
    }

    // Make sure that the user who owns this service is started.  If not,
    // we don't want to allow it to run.
    if (!mAm.mUserController.hasStartedUserState(r.userId)) {
        String msg = "Unable to launch app "
                + r.appInfo.packageName + "/"
                + r.appInfo.uid + " for service "
                + r.intent.getIntent() + ": user " + r.userId + " is stopped";
        Slog.w(TAG, msg);
        bringDownServiceLocked(r);
        return msg;
    }

    // Service is now being launched, its package can't be stopped.
    try {
        AppGlobals.getPackageManager().setPackageStoppedState(
                r.packageName, false, r.userId);
    } catch (RemoteException e) {
    } catch (IllegalArgumentException e) {
        Slog.w(TAG, "Failed trying to unstop package "
                + r.packageName + ": " + e);
    }

    final boolean isolated = (r.serviceInfo.flags&ServiceInfo.FLAG_ISOLATED_PROCESS) != 0;
    final String procName = r.processName;
    ProcessRecord app;

    if (!isolated) {
        app = mAm.getProcessRecordLocked(procName, r.appInfo.uid, false);
        if (DEBUG_MU) Slog.v(TAG_MU, "bringUpServiceLocked: appInfo.uid=" + r.appInfo.uid
                    + " app=" + app);
        if (app != null && app.thread != null) {
            try {
                app.addPackage(r.appInfo.packageName, r.appInfo.versionCode, mAm.mProcessStats);
                realStartServiceLocked(r, app, execInFg);
                return null;
            } catch (TransactionTooLargeException e) {
                throw e;
            } catch (RemoteException e) {
                Slog.w(TAG, "Exception when starting service " + r.shortName, e);
            }

            // If a dead object exception was thrown -- fall through to
            // restart the application.
        }
    } else {
        // If this service runs in an isolated process, then each time
        // we call startProcessLocked() we will get a new isolated
        // process, starting another process if we are currently waiting
        // for a previous process to come up.  To deal with this, we store
        // in the service any current isolated process it is running in or
        // waiting to have come up.
        app = r.isolatedProc;
    }

    // Not running -- get it started, and enqueue this service record
    // to be executed when the app comes up.
    if (app == null && !permissionsReviewRequired) {
        if ((app=mAm.startProcessLocked(procName, r.appInfo, true, intentFlags,
                "service", r.name, false, isolated, false)) == null) {
            String msg = "Unable to launch app "
                    + r.appInfo.packageName + "/"
                    + r.appInfo.uid + " for service "
                    + r.intent.getIntent() + ": process is bad";
            Slog.w(TAG, msg);
            bringDownServiceLocked(r);
            return msg;
        }
        if (isolated) {
            r.isolatedProc = app;
        }
    }

    if (!mPendingServices.contains(r)) {
        mPendingServices.add(r);
    }

    if (r.delayedStop) {
        // Oh and hey we've already been asked to stop!
        r.delayedStop = false;
        if (r.startRequested) {
            if (DEBUG_DELAYED_STARTS) Slog.v(TAG_SERVICE,
                    "Applying delayed stop (in bring up): " + r);
            stopServiceLocked(r);
        }
    }

    return null;
}
```

### realStartServiceLocked

```java
private final void realStartServiceLocked(ServiceRecord r,
        ProcessRecord app, boolean execInFg) throws RemoteException {
    if (app.thread == null) {
        throw new RemoteException();
    }
    if (DEBUG_MU)
        Slog.v(TAG_MU, "realStartServiceLocked, ServiceRecord.uid = " + r.appInfo.uid
                + ", ProcessRecord.uid = " + app.uid);
    r.app = app;
    r.restartTime = r.lastActivity = SystemClock.uptimeMillis();

    final boolean newService = app.services.add(r);
    bumpServiceExecutingLocked(r, execInFg, "create");
    mAm.updateLruProcessLocked(app, false, null);
    mAm.updateOomAdjLocked();

    boolean created = false;
    try {
        if (LOG_SERVICE_START_STOP) {
            String nameTerm;
            int lastPeriod = r.shortName.lastIndexOf('.');
            nameTerm = lastPeriod >= 0 ? r.shortName.substring(lastPeriod) : r.shortName;
            EventLogTags.writeAmCreateService(
                    r.userId, System.identityHashCode(r), nameTerm, r.app.uid, r.app.pid);
        }
        synchronized (r.stats.getBatteryStats()) {
            r.stats.startLaunchedLocked();
        }
        mAm.notifyPackageUse(r.serviceInfo.packageName,
                             PackageManager.NOTIFY_PACKAGE_USE_SERVICE);
        app.forceProcessStateUpTo(ActivityManager.PROCESS_STATE_SERVICE);
        //调用ApplicationThreadProxy的scheduleCreateService
        app.thread.scheduleCreateService(r, r.serviceInfo,
                mAm.compatibilityInfoForPackageLocked(r.serviceInfo.applicationInfo),
                app.repProcState);
        r.postNotification();
        created = true;
    } catch (DeadObjectException e) {
        Slog.w(TAG, "Application dead when creating service " + r);
        mAm.appDiedLocked(app);
        throw e;
    } finally {
        if (!created) {
            // Keep the executeNesting count accurate.
            final boolean inDestroying = mDestroyingServices.contains(r);
            serviceDoneExecutingLocked(r, inDestroying, inDestroying);

            // Cleanup.
            if (newService) {
                app.services.remove(r);
                r.app = null;
            }

            // Retry.
            if (!inDestroying) {
                scheduleServiceRestartLocked(r, false);
            }
        }
    }

    if (r.whitelistManager) {
        app.whitelistManager = true;
    }
    //
    requestServiceBindingsLocked(r, execInFg);

    updateServiceClientActivitiesLocked(app, null, true);

    // If the service is in the started state, and there are no
    // pending arguments, then fake up one so its onStartCommand() will
    // be called.
    if (r.startRequested && r.callStart && r.pendingStarts.size() == 0) {
        r.pendingStarts.add(new ServiceRecord.StartItem(r, false, r.makeNextStartId(),
                null, null));
    }

    sendServiceArgsLocked(r, execInFg, true);

    if (r.delayed) {
        if (DEBUG_DELAYED_STARTS) Slog.v(TAG_SERVICE, "REM FR DELAY LIST (new proc): " + r);
        getServiceMap(r.userId).mDelayedStartList.remove(r);
        r.delayed = false;
    }

    if (r.delayedStop) {
        // Oh and hey we've already been asked to stop!
        r.delayedStop = false;
        if (r.startRequested) {
            if (DEBUG_DELAYED_STARTS) Slog.v(TAG_SERVICE,
                    "Applying delayed stop (from start): " + r);
            stopServiceLocked(r);
        }
    }
}
```

### requestServiceBindingsLocked

```java
private final void requestServiceBindingsLocked(ServiceRecord r, boolean execInFg)
        throws TransactionTooLargeException {
    for (int i=r.bindings.size()-1; i>=0; i--) {
        IntentBindRecord ibr = r.bindings.valueAt(i);
        if (!requestServiceBindingLocked(r, ibr, execInFg, false)) {
            break;
        }
    }
}
```

### requestServiceBindingLocked

```java
private final boolean requestServiceBindingLocked(ServiceRecord r, IntentBindRecord i,
        boolean execInFg, boolean rebind) throws TransactionTooLargeException {
    if (r.app == null || r.app.thread == null) {
        // If service is not currently running, can't yet bind.
        return false;
    }
    if ((!i.requested || rebind) && i.apps.size() > 0) {
        try {
            bumpServiceExecutingLocked(r, execInFg, "bind");
            r.app.forceProcessStateUpTo(ActivityManager.PROCESS_STATE_SERVICE);
            //调用ApplicationThreadProxy的scheduleBindService
            r.app.thread.scheduleBindService(r, i.intent.getIntent(), rebind,
                    r.app.repProcState);
            if (!rebind) {
                i.requested = true;
            }
            i.hasBound = true;
            i.doRebind = false;
        } catch (TransactionTooLargeException e) {
            // Keep the executeNesting count accurate.
            if (DEBUG_SERVICE) Slog.v(TAG_SERVICE, "Crashed while binding " + r, e);
            final boolean inDestroying = mDestroyingServices.contains(r);
            serviceDoneExecutingLocked(r, inDestroying, inDestroying);
            throw e;
        } catch (RemoteException e) {
            if (DEBUG_SERVICE) Slog.v(TAG_SERVICE, "Crashed while binding " + r);
            // Keep the executeNesting count accurate.
            final boolean inDestroying = mDestroyingServices.contains(r);
            serviceDoneExecutingLocked(r, inDestroying, inDestroying);
            return false;
        }
    }
    return true;
}
```

### publishServiceLocked

```java
void publishServiceLocked(ServiceRecord r, Intent intent, IBinder service) {
    final long origId = Binder.clearCallingIdentity();
    try {
        if (DEBUG_SERVICE) Slog.v(TAG_SERVICE, "PUBLISHING " + r
                + " " + intent + ": " + service);
        if (r != null) {
            Intent.FilterComparison filter
                    = new Intent.FilterComparison(intent);
            IntentBindRecord b = r.bindings.get(filter);
            if (b != null && !b.received) {
                b.binder = service;//binder赋值
                b.requested = true;
                b.received = true;
                for (int conni=r.connections.size()-1; conni>=0; conni--) {
                    ArrayList<ConnectionRecord> clist = r.connections.valueAt(conni);
                    for (int i=0; i<clist.size(); i++) {
                        ConnectionRecord c = clist.get(i);
                        if (!filter.equals(c.binding.intent.intent)) {
                            if (DEBUG_SERVICE) Slog.v(
                                    TAG_SERVICE, "Not publishing to: " + c);
                            if (DEBUG_SERVICE) Slog.v(
                                    TAG_SERVICE, "Bound intent: " + c.binding.intent.intent);
                            if (DEBUG_SERVICE) Slog.v(
                                    TAG_SERVICE, "Published intent: " + intent);
                            continue;
                        }
                        if (DEBUG_SERVICE) Slog.v(TAG_SERVICE, "Publishing to: " + c);
                        try {
                            c.conn.connected(r.name, service);
                        } catch (Exception e) {
                            Slog.w(TAG, "Failure sending service " + r.name +
                                  " to connection " + c.conn.asBinder() +
                                  " (in " + c.binding.client.processName + ")", e);
                        }
                    }
                }
            }

            serviceDoneExecutingLocked(r, mDestroyingServices.contains(r), false);
        }
    } finally {
        Binder.restoreCallingIdentity(origId);
    }
}

```



## ServiceRecord

### retrieveAppBindingLocked

```java
//frameworks/base/services/core/java/com/android/server/am/ServiceRecord.java
final ArrayMap<Intent.FilterComparison, IntentBindRecord> bindings
        = new ArrayMap<Intent.FilterComparison, IntentBindRecord>();
public AppBindRecord retrieveAppBindingLocked(Intent intent,ProcessRecord app) {
    Intent.FilterComparison filter = new Intent.FilterComparison(intent);
    IntentBindRecord i = bindings.get(filter);
    if (i == null) {
        i = new IntentBindRecord(this, filter); //创建IntentBindRecord
        bindings.put(filter, i);
    }
    AppBindRecord a = i.apps.get(app);
    if (a != null) {
        return a;
    }
    a = new AppBindRecord(this, i, app); //创建
    i.apps.put(app, a);
    return a;
}
```



## ProcessRecord

```java
final class ProcessRecord {
  IApplicationThread thread;
}
```



## IntentBindRecord

```java
//frameworks/base/services/core/java/com/android/server/am/IntentBindRecord.java
final ArrayMap<ProcessRecord, AppBindRecord> apps
            = new ArrayMap<ProcessRecord, AppBindRecord>();
IBinder binder; 
IntentBindRecord(ServiceRecord _service, Intent.FilterComparison _intent) {
    service = _service;
    intent = _intent;
}
```



## IApplicationThread

{% plantuml %}

class Binder{

}

interface IApplicationThread{

}

abstract class ApplicationThreadNative{

}

class ApplicationThread{

}

IApplicationThread <|.. ApplicationThreadNative

Binder<|-- ApplicationThreadNative

ApplicationThreadNative <|-- ApplicationThread

IApplicationThread <|.. ApplicationThreadProxy

{% endplantuml %}

## ApplicationThreadProxy

### scheduleCreateService

```java
public final void scheduleCreateService(IBinder token, ServiceInfo info,
            CompatibilityInfo compatInfo, int processState) throws RemoteException {
    Parcel data = Parcel.obtain();
    data.writeInterfaceToken(IApplicationThread.descriptor);
    data.writeStrongBinder(token);
    info.writeToParcel(data, 0);
    compatInfo.writeToParcel(data, 0);
    data.writeInt(processState);
    try {
        mRemote.transact(SCHEDULE_CREATE_SERVICE_TRANSACTION, data, null,
                IBinder.FLAG_ONEWAY);
    } catch (TransactionTooLargeException e) {
        Log.e("CREATE_SERVICE", "Binder failure starting service; service=" + info);
        throw e;
    }
    data.recycle();
}
```

### scheduleBindService

```java
public final void scheduleBindService(IBinder token, Intent intent, boolean rebind,
            int processState) throws RemoteException {
    Parcel data = Parcel.obtain();
    data.writeInterfaceToken(IApplicationThread.descriptor);
    data.writeStrongBinder(token);
    intent.writeToParcel(data, 0);
    data.writeInt(rebind ? 1 : 0);
    data.writeInt(processState);
    mRemote.transact(SCHEDULE_BIND_SERVICE_TRANSACTION, data, null,
            IBinder.FLAG_ONEWAY);
    data.recycle();
}
```

## ApplicationThread

```java
//frameworks/base/core/java/android/app/ActivityThread.java
public final void scheduleCreateService(IBinder token,
                ServiceInfo info, CompatibilityInfo compatInfo, int processState) {
    updateProcessState(processState, false);
    CreateServiceData s = new CreateServiceData();
    s.token = token;
    s.info = info;
    s.compatInfo = compatInfo;
    sendMessage(H.CREATE_SERVICE, s); //最终会调用handleCreateService
}
```

```java
public final void scheduleBindService(IBinder token, Intent intent,
                boolean rebind, int processState) {
    updateProcessState(processState, false);
    BindServiceData s = new BindServiceData();
    s.token = token;
    s.intent = intent;
    s.rebind = rebind;

    if (DEBUG_SERVICE)
        Slog.v(TAG, "scheduleBindService token=" + token + " intent=" + intent + " uid="
                + Binder.getCallingUid() + " pid=" + Binder.getCallingPid());
    sendMessage(H.BIND_SERVICE, s);
}
```





## ActivityThread

```java
private void handleCreateService(CreateServiceData data) {
    // If we are getting ready to gc after going to the background, well
    // we are back active so skip it.
    unscheduleGcIdler();

    LoadedApk packageInfo = getPackageInfoNoCheck(
            data.info.applicationInfo, data.compatInfo);
    Service service = null;
    try {
        java.lang.ClassLoader cl = packageInfo.getClassLoader();
        service = (Service) cl.loadClass(data.info.name).newInstance();
    } catch (Exception e) {
        if (!mInstrumentation.onException(service, e)) {
            throw new RuntimeException(
                "Unable to instantiate service " + data.info.name
                + ": " + e.toString(), e);
        }
    }

    try {
        if (localLOGV) Slog.v(TAG, "Creating service " + data.info.name);

        ContextImpl context = ContextImpl.createAppContext(this, packageInfo);
        context.setOuterContext(service);
        //创建Application
        Application app = packageInfo.makeApplication(false, mInstrumentation);
        service.attach(context, this, data.info.name, data.token, app,
                ActivityManagerNative.getDefault());
        service.onCreate();//调用onCreate方法
        mServices.put(data.token, service);
        try {
            ActivityManagerNative.getDefault().serviceDoneExecuting(
                    data.token, SERVICE_DONE_EXECUTING_ANON, 0, 0);
        } catch (RemoteException e) {
            throw e.rethrowFromSystemServer();
        }
    } catch (Exception e) {
        if (!mInstrumentation.onException(service, e)) {
            throw new RuntimeException(
                "Unable to create service " + data.info.name
                + ": " + e.toString(), e);
        }
    }
}
```

### handleBindService

```java
private void handleBindService(BindServiceData data) {
    Service s = mServices.get(data.token);
    if (DEBUG_SERVICE)
        Slog.v(TAG, "handleBindService s=" + s + " rebind=" + data.rebind);
    if (s != null) {
        try {
            data.intent.setExtrasClassLoader(s.getClassLoader());
            data.intent.prepareToEnterProcess();
            try {
                if (!data.rebind) {
                    IBinder binder = s.onBind(data.intent); //调用Service的onBind方法获取IBinder
                    //amp 的publishService方法
                    ActivityManagerNative.getDefault().publishService(
                            data.token, data.intent, binder);
                } else {
                    s.onRebind(data.intent); //调用onRebind
                    ActivityManagerNative.getDefault().serviceDoneExecuting(
                            data.token, SERVICE_DONE_EXECUTING_ANON, 0, 0);
                }
                ensureJitEnabled();
            } catch (RemoteException ex) {
                throw ex.rethrowFromSystemServer();
            }
        } catch (Exception e) {
            if (!mInstrumentation.onException(s, e)) {
                throw new RuntimeException(
                        "Unable to bind to service " + s
                        + " with " + data.intent + ": " + e.toString(), e);
            }
        }
    }
}
```







