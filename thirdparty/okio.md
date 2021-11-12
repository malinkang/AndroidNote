## 核心类



![image-20211112153532976](https://malinkang.cn/images/jvm/202111121535376.png)



* `BufferedSource`类似`InputStream`负责读取数据。
* `BufferedSink`类似`OutputStream`负责写入数据。

## 读取分析

读取代码示例：

```kotlin
fun readLines(file: File) {
  file.source().use { fileSource ->
    fileSource.buffer().use { bufferedFileSource ->
      while (true) {
        val line = bufferedFileSource.readUtf8Line() ?: break
        if ("square" in line) {
          println(line)
        }
      }
    }
  }
}
```

### 流程图

![image-20211112174416076](https://malinkang.cn/images/jvm/202111121744513.png)

### source()

```kotlin
//扩展函数获取Source对象
fun File.source(): Source = InputStreamSource(inputStream(), Timeout.NONE)
public inline fun File.inputStream(): FileInputStream {
    return FileInputStream(this)
}
```

### buffer()

```kotlin
fun Source.buffer(): BufferedSource = RealBufferedSource(this)
```

```kotlin
//RealBufferedSource
override fun readUtf8Line(): String? = commonReadUtf8Line()
```

```kotlin
//调用扩展函数commonReadUtf8Line
internal inline fun RealBufferedSource.commonReadUtf8Line(): String? {
  //获取\n的索引
  val newline = indexOf('\n'.code.toByte())
  return if (newline == -1L) {
    if (buffer.size != 0L) {
      readUtf8(buffer.size)
    } else {
      null
    }
  } else {
    //调用Buffer的readUtf8Line
    buffer.readUtf8Line(newline)
  }
}
```

### indexOf()

```kotlin
//indexOf方法
override fun indexOf(b: Byte): Long = indexOf(b, 0L, Long.MAX_VALUE)
override fun indexOf(b: Byte, fromIndex: Long): Long = indexOf(b, fromIndex, Long.MAX_VALUE)
override fun indexOf(b: Byte, fromIndex: Long, toIndex: Long): Long =
  commonIndexOf(b, fromIndex, toIndex)
```

### commonIndexOf()

```kotlin
internal inline fun RealBufferedSource.commonIndexOf(b: Byte, fromIndex: Long, toIndex: Long): Long {
  var fromIndex = fromIndex
  check(!closed) { "closed" }
  require(fromIndex in 0L..toIndex) { "fromIndex=$fromIndex toIndex=$toIndex" }

  while (fromIndex < toIndex) {
    //调用buffer的indexOf
    val result = buffer.indexOf(b, fromIndex, toIndex)
    if (result != -1L) return result

    // The byte wasn't in the buffer. Give up if we've already reached our target size or if the
    // underlying stream is exhausted.
    val lastBufferSize = buffer.size
    if (lastBufferSize >= toIndex || source.read(buffer, Segment.SIZE.toLong()) == -1L) return -1L

    // Continue the search from where we left off.
    fromIndex = maxOf(fromIndex, lastBufferSize)
  }
  return -1L
}
```

### Buffer的创建

```kotlin
@JvmField val bufferField = Buffer()
override val buffer: Buffer
  inline get() = bufferField
```

### readUtf8Line()

```kotlin
//Buffer
override fun readUtf8Line(): String? = commonReadUtf8Line()
```

### commonReadUtf8Line()

```kotlin
internal inline fun Buffer.commonReadUtf8Line(): String? {
  //查找每一行\n的索引
  val newline = indexOf('\n'.code.toByte())
  return when {
    newline != -1L -> readUtf8Line(newline)
    size != 0L -> readUtf8(size)
    else -> null
  }
}
```

### readUtf8()

```kotlin
override fun readUtf8() = readString(size, Charsets.UTF_8)
```

### readString()

```kotlin
override fun readString(byteCount: Long, charset: Charset): String {
  require(byteCount >= 0 && byteCount <= Integer.MAX_VALUE) { "byteCount: $byteCount" }
  if (size < byteCount) throw EOFException()
  if (byteCount == 0L) return ""

  val s = head!!
  if (s.pos + byteCount > s.limit) {
    // If the string spans multiple segments, delegate to readBytes().
    //调用readByteArray
    return String(readByteArray(byteCount), charset)
  }

  val result = String(s.data, s.pos, byteCount.toInt(), charset)
  s.pos += byteCount.toInt()
  size -= byteCount

  if (s.pos == s.limit) {
    head = s.pop()
    SegmentPool.recycle(s)
  }

  return result
}
```

### commonReadByteArray()

```kotlin
internal inline fun Buffer.commonReadByteArray(byteCount: Long): ByteArray {
  require(byteCount >= 0 && byteCount <= Int.MAX_VALUE) { "byteCount: $byteCount" }
  if (size < byteCount) throw EOFException()
  //创建字节数组
  val result = ByteArray(byteCount.toInt())
  readFully(result)
  return result
}
```

### commonReadFully()

```kotlin
internal inline fun Buffer.commonReadFully(sink: ByteArray) {
  var offset = 0
  while (offset < sink.size) {
    val read = read(sink, offset, sink.size - offset)
    if (read == -1) throw EOFException()
    offset += read
  }
}
```

### read()

```kotlin
override fun read(sink: ByteArray, offset: Int, byteCount: Int): Int =
 commonRead(sink, offset, byteCount)
```

### commonRead()

```kotlin
internal inline fun Buffer.commonRead(sink: ByteArray, offset: Int, byteCount: Int): Int {
  checkOffsetAndCount(sink.size.toLong(), offset.toLong(), byteCount.toLong())

  val s = head ?: return -1
  val toCopy = minOf(byteCount, s.limit - s.pos)
  s.data.copyInto(
    destination = sink, destinationOffset = offset, startIndex = s.pos, endIndex = s.pos + toCopy
  )

  s.pos += toCopy
  size -= toCopy.toLong()

  if (s.pos == s.limit) {
    head = s.pop()
    SegmentPool.recycle(s)
  }

  return toCopy
}
```

## 写入分析

```kotlin
fun writeEnv(file: File) {
  file.sink().buffer().use { sink ->
    for ((key, value) in System.getenv()) {
      sink.writeUtf8(key)
      sink.writeUtf8("=")
      sink.writeUtf8(value)
      sink.writeUtf8("\n")
    }
  }
}
```

![image-20211112181419165](https://malinkang.cn/images/jvm/202111121814757.png)

### sink()

```kotlin
fun File.sink(append: Boolean = false): Sink = FileOutputStream(this, append).sink()
fun OutputStream.sink(): Sink = OutputStreamSink(this, Timeout())
```

### buffer()

```kotlin
fun Sink.buffer(): BufferedSink = RealBufferedSink(this)
```

### writeUtf8()

```kotlin
override fun writeUtf8(string: String) = commonWriteUtf8(string)
```

### commonWriteUtf8()

```kotlin
internal inline fun RealBufferedSink.commonWriteUtf8(string: String): BufferedSink {
  check(!closed) { "closed" }
  buffer.writeUtf8(string)
  return emitCompleteSegments()
}
```

### write()

```kotlin
actual override fun writeUtf8(string: String): Buffer = writeUtf8(string, 0, string.length)
actual override fun writeUtf8(string: String, beginIndex: Int, endIndex: Int): Buffer =
    commonWriteUtf8(string, beginIndex, endIndex)
```

### commonWriteUtf8()

```kotlin
internal inline fun Buffer.commonWriteUtf8(string: String, beginIndex: Int, endIndex: Int): Buffer {
  require(beginIndex >= 0) { "beginIndex < 0: $beginIndex" }
  require(endIndex >= beginIndex) { "endIndex < beginIndex: $endIndex < $beginIndex" }
  require(endIndex <= string.length) { "endIndex > string.length: $endIndex > ${string.length}" }

  // Transcode a UTF-16 Java String to UTF-8 bytes.
  var i = beginIndex
  while (i < endIndex) {
    var c = string[i].code

    when {
      c < 0x80 -> {
        val tail = writableSegment(1)
        val data = tail.data
        val segmentOffset = tail.limit - i
        val runLimit = minOf(endIndex, Segment.SIZE - segmentOffset)

        // Emit a 7-bit character with 1 byte.
        data[segmentOffset + i++] = c.toByte() // 0xxxxxxx

        // Fast-path contiguous runs of ASCII characters. This is ugly, but yields a ~4x performance
        // improvement over independent calls to writeByte().
        while (i < runLimit) {
          c = string[i].code
          if (c >= 0x80) break
          data[segmentOffset + i++] = c.toByte() // 0xxxxxxx
        }

        val runSize = i + segmentOffset - tail.limit // Equivalent to i - (previous i).
        tail.limit += runSize
        size += runSize.toLong()
      }

      c < 0x800 -> {
        // Emit a 11-bit character with 2 bytes.
        val tail = writableSegment(2)
        /* ktlint-disable no-multi-spaces */
        tail.data[tail.limit    ] = (c shr 6          or 0xc0).toByte() // 110xxxxx
        tail.data[tail.limit + 1] = (c       and 0x3f or 0x80).toByte() // 10xxxxxx
        /* ktlint-enable no-multi-spaces */
        tail.limit += 2
        size += 2L
        i++
      }

      c < 0xd800 || c > 0xdfff -> {
        // Emit a 16-bit character with 3 bytes.
        val tail = writableSegment(3)
        /* ktlint-disable no-multi-spaces */
        tail.data[tail.limit    ] = (c shr 12          or 0xe0).toByte() // 1110xxxx
        tail.data[tail.limit + 1] = (c shr  6 and 0x3f or 0x80).toByte() // 10xxxxxx
        tail.data[tail.limit + 2] = (c        and 0x3f or 0x80).toByte() // 10xxxxxx
        /* ktlint-enable no-multi-spaces */
        tail.limit += 3
        size += 3L
        i++
      }

      else -> {
        // c is a surrogate. Make sure it is a high surrogate & that its successor is a low
        // surrogate. If not, the UTF-16 is invalid, in which case we emit a replacement
        // character.
        val low = (if (i + 1 < endIndex) string[i + 1].code else 0)
        if (c > 0xdbff || low !in 0xdc00..0xdfff) {
          writeByte('?'.code)
          i++
        } else {
          // UTF-16 high surrogate: 110110xxxxxxxxxx (10 bits)
          // UTF-16 low surrogate:  110111yyyyyyyyyy (10 bits)
          // Unicode code point:    00010000000000000000 + xxxxxxxxxxyyyyyyyyyy (21 bits)
          val codePoint = 0x010000 + (c and 0x03ff shl 10 or (low and 0x03ff))

          // Emit a 21-bit character with 4 bytes.
          val tail = writableSegment(4)
          /* ktlint-disable no-multi-spaces */
          tail.data[tail.limit    ] = (codePoint shr 18          or 0xf0).toByte() // 11110xxx
          tail.data[tail.limit + 1] = (codePoint shr 12 and 0x3f or 0x80).toByte() // 10xxxxxx
          tail.data[tail.limit + 2] = (codePoint shr  6 and 0x3f or 0x80).toByte() // 10xxyyyy
          tail.data[tail.limit + 3] = (codePoint        and 0x3f or 0x80).toByte() // 10yyyyyy
          /* ktlint-enable no-multi-spaces */
          tail.limit += 4
          size += 4L
          i += 2
        }
      }
    }
  }

  return this
}
```

### emitCompleteSegments()

```kotlin
override fun emitCompleteSegments() = commonEmitCompleteSegments()
```

### commonEmitCompleteSegments()

```kotlin
internal inline fun RealBufferedSink.commonEmitCompleteSegments(): BufferedSink {
  check(!closed) { "closed" }
  val byteCount = buffer.completeSegmentByteCount()
  if (byteCount > 0L) sink.write(buffer, byteCount)
  return this
}
```

### completeSegmentByteCount()

```kotlin
actual fun completeSegmentByteCount(): Long = commonCompleteSegmentByteCount()
```

### commonCompleteSegmentByteCount()

```kotlin
internal inline fun Buffer.commonCompleteSegmentByteCount(): Long {
  var result = size
  if (result == 0L) return 0L

  // Omit the tail if it's still writable.
  val tail = head!!.prev!!
  if (tail.limit < Segment.SIZE && tail.owner) {
    result -= (tail.limit - tail.pos).toLong()
  }

  return result
}
```

### write()

```kotlin
override fun write(source: Buffer, byteCount: Long) {
  checkOffsetAndCount(source.size, 0, byteCount)
  var remaining = byteCount
  while (remaining > 0) {
    timeout.throwIfReached()
    val head = source.head!!
    val toCopy = minOf(remaining, head.limit - head.pos).toInt()
    out.write(head.data, head.pos, toCopy)

    head.pos += toCopy
    remaining -= toCopy
    source.size -= toCopy

    if (head.pos == head.limit) {
      source.head = head.pop()
      SegmentPool.recycle(head)
    }
  }
}
```



## 参考

* [Okio 源码解析：轻量而高效的 I/O 库](https://juejin.cn/post/6844904037196775438)
* [Okio源码分析](https://www.cnblogs.com/huansky/p/14323085.html)

