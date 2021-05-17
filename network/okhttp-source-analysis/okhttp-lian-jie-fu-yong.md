# OkHttp连接复用

`OkHttp` 连接复用主要是通过 `RealConnectionPool` 来实现的，其内部定义了一个 `ConcurrentLinkedQueue` 来存储创建的 `RealConnection`。当获取连接时，优先判断 Call 中的 Connection 是否为空，如果不为空则直接复用，为空则从连接池中获取，当从连接池中获取不到的时候才调用 RealConnection 构造函数创建一个新的连接并添加到 `RealConnectionPool` 中。`RealConnectionPool` 提供了两个可配置的参数：最大空闲连接数和存活时长，这两个参数默认是 5 个和 5 分钟，当然我们也可以在`OKHttpClient` 中自己配置。当向 `RealConnectionPool` 中添加连接和连接变成空闲时，内部都会遍历队列中所有的连接，如果最大空闲连接数或者存活时长都大于设定的则移除存空闲时长最长的连接，该方法会多次执行，直到最大空闲连接数和存活时长都小于设定的值。

## ConnectionPool

```kotlin
class ConnectionPool internal constructor(
  internal val delegate: RealConnectionPool
) {
  constructor(
    maxIdleConnections: Int,
    keepAliveDuration: Long,
    timeUnit: TimeUnit
  ) : this(RealConnectionPool(//创建RealConnectionPool
      taskRunner = TaskRunner.INSTANCE, //获取TaskRunner
      maxIdleConnections = maxIdleConnections,
      keepAliveDuration = keepAliveDuration,
      timeUnit = timeUnit
  ))
  //最大空闲连接数5 最长空闲时间5分钟
  constructor() : this(5, 5, TimeUnit.MINUTES)

  /** Returns the number of idle connections in the pool. */
  fun idleConnectionCount(): Int = delegate.idleConnectionCount()

  /** Returns total number of connections in the pool. */
  fun connectionCount(): Int = delegate.connectionCount()

  /** Close and remove all idle connections in the pool. */
  fun evictAll() {
    delegate.evictAll()
  }
}
```

```kotlin
//OkHttpClient中使用默认构造函数
internal var connectionPool: ConnectionPool = ConnectionPool() 
```

## TaskRunner

```kotlin
companion object {
  @JvmField
  val INSTANCE = TaskRunner(RealBackend(threadFactory("$okHttpName TaskRunner", daemon = true)))
  val logger: Logger = Logger.getLogger(TaskRunner::class.java.name)
}
```

### newQueue\(\)

```kotlin
fun newQueue(): TaskQueue {
  val name = synchronized(this) { nextQueueName++ }
  return TaskQueue(this, "Q$name")
}
```

