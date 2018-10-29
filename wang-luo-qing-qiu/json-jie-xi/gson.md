# Gson

[Gson](https://github.com/google/gson)是Google开发的能够将对象转化为Json并且能够将Json转化为对象的Java库。

## 1.基本使用

使用Android Studio，我们可以使用Gradle进行构建:

```text
compile 'com.google.code.gson:gson:2.7'
```

Gson提供了两个方法fromJson\(\) 和toJson\(\) 进行反序列化和序列化。

### 1.1基本数据类型

反序列化操作

```java
Gson gson = new Gson();
gson.fromJson("abc", String.class);//abc
gson.fromJson("0123", int.class);//123
gson.fromJson("false", boolean.class);//false
gson.fromJson("0.123", float.class);//0.123
```

序列化操作

```java
Gson gson = new Gson();
gson.toJson("abc");//"abc"
gson.toJson(0xa);//10
gson.toJson(false);//false
gson.toJson(0.123);//0.123
```

### 1.2对象

```java
public String name;
public int age;
public String emailAddress;
public User(String name, int age, String emailAddress) {
    this.name = name;
    this.age = age;
    this.emailAddress = emailAddress;
}
@Override
public String toString() {
    return "User{" +
            "name='" + name + '\'' +
            ", age=" + age +
            ", emailAddress='" + emailAddress + '\'' +
            '}';
}

Gson gson = new Gson();
String json=gson.toJson(new User("mlk",26,"test@qq.com"));
System.out.println(json);//{"name":"mlk","age":26,"emailAddress":"test@qq.com"}
System.out.println(gson.fromJson(json,User.class));
//User{name='mlk', age=26, emailAddress='test@qq.com'}
```

默认情况下，对象字段的名字和json的key是相同的。但某些时候给定的json的key的命名并不是我们想要的，比如给定的json字符串是这样的：

```javascript
{"name":"mlk","age":26,"email_address":"test@qq.com"}
```

可以看到`email_address`并不符合我们Java中的驼峰命名规则，这样我们需要借助一个注解`@SerializedName`来实现我们想要的结果。

`@SerializedName`用来指定json序列化的名字。

```java
@SerializedName(value = "email_address")
public String emailAddress;
```

```java
Gson gson = new Gson();
String json="{\"name\":\"mlk\",\"age\":26,\"email_address\":\"test@qq.com\"}";
User user = gson.fromJson(json,User.class);
System.out.println(user);//User{name='mlk', age=26, emailAddress='test@qq.com'}
System.out.println(gson.toJson(user));//{"name":"mlk","age":26,"email_address":"test@qq.com"}
```

`@SerializedName`还提供了另外一个属性`alternate` 接收一个数组，当匹配到value值或者数组中的任意一个即可。

```java
@SerializedName(value = "email",alternate = {"emailAddress","email_address"})
public String emailAddress;
```

```java
Gson gson = new Gson();
String json="{\"name\":\"mlk\",\"age\":26,\"email\":\"test@qq.com\"}";
User user = gson.fromJson(json,User.class);
System.out.println(user);//User{name='mlk', age=26, emailAddress='test@qq.com'}
System.out.println(gson.toJson(user));
//注意这里序列化的结果
//{"name":"mlk","age":26,"email":"test@qq.com"}
```

当多个同时出现，以最后一个为准。

```java
Gson gson = new Gson();
String json="{\"name\":\"mlk\",\"age\":26,\"email\":\"test@qq.com\",\"email_address\":\"test2@qq.com\"}";
User user = gson.fromJson(json,User.class);
System.out.println(user);//User{name='mlk', age=26, emailAddress='test@qq.com'}
System.out.println(gson.toJson(user));
//{"name":"mlk","age":26,"email":"test@qq.com"}
```

### 1.3数组的序列化和反序列化

```java
Gson gson = new Gson();
String[] array = {"abc","def","hij"};
String json =gson.toJson(array);
System.out.println(json);
String[] array2 = gson.fromJson(json,String[].class);
System.out.println(Arrays.toString(array2));
//[abc, def, hij]
```

### 1.4 集合

使用集合，涉及到泛型我们就不能像上面一样`gson.fromJson(json,List<String>.class)`来解析json，因为对于Java来说List和List这俩个的字节码文件都是List.class。 为了解决的上面的问题，Gson为我们提供了TypeToken来实现对泛型的支持，所以当我们希望使用将以上的数据解析为List时需要这样写。

```java
Gson gson = new Gson();
ArrayList<String> arrayList = new ArrayList<>();
arrayList.add("acb");
arrayList.add("def");
arrayList.add("ghi");
String json =gson.toJson(arrayList);//["acb","def","ghi"]
System.out.println(json);
//TypeToken的构造方法是protected修饰的 所以要这样写
List<String> list= gson.fromJson(json,new TypeToken<List<String>>(){}.getType());
System.out.println(list);
//[abc, def, hij]
```

## 2.流解析

Gson还支持流解析，通过这种方式不需要把整个json串加载到内存中，可以边加载边解析效率更高。

序列化：

```java
String json = "{\"name\":\"mlk\",\"age\":27,\"emailAddress\":\"test@qq.com\"}";
JsonReader jsonReader = new JsonReader(new StringReader(json));
jsonReader.beginObject();
String name=null;
int age=0;
String emailAddress=null;
while (jsonReader.hasNext()){
    switch (jsonReader.nextName()){
        case "name":
            name = jsonReader.nextString();
            break;
        case "age":
            age = jsonReader.nextInt();
            break;
        case "emailAddress":
            emailAddress = jsonReader.nextString();
            break;
    }
}
jsonReader.endObject();
System.out.println(new User(name,age,emailAddress));
//User{name='mlk', age=27, emailAddress='test@qq.com'}
```

反序列化

```java
JsonWriter writer = new JsonWriter(new OutputStreamWriter(System.out));
writer.beginObject()
        .name("name").value("mlk")
        .name("age").value(27)
        .name("emailAddress").nullValue()//
        .endObject();
writer.flush();
//{"name":"mlk","age":27,"emailAddress":null}
```

## 3.自定义配置

一般情况下Gson类提供的API已经能满足大部分的使用场景，但我们需要更多更特殊、更强大的功能时，这时候就引入一个新的类GsonBuilder。GsonBuilder用于构建一个自定义的Gson对象。

```java
Gson gson = new GsonBuilder().create();
```

### 3.1Null

默认情况下，null值将被忽略。

```java
Gson gson = new Gson();
User user = new User("mlk",27,null);
System.out.println(gson.toJson(user));//{"name":"mlk","age":27}
```

如果我们想要输出null的话，使用如下配置即可：

```java
Gson gson = new GsonBuilder().serializeNulls().create();
```

### 3.2时间日期格式化

我们给User增加一个Date类型的字段birthday。

```java
public Date birthday;
```

默认情况下进行序列化得到的字符串如下，代码就不给出了。

```javascript
{
  "name": "mlk",
  "age": 27,
  "emailAddress": "test@qq.com",
  "birthday": "Sep 1, 2016 2:08:22 PM"
}
```

如果我们想要得到birthday是我们自己想要的格式比`yyyy年MM月dd日`，要怎么做呢。GsonBuilder为我们提供了一个`setDateFormat()`方法，允许我们自己设置规则。

```java
Gson gson = new GsonBuilder()
        .setDateFormat("yyyy年MM月dd日")
        .create();
String json = gson.toJson(new User("mlk", 27, "test@qq.com", new Date()));
System.out.println(json);
//{"name":"mlk","age":27,"emailAddress":"test@qq.com","birthday":"2016年09月01日"}
User user = gson.fromJson(json, User.class);
System.out.println(new SimpleDateFormat("yyyy年MM月dd日").format(user.birthday));
//2016年09月01日
```

### 3.3设置字段映射规则

上面例子已经提到使用@SerializedName注解字段名的映射规则。GsonBuilder提供了setFieldNamingPolicy接收一个枚举FieldNamingPolicy，来设置字段的映射规则。

```java
Gson gson = new GsonBuilder().setFieldNamingPolicy(FieldNamingPolicy.IDENTITY).create();
System.out.println(gson.toJson(new User("mlk", 27, "test@qq.com", new Date())));
//{"name":"mlk","age":27,"emailAddress":"test@qq.com","birthday":"Sep 1, 2016 3:42:50 PM"}
gson = new GsonBuilder().setFieldNamingPolicy(FieldNamingPolicy.LOWER_CASE_WITH_DASHES).create();
System.out.println(gson.toJson(new User("mlk", 27, "test@qq.com", new Date())));
//{"name":"mlk","age":27,"email-address":"test@qq.com","birthday":"Sep 1, 2016 3:42:50 PM"}
gson = new GsonBuilder().setFieldNamingPolicy(FieldNamingPolicy.LOWER_CASE_WITH_UNDERSCORES).create();
System.out.println(gson.toJson(new User("mlk", 27, "test@qq.com", new Date())));
//{"name":"mlk","age":27,"email_address":"test@qq.com","birthday":"Sep 1, 2016 3:43:28 PM"}
gson = new GsonBuilder().setFieldNamingPolicy(FieldNamingPolicy.UPPER_CAMEL_CASE).create();
System.out.println(gson.toJson(new User("mlk", 27, "test@qq.com", new Date())));
//{"Name":"mlk","Age":27,"EmailAddress":"test@qq.com","Birthday":"Sep 1, 2016 3:44:23 PM"}
gson = new GsonBuilder().setFieldNamingPolicy(FieldNamingPolicy.UPPER_CAMEL_CASE_WITH_SPACES).create();
System.out.println(gson.toJson(new User("mlk", 27, "test@qq.com", new Date())));
//{"Name":"mlk","Age":27,"Email Address":"test@qq.com","Birthday":"Sep 1, 2016 3:44:23 PM"}
```

此外GsonBuilder还提供了一个setFieldNamingStrategy方法接收一个FieldNamingStrategy类型。

```java
Gson gson = new GsonBuilder().setFieldNamingStrategy(new FieldNamingStrategy() {
    @Override
    public String translateName(Field field) {
        return field.getName().toUpperCase();
    }
}).create();
System.out.println(gson.toJson(new User("mlk", 27, "test@qq.com", new Date())));
//{"NAME":"mlk","AGE":27,"EMAILADDRESS":"test@qq.com","BIRTHDAY":"Sep 1, 2016 3:49:03 PM"}
```

FieldNamingPolicy也实现了FieldNamingStrategy接口，所以也可一个给setFieldNamingStrategy方法传入一个FieldNamingPolicy对象。

@SerializedName注解拥有最高优先级，在加有@SerializedName注解的字段上FieldNamingStrategy不生效。

### 3.4其他配置

GsonBuilder还提供了许多其他的配置：

```java
Gson gson = new GsonBuilder()
            .serializeNulls()//允许null
            .setDateFormat("yyyy年MM月dd日")//设置时间格式
            .setPrettyPrinting()//json格式化
            .disableHtmlEscaping()//禁止转义html标签
            .disableInnerClassSerialization()//禁止序列化内部类
            //生成不可执行的Json会在json串前添加)]}'四个字符
            .generateNonExecutableJson()
            .create();
```

这里就不一一举例说明了。

## 4.字段过滤

在实际的开发中，Model中定义的一些字段可能不需要序列化，所以我们需要想办法来过滤这些字段。常用的字段过滤的方法包括：

* 使用@Expose注解
* 基于版本
* 基于访问修饰符
* 基于策略

### 4.1@Expose

@Expose用于暴露字段。@Expose有两个属性deserialize和serialize，值为boolean值，当deserialize设置为true的时候反序列化时暴露，反之则不暴露。serialize同理。

```java
@Expose (deserialize = false)public String name;
@Expose(serialize = false) public int age;
@Expose public String emailAddress;
public Date birthday; // deserialize = false serialize= false
```

使用直接new Gson\(\)的方式，@Expose不会生效，需要调用GsonBuilder的方法来构建Gson。

```java
Gson gson = new GsonBuilder()
        .excludeFieldsWithoutExposeAnnotation()
        .create();
System.out.println(gson.toJson(new User("mlk", 27, "test@qq.com", new Date())));
//{"name":"mlk","emailAddress":"test@qq.com"}
String json = "{\"name\":\"mlk\",\"age\":20,\"emailAddress\":\"test@qq.com\"}";
User user = gson.fromJson(json, User.class);
System.out.println(user);
//User{name='null', age=20, emailAddress='test@qq.com', birthday=null}
```

### 4.2版本支持

Gson提供了两个注解 @Since和@Until,@Since和@Until都接收一个Double值。我们通过GsonBuilder的setVersion\(\)方法来设置版本号。@Since用于设置开始的版本号，@Until用于设置截止的版本号。只有当版本号大于等于@Since指定的版本号，小于@Until指定的版本号才进行序列化。

```java
@Since(1) @Until(5) public String name;
@Since(1) @Until(3) public int age;
@Since(2) @Until(4) public String emailAddress;
public Date birthday;
```

```java
Gson gson = new GsonBuilder()
        .setVersion(4)
        .setDateFormat("yyyy年MM月dd日")
        .create();
System.out.println(gson.toJson(new User("mlk", 27, "test@qq.com", new Date())));
//{"name":"mlk","emailAddress":"test@qq.com"}
String json = "{\"name\":\"mlk\",\"age\":20,\"emailAddress\":\"test@qq.com\"}";
User user = gson.fromJson(json, User.class);
System.out.println(user);
//User{name='mlk', age=0, emailAddress='null', birthday=null}
```

### 4.3基于修饰符进行过滤

GsonBuilder提供方法excludeFieldsWithModifiers，向该方法传入指定的修饰符，即可过滤掉相应修饰符修饰的字段。

```java
class ModifierSample {
    final String finalField = "final";
    static String staticField = "static";
    public String publicField = "public";
    protected String protectedField = "protected";
    String defaultField = "default";
    private String privateField = "private";
}
```

```java
ModifierSample modifierSample = new ModifierSample();
Gson gson = new GsonBuilder()
        .excludeFieldsWithModifiers(Modifier.FINAL, Modifier.STATIC, Modifier.PRIVATE)
        .create();
System.out.println(gson.toJson(modifierSample));
//{"publicField":"public","protectedField":"protected","defaultField":"default"}
```

### 4.4自定义规则

除了上述3种方式之外，Gson还允许我们自定义规则来过滤字段。我们定义规则只需要通过实现ExclusionStrategy接口即可。GsonBuilder的两个方法addSerializationExclusionStrategy和addDeserializationExclusionStrategy用于添加序列化和反序列化的规则。

```java
Gson gson = new GsonBuilder().addSerializationExclusionStrategy(new ExclusionStrategy() {
    @Override
    public boolean shouldSkipField(FieldAttributes fieldAttributes) {
        return "name".equals(fieldAttributes.getName());//过滤字段名为name的字段
    }

    @Override
    public boolean shouldSkipClass(Class<?> aClass) {
        return aClass == int.class;//过滤掉int类型的值
    }
}).create();

System.out.println(gson.toJson(new User("mlk", 27, "test@qq.com", new Date())));
//{"emailAddress":"test@qq.com","birthday":"Sep 1, 2016 3:26:11 PM"}
```

## 5.自定义序列化和反序列化

### 5.1 JsonSerializer与JsonDeserializer

在上面的例子中我们通过@SerializedName来改变映射规则。除此之外，我们还可以通过自定义我们自己的Serializer和Deserializer来实现相同的结果。

```javascript
public class User {
    public String name;
    public int age;
    public String emailAddress;

    public User(String name, int age, String emailAddress) {
        this.name = name;
        this.age = age;
        this.emailAddress = emailAddress;
    }
}

public class UserSerializer implements JsonSerializer<User> {
    @Override
    public JsonElement serialize(User user, Type type, JsonSerializationContext jsonSerializationContext) {
        JsonObject jsonObject = new JsonObject();
        jsonObject.addProperty("name",user.name);
        jsonObject.addProperty("email_address",user.emailAddress);
        jsonObject.addProperty("age",user.age);
        return jsonObject;
    }
}
public class UserDeserializer implements JsonDeserializer<User> {
    @Override
    public User deserialize(JsonElement jsonElement, Type type, JsonDeserializationContext jsonDeserializationContext) throws JsonParseException {
        //将element转换为JsonObject
        JsonObject jsonObject = jsonElement.getAsJsonObject();
        String name = jsonObject.get("name").getAsString();
        String emailAddress = jsonObject.get("email_address").getAsString();
        int age = jsonObject.get("age").getAsInt();
        User user = new User(name,age,emailAddress);
        return user;
    }
}
Gson gson = new GsonBuilder()
        .registerTypeAdapter(User.class,new UserSerializer())
        .registerTypeAdapter(User.class,new UserDeserializer())
        .create();
String json = gson.toJson(new User("mlk", 27, "test@qq.com"));
System.out.println(json);
//  {"name":"mlk","email_address":"test@qq.com","age":27}
System.out.println(gson.fromJson(json,User.class));
```

这里我们要特别说明一下JsonElement这个类。JsonElement代表一个Json元素。JsonElement有如下子类。

* JsonPrimitive：基本类型。
* JsonObject：代表一个对象。
* JsonArray：代表一个数组
* JsonNull：一个空值

  ```javascript
  {//JsonObject
  "primitive": 123,//JsonPrimitivte
  "null": null,//JsonNull
  "array": [//JsonArray
    "abc",
    "def",
    "ghi"
  ]
  }
  ```

### 5.2 TypeAdapter

JsonSerializer 和JsonDeserializer解析的时候都利用到了一个中间件-JsonElement。而TypeAdapter的使用正是去掉了这个中间层，直接用流来解析数据，极大程度上提高了解析效率。

```java
public class UserTypeAdapter extends TypeAdapter<User> {
    @Override
    public void write(JsonWriter jsonWriter, User user) throws IOException {
        jsonWriter.beginObject();
        jsonWriter.name("name").value(user.name);
        jsonWriter.name("age").value(user.age);
        jsonWriter.name("email_address").value(user.emailAddress);
        jsonWriter.endObject();
    }
    @Override
    public User read(JsonReader jsonReader) throws IOException {
        jsonReader.beginObject();
        String name=null;
        int age=0;
        String emailAddress=null;
        while (jsonReader.hasNext()){
            switch (jsonReader.nextName()){
                case "name":
                    name = jsonReader.nextString();
                    break;
                case "age":
                    age = jsonReader.nextInt();
                    break;
                case "email_address":
                    emailAddress = jsonReader.nextString();
                    break;
            }
        }
        jsonReader.endObject();
        return new User(name,age,emailAddress);
    }
}
Gson gson = new GsonBuilder()
        .registerTypeAdapter(User.class,new UserTypeAdapter())
        .create();
String json = gson.toJson(new User("mlk", 27, "test@qq.com"));
System.out.println(json);
 // {"name":"mlk","email_address":"test@qq.com","age":27}
System.out.println(gson.fromJson(json,User.class));
//User{name='mlk', age=27, emailAddress='test@qq.com'}
```

`@JsonAdapter`注解可以作用在Model上，接收一个参数，且必须是TypeAdpater，JsonSerializer或JsonDeserializer这三个其中之一。这样就不需要调用registerTypeAdapter方法来注册。

```java
@JsonAdapter(UserTypeAdapter.class)
public class User {
    public String name;
    public int age;
    public String emailAddress;
    public User(String name, int age, String emailAddress) {
        this.name = name;
        this.age = age;
        this.emailAddress = emailAddress;
    }
    @Override
    public String toString() {
        return "User{" +
                "name='" + name + '\'' +
                ", age=" + age +
                ", emailAddress='" + emailAddress + '\'' +
                '}';
    }
}
Gson gson = new Gson();
String json = gson.toJson(new User("mlk", 27, "test@qq.com"));
System.out.println(json);
// {"name":"mlk","email_address":"test@qq.com","age":27}
System.out.println(gson.fromJson(json, User.class));
//User{name='mlk', age=27, emailAddress='test@qq.com'}
```

## 扩展阅读

* [Gson User Guide](https://github.com/google/gson/blob/master/UserGuide.md#TOC-Custom-Serialization-and-Deserialization)
* [Json转换利器Gson之实例](http://blog.csdn.net/lk_blog/article/details/7685169)
* [Gson全解析](http://www.jianshu.com/p/fc5c9cdf3aab)
* [你真的会用Gson吗](http://www.jianshu.com/p/3108f1e44155)
* \[A Gson TypeAdapterFactory\]\[6\]

\[6\]: [https://gist.github.com/JakeWharton/0d67d01badcee0ae7bc9](https://gist.github.com/JakeWharton/0d67d01badcee0ae7bc9)

