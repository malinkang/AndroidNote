

## 服务类型

服务有三种类型

* 前台服务

* 后台服务

* 绑定服务

参考：

* [服务概览](https://developer.android.com/guide/components/services)

* [前台服务](https://developer.android.com/guide/components/foreground-services)


## 绑定服务

* 当客户端取消绑定时，系统不会调用onServiceDisconnected()方法。

* 在Activity中绑定的服务，Activity销毁时绑定的服务也会随之销毁。


## AIDL

oneway和非oneway区别。


```java

override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
    val start =System.currentTimeMillis()
    mService=Operator.Stub.asInterface(service)
    mService?.add(10,20,object:Callback.Stub(){
        override fun onSuccess(result: Int) {
            Log.d(TAG,"onSuccess = $result")
        }
    })
    val end = System.currentTimeMillis()
    Log.d(TAG,"cost ${end -start} ms")
}
//远程服务
private val mBinder =object : Operator.Stub() {
    override fun add(a: Int, b: Int, callback: Callback?) {
        Thread.sleep(1000*5L)
        val result = a+b
        callback?.onSuccess(result)
    }
}
```

不添加oneway会等待远程服务执行完成输出

```java
onSuccess = 30
cost 5007 ms
```

添加oneway输出

```java
cost 2 ms
onSuccess = 30
```


## 服务生命周期




## 参考

* [binder相关面试题](http://139.224.136.101/question/1768)


