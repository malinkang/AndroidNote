# 测试数据库

使用[Room persistence库](https://developer.android.com/training/data-storage/room/index.html)创建数据库时，验证应用程序数据库和用户数据的稳定性很重要 。

有两种测试数据库的方法：

- 在Android设备上。
- 在您的主机开发机器上（不建议）。

有关特定于数据库迁移的测试的信息，请参阅“ [测试迁移”](https://developer.android.com/training/data-storage/room/migrating-db-versions.html#test)。

> **注意：**在为应用程序运行测试时，Room允许您创建[DAO](https://developer.android.com/training/data-storage/room/accessing-data.html)类的模拟实例。这样，如果您不测试数据库本身，则无需创建完整的数据库。之所以可以使用此功能，是因为您的DAO不会泄漏数据库的任何详细信息。

## 在Android设备上测试

建议的测试数据库实现的方法是编写在Android设备上运行的JUnit测试。因为这些测试不需要创建活动，所以它们的执行速度应该比UI测试更快。

设置测试时，应创建数据库的内存版本，以使测试更加封闭，如以下示例所示：

```java
@RunWith(AndroidJUnit4.class)
public class SimpleEntityReadWriteTest {
    private UserDao userDao;
    private TestDatabase db;

    @Before
    public void createDb() {
        Context context = ApplicationProvider.getApplicationContext();
        db = Room.inMemoryDatabaseBuilder(context, TestDatabase.class).build();
        userDao = db.getUserDao();
    }

    @After
    public void closeDb() throws IOException {
        db.close();
    }

    @Test
    public void writeUserAndReadInList() throws Exception {
        User user = TestUtil.createUser(3);
        user.setName("george");
        userDao.insert(user);
        List<User> byName = userDao.findUsersByName("george");
        assertThat(byName.get(0), equalTo(user));
    }
}
```

## 在您的主机上测试

Room使用SQLite支持库，该库提供与Android Framework类中的接口匹配的接口。此支持使您可以传递支持库的自定义实现，以测试数据库查询。

> **注意：**尽管此设置允许您的测试非常快速地运行，但不建议这样做，因为您的设备（以及用户的设备）上运行的SQLite版本可能与主机上的版本不匹配。