


ActiveAndroid是采用活动记录([Active Record](http://zh.wikipedia.org/wiki/Active_Record))架构模式设计的适用于Android平台的轻量级ORM架构。


项目主页：https://github.com/pardom/ActiveAndroid


## 1.配置与初始化


首先在`AndroidManifest.xml`文件中配置数据库名称和数据库版本号。


```xml

<manifest ...>
    <application android:name="com.activeandroid.app.Application" ...>

        ...

        <meta-data android:name="AA_DB_NAME" android:value="Pickrand.db" />
        <meta-data android:name="AA_DB_VERSION" android:value="5" />
    </application>
</manifest>

```

* AA_DB_NAME：数据库名
* AA_DB_VERSION：数据库版本号，默认是1。

接着，在`AndroidManifest.xml`文件中指定application元素的name为com.activeandroid.app.Application，如果需要自定义Application，需要让你的Application对象继承自com.activeandroid.app.Application而不是android.app.Application。如果你需要继承其他库的Application，则需要在Application中初始化和处理ActiveAndroid。

```java

public class MyApplication extends SomeLibraryApplication {
    @Override
    public void onCreate() {
        super.onCreate();
        ActiveAndroid.initialize(this);
    }
    @Override
    public void onTerminate() {
        super.onTerminate();
        ActiveAndroid.dispose();
    }
}

```

## 2.创建Model

创建数据库模型非常简单，创建的模型必须继承Model类，这样你的类名就是你的表名。如果不想使用类名做表名，则可以使用@Table定义表名。@Column用于定义列名。Model类使用无参的构造函数，如果定义自己的构造函数必须定义一个无参的构造函数。

```java

@Table(name = "Categories")
public class Category extends Model {
    @Column(name = "Name")
    public String name;
}

@Table(name = "Items")
public class Item extends Model {
    @Column(name = "remote_id", unique = true, onUniqueConflict = Column.ConflictAction.REPLACE)
    public int remoteId;
    @Column(name = "Name")
    public String name;

    @Column(name = "Category")
    public Category category;

        public Item(){
                super();
        }
        public Item(String name, Category category){
                super();
                this.name = name;
                this.category = category;
        }
}

```


## 3.增删改查


### 3.1 插入

#### 3.1.1 单条插入

 保存一条记录，只需要创建一个模型的实例，并为每个字段指定值，然后调用save()方法。

```java

Category restaurants = new Category();
restaurants.name = "Restaurants";
restaurants.save();

```

#### 3.1.2批量插入

```java

ActiveAndroid.beginTransaction();
try {
        for (int i = 0; i < 100; i++) {
            Item item = new Item();
            item.name = "Example " + i;
            item.save();
        }
        ActiveAndroid.setTransactionSuccessful();
}
finally {
        ActiveAndroid.endTransaction();
}

```

### 3.2 更新

```java

new Update(Person.class).set("age=?," + "name=?", age, name).execute();

```

### 3.3 删除

调用delete()方法就可以删除一条记录，下面的例子中，通过id加载一个Item对象，并且删除他。

```java

Item item = Item.load(Item.class, 1);
item.delete();

```

也可以通过静态方法删除

```java

Item.delete(Item.class, 1);

```

也可以创建调用Delete对象删除


```java

new Delete().from(Item.class).where("Id = ?", 1).execute();

```

### 3.4 查询

查询一条

```java

public static Item getRandom(Category category) {
    return new Select()
        .from(Item.class)
        .where("Category = ?", category.getId())
        .orderBy("RANDOM()")
        .executeSingle();
}

```

查询所有


```java

public static List<Item> getAll(Category category) {
    return new Select()
        .from(Item.class)
        .where("Category = ?", category.getId())
        .orderBy("Name ASC")
        .execute();
}


```


## 4. 使用内容提供者

使用ActiveAndroid的ContentProvider，必须复写默认的标识列如下所示(默认标识列是ID)。


```java

@Table(name = "Items", id = BaseColumns._ID)
public class Item extends Model {...}

```

接着就可以使用`ContentProvider`

```java

   mySpinner.setAdapter(new SimpleCursorAdapter(getActivity(),
        android.R.layout.simple_expandable_list_item_1,
        null,
        new String[] { "MyProperty" },
        new int[] { android.R.id.text1 },
        0));

    getActivity().getSupportLoaderManager().initLoader(0, null, new LoaderCallbacks<Cursor>() {
        @Override
        public Loader<Cursor> onCreateLoader(int arg0, Bundle cursor) {
            return new CursorLoader(getActivity(),
                ContentProvider.createUri(MyEntityClass.class, null),
                null, null, null, null
            );
        }

        @Override
        public void onLoadFinished(Loader<Cursor> arg0, Cursor cursor) {
            ((SimpleCursorAdapter)mySpinner.getAdapter()).swapCursor(cursor);
        }

        @Override
        public void onLoaderReset(Loader<Cursor> arg0) {
            ((SimpleCursorAdapter)mySpinner.getAdapter()).swapCursor(null);
        }
    });

```

最后别忘了在`AndroidManifest.xml`中注册`provider`

```xml

<application ...>
    <provider android:authorities="com.example" android:exported="false" android:name="com.activeandroid.content.ContentProvider" />
    ...
</application>

```


### 源码分析


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


## 参考



<https://github.com/thecodepath/android_guides/wiki/ActiveAndroid-Guide>

<https://github.com/pardom/ActiveAndroid>
