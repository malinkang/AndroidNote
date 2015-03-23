
### 1.程序入口

程序入口是ActiveAndroid类的initialze方法

```java

	public static void initialize(Configuration configuration, boolean loggingEnabled) {
		// Set logging enabled first
		setLoggingEnabled(loggingEnabled);
		Cache.initialize(configuration);
	}

```

初始化过程创建了一个 `Configuration`，并将`Configuration`传递给Cache进行初始化。

Configuration类主要从项目的清单文件中获取数据库名字和版本等相关信息。

在Cache的`initialize`方法中创建了一个`ModelInfo`对象和一个`DatabaseHelper`对象。

```java
public static synchronized void initialize(Configuration configuration) {
...
		sContext = configuration.getContext();
		sModelInfo = new ModelInfo(configuration);
		sDatabaseHelper = new DatabaseHelper(configuration);
 ...
	}
```
`ModelInfo` 类通过`scanForModel`扫描应用程序的源码，获得所有Model的子类，并且获取这些Model的TableInfo，存储在map集合mTableInfos中。




