---
title: Parcel源码分析
date: 2020-02-20 15:11:27
tags: ["源码分析"]
draft: true
---

<!--more-->

## Parcel.java

```java
//frameworks/base/core/java/android/os/Parcel.java

```



```cpp
//frameworks/base/core/jni/android_os_Parcel.cpp
static jobject android_os_Parcel_readStrongBinder(JNIEnv* env, jclass clazz, jlong nativePtr)
{
    Parcel* parcel = reinterpret_cast<Parcel*>(nativePtr);
    if (parcel != NULL) {
        return javaObjectForIBinder(env, parcel->readStrongBinder());
    }
    return NULL;
}
```



```cpp
//frameworks/base/core/jni/android_os_Parcel.cpp

```

