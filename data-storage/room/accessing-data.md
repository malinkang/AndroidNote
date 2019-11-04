# 使用Room DAO访问数据

要使用[Room持久性库](https://developer.android.com/training/data-storage/room/index.html)访问应用程序的数据 ，您需要使用*数据访问对象*或DAO。这组 [`Dao`](https://developer.android.com/reference/androidx/room/Dao.html)对象构成Room的主要组成部分，因为每个DAO都包含提供对应用程序数据库的抽象访问的方法。

通过使用DAO类而不是查询构建器或直接查询访问数据库，可以分离数据库体系结构的不同组件。此外，DAO允许您在[测试应用程序时](https://developer.android.com/training/data-storage/room/testing-db.html)轻松模拟数据库访问 。

> **注意：**在将DAO类添加到您的应用程序之前， [请将“架构组件”工件添加](https://developer.android.com/topic/libraries/architecture/adding-components.html) 到您的应用程序`build.gradle`文件中。

DAO可以是接口，也可以是抽象类。如果它是一个抽象类，则可以选择使用一个[`RoomDatabase`](https://developer.android.com/reference/androidx/room/RoomDatabase.html)作为其唯一参数的构造 函数。Room会在编译时创建每个DAO实现。

> **注意：** Room不支持在主线程上进行数据库访问，除非您已在构建器上调用过`allowMainThreadQueries()`，因为Room 可能会长时间锁定UI。返回[`LiveData`](https://developer.android.com/reference/androidx/lifecycle/LiveData.html) 或[`Flowable`](http://reactivex.io/RxJava/2.x/javadoc/io/reactivex/Flowable.html)实例的异步查询不受此规则的限制，因为它们在需要时在后台线程上异步运行查询。 

## 定义方法以方便使用

您可以使用DAO类表示多个便捷查询。本文档包括几个常见示例。

### 插入

创建DAO方法并用注释时 [`@Insert`](https://developer.android.com/reference/androidx/room/Insert.html)，Room会生成一个实现，该实现可在单个事务中将所有参数插入数据库。

以下代码段显示了几个示例查询：

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

如果该[`@Insert`](https://developer.android.com/reference/androidx/room/Insert.html) 方法仅接收1个参数，则可以返回一个`long`值，这是插入项的新`rowId`。如果参数是数组或集合，则应返回`long[]`或`List`。

有关更多详细信息，请参阅[`@Insert`](https://developer.android.com/reference/androidx/room/Insert.html)注释的参考文档 以及 [SQLite documentation for rowid tables](https://www.sqlite.org/rowidtable.html)。

### 更新

`Update`便利方法修改作为参数的一组实体。它使用与每个实体的主键匹配的查询。

以下代码段演示了如何定义此方法：

```java
@Dao
public interface MyDao {
    @Update
    public void updateUsers(User... users);
}
```

尽管通常没有必要，但是您可以让此方法返回一个`int`值，以指示数据库中更新的行数。

### 删除

`Delete`便利方法删除作为参数的一组实体。它使用主键来查找要删除的实体。

以下代码段演示了如何定义此方法：

```java
@Dao
public interface MyDao {
    @Delete
    public void deleteUsers(User... users);
}
```

尽管通常没有必要，但是您可以让此方法返回一个`int`值，以指示从数据库中删除的行数。

## 查询信息

[`@Query`](https://developer.android.com/reference/androidx/room/Query.html)是DAO类中使用的主要注释。它允许您对数据库执行读/写操作。每种 [`@Query`](https://developer.android.com/reference/androidx/room/Query.html)方法都在编译时进行验证，因此，如果查询存在问题，则会发生编译错误，而不是运行时错误。

Room还会验证查询的返回值，以便如果返回的对象中字段的名称与查询响应中的相应列名称不匹配，Room可以通过以下两种方式之一向您发出警报：

- 如果仅某些字段名称匹配，则会发出警告。
- 如果没有匹配的字段名称，则会产生错误。

### 简单查询

```java
@Dao
public interface MyDao {
    @Query("SELECT * FROM user")
    public User[] loadAllUsers();
}
```

这是一个非常简单的查询，可加载所有用户。在编译时，Room知道它正在查询用户表中的所有列。如果查询包含语法错误，或者数据库中不存在用户表，则Room会在编译应用时显示错误并显示相应的消息。

### 将参数传递到查询中

大多数时候，您需要将参数传递给查询以执行过滤操作，例如仅显示年龄超过特定年龄的用户。要完成此任务，请在Room批注中使用方法参数，如以下代码片段所示：

```java
@Dao
public interface MyDao {
    @Query("SELECT * FROM user WHERE age > :minAge")
    public User[] loadAllUsersOlderThan(int minAge);
}
```

在编译时处理此查询时，Room将`:minAge`绑定参数与`minAge`方法参数进行匹配。Room使用参数名称执行匹配。如果不匹配，则在您的应用编译时会发生错误。

您还可以在查询中传递多个参数或多次引用它们，如以下代码片段所示：

```java
@Dao
public interface MyDao {
    @Query("SELECT * FROM user WHERE age BETWEEN :minAge AND :maxAge")
    public User[] loadAllUsersBetweenAges(int minAge, int maxAge);

    @Query("SELECT * FROM user WHERE first_name LIKE :search " +
           "OR last_name LIKE :search")
    public List<User> findUserWithName(String search);
}
```

### 返回列的子集

大多数时候，您只需要获取实体的几个字段。例如，您的UI可能仅显示用户的名字和姓氏，而不是有关用户的每个详细信息。通过仅提取出现在应用程序UI中的列，可以节省宝贵的资源，并且查询可以更快地完成。

只要可以将结果列的集合映射到返回的对象中，Room允许您从查询中返回任何基于Java的对象。例如，您可以创建以下简单的基于Java的旧对象（POJO）以获取用户的名字和姓氏：

```java
public class NameTuple {
    @ColumnInfo(name = "first_name")
    public String firstName;

    @ColumnInfo(name = "last_name")
    @NonNull
    public String lastName;
}
```

现在，您可以在查询方法中使用此POJO：

```java
@Dao
public interface MyDao {
    @Query("SELECT first_name, last_name FROM user")
    public List<NameTuple> loadFullName();
}
```

Room知道查询将返回和的值，`first_name`并且 `last_name`这些值可以映射到`NameTuple`类的字段中 。因此，Room可以生成正确的代码。如果查询返回的列过多或`NameTuple` 该类中不存在的列，Room将显示警告。

> **注意：**这些POJO也可以使用 [`@Embedded`](https://developer.android.com/reference/androidx/room/Embedded.html) 注释。

### 传递参数集合

您的某些查询可能要求您传递可变数量的参数，直到运行时才知道确切数量的参数。例如，您可能想从区域子集中检索有关所有用户的信息。Room可以了解参数何时表示集合，并根据提供的参数数量在运行时自动扩展它。

```java
@Dao
public interface MyDao {
    @Query("SELECT first_name, last_name FROM user WHERE region IN (:regions)")
    public List<NameTuple> loadUsersFromRegions(List<String> regions);
}
```

### 可观察的查询

执行查询时，您通常会希望您的应用程序的UI在数据更改时自动更新。为此，请在查询方法描述中使用[`LiveData`](https://developer.android.com/reference/androidx/lifecycle/LiveData.html)类型的返回值。Room会生成所有必需的代码，以在数据库更新时更新 [`LiveData`](https://developer.android.com/reference/androidx/lifecycle/LiveData.html)。

```java
@Dao
public interface MyDao {
    @Query("SELECT first_name, last_name FROM user WHERE region IN (:regions)")
    public LiveData<List<User>> loadUsersFromRegionsSync(List<String> regions);
}
```

### 使用RxJava进行响应式查询

Room对RxJava2类型的返回值提供以下支持：

- `@Query`方法：房间支持类型的返回值 [`Publisher`](http://www.reactive-streams.org/reactive-streams-1.0.1-javadoc/org/reactivestreams/Publisher.html)， [`Flowable`](http://reactivex.io/RxJava/2.x/javadoc/io/reactivex/Flowable.html)和 [`Observable`](http://reactivex.io/RxJava/2.x/javadoc/io/reactivex/Observable.html)。
- `@Insert`，`@Update`及`@Delete`方法：2.1.0室和更高版本支持返回类型的值 [`Completable`](http://reactivex.io/RxJava/javadoc/io/reactivex/Completable.html)， [`Single`](http://reactivex.io/RxJava/javadoc/io/reactivex/Single.html)和 [`Maybe`](http://reactivex.io/RxJava/javadoc/io/reactivex/Maybe.html)

要使用此功能，请 在应用程序的文件中包括最新版本的**rxjava2**构件`build.gradle`：

`app/build.gradle`

```groovy
dependencies {
    def room_version = "2.1.0"
    implementation 'androidx.room:room-rxjava2:$room_version'
}
```

有关更多详细信息，请参阅Google Developers [Room和RxJava](https://medium.com/google-developers/room-rxjava-acb0cd4f3757)文章。

### 直接Cursor访问

如果您的应用程序逻辑需要直接访问返回行，则可以从查询中返回一个`Cursor`对象，如以下代码片段所示：

```java
@Dao
public interface MyDao {
    @Query("SELECT * FROM user WHERE age > :minAge LIMIT 5")
    public Cursor loadRawUsersOlderThan(int minAge);
}
```

> **警告：**强烈建议不要使用Cursor API，因为它不能保证行是否存在或行包含哪些值。仅当您已经拥有需要游标且无法轻松重构的代码时，才使用此功能。

### 查询多个表

您的某些查询可能需要访问多个表才能计算结果。Room允许您编写任何查询，因此您也可以联接表。此外，如果响应是可观察到的数据类型（例如Flowable 或LiveData） ，则Room会监视查询中引用的所有表是否有效。

以下代码段显示了如何执行表联接以合并包含正在借书的用户的表和包含有关当前借书的数据的表之间的信息：

```java
@Dao
public interface MyDao {
    @Query("SELECT * FROM book " +
           "INNER JOIN loan ON loan.book_id = book.id " +
           "INNER JOIN user ON user.id = loan.user_id " +
           "WHERE user.name LIKE :userName")
   public List<Book> findBooksBorrowedByNameSync(String userName);
}
```

您还可以从这些查询返回POJO。例如，您可以编写一个查询来加载用户及其宠物的名称，如下所示：

```java
@Dao
public interface MyDao {
   @Query("SELECT user.name AS userName, pet.name AS petName " +
          "FROM user, pet " +
          "WHERE user.id = pet.user_id")
   public LiveData<List<UserPet>> loadUserAndPetNames();

   // You can also define this class in a separate file, as long as you add the
   // "public" access modifier.
   static class UserPet {
       public String userName;
       public String petName;
   }
}
```

### 用Kotlin协程编写异步方法

您可以将`suspend`Kotlin关键字添加到DAO方法中，以使用Kotlin协程功能使其异步。这样可以确保它们无法在主线程上执行。

```java
@Dao
interface MyDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUsers(vararg users: User)

    @Update
    suspend fun updateUsers(vararg users: User)

    @Delete
    suspend fun deleteUsers(vararg users: User)

    @Query("SELECT * FROM user")
    suspend fun loadAllUsers(): Array<User>
}
```

> **注意：**将Room与Kotlin协程一起使用需要Room 2.1.0，Kotlin 1.3.0和Coroutines 1.0.0或更高版本。有关更多信息，请参见 [声明依赖项](https://developer.android.com/jetpack/androidx/releases/room#declaring_dependencies)。

本指南还适用于带有注释的DAO方法 。您可以使用此功能从其他DAO方法中构建挂起数据库方法。这些方法然后在单个数据库事务中运行。[ `@Transaction`](https://developer.android.com/reference/androidx/room/Transaction)

```java
@Dao
abstract class UsersDao {
    @Transaction
    open suspend fun setLoggedInUser(loggedInUser: User) {
        deleteUser(loggedInUser)
        insertUser(loggedInUser)
    }

    @Query("DELETE FROM users")
    abstract fun deleteUser(user: User)

    @Insert
    abstract suspend fun insertUser(user: User)
}
```

> **注意：**避免在单个数据库事务中执行额外的应用程序端工作，因为Room将事务视为独占事务，并且一次只能执行一个事务。这意味着包含比必要更多的操作的事务很容易锁定数据库并影响性能。

有关在您的应用程序中使用Kotlin协程的更多信息，请参阅使用Kotlin协程 [提高应用程序性能](https://developer.android.com/kotlin/coroutines)。