# 内容提供程序基础知识

内容提供程序管理对中央数据存储区的访问。提供程序是 Android 应用的一部分，通常提供自己的界面来使用数据。但是，内容提供程序主要旨在供其他应用使用，这些应用使用提供程序客户端对象来访问提供程序。提供程序与提供程序客户端共同提供一致的标准数据界面，该界面还可处理跨进程通信并保护数据访问的安全性。

通常，您可以在以下两种场景中任择其一使用内容提供程序：通过实现代码来访问其他应用中的现有内容提供程序；或者在应用中创建新的内容提供程序，进而与其他应用共享数据。本主题介绍使用现有内容提供程序的基础知识。如要详细了解如何在自己的应用中实现内容提供程序，请参阅[创建内容提供程序](https://developer.android.com/guide/topics/providers/content-provider-creating.html)。

本主题介绍以下内容：

- 内容提供程序的工作方式。
- 用于从内容提供程序检索数据的 API。
- 用于在内容提供程序中插入、更新或删除数据的 API。
- 其他有助于使用提供程序的 API 功能。



## 概览

内容提供程序以一个或多个表的形式将数据呈现给外部应用，这些表与在关系型数据库中找到的表类似。行表示提供程序收集的某种数据类型实例，行中的每个列表示为实例所收集的每条数据。

内容提供程序为协调许多不同的 API 和组件对应用数据存储层的访问（如图 1 所示），其中包括：

- 与其他应用共享对应用数据的访问
- 向微件发送数据
- 使用 `SearchRecentSuggestionsProvider`，通过搜索框架返回应用的自定义搜索建议
- 使用 `AbstractThreadedSyncAdapter` 的实现，以同步服务器中的应用数据
- 使用 `CursorLoader` 加载界面中的数据

![**图 1.** 内容提供程序与其他组件的关系。](./images/content-provider-tech-stack.png)

### 访问提供程序

如要访问内容提供程序中的数据，您可以客户端的形式使用应用的 `Context` 中的 `ContentResolver` 对象，从而与提供程序进行通信。`ContentResolver` 对象会与提供程序对象（即实现 `ContentProvider` 的类实例）进行通信。提供程序对象从客户端接收数据请求、执行请求的操作并返回结果。此对象的某些方法可调用提供程序对象（`ContentProvider` 某个具体子类的实例）中的同名方法。`ContentResolver` 方法可提供持续存储的基本“CRUD”（创建、检索、更新和删除）功能。

从界面访问 `ContentProvider` 的常用模式会通过使用 `CursorLoader`，在后台运行异步查询。界面中的 `Activity` 或 `Fragment` 会调用查询的 `CursorLoader`，其转而使用 `ContentResolver` 来获取 `ContentProvider`。如此一来，用户便可在查询运行时继续使用界面。如图 2 所示，此模式涉及许多不同对象的交互，以及底层存储机制。

![content-provider-interaction](./images/content-provider-interaction.png)

Android 平台的内置提供程序之一是用户字典，其用于存储用户想要保存的非标准字词的拼写。表 1 描述数据在此提供程序表中的显示情况：

| 字词        | 应用 id | 频率 | 语言区域 | _ID  |
| ----------- | ------- | ---- | -------- | ---- |
| mapreduce   | user1   | 100  | en_US    | 1    |
| precompiler | user14  | 200  | fr_FR    | 2    |
| applet      | user2   | 225  | fr_CA    | 3    |
| const       | user1   | 255  | pt_BR    | 4    |
| int         | user5   | 100  | en_UK    | 5    |

在表 1 中，每行表示可能无法在标准词典中找到的字词实例。每列表示该字词的一些数据，如该字词首次出现时的语言区域。列标题是存储在提供程序中的列名称。如要引用行的语言区域，您需引用其 `locale` 列。对于此提供程序，`_ID` 列充当由提供程序自动维护的“主键”列。

如要从用户字典提供程序中获取字词及其语言区域的列表，您需调用 `ContentResolver.query()`。`query()` 方法会调用用户字典提供程序所定义的 `ContentProvider.query()` 方法。以下代码行展示如何调用 `ContentResolver.query()`：

```java
// Queries the user dictionary and returns results
cursor = getContentResolver().query(
    UserDictionary.Words.CONTENT_URI,   // The content URI of the words table
    projection,                        // The columns to return for each row
    selectionClause,                   // Selection criteria
    selectionArgs,                     // Selection criteria
    sortOrder);                        // The sort order for the returned rows
```

表 2 展示 `query(Uri,projection,selection,selectionArgs,sortOrder)` 的参数如何匹配 SQL SELECT 语句

| query() 参数    | SELECT 关键字/参数                                          | 备注                                                         |
| --------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| `Uri`           | `FROM *table_name*`                                         | `Uri` 映射至名为 *table_name* 的提供程序中的表。             |
| `projection`    | `*col,col,col,...*`                                         | `projection` 是一个数组，其中包含应为检索到的每个行加入的列。 |
| `selection`     | `WHERE *col* = *value*`                                     | `selection` 会指定选择行的条件。                             |
| `selectionArgs` | （没有完全等效项。选择参数会替换选择子句中的 `?` 占位符。） |                                                              |
| `sortOrder`     | `ORDER BY *col,col,...*`                                    | `sortOrder` 指定行在返回的 `Cursor` 中的显示顺序。           |

### 内容 URI

**内容 URI** 是用于在提供程序中标识数据的 URI。内容 URI 包括整个提供程序的符号名称（其**授权**）和指向表的名称（**路径**）。当您调用客户端方法来访问提供程序中的表时，该表的内容 URI 将是其参数之一。

在前面的代码行中，常量 `CONTENT_URI` 包含用户字典“words”表的内容 URI。`ContentResolver` 对象会分析出 URI 的授权，并将该授权与已知提供程序的系统表进行比较，从而“解析”提供程序。然后，`ContentResolver` 可以将查询参数分派给正确的提供程序。

`ContentProvider` 使用内容 URI 的路径部分来选择要访问的表。通常，提供程序会为其公开的每个表显示一条**路径**。

在前面的代码行中，“words”表的完整 URI 是：

```
content://user_dictionary/words
```

其中，`user_dictionary` 字符串是提供程序的授权，`words` 字符串是表的路径。字符串 `content://`（**架构**）始终显示，并且会将其标识为内容 URI。

许多提供程序均允许您将 ID 值追加至 URI 末尾，从而访问表中的单个行。例如，如要从用户字典中检索 `_ID` 为 `4` 的行，您可以使用此内容 URI：

```java
Uri singleUri = ContentUris.withAppendedId(UserDictionary.Words.CONTENT_URI,4);
```

在检索到一组行并且想要更新或删除其中某一行时，您通常会使用 ID 值。

> **注意：**`Uri` 和 `Uri.Builder` 类包含一些便捷方法，可用于根据字符串构建格式规范的 URI 对象。`ContentUris` 类包含一些便捷方法，可用于将 ID 值轻松追加至 URI。前段代码使用 `withAppendedId()` 将 ID 追加至 UserDictionary 内容 URI。

## 从提供程序检索数据

本部分将以用户字典提供程序为例，介绍如何从提供程序中检索数据。

为进行明确说明，本部分中的代码段将在“界面线程”上调用 `ContentResolver.query()`。但在实际代码中，您应在单独的线程上异步执行查询。执行此操作的其中一种方法是使用 `CursorLoader` 类，[加载器](https://developer.android.com/guide/components/loaders.html)指南中对此有更为详细的介绍。此外，前述代码行仅为部分代码，并未显示整个应用。

如要从提供程序检索数据，请按照以下基本步骤执行操作：

1. 请求对提供程序的读取访问权限。
2. 定义将查询发送至提供程序的代码。

### 请求读取访问权限

如要从提供程序检索数据，您的应用需具备对提供程序的“读取访问权限”。您无法在运行时请求此权限；相反，您需要使用  `<uses-permission>`元素和提供程序定义的准确权限名称，在清单文件中指明您需要此权限。在清单文件中指定此元素后，您便可有效地为应用“请求”此权限。在安装您的应用时，用户会隐式授予此请求。

如要为正在使用的提供程序找出读取访问权限的准确名称，以及提供程序所用其他访问权限的名称，请查看提供程序的文档。

如需详细了解权限在访问提供程序过程中的作用，请参阅[内容提供程序权限](https://developer.android.com/guide/topics/providers/content-provider-basics#Permissions)部分。

用户字典提供程序在其清单文件中定义了 `android.permission.READ_USER_DICTIONARY` 权限，因此若应用希望从提供程序中读取数据，则其必须请求此权限。

### 构建查询

从提供程序检索数据的下一步是构建查询。第一个代码段定义某些用于访问用户字典提供程序的变量：

```java
// A "projection" defines the columns that will be returned for each row
String[] mProjection =
{
    UserDictionary.Words._ID,    // Contract class constant for the _ID column name
    UserDictionary.Words.WORD,   // Contract class constant for the word column name
    UserDictionary.Words.LOCALE  // Contract class constant for the locale column name
};

// Defines a string to contain the selection clause
String selectionClause = null;

// Initializes an array to contain selection arguments
String[] selectionArgs = {""};
```

下一段代码以用户字典提供程序为例，展示如何使用 `ContentResolver.query()`。提供程序客户端查询与 SQL 查询类似，并且包含一组要返回的列、一组选择条件和排序顺序。

查询应返回的列集称为**投影**（变量 `mProjection`）。

对于指定待检索行的表达式，我们将其拆分为选择子句和选择参数。选择子句是逻辑和布尔表达式、列名称以及值（变量 `mSelectionClause`）的组合。如果您指定可替换参数 `?` 而非值，则查询方法会从选择参数数组（变量 `mSelectionArgs`）中检索值。

在下一段代码中，如果用户未输入字词，则选择子句将设置为 `null`，而且查询会返回提供程序中的所有字词。如果用户输入字词，则选择子句将设置为 `UserDictionary.Words.WORD + " = ?"`，并且选择参数数组的第一个元素将设置为用户输入的字词。

```java
/*
 * This defines a one-element String array to contain the selection argument.
 */
String[] selectionArgs = {""};

// Gets a word from the UI
searchString = searchWord.getText().toString();

// Remember to insert code here to check for invalid or malicious input.

// If the word is the empty string, gets everything
if (TextUtils.isEmpty(searchString)) {
    // Setting the selection clause to null will return all words
    selectionClause = null;
    selectionArgs[0] = "";

} else {
    // Constructs a selection clause that matches the word that the user entered.
    selectionClause = UserDictionary.Words.WORD + " = ?";

    // Moves the user's input string to the selection arguments.
    selectionArgs[0] = searchString;

}

// Does a query against the table and returns a Cursor object
mCursor = getContentResolver().query(
    UserDictionary.Words.CONTENT_URI,  // The content URI of the words table
    projection,                       // The columns to return for each row
    selectionClause,                  // Either null, or the word the user entered
    selectionArgs,                    // Either empty, or the string the user entered
    sortOrder);                       // The sort order for the returned rows

// Some providers return null if an error occurs, others throw an exception
if (null == mCursor) {
    /*
     * Insert code here to handle the error. Be sure not to use the cursor! You may want to
     * call android.util.Log.e() to log this error.
     *
     */
// If the Cursor is empty, the provider found no matches
} else if (mCursor.getCount() < 1) {

    /*
     * Insert code here to notify the user that the search was unsuccessful. This isn't necessarily
     * an error. You may want to offer the user the option to insert a new row, or re-type the
     * search term.
     */

} else {
    // Insert code here to do something with the results

}
```

此查询与 SQL 语句类似：

```sqlite
SELECT _ID, word, locale FROM words WHERE word = <userinput> ORDER BY word ASC;
```

在此 SQL 语句中，会使用实际的列名称而非协定类常量。

#### 防止恶意输入

如果内容提供程序管理的数据位于 SQL 数据库，则在原始 SQL 语句中加入不受信任的外部数据可能会导致 SQL 注入。

考虑此选择子句：

```java
// Constructs a selection clause by concatenating the user's input to the column name
String selectionClause = "var = " + userInput;
```

若执行此操作，则会允许用户将恶意 SQL 连接至 SQL 语句。例如，用户可以为 `mUserInput` 输入“nothing; DROP TABLE *;”，从而生成选择子句 `var = nothing; DROP TABLE *;`。由于选择子句是作为 SQL 语句处理的，因此这可能会导致提供程序清空基础 SQLite 数据库中的所有表（除非提供程序设置为可捕获 [SQL 注入](http://en.wikipedia.org/wiki/SQL_injection)尝试）。

如要避免此问题，请使用将 `?` 作为可替换参数的选择子句，以及单独的选择参数数组。执行此操作时，用户输入直接受查询约束，而不解释为 SQL 语句的一部分。由于用户输入未作为 SQL 处理，因此其无法注入恶意 SQL。请使用以下选择子句（而非连接）加入用户输入：

```java
// Constructs a selection clause with a replaceable parameter
String selectionClause =  "var = ?";
```

按如下所示设置选择参数数组：

```java
// Defines an array to contain the selection arguments
String[] selectionArgs = {""};
```

按如下所示将值放入选择参数数组：

```java
// Sets the selection argument to the user's input
selectionArgs[0] = userInput;
```

如要指定选择，首选方式是使用将 `?` 用作可替换参数的选择子句和选择参数数组（即使提供程序并未基于 SQL 数据库）。

### 显示查询结果

`ContentResolver.query()` 客户端方法始终会返回符合以下条件的 `Cursor`：包含查询的投影为匹配查询选择条件的行所指定的列。`Cursor` 对象提供对其所含行和列的随机读取访问权限。通过使用 `Cursor` 方法，您可以循环访问结果中的行、确定每列的数据类型、从列中获取数据，并检查结果的其他属性。某些 `Cursor` 实现会在提供程序的数据发生更改时自动更新对象，并/或在 `Cursor` 更改时触发观察程序对象中的方法。

>  **注意：**提供程序可能会根据发出查询的对象的性质来限制对列的访问。例如，联系人提供程序会限定只有同步适配器才能访问某些列，因此不会将这些列返回至 Activity 或服务。

如果没有与选择条件匹配的行，提供程序会返回 `Cursor.getCount()` 为 0（空游标）的 `Cursor` 对象。

如果出现内部错误，查询结果会视具体提供程序而定。它可能会选择返回 `null`，或抛出 `Exception`。

由于 `Cursor` 是行“列表”，因此显示 `Cursor` 内容的一个好方法是通过 `SimpleCursorAdapter` 将其与 `ListView` 关联。

以下代码段延续上段代码。它会创建一个 `SimpleCursorAdapter` 对象（其中包含查询所检索到的 `Cursor`），并将此对象设置为 `ListView` 的适配器：

```java
// Defines a list of columns to retrieve from the Cursor and load into an output row
String[] wordListColumns =
{
    UserDictionary.Words.WORD,   // Contract class constant containing the word column name
    UserDictionary.Words.LOCALE  // Contract class constant containing the locale column name
};

// Defines a list of View IDs that will receive the Cursor columns for each row
int[] wordListItems = { R.id.dictWord, R.id.locale};

// Creates a new SimpleCursorAdapter
cursorAdapter = new SimpleCursorAdapter(
    getApplicationContext(),               // The application's Context object
    R.layout.wordlistrow,                  // A layout in XML for one row in the ListView
    mCursor,                               // The result from the query
    wordListColumns,                      // A string array of column names in the cursor
    wordListItems,                        // An integer array of view IDs in the row layout
    0);                                    // Flags (usually none are needed)

// Sets the adapter for the ListView
wordList.setAdapter(cursorAdapter);
```

> **注意：**如要通过 `Cursor` 支持 `ListView`，则游标必须包含名为 `_ID` 的列。正因如此，即使 `ListView` 未显示 `_ID` 列，前文显示的查询也会为“words”表检索该类列。此限制也解释了为何大多数提供程序的每个表均拥有 `_ID` 列。

### 从查询结果中获取数据

您可以将查询结果用于其他任务，而非简单地显示查询结果。例如，您可以从用户字典中检索拼写，然后在其他提供程序中查找这些拼写。如要执行此操作，您需在 `Cursor` 中循环访问行：

```java
// Determine the column index of the column named "word"
int index = mCursor.getColumnIndex(UserDictionary.Words.WORD);

/*
 * Only executes if the cursor is valid. The User Dictionary Provider returns null if
 * an internal error occurs. Other providers may throw an Exception instead of returning null.
 */

if (mCursor != null) {
    /*
     * Moves to the next row in the cursor. Before the first movement in the cursor, the
     * "row pointer" is -1, and if you try to retrieve data at that position you will get an
     * exception.
     */
    while (mCursor.moveToNext()) {

        // Gets the value from the column.
        newWord = mCursor.getString(index);

        // Insert code here to process the retrieved word.

        ...

        // end of while loop
    }
} else {

    // Insert code here to report an error if the cursor is null or the provider threw an exception.
}
```

`Cursor` 实现包含多个“获取”方法，用于从对象中检索不同类型的数据。例如，上一段代码使用 `getString()`。这些实现还拥有 `getType()` 方法，用于返回指示列的数据类型的值。

## 内容提供程序权限

提供程序的应用可以指定其他应用的必需权限，以便其访问提供程序的数据。这些权限可确保用户了解应用将尝试访问哪些数据。根据提供程序的要求，其他应用会请求其访问提供程序时所需的权限。最终用户会在安装应用时看到所请求的权限。

如果提供程序的应用未指定任何权限，则其他应用将无权访问提供程序的数据。但是，无论指定权限为何，提供程序的应用组件始终拥有完整的读取和写入访问权限。

如前文所述，用户字典提供程序需使用 `android.permission.READ_USER_DICTIONARY` 权限从中检索数据。提供程序拥有单独的 `android.permission.WRITE_USER_DICTIONARY` 权限，可用于插入、更新或删除数据。

如要获取访问提供程序所需的权限，应用需通过其清单文件中的 `` 元素来请求这些权限。当 Android 软件包管理器安装应用时，用户必须批准该应用请求的所有权限。如果用户批准所有权限，软件包管理器将继续安装；如果用户未批准这些权限，软件包管理器将中止安装。

以下 `<uses-permission>` 元素会请求对用户字典提供程序的读取访问权限：

```xml
<uses-permission android:name="android.permission.READ_USER_DICTIONARY">
```

[安全与权限](https://developer.android.com/guide/topics/security/security.html)指南详细介绍了权限对提供程序访问的影响。

## 插入、更新和删除数据

与从提供程序检索数据的方式相同，您也可通过提供程序客户端和提供程序 `ContentProvider` 之间的交互来修改数据。您可以使用传递至 `ContentProvider` 对应方法的参数，调用 `ContentResolver` 的方法。提供程序和提供程序客户端会自动处理安全性和跨进程通信。

### 插入数据

如要将数据插入提供程序，您可以调用 `ContentResolver.insert()` 方法。此方法会在提供程序中插入新行，并为该行返回内容 URI。此段代码显示如何将新字词插入用户字典提供程序：

```java
// Defines a new Uri object that receives the result of the insertion
Uri newUri;

...

// Defines an object to contain the new values to insert
ContentValues newValues = new ContentValues();

/*
 * Sets the values of each column and inserts the word. The arguments to the "put"
 * method are "column name" and "value"
 */
newValues.put(UserDictionary.Words.APP_ID, "example.user");
newValues.put(UserDictionary.Words.LOCALE, "en_US");
newValues.put(UserDictionary.Words.WORD, "insert");
newValues.put(UserDictionary.Words.FREQUENCY, "100");

newUri = getContentResolver().insert(
    UserDictionary.Words.CONTENT_URI,   // the user dictionary content URI
    newValues                          // the values to insert
);
```

新行的数据会进入单个 `ContentValues` 对象，该对象在形式上与单行游标类似。此对象中的列无需拥有相同的数据类型，如果您不想指定值，则可以使用 `ContentValues.putNull()` 将列设置为 `null`。

此段代码不会添加 `_ID` 列，因为系统会自动维护此列。提供程序会向添加的每个行分配唯一的 `_ID` 值。通常，提供程序会将此值用作表的主键。

`newUri` 中返回的内容 URI 会按以下格式标识新添加的行：

```java
content://user_dictionary/words/<id_value>
```

`<id_value>` 是新行 `_ID` 的内容。大多数提供程序可自动检测这种格式的内容 URI，然后在该特定行上执行请求的操作。

如要从返回的 `Uri` 中获取 `_ID` 的值，请调用 `ContentUris.parseId()`。

### 更新数据

如要更新行，请按执行插入的方式使用拥有更新值的 `ContentValues` 对象，并按执行查询的方式使用选择条件。您使用的客户端方法是 `ContentResolver.update()`。您只需将值添加至待更新列的 `ContentValues` 对象。如果您要清除列的内容，请将值设置为 `null`。

以下代码段会将语言区域拥有语言“en”的所有行的语言区域更改为 `null`。返回值是已更新的行数：

```java
// Defines an object to contain the updated values
ContentValues updateValues = new ContentValues();

// Defines selection criteria for the rows you want to update
String selectionClause = UserDictionary.Words.LOCALE +  " LIKE ?";
String[] selectionArgs = {"en_%"};

// Defines a variable to contain the number of updated rows
int rowsUpdated = 0;

...

/*
 * Sets the updated value and updates the selected words.
 */
updateValues.putNull(UserDictionary.Words.LOCALE);

rowsUpdated = getContentResolver().update(
    UserDictionary.Words.CONTENT_URI,   // the user dictionary content URI
    updateValues,                      // the columns to update
    selectionClause,                   // the column to select on
    selectionArgs                      // the value to compare to
);
```

您还应在调用 `ContentResolver.update()` 时检查用户输入。如需了解有关此内容的更多信息，请阅读[防止恶意输入](https://developer.android.com/guide/topics/providers/content-provider-basics#Injection)部分。

### 删除数据

删除行与检索行数据类似：为要删除的行指定选择条件，而客户端方法会返回已删除的行数。以下代码段会删除 appid 与“user”匹配的行。该方法会返回已删除行的数量。

```java
// Defines selection criteria for the rows you want to delete
String selectionClause = UserDictionary.Words.APP_ID + " LIKE ?";
String[] selectionArgs = {"user"};

// Defines a variable to contain the number of rows deleted
int rowsDeleted = 0;

...

// Deletes the words that match the selection criteria
rowsDeleted = getContentResolver().delete(
    UserDictionary.Words.CONTENT_URI,   // the user dictionary content URI
    selectionClause,                   // the column to select on
    selectionArgs                      // the value to compare to
);
```

您还应在调用 `ContentResolver.delete()` 时检查用户输入。如需了解有关此内容的更多信息，请阅读[防止恶意输入](https://developer.android.com/guide/topics/providers/content-provider-basics#Injection)部分。

## 提供程序数据类型

内容提供程序可以提供多种不同的数据类型。用户字典提供程序仅提供文本，但提供程序也能提供以下格式：

- 整型
- 长整型（长）
- 浮点型
- 长浮点型（双精度）

提供程序经常使用的另一种数据类型是作为 64KB 字节的数组实现的二进制大型对象 (BLOB)。您可以查看 `Cursor` 类的“获取”方法，从而查看可用数据类型。

提供程序文档通常都会列出其每个列的数据类型。用户字典提供程序协定类 `UserDictionary.Words` 参考文档中列有其数据类型（如需了解详细介绍，请参阅[协定类](https://developer.android.com/guide/topics/providers/content-provider-basics#ContractClasses)部分）。您也可通过调用 `Cursor.getType()` 来确定数据类型。

提供程序还会为其定义的每个内容 URI 维护 MIME（多用途互联网邮件扩展）数据类型信息。您可以使用 MIME 类型信息查明应用是否可处理提供程序提供的数据，或根据 MIME 类型选择处理类型。在使用包含复杂数据结构或文件的提供程序时，您通常需要 MIME 类型。例如，联系人提供程序中的 `ContactsContract.Data` 表会使用 MIME 类型来标记每行中存储的联系人数据类型。如要获取与内容 URI 对应的 MIME 类型，请调用 `ContentResolver.getType()`。

[MIME 类型引用](https://developer.android.com/guide/topics/providers/content-provider-basics#MIMETypeReference)部分介绍了标准和自定义 MIME 类型的语法。

## 提供程序访问的替代形式

在应用开发过程中，提供程序访问的三种替代形式十分重要：

- [批量访问](https://developer.android.com/guide/topics/providers/content-provider-basics#Batch)：您可以使用 `ContentProviderOperation` 类中的方法创建一批访问调用，然后通过 `ContentResolver.applyBatch()` 应用这些调用。
- 异步查询：您应在单独的线程中执行查询。执行此操作的其中一种方法是使用 `CursorLoader` 对象。[加载器](https://developer.android.com/guide/components/loaders.html)指南中的示例展示了如何执行此操作。
- [通过 Intent 访问数据](https://developer.android.com/guide/topics/providers/content-provider-basics#Intents)：尽管您无法直接向提供程序发送 Intent，但您可以向提供程序的应用发送 Intent，后者通常是修改提供程序数据的最佳手段。

下文将介绍通过 Intent 进行批量访问和修改。

### 批量访问

批量访问提供程序适用于插入大量行，或通过同一方法调用在多个表中插入行，或者通常用于以事务（原子操作）的形式跨进程边界执行一组操作。

如要在“批量模式”下访问提供程序，您可以创建 `ContentProviderOperation` 对象数组，然后使用 `ContentResolver.applyBatch()` 将其分派给内容提供程序。您需向此方法传递内容提供程序的[*授权*](https://developer.android.com/guide/topics/manifest/provider-element.html#auth)，而非特定的内容 URI。如此一来，数组中的每个 `ContentProviderOperation` 对象都能适用于其他表。调用 `ContentResolver.applyBatch()` 会返回结果数组。

`ContactsContract.RawContacts` 协定类的说明包含展示批量注入的代码段。[联系人管理器](https://developer.android.com/resources/samples/ContactManager/index.html)示例应用包含在其 `ContactAdder.java` 源文件中进行批量访问的示例。

### 通过 Intent 访问数据

Intent 可以提供对内容提供程序的间接访问。即使应用没有访问权限，您也可通过以下方式允许用户访问提供程序中的数据：从拥有权限的应用中获取回结果 Intent，或者通过激活拥有权限的应用并允许用户使用该应用。

#### 通过临时权限获取访问权限

即使没有适当的访问权限，您也可通过以下方式访问内容提供程序中的数据：将 Intent 发送至拥有权限的应用，然后收回包含“URI”权限的结果 Intent。以下是特定内容 URI 的权限，其将持续至接收该权限的 Activity 结束。拥有永久权限的应用会在结果 Intent 中设置标记，从而授予临时权限：

- **读取权限：**`FLAG_GRANT_READ_URI_PERMISSION`
- **写入权限：**`FLAG_GRANT_WRITE_URI_PERMISSION`

> **注意：**如果内容 URI 中包含提供程序的授权，则这些标记不提供对提供程序的常规读取或写入访问权限。访问权限仅适用于 URI 本身。

提供程序通过使用 `` 元素的 `android:grantUriPermission` 属性和 `` 元素的 `` 子元素，在其清单文件中定义内容 URI 的 URI 权限。[权限概览](https://developer.android.com/guide/topics/permissions/overview#uri)指南更加详细地说明了 URI 权限机制。

例如，即使没有 `READ_CONTACTS` 权限，您也可在联系人提供程序中检索联系人的数据。您可能希望在向联系人发送电子生日祝福的应用中执行此操作。相较于通过请求 `READ_CONTACTS` 来访问用户的所有联系人及其信息，您可能更愿意让用户控制应用所使用的联系人。为此，您需完成以下过程：

1. 您的应用会使用 `startActivityForResult()` 方法发送包含 `ACTION_PICK` 操作和 `CONTENT_ITEM_TYPE`“联系人”MIME 类型的 Intent。
2. 由于此 Intent 与“联系人”应用“选择”Activity 的 Intent 过滤器相匹配，因此 Activity 会显示在前台。
3. 在选择 Activity 中，用户会选择要更新的联系人。发生此情况时，选择 Activity 会调用 `setResult(resultcode, intent)`，以设置用于返回至应用的 Intent。Intent 包含用户所选联系人的内容 URI，以及“extra”标记 `FLAG_GRANT_READ_URI_PERMISSION`。这些标记会为您的应用授予 URI 权限，以便读取内容 URI 所指向联系人的数据。然后，选择 Activity 会调用 `finish()`，将控制权交还给您的应用。
4. 您的 Activity 会返回至前台，并且系统会调用此 Activity 的 `onActivityResult()` 方法。此方法会收到“联系人”应用中选择 Activity 所创建的结果 Intent。
5. 通过来自结果 Intent 的内容 URI，您可以读取来自联系人提供程序的联系人数据，即使您未在清单文件中请求对该提供程序的永久读取访问权限。您可以获取联系人的生日信息或其电子邮件地址，然后发送电子祝福。

#### 使用其他应用

如要让用户修改您无权访问的数据，一种简单方法是激活拥有权限的应用，并让用户使用该应用。

例如，日历应用会接受 `ACTION_INSERT` Intent 对象，以便您激活应用的插入界面。您可以在此 Intent（应用会使用该 Intent 来预填充界面）中传递“extra”数据。由于周期性事件的语法较为复杂，因此如要将事件插入日历提供程序，首选方法是激活拥有 `ACTION_INSERT` 的日历应用，然后让用户在该应用中插入事件。

#### 使用帮助程序应用显示数据

如果您的应用*拥有*访问权限，您可能仍想使用 Intent 对象在其他应用中显示数据。例如，日历应用可接受显示特定日期或事件的 `ACTION_VIEW` Intent 对象。如此一来，您便可显示日历信息，而无需创建自己的界面。如要了解有关此功能的更多信息，请参见[日历提供程序](https://developer.android.com/guide/topics/providers/calendar-provider.html)指南。

如果您要向某应用发送 Intent，该应用无需与提供程序进行关联。例如，您可以从联系人提供程序中检索联系人，然后向图像查看器发送 `ACTION_VIEW` Intent（包含用于联系人图像的内容 URI）。

## 协定类

协定类可定义一些常量，帮助应用使用内容 URI、列名称、Intent 操作以及内容提供程序的其他功能。提供程序不会自动包含协定类，因此提供程序的开发者需定义这些类，并将其提供给其他开发者。Android 平台中的许多提供程序在 `android.provider` 软件包中均拥有对应的协定类。

例如，用户字典提供程序拥有包含内容 URI 和列名称常量的协定类 `UserDictionary`。常量 `UserDictionary.Words.CONTENT_URI` 中定义了“words”表的内容 URI。`UserDictionary.Words` 类也包含列名称常量，本指南的示例代码段中便使用了该常量。例如，查询投影可定义为：

```java
String[] projection =
{
    UserDictionary.Words._ID,
    UserDictionary.Words.WORD,
    UserDictionary.Words.LOCALE
};
```

联系人提供程序的 `ContactsContract` 也是一个协定类。此类的参考文档包含示例代码段。该类的其中一个子类 `ContactsContract.Intents.Insert` 是包含 Intent 和 Intent 数据常量的协定类。

## MIME 类型引用

内容提供程序可以返回标准 MIME 媒体类型和/或自定义 MIME 类型字符串。

MIME 类型拥有以下格式

```
type/subtype
```

例如，众所周知的 MIME 类型 `text/html` 拥有 `text` 类型和 `html` 子类型。如果提供程序为 URI 返回此类型，这意味着使用该 URI 的查询会返回包含 HTML 标记的文本。

自定义 MIME 类型字符串（也称为“特定于供应商”的 MIME 类型）拥有更复杂的*类型*和*子类型*值。*类型*值始终为

```java
vnd.android.cursor.dir
```

（多行）或

```
vnd.android.cursor.item
```

（单行）。

*子类型*特定于提供程序。Android 内置提供程序通常拥有简单的子类型。例如，当“通讯录”应用为电话号码创建行时，它会在行中设置以下 MIME 类型：

```
vnd.android.cursor.item/phone_v2
```

请注意，子类型值只是 `phone_v2`。

其他提供程序开发者可能会根据提供程序的授权和表名称创建自己的子类型模式。例如，假设提供程序包含列车时刻表。提供程序的授权是 `com.example.trains`，并包含表 Line1、Line2 和 Line3。在响应表 Line1 的内容 URI

```
content://com.example.trains/Line1
```

时，提供程序会返回 MIME 类型

```
vnd.android.cursor.dir/vnd.example.line1
```

在响应表 Line2 中第 5 行的内容 URI

```
content://com.example.trains/Line2/5
```

时，提供程序会返回 MIME 类型

```
vnd.android.cursor.item/vnd.example.line2
```

大多数内容提供程序都会为其使用的 MIME 类型定义协定类常量。例如，联系人提供程序协定类 `ContactsContract.RawContacts` 会为单个原始联系人行的 MIME 类型定义常量 `CONTENT_ITEM_TYPE`。

[内容 URI](https://developer.android.com/guide/topics/providers/content-provider-basics#ContentURIs) 部分介绍了单个行的内容 URI。