# Retrofit使用


## 1. 介绍

[Retrofit][Retrofit] 是一个类型安全的Java [Rest][Rest] 客户端，而且也适用于Android。

[Retrofit][Retrofit]可以将Rest Api转换为Java的接口。

```java

public interface GitHubService {
  @GET("/users/{user}/repos")
  List<Repo> listRepos(@Path("user") String user);
}

```
通过RestAdapter类，可以创建GithubService的实例。

```java
RestAdapter restAdapter = new RestAdapter.Builder()
    .setEndpoint("https://api.github.com")
    .build();

GitHubService service = restAdapter.create(GitHubService.class);
```
接着就可以调用创建的GithubService的方法进行网络请求。

```java
List<Repo> repos = service.listRepos("octocat");

```

##  2. 使用


### 2.1 请求方法

每一个方法必须有HTTP注解和关联的URL。Retrofit提供了五种内置的注解：`GET`,`POST`,`PUT`,`DELETE`,`HEAD`。在注解内指定相关的URL和资源。

```java

@GET("/users/list")

```
也可以在URL中指定查询参数。


```java

@GET("/users/list?sort=desc")

```

###  2.2 URL操作


通过动态的使用替换块和参数可以更新请求的URL。替换块是一个被`{`和`}`包裹的字符串。相应的请求参数必须被`@Path`使用相同的字符串进行注解。

```java
@GET("/group/{id}/users")
List<User> groupList(@Path("id") int groupId);

```
也可以添加查询参数。

```java
@GET("/group/{id}/users")
List<User> groupList(@Path("id") int groupId, @Query("sort") String sort);

```

复杂的查询参数组合可以使用一个`map`

```java

@GET("/group/{id}/users")
List<User> groupList(@Path("id") int groupId, @QueryMap Map<String, String> options);

```

### 2.3 发送原生数据

当你的请求参数是如下JSON字符串，可以使用`@Body`注解一个对象，`Retrofit`可以将对象转换为字符串

```
{"foo":"kit","bar":"kat"}

```
定义对象

```java

public class FooRequest {
  final String foo;
  final String bar;

  FooRequest(String foo, String bar) {
    this.foo = foo;
    this.bar = bar;
  }
}

```

使用`@Body`

```java
interface Foo {
  @POST("/jayson")
  FooResponse postJson(@Body FooRequest body);
}

```

如果你想直接发送一个JSON串，可以使用 `TypedByteArray`。

```java

String json = "{\"foo\":\"kit\",\"bar\":\"kat\"}";
TypedInput in = new TypedByteArray("application/json", json.getBytes("UTF-8"));
FooResponse response = foo.postRawJson(in);

```


### 2.4 表单提交和文件上传


使用`@FormUrlEncoded`可以进行表单提交。每一个包含名字和提供数据对象的键值对需要使用`@Field`进行注解。

```java

@FormUrlEncoded
@POST("/user/edit")
User updateUser(@Field("first_name") String first, @Field("last_name") String last);

```

使用`@Multipart`注解，可以进行文件上传。`Parts`使用`@Part`进行注解。


```java

@Multipart
@PUT("/user/photo")
User updateUser(@Part("photo") TypedFile photo, @Part("description") TypedString description);

```

### 2.5 请求头

可以使用`@Headers`注解为方法设置一个请求头。

```java
@Headers("Cache-Control: max-age=640000")
@GET("/widget/list")
List<Widget> widgetList();

```

添加多个请求头

```java

@Headers({
    "Accept: application/vnd.github.v3.full+json",
    "User-Agent: Retrofit-Sample-App"
})
@GET("/users/{username}")
User getUser(@Path("username") String username);

```
请求头不会被互相覆盖，所有拥有相同名字的请求头都会被包含在请求里。

一个请求头可以使用`@Header`注解动态的更新，并且必须为`@Header`提供一个相应的字符串参数。如果值为空，请求头将被忽略。

```java
@GET("/user")
void getUser(@Header("Authorization") String authorization, Callback<User> callback)

```

如果请求头需要被添加到所有的请求中，可以使用一个RequestInterceptor进行指定。在下面的代码中创建了一个`RequestInterceptor`，它为每一个请求都添加了一个`User-Agent`请求头。

```java
RequestInterceptor requestInterceptor = new RequestInterceptor() {
  @Override
  public void intercept(RequestFacade request) {
    request.addHeader("User-Agent", "Retrofit-Sample-App");
  }
};

RestAdapter restAdapter = new RestAdapter.Builder()
  .setEndpoint("https://api.github.com")
  .setRequestInterceptor(requestInterceptor)
  .build();

```

###  2.6 同步和异步加载

可以声明方法是同步执行还是异步执行。

带有返回值类型的方法将被同步执行。

```java
@GET("/user/{id}/photo")
Photo getUserPhoto(@Path("id") int id);

```

异步执行要求方法的最后一个参数是`Callback`，反省类型为请求的返回值，如果没有返回值或者不需要对返回值进行处理可以设置成`Callback<Void>`

```java
@GET("/user/{id}/photo")
void getUserPhoto(@Path("id") int id, Callback<Photo> cb);

```


在android中，`callbacks`在主线程中被执行。对于桌面应用，回调和执行HTTP请求在同一线程中。

Retrofit集成了RxJava，允许方法返回一个`rx.Observable`类型。

```Java
@GET("/user/{id}/photo")
Observable<Photo> getUserPhoto(@Path("id") int id);

```

Observable请求被异步的订阅并且在执行HTTP请求的线程中被观察。如果希望在不同的线程中观察，调用`observeOn(Scheduler)`返回`Observable`。

###  2.7 返回数据类型

如果你的接口返回的是JSON数据类型，`RestAdapter`会自动转换为方法声明的或者CallBack和Observable中指定的对象。如果是XML或其它数据类型，则需要自定义`RestAdapter`转换器。关于如何自定义`RestAdapter`转换器，将在下面的文章中讲到。

```java

@GET("/users/list")
List<User> userList();

@GET("/users/list")
void userList(Callback<List<User>> cb);

@GET("/users/list")
Observable<List<User>> userList();

```

如果不希望返回值被处理成指定的类型，则可以通过在方法返回值声明、CallBack以及Observable中使用`Response`对象来实现。

```java

@GET("/users/list")
Response userList();

@GET("/users/list")
void userList(Callback<Response> cb);

@GET("/users/list")
Observable<Response> userList();

```

##  3. RestAdapter 配置

除了使用Retrofit提供的默认RestAdapter以外，我们还可以进行设置转换器和设置客户端等自定义操作


### 3.1 设置自定义转换器

Retrofit使用未进行任何配置的GSON来转换数据，如果希望使用经过GsonBuilder配置过的Gson，需要创建一个新的GsonConvert。

```java

Gson gson = new GsonBuilder()
    .setFieldNamingPolicy(FieldNamingPolicy.LOWER_CASE_WITH_UNDERSCORES)
    .registerTypeAdapter(Date.class, new DateTypeAdapter())
    .create();

RestAdapter restAdapter = new RestAdapter.Builder()
    .setEndpoint("https://api.github.com")
    .setConverter(new GsonConverter(gson))
    .build();

GitHubService service = restAdapter.create(GitHubService.class);

```

如果请求返回值是XML或者`Protocol Buffers`格式，Retrofit也提供了XML和`Protocol Buffers`格式的转换器。


下面的代码演示了如何使用`SimpleXMLConvert`。

```java
RestAdapter restAdapter = new RestAdapter.Builder()
    .setEndpoint("https://api.soundcloud.com")
    .setConverter(new SimpleXMLConverter())
    .build();

SoundCloudService service = restAdapter.create(SoundCloudService.class);

```

`ProtoConverter`使用

```java

RestAdapter restAdapter = new RestAdapter.Builder()
    .setEndpoint("https://api.example.com")
    .setConverter(new ProtoConverter())
    .build();

```


如果你需要使用Retrofit不提供的内容格式来进行数据交换或者你想使用其他的库来转换已经存在的格式，可以通过实现Convert接口创建自己的转换器。

### 3.2 自定义错误处理

提供自定义的`ErrorHandler`可以自定义错误处理，下面的代码中演示了当返回401如何抛出一个自定义异常。

```java

class MyErrorHandler implements ErrorHandler {
  @Override public Throwable handleError(RetrofitError cause) {
    Response r = cause.getResponse();
    if (r != null && r.getStatus() == 401) {
      return new UnauthorizedException(cause);
    }
    return cause;
  }
}

RestAdapter restAdapter = new RestAdapter.Builder()
    .setEndpoint("https://api.github.com")
    .setErrorHandler(new MyErrorHandler())
    .build();


```

### 3.3设置Log


`RestAdapter`可以通过setLogLevel方法配置Log的级别，打印不同的Log信息。Retrofit提供了`BASIC`,`FULL`,`HEADERS`和`NONE`等四种Log过滤条件。

```java

RestAdapter restAdapter = new RestAdapter.Builder()
    .setLogLevel(RestAdapter.LogLevel.FULL)
    .setEndpoint("https://api.github.com")
    .build();


```

[Retrofit]: http://square.github.io/retrofit/
[Rest]: http://zh.wikipedia.org/wiki/REST
[retrofit-converters]: https://github.com/square/retrofit/tree/master/retrofit-converters

# 扩展阅读

* [理解RESTful架构](http://www.ruanyifeng.com/blog/2011/09/restful.html)

* [RESTful API 设计指南](http://www.ruanyifeng.com/blog/2014/05/restful_api.html)

* [A smart way to use Retrofit](http://blog.robinchutaux.com/blog/a-smart-way-to-use-retrofit/)


* [How Can I POST Raw Whole Json in the body of a Retrofit request?](http://stackoverflow.com/questions/21398598/how-can-i-post-raw-whole-json-in-the-body-of-a-retrofit-request)

