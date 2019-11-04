# 定义对象之间的关系

由于SQLite是关系数据库，因此您可以指定对象之间的关系。即使大多数对象关系映射库都允许实体对象相互引用，但Room明确禁止这样做。要了解此决策背后的技术原因，请参阅[了解Room为什么不允许对象引用](https://developer.android.com/training/data-storage/room/referencing-data.html#understand-no-object-references)。

## 定义一对多关系

即使您不能使用直接关系，Room仍允许您定义实体之间的外键约束。

例如，如果还有一个名为的实体`Book`，则可以`User`使用[`@ForeignKey`](https://developer.android.com/reference/androidx/room/ForeignKey.html) 注释定义其与实体的 关系，如以下代码片段所示：

```java
@Entity(foreignKeys = @ForeignKey(entity = User.class,
                                  parentColumns = "id",
                                  childColumns = "user_id"))
public class Book {
    @PrimaryKey public int bookId;

    public String title;

    @ColumnInfo(name = "user_id") public int userId;
}
```

零个或多个`Book`实例可以通过`user_id`外键链接到的单个`User`实例 ，因此这将模拟`User`和`Book`之间的一对多关系。

外键非常强大，因为它们允许您指定在更新引用的实体时发生什么。例如，您可以通过在 [`@ForeignKey`](https://developer.android.com/reference/androidx/room/ForeignKey.html) 批注中包含[`onDelete = CASCADE`](https://developer.android.com/reference/androidx/room/ForeignKey.html#onDelete()) 包括来告诉SQLite如果的相应`user`实例已删除为用户删除所有书籍。

> **注意：**SQLite处理 [`@Insert(onConflict = REPLACE)`](https://developer.android.com/reference/androidx/room/OnConflictStrategy.html#REPLACE) 为一组`REMOVE`和`REPLACE`操作，而不是单个`UPDATE` 操作。这种替换冲突值的方法可能会影响您的外键约束。有关更多详细信息，请参见[SQLite文档](https://sqlite.org/lang_conflict.html)中的 `ON_CONFLICT`子句。

## 创建嵌套对象

有时，即使对象或数据对象包含多个字段，您也希望将其表示为数据库逻辑中的内聚整体。在这种情况下，您可以使用 [`@Embedded`](https://developer.android.com/reference/androidx/room/Embedded.html) 批注表示要分解为表的子字段的对象。然后，您可以查询嵌入字段，就像查询其他各个列一样。

例如，你的`User`类可以包括类型的字段`Address`，它代表的命名字段组成`street`，`city`，`state`，和 `postCode`。要将组成的列分别存储在表中，请`Address`在`User`类中包含一个用[`@Embedded`](https://developer.android.com/reference/androidx/room/Embedded.html)注释 的 字段，如以下代码片段所示：

```java
public class Address {
    public String street;
    public String state;
    public String city;

    @ColumnInfo(name = "post_code") public int postCode;
}

@Entity
public class User {
    @PrimaryKey public int id;

    public String firstName;

    @Embedded public Address address;
}
```

表示该表`User`对象则包含以下名称的列：`id`，`firstName`，`street`，`state`，`city`，和`post_code`。

> **注意：**嵌入字段也可以包括其他嵌入字段。

如果一个实体具有多个相同类型的嵌入式字段，则可以通过设置[`prefix`](https://developer.android.com/reference/androidx/room/Embedded.html#prefix()) 属性来使每一列保持唯一 。然后，Room将提供的值添加到嵌入对象中每个列名称的开头。

## 定义多对多关系

您通常需要在关系数据库中建模另一种关系：两个实体之间的多对多关系，其中每个实体可以链接到另一个的零个或多个实例。例如，考虑一个音乐流应用程序，用户可以在其中将自己喜欢的歌曲整理到播放列表中。每个播放列表可以具有任意数量的歌曲，并且每首歌曲可以包含在任意数量的播放列表中。

要对此关系建模，您将需要创建三个对象：

1. 播放列表的实体类。
2. 歌曲的实体类。
3. 一个中间类，用于保存有关每个播放列表中哪些歌曲的信息。

您可以将实体类定义为独立的单元：

```java
@Entity
public class Playlist {
    @PrimaryKey public int id;

    public String name;
    public String description;
}

@Entity
public class Song {
    @PrimaryKey public int id;

    public String songName;
    public String artistName;
}
```

这产生了一个多对多关系模型，该模型允许您使用DAO来按歌曲查询播放列表和按播放列表查询歌曲：

```java
@Entity(tableName = "playlist_song_join",
        primaryKeys = { "playlistId", "songId" },
        foreignKeys = {
                @ForeignKey(entity = Playlist.class,
                            parentColumns = "id",
                            childColumns = "playlistId"),
                @ForeignKey(entity = Song.class,
                            parentColumns = "id",
                            childColumns = "songId")
                })
public class PlaylistSongJoin {
    public int playlistId;
    public int songId;
}
```

这产生了一个多对多关系模型，该模型允许您使用DAO来按歌曲查询播放列表和按播放列表查询歌曲：

```java
@Dao
public interface PlaylistSongJoinDao {
    @Insert
    void insert(PlaylistSongJoin playlistSongJoin);

    @Query("SELECT * FROM playlist " +
           "INNER JOIN playlist_song_join " +
           "ON playlist.id=playlist_song_join.playlistId " +
           "WHERE playlist_song_join.songId=:songId")
    List<Playlist> getPlaylistsForSong(final int songId);

    @Query("SELECT * FROM song " +
           "INNER JOIN playlist_song_join " +
           "ON song.id=playlist_song_join.songId " +
           "WHERE playlist_song_join.playlistId=:playlistId")
    List<Song> getSongsForPlaylist(final int playlistId);
}
```

