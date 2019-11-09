# Volley

Volley是一个HTTP库，可简化Android应用程序的联网，最重要的是，可以更快地联网。Volley在[GitHub](https://github.com/google/volley)上[可用](https://github.com/google/volley)。

Volley有以下好处：

- 自动安排网络请求。
- 多个并发网络连接。
- 具有标准HTTP [缓存一致性的](http://en.wikipedia.org/wiki/Cache_coherence)透明磁盘和内存响应缓存 。
- 支持请求优先级。
- 取消请求API。您可以取消单个请求，也可以将请求的阻止或范围设置为取消。
- 易于定制，例如重试和退避。
- 强大的排序功能使您可以轻松地使用从网络异步获取的数据正确填充UI。
- 调试和跟踪工具。

Volley在用于填充UI的RPC类型操作方面表现出色，例如将搜索结果页面作为结构化数据来获取。它可以轻松地与任何协议集成，并且开箱即用，支持原始字符串，图像和JSON。通过提供对所需功能的内置支持，Volley使您无需编写样板代码，而使您可以专注于特定于应用程序的逻辑。

Volley不适合大型下载或流式传输操作，因为Volley在解析期间会将所有响应都保存在内存中。对于大型下载操作，请考虑使用替代方法`DownloadManager`。

Volley核心库是在[GitHub上](https://github.com/google/volley)开发的，它包含主要的请求分发管道以及在Volley“工具箱”中可用的一组通用工具。将Volley添加到项目中最简单的方法是将以下依赖项添加到应用程序的build.gradle文件中：

```groovy
dependencies {
    ...
    implementation 'com.android.volley:volley:1.1.1'
}
```

您还可以克隆Volley存储库并将其设置为库项目：

1. 通过在命令行中键入以下命令，Git克隆存储库：

   ```
   git clone https://github.com/google/volley
   ```

2. 如[创建](https://developer.android.com/studio/projects/android-library.html) Android库中所述，将下载的源作为Android库模块导入到您的应用程序项目中。