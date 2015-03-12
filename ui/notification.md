#Notification


Notification是一个能够显示在在应用UI界面之外的消息。当系统发送一个通知，它会首先以图标的形式显示在通知区域，用户可以打开通知抽屉去查看详细信息。通知区域和通知抽屉是系统控制的区域，用户可以随时查看。

![](http://developer.android.com/images/ui/notifications/iconic_notification.png)


![](http://developer.android.com/images/ui/notifications/normal_notification.png)



## 显示元素

Notification根据版本和通知抽屉的状态显示两种不同的视觉风格：标准视图，大视图。

* 标准视图

标准的视图高度为64dp。即使你创建一个大视图，它也以标准视图显示，直到它被展开。

![](http://developer.android.com/images/ui/notifications/normal_notification_callouts.png)

各个部分的说明

1. 内容标题
2. 大图标
3. 内容文本
4. 内容信息
5. 小图标
6. 发送通知的时间。可以调用[setWhen()](http://developer.android.com/reference/android/support/v4/app/NotificationCompat.Builder.html#setWhen(long))方法设置时间，如果不指定，默认是系统接收到通知的时间。


* 大视图

当通知在通知抽屉顶部被展开或者用户使用一个手势展开通知将显示大视图。展开通知在4.1以上系统才可用。

![](http://developer.android.com/images/ui/notifications/bigpicture_notification_callouts.png)


大视图能够显示更多的元素，唯一的不同的是7所指的区域。每一种大视图样式以不同的方式设置这块区域。可用的样式包括：

* 大图样式：详情区域显示一个小于256dp高的图片。

* 多文本样式：详情区域显示一个大的文本块。

* 收件箱样式：详情区域显示多行文本。

所有的大视图样式有如下可选内容，这些内容在标准视图上不可用。

大内容标题：当展开通知，这个内容标题将覆盖正常视图的内容标题。

摘要文本：允许在详情区域添加一行文本。

## 创建一个Notification

使用NotificationCompat.Builder对象指定Notification的信息和动作，NotificationCompat.Builder.build()能够返回一个Notification对象。调用NotificationManager.notify()将Notification对象传递给系统，即可以发送Notification。

### Notification必选内容

一个Notification对象必须包含如下内容：

* 一个小的图标:通过setSmallIcon()方法设置。

* 一个标题:通过setContentTitle()方法设置。

* 详细文本：通过setContentText()方法设置。

### 可选内容和设置

所有其他的Notification设置和内容是可选的，想了解更多，请查看NotificationCompat.Builder的参考文档。

### 设置Notification响应事件

尽管动作是可选的，但是我们应当至少为Notification添加一个动作。一个动作允许用户直接从Notification到达应用的一个Activity。一个Notification可以设置多个动作。多数情况下，这个动作是打开应用的一个Activity，你也可以为Notification添加一些按钮
，从而实现一些附加的动作如关闭一个闹钟或者快速回复一个文本消息。

Notification中，通过PendingIntent定义动作。PenddingIntent包含一个开启Activity的Intent。

示例：

```java
NotificationCompat.Builder mBuilder =
        new NotificationCompat.Builder(this)
        .setSmallIcon(R.drawable.notification_icon)
        .setContentTitle("My notification")
        .setContentText("Hello World!");
// Creates an explicit intent for an Activity in your app
Intent resultIntent = new Intent(this, ResultActivity.class);

// The stack builder object will contain an artificial back stack for the
// started Activity.
// This ensures that navigating backward from the Activity leads out of
// your application to the Home screen.
TaskStackBuilder stackBuilder = TaskStackBuilder.create(this);
// Adds the back stack for the Intent (but not the Intent itself)
stackBuilder.addParentStack(ResultActivity.class);
// Adds the Intent that starts the Activity to the top of the stack
stackBuilder.addNextIntent(resultIntent);
PendingIntent resultPendingIntent =
        stackBuilder.getPendingIntent(
            0,
            PendingIntent.FLAG_UPDATE_CURRENT
        );
mBuilder.setContentIntent(resultPendingIntent);
NotificationManager mNotificationManager =
    (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
// mId allows you to update the notification later on.
mNotificationManager.notify(mId, mBuilder.build());

```


## 扩展阅读

<http://developer.android.com/guide/topics/ui/notifiers/notifications.html>




