  ???+ 原文  
    
    We’ve written some recipes that demonstrate how to solve common problems with Okio. Read through them to learn about how everything works together. Cut-and-paste these examples freely; that’s what they’re for.

我们写了一些菜谱，演示如何用Okio解决常见问题。阅读它们，了解一切是如何运作的。自由地剪切和粘贴这些例子；这就是它们的用处。

???+ 原文

    These recipes work on all platforms: Java, Android, Kotlin/Native, and Kotlin/JS. See [java.io Recipes](https://square.github.io/okio/java_io_recipes/) for samples that integrate Java APIs.

这些配方可以在所有平台上使用。Java、Android、Kotlin/Native和Kotlin/JS。请参阅java.io Recipes，了解集成了Java APIs的样本。

## 逐行读取一个文本文件

???+ 原文

    Use FileSystem.source(Path) to open a source stream to read a file. The returned Source interface is very small and has limited uses. Instead we wrap the source with a buffer. This has two benefits:

使用FileSystem.source(Path)打开一个源流以读取文件。返回的Source接口非常小，用途有限。相反，我们用一个缓冲区来包装源。这有两个好处。

> - **It makes the API more powerful.** Instead of the basic methods offered by `Source`, `BufferedSource` has dozens of methods to address most common problems concisely.
> - **It makes your program run faster.** Buffering allows Okio to get more done with fewer I/O operations.

* **它使API更加强大**。与Source提供的基本方法不同，BufferedSource有几十种方法可以简洁地解决大多数常见问题。

* **它让你的程序运行得更快**。缓冲使Okio可以用较少的I/O操作完成更多的工作。

???+ 原文

    Each `Source` that is opened needs to be closed. The code that opens the stream is responsible for making sure it is closed.

每个被打开的Source都需要被关闭。打开流的代码要负责确保它被关闭。

```java
public void readLines(Path path) throws IOException {
  try (Source fileSource = FileSystem.SYSTEM.source(path);
       BufferedSource bufferedFileSource = Okio.buffer(fileSource)) {

    while (true) {
      String line = bufferedFileSource.readUtf8Line();
      if (line == null) break;

      if (line.contains("square")) {
        System.out.println(line);
      }
    }

  }
}
```
???+ 原文

    The `readUtf8Line()` API reads all of the data until the next line delimiter – either `\n`, `\r\n`, or the end of the file. It returns that data as a string, omitting the delimiter at the end. When it encounters empty lines the method will return an empty string. If there isn’t any more data to read it will return null.

`readUtf8Line()`API读取了所有的数据，直到下一个分界符--或者是 \n, \r\n, 或者是文件的结尾。它以字符串的形式返回数据，省略最后的分界符。当它遇到空行时，该方法将返回一个空字符串。如果没有更多的数据可以读取，它将返回null。

```
public void readLines(Path path) throws IOException {
  try (BufferedSource source = Okio.buffer(FileSystem.SYSTEM.source(path))) {
    for (String line; (line = source.readUtf8Line()) != null; ) {
      if (line.contains("square")) {
        System.out.println(line);
      }
    }
  }
}
```
???+ 原文

    The `readUtf8Line()` method is suitable for parsing most files. For certain use-cases you may also consider `readUtf8LineStrict()`. It is similar but it requires that each line is terminated by `\n` or `\r\n`. If it encounters the end of the file before that it will throw an `EOFException`. The strict variant also permits a byte limit to defend against malformed input.

readUtf8Line()方法适用于解析大多数文件。对于某些使用情况，你也可以考虑readUtf8LineStrict()。它与此类似，但它要求每一行以 \n 或 \r\n 结尾。如果它在这之前遇到了文件的结尾，它将抛出一个EOFException。严格的变体还允许有一个字节限制，以防御畸形的输入。

## 写入一个文本文件

???+ 原文

    Above we used a `Source` and a `BufferedSource` to read a file. To write, we use a `Sink` and a `BufferedSink`. The advantages of buffering are the same: a more capable API and better performance.

上面我们用一个Source和一个BufferedSource来读一个文件。写入时，我们使用一个Sink和一个BufferedSink。缓冲的优点是一样的：一个更有能力的API和更好的性能。

```java
public void writeEnv(Path path) throws IOException {
  try (Sink fileSink = FileSystem.SYSTEM.sink(path);
       BufferedSink bufferedSink = Okio.buffer(fileSink)) {

    for (Map.Entry<String, String> entry : System.getenv().entrySet()) {
      bufferedSink.writeUtf8(entry.getKey());
      bufferedSink.writeUtf8("=");
      bufferedSink.writeUtf8(entry.getValue());
      bufferedSink.writeUtf8("\n");
    }

  }
}
```
???+ 原文

    There isn’t an API to write a line of input; instead we manually insert our own newline character. Most programs should hardcode `"\n"` as the newline character. In rare situations you may use `System.lineSeparator()` instead of `"\n"`: it returns `"\r\n"` on Windows and `"\n"` everywhere else.

没有一个API来写输入行，而是我们手动插入我们自己的换行符。大多数程序应该硬编码"\n "作为换行符。在极少数情况下，你可以使用System.lineSeparator()代替"\n"：它在Windows上返回"\r\n"，在其他地方返回"\n"。

```java
public void writeEnv(Path path) throws IOException {
  try (BufferedSink sink = Okio.buffer(FileSystem.SYSTEM.sink(path))) {
    for (Map.Entry<String, String> entry : System.getenv().entrySet()) {
      sink.writeUtf8(entry.getKey())
        .writeUtf8("=")
        .writeUtf8(entry.getValue())
        .writeUtf8("\n");
    }
  }
}
```

