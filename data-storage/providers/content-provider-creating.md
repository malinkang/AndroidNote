# 创建内容提供程序

内容提供程序管理对中央数据存储区的访问。如要实现提供程序，您需将其作为 Android 应用中的一个或多个类，以及清单文件中的元素。其中一个类会实现子类 `ContentProvider`，即提供程序与其他应用之间的接口。尽管内容提供程序旨在向其他应用提供数据，但您应用中的某些 Activity 必定允许用户查询和修改提供程序所管理的数据。

本主题的其余部分列出了开发内容提供程序的基本步骤和需要使用的 API。

## 着手构建前的准备工作

在着手构建提供程序之前，请考虑以下事项：

1. 确定是否需要内容提供程序

   。如果您想提供以下一项或多项功能，则需要构建内容提供程序：

   - 您想为其他应用提供复杂的数据或文件
   - 您想允许用户将复杂的数据从您的应用复制到其他应用中
   - 您想使用搜索框架提供自定义搜索建议。
   - 您希望向微件公开应用数据。
   - 您希望实现 `AbstractThreadedSyncAdapter`、`CursorAdapter` 或 `CursorLoader` 类。

   如果您完全是在自己的应用中使用数据库或其他类型的持久存储，且无需提供以上任何一种功能，则*不*需要构建提供程序。您可以使用[保存应用数据](https://developer.android.com/training/data-storage/index.html)页面上所描述的任一存储系统。

2. 如果您尚未完成此项操作，请阅读[内容提供程序基础知识](https://developer.android.com/guide/topics/providers/content-provider-basics.html)主题，了解有关提供程序及其工作原理的更多信息。

接下来，请按照以下步骤构建您的提供程序：

1. 为您的数据设计原始存储。内容提供程序以两种方式提供数据：

   - 文件数据

     通常存储在文件中的数据，如照片、音频或视频。将文件存储在应用的私有空间内。您的提供程序可以应其他应用发出的文件请求提供文件句柄。

   - “结构化”数据

     通常存储在数据库、数组或类似结构中的数据。以兼容行列表的形式存储数据。行表示实体，如人员或库存商品。列表示实体的某项数据，如人员姓名或商品价格。此类数据通常存储在 SQLite 数据库中，但您可以使用任何类型的持久存储。如需详细了解 Android 系统中的可用存储类型，请参阅[设计数据存储](https://developer.android.com/guide/topics/providers/content-provider-creating#DataStorage)部分。

2. 定义 `ContentProvider` 类及其所需方法的具体实现。此类是数据与 Android 系统其余部分之间的接口。如需了解有关此类的更多信息，请参阅[实现 ContentProvider 类](https://developer.android.com/guide/topics/providers/content-provider-creating#ContentProvider)部分。

3. 定义提供程序的授权字符串、该字符串的内容 URI 以及列名称。如果您想让提供程序的应用处理 Intent，则还需定义 Intent 操作、Extra 数据和标志。此外，请为访问数据的应用定义必须具备的权限。您应该考虑在单独的协定类中将所有这些值定义为常量，以便之后向其他开发者公开此类。如需了解有关内容 URI 的更多信息，请参阅[设计内容 URI](https://developer.android.com/guide/topics/providers/content-provider-creating#ContentURI) 部分。如需了解有关 Intent 的更多信息，请参阅 [Intent 和数据访问](https://developer.android.com/guide/topics/providers/content-provider-creating#Intents)部分。

4. 添加其他可选部分，如示例数据或可在提供程序与云数据之间同步数据的 `AbstractThreadedSyncAdapter` 实现。

## 设计数据存储

内容提供程序是以结构化格式保存的数据的接口。创建该接口之前，您必须确定数据的存储方式。您可以按自己的喜好以任何形式存储数据，然后根据需要设计读写数据的接口。

以下是 Android 中提供的一些数据存储技术：

- 如要处理结构化数据，则可考虑采用关系型数据库（如 SQLite）或非关系型键值数据存储区（如 [LevelDB](https://github.com/google/leveldb)）。如要处理非结构化数据（如音频、图像或视频媒体），则可考虑以文件形式存储数据。您可以混用和配合使用几种不同类型的存储技术，并在必要时使用单个内容提供程序将其公开。

- Android 系统可与 Room 持久化库进行交互，后者提供对 SQLite 数据库 API 的访问权限，而 Android 自有提供程序可使用 SQLite 数据库 API 存储面向表格的数据。如要使用此库创建数据库，请遵照Room持久化库指南中的说明，将`RoomDatabase`的子类实例化。

  请记住，您不必使用数据库来实现存储区。提供程序在外部表现为一组表，与关系型数据库类似，但这并非对提供程序内部实现的要求。

- 为了存储文件数据，Android 提供各种面向文件的 API。如要了解有关文件存储的更多信息，请阅读[数据存储](https://developer.android.com/guide/topics/data/data-storage.html)主题。如要设计提供媒体相关数据（如音乐或视频）的提供程序，则您可以开发合并表数据和文件的提供程序。

- 在极少数情况下，您可以通过为单个应用实现多个内容提供程序受益。例如，您可以使用一个内容提供程序与微件共享某些数据，并公开与其他应用共享的另一组数据。

- 如要使用基于网络的数据，请使用 `java.net` 和 `android.net` 中的类。您也可将基于网络的数据同步至本地数据存储（如数据库），然后以表格或文件的形式提供这类数据。[基本同步适配器](https://developer.android.com/samples/BasicSyncAdapter/index.html)示例应用展示了此类型的同步。

> **注意**：如果您更改不具备向后兼容性的代码库，则需使用新版本号标记该代码库。您还需为实现新内容提供程序的应用提升版本号。做此更改可防止系统降级，避免系统在尝试重新安装拥有非兼容内容提供程序的应用时发生崩溃。

## 设计内容 URI

**内容 URI** 是用于在提供程序中标识数据的 URI。内容 URI 包含整个提供程序的符号名称（提供程序的**授权**）和指向表格或文件的名称（**路径**）。可选 ID 部分指向表格中的单个行。`ContentProvider` 的每个数据访问方法均将内容 URI 作为参数；您可以利用这一点确定要访问的表格、行或文件。

如需了解内容 URI 的基础知识，请参阅[内容提供程序基础知识](https://developer.android.com/guide/topics/providers/content-provider-basics.html)主题。

### 设计授权

提供程序通常拥有单一授权，该授权充当其 Android 内部名称。为避免与其他提供程序发生冲突，您应该使用互联网网域所有权（反向）作为提供程序授权的基础。由于此建议也适用于 Android 软件包名称，因而您可以将提供程序授权定义为包含该提供程序的软件包名称的扩展名。例如，如果您的 Android 软件包名称为 `com.example.`，则应为提供程序提供 `com.example.<appname>.provider` 授权。

### 设计路径结构

通常，开发者会追加指向单个表格的路径，从而根据权限创建内容 URI。例如，如果您有 *table1* 和 *table2* 两个表格，则可以通过合并上一示例中的授权来生成内容 URI `com.example..provider/table1` 和 `com.example.<appname>.provider/table2`。路径并不仅限于单个段，并且您无需为各级路径创建表。

### 处理内容 URI ID

按照约定，提供程序会接受末尾拥有行 ID 值的内容 URI，进而提供对表内单个行的访问。同样按照约定，提供程序会将该 ID 值与表的 `_ID` 列进行匹配，并对匹配的行执行请求访问。

此约定为访问提供程序的应用提供了一种常见的设计模式。应用会对提供程序执行查询，并使用 `CursorAdapter`，以 `ListView` 的形式显示生成的 `Cursor`。定义 `CursorAdapter` 的条件是，`Cursor` 中的某一列必须是 `_ID`

用户随后从界面显示的行中任选一行，以查看或修改数据。应用会从支持 `ListView` 的 `Cursor` 中获取对应行，获取该行的 `_ID` 值，将其追加至内容 URI，进而向提供程序发送访问请求。然后，提供程序便可对用户选取的特定行执行查询或修改。

### 内容 URI 模式

为帮助您选择对传入的内容 URI 执行的操作，提供程序 API 加入了便利类 `UriMatcher`，它会将内容 URI“模式”映射为整型值。您可以在 `switch` 语句中使用这些整型值，为匹配特定模式的一个或多个内容 URI 选择所需操作。

内容 URI 模式使用以下通配符匹配内容 URI：

- **`\*`：**匹配由任意长度的任何有效字符组成的字符串
- **`#`：**匹配由任意长度的数字字符组成的字符串

以设计和编码内容 URI 处理为例，假设某个拥有授权 `com.example.app.provider` 的提供程序能识别以下指向表的内容 URI：

- `content://com.example.app.provider/table1`：一个名为 `table1` 的表
- `content://com.example.app.provider/table2/dataset1`：一个名为 `dataset1` 的表
- `content://com.example.app.provider/table2/dataset2`：一个名为 `dataset2` 的表
- `content://com.example.app.provider/table3`：一个名为 `table3` 的表

提供程序也可识别追加了行 ID 的内容 URI，例如，`content://com.example.app.provider/table3/1` 对应 `table3` 中的 `1` 所标识行的内容 URI。

可以使用以下内容 URI 模式：

- `content://com.example.app.provider/*`

  匹配提供程序中的任何内容 URI。

- `content://com.example.app.provider/table2/*`：

  匹配表 `dataset1` 和表 `dataset2` 的内容 URI，但不匹配 `table1` 或 `table3` 的内容 URI。

- `content://com.example.app.provider/table3/#`：匹配 `table3` 中单个行的内容 URI，如 `content://com.example.app.provider/table3/6` 对应 `6` 所标识行的内容 URI。

以下代码段展示了 `UriMatcher` 中方法的工作方式。这段代码采用不同方式来处理整个表的 URI 与单个行的 URI，它为表使用的内容 URI 模式是 `content:///`，为单个行使用的内容 URI 模式则是 `content:////`。

`addURI()` 方法会将授权和路径映射为整型值。`match()` 方法会返回 URI 的整型值。`switch` 语句会选择查询整个表还是查询单个记录：

```java
public class ExampleProvider extends ContentProvider {
...
    // Creates a UriMatcher object.
    private static final UriMatcher uriMatcher = new UriMatcher(UriMatcher.NO_MATCH);

    static {
        /*
         * The calls to addURI() go here, for all of the content URI patterns that the provider
         * should recognize. For this snippet, only the calls for table 3 are shown.
         */

        /*
         * Sets the integer value for multiple rows in table 3 to 1. Notice that no wildcard is used
         * in the path
         */
        uriMatcher.addURI("com.example.app.provider", "table3", 1);

        /*
         * Sets the code for a single row to 2. In this case, the "#" wildcard is
         * used. "content://com.example.app.provider/table3/3" matches, but
         * "content://com.example.app.provider/table3 doesn't.
         */
        uriMatcher.addURI("com.example.app.provider", "table3/#", 2);
    }
...
    // Implements ContentProvider.query()
    public Cursor query(
        Uri uri,
        String[] projection,
        String selection,
        String[] selectionArgs,
        String sortOrder) {
...
        /*
         * Choose the table to query and a sort order based on the code returned for the incoming
         * URI. Here, too, only the statements for table 3 are shown.
         */
        switch (uriMatcher.match(uri)) {


            // If the incoming URI was for all of table3
            case 1:

                if (TextUtils.isEmpty(sortOrder)) sortOrder = "_ID ASC";
                break;

            // If the incoming URI was for a single row
            case 2:

                /*
                 * Because this URI was for a single row, the _ID value part is
                 * present. Get the last path segment from the URI; this is the _ID value.
                 * Then, append the value to the WHERE clause for the query
                 */
                selection = selection + "_ID = " + uri.getLastPathSegment();
                break;

            default:
            ...
                // If the URI is not recognized, you should do some error handling here.
        }
        // call the code to actually do the query
    }
```

另一个类 `ContentUris` 会提供一些便利方法，用于处理内容 URI 的 `id` 部分。`Uri` 类和 `Uri.Builder` 类包含一些便利方法，用于解析现有 `Uri` 对象和构建新对象

## 实现 ContentProvider 类

`ContentProvider` 实例会处理其他应用发送的请求，从而管理对结构化数据集的访问。所有形式的访问最终都会调用 `ContentResolver`，后者接着通过调用 `ContentProvider` 的具体方法来获取访问权限。

### 必需方法

抽象类 `ContentProvider` 定义了六个抽象方法，您必须将其作为具体子类的一部分加以实现。以下所有方法（`onCreate()` 除外）均由尝试访问内容提供程序的客户端应用调用：

- `query()`

  从提供程序中检索数据。使用参数选择要查询的表、要返回的行和列以及结果的排序顺序。将数据作为 `Cursor` 对象返回。

- `insert()`

  在提供程序中插入新行。使用参数选择目标表并获取要使用的列值。返回新插入行的内容 URI。

- `update()`

  更新提供程序中的现有行。使用参数选择要更新的表和行，并获取更新后的列值。返回已更新的行数。

- `delete()`

  从提供程序中删除行。使用参数选择要删除的表和行。返回已删除的行数。

- `getType()`

  返回内容 URI 对应的 MIME 类型。如需了解此方法的更多信息，请参阅[实现内容提供程序 MIME 类型](https://developer.android.com/guide/topics/providers/content-provider-creating#MIMETypes)部分。

- `onCreate()`

  初始化提供程序。创建提供程序后，Android 系统会立即调用此方法。请注意，只有在 `ContentResolver` 对象尝试访问您的提供程序时，系统才会创建它。

请注意，这些方法与同名的 `ContentResolver` 方法拥有相同的签名。

您在实现这些方法时应考虑以下事项：

- 所有这些方法（`onCreate()` 除外）均可由多个线程同时调用，因此它们必须是线程安全的方法。如需了解有关多线程的更多信息，请参阅[进程和线程](https://developer.android.com/guide/components/processes-and-threads.html)主题。
- 避免在 `onCreate()` 中执行冗长的操作。将初始化任务推迟到实际需要时执行。如需了解有关此方法的更多信息，请参阅[实现 onCreate() 方法](https://developer.android.com/guide/topics/providers/content-provider-creating#OnCreate)部分。
- 尽管您必须实现这些方法，但您的代码只需返回要求的数据类型，而无需执行任何其他操作。例如，您可能想防止其他应用向某些表插入数据。如要实现此目的，您可以忽略 `insert()` 调用并返回 0。

### 实现 query() 方法

`ContentProvider.query()` 方法必须返回 `Cursor` 对象，如果失败，系统会抛出 `Exception`。如果您使用 SQLite 数据库作为数据存储，则只需返回由 `SQLiteDatabase` 类的某个 `query()` 方法返回的 `Cursor`。如果查询不匹配任何行，则您应该返回一个 `Cursor` 实例（其 `getCount()` 方法返回 0）。只有当查询过程中出现内部错误时，您才应该返回 `null`。

如果您不使用 SQLite 数据库作为数据存储，请使用 `Cursor` 的某个具体子类。例如，在 `MatrixCursor` 类实现的游标中，每行都是一个 `Object` 数组。对于此类，请使用 `addRow()` 来添加新行。

请记住，Android 系统必须能够跨进程边界传达 `Exception`。Android 可以为以下异常执行此操作，这些异常可能有助于处理查询错误：

- `IllegalArgumentException`（您可以选择在提供程序收到无效的内容 URI 时抛出此异常）
- `NullPointerException`

### 实现 insert() 方法

`insert()` 方法会使用 `ContentValues` 参数中的值，向相应表中添加新行。如果 `ContentValues` 参数中未包含列名称，您可能希望在提供程序代码或数据库模式中提供其默认值。

此方法应返回新行的内容 URI。如要构造此方法，请使用 `withAppendedId()` 向表的内容 URI 追加新行的 `_ID`（或其他主键）值。

### 实现 delete() 方法

`delete()` 方法无需从您的数据存储中实际删除行。如果您将同步适配器与提供程序一起使用，则应考虑为已删除的行添加“删除”标志，而不是完全移除行。同步适配器可以检查是否存在已删除的行，并将这些行从服务器中移除，然后再将其从提供程序中删除。

实现 update() 方法

`update()` 方法与 `insert()` 采用相同的 `ContentValues` 参数，并且该方法与 `delete()` 及 `ContentProvider.query()` 采用相同的 `selection` 和 `selectionArgs` 参数。如此一来，您便可在这些方法之间重复使用代码。

### 实现 onCreate() 方法

Android 系统会在启动提供程序时调用 `onCreate()`。在此方法中，您应该只执行快速运行的初始化任务，并将数据库创建和数据加载推迟到提供程序实际收到数据请求时进行。如果您在 `onCreate()` 中执行冗长的任务，则会减慢提供程序的启动速度。反之，这将减慢提供程序对其他应用的响应速度。

以下两段代码展示 [`ContentProvider.onCreate()`](https://developer.android.com/reference/android/content/ContentProvider#oncreate) 与 [`Room.databaseBuilder()`](https://developer.android.com/reference/androidx/room/Room#databasebuilder) 之间的交互。此段代码展示 [`ContentProvider.onCreate()`](https://developer.android.com/reference/android/content/ContentProvider#oncreate) 的实现，其中构建了数据库对象，并创建了数据访问对象的句柄：

```java
public class ExampleProvider extends ContentProvider

    // Defines a handle to the Room database
    private AppDatabase appDatabase;

    // Defines a Data Access Object to perform the database operations
    private UserDao userDao;

    // Defines the database name
    private static final String DBNAME = "mydb";

    public boolean onCreate() {

        // Creates a new database object.
        appDatabase = Room.databaseBuilder(getContext(), AppDatabase.class, DBNAME).build();

        // Gets a Data Access Object to perform the database operations
        userDao = appDatabase.getUserDao();

        return true;
    }

    ...

    // Implements the provider's insert method
    public Cursor insert(Uri uri, ContentValues values) {
        // Insert code here to determine which DAO to use when inserting data, handle error conditions, etc.
    }
}
```



## 实现内容提供程序 MIME 类型

`ContentProvider` 类拥有两个返回 MIME 类型的方法：

- `getType()`

  任何提供程序都须实现的一种必需方法。

- `getStreamTypes()`

  当提供程序提供文件时，系统要求您实现的方法。

### 表的 MIME 类型

`getType()` 方法会返回 MIME 格式的 `String`，后者描述内容 URI 参数返回的数据类型。`Uri` 参数可以是模式，而非特定的 URI；在此情况下，您应该返回与匹配该模式的内容 URI 相关联的数据类型。

对于文本、HTML 或 JPEG 等常见数据类型，`getType()` 应该为该数据返回标准的 MIME 类型。如需查看这些标准类型的完整列表，请访问 [IANA MIME Media Types](http://www.iana.org/assignments/media-types/index.htm) 网站。

对于指向一行或多行表数据的内容 URI，`getType()` 应该以 Android 供应商特有的 MIME 格式返回 MIME 类型：

- 类型部分：`vnd`

- 子类型部分：

  - 如果 URI 模式用于单个行：`android.cursor.**item**/`
  - 如果 URI 模式用于多个行：`android.cursor.**dir**/`

- 提供程序特有部分：`vnd.<name>.<type>`

  您提供`<name>`  和 `<type>`。`<name>` 值应具有全局唯一性，`<type>` 值应在对应的 URI 模式中具有唯一性。适合选择贵公司的名称或应用 Android 软件包名称的某个部分作为 `<name>`。适合选择 URI 关联表的标识字符串作为 `<type>`。

例如，如果提供程序的授权是 `com.example.app.provider`，并且它公开了名为 `table1` 的表，则 `table1` 中多个行的 MIME 类型为：

```
vnd.android.cursor.dir/vnd.com.example.provider.table1
```

对于 `table1` 的单个行，MIME 类型为：

```
vnd.android.cursor.item/vnd.com.example.provider.table1
```

### 文件的 MIME 类型

如果您的提供程序提供文件，请实现 `getStreamTypes()`。对于提供程序可以为给定内容 URI 返回的文件，该方法会为其返回 MIME 类型的 `String` 数组。您应通过 MIME 类型过滤器参数过滤您提供的 MIME 类型，以便仅返回客户端想处理的 MIME 类型。

例如，假设提供程序以 `.jpg`、`.png` 和 `.gif` 格式的文件形式提供照片图像。如果应用在调用 `ContentResolver.getStreamTypes()` 时使用过滤器字符串 `image/*`（任何“图像”内容），则 `ContentProvider.getStreamTypes()` 方法应返回数组：

```js
{ "image/jpeg", "image/png", "image/gif"}
```

如果应用只对 `.jpg` 文件感兴趣，则可以在调用 `ContentResolver.getStreamTypes()` 时使用过滤器字符串 `*\/jpeg`，并且 `ContentProvider.getStreamTypes()` 应返回：

```js
{"image/jpeg"}
```

如果您的提供程序未提供过滤器字符串中请求的任何 MIME 类型，则 `getStreamTypes()` 应返回 `null`。

## 实现协定类

协定类是一种 `public final` 类，其中包含对 URI、列名称、MIME 类型及其他与提供程序有关的元数据的常量定义。该类会确保即使 URI、列名称等数据的实际值发生变化，也能正确访问提供程序，进而在提供程序与其他应用之间建立协定。

协定类对开发者也有帮助，因为其常量通常采用助记名称，从而可降低开发者为列名称或 URI 使用错误值的可能性。由于它是一种类，因此可包含 Javadoc 文档。集成开发环境（如 Android Studio）可根据协定类自动完成常量名称，并为常量显示 Javadoc。

开发者无法从您的应用访问协定类的类文件，但他们可通过您提供的 `.jar` 文件将其静态编译到自己的应用内。

举例而言，`ContactsContract` 类及其嵌套类便属于协定类。

## 实现内容提供程序权限

[安全与权限](https://developer.android.com/guide/topics/security/security.html)主题中详细描述了 Android 系统各方面的权限和访问。[数据存储](https://developer.android.com/guide/topics/data/data-storage.html)主题也描述了各类存储实行中的安全与权限。其中的要点简述如下：

- 默认情况下，存储在设备内部存储上的数据文件是应用和提供程序的私有数据文件。
- 您创建的 `SQLiteDatabase` 数据库是应用和提供程序的私有数据库。
- 默认情况下，您保存到外部存储的数据文件是*公用*且*可全局读取*的数据文件。您无法使用内容提供程序来限制对外部存储内文件的访问，因为其他应用可使用其他 API 调用对这些文件执行读取和写入操作；
- 如果某个方法调用用于打开或创建设备内部存储的文件或 SQLite 数据库，则该调用可能会向所有其他应用同时授予读取和写入访问权限。如果您将内部文件或数据库用作提供程序的存储区，并向其授予“可全局读取”或“可全局写入”访问权限，则在清单文件中为提供程序设置的权限不会保护您的数据。在内部存储中，文件和数据库的默认访问权限是“私有”，并且您不应该为提供程序的存储区更改此权限。

如果您想使用内容提供程序权限来控制对数据的访问，则应将数据存储在内部文件、SQLite 数据库或“云”中（例如，远程服务器上），而且应保持文件和数据库为您的应用所私有。

### 实现权限

即使底层数据为私有数据，所有应用仍可读取提供程序的数据或向其写入数据，因为您的提供程序默认未设置权限。如要更改此情况，请使用属性或 `` 元素的子元素，在清单文件中为提供程序设置权限。您可以设置适用于整个提供程序、特定表甚至特定记录的权限，或者设置同时适用于这三者的权限。

您可以使用清单文件中的一个或多个 `` 元素，为提供程序定义权限。如要使权限对您的提供程序具有唯一性，请为 `android:name` 属性使用 Java 风格的作用域。例如，将读取权限命名为 `com.example.app.provider.permission.READ_PROVIDER`。

以下列表描述了提供程序权限的作用域，从适用于整个提供程序的权限开始，逐渐细化。相较于作用域较大的权限，越细化的权限拥有更高的优先级：

* 统一的读写提供程序级权限

一种同时控制对整个提供程序进行读取和写入访问的权限（通过 `` 元素的 `android:permission` 属性指定）。

* 单独的读写提供程序级权限

针对整个提供程序的读取权限和写入权限。您可以通过 `` 元素的 `android:readPermission` 属性和 `android:writePermission` 属性指定这些权限。这些权限优先于 `android:permission` 所需的权限。

* 路径级权限

针对提供程序中内容 URI 的读取、写入或读取/写入权限。您可以通过 `` 元素的 `` 子元素指定您想控制的每个 URI。您可以为指定的每个内容 URI 指定读取/写入权限、读取权限或写入权限，或同时指定这三种权限。读取权限和写入权限优先于读取/写入权限。此外，路径级权限优先于提供程序级权限。

* 临时权限

一种权限级别，即使应用没有通常需要的权限，该权限级别也能授予对应用的临时访问权限。临时访问功能可减少应用需在其清单文件中请求的权限数量。启用临时权限时，只有持续访问所有数据的应用才需要提供程序的“永久”访问权限。

假设您需要权限来实现电子邮件提供程序和应用，并且允许外部图像查看器应用显示您提供程序中的照片附件。为了在不请求权限的情况下为图像查看器提供必要的访问权限，您可以为照片的内容 URI 设置临时权限。您可以设计自己的电子邮件应用，以便该应用在用户想要显示照片时向图像查看器发送一个 Intent，其中包含照片的内容 URI 和权限标志。随后，图像查看器可查询您的电子邮件提供程序以检索照片，即使其没有对提供程序的正常读取权限也不受影响。

如要启用临时权限，请设置 `` 元素的 `android:grantUriPermissions` 属性，或者向您的 `` 元素添加一个或多个 `` 子元素。如果您使用临时权限，则每当从提供程序中为某个已关联临时权限的内容 URI 移除支持时，您都须调用 `Context.revokeUriPermission()`。

该属性的值决定了可访问的提供程序范围。如果将该属性设置为 `true`，则系统会向整个提供程序授予临时权限，进而替换提供程序级或路径级权限所需的任何其他权限。

如果将此标志设置为 `false`，则您必须向 `` 元素添加 `` 子元素。每个子元素都会指定被授予临时权限的一个或多个内容 URI。

如要向应用授予临时访问权限，Intent 必须包含 `FLAG_GRANT_READ_URI_PERMISSION` 和/或 `FLAG_GRANT_WRITE_URI_PERMISSION` 标志。您需使用 `setFlags()` 方法对其进行设置。

如果不存在 `android:grantUriPermissions` 属性，则假设其为 `false`。

## Provider 元素

与 `Activity` 和 `Service` 组件类似，您必须使用 `<provider>` 元素，在清单文件中为其应用定义 `ContentProvider` 的子类。Android 系统会从该元素获取以下信息：

- 授权 ([`android:authorities`](https://developer.android.com/guide/topics/manifest/provider-element.html#auth))

  用于在系统内标识整个提供程序的符号名称。如需了解有关此属性的更多详情，请参阅[设计内容 URI](https://developer.android.com/guide/topics/providers/content-provider-creating#ContentURI) 部分。

- 提供程序类名 (` android:name `)

  实现 `ContentProvider` 的类。如需了解有关此类的更多详情，请参阅[实现 ContentProvider 类](https://developer.android.com/guide/topics/providers/content-provider-creating#ContentProvider)。

- 权限

  以下属性会指定其他应用访问提供程序数据时所须的权限：

  * `android:grantUriPermssions`：临时权限标志。

  * `android:permission`：统一提供程序范围读取/写入权限。

  * `android:readPermission`：提供程序范围读取权限。

  * `android:writePermission`：提供程序范围写入权限。

    如需了解权限及其对应属性的更多详情，请参阅[实现内容提供程序权限](https://developer.android.com/guide/topics/providers/content-provider-creating#Permissions)部分。

- 启动和控制属性

  这些属性决定了 Android 系统启动提供程序的方式和时间、提供程序的进程特性以及其他运行时设置：

  * `android:enabled`：允许系统启动提供程序的标志。

  * `android:exported`：允许其他应用使用此提供程序的标志。

  * `android:initOrder`：在同一进程中，此提供程序相对于其他提供程序的启动顺序。

  * `android:multiProcess`：允许系统在与调用客户端相同的进程中启动提供程序的标志。

  * `android:process`：供提供程序运行的进程的名称。

  * `android:syncable`：指示提供程序的数据将与服务器上的数据进行同步的标志。

    如需了解这些属性的完整信息，请参阅开发指南的 `` 元素主题。

- 信息属性

  提供程序的可选图标和标签：

  * `android:icon`：包含提供程序图标的可绘制对象资源。该图标会出现在应用列表 (*Settings* > *Apps* > *All*) 提供程序的标签旁边。

  * `android:label`：描述提供程序和/或其数据的信息标签。该标签会出现在应用列表 (*Settings* > *Apps* > *All*) 中。

    如需了解这些属性的完整信息，请参阅开发指南的 `<provider>` 元素主题。

## Intent 和数据访问

应用可以通过 `Intent` 间接访问内容提供程序。应用不会调用 `ContentResolver` 或 `ContentProvider` 的任何方法。相反，应用会发送启动某个 Activity 的 Intent，该 Activity 通常是提供程序自有应用的一部分。目标 Activity 负责检索和显示应用界面中的数据。根据 Intent 中的操作，目标 Activity 可能还会提示用户对提供程序的数据进行修改。Intent 可能还包含目标 Activity 在应用界面所显示的“Extra”数据；用户随后可选择更改此数据，然后用其修改提供程序中的数据。

您可能希望使用 Intent 访问来帮助确保数据完整性。您的提供程序可能依靠根据严格定义的业务逻辑插入、更新和删除数据。在此情况下，允许其他应用直接修改您的数据可能会导致数据无效。如果您想让开发者使用 Intent 访问，请务必完整地记录此过程。向他们解释为什么使用自有应用界面的 Intent 访问要优于尝试通过代码修改数据的 Intent 访问。

处理希望修改提供程序数据的传入 Intent 与处理其他 Intent 没有任何区别。您可以阅读 [Intent 和 Intent 过滤器](https://developer.android.com/guide/components/intents-filters.html)主题，了解有关 Intent 用法的更多信息。

如需了解与此页面相关的示例代码，请参阅[记事本示例应用](https://developer.android.com/resources/samples/NotePad/index.html)。

如需了解更多相关信息，请参阅[日历提供程序](https://developer.android.com/guide/topics/providers/calendar-provider.html)。