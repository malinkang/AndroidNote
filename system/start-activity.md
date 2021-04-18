---
title: startActivity流程分析
date: 2020-02-27T16:07:48+08:00
lastmod: 2020-02-27T16:07:48+08:00
draft: false
keywords: []
description: ""
tags: []
categories: []
author: ""

# You can also close(false) or open(true) something for this content.
# P.S. comment can only be closed
comment: false
toc: true
autoCollapseToc: false
postMetaInFooter: false
hiddenFromHomePage: false
# You can also define another contentCopyright. e.g. contentCopyright: "This is another copyright."
contentCopyright: false
reward: false
mathjax: false
mathjaxEnableSingleDollar: false
mathjaxEnableAutoNumber: false

# You unlisted posts you might want not want the header or footer to show
hideHeaderAndFooter: false

# You can enable or disable out-of-date content warning for individual post.
# Comment this out to use the global config.
#enableOutdatedInfoWarning: false

flowchartDiagrams:
  enable: false
  options: ""

sequenceDiagrams: 
  enable: false
  options: ""

---



`Activity`的启动过程分为两种，一种是根Activity的启动过程，另一种是普通Activity的启动过程。根Activity指的是应用程序启动的第一个Activity，因此根Activity的启动过程一般情况下也可以理解为应用程序的启动过程。普通Activity指的是除应用程序启动的第一个Activity之外的其他Activity。


<!--more-->
Activity的启动过程比较复杂，因此这里分为3个部分来讲，分别是

1. Launcher请求AMS过程
2. AMS到ApplicationThread的调用过程
3. ActivityThread启动Activity。

## Launcher请求AMS过程

Launcher请求AMS的时序图如图所示

![](../../.gitbook/assets/image%20%2866%29.png)

当我们点击应用程序的快捷图标时，就会调用Launcher的startActivitySafely方法，如下所示：

```java
//packages/apps/Launcher3/src/com/android/launcher3/Launcher.java
public boolean startActivitySafely(View v, Intent intent, ItemInfo item,
        @Nullable String sourceContainer) {
    if (!hasBeenResumed()) {
        // Workaround an issue where the WM launch animation is clobbered when finishing the
        // recents animation into launcher. Defer launching the activity until Launcher is
        // next resumed.
        addOnResumeCallback(() -> startActivitySafely(v, intent, item, sourceContainer));
        UiFactory.clearSwipeSharedState(true /* finishAnimation */);
        return true;
    }
    //这里调用的是BaseDraggingActivity的startActivitySafely
    boolean success = super.startActivitySafely(v, intent, item, sourceContainer);
    if (success && v instanceof BubbleTextView) {
        // This is set to the view that launched the activity that navigated the user away
        // from launcher. Since there is no callback for when the activity has finished
        // launching, enable the press state and keep this reference to reset the press
        // state when we return to launcher.
        BubbleTextView btv = (BubbleTextView) v;
        btv.setStayPressed(true);
        addOnResumeCallback(btv);
    }
    return success;
}
```

`BaseDraggingActivity`的`startActivitySafely`方法

```java
//packages/apps/Launcher3/src/com/android/launcher3/BaseDraggingActivity.java
public boolean startActivitySafely(View v, Intent intent, @Nullable ItemInfo item,
        @Nullable String sourceContainer) {
    if (mIsSafeModeEnabled && !PackageManagerHelper.isSystemApp(this, intent)) {
        Toast.makeText(this, R.string.safemode_shortcut_error, Toast.LENGTH_SHORT).show();
        return false;
    }

    Bundle optsBundle = (v != null) ? getActivityLaunchOptionsAsBundle(v) : null;
    UserHandle user = item == null ? null : item.user;

    // Prepare intent
    //①
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    if (v != null) {
        intent.setSourceBounds(getViewBounds(v));
    }
    try {
        boolean isShortcut = (item instanceof WorkspaceItemInfo)
                && (item.itemType == Favorites.ITEM_TYPE_SHORTCUT
                || item.itemType == Favorites.ITEM_TYPE_DEEP_SHORTCUT)
                && !((WorkspaceItemInfo) item).isPromise();
        if (isShortcut) {
            // Shortcuts need some special checks due to legacy reasons.
            startShortcutIntentSafely(intent, optsBundle, item, sourceContainer);
        } else if (user == null || user.equals(Process.myUserHandle())) {
            // Could be launching some bookkeeping activity
            //调用Activity的startActivity方法
            startActivity(intent, optsBundle);
            AppLaunchTracker.INSTANCE.get(this).onStartApp(intent.getComponent(),
                    Process.myUserHandle(), sourceContainer);
        } else {
            LauncherAppsCompat.getInstance(this).startActivityForProfile(
                    intent.getComponent(), user, intent.getSourceBounds(), optsBundle);
            AppLaunchTracker.INSTANCE.get(this).onStartApp(intent.getComponent(), user,
                    sourceContainer);
        }
        getUserEventDispatcher().logAppLaunch(v, intent);
        getStatsLogManager().logAppLaunch(v, intent);
        return true;
    } catch (NullPointerException|ActivityNotFoundException|SecurityException e) {
        Toast.makeText(this, R.string.activity_not_found, Toast.LENGTH_SHORT).show();
        Log.e(TAG, "Unable to launch. tag=" + item + " intent=" + intent, e);
    }
    return false;
}
```

在①处将Flag设置为Intent.FLAG\_ACTIVITY\_NEW\_TASK，这样根Activity会在新的任务栈中启动。在②处会调用startActivity方法。

### Activity#startActivity

```java
@Override
public void startActivity(Intent intent, @Nullable Bundle options) {
    if (options != null) {
        startActivityForResult(intent, -1, options);
    } else {
        // Note we want to go through this call for compatibility with
        // applications that may have overridden the method.
        startActivityForResult(intent, -1);
    }
}
```

在startActivity 方法中会调用startActivityForResult 方法，它的第二个参数为-1，表示Launcher不需要知道Activity启动的结果。

### Activity#startActivityForResult

```java
Activity mParent;

public void startActivityForResult(@RequiresPermission Intent intent, int requestCode,
        @Nullable Bundle options) {
    if (mParent == null) {
        options = transferSpringboardActivityOptions(options);
        Instrumentation.ActivityResult ar =
            mInstrumentation.execStartActivity(
                this, mMainThread.getApplicationThread(), mToken, this,
                intent, requestCode, options);
                //...
    } 
    //...
}
```

mParent是Activity类型的，表示当前Activity的父类。因为目前根Activity还没有创建出来，因此，mParent==null成立。接着调用`Instrumentation`的`execStartActivity`方法，Instrumentation 主要用来监控应用程序和系统的交互。

### Instrumentation#execStartActivity

```java
//frameworks/base/core/java/android/app/Instrumentation.java
public ActivityResult execStartActivity(
        Context who, IBinder contextThread, IBinder token, Activity target,
        Intent intent, int requestCode, Bundle options) {
    try {
        intent.migrateExtraStreamToClipData();
        intent.prepareToLeaveProcess(who);
        //远程调用ATMS的startActivity方法
        int result = ActivityTaskManager.getService()
            .startActivity(whoThread, who.getBasePackageName(), intent,
                    intent.resolveTypeIfNeeded(who.getContentResolver()),
                    token, target != null ? target.mEmbeddedID : null,
                    requestCode, 0, null, options);
        checkStartActivityResult(result, intent);//校验返回结果
    } catch (RemoteException e) {
        throw new RuntimeException("Failure from system", e);
    }
    return null;
}
```

首先调用`ActivityTaskManager`的`getService`方法来获取`IActivityTaskManager`的代理对象，接着调用它的`startActivity`方法。

### Instrumentation#checkStartActivityResult

```java
public static void checkStartActivityResult(int res, Object intent) {
    if (!ActivityManager.isStartResultFatalError(res)) {
        return;
    }

    switch (res) {
        case ActivityManager.START_INTENT_NOT_RESOLVED:
        case ActivityManager.START_CLASS_NOT_FOUND:
            if (intent instanceof Intent && ((Intent)intent).getComponent() != null)
                throw new ActivityNotFoundException(
                        "Unable to find explicit activity class "
                        + ((Intent)intent).getComponent().toShortString()
                        + "; have you declared this activity in your AndroidManifest.xml?");
            throw new ActivityNotFoundException(
                    "No Activity found to handle " + intent);
        case ActivityManager.START_PERMISSION_DENIED:
            throw new SecurityException("Not allowed to start activity "
                    + intent);
        case ActivityManager.START_FORWARD_AND_REQUEST_CONFLICT:
            throw new AndroidRuntimeException(
                    "FORWARD_RESULT_FLAG used while also requesting a result");
        case ActivityManager.START_NOT_ACTIVITY:
            throw new IllegalArgumentException(
                    "PendingIntent is not an activity");
        case ActivityManager.START_NOT_VOICE_COMPATIBLE:
            throw new SecurityException(
                    "Starting under voice control not allowed for: " + intent);
        case ActivityManager.START_VOICE_NOT_ACTIVE_SESSION:
            throw new IllegalStateException(
                    "Session calling startVoiceActivity does not match active session");
        case ActivityManager.START_VOICE_HIDDEN_SESSION:
            throw new IllegalStateException(
                    "Cannot start voice activity on a hidden session");
        case ActivityManager.START_ASSISTANT_NOT_ACTIVE_SESSION:
            throw new IllegalStateException(
                    "Session calling startAssistantActivity does not match active session");
        case ActivityManager.START_ASSISTANT_HIDDEN_SESSION:
            throw new IllegalStateException(
                    "Cannot start assistant activity on a hidden session");
        case ActivityManager.START_CANCELED:
            throw new AndroidRuntimeException("Activity could not be started for "
                    + intent);
        default:
            throw new AndroidRuntimeException("Unknown error code "
                    + res + " when starting " + intent);
    }
}
```





### getService\(\)

```java
public static IActivityTaskManager getService() {
    return IActivityTaskManagerSingleton.get();
}
```

```java
//通过AIDL通信
private static final Singleton<IActivityTaskManager> IActivityTaskManagerSingleton =
        new Singleton<IActivityTaskManager>() {
            @Override
            protected IActivityTaskManager create() {
                final IBinder b = ServiceManager.getService(Context.ACTIVITY_TASK_SERVICE);
                return IActivityTaskManager.Stub.asInterface(b);
            }
        };
```



## ATMS到AT的调用过程



Launcher请求ActivityTaskManagerService后，代码逻辑已经进入ATMS中，接着是AMS到ApplicationThread的调用流程，时序图如图所示

![](../../.gitbook/assets/image%20%2864%29.png)

### startActivity\(\)

```java
//frameworks/base/services/core/java/com/android/server/wm/ActivityTaskManagerService.java
//继承IActivityTaskManager.Stub 实现startActivity方法
public class ActivityTaskManagerService extends IActivityTaskManager.Stub{
    @Override
    public final int startActivity(IApplicationThread caller, String callingPackage,
            Intent intent, String resolvedType, IBinder resultTo, String resultWho, int requestCode,
            int startFlags, ProfilerInfo profilerInfo, Bundle bOptions) {
        return startActivityAsUser(caller, callingPackage, intent, resolvedType, resultTo,
                resultWho, requestCode, startFlags, profilerInfo, bOptions,
                UserHandle.getCallingUserId());
    }
}
```

### startActivityAsUser\(\)

在`ActivityTaskManagerService`的`startActivity`方法中返回了`startActivityAsUser`方法，可以发现`startActivityAsUser`方法比`startActivity`方法多了一个参数`UserHandle.getCallingUserId()`，这个方法会获得调用者的`UserId`，`ActivityTaskManagerService`根据这个`UserId`来确定调用者的权限。

```java
@Override
public int startActivityAsUser(IApplicationThread caller, String callingPackage,
        Intent intent, String resolvedType, IBinder resultTo, String resultWho, int requestCode,
        int startFlags, ProfilerInfo profilerInfo, Bundle bOptions, int userId) {
        //调用重载方法
    return startActivityAsUser(caller, callingPackage, intent, resolvedType, resultTo,
            resultWho, requestCode, startFlags, profilerInfo, bOptions, userId,
            true /*validateIncomingUser*/);
}
```

```java
int startActivityAsUser(IApplicationThread caller, String callingPackage,
        Intent intent, String resolvedType, IBinder resultTo, String resultWho, int requestCode,
        int startFlags, ProfilerInfo profilerInfo, Bundle bOptions, int userId,
        boolean validateIncomingUser) {
        //①判断调用者进程是否被隔离
    enforceNotIsolatedCaller("startActivityAsUser");
    //②检查使用者权限
    userId = getActivityStartController().checkTargetUser(userId, validateIncomingUser,
            Binder.getCallingPid(), Binder.getCallingUid(), "startActivityAsUser");
    // TODO: Switch to user app stacks here.
    //先获取ActivityStartController对象。然后调用obtainStarter方法获取ActivityStarter对象
    //frameworks/base/services/core/java/com/android/server/wm/ActivityStartController.java
  // 
    return getActivityStartController().obtainStarter(intent, "startActivityAsUser")
            .setCaller(caller)
            .setCallingPackage(callingPackage)
            .setResolvedType(resolvedType)
            .setResultTo(resultTo)
            .setResultWho(resultWho)
            .setRequestCode(requestCode)
            .setStartFlags(startFlags)
            .setProfilerInfo(profilerInfo)
            .setActivityOptions(bOptions)
            .setMayWait(userId)//设置MayWait为true
            .execute();
}
```

在注释1处判断调用者进程是否被隔离，如果被隔离则抛出SecurityException异常，在注释2处检查调用者是否有权限，如果没有权限也会抛出SecurityException异常。最后调用了ActivityStarter的execute 方法。  


### execute\(\)

```java
//frameworks/base/services/core/java/com/android/server/wm/ActivityStarter.java
int execute() {
    try {
        // TODO(b/64750076): Look into passing request directly to these methods to allow
        // for transactional diffs and preprocessing.
        if (mRequest.mayWait) {
            return startActivityMayWait(mRequest.caller, mRequest.callingUid,
                    mRequest.callingPackage, mRequest.realCallingPid, mRequest.realCallingUid,
                    mRequest.intent, mRequest.resolvedType,
                    mRequest.voiceSession, mRequest.voiceInteractor, mRequest.resultTo,
                    mRequest.resultWho, mRequest.requestCode, mRequest.startFlags,
                    mRequest.profilerInfo, mRequest.waitResult, mRequest.globalConfig,
                    mRequest.activityOptions, mRequest.ignoreTargetSecurity, mRequest.userId,
                    mRequest.inTask, mRequest.reason,
                    mRequest.allowPendingRemoteAnimationRegistryLookup,
                    mRequest.originatingPendingIntent, mRequest.allowBackgroundActivityStart);
        } else {
          //...
        }
    } finally {
        onExecutionComplete();
    }
}
```

ActivityStarter是Android 7.0中新加入的类，它是加载Activity的控制类，会收集所有的逻辑来决定如何将Intent和Flags转换为Activity，并将Activity和Task以及Stack相关联。

### ActivityStarter#startActivity

```java
private int startActivityMayWait(IApplicationThread caller, int callingUid,
        String callingPackage, int requestRealCallingPid, int requestRealCallingUid,
        Intent intent, String resolvedType, IVoiceInteractionSession voiceSession,
        IVoiceInteractor voiceInteractor, IBinder resultTo, String resultWho, int requestCode,
        int startFlags, ProfilerInfo profilerInfo, WaitResult outResult,
        Configuration globalConfig, SafeActivityOptions options, boolean ignoreTargetSecurity,
        int userId, TaskRecord inTask, String reason,
        boolean allowPendingRemoteAnimationRegistryLookup,
        PendingIntentRecord originatingPendingIntent, boolean allowBackgroundActivityStart) {
    //解析Intent
    ResolveInfo rInfo = mSupervisor.resolveIntent(intent, resolvedType, userId,
            0 /* matchFlags */,
                    computeResolveFilterUid(
                            callingUid, realCallingUid, mRequest.filterCallingUid));
    //...
    // Collect information about the target of the Intent.
    ActivityInfo aInfo = mSupervisor.resolveActivity(intent, rInfo, startFlags, profilerInfo);

    synchronized (mService.mGlobalLock) {
        //调用startActivity
        int res = startActivity(caller, intent, ephemeralIntent, resolvedType, aInfo, rInfo,
                voiceSession, voiceInteractor, resultTo, resultWho, requestCode, callingPid,
                callingUid, callingPackage, realCallingPid, realCallingUid, startFlags, options,
                ignoreTargetSecurity, componentSpecified, outRecord, inTask, reason,
                allowPendingRemoteAnimationRegistryLookup, originatingPendingIntent,
                allowBackgroundActivityStart);
        //...
        //...
        return res;
    }
}
```

```java
private int startActivity(IApplicationThread caller, Intent intent, Intent ephemeralIntent,
        String resolvedType, ActivityInfo aInfo, ResolveInfo rInfo,
        IVoiceInteractionSession voiceSession, IVoiceInteractor voiceInteractor,
        IBinder resultTo, String resultWho, int requestCode, int callingPid, int callingUid,
        String callingPackage, int realCallingPid, int realCallingUid, int startFlags,
        SafeActivityOptions options,
        boolean ignoreTargetSecurity, boolean componentSpecified, ActivityRecord[] outActivity,
        TaskRecord inTask, boolean allowPendingRemoteAnimationRegistryLookup,
        PendingIntentRecord originatingPendingIntent, boolean allowBackgroundActivityStart) {
    mSupervisor.getActivityMetricsLogger().notifyActivityLaunching(intent);
    int err = ActivityManager.START_SUCCESS;
    // Pull the optional Ephemeral Installer-only bundle out of the options early.
    final Bundle verificationBundle
            = options != null ? options.popAppVerificationBundle() : null;

    WindowProcessController callerApp = null;
    if (caller != null) { //① 得到Launcher进程
        callerApp = mService.getProcessController(caller);//②
        if (callerApp != null) {
            //获取Launcher进程的pid和uid
            callingPid = callerApp.getPid();
            callingUid = callerApp.mInfo.uid;
        } else {
            Slog.w(TAG, "Unable to find app for caller " + caller
                    + " (pid=" + callingPid + ") when starting: "
                    + intent.toString());
            err = ActivityManager.START_PERMISSION_DENIED;
        }
    }
    //...
    //创建即将要启动的Activity的描述类ActivityRecord
    ActivityRecord r = new ActivityRecord(mService, callerApp, callingPid, callingUid,
            callingPackage, intent, resolvedType, aInfo, mService.getGlobalConfiguration(),
            resultRecord, resultWho, requestCode, componentSpecified, voiceSession != null,
            mSupervisor, checkedOptions, sourceRecord);
    if (outActivity != null) {
        outActivity[0] = r; //③
    }
    //...
    //④ 调用重载方法
    final int res = startActivity(r, sourceRecord, voiceSession, voiceInteractor, startFlags,
            true /* doResume */, checkedOptions, inTask, outActivity, restrictedBgActivity);
    mSupervisor.getActivityMetricsLogger().notifyActivityLaunched(res, outActivity[0]);
    return res;
}
```

ActivityStarter的startActivity方法逻辑比较多，这里列出部分我们需要关心的代码。在注释1处判断IApplicationThread类型的caller是否为null，这个caller是方法调用一路传过来的，指向的是Launcher所在的应用程序进程的ApplicationThread对象，在注释2处调用ActivityTaskManagerService的getProcessController方法得到的是代表Launcher进程的callerApp对象，它是ProcessRecord类型的，ProcessRecord用于描述一个应用程序进程。同样地，ActivityRecord用于描述一个Activity，用来记录一个Activity 的所有信息。接下来创建ActivityRecord，用于描述将要启动的Activity，并在注释3处将创建的ActivityRecord赋值给ActivityRecord\[\]类型的outActivity，这个outActivity会作为注释4处的startActivity方法的参数传递下去。

```java
private int startActivity(final ActivityRecord r, ActivityRecord sourceRecord,
            IVoiceInteractionSession voiceSession, IVoiceInteractor voiceInteractor,
            int startFlags, boolean doResume, ActivityOptions options, TaskRecord inTask,
            ActivityRecord[] outActivity, boolean restrictedBgActivity) {
    int result = START_CANCELED;
    final ActivityStack startedActivityStack;
    try {
        mService.mWindowManager.deferSurfaceLayout();
        //调用startActivityUnchecked
        result = startActivityUnchecked(r, sourceRecord, voiceSession, voiceInteractor,
                startFlags, doResume, options, inTask, outActivity, restrictedBgActivity);
    } finally {
     //...
    }
    postStartActivityProcessing(r, result, startedActivityStack);
    return result;
}
```

startActivity方法紧接着调用了startActivityUnchecked方法：

### startActivityUnchecked\(\)

```java
private int startActivityUnchecked(final ActivityRecord r, ActivityRecord sourceRecord,
        IVoiceInteractionSession voiceSession, IVoiceInteractor voiceInteractor,
        int startFlags, boolean doResume, ActivityOptions options, TaskRecord inTask,
        ActivityRecord[] outActivity, boolean restrictedBgActivity) {
            //...
    //①
    if (mStartActivity.resultTo == null && mInTask == null && !mAddingToTask
            && (mLaunchFlags & FLAG_ACTIVITY_NEW_TASK) != 0) {
        newTask = true;
        //②创建新的TaskRecord
        result = setTaskFromReuseOrCreateNewTask(taskToAffiliate);
    } else if (mSourceRecord != null) {
        result = setTaskFromSourceRecord();
    } else if (mInTask != null) {
        result = setTaskFromInTask();
    } else {
        // This not being started from an existing activity, and not part of a new task...
        // just put it in the top task, though these days this case should never happen.
        result = setTaskToCurrentTopOrCreateNewTask();
    }
    //...
    if (mDoResume) {
        final ActivityRecord topTaskActivity =
                mStartActivity.getTaskRecord().topRunningActivityLocked();
        if (!mTargetStack.isFocusable()
                || (topTaskActivity != null && topTaskActivity.mTaskOverlay
                && mStartActivity != topTaskActivity)) {
            // If the activity is not focusable, we can't resume it, but still would like to
            // make sure it becomes visible as it starts (this will also trigger entry
            // animation). An example of this are PIP activities.
            // Also, we don't want to resume activities in a task that currently has an overlay
            // as the starting activity just needs to be in the visible paused state until the
            // over is removed.
            mTargetStack.ensureActivitiesVisibleLocked(mStartActivity, 0, !PRESERVE_WINDOWS);
            // Go ahead and tell window manager to execute app transition for this activity
            // since the app transition will not be triggered through the resume channel.
            mTargetStack.getDisplay().mDisplayContent.executeAppTransition();
        } else {
            // If the target stack was not previously focusable (previous top running activity
            // on that stack was not visible) then any prior calls to move the stack to the
            // will not update the focused stack.  If starting the new activity now allows the
            // task stack to be focusable, then ensure that we now update the focused stack
            // accordingly.
            if (mTargetStack.isFocusable()
                    && !mRootActivityContainer.isTopDisplayFocusedStack(mTargetStack)) {
                mTargetStack.moveToFront("startActivityUnchecked");
            }
            //③
            mRootActivityContainer.resumeFocusedStacksTopActivities(
                    mTargetStack, mStartActivity, mOptions);
        }
    } else if (mStartActivity != null) {
        mSupervisor.mRecentTasks.add(mStartActivity.getTaskRecord());
    }
    mRootActivityContainer.updateUserStack(mStartActivity.mUserId, mTargetStack);

    mSupervisor.handleNonResizableTaskIfNeeded(mStartActivity.getTaskRecord(),
            preferredWindowingMode, mPreferredDisplayId, mTargetStack);

    return START_SUCCESS;
}
```

startActivityUnchecked 方法主要处理与栈管理相关的逻辑。在标注①处我们得知，启动根Activity时会将Intent的Flag设置为FLAG\_ACTIVITY\_NEW\_TASK，这样注释1处的条件判断就会满足，接着执行注释2处的setTaskFromReuseOrCreateNewTask方法，其内部会创建一个新的TaskRecord，用来描述一个Activity任务栈，也就是说setTaskFromReuseOrCreateNewTask方法内部会创建一个新的Activity任务栈。Activity任务栈其实是一个假想的模型，并不真实存在，关于Activity 任务栈会在第6章进行介绍。在注释3处会调用RootActivityContainer的resumeFocusedStacksTopActivities方法，如下所示：

### resumeFocusedStacksTopActivities\(\)

```java
//frameworks/base/services/core/java/com/android/server/wm/RootWindowContainer.java
boolean resumeFocusedStacksTopActivities() {
    return resumeFocusedStacksTopActivities(null, null, null);
}
```

```java
//frameworks/base/services/core/java/com/android/server/wm/RootWindowContainer.java
boolean resumeFocusedStacksTopActivities(
        ActivityStack targetStack, ActivityRecord target, ActivityOptions targetOptions) {

    if (!mStackSupervisor.readyToResume()) {
        return false;
    }

    boolean result = false;
    if (targetStack != null && (targetStack.isTopStackOnDisplay()
            || getTopDisplayFocusedStack() == targetStack)) {
        result = targetStack.resumeTopActivityUncheckedLocked(target, targetOptions);
    }

    for (int displayNdx = mActivityDisplays.size() - 1; displayNdx >= 0; --displayNdx) {
        boolean resumedOnDisplay = false;
        final ActivityDisplay display = mActivityDisplays.get(displayNdx);
        for (int stackNdx = display.getChildCount() - 1; stackNdx >= 0; --stackNdx) {
            final ActivityStack stack = display.getChildAt(stackNdx);
            //获取要启动的Activity所有栈的栈顶的不是处于停止状态的ActivityRecord
            final ActivityRecord topRunningActivity = stack.topRunningActivityLocked();
            if (!stack.isFocusableAndVisible() || topRunningActivity == null) {
                continue;
            }
            if (stack == targetStack) {
                // Simply update the result for targetStack because the targetStack had
                // already resumed in above. We don't want to resume it again, especially in
                // some cases, it would cause a second launch failure if app process was dead.
                resumedOnDisplay |= result;
                continue;
            }
            if (display.isTopStack(stack) && topRunningActivity.isState(RESUMED)) {
                // Kick off any lingering app transitions form the MoveTaskToFront operation,
                // but only consider the top task and stack on that display.
                stack.executeAppTransition(targetOptions);
            } else {
                resumedOnDisplay |= topRunningActivity.makeActiveIfNeeded(target);
            }
        }
        if (!resumedOnDisplay) {
            // In cases when there are no valid activities (e.g. device just booted or launcher
            // crashed) it's possible that nothing was resumed on a display. Requesting resume
            // of top activity in focused stack explicitly will make sure that at least home
            // activity is started and resumed, and no recursion occurs.
            final ActivityStack focusedStack = display.getFocusedStack();
            if (focusedStack != null) {
                //调用ActivityStack的resumeTopActivityUncheckedLocked方法
                focusedStack.resumeTopActivityUncheckedLocked(target, targetOptions);
            }
        }
    }

    return result;
}
```

### resumeTopActivityUncheckedLocked\(\)

```java
//frameworks/base/services/core/java/com/android/server/wm/ActivityStack.java
boolean resumeTopActivityUncheckedLocked(ActivityRecord prev, ActivityOptions options) {
    if (mInResumeTopActivity) {
        // Don't even start recursing.
        return false;
    }
    boolean result = false;
    try {
        // Protect against recursion.
        mInResumeTopActivity = true;
        result = resumeTopActivityInnerLocked(prev, options);
        // When resuming the top activity, it may be necessary to pause the top activity (for
        // example, returning to the lock screen. We suppress the normal pause logic in
        // {@link #resumeTopActivityUncheckedLocked}, since the top activity is resumed at the
        // end. We call the {@link ActivityStackSupervisor#checkReadyForSleepLocked} again here
        // to ensure any necessary pause logic occurs. In the case where the Activity will be
        // shown regardless of the lock screen, the call to
        // {@link ActivityStackSupervisor#checkReadyForSleepLocked} is skipped.
        final ActivityRecord next = topRunningActivityLocked(true /* focusableOnly */);
        if (next == null || !next.canTurnScreenOn()) {
            checkReadyForSleep();
        }
    } finally {
        mInResumeTopActivity = false;
    }
    return result;
}
```

### resumeTopActivityInnerLocked\(\)

```java
//frameworks/base/services/core/java/com/android/server/wm/ActivityStack.java
@GuardedBy("mService")
private boolean resumeTopActivityInnerLocked(ActivityRecord prev, ActivityOptions options) {
    //...
    mStackSupervisor.startSpecificActivity(next, true, true);
    //...
    return true;
}
```

### startSpecificActivity(\)

```java
//frameworks/base/services/core/java/com/android/server/wm/ActivityStackSupervisor.java
void startSpecificActivity(ActivityRecord r, boolean andResume, boolean checkConfig) {
    // Is this activity's application already running?
    //获取即将启动的Activity的所在的应用程序进程
    //①
    final WindowProcessController wpc =
            mService.getProcessController(r.processName, r.info.applicationInfo.uid);

    boolean knownToBeDead = false;
    //②
    if (wpc != null && wpc.hasThread()) {
        try {
            //③
            realStartActivityLocked(r, wpc, andResume, checkConfig);
            return;
        } catch (RemoteException e) {
            Slog.w(TAG, "Exception when starting activity "
                    + r.intent.getComponent().flattenToShortString(), e);
        }

        // If a dead object exception was thrown -- fall through to
        // restart the application.
        knownToBeDead = true;
    }

    // Suppress transition until the new activity becomes ready, otherwise the keyguard can
    // appear for a short amount of time before the new process with the new activity had the
    // ability to set its showWhenLocked flags.
    if (getKeyguardController().isKeyguardLocked()) {
        r.notifyUnknownVisibilityLaunched();
    }

    final boolean isTop = andResume && r.isTopRunningActivity();
    //创建进程
    mService.startProcessAsync(r, knownToBeDead, isTop, isTop ? "top-activity" : "activity");
}
```

* ①获取即将启动的`Activity`所在的应用程序进程，
* ②判断要启动的`Activity`所在的应用程序进程是否已经运行
* 如果所在的进程已经运行，就会调用③处的`realStartActivityLocked`方法。  


### realStartActivityLocked\(\)

```java
//frameworks/base/services/core/java/com/android/server/wm/ActivityStackSupervisor.java
boolean realStartActivityLocked(ActivityRecord r, WindowProcessController proc,
        boolean andResume, boolean checkConfig) throws RemoteException {
    // Create activity launch transaction.
    //创建ClientTransaction 传入WindowProcessController的IApplicationThread
    //frameworks/base/core/java/android/app/servertransaction/ClientTransaction.java
    final ClientTransaction clientTransaction = ClientTransaction.obtain(
            proc.getThread(), r.appToken);

    final DisplayContent dc = r.getDisplay().mDisplayContent;
    clientTransaction.addCallback(LaunchActivityItem.obtain(new Intent(r.intent),
            System.identityHashCode(r), r.info,
            // TODO: Have this take the merged configuration instead of separate global
            // and override configs.
            mergedConfiguration.getGlobalConfiguration(),
            mergedConfiguration.getOverrideConfiguration(), r.compat,
            r.launchedFromPackage, task.voiceInteractor, proc.getReportedProcState(),
            r.icicle, r.persistentState, results, newIntents,
            dc.isNextTransitionForward(), proc.createProfilerInfoIfNeeded(),
                    r.assistToken));

    // Set desired final state.
  //创建ActivityLifecycleItem
  //frameworks/base/core/java/android/app/servertransaction/ActivityLifecycleItem.java
    final ActivityLifecycleItem lifecycleItem;
    if (andResume) {
        lifecycleItem = ResumeActivityItem.obtain(dc.isNextTransitionForward());
    } else {
        lifecycleItem = PauseActivityItem.obtain();
    }
    clientTransaction.setLifecycleStateRequest(lifecycleItem);

    // Schedule transaction.
    mService.getLifecycleManager().scheduleTransaction(clientTransaction);
            
    return true;
}
```

### scheduleTransaction\(\)

```java
//ClientLifecycleManager.java
void scheduleTransaction(ClientTransaction transaction) throws RemoteException {
    final IApplicationThread client = transaction.getClient();
    transaction.schedule();
    if (!(client instanceof Binder)) {
        // If client is not an instance of Binder - it's a remote call and at this point 
        // safe to recycle the object. All objects used for local calls will be recycled 
        // the transaction is executed on client in ActivityThread.
        transaction.recycle();
    }
}
```

```java
//ClientTransaction.java
public void schedule() throws RemoteException {
    //调用IApplicationThread的scheduleTransaction方法
    mClient.scheduleTransaction(this);
}
```

## ActivityThread启动Activity的过程

ActivityThread启动Activity过程的时序图

```java
@Override
public void scheduleTransaction(ClientTransaction transaction) throws RemoteException {
    ActivityThread.this.scheduleTransaction(transaction);
}
```

### scheduleTransaction\(\)

```java
//ClientTransactionHandler.java
void scheduleTransaction(ClientTransaction transaction) {
    transaction.preExecute(this);
    sendMessage(ActivityThread.H.EXECUTE_TRANSACTION, transaction);
}
```

### sendMessage\(\)

```java
private void sendMessage(int what, Object obj, int arg1, int arg2, boolean async) {
    if (DEBUG_MESSAGES) {
        Slog.v(TAG,
                "SCHEDULE " + what + " " + mH.codeToString(what) + ": " + arg1 + " / " + obj);
    }
    Message msg = Message.obtain();
    msg.what = what;
    msg.obj = obj;
    msg.arg1 = arg1;
    msg.arg2 = arg2;
    if (async) {
        msg.setAsynchronous(true);
    }
    mH.sendMessage(msg);
}
```

这里mH指的是H，它是ActivityThread的内部类并继承自Handler，是应用程序进程中主线程的消息管理类。因为ApplicationThread是一个Binder，它的调用逻辑运行在Binder线程池中，所以这里需要用H将代码的逻辑切换到主线程中。

### H

```java
class H extends Handler {
    public void handleMessage(Message msg) {
        if (DEBUG_MESSAGES) Slog.v(TAG, ">>> handling: " + codeToString(msg.what));
        switch (msg.what) {
            case EXECUTE_TRANSACTION:
                final ClientTransaction transaction = (ClientTransaction) msg.obj;
                mTransactionExecutor.execute(transaction);
                if (isSystem()) {
                    // Client transactions inside system process are recycled on the client side
                    // instead of ClientLifecycleManager to avoid being cleared before this
                    // message is handled.
                    transaction.recycle();
                }
                // TODO(lifecycler): Recycle locally scheduled transactions.
                break;
        }
        Object obj = msg.obj;
        if (obj instanceof SomeArgs) {
            ((SomeArgs) obj).recycle();
        }
        if (DEBUG_MESSAGES) Slog.v(TAG, "<<< done: " + codeToString(msg.what));
    }
}
```

### execute\(\)

```java
//TransactionExecutor.java
public void execute(ClientTransaction transaction) {
    if (DEBUG_RESOLVER) Slog.d(TAG, tId(transaction) + "Start resolving transaction");
    final IBinder token = transaction.getActivityToken();
    if (token != null) {
        final Map<IBinder, ClientTransactionItem> activitiesToBeDestroyed =
                mTransactionHandler.getActivitiesToBeDestroyed();
        final ClientTransactionItem destroyItem = activitiesToBeDestroyed.get(token);
        if (destroyItem != null) {
            if (transaction.getLifecycleStateRequest() == destroyItem) {
                // It is going to execute the transaction that will destroy activity with the
                // token, so the corresponding to-be-destroyed record can be removed.
                activitiesToBeDestroyed.remove(token);
            }
            if (mTransactionHandler.getActivityClient(token) == null) {
                // The activity has not been created but has been requested to destroy, so all
                // transactions for the token are just like being cancelled.
                Slog.w(TAG, tId(transaction) + "Skip pre-destroyed transaction:\n"
                        + transactionToString(transaction, mTransactionHandler));
                return;
            }
        }
    }
    if (DEBUG_RESOLVER) Slog.d(TAG, transactionToString(transaction, mTransactionHandler));
    executeCallbacks(transaction);
    executeLifecycleState(transaction);
    mPendingActions.clear();
    if (DEBUG_RESOLVER) Slog.d(TAG, tId(transaction) + "End resolving transaction");
}
```

### executeCallbacks\(\)

```java
/** Cycle through all states requested by callbacks and execute them at proper times. */
@VisibleForTesting
public void executeCallbacks(ClientTransaction transaction) {
    final List<ClientTransactionItem> callbacks = transaction.getCallbacks();
    if (callbacks == null || callbacks.isEmpty()) {
        // No callbacks to execute, return early.
        return;
    }
    if (DEBUG_RESOLVER) Slog.d(TAG, tId(transaction) + "Resolving callbacks in transaction");
    final IBinder token = transaction.getActivityToken();
    ActivityClientRecord r = mTransactionHandler.getActivityClient(token);
    // In case when post-execution state of the last callback matches the final state requested
    // for the activity in this transaction, we won't do the last transition here and do it when
    // moving to final state instead (because it may contain additional parameters from server).
    final ActivityLifecycleItem finalStateRequest = transaction.getLifecycleStateRequest();
    final int finalState = finalStateRequest != null ? finalStateRequest.getTargetState()
            : UNDEFINED;
    // Index of the last callback that requests some post-execution state.
    final int lastCallbackRequestingState = lastCallbackRequestingState(transaction);
    final int size = callbacks.size();
    for (int i = 0; i < size; ++i) {
        //获取item
        final ClientTransactionItem item = callbacks.get(i);
        if (DEBUG_RESOLVER) Slog.d(TAG, tId(transaction) + "Resolving callback: " + item);
        final int postExecutionState = item.getPostExecutionState();
        final int closestPreExecutionState = mHelper.getClosestPreExecutionState(r,
                item.getPostExecutionState());
        if (closestPreExecutionState != UNDEFINED) {
            cycleToPath(r, closestPreExecutionState, transaction);
        }
        //执行execute
        item.execute(mTransactionHandler, token, mPendingActions);
        item.postExecute(mTransactionHandler, token, mPendingActions);
        if (r == null) {
            // Launch activity request will create an activity record.
            r = mTransactionHandler.getActivityClient(token);
        }
        if (postExecutionState != UNDEFINED && r != null) {
            // Skip the very last transition and perform it by explicit state request instead.
            final boolean shouldExcludeLastTransition =
                    i == lastCallbackRequestingState && finalState == postExecutionState;
            cycleToPath(r, postExecutionState, shouldExcludeLastTransition, transaction);
        }
    }
}
```

### execute\(\)

```java
 @Override
 public void execute(ClientTransactionHandler client, IBinder token,
         PendingTransactionActions pendingActions) {
     Trace.traceBegin(TRACE_TAG_ACTIVITY_MANAGER, "activityStart");
     ActivityClientRecord r = new ActivityClientRecord(token, mIntent, mIdent, mInfo,
             mOverrideConfig, mCompatInfo, mReferrer, mVoiceInteractor, mState, mPersistentState,
             mPendingResults, mPendingNewIntents, mIsForward,
             mProfilerInfo, client, mAssistToken);
     client.handleLaunchActivity(r, pendingActions, null /* customIntent */);
     Trace.traceEnd(TRACE_TAG_ACTIVITY_MANAGER);
 }

```

### handleLaunchActivity\(\)

```java
/**
    * Extended implementation of activity launch. Used when server requests a launch or relaunch.
    */
@Override
public Activity handleLaunchActivity(ActivityClientRecord r,
        PendingTransactionActions pendingActions, Intent customIntent) {
    // If we are getting ready to gc after going to the background, well
    // we are back active so skip it.
    unscheduleGcIdler();
    mSomeActivitiesChanged = true;

    if (r.profilerInfo != null) {
        mProfiler.setProfiler(r.profilerInfo);
        mProfiler.startProfiling();
    }

    // Make sure we are running with the most recent config.
    handleConfigurationChanged(null, null);

    if (localLOGV) Slog.v(
        TAG, "Handling launch of " + r);

    // Initialize before creating the activity
    if (!ThreadedRenderer.sRendererDisabled
            && (r.activityInfo.flags & ActivityInfo.FLAG_HARDWARE_ACCELERATED) != 0) {
        HardwareRenderer.preload();
    }
    WindowManagerGlobal.initialize();

    // Hint the GraphicsEnvironment that an activity is launching on the process.
    GraphicsEnvironment.hintActivityLaunch();

    final Activity a = performLaunchActivity(r, customIntent);

    if (a != null) {
        r.createdConfig = new Configuration(mConfiguration);
        reportSizeConfigurations(r);
        if (!r.activity.mFinished && pendingActions != null) {
            pendingActions.setOldState(r.state);
            pendingActions.setRestoreInstanceState(true);
            pendingActions.setCallOnPostCreate(true);
        }
    } else {
        // If there was an error, for any reason, tell the activity manager to stop us.
        try {
            ActivityTaskManager.getService()
                    .finishActivity(r.token, Activity.RESULT_CANCELED, null,
                            Activity.DONT_FINISH_TASK_WITH_ACTIVITY);
        } catch (RemoteException ex) {
            throw ex.rethrowFromSystemServer();
        }
    }

    return a;
}
```

### performLaunchActivity\(\)

```java
private Activity performLaunchActivity(ActivityClientRecord r, Intent customIntent) {
    //获取ActivityInfo
    ActivityInfo aInfo = r.activityInfo;
    if (r.packageInfo == null) {
        //获取Apk文件的描述类LoadedApk
        r.packageInfo = getPackageInfo(aInfo.applicationInfo, r.compatInfo,
                Context.CONTEXT_INCLUDE_CODE);
    }

    ComponentName component = r.intent.getComponent();
    if (component == null) {
        component = r.intent.resolveActivity(
            mInitialApplication.getPackageManager());
        r.intent.setComponent(component);
    }

    if (r.activityInfo.targetActivity ! null) {
        component = new ComponentName(r.activityInfo.packageName,
                r.activityInfo.targetActivity);
    }
    //创建要启动Activity的上下文环境
    ContextImpl appContext = createBaseContextForActivity(r);
    Activity activity = null;
    try {
        //获取类加载器
        java.lang.ClassLoader cl = appContext.getClassLoader();
        //用类加载器创建该Activity的实例
        activity = mInstrumentation.newActivity(
                cl, component.getClassName(), r.intent);
        StrictMode.incrementExpectedActivityCount(activity.getClass());
        r.intent.setExtrasClassLoader(cl);
        r.intent.prepareToEnterProcess();
        if (r.state != null) {
            r.state.setClassLoader(cl);
        }
    } catch (Exception e) {
    //...
    }

    try {
       //创建Application
        Application app = r.packageInfo.makeApplication(false, mInstrumentation);

        if (localLOGV) Slog.v(TAG, "Performing launch of " + r);
        if (localLOGV) Slog.v(
                TAG, r + ": app=" + app
                + ", appName=" + app.getPackageName()
                + ", pkg=" + r.packageInfo.getPackageName()
                + ", comp=" + r.intent.getComponent().toShortString()
                + ", dir=" + r.packageInfo.getAppDir());

        if (activity != null) {
            CharSequence title = r.activityInfo.loadLabel(appContext.getPackageManager());
            Configuration config = new Configuration(mCompatConfiguration);
            if (r.overrideConfig != null) {
                config.updateFrom(r.overrideConfig);
            }
            if (DEBUG_CONFIGURATION) Slog.v(TAG, "Launching activity "
                    + r.activityInfo.name + " with config " + config);
            Window window = null;
            if (r.mPendingRemoveWindow != null && r.mPreserveWindow) {
                window = r.mPendingRemoveWindow;
                r.mPendingRemoveWindow = null;
                r.mPendingRemoveWindowManager = null;
            }
            appContext.setOuterContext(activity);
            //初始化Activity
            activity.attach(appContext, this, getInstrumentation(), r.token,
                    r.ident, app, r.intent, r.activityInfo, title, r.parent,
                    r.embeddedID, r.lastNonConfigurationInstances, config,
                    r.referrer, r.voiceInteractor, window, r.configCallback,
                    r.assistToken);

            if (customIntent != null) {
                activity.mIntent = customIntent;
            }
            r.lastNonConfigurationInstances = null;
            checkAndBlockForNetworkAccess();
            activity.mStartedActivity = false;
            int theme = r.activityInfo.getThemeResource();
            if (theme != 0) {
                activity.setTheme(theme);
            }

            activity.mCalled = false;
            if (r.isPersistable()) {
                //启动Activity
                mInstrumentation.callActivityOnCreate(activity, r.state, r.persistentState);
            } else {
                mInstrumentation.callActivityOnCreate(activity, r.state);
            }
            if (!activity.mCalled) {
                throw new SuperNotCalledException(
                    "Activity " + r.intent.getComponent().toShortString() +
                    " did not call through to super.onCreate()");
            }
            r.activity = activity;
        }
        r.setState(ON_CREATE);

        // updatePendingActivityConfiguration() reads from mActivities to update
        // ActivityClientRecord which runs in a different thread. Protect modifications to
        // mActivities to avoid race.
        synchronized (mResourcesManager) {
            mActivities.put(r.token, r);
        }

    } catch (SuperNotCalledException e) {
        throw e;

    } catch (Exception e) {
        if (!mInstrumentation.onException(activity, e)) {
            throw new RuntimeException(
                "Unable to start activity " + component
                + ": " + e.toString(), e);
        }
    }

    return activity;
}
```

### Instrumentation\#newActivity\(\)

```java
public Activity newActivity(ClassLoader cl, String className,
        Intent intent)
        throws InstantiationException, IllegalAccessException,
        ClassNotFoundException {
    String pkg = intent != null && intent.getComponent() != null
            ? intent.getComponent().getPackageName() : null;
    //调用AppComponentFactory的instantiateActivity方法
    return getFactory(pkg).instantiateActivity(cl, className, intent);
}
```

```java
//frameworks/base/core/java/android/app/AppComponentFactory.java
public @NonNull Activity instantiateActivity(@NonNull ClassLoader cl, @NonNull String className,
        @Nullable Intent intent)
        throws InstantiationException, IllegalAccessException, ClassNotFoundException {
    return (Activity) cl.loadClass(className).newInstance();
}
```



```java
public void callActivityOnCreate(Activity activity, Bundle icicle,
        PersistableBundle persistentState) {
    prePerformCreate(activity);
    activity.performCreate(icicle, persistentState);
    postPerformCreate(activity);
}
```

```java
final void performCreate(Bundle icicle) {
    performCreate(icicle, null);
}
```

```java
final void performCreate(Bundle icicle, PersistableBundle persistentState) {
    dispatchActivityPreCreated(icicle);
    mCanEnterPictureInPicture = true;
    restoreHasCurrentPermissionRequest(icicle);
    if (persistentState != null) {
        onCreate(icicle, persistentState);
    } else {
        onCreate(icicle);
    }
    writeEventLog(LOG_AM_ON_CREATE_CALLED, "performCreate");
    mActivityTransitionState.readState(icicle);
    mVisibleFromClient = !mWindow.getWindowStyle().getBoolean(
            com.android.internal.R.styleable.Window_windowNoDisplay, false);
    mFragments.dispatchActivityCreated();
    mActivityTransitionState.setEnterActivityOptions(this, getActivityOptions());
    dispatchActivityPostCreated(icicle);
}
```

## 根Activity启动过程中涉及的进程

根Activity启动过程中会涉及4个进程，分别是Zygote进程、Launcher进程、AMS所在进程（SystemServer进程）、应用程序进程。它们之间的关系如图所示。

![](../../.gitbook/assets/image%20%2863%29.png)

首先Launcher进程向AMS请求创建根Activity，AMS会判断根Activity所需的应用程序进程是否存在并启动，如果不存在就会请求Zygote进程创建应用程序进程。应用程序进程启动后，AMS 会请求创建应用程序进程并启动根Activity。图中步骤2采用的是Socket通信，步骤1和步骤4采用的是Binder通信。上图可能并不是很直观，为了更好理解，下面给出这4个进程调用的时序图，如下图所示。  


![](../../.gitbook/assets/image%20%2865%29.png)

如果是普通Activity启动过程会涉及几个进程呢？答案是两个，AMS所在进程和应用程序进程。实际上理解了根Activity的启动过程（根Activity的onCreate过程）。







