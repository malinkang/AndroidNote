#AndroidAnnotations


[AndroidAnnotations][1]是一个能够让你快速进行Android开发的开源框架，它能让你专注于真正重要的地方。
使代码更加精简，使项目更加容易维护，它的目标就是`Fast Android Development.Easy maintainance`。
通过一段时间的使用发现，相比原生的Android开发，确实能够让你少些很多代码，它的[首页][2]也给出了一个简单
的例子,通过例子也可以看到代码比之前几乎少写了一半。

使用Annotations可以实现如下功能。


* 提供了View，resources等注入
* 提供了`click`，`touch`等事件处理
* 增强Activity，Fragment等组建。
* 简单的线程操作
* 集成了大量的第三方框架


## 1.开始使用

在这里我使用的是开发工具是Android Studio,构建工具是Gradle，如果你使用其他IDE和构建工具，可以参考[这里][3]。


```
apply plugin: 'com.android.application'
apply plugin: 'android-apt'


android {
    compileSdkVersion 20
    buildToolsVersion "20.0.0"

    defaultConfig {
        applicationId "com.malinkang.androidannotation"
        minSdkVersion 15
        targetSdkVersion 20
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            runProguard false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    compile fileTree(dir: 'libs', include: ['*.jar'])
}
buildscript {
    repositories {
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:0.12.+'
        classpath 'com.neenbedankt.gradle.plugins:android-apt:1.4+'
    }
}

repositories {
    mavenCentral()
    mavenLocal()
}

def AAVersion = '3.1'

dependencies {
    apt "org.androidannotations:androidannotations:$AAVersion"
    compile "org.androidannotations:androidannotations-api:$AAVersion"
}

apt {
    arguments {
        androidManifestFile variant.processResources.manifestFile
        resourcePackageName 'com.malinkang.androidannotation'
    }
}

```

在真正开始使用之前，我们需要知道AndroidAnnotations是如何工作的。AndroidAnnotations使用`Java Annotation Processing Tool`在编译的时候会自动生成一些类的子类。例如使用`@EActivity`注解一个Activity，会生成一个Activity的子类，生成的子类名称在原来类的名字后面加了一个下划线。
```java
@EActivity
public class MyActivity extends Activity {
  // ...
}
```
将会自动生成下面的子类

```java

public final class MyActivity_ extends MyActivity {
  // ...
}
```

子类复写父类的方法，真正工作的activity其实是MyActivity_，所以在`AndroidManifest.xml`中配置MyActivity_而不是MyActivity。

```
<activity android:name=".MyListActivity_" />

```

## 2. 注入

### 2.1 View 注解

`@ViewById`注解功能等价于`findViewById()`方法。使用时注意字段不能使用`private`修饰。

```java
@EActivity
public class MyActivity extends Activity {

  // Injects R.id.myEditText
  @ViewById
  EditText myEditText;

  @ViewById(R.id.myTextView)
  TextView textView;
}
```

`@ViewsById`注解可以一次获取多个View。

```java
@EActivity
public class MyActivity extends Activity {

  @ViewsById({R.id.myTextView1, R.id.myOtherTextView})
  List<TextView> textViews;

  @AfterViews
  void updateTextWithDate() {
    for (TextView textView : textViews) {
      textView.setText("Date: " + new Date());
    }
  }
}
```
使用`@AfterViews`注解注解方法，可以让此方法在View完全加载完成后再调用

```java
@EActivity(R.layout.main)
public class MyActivity extends Activity {

    @ViewById
    TextView myTextView;

    @AfterViews
    void updateTextWithDate() {
        myTextView.setText("Date: " + new Date());
    }
}
```





[1]: https://github.com/excilys/androidannotations/
[2]: http://androidannotations.org/
[3]: https://github.com/excilys/androidannotations/wiki/Configuration
