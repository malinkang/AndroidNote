# 菜单

菜单在很多应用中是一个常见的用户界面组件。为了提供一个常见和一致的用户体验，你应当使用[Menu](http://developer.android.com/reference/android/view/Menu.html)API去呈现用户操作和你Activity的其它选项。

从Android3.0开始（API level 11），Android设备不再要求提供专门的菜单按钮。由于这个改变，Android应用应当从依赖传统6个条目菜单面板迁移出来，并且提供一个app bar去展现常见的用户操作。

尽管一些菜单的设计和用户体验已经发生改变，但是定义一套动作和选项仍然基于`Menu`API。这篇指南将介绍如何在所有Android版本上创建三中基本类型的菜单或者动作展现。

 **选项菜单和app bar** 

选项菜单是activity最基本的菜单条目集合。你应当放置一个对应用有全局影响的动作，例如搜索，编写邮件和搜索。

如果你正在为Android2.3或者以下版本开发，用户可以通过按菜单按钮显示出选项菜单。

Android 3.0或者以上版本，选项菜单的条目由app bar 显示为屏幕上的操作条目和溢出选项组合。从Android3.0开始，菜单按钮过时了，因此你应向使用actionbar去提供访问操纵和其他选项迁移。

\*\* Context 菜单和contextual action mode

一个context菜单是一个浮动菜单，当用户在一个元素上执行一个长按操作它就会显示。它提供影响选项内容或者context frame的动作。

当为Android 3.0或者以上开发，你应该当使用使用`contextual action mode`在所选内容上启用操作。

* [Menus](https://developer.android.com/guide/topics/ui/menus)

