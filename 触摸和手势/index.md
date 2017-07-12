在Android中，所有的Touch事件都会被封装成一个MotionEvent对象。Touch的事件类型包括`ACTION_DOWN`、`ACTION_UP`、`ACTION_MOVE`、`ACTION_CANCEL`等。每一个触摸事件都是以`ACTION_DOWN`开始，以`ACTION_UP`结束。

Android提供了非常多的API来帮助我们创建和检测手势。
