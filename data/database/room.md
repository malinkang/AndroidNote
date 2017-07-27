

### 介绍


Room是Google提供的一个ORM库。Room提供了三个主要的组件：

* @Database：@Database用来注解类，并且注解的类必须是继承自`RoomDatabase`的抽象类。该类主要作用是创建数据库和创建Daos（data access objects，数据访问对象）。
* @Entity：@Entity用来注解实体类，@Database通过`entities`属性引用被`@Entity`注解的类，并利用该类的所有字段作为表的列名来创建表。
* @Dao：@Dao用来注解一个接口或者抽象方法，该类的作用是提供访问数据库的方法。在使用@Database注解的类中必须定一个不带参数的方法，这个方法返回使用@Dao注解的类。


### 使用Room

* 添加google maven 仓库

```groovy
allprojects {
    repositories {
        jcenter()
        maven { url 'https://maven.google.com' }
    }
}

```

* 添加Room依赖

```groovy
compile "android.arch.persistence.room:runtime:1.0.0-alpha5"
annotationProcessor "android.arch.persistence.room:compiler:1.0.0-alpha5"
```

为了方便调试，我们添加`Android-Debug-Database`的依赖。

```java
debugCompile 'com.amitshekhar.android:debug-db:1.0.1'
```

下面介绍一个简单的例子：

User.java

```java
@Entity
public class User {
    @PrimaryKey
    private int uid;

    @ColumnInfo(name = "first_name")
    private String firstName;

    @ColumnInfo(name = "last_name")
    private String lastName;

    // Getters and setters are ignored for brevity,
    // but they're required for Room to work.
}
```
UserDao.java

```java 
@Dao
public interface UserDao {
    @Query("SELECT * FROM user")
    List<User> getAll();

    @Query("SELECT * FROM user WHERE uid IN (:userIds)")
    List<User> loadAllByIds(int[] userIds);

    @Query("SELECT * FROM user WHERE first_name LIKE :first AND "
           + "last_name LIKE :last LIMIT 1")
    User findByName(String first, String last);

    @Insert
    void insertAll(User... users);

    @Delete
    void delete(User user);
}
```
AppDatabase.java

```java
@Database(entities = {User.class}, version = 1)
public abstract class AppDatabase extends RoomDatabase {
    public abstract UserDao userDao();
}
```

获取AppDatabase实例：

```java
AppDatabase db = Room.databaseBuilder(getApplicationContext(),
        AppDatabase.class, "user.db").build();
```

每次创建AppDatabase实例都会产生比较大的开销，所以应该将AppDatabase设计成单例的。


```java
@Database(entities = {User.class}, version = 1)
public abstract class AppDatabase extends RoomDatabase {

  private static AppDatabase INSTANCE;
  private static final Object sLock = new Object();
  public abstract UserDao userDao();

  public static AppDatabase getInstance(Context context) {
    synchronized (sLock) {
      if (INSTANCE == null) {
        INSTANCE =
            Room.databaseBuilder(context.getApplicationContext(), AppDatabase.class, "user.db")
                .build();
      }
      return INSTANCE;
    }
  }
}
```

Room不允许在主线程中访问数据库，除非在buid的时候使用`allowMainThreadQueries()`方法

```java
 Room.databaseBuilder(context.getApplicationContext(), AppDatabase.class, "user.db")
 .allowMainThreadQueries()
 .build();

```

### Entity

Room会利用@Entity注解的类的所有字段来创建表的列，如果某些字段不希望存储的话，使用`@Ignore`注解该字段即可。

```java
@Entity
class User {
    @PrimaryKey
    public int id;

    public String firstName;
    public String lastName;

    @Ignore
    Bitmap picture;
}
```
默认情况下，Room使用类名作为表名，使用字段名作为列名。我们可以通过@Entity的tableName属性定义自己的表名，通过@ColumnInfo的name属性定义自己的列名。

```java
@Entity(tableName = "users")
class User {
    @PrimaryKey
    public int id;

    @ColumnInfo(name = "first_name")
    public String firstName;

    @ColumnInfo(name = "last_name")
    public String lastName;

    @Ignore
    Bitmap picture;
}

```

#### 主键

每一个实体至少定义一个字段作为主键。可以将@PrimaryKey的autoGenerate属性设置为true来设置自动id。如果实体有一个复合的主键，可以使用 @Entity的primaryKeys属性来指定主键。

```java
@Entity(primaryKeys = {"firstName", "lastName"})
class User {
    public String firstName;
    public String lastName;

    @Ignore
    Bitmap picture;
}
```

#### 索引和唯一性

为数据库添加索引可以加快数据的查询。在Room中可以通过@Entity的indices属性添加索引。

```java
@Entity(indices = {@Index("name"),
        @Index(value = {"last_name", "address"})})
class User {
    @PrimaryKey
    public int id;

    public String firstName;
    public String address;

    @ColumnInfo(name = "last_name")
    public String lastName;

    @Ignore
    Bitmap picture;
}
```

有时候，需要确保某个字段或者多个字段形成的组唯一。可以通过将@Index的unique属性设置为true，来确保唯一性。在下面的例子中，防止first_name和last_name这两列同时具有相同的数据。

```java
@Entity(indices = {@Index(value = {"first_name", "last_name"},
        unique = true)})
class User {
    @PrimaryKey
    public int id;

    @ColumnInfo(name = "first_name")
    public String firstName;

    @ColumnInfo(name = "last_name")
    public String lastName;

    @Ignore
    Bitmap picture;
}

```

#### 关系

SQLite是关系型数据库，你可以指定不同对象之间的关系。尽管大多数ORM类库允许对象之间互相引用，但Room明确禁止这一点。

尽管不能使用直接关系，Room仍然两个实体之间定义外键。

例如，有另外一个实体Book，你可以使用`@ForeignKey`注解定义和User之间的关系。

```java
@Entity(foreignKeys = @ForeignKey(entity = User.class,
                                  parentColumns = "id",
                                  childColumns = "user_id"))
class Book {
    @PrimaryKey
    public int bookId;

    public String title;

    @ColumnInfo(name = "user_id")
    public int userId;
}
```

外键非常有用，因为当引用的实体发生改变时，你可以指定如何处理。例如，如果`@ForeignKey`的onDelete属性值为CASCADE，如果删除user，所有具有相同userId的book会被全部删除。

#### 嵌套对象

假设我们的User实体中新加了下面这些字段：

```java
public class User {

  @PrimaryKey(autoGenerate = true) public int id;
  public String firstName;
  public String lastName;
  //
  @Ignore Bitmap picture;
  public String street;
  public String state;
  public String city;
  @ColumnInfo(name = "post_code")
  public int postCode;
}
```
创建的表

这样看起来一点也不面向对象，我们完全可以将新加的字段封装成一个Address对象。

```java
class Address {
    public String street;
    public String state;
    public String city;

    @ColumnInfo(name = "post_code")
    public int postCode;
}
```
Room提供了一个注解@Embedded，允许在一个实体中嵌入另外一个实体，创建的表使用的是当前实体和嵌入实体的所有字段，所以我们可以修改上面的User实体

```java
@Entity
class User {
    @PrimaryKey
    public int id;

    public String firstName;

    @Embedded
    public Address address;
}
```

当一个类中嵌套多个类，并且这些类具有相同的字段，则需要调用@Embedded的属性prefix 添加一个前缀，生成的列名为`前缀+列名`

```java
public class User {
  @PrimaryKey(autoGenerate = true) public int id;
  public String firstName;
  public String lastName;
  @Embedded(prefix = "first")
  Address address;
  @Embedded(prefix = "second")
  AddressTwo addressTwo;
}
```
该例中将会创建firstStreet，firstState...secondStreet，secondState...等列。


### 数据访问对象（DAOs）

Dao类是Room最重要的组件，该类主要提供操作数据库的方法。

#### 便利方法

Room提供了多个便利方法来操作数据库。

##### 插入

当我们创建一个Dao方法，并使用@Insert注解，Room将把所有的参数在一次事物中插入到数据库中。

```java
@Dao
public interface MyDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    public void insertUsers(User... users);

    @Insert
    public void insertBothUsers(User user1, User user2);

    @Insert
    public void insertUsersAndFriends(User user, List<User> friends);
}
```
onConflict用来指定当发生冲突是的策略。比如将@Index的unique属性设置为true，当产生冲突时，默认情况下为`OnConflictStrategy.ABORT`会导致崩溃，这里设置为`OnConflictStrategy.REPLACE`，当发生冲突时替换老数据。关于其他的冲突策略可以阅读[SQL As Understood By SQLite](https://sqlite.org/lang_conflict.html)进行了解。

除了可以将@Insert注解的方法返回值设置为void外，还可以将方法的返回值设置为long, Long, Long[] 或者 List<Long>。如果参数是单个实体，返回long或者Long，该值是插入新条目的rowId。如果参数是集合或者多个参数时，则返回Long[]或者List<Long>

##### 更新

使用@Update注解方法，可以使用参数实体的值更新主键值和参数实体的主键相同的行。

```java
@Dao
public interface MyDao {
    @Update
    public void updateUsers(User... users);
}
```
@Update注解的方法还可以返回int，表示受影响的行数。

##### 删除


使用@Delete注解方法，可以删除主键值和参数实体的主键相同的行。

```java
@Dao
public interface MyDao {
    @Delete
    public void deleteUsers(User... users);
}
```
@Delete注解的方法还可以返回int，表示删除的行数。

#### 使用@Query的方法

@Query的值为SQL语句，可以被SQLite执行。@Query支持查询语句，删除语句和更新语句，不支持插入语句。

```java
@Dao
public interface MyDao {
    @Query("SELECT * FROM user")
    public User[] loadAllUsers();
}
```

##### 传入参数

Room会在编译时进行检查，当代码中包含语法错误，或者表不存在，Room将在编译时出现错误信息。

如果我们想获取指定id的用户，该怎么办。@Query的value中支持添加绑定参数，该参数必须找到与之匹配的方法参数，并取得该方法参数的值。
```java
@Dao
public interface MyDao {
//传入单个参数
    @Query("SELECT * FROM user WHERE age > :minAge")
    public User[] loadAllUsersOlderThan(int minAge);
}
```
在这个例子中绑定参数`:minAge`与方法参数minAge相匹配。

而且允许传入多个参数，或者多次引用相同的参数

```java
@Dao
public interface MyDao {
    @Query("SELECT * FROM user WHERE age BETWEEN :minAge AND :maxAge")
    public User[] loadAllUsersBetweenAges(int minAge, int maxAge);

    @Query("SELECT * FROM user WHERE first_name LIKE :search "
           + "OR last_name LIKE :search")
    public List<User> findUserWithName(String search);
}

```

此外，Room还允许传入一个参数集合

```java
@Dao
public interface MyDao {
    @Query("SELECT first_name, last_name FROM user WHERE region IN (:regions)")
    public List<NameTuple> loadUsersFromRegions(List<String> regions);
}

```
 
##### 返回列的子集

多数情况下，你只需要获取实体的少数几个字段。例如，你的ui可能只展示用户的名和姓，而不是每个用户的详细信息。通过只获取需要的列，可以节省资源，并且查询速度更快。

只要可以将查询的结果映射到返回的对象上，Room允许返回任何java对象。例如，可以创建如下java对象来获取用户的名和姓。

```java
public class NameTuple {
    @ColumnInfo(name="first_name")
    public String firstName;

    @ColumnInfo(name="last_name")
    public String lastName;
}
```

在查询方法中使用该对象

```java
@Dao
public interface MyDao {
    @Query("SELECT first_name, last_name FROM user")
    public List<NameTuple> loadFullName();
}
```

如果返回的列`NameTuple`不存在对应的字段，编译时会出现警告。

##### RxJava

Room也可以返回RxJava2的`Publisher`和`Flowable`对象。要使用这个功能需要在gradle中添加`android.arch.persistence.room:rxjava2`.

```java
@Dao
public interface MyDao {
    @Query("SELECT * from user where id = :id LIMIT 1")
    public Flowable<User> loadUserById(int id);
}
```

##### 直接返回Cursor

Room还可以直接返回Cursor对象。

```java
@Dao
public interface MyDao {
    @Query("SELECT * FROM user WHERE age > :minAge LIMIT 5")
    public Cursor loadRawUsersOlderThan(int minAge);
}
```

##### 查询多个表

```java
@Dao
public interface MyDao {
    @Query("SELECT * FROM book "
           + "INNER JOIN loan ON loan.book_id = book.id "
           + "INNER JOIN user ON user.id = loan.user_id "
           + "WHERE user.name LIKE :userName")
   public List<Book> findBooksBorrowedByNameSync(String userName);
}
```

### 使用类型转换器

Room支持字符串和基本数据类型以及他们的包装类，但是如果不是基本数据类型，该如何存储呢？比如我们的User对象有个Date类型的字段birthday，我们该如何存储。Room提供了`@TypeConverter`可以将不可存储的类型转换为Room可以存储的类型。

```java

public class Converters {
    @TypeConverter
    public static Date fromTimestamp(Long value) {
        return value == null ? null : new Date(value);
    }

    @TypeConverter
    public static Long dateToTimestamp(Date date) {
        return date == null ? null : date.getTime();
    }
}
```
上面的例子定义了两个方法，Room可以调用`dateToTimestamp`方法将Date转化为Long类型进行存储，也可以在查询的时候将获取的Long转换为Date对象。

为了让Room调用该转换器，使用@TypeConverters注解将转换器添加到AppDatabase上。

```java
@Database(entities = {User.java}, version = 1)
@TypeConverters({Converter.class})
public abstract class AppDatabase extends RoomDatabase {
    public abstract UserDao userDao();
}

```

### 数据库升级

在app发布以后，我们可能会新增表或者修改原来表的结构，这就需要升级数据库。Room提供了 Migration 类用于迁移数据库，每一个 Migration 需要在构造函数里指定开始版本和结束版本。在运行时，Room会按照提供版本的顺序顺序执行每个Migration的`migrate()`方法，将数据库升级到最新的版本。

```java
Room.databaseBuilder(getApplicationContext(), MyDb.class, "database-name")
        .addMigrations(MIGRATION_1_2, MIGRATION_2_3).build();

static final Migration MIGRATION_1_2 = new Migration(1, 2) {
    @Override
    public void migrate(SupportSQLiteDatabase database) {
        database.execSQL("CREATE TABLE `Fruit` (`id` INTEGER, "
                + "`name` TEXT, PRIMARY KEY(`id`))");
    }
};

static final Migration MIGRATION_2_3 = new Migration(2, 3) {
    @Override
    public void migrate(SupportSQLiteDatabase database) {
        database.execSQL("ALTER TABLE Book "
                + " ADD COLUMN pub_year INTEGER");
    }
};
```

### 参考
* [Room Persistence Library](https://developer.android.com/topic/libraries/architecture/room.html#db-migration)
* [Room 🔗 RxJava](https://medium.com/google-developers/room-rxjava-acb0cd4f3757)
* [7 Steps To Room](https://medium.com/google-developers/7-steps-to-room-27a5fe5f99b2)
* [Understanding migrations with Room](https://medium.com/google-developers/understanding-migrations-with-room-f01e04b07929)
