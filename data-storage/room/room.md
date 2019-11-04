# 使用Room将数据保存在本地数据库中

Room在SQLite上提供了一个抽象层，以允许流畅的数据库访问，同时利用SQLite的全部功能。

处理大量数据的应用程序可以从本地持久存储这些数据中受益匪浅。最常见的用例是缓存相关数据。这样，当设备无法访问网络时，用户仍可以在脱机时浏览该内容。设备重新联机后，任何由用户的内容更改都将同步到服务器。

由于Room为您解决了这些问题，因此我们**强烈建议您**使用Room而不是SQLite。但是，如果您希望直接使用SQLite API，请阅读[使用SQLite保存数据](https://developer.android.com/training/data-storage/sqlite.html)。

Room包含3个主要组成部分：

- [**数据库：**](https://developer.android.com/reference/androidx/room/Database.html) 包含数据库所有者，并用作与应用程序的持久关系数据的基础连接的主要访问点。

  带有注释的类 [`@Database`](https://developer.android.com/reference/androidx/room/Database.html)应满足以下条件：

  - 一个继承 [`RoomDatabase`](https://developer.android.com/reference/androidx/room/RoomDatabase.html)的抽象类。
  - 在注解内包括与数据库关联的实体类集合。
  - 包含一个具有0个参数的抽象方法，并返回带有注释的类 [`@Dao`](https://developer.android.com/reference/androidx/room/Dao.html)。

  在运行时，您可以通过调用 `Room.databaseBuilder()`或 `Room.inMemoryDatabaseBuilder()`获取一个[`Database`](https://developer.android.com/reference/androidx/room/Database.html)实例 。

- [**实体：**](https://developer.android.com/training/data-storage/room/defining-data.html)表示数据库中的表。

- [**DAO：**](https://developer.android.com/training/data-storage/room/accessing-data.html)包含用于访问数据库的方法。

该应用程序使用Room数据库获取与该数据库关联的数据访问对象或DAO。然后，该应用程序使用每个DAO从数据库中获取实体，并将对这些实体的所有更改保存回数据库。最后，该应用程序使用一个实体来获取和设置与数据库中的表列相对应的值。

Room不同组件之间的这种关系如图1所示：

![room_architecture](./images/room_architecture.png)

以下代码段是一个包含一个实体和一个DAO的数据库配置的示例：

`User`

```java
@Entity
public class User {
    @PrimaryKey
    public int uid;

    @ColumnInfo(name = "first_name")
    public String firstName;

    @ColumnInfo(name = "last_name")
    public String lastName;
}
```

`UserDao`

```java
@Dao
public interface UserDao {
    @Query("SELECT * FROM user")
    List<User> getAll();

    @Query("SELECT * FROM user WHERE uid IN (:userIds)")
    List<User> loadAllByIds(int[] userIds);

    @Query("SELECT * FROM user WHERE first_name LIKE :first AND " +
           "last_name LIKE :last LIMIT 1")
    User findByName(String first, String last);

    @Insert
    void insertAll(User... users);

    @Delete
    void delete(User user);
}
```

`AppDatabase`

```java
@Database(entities = {User.class}, version = 1)
public abstract class AppDatabase extends RoomDatabase {
    public abstract UserDao userDao();
}
```

在创建完上面的文件之后，您将使用以下代码获得创建的数据库(AppDatabase)的实例：

```java
AppDatabase db = Room.databaseBuilder(getApplicationContext(),
        AppDatabase.class, "database-name").build();
```

> **注意：**如果您的应用程序在单个进程中运行，则在实例化`AppDatabase` 对象时应遵循单例设计模式。每个[ `RoomDatabase`](https://developer.android.com/reference/androidx/room/RoomDatabase.html)实例都相当昂贵，您几乎不需要在单个进程中访问多个实例。
>
> 如果您的应用程序在多个进程中运行，请包含 `enableMultiInstanceInvalidation()`在数据库构建器调用中。这样，当`AppDatabase` 在每个进程中都有一个实例时，可以在一个进程中使共享数据库文件无效，并且这种无效性会自动传播到`AppDatabase`其他进程中的实例 。

要获得Room的动手体验，请尝试[Android Room with a View](https://codelabs.developers.google.com/codelabs/android-room-with-a-view-kotlin) 和[Android Persistence](https://codelabs.developers.google.com/codelabs/android-persistence/) codelabs。要浏览代码示例，请参阅 [Android体系结构组件示例](https://github.com/googlesamples/android-architecture-components/)