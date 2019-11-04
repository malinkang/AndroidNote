



# 使用Room引用复杂数据

Room提供了在原始类型和装箱类型之间进行转换的功能，但不允许在实体之间引用对象。本文档说明了如何使用类型转换器以及Room不支持对象引用的原因。

## 使用类型转换器

有时，您的应用程序需要使用自定义数据类型，您希望将其值存储在单个数据库列中。要添加对自定义类型的这种支持，您需要提供一个 [`TypeConverter`](https://developer.android.com/reference/androidx/room/TypeConverter.html)，将自定义类与Room可以持久存在的已知类型之间进行转换。

例如，如果要保留的实例`Date`，可以编写以下代码 [`TypeConverter`](https://developer.android.com/reference/androidx/room/TypeConverter.html) 以将等效的Unix时间戳存储在数据库中：

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

前面的示例定义了2个函数，其中一个从`Date` 转换为一个`Long`对象，另一个执行反向转换从Long到Date。由于Room已经知道如何持久化Long对象，因此可以使用此转换器来持久化Date类型的值 。

接下来，您将添加 [`@TypeConverters`](https://developer.android.com/reference/androidx/room/TypeConverters.html) 注释到`AppDatabase`类，以便Room可以使用您为每个定义的转换器[实体](https://developer.android.com/training/data-storage/room/defining-data.html) 和[DAO](https://developer.android.com/training/data-storage/room/accessing-data.html)在 `AppDatabase`：

`AppDatabase`

```java
@Database(entities = {User.class}, version = 1)
@TypeConverters({Converters.class})
public abstract class AppDatabase extends RoomDatabase {
    public abstract UserDao userDao();
}
```

使用这些转换器，然后就可以在其他查询中使用自定义类型，就像使用原始类型一样，如以下代码片段所示：

```java
@Entity
public class User {
    private Date birthday;
}
```

`UserDao`

```java
@Dao
public interface UserDao {
    @Query("SELECT * FROM user WHERE birthday BETWEEN :from AND :to")
    List<User> findUsersBornBetweenDates(Date from, Date to);
}
```

您还可以将限制 [`@TypeConverters`](https://developer.android.com/reference/androidx/room/TypeConverters.html) 为不同的范围，包括单个实体，DAO和DAO方法。有关更多详细信息，请参见[`@TypeConverters`](https://developer.android.com/reference/androidx/room/TypeConverters.html) 注解的参考文档 。

## 了解为什么Room不允许对象引用

> **关键要点：** Room不允许实体类之间的对象引用。相反，您必须明确请求应用程序所需的数据。

从数据库到各个对象模型的映射关系是一种常见的做法，并且在服务器端效果很好。即使程序在访问字段时加载它们，服务器仍然可以正常运行。

但是，在客户端，这种类型的延迟加载是不可行的，因为它通常发生在UI线程上，并且在UI线程中的磁盘上查询信息会造成严重的性能问题。UI线程通常需要大约16毫秒来计算和绘制活动的更新版式，因此，即使查询仅花费5毫秒，您的应用仍有可能会用完时间来绘制框架，从而引起明显的视觉故障。如果有并行的单独事务在运行，或者设备正在运行其他磁盘密集型任务，则查询可能需要花费更多时间才能完成。但是，如果您不使用延迟加载，则您的应用程序会获取比所需更多的数据，从而造成内存消耗问题。

对象关系映射通常将决定权留给开发人员，以便开发人员可以针对自己的应用程序用例执行最佳操作。开发人员通常决定在他们的应用程序和UI之间共享模型。但是，此解决方案不能很好地扩展，因为随着UI的变化，共享模型会产生一些问题，开发人员很难预料和调试。

例如，考虑一个加载`Book`对象列表的UI，每本书都有一个`Author`对象。你可能一开始设计自己的查询中使用延迟加载有实例`Book`检索作者。第一次检索该`author`字段将查询数据库。一段时间后，您意识到还需要在应用程序的UI中显示作者姓名。您可以很容易地访问此名称，如以下代码片段所示：

```java
authorNameTextView.setText(book.getAuthor().getName());
```



但是，这种看似无害的更改导致`Author`在主线程上查询表。

如果您提前查询作者信息，则在不再需要数据时，很难更改数据的加载方式。例如，如果您的应用程序的UI不再需要显示`Author`信息，则您的应用程序将有效地加载不再显示的数据，从而浪费了宝贵的内存空间。如果`Author`该类引用了另一个表（例如），则应用程序的效率会进一步降低`Books`。

要使用Room同时引用多个实体，您可以创建一个包含每个实体的POJO，然后编写一个连接相应表的查询。这种结构合理的模型与Room强大的查询验证功能相结合，使您的应用程序在加载数据时消耗更少的资源，从而改善了应用程序的性能和用户体验。