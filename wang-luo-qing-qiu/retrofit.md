# Retrofit

## 1.介绍

[Retrofit](http://square.github.io/retrofit/) 是一个类型安全的Java [Rest](http://zh.wikipedia.org/wiki/REST) 客户端，而且也适用于Android。

[Retrofit](http://square.github.io/retrofit/)可以将Rest Api转换为Java的接口。

`Retrofit`将HTTP API转换成一个Java接口。
```java
public interface GitHubService {
  @GET("/users/{user}/repos")
  List<Repo> listRepos(@Path("user") String user);
}
```

通过`Retrofit`类，可以创建`GithubService`的实例。

```java
Retrofit retrofit = new Retrofit.Builder()
    .baseUrl("https://api.github.com/")
    .build();

GitHubService service = retrofit.create(GitHubService.class);
```

接着就可以调用创建的GithubService的方法进行网络请求。

```java
List<Repo> repos = service.listRepos("octocat");
```

## 2.使用

### 2.1.请求方法

每一个方法必须有HTTP注解和关联的URL。Retrofit提供了五种内置的注解：`GET`,`POST`,`PUT`,`DELETE`,`HEAD`。在注解内指定相关的URL和资源。

```java
@GET("/users/list")
```

也可以在URL中指定查询参数。

```java
@GET("/users/list?sort=desc")
```

### 2.2.URL操作

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

### 2.3.发送原生数据

当你的请求参数是如下JSON字符串，可以使用`@Body`注解一个对象，`Retrofit`可以将对象转换为字符串

```text
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

### 2.4.表单提交和文件上传

使用`@FormUrlEncoded`可以进行表单提交。每一个包含名字和提供数据对象的键值对需要使用`@Field`进行注解。

```java
@FormUrlEncoded
@POST("user/edit")
Call<User> updateUser(@Field("first_name") String first, @Field("last_name") String last);
```

使用`@Multipart`注解，可以进行文件上传。`Parts`使用`@Part`进行注解。

```java
@Multipart
@PUT("user/photo")
Call<User> updateUser(@Part("photo") RequestBody photo, @Part("description") RequestBody description);
```

### 2.5.请求头

可以使用`@Headers`注解为方法设置一个请求头。

```java
@Headers("Cache-Control: max-age=640000")
@GET("widget/list")
Call<List<Widget>> widgetList();
```

添加多个请求头

```java
@Headers({
    "Accept: application/vnd.github.v3.full+json",
    "User-Agent: Retrofit-Sample-App"
})
@GET("users/{username}")
Call<User> getUser(@Path("username") String username);
```

请求头不会被互相覆盖，所有拥有相同名字的请求头都会被包含在请求里。

一个请求头可以使用`@Header`注解动态的更新，并且必须为`@Header`提供一个相应的字符串参数。如果值为空，请求头将被忽略。

```java
@GET("user")
Call<User> getUser(@Header("Authorization") String authorization)
```

和请求参数一样，对于复杂的请求头，可以使用`Map`。

```java
@GET("user")
Call<User> getUser(@HeaderMap Map<String, String> headers)
```

如果每个请求都有相同的请求头，可以使用OkHttp拦截器。


## 参考

* [理解RESTful架构](http://www.ruanyifeng.com/blog/2011/09/restful.html)
* [How to POST raw whole JSON in the body of a Retrofit request?](https://stackoverflow.com/questions/21398598/how-to-post-raw-whole-json-in-the-body-of-a-retrofit-request)
* [RESTful API 设计指南](http://www.ruanyifeng.com/blog/2014/05/restful_api.html)
* [Retrofit分析-漂亮的解耦套路](http://www.jianshu.com/p/45cb536be2f4)

