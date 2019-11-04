# 迁移数据库

在应用程序中添加和更改功能时，需要修改实体类以反映这些更改。当用户更新到应用程序的最新版本时，您不希望他们丢失所有现有数据，尤其是当您无法从远程服务器恢复数据时。

[Room持久性库](https://developer.android.com/training/data-storage/room/index.html)允许你编写 [`Migration`](https://developer.android.com/reference/androidx/room/migration/Migration.html) 的类以这种方式保存用户数据。每个 [`Migration`](https://developer.android.com/reference/androidx/room/migration/Migration.html) 类指定一个`startVersion`和`endVersion`。在运行时，Room 使用正确的顺序运行每个 [`Migration`](https://developer.android.com/reference/androidx/room/migration/Migration.html) 类的 [`migrate()`](https://developer.android.com/reference/androidx/room/migration/Migration.html#migrate(android.arch.persistence.db.SupportSQLiteDatabase))方法，以将数据库迁移到更高版本。

```java
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

Room.databaseBuilder(getApplicationContext(), MyDb.class, "database-name")
        .addMigrations(MIGRATION_1_2, MIGRATION_2_3).build();
```

> **注意：**为使迁移逻辑按预期运行，请使用完整查询，而不要引用代表查询的常量。

迁移过程完成后，Room会验证`schema`，以确保正确进行了迁移。如果Room发现问题，它将引发包含不匹配信息的异常。

## 测试迁移

迁移并非易事，如果编写不正确，可能会导致应用程序崩溃。为了保持应用程序的稳定性，您应该事先测试迁移。Room提供了一个**测试** Maven工件，以协助完成此测试过程。但是，为了使该工件起作用，您需要导出数据库的架构。

## 导出 schemas

编译后，Room会将数据库的架构信息导出到JSON文件中。要导出模式，请在`build.gradle`文件中设置`room.schemaLocation`注释处理器属性，如以下代码片段所示：

```groovy
android {
    ...
    defaultConfig {
        ...
        javaCompileOptions {
            annotationProcessorOptions {
                arguments = ["room.schemaLocation":
                             "$projectDir/schemas".toString()]
            }
        }
    }
}
```

您应该将导出的JSON文件（代表数据库的架构历史记录）存储在版本控制系统中，因为它允许Room创建用于测试的较旧版本的数据库。

要测试这些迁移，请将 Room中的**android.arch.persistence.room:testing** Maven工件添加到测试依赖项中，然后将`schema`位置添加为资源文件夹，如以下代码片段所示：

```groo
android {
    ...
    sourceSets {
        androidTest.assets.srcDirs += files("$projectDir/schemas".toString())
    }
}
```

测试包提供了一个[`MigrationTestHelper`](https://developer.android.com/reference/androidx/room/testing/MigrationTestHelper.html) 类，该类可以读取这些`schema`文件。它还实现了JUnit4 [`TestRule`](http://junit.org/junit4/javadoc/4.12/org/junit/rules/TestRule.html)接口，因此可以管理创建的数据库。

```java
@RunWith(AndroidJUnit4.class)
public class MigrationTest {
    private static final String TEST_DB = "migration-test";

    @Rule
    public MigrationTestHelper helper;

    public MigrationTest() {
        helper = new MigrationTestHelper(InstrumentationRegistry.getInstrumentation(),
                MigrationDb.class.getCanonicalName(),
                new FrameworkSQLiteOpenHelperFactory());
    }

    @Test
    public void migrate1To2() throws IOException {
        SupportSQLiteDatabase db = helper.createDatabase(TEST_DB, 1);

        // db has schema version 1. insert some data using SQL queries.
        // You cannot use DAO classes because they expect the latest schema.
        db.execSQL(...);

        // Prepare for the next version.
        db.close();

        // Re-open the database with version 2 and provide
        // MIGRATION_1_2 as the migration process.
        db = helper.runMigrationsAndValidate(TEST_DB, 2, true, MIGRATION_1_2);

        // MigrationTestHelper automatically verifies the schema changes,
        // but you need to validate that the data was migrated properly.
    }
}
```

## 测试所有的迁移

上面的示例显示了如何测试从一个版本到另一个版本的增量迁移。但是，建议您进行一次贯穿所有迁移的测试。这种类型的测试对于捕获由数据库创建的与迁移路径相对于最近创建的路径之间的差异很有用。

以下代码段显示了所有迁移测试的示例：

```java
@RunWith(AndroidJUnit4.class)
public class MigrationTest {
    private static final String TEST_DB = "migration-test";

    @Rule
    public MigrationTestHelper helper;

    public MigrationTest() {
        helper = new MigrationTestHelper(InstrumentationRegistry.getInstrumentation(),
                AppDatabase.class.getCanonicalName(),
                new FrameworkSQLiteOpenHelperFactory());
    }

    @Test
    public void migrateAll() throws IOException {
        // Create earliest version of the database.
        SupportSQLiteDatabase db = helper.createDatabase(TEST_DB, 1);
        db.close();

        // Open latest version of the database. Room will validate the schema
        // once all migrations execute.
        AppDatabase appDb = Room.databaseBuilder(
                InstrumentationRegistry.getInstrumentation().getTargetContext(),
                AppDatabase.class,
                TEST_DB)
                .addMigrations(ALL_MIGRATIONS).build()
        appDb.getOpenHelper().getWritableDatabase();
        appDb.close();
    }

    // Array of all migrations
    private static final Migration[] ALL_MIGRATIONS = new Migration[]{
            MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4};
}
```

## 优雅地处理丢失的迁移路径

更新数据库的架构后，某些设备上的数据库仍可能仍使用较旧的架构版本。如果Room无法找到将设备数据库从旧版本升级到当前版本的迁移规则， 会发生[`IllegalStateException`](https://developer.android.com/reference/java/lang/IllegalStateException)。

为防止应用程序在这种情况下崩溃，请在创建数据库时调用`fallbackToDestructiveMigration()`builder方法：

```java
Room.databaseBuilder(getApplicationContext(), MyDb.class, "database-name")
        .fallbackToDestructiveMigration()
        .build();
```

通过将此子句包含在应用程序的数据库构建逻辑中，您可以指示Room在缺少架构版本之间的迁移路径的情况下以破坏性的方式重新创建应用程序的数据库表。

> **警告：**通过在应用程序的数据库构建器中配

这种毁灭性的重建备用逻辑包含几个附加项

- 如果您无法使用迁移路径解决的模式历史记录的特定版本中出现错误，请使用 [`fallbackToDestructiveMigrationFrom()`](https://developer.android.com/reference/androidx/room/RoomDatabase.Builder#fallbacktodestructivemigrationfrom)。此方法表明，仅在数据库尝试从这些有问题的版本之一迁移时，您才希望Room使用回退逻辑。
- 要仅在尝试降级架构时执行破坏性的重新创建，请改用[`fallbackToDestructiveMigrationOnDowngrade()`](https://developer.android.com/reference/androidx/room/RoomDatabase.Builder#fallbacktodestructivemigrationondowngrade) 。

## 升级到Room 2.2.0时处理列的默认值

room 2.2.0添加了对通过`@ColumnInfo(defaultValue = "...")`定义列默认值的支持。列的默认值是数据库`schema`和您的实体的重要组成部分，它在迁移期间由Room验证.果您的数据库是以前由Room 2.2.0之前的版本创建的，则可能需要为先前添加的默认值提供迁移。

例如，在数据库的版本1中，有一个`Song`这样声明的实体：

`Song`实体，数据库版本1，`Room`2.1.0

```java
@Entity
public class Song {
    @PrimaryKey
    final long id;
    final String title;
}
```

对于同一数据库的版本2，添加了新`NOT NULL`列：

`Song`实体，数据库版本2，`Room`2.1.0

```java
@Entity
public class Song {
    @PrimaryKey
    final long id;
    final String title;
    @NonNull
    final String tag; // added in version 2
}
```

从版本1迁移到2：

从1迁移到2，`Room`2.1.0

```java
static final Migration MIGRATION_1_2 = new Migration(1, 2) {
    @Override
    public void migrate(SupportSQLiteDatabase database) {
        database.execSQL(
            "ALTER TABLE Song ADD COLUMN tag TEXT NOT NULL DEFAULT ''");
    }
};
```

在2.2.0之前的Room版本中，这种类型的迁移是无害的，但是一旦Room升级并将默认值通过 `@ColumnInfo`添加到同一列，它将引起麻烦。通过使用`ALTER TABLE`，该实体`Song`将更改为不仅包含新列`tag`，而且还包含默认值。但是，2.2.0之前的Room版本没有意识到这种更改，从而导致具有全新安装的应用程序用户与从版本1迁移到版本2的用户之间的`schema`不匹配。具体而言，版本2将不包含默认值。

然后，对于这种情况，必须提供迁移，以便数据库模式在应用程序的各个用户之间保持一致，因为一旦在实体类中定义默认值后，Room 2.2.0便会对其进行验证。所需的迁移类型涉及：

- 使用声明实体类中的默认值`@ColumnInfo`。
- 将数据库版本增加一。
- 提供一种实现[删除和重新创建策略](https://www.sqlite.org/lang_altertable.html#otheralter)的迁移，该 [策略](https://www.sqlite.org/lang_altertable.html#otheralter) 允许将默认值添加到已创建的列中。

以下代码片段显示了一个迁移实现示例，该实现删除并重新创建了`Song`表：

从2迁移到3，Room 2.2.0

```java
static final Migration MIGRATION_2_3 = new Migration(2, 3) {
    @Override
    public void migrate(SupportSQLiteDatabase database) {
        database.execSQL("CREATE TABLE new_Song (" +
                "id INTEGER PRIMARY KEY NOT NULL," +
                "name TEXT," +
                "tag TEXT NOT NULL DEFAULT '')");
        database.execSQL("INSERT INTO new_Song (id, name, tag) " +
                "SELECT id, name, tag FROM Song");
        database.execSQL("DROP TABLE Song");
        database.execSQL("ALTER TABLE new_Song RENAME TO Song");
    }
};
```

> **注意：**如果数据库回退到破坏性迁移，或者您没有这样的迁移（可能已经添加了列和默认值），则不需要此迁移。