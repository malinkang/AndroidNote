# Android图形系统概述

##  概述

`Android`系统中图形系统是相当复杂的，包括`WindowManager`，`SurfaceFlinger`,Open GL,GPU等模块。 其中SurfaceFlinger作为负责绘制应用UI的核心，从名字可以看出其功能是将所有Surface合成工作。 不论使用什么渲染API, 所有的东西最终都是渲染到”surface”. surface代表BufferQueue的生产者端, 并且 由SurfaceFlinger所消费, 这便是基本的生产者-消费者模式. Android平台所创建的Window都由surface所支持, 所有可见的surface渲染到显示设备都是通过SurfaceFlinger来完成的.

### 图形架构

![](../.gitbook/assets/image%20%2861%29.png)



如果把应用程序图形渲染过程当作一次绘画过程，那么绘画过程中 Android 的各个图形组件的作用是：

* 画笔：Skia 或者 OpenGL。我们可以用 Skia 画笔绘制 2D 图形，也可以用 OpenGL 来绘制 2D/3D 图形。正如前面所说，前者使用 CPU 绘制，后者使用 GPU 绘制。
* 画纸：Surface。所有的元素都在 Surface 这张画纸上进行绘制和渲染。
* 在 Android 中，Window 是 View 的容器，每个窗口都会关联一个 Surface。而 WindowManager 则负责管理这些窗口，并且把它们的数据传递给 SurfaceFlinger。
* 画板：Graphic Buffer。Graphic Buffer 缓冲用于应用程序图形的绘制，在 Android 4.1 之前使用的是双缓冲机制；在 Android 4.1 之后，使用的是三缓冲机制。
* 显示：SurfaceFlinger。它将 WindowManager 提供的所有 Surface，通过硬件合成器 Hardware Composer 合成并输出到显示屏。接下来我将通过 Android 渲染演进分析的方法，帮你进一步加深对 Android 渲染的理解。

