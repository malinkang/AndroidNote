# Table of contents

* [Introduction](README.md)
* 应用数据和文件
  * [数据和文件存储概览](data-storage/data-storage.md)
  * 将文件保存在设备存储空间中
    * [将文件保存在内部存储中](data-storage/files/internal.md)
    * [将文件保存到外部存储中](data-storage/files/external.md)
  * 将数据保存到本地数据库
    * [概览](data-storage/room/room.md)
    * [使用实体定义数据库](data-storage/room/defining-data.md)
    * [定义对象之间的关系](data-storage/room/relationships.md)
    * [在数据库中创建视图](data-storage/room/creating-views.md)
    * [使用Room DAO访问数据](data-storage/room/accessing-data.md)
    * [引用复杂数据](data-storage/room/referencing-data.md)
  * [保存键值对数据](data-storage/shared-preferences.md)
  * 内容提供程序
    * [内容提供程序基础知识](data-storage/providers/content-provider-basics.md)
    * [创建内容提供程序](data-storage/providers/content-provider-creating.md)
* 连接性
    * 使用Volley传输数据	
        * [概览](connectivity/volley/volley.md)
        * [发送简单请求](connectivity/volley/simple.md)
        * [设置RequestQueue](connectivity/volley/requestqueue.md)
        * [发送标准请求](connectivity/volley/request.md)
        * [实现自定义请求](connectivity/volley/request-custom.md)
        * [Volley源码分析](connectivity/volley/source.md)
    * OkHttp
        * [Okhttp源码分析](connectivity/okhttp/source.md)
    * Retrofit
        * [Retrofit使用](connectivity/retrofit/retrofit.md)
        * [Retrofit源码分析](connectivity/retrofit/source.md)
