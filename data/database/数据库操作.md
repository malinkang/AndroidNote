## SQlite使用


<h3 id="1.创建数据库">1.创建数据库</h3>

SQLiteDatabase对象是一个数据库对象。SQLiteOpenHelper是一个创建数据库的辅助类。SQLiteOpenHelper是一个抽象类，所以我们需要自已定义一个类来继承SQLiteOpenHelper。

下面我们来看下，SQliteOpenHelper的构造函数和相关方法。


构造函数
```java

  /**
     * Create a helper object to create, open, and/or manage a database.
     * This method always returns very quickly.  The database is not actually
     * created or opened until one of {@link #getWritableDatabase} or
     * {@link #getReadableDatabase} is called.
     *
     * @param context to use to open or create the database
     * @param name of the database file, or null for an in-memory database
     * @param factory to use for creating cursor objects, or null for the default
     * @param version number of the database (starting at 1); if the database is older,
     *     {@link #onUpgrade} will be used to upgrade the database; if the database is
     *     newer, {@link #onDowngrade} will be used to downgrade the database
     */
    public SQLiteOpenHelper(Context context, String name, CursorFactory factory, int version) {
        this(context, name, factory, version, null);
    }
```
name为数据库的名字，version为数据库的版本号，从1开始。

onCreate方法是一个抽象方法，当第一次创建数据库时将会被调用。

onUpgrade方法，也是一个抽象方法，当数据库需要删除表，或者添加表时，修改版本号就会调用此方法。

getReadableDatabase和getWritableDatabase两个方法都是用来创建或者打开一个数据库，返回一个SQLiteDatabase对象。

```java
/**
 * Created by malinkang on 15/4/3.
 */
public class DatabaseHelper extends SQLiteOpenHelper {

    private final static String DATABASE_NAME="malinkang.db";

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, 2);
    }


    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE Person(Name TEXT)");

    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("ALTER TABLE Person ADD Phone TEXT");
    }
}
```

<h3 id="2.插入数据">2.插入数据</h3>

```java
        ContentValues values=new ContentValues();
        values.put("Name","malinkang");
        values.put("Phone","13333333333");
        database.insert("Person",null,values);
```











