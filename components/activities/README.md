# Activity

## 生命周期

* [了解 Activity 生命周期](https://developer.android.com/guide/components/activities/activity-lifecycle)
* [面试题： 如何判断Activity是否在运行？](https://www.jianshu.com/p/f8a0c43b3dfe)
* [显示Dialog会调用onPause方法吗？](https://stackoverflow.com/questions/7240916/android-under-what-circumstances-would-a-dialog-appearing-cause-onpause-to-be) 

> 普通Dialog显示不会调用onPause，除非是Activity创建的Dialog

* [面试官：为什么 Activity.finish() 之后 10s 才 onDestroy ？](https://juejin.cn/post/6898588053451833351)

## 启动模式



> 官方文档关于singleTask描述错误，可以看深入讲解Android中Activity launchMode
>
> singleTask：
>
> A和C都为standard
>
> B为singleTask 
>
> A->B->C  A、B、C在同一个栈内
>
> B设置不同的taskAffinity
>
> A->B->C  A在一个栈内 B、C在同一个栈内
>
> C设置为singleTask、taskAffinity与A一致
>
> A->B->C  A、C在一个栈内 B在同一个栈内

* [了解任务和返回堆栈](https://developer.android.com/guide/components/activities/tasks-and-back-stack)

* [深入讲解Android中Activity launchMode](https://droidyue.com/blog/2015/08/16/dive-into-android-activity-launchmode/)
* [Understand Android Activity's launchMode: standard, singleTop, singleTask and singleInstance](https://inthecheesefactory.com/blog/understand-android-activity-launchmode/en)

* [Activity的四种launchMode](http://blog.csdn.net/liuhe688/article/details/6754323)
* [Activity的task相关](http://blog.csdn.net/liuhe688/article/details/6761337)

