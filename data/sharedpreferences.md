

## 1.SharedPreferences和Editor使用

[SharedPreferences][SharedPreferences]主要用于存储用户的一些偏好设置。SharedPreferences数据以xml格式存储在`/data/data/<package name>/shared_prefs`目录下。


### 1.1 创建SharedPreference

SharedPreferences接口用于读取应用程序的Preferences数据。

创建SharedPreference有两种方法，一种是通过`Context`的`getSharedPreferences(String name,int mode)`方法来创建，另一种是通过[PreferenceManager][PreferenceManager]来创建。

#### 1.1.1 使用getSharedPreferences方法

getSharedPreferences(String name,int mode)方法的两个参数name用于指定文件名称，mode支持如下几个值。

* Context.MODE_PRIVATE:只能被本应用程序读取。
* Context.MODE_WORLD_READABLE:能被其他应用程序读，但不能写。
* Context.MODE_WORLD_WRITEABLE:能被其他应用程序读写。

#### 1.1.2 使用PreferenceManager来创建

PrefernceManager提供了如下方法

* getDefaultSharedPreferences(Context context):获取默认的Preference
* getSharedPreferences()

#### 1.1.3 SharedPreference常用方法
* public abstract boolean contains (String key)：判断是否包含特定key的数据。
* public abstract Map<String, ?> getAll ()：获取全部的key-value对。
* public abstract void registerOnSharedPreferenceChangeListener (SharedPreferences.OnSharedPreferenceChangeListener listener)：注册`OnSharedPreferenceChangeListener`监听器。

### 1.2 使用Editor保存数据

SharedPreference 接口不提供写入数据的能力，而是通过SharedPreference的内部接口Editor来保存数据。调用SharedPreference的`edit()`方法即可获取它所对应的Editor对象。Editor对象提供了如下方法。

* clear()：清空所有数据。
* putXxx():存储数据，SharedPreference支持存储`boolean`，`float`，`int`,`long`,`string`,`Set<string>(Api 11新增)`。
* apply()和commit()方法都是编辑完成提交，如果不提交则存储不生效。



## 2.开源项目esperandro

在Android中，使用SharedPreferences时，我们必须每次记住设置的preference的数据类型，并且如果两次使用了相同的key就会覆盖已经存在的preference。如果使用`esperandro`就可以避免这些问题，并且大大简化了`SharedPreferences`的操作。

### 2.1定义SharedPreference

`esperandro`创建一个preference通过定义一个空的接口，并且使用`@SharedPreferences`注解，通过name属性指定文件名称，mode属性指定模式，如果不指定name属性和mode属性，则使用默认的`SharedPreference`。

```java
@SharedPreferences
public interface DefaultPreferences

```
等价于

```java
PreferenceManager.getDefaultSharedPreferences(context)

```

```java
@SharedPreferences(name = "eventPrefs", mode = SharedPreferenceMode.PRIVATE)
public interface EventPreferences

```
等价于

```java

context.getSharedPreferences("eventPrefs", Context.MODE_PRIVATE).

```

###  2.2 设置和获取Preference


在接口中定义一个`set`和`get`方法，用来设置和获取Preference。`esperandro`支持存储的类型包括`int`，`long`，`float`，`boolean`，`String`和`Set<String>`.

```java
@SharedPreferences
public interface DefaultPreferences {

    String name();

    void name(String name);

}

```

通过`@Default`注解和各自的`of*`属性可以为除了`Set<String>`以外的类型指定默认值。

```java
@SharedPreferences
public interface DefaultPreferences {

    int age();

    @Default(ofInt = 1)
    void age(int age);
}


```

除了可以在编译时设置默认值以外，还可以在运行时使用`$Default`设置默认值。

```java
@SharedPreferences
public interface DefaultPreferences {

    int age$Default(int age);//getter

    void age(int age);
}


```

###  2.3创建实例



调用

```java
Esperandro.getPreferences(Class<T> preferenceClass, Context context)
```
就可以创建实例。

```java
 DefaultPreferences mDefaultPreferences=Esperandro.getPreferences(DefaultPreferences.class,this);
Log.e(TAG,"age-->"+mDefaultPreferences.age$Default(10));
```

###  2.4存储对象

`esperandro`不仅可以存储基本数据类型和`String`类型，还可以存储对象。实现`Serializer`接口，并调用`Esperandro.setSerializer(Serializer serializer)`方法设置`Serializer`，可以将对象转换为字符串进行存储，并在获取的时候转换为对象。

下面的例子中我们通过`Gson`将对象转换为`json`格式进行存储。


实现`Seralizer`

```java
public class GsonSerializer implements Serializer {

    private Gson gson;

    public GsonSerializer() {
        this.gson = new GsonBuilder().create();
    }

    public GsonSerializer(Gson gson) {
        this.gson = gson;
    }

    @Override
    public String serialize(Object object) {
        return gson.toJson(object);
    }

    @Override
    public <T> T deserialize(String serializedObject, Class<T> clazz) {
        T deserialized = null;
        if (serializedObject != null) {
            deserialized = gson.fromJson(serializedObject, clazz);
        }
        return deserialized;
    }
}

```
Model

```java
public class User implements Serializable{
    public String name;
    public int age;

}

```

设置`Serializer`并存储和获取数据

```java
  DefaultPreferences mDefaultPreferences=Esperandro.getPreferences(DefaultPreferences.class,this);
        Esperandro.setSerializer(new GsonSerializer());//设置Serializer
        User user=new User();
        user.name="milk";
        user.age=10;
        mDefaultPreferences.user(user);
        Log.e(TAG,mDefaultPreferences.user().name);

```

###  2.5SharedPreferenceActions接口

在创建SharedPreference时，除了直接定义接口外，还可以通过实现`SharedPreferenceActions`接口来进行定义。`SharedPreferenceActions`提供了许多有用的方法。

```java

    /**
     * @return the underlying SharedPreference instance.
     */
    SharedPreferences get();

    /**
     * Checks if a value for the given key exists.
     * @param key
     * @return true if the given key exists, false otherwise
     */
    boolean contains(String key);

    /**
     * Removes the value for the given key.
     * @param key
     */
    void remove(String key);

    /**
     * Registers a callback to be invoked when a change happens to a preference.
     * @param listener The callback that will run.
     */
    void registerOnChangeListener(
            SharedPreferences.OnSharedPreferenceChangeListener listener);

    /**
     * Unregisters a previous callback.
     * @param listener The callback that should be unregistered.
     */
    void unregisterOnChangeListener(
            SharedPreferences.OnSharedPreferenceChangeListener listener);

    /**
     * Clears the complete sharedPreferences of the previously given name. (Be aware that ALL preferences under this
     * name are cleared not only the ones defined in your interface)
     */
    void clear();

    /**
     * Initializes the underlying SharedPreference object with the respective explicit or implicit default values. This
     * can be useful when the defaults should be shown in the summary in a PreferenceActivity.
     */
    void initDefaults();

```

### 2.6 Proguard

```
# esperandro
-keepnames class de.devland.** { *; }
-keep class **$$Impl { public *;}

# keep the annotated things annotated
-keepattributes *Annotation*, EnclosingMethod, Signature, InnerClasses

# for dagger also preserve the interfaces
# assuming they reside in the sub-package 'preferences' and all end with 'Prefs'
#-keep class preferences.**Prefs { public *;}

# jackson
#-dontwarn com.fasterxml.jackson.databind.**
#-keepnames class com.fasterxml.jackson.** { *; }

# for gson see their documentation at
# https://code.google.com/p/google-gson/source/browse/trunk/examples/android-proguard-example/proguard.cfg

```

##  2.7Gradle Build



```
buildscript {
    repositories {
      mavenCentral()
    }
    dependencies {
        // Android plugin
        classpath 'com.android.tools.build:gradle:0.10.+'
        // the latest version of the android-apt plugin from https://bitbucket.org/hvisser/android-apt
        classpath 'com.neenbedankt.gradle.plugins:android-apt:1.2'
    }
}

apply plugin: 'android'
apply plugin: 'android-apt'


repositories {
     mavenCentral();
}

dependencies {
    compile 'de.devland.esperandro:esperandro-api:2.1.0'
    apt 'de.devland.esperandro:esperandro:2.1.0'

    // optional, if we want to use object serialization but don't provide our own Serializer
    // compile 'de.devland.esperandro:esperandro-gson-addon:2.1.0'
	// or
	// compile 'de.devland.esperandro:esperandro-jackson-addon:2.1.0'
}

```

# 扩展阅读

* [Saving Key-Value Sets](http://developer.android.com/training/basics/data-storage/shared-preferences.html)

* [esperandro官方使用文档](http://dkunzler.github.io/esperandro/)

[SharedPreferences]: http://developer.android.com/reference/android/content/SharedPreferences.html

[PreferenceManager]: https://developer.android.com/reference/android/preference/PreferenceManager.html







