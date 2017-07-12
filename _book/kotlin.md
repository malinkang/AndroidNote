#### 1.Kotlin介绍

Kotlin是由JetBrain公司开发的一门运行在JVM上的静态语言。


#### 2.Android开发配置

##### 2.1安装Kotlin插件

打开Android Studio`Preference>Plugins>Install JetBrains plugin`搜索Kotlind点击安装并重启Android Studio。

##### 2.2 创建项目

新建一个Android项目，默认会添加一个空的Activity`MainActivity`。工程下的build.gradle中添加kotlin的gradle插件。

```groovy
    
buildscript {
    ext.kotlin_version = '1.0.6'
    repositories {
        mavenCentral()
        jcenter()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:2.2.3'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
        // NOTE: Do not place your application dependencies here; they belong
        // in the individual module build.gradle files
    }
}

allprojects {
    repositories {
        mavenCentral()
        jcenter()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}


```
app下的build.gradle中应用kotlin插件和kotlin依赖。
```java
apply plugin: 'com.android.application'
apply plugin: 'kotlin-android'
android {
    compileSdkVersion 25
    buildToolsVersion "25.0.2"
    defaultConfig {
        applicationId "com.malinkang.kotlin"
        minSdkVersion 15
        targetSdkVersion 25
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "android.support.test.runner.AndroidJUnitRunner"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
    sourceSets {
        main.java.srcDirs += 'src/main/kotlin'
    }
}

dependencies {
    compile fileTree(dir: 'libs', include: ['*.jar'])
    androidTestCompile('com.android.support.test.espresso:espresso-core:2.2.2', {
        exclude group: 'com.android.support', module: 'support-annotations'
    })
    testCompile 'junit:junit:4.12'
    compile 'com.android.support:appcompat-v7:25.1.0'
    compile 'com.android.support:support-v4:25.1.0'
    compile "org.jetbrains.kotlin:kotlin-stdlib:$kotlin_version" 
}
repositories {
    mavenCentral()
}

```
选中自动创建的MainActivity`code>Convert Java File to Kotlin File`。我们之前的Java代码将会被转换为Kotlin代码。


Java代码

```java
public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
    }
}

```
Kotlin代码



```kotlin
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
    }
}

```
然后将kotlin代码移到kotlin目录下，运行。

#### 3.Kotlin语法

我们的第一个Kotlin项目已经运行起来了，虽然我们没写一行代码。接下来将详细学习一下Kotlin的语法。

##### 3.1基本语法

**包名**
```java
package com.malinkang.kotlin;//定义包名
```
**声明常量**

使用关键字`val`声明常量



```kotlin
val a :Int = 1;//定义一个int值
val b = 1;//推导出Int类型
val c:Int;//当没有初始化时必须声明类型
c = 1

```
**声明变量**

```kotlin
var x:Int= 5;
var y = 10;

```
**注释**

和Java一样，支持单行注释和块注释
```
//单行注释

/*块注释*/
```

####












#### 参考
* [Kotlin中文文档](http://kotlindoc.com/)
* [使用 Kotlin 和 Anko 的安卓开发入门](https://realm.io/cn/news/getting-started-with-kotlin-and-anko/)
* [Android开发必备知识：为什么说Kotlin值得一试](http://www.cnblogs.com/bugly/p/5219895.html)
