# 使用Room实体定义数据

使用 [Room持久性库时](https://developer.android.com/training/data-storage/room/index.html)，可以将相关字段集定义为*实体*。对于每个实体，都会在关联的[`Database`](https://developer.android.com/reference/androidx/room/Database.html)对象内创建一个表来保存条目。你必须通过 [`Database`](https://developer.android.com/reference/androidx/room/Database.html)类的 [`entities`](https://developer.android.com/reference/androidx/room/Database.html#entities()) 数组引用实体类。

> **注意：**要在应用程序中使用实体，[请将架构组件工件添加](https://developer.android.com/topic/libraries/architecture/adding-components.html)到应用程序的 `build.gradle`文件中。

```java
@Entity
public class User {
    @PrimaryKey
    public int id;

    public String firstName;
    public String lastName;
}
```

要持久化一个字段，Room必须能够访问它。您可以公开一个字段，也可以为其提供一个getter和setter方法。如果使用getter和setter方法，请记住它们基于Room中的JavaBeans约定。

> **注意：**实体可以具有空的构造函数（如果相应的 [DAO](https://developer.android.com/training/data-storage/room/accessing-data.html)类可以访问每个持久字段），也可以具有其参数包含与实体中的字段类型和名称匹配的构造函数。Room还可以使用全部或部分构造函数，例如仅接收某些字段的构造函数。

## 使用主键

每个实体必须定义至少1个字段作为主键。即使只有1个字段，您仍然需要使用注释对字段进行 [`@PrimaryKey`](https://developer.android.com/reference/androidx/room/PrimaryKey.html) 注释。另外，如果您希望Room为实体分配自动ID，则可以设置`@PrimaryKey`的 [`autoGenerate`](https://developer.android.com/reference/androidx/room/PrimaryKey.html#autoGenerate()) 属性。如果实体具有复合主键，则可以使用[`@Entity`](https://developer.android.com/reference/androidx/room/Entity.html)的 [`primaryKeys`](https://developer.android.com/reference/androidx/room/Entity.html#primaryKeys()) 属性 ，如以下代码片段所示：

```java
@Entity(primaryKeys = {"firstName", "lastName"})
public class User {
    public String firstName;
    public String lastName;
}
```

默认情况下，Room使用类名称作为数据库表名称。如果希望表使用不同的名称，请设置[`@Entity`](https://developer.android.com/reference/androidx/room/Entity.html)的 [`tableName`](https://developer.android.com/reference/androidx/room/Entity.html#tableName()) 属性 ，如以下代码片段所示：

```java
@Entity(tableName = "users")
public class User {
    // ...
}
```

> **注意：** SQLite中的表名称不区分大小写。

与该[`tableName`](https://developer.android.com/reference/androidx/room/Entity.html#tableName()) 属性类似 ，Room使用字段名称作为数据库中的列名称。如果希望一列具有不同的名称，则将[`@ColumnInfo`](https://developer.android.com/reference/androidx/room/ColumnInfo.html) 注解添加到字段中，如以下代码片段所示：

```java
@Entity(tableName = "users")
public class User {
    @PrimaryKey
    public int id;

    @ColumnInfo(name = "first_name")
    public String firstName;

    @ColumnInfo(name = "last_name")
    public String lastName;
}
```

## 忽略字段

默认情况下，Room为实体中定义的每个字段创建一列。如果实体具有您不想保留的字段，则可以使用[`@Ignore`](https://developer.android.com/reference/androidx/room/Ignore.html)来注释它们，如以下代码片段所示：

```java
@Entity
public class User {
    @PrimaryKey
    public int id;

    public String firstName;
    public String lastName;

    @Ignore
    Bitmap picture;
}
```

在实体从父实体继承字段的情况下，通常使用`@Entity`的 [`ignoredColumns`](https://developer.android.com/reference/androidx/room/Entity#ignoredcolumns)属性更容易：

```java
@Entity(ignoredColumns = "picture")
public class RemoteUser extends User {
    @PrimaryKey
    public int id;
    public boolean hasVpn;
}
```

## 提供表格搜索支持

Room支持多种类型的注释，使您可以更轻松地在数据库表中搜索详细信息。除非您的应用程序`minSdkVersion`小于16，否则请使用全文搜索 。

### 支持全文搜索

如果您的应用程序需要通过全文本搜索（FTS）快速访问数据库信息，请让您的实体得到使用FTS3或FTS4 [SQLite扩展模块](https://www.sqlite.org/fts3.html)的虚拟表的支持。要使用此功能（在2.1.0版及更高版本的Room中可用），请向[`@Fts3`](https://developer.android.com/reference/androidx/room/Fts3)或 添加 [`@Fts4`](https://developer.android.com/reference/androidx/room/Fts4)到给定实体，如以下代码片段所示：

```java
// Use `@Fts3` only if your app has strict disk space requirements or if you
// require compatibility with an older SQLite version.
@Fts4
@Entity(tableName = "users")
public class User {
    // Specifying a primary key for an FTS-table-backed entity is optional, but
    // if you include one, it must use this type and column name.
    @PrimaryKey
    @ColumnInfo(name = "rowid")
    public int id;

    @ColumnInfo(name = "first_name")
    public String firstName;
}
```

> **注意：**启用了FTS的表始终使用类型为主键`INTEGER`且列名称为“ rowid” 的主键。如果您的FTS表支持的实体定义了主键，则它 **必须**使用该类型和列名。

如果表支持多种语言的内容，请使用该 `languageId`选项指定存储每一行语言信息的列：

```java
@Fts4(languageId = "lid")
@Entity(tableName = "users")
public class User {
    // ...

    @ColumnInfo(name = "lid")
    int languageId;
}
```

Room提供了用于定义FTS支持的实体的其他几个选项，包括结果排序，令牌生成器类型和作为外部内容管理的表。有关这些选项的更多详细信息，请参见 [`FtsOptions`](https://developer.android.com/reference/androidx/room/FtsOptions)参考。

### 索引特定列

如果您的应用程序必须支持不允许使用FTS3或FTS4表支持的实体的SDK版本，则您仍可以索引数据库中的某些列以加快查询速度。要将索引添加到实体，请将[`indices`](https://developer.android.com/reference/androidx/room/Entity.html#indices()) 属性包括 在 [`@Entity`](https://developer.android.com/reference/androidx/room/Entity.html)注释中，列出要包含在索引或复合索引中的列的名称。以下代码段演示了此注释过程：

```java
@Entity(indices = {@Index("name"),
        @Index(value = {"last_name", "address"})})
public class User {
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



有时，数据库中的某些字段或字段组必须是唯一的。您可以通过将 注释的[`unique`](https://developer.android.com/reference/androidx/room/Index.html#unique()) 属性设置为来强制执行此唯一性属性 。以下代码示例防止一个表具有两行，这两行包含和 列的相同值集：[`@Index`](https://developer.android.com/reference/androidx/room/Index.html)`true``firstName``lastName`

```java
@Entity(indices = {@Index(value = {"first_name", "last_name"},
        unique = true)})
public class User {
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

## 包括基于 AutoValue的对象

在Room 2.1.0及更高版本中，您可以将基于Java的[不可变值类](https://github.com/google/auto/blob/master/value/userguide/index.md)（使用注释`@AutoValue`）用作应用程序数据库中的实体。如果实体的两个实例的列包含相同的值，则认为两个实例相等是特别有用的。

当使用带有注释的类`@AutoValue`为实体，您可以使用注释类的抽象方法`@PrimaryKey`，`@ColumnInfo`，`@Embedded`，和 `@Relation`。但是，在使用这些批注时，您`@CopyAnnotations`每次都必须包含 批注，以便Room可以正确解释方法的自动生成的实现。

以下代码段显示了一个示例示例，该示例带有`@AutoValue`Room识别为实体的注释 ：

```java
@AutoValue
@Entity
public abstract class User {
    // Supported annotations must include `@CopyAnnotations`.
    @CopyAnnotations
    @PrimaryKey
    public abstract long getId();

    public abstract String getFirstName();
    public abstract String getLastName();

    // Room uses this factory method to create User objects.
    public static User create(long id, String firstName, String lastName) {
        return new AutoValue_User(id, firstName, lastName);
    }
}
```

