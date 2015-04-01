##Fragment管理


### add方法和remove方法


### repleace方法

使用repleace方法会将之前的Fragment的view从viewtree中删除。

### detach方法和attach方法

当调用detach(),fragment将依次执行
>onPause->onStop->onDestoryView

detach会将view从viewtree中删除，此时fragment的状态依旧保持着，

再使用attach()会依次调用
>onCreateView->onActivityCreated

### hide和show方法

hide方法只是隐藏了fragment的view，并没有将view从viewtree中删除，随后可调用show方法将view设置为显示。




* [大话Fragment管理](http://blog.csdn.net/mobilexu/article/details/11711865)
















