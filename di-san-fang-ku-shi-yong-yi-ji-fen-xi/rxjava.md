# RxJava

## 目录

* [1.创建Observable](rxjava.md#1.创建Observable)
* [2.操作符](rxjava.md#2.操作符)
* [3.错误处理](rxjava.md#3.错误处理)
* [4.调度器](rxjava.md#4.调度器)
* [5.订阅](rxjava.md#5.订阅)
* [参考](rxjava.md#参考)

`RxJava`最核心的东西就是`Observables`和`Subscribers`。`Observables`发出一系列事件，`Subscribers`处理这些事件。如果一个`Observables`没有任何的`Subscribers`，那么这个`Observables`是不会发出任何事件来。

## 1.创建Observable <a id="1.&#x521B;&#x5EFA;Observable"></a>

`RxJava`提供了多种创建`Observables`的方法。`create`方法创建一实例需要传入一个`OnSubscribe`,当`Subscriber`订阅时进行调用。

创建`Subscriber`

```java
Subscriber<String> mySubscriber = new Subscriber<String>() {
    @Override
    public void onCompleted() {

    }

    @Override
    public void onError(Throwable e) {
    }

    @Override
    public void onNext(String s) {
        System.out.println(s);
    }
};
```

创建`Observable`

```java
        Observable<String> myObservable=Observable.create(
                new Observable.OnSubscribe<String>(){

                    @Override
                    public void call(Subscriber<? super String> subscriber) {
                        System.out.println(subscriber);
                //rx.observers.SafeSubscriber@3e4cefce
                subscriber.onNext("hello,world!");
                    }
                }
        );
```

调用`Observable`的`subscriber`方法与`Subscrible`进行关联

```java
  // 通过Observable的subscribe方法完成subscriber对observable的订阅
      myObservable.subscribe(mySubscriber);
```

输出

```text
hello,world!
```

`Observable`的`just`用来创建只发出一个事件就结束的`Observable`对象。

`Observable`的`from`方法，接受一个集合作为输入，然后每次输出一个元素给`Subscriber`。

```java
     Observable.from(new Integer[]{1,2,3,4,5})
                .filter(new Func1<Integer, Boolean>() {
                    @Override
                    public Boolean call(Integer integer) {
                        return integer/2==0;
                    }
                }).subscribe(new Action1<Integer>() {
            @Override
            public void call(Integer integer) {
                System.out.println(integer);
            }
        });
```

## 2.操作符 <a id="2.&#x64CD;&#x4F5C;&#x7B26;"></a>

操作符就是为了解决对`Observable`对象的变换问题，操作符用于在`Observable`和最终的`Subscriber`之间修改`Observable`发出的事件。`RxJava`提供了很多很有用的操作符。

`map`操作符，就是用来把一个事件转换为另一个事件的。

```java
    Observable.just("hello,")
                .map(new Func1<String, String>() {
                    @Override
                    public String call(String s) {
                        return s + "Dan";
                    }
                }).subscribe(new Action1<String>() {
                    @Override
                    public void call(String s) {
                        System.out.println(s);
                    }
                });
```

也可以使用`map`操作符返回一个发出新的数据类型的`Observable`对象。

`flatMap`可以返回一个`Observable`对象。

```java
 Observable.create(new Observable.OnSubscribe<Integer>() {
            @Override
            public void call(Subscriber<? super Integer> subscriber) {
                System.out.println("create--->"+subscriber);
                //rx.internal.operators.OperatorMap$1@c10d39
                subscriber.onNext(10);
            }
        }).flatMap(new Func1<Integer, Observable<Integer>>() {
            @Override
            public Observable<Integer> call(final Integer integer) {

                return Observable.create(new Observable.OnSubscribe<Integer>() {
                    @Override
                    public void call(Subscriber<? super Integer> subscriber) {
                        System.out.println("flatMap--->"+subscriber);
                        // rx.internal.operators.OperatorMerge$InnerSubscriber@2b3bc58a
                        subscriber.onNext(integer * integer);
                    }
                });
            }
        }).subscribe(mySubscriber2);
```

```java
       Subscriber<Integer> mySubscriber2 = new Subscriber<Integer>() {
            @Override
            public void onCompleted() {

            }

            @Override
            public void onError(Throwable e) {

            }

            @Override
            public void onNext(Integer integer) {
                System.out.println(integer);
            }
        };
```

## 3.错误处理 <a id="3.&#x9519;&#x8BEF;&#x5904;&#x7406;"></a>

## 4.调度器 <a id="4.&#x8C03;&#x5EA6;&#x5668;"></a>

`RxJava`可以使用`Observable`的`subscribeOn`方法指定观察者代码运行的线程。

## 5.订阅 <a id="5.&#x8BA2;&#x9605;"></a>

当调用`Observable.subscribe()`会返回一个`Subscription`对象。这个对象代表了观察者和订阅者之间的联系。

```java
//是否解除订阅
subscription.isUnsubscribed()
//解除订阅
subscription.unsubscribe();
```

参考

* [深入浅出RxJava（一：基础篇）](http://blog.csdn.net/lzyzsd/article/details/41833541)
* [深入浅出RxJava\(二：操作符\)](http://blog.csdn.net/lzyzsd/article/details/44094895)
* [深入浅出RxJava三--响应式的好处](http://blog.csdn.net/lzyzsd/article/details/44891933)
* [深入浅出RxJava四-在Android中使用响应式编程](http://blog.csdn.net/lzyzsd/article/details/45033611)
* [NotRxJava懒人专用指南](http://www.devtf.cn/?p=323)
* [Introducing Yahnac: Where RxJava Meets Firebase and Content Providers](http://www.malmstein.com/blog/2015/03/28/introducing-yahnac-where-rxjava-meets-content-providers/)

