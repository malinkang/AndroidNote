# 在数据库中创建视图

> 原文：https://developer.android.com/training/data-storage/room/creating-views

[Room Persistence库的](https://developer.android.com/training/data-storage/room/) 2.1.0版和更高版本提供对[SQLite数据库视图的](https://www.sqlite.org/lang_createview.html)支持，使您可以将查询封装到类中。Room将这些查询支持的类称为*视图*，并且在[DAO中](https://developer.android.com/training/data-storage/room/accessing-data)使用时，它们的行为与简单数据对象相同 。

> **注意：**像[实体](https://developer.android.com/training/data-storage/room/defining-data)一样，您可以`SELECT`针对视图运行 语句。但是，你不能运行`INSERT`，`UPDATE`或`DELETE`对观点的陈述。

## 创建一个视图

要创建视图，请将[`@DatabaseView`](https://developer.android.com/reference/androidx/room/DatabaseView)注释添加 到类中。将注释的值设置为类应表示的查询。

以下代码段提供了一个视图示例：

```java
@DatabaseView("SELECT user.id, user.name, user.departmentId," +
              "department.name AS departmentName FROM user " +
              "INNER JOIN department ON user.departmentId = department.id")
public class UserDetail {
    public long id;
    public String name;
    public long departmentId;
    public String departmentName;
}
```



## 将视图与数据库关联

要将此视图作为应用程序数据库的一部分包含在内，请将该[`views`](https://developer.android.com/reference/androidx/room/Database#views)属性包括 在应用程序的 `@Database`注释中：

```java
@Database(entities = {User.class}, views = {UserDetail.class},
          version = 1)
public abstract class AppDatabase extends RoomDatabase {
    public abstract UserDao userDao();
}
```

