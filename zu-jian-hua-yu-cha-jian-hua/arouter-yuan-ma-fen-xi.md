# ARouter源码分析

```java
//ARouter
public static void init(Application application) {
    if (!hasInit) {
        logger = _ARouter.logger;
        _ARouter.logger.info(Consts.TAG, "ARouter init start.");
        //调用_ARouter的init方法
        hasInit = _ARouter.init(application);
        if (hasInit) {
            _ARouter.afterInit();
        }
        _ARouter.logger.info(Consts.TAG, "ARouter init over.");
    }
}
```

```java
protected static synchronized boolean init(Application application) {
    mContext = application;
    //调用LogisticsCenter的init
    LogisticsCenter.init(mContext, executor);
    logger.info(Consts.TAG, "ARouter init success!");
    hasInit = true;
    mHandler = new Handler(Looper.getMainLooper());
    return true;
}
```

```java

```

