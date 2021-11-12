# Okio概览

* [文档](https://square.github.io/okio/)

???+ 原文

        Okio is a library that complements java.io and java.nio to make it much easier to access, store, and process your data. It started as a component of OkHttp, the capable HTTP client included in Android. It’s well-exercised and ready to solve new problems.

Okio是一个补充`java.io`和`java.nio`的库，使访问、存储和处理数据更加容易。它是作为`OkHttp`的一个组件开始的，`OkHttp`是`Android`中包含的有能力的`HTTP`客户端。它得到了很好的锻炼，并准备解决新的问题。

## ByteStrings and Buffers

???+ 原文

        Okio is built around two types that pack a lot of capability into a straightforward API:

Okio是围绕两种类型建立的，在一个简单的API中包含了大量的功能。

???+ 原文

        * ByteString is an immutable sequence of bytes. For character data, String is fundamental. ByteString is String’s long-lost brother, making it easy to treat binary data as a value. This class is ergonomic: it knows how to encode and decode itself as hex, base64, and UTF-8.
        * [**Buffer**](https://square.github.io/okio/2.x/okio/okio/-buffer/index.html) is a mutable sequence of bytes. Like `ArrayList`, you don’t need to size your buffer in advance. You read and write buffers as a queue: write data to the end and read it from the front. There’s no obligation to manage positions, limits, or capacities.



* ByteString是一个不可改变的字节序列。对于字符数据，String是基本的。ByteString是String失散多年的兄弟，使其很容易将二进制数据当作一个值。这个类是符合人体工程学的：它知道如何将自己编码和解码为十六进制、base64和UTF-8。
* [**Buffer**](https://square.github.io/okio/2.x/okio/okio/-buffer/index.html)是一个可变的字节序列。像`ArrayList`一样，你不需要事先确定缓冲区的大小。你以队列的方式读写缓冲区：把数据写到最后，然后从前面读取。没有义务去管理位置、限制或容量。

???+ 原文

        Internally, ByteString and Buffer do some clever things to save CPU and memory. If you encode a UTF-8 string as a ByteString, it caches a reference to that string so that if you decode it later, there’s no work to do.

在内部，ByteString和Buffer做了一些聪明的事情来节省CPU和内存。如果你把一个UTF-8的字符串编码为ByteString，它就会缓存一个对该字符串的引用，这样如果你以后解码，就不需要做什么了。

???+ 原文

        `Buffer` is implemented as a linked list of segments. When you move data from one buffer to another, it *reassigns ownership* of the segments rather than copying the data across. This approach is particularly helpful for multithreaded programs: a thread that talks to the network can exchange data with a worker thread without any copying or ceremony.

缓冲区被实现为一个段的链接列表。当你把数据从一个缓冲区移到另一个缓冲区时，它重新分配段的所有权，而不是把数据复制过去。这种方法对多线程程序特别有帮助：一个与网络对话的线程可以与一个工作线程交换数据，而无需任何复制或仪式。

## Sources and Sinks

???+ 原文

        An elegant part of the `java.io` design is how streams can be layered for transformations like encryption and compression. Okio includes its own stream types called [`Source`](https://square.github.io/okio/2.x/okio/okio/-source/index.html) and [`Sink`](https://square.github.io/okio/2.x/okio/okio/-sink/index.html) that work like `InputStream` and `OutputStream`, but with some key differences:

java.io设计的一个优雅部分是流可以分层进行转换，如加密和压缩。Okio包括它自己的流类型，叫做Source和Sink，其工作方式类似于InputStream和OutputStream，但有一些关键的区别。


???+ 原文

        - **Timeouts.** The streams provide access to the timeouts of the underlying I/O mechanism. Unlike the `java.io` socket streams, both `read()` and `write()` calls honor timeouts.
        - **Easy to implement.** `Source` declares three methods: `read()`, `close()`, and `timeout()`. There are no hazards like `available()` or single-byte reads that cause correctness and performance surprises.
        - **Easy to use.** Although *implementations* of `Source` and `Sink` have only three methods to write, *callers* are given a rich API with the [`BufferedSource`](https://square.github.io/okio/2.x/okio/okio/-buffered-source/index.html) and [`BufferedSink`](https://square.github.io/okio/2.x/okio/okio/-buffered-sink/index.html) interfaces. These interfaces give you everything you need in one place.
        - **No artificial distinction between byte streams and char streams.** It’s all data. Read and write it as bytes, UTF-8 strings, big-endian 32-bit integers, little-endian shorts; whatever you want. No more `InputStreamReader`!
        - **Easy to test.** The `Buffer` class implements both `BufferedSource` and `BufferedSink` so your test code is simple and clear.

* 超时。流提供了对底层I/O机制的超时的访问。与java.io套接字流不同的是，read()和write()的调用都遵守超时。
* 易于实现。Source声明了三个方法：read(), close(), 和timeout()。没有像available()或单字节读取这样的危险，导致正确性和性能的意外。
* 易于使用。尽管Source和Sink的实现只有三个方法可以写，但调用者可以通过BufferedSource和BufferedSink接口获得丰富的API。这些接口在一个地方给你提供了你所需要的一切。
* 字节流和字符流之间没有人为的区分。这都是数据。以字节、UTF-8字符串、big-endian 32位整数、little-endian shorts的形式读写；任何你想要的。不再有InputStreamReader!
* 易于测试。Buffer类同时实现了BufferedSource和BufferedSink，所以你的测试代码简单而清晰。

???+ 原文

        Sources and sinks interoperate with `InputStream` and `OutputStream`. You can view any `Source` as an `InputStream`, and you can view any `InputStream` as a `Source`. Similarly for `Sink` and `OutputStream`.



超时。流提供了对底层I/O机制的超时的访问。与java.io套接字流不同的是，read()和write()的调用都遵守超时。 易于实现。Source声明了三个方法：read(), close(), 和timeout()。没有像available()或单字节读取这样的危险，导致正确性和性能的意外。 易于使用。尽管Source和Sink的实现只有三个方法可以写，但调用者可以通过BufferedSource和BufferedSink接口获得丰富的API。这些接口在一个地方给你提供了你所需要的一切。

## Presentations

[A Few “Ok” Libraries](https://www.youtube.com/watch?v=WvyScM_S88c) ([slides](https://speakerdeck.com/jakewharton/a-few-ok-libraries-droidcon-mtl-2015)): An introduction to Okio and three libraries written with it.

[Decoding the Secrets of Binary Data](https://www.youtube.com/watch?v=T_p22jMZSrk) ([slides](https://speakerdeck.com/swankjesse/decoding-the-secrets-of-binary-data-droidcon-nyc-2016)): How data encoding works and how Okio does it.

[Ok Multiplatform!](https://www.youtube.com/watch?v=Q8B4eDirgk0) ([slides](https://speakerdeck.com/swankjesse/ok-multiplatform)): How we changed Okio’s implementation language from Java to Kotlin.