# Zygote进程启动过程

## Zygote概述

在Android系统中，**DVM（Dalvik虚拟机）和ART、应用程序进程以及运行系统的关键服务的SystemServer进程都是由Zygote进程来创建的**，我们也将它称为孵化器。它通过fork（复制进程）的形式来创建应用程序进程和SystemServer进程，由于Zygote进程在启动时会创建DVM或者ART，因此通过fock而创建的应用程序进程和SystemServer进程可以在内部获取一个DVM或者ART的实例副本。

我们已经知道Zygote进程是在init进程启动时创建的，起初Zygote进程的名称并不是叫“zygote”，而是叫“app\_process”，这个名称是在Android.mk中定义的，Zygote进程启动后，Linux系统下的pctrl系统会调用app\_process，将其名称换成了“zygote”。

## Zygote启动脚本

init启动Zygote时主要是调用`app_main.cpp`的`main`函数中的`AppRuntime`的`start`方法来启动`Zygote`进程的，我们就先从`app_main.cpp`的main函数开始分析，Zygote进程启动过程的时序图如图所示。

![](../../.gitbook/assets/image%20%2889%29.png)

```java
//frameworks/base/cmds/app_process/app_main.cpp
int main(int argc, char* const argv[])
{

    ++i;  // Skip unused "parent dir" argument.
    while (i < argc) {
        const char* arg = argv[i++];
        if (strcmp(arg, "--zygote") == 0) { //1
        //如果当前运行在Zygote进程中，则将zygote设置为true
            zygote = true; //2
            niceName = ZYGOTE_NICE_NAME;
        } else if (strcmp(arg, "--start-system-server") == 0) { //3
        //如果当前运行在SystemServer进程中，则将startSystemServer设置为true
            startSystemServer = true; //4
        } 
    }
    //如果运行在Zygote进程中
    if (zygote) { //5
        runtime.start("com.android.internal.os.ZygoteInit", args, zygote);//6
    } else if (className) {
        runtime.start("com.android.internal.os.RuntimeInit", args, zygote);
    } else {
        fprintf(stderr, "Error: no class name or --zygote supplied.\n");
        app_usage();
        LOG_ALWAYS_FATAL("app_process: no class name or --zygote supplied.");
    }
}
```

Zygote 进程都是通过fock 自身来创建子进程的，这样Zygote 进程以及它的子进程都可以进入`app_main.cpp`的main函数，因此main函数中为了区分当前运行在哪个进程，会在注释1处判断参数arg中是否包含了“--zygote”，如果包含了则说明main函数是运行在Zygote进程中的并在注释2处将zygote设置为ture。同理在注释3处判断参数arg中是否包含了“--start-system-server”，如果包含了则说明main函数是运行在SystemServer进程中的并在注释4处将startSystemServer 设置为true。在注释5处，如果zygote为true，就说明当前运行在Zygote进程中，就会调用注释6处的AppRuntime的start函数，如下所示：

```java
//frameworks/base/core/jni/AndroidRuntime.cpp
void AndroidRuntime::start(const char* className, const Vector<String8>& options, bool zygote)
{

    /* start the virtual machine */
    JniInvocation jni_invocation;
    jni_invocation.Init(NULL);
    JNIEnv* env;
    //启动Java虚拟机
    if (startVm(&mJavaVM, &env, zygote) != 0) {//1
        return;
    }
    onVmCreated(env);

    /*
     * Register android functions.
     */
     //为Java虚拟机注册JNI方法
    if (startReg(env) < 0) {//2
        ALOGE("Unable to register all android natives\n");
        return;
    }
    //从app_main的main函数得知className为com.android.internal.os.ZygoteInit
    classNameStr = env->NewStringUTF(className);
    assert(classNameStr != NULL);
    env->SetObjectArrayElement(strArray, 0, classNameStr);

    for (size_t i = 0; i < options.size(); ++i) {
        jstring optionsStr = env->NewStringUTF(options.itemAt(i).string());
        assert(optionsStr != NULL);
        env->SetObjectArrayElement(strArray, i + 1, optionsStr);
    }

    /*
     * Start VM.  This thread becomes the main thread of the VM, and will
     * not return until the VM exits.
     */
     //将className的“.”替换为“/”
    char* slashClassName = toSlashClassName(className != NULL ? className : "");//4
    //找到ZygoteInit
    jclass startClass = env->FindClass(slashClassName);//5
    if (startClass == NULL) {
        ALOGE("JavaVM unable to locate class '%s'\n", slashClassName);
        /* keep going */
    } else {
        //找到ZygoteInit的main方法
        jmethodID startMeth = env->GetStaticMethodID(startClass, "main",
            "([Ljava/lang/String;)V");//6
        if (startMeth == NULL) {
            ALOGE("JavaVM unable to find main() in '%s'\n", className);
            /* keep going */
        } else {
        //通过JNI调用ZygoteInit的main方法
            env->CallStaticVoidMethod(startClass, startMeth, strArray);//7

#if 0
            if (env->ExceptionCheck())
                threadExitUncaughtException(env);
#endif
        }
    }
    free(slashClassName);

    ALOGD("Shutting down VM\n");
    if (mJavaVM->DetachCurrentThread() != JNI_OK)
        ALOGW("Warning: unable to detach main thread\n");
    if (mJavaVM->DestroyJavaVM() != 0)
        ALOGW("Warning: VM did not shut down cleanly\n");
}
```

在注释1处调用startVm函数来创建Java虚拟机，

在注释2处调用startReg函数为Java虚拟机注册JNI方法。

注释3处的className的值是传进来的参数，它的值为com.android.internal.os.ZygoteInit。

在注释4处通过toSlashClassName函数，将className的“.”替换为“/”，替换后的值为com/android/internal/os/ZygoteInit，并赋值给slashClassName，

在注释5处根据slashClassName找到ZygoteInit，找到了ZygoteInit后顺理成章地在注释6处找到ZygoteInit的main方法。最终会在注释7处通过JNI调用ZygoteInit的main方法。这里为何要使用JNI呢？因为ZygoteInit的main方法是由Java语言编写的，当前的运行逻辑在Native中，这就需要通过JNI来调用Java。这样Zygote就从Native层进入了Java框架层。



在我们通过JNI调用ZygoteInit的main方法后，Zygote便进入了Java框架层，此前是没有任何代码进入Java框架层的，换句话说是Zygote开创了Java框架层。该main方法代码如下：

```java
//frameworks/base/core/java/com/android/internal/os/ZygoteInit.java
    public static void main(String argv[]) {

        try {
            String socketName = "zygote";
            //创建一个Server端的Socket，socketName的值为“zygote”
            zygoteServer.registerServerSocket(socketName);//1
            // In some configurations, we avoid preloading resources and classes eagerly.
            // In such cases, we will preload things prior to our first fork.
            if (!enableLazyPreload) {
                bootTimingsTraceLog.traceBegin("ZygotePreload");
                EventLog.writeEvent(LOG_BOOT_PROGRESS_PRELOAD_START,
                    SystemClock.uptimeMillis());
                //预加载类和资源
                preload(bootTimingsTraceLog);//2
                EventLog.writeEvent(LOG_BOOT_PROGRESS_PRELOAD_END,
                    SystemClock.uptimeMillis());
                bootTimingsTraceLog.traceEnd(); // ZygotePreload
            } else {
                Zygote.resetNicePriority();
            }
            //...
            if (startSystemServer) {
            //启动SystemServer进程
                Runnable r = forkSystemServer(abiList, socketName, zygoteServer);//3

                // {@code r == null} in the parent (zygote) process, and {@code r != null} in the
                // child (system_server) process.
                if (r != null) {
                    r.run();
                    return;
                }
            }

            Log.i(TAG, "Accepting command socket connections");

            // The select loop returns early in the child process after a fork and
            // loops forever in the zygote.
            //等待AMS请求
            caller = zygoteServer.runSelectLoop(abiList);//4
        } catch (Throwable ex) {
            Log.e(TAG, "System zygote died with exception", ex);
            throw ex;
        } finally {
            zygoteServer.closeServerSocket();
        }

        // We're in the child process and have exited the select loop. Proceed to execute the
        // command.
        if (caller != null) {
            caller.run();
        }
    }
```

在注释1处通过registerServerSocket 方法来创建一个Server端的Socket，这个name为“zygote”的Socket用于等待ActivityManagerService请求Zygote来创建新的应用程序进程，关于AMS将在第6章进行介绍。在注释2处预加载类和资源。在注释3处启动SystemServer进程，这样系统的服务也会由SystemServer进程启动起来。在注释4处调用ZygoteServer的runSelectLoop方法来等待AMS请求创建新的应用程序进程。

由此得知，ZygoteInit的main方法主要做了4件事：

1. 创建一个Server端的Socket。
2. 预加载类和资源。
3. 启动SystemServer进程。
4. 等待AMS请求创建新的应用程序进程。

### 1.registerZygoteSocket

首先我们来查看ZygoteServer的registerZygoteSocket方法做了什么，如下所示：

```java
//frameworks/base/core/java/com/android/internal/os/ZygoteServer.java
private static final String ANDROID_SOCKET_PREFIX = "ANDROID_SOCKET_";
   void registerServerSocket(String socketName) {
        if (mServerSocket == null) {
            int fileDesc;
            //拼接Socket的名称
            final String fullSocketName = ANDROID_SOCKET_PREFIX + socketName;//1
            try {
                //得到Socket的环境变量的值
                String env = System.getenv(fullSocketName);//2
                //将Socket环境变量的值转换为文件描述符的参数
                fileDesc = Integer.parseInt(env);//3
            } catch (RuntimeException ex) {
                throw new RuntimeException(fullSocketName + " unset or invalid", ex);
            }

            try {
                //创建文件描述符
                FileDescriptor fd = new FileDescriptor();
                fd.setInt$(fileDesc);
                //创建服务端Socket
                mServerSocket = new LocalServerSocket(fd);
            } catch (IOException ex) {
                throw new RuntimeException(
                        "Error binding to local socket '" + fileDesc + "'", ex);
            }
        }
    }
```

在注释1处拼接Socket的名称，其中ANDROID_SOCKET\_PREFIX的值为“ANDROID\_SOCKET_”，socketName的值是传进来的值，等于“zygote”，因此fullSocketName的值为“ANDROID\_SOCKET\_zygote”。在注释2处将fullSocketName转换为环境变量的值，再在注释3处转换为文件描述符的参数。在注释4处创建文件描述符，并在注释5处传入此前转换的文件操作符参数。在注释6处创建LocalServerSocket，也就是服务器端的Socket，并将文件操作符作为参数传进去。在Zygote进程将SystemServer进程启动后，就会在这个服务器端的Socket上等待AMS请求Zygote进程来创建新的应用程序进程。

### 2.启动SystemServer进程

接下来查看startSystemServer函数，代码如下所示：

```java
    //frameworks/base/core/java/com/android/internal/os/ZygoteInit.java
    private static Runnable forkSystemServer(String abiList, String socketName,
            ZygoteServer zygoteServer) {
        //创建args数组，这个数组用来保存启动SystemServer的启动参数
        /* Hardcoded command line to start the system server */
        String args[] = {
            "--setuid=1000",
            "--setgid=1000",
            "--setgroups=1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1018,1021,1023,1032,3001,3002,3003,3006,3007,3009,3010",
            "--capabilities=" + capabilities + "," + capabilities,
            "--nice-name=system_server",
            "--runtime-args",
            "com.android.server.SystemServer",
        }; //1
        ZygoteConnection.Arguments parsedArgs = null;

        int pid;

        try {
            parsedArgs = new ZygoteConnection.Arguments(args);//2
            ZygoteConnection.applyDebuggerSystemProperty(parsedArgs);
            ZygoteConnection.applyInvokeWithSystemProperty(parsedArgs);

            /* Request to fork the system server process */
            //3.创建一个子进程，也就是SystemServer进程
            pid = Zygote.forkSystemServer(
                    parsedArgs.uid, parsedArgs.gid,
                    parsedArgs.gids,
                    parsedArgs.debugFlags,
                    null,
                    parsedArgs.permittedCapabilities,
                    parsedArgs.effectiveCapabilities);
        } catch (IllegalArgumentException ex) {
            throw new RuntimeException(ex);
        }

        /* For child process */
        //当前代码逻辑运行在子进程中
        if (pid == 0) {
            if (hasSecondZygote(abiList)) {
                waitForSecondaryZygote(socketName);
            }

            zygoteServer.closeServerSocket();
            //处理SystemServer进程
            return handleSystemServerProcess(parsedArgs);//4
        }

        return null;
    }
```

注释1处的代码用来创建args数组，这个数组用来保存启动SystemServer的启动参数，其中可以看出SystemServer进程的用户id 和用户组id被设置为1000，并且拥有用户组1001～1010、1018、1021、1032、3001～3010的权限；进程名为system\_server；启动的类名为com.android.server.SystemServer。在注释2处将args数组封装成Arguments对象并供注释3处的forkSystemServer函数调用。在注释3处调用Zygote的forkSystemServer方法，其内部会调用nativeForkSystemServer 这个Native 方法，nativeForkSystemServer方法最终会通过fork函数在当前进程创建一个子进程，也就是SystemServer 进程，如果forkSystemServer方法返回的pid的值为0，就表示当前的代码运行在新创建的子进程中，则执行注释4处的handleSystemServerProcess来处理SystemServer进程。

### 3. runSelectLoop

启动SystemServer进程后，会执行ZygoteServer的runSelectLoop方法，如下所示：

```java
//frameworks/base/core/java/com/android/internal/os/ZygoteServer.java
    Runnable runSelectLoop(String abiList) {
        ArrayList<FileDescriptor> fds = new ArrayList<FileDescriptor>();
        ArrayList<ZygoteConnection> peers = new ArrayList<ZygoteConnection>();

        fds.add(mServerSocket.getFileDescriptor());//1
        peers.add(null);
        //无限循环等待AMS的请求
        while (true) {
            StructPollfd[] pollFds = new StructPollfd[fds.size()];
            for (int i = 0; i < pollFds.length; ++i) {//2
                pollFds[i] = new StructPollfd();
                pollFds[i].fd = fds.get(i);
                pollFds[i].events = (short) POLLIN;
            }
            try {
                Os.poll(pollFds, -1);
            } catch (ErrnoException ex) {
                throw new RuntimeException("poll failed", ex);
            }
            for (int i = pollFds.length - 1; i >= 0; --i) {//3
                if ((pollFds[i].revents & POLLIN) == 0) {
                    continue;
                }

                if (i == 0) {
                    ZygoteConnection newPeer = acceptCommandPeer(abiList);//4
                    peers.add(newPeer);
                    fds.add(newPeer.getFileDesciptor());
                } else {
                    try {
                        ZygoteConnection connection = peers.get(i);
                        final Runnable command = connection.processOneCommand(this);

                        if (mIsForkChild) {
                            // We're in the child. We should always have a command to run at this
                            // stage if processOneCommand hasn't called "exec".
                            if (command == null) {
                                throw new IllegalStateException("command == null");
                            }

                            return command;
                        } else {
                            // We're in the server - we should never have any commands to run.
                            if (command != null) {
                                throw new IllegalStateException("command != null");
                            }

                            // We don't know whether the remote side of the socket was closed or
                            // not until we attempt to read from it from processOneCommand. This shows up as
                            // a regular POLLIN event in our regular processing loop.
                            if (connection.isClosedByPeer()) {
                                connection.closeSocket();
                                peers.remove(i);
                                fds.remove(i);
                            }
                        }
                    } catch (Exception e) {
                        if (!mIsForkChild) {
                            // We're in the server so any exception here is one that has taken place
                            // pre-fork while processing commands or reading / writing from the
                            // control socket. Make a loud noise about any such exceptions so that
                            // we know exactly what failed and why.

                            Slog.e(TAG, "Exception executing zygote command: ", e);

                            // Make sure the socket is closed so that the other end knows immediately
                            // that something has gone wrong and doesn't time out waiting for a
                            // response.
                            ZygoteConnection conn = peers.remove(i);
                            conn.closeSocket();

                            fds.remove(i);
                        } else {
                            // We're in the child so any exception caught here has happened post
                            // fork and before we execute ActivityThread.main (or any other main()
                            // method). Log the details of the exception and bring down the process.
                            Log.e(TAG, "Caught post-fork exception in child process.", e);
                            throw e;
                        }
                    }
                }
            }
        }
    }
```

注释1处的mServerSocket就是我们在registerZygoteSocket函数中创建的服务器端Socket，调用`mServerSocket.getFileDescriptor()`函数用来获得该Socket的fd字段的值并添加到fd列表fds中。接下来无限循环用来等待AMS请求Zygote进程创建新的应用程序进程。在注释2处通过遍历将fds存储的信息转移到pollFds数组中。在注释3处对pollFds进行遍历，如果i==0，说明服务器端Socket 与客户端连接上了，换句话说就是，当前Zygote进程与AMS建立了连接。在注释4处通过acceptCommandPeer方法得到ZygoteConnection类并添加到Socket连接列表peers中，接着将该ZygoteConnection的fd添加到fd列表fds中，以便可以接收到AMS发送过来的请求。如果i的值不等于0，则说明AMS向Zygote进程发送了一个创建应用进程的请求，则在注释5处调用ZygoteConnection的runOnce函数来创建一个新的应用程序进程，并在成功创建后将这个连接从Socket连接列表peers和fd列表fds中清除。

## Zygote进程启动总结

Zygote进程启动共做了如下几件事：

1. 创建AppRuntime并调用其start方法，启动Zygote进程。
2. 创建Java虚拟机并为Java虚拟机注册JNI方法。
3. 通过JNI调用ZygoteInit的main函数进入Zygote的Java框架层。
4. 通过registerZygoteSocket方法创建服务器端Socket，并通过runSelectLoop方法等待AMS的请求来创建新的应用程序进程。
5. 启动SystemServer进程。







