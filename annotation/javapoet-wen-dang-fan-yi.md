# JavaPoet 文档翻译

[原文](https://github.com/square/javapoet)  
`JavaPoet` 是一套生成`.java`源文件的Java接口。

当做一些比如注解处理或者和元数据文件（比如数据库的schemas，协议格式）交互的事情时，源文件生成非常有用。通过生成代码，你不用写模板代码同时也保证了元数据的唯一来源。

## Example

下面是样板式的 `HelloWorld` class:

```java
package com.example.helloworld;

public final class HelloWorld {
  public static void main(String[] args) {
    System.out.println("Hello, JavaPoet!");
  }
}
```

而下面是通过JavaPoet生成的（令人兴奋的）代码:

```java
MethodSpec main = MethodSpec.methodBuilder("main")
    .addModifiers(Modifier.PUBLIC, Modifier.STATIC)
    .returns(void.class)
    .addParameter(String[].class, "args")
    .addStatement("$T.out.println($S)", System.class, "Hello, JavaPoet!")
    .build();

TypeSpec helloWorld = TypeSpec.classBuilder("HelloWorld")
    .addModifiers(Modifier.PUBLIC, Modifier.FINAL)
    .addMethod(main)
    .build();

JavaFile javaFile = JavaFile.builder("com.example.helloworld", helloWorld)
    .build();

javaFile.writeTo(System.out);

```

为了声明main方法,我们用修饰符，返回类型，参数和代码语句创建一个名为"main"的`MethodSpec`。我们添加main方法到一个`HelloWorld`类中，然后添加这个类到`HelloWorld.java`文件中。

在这个例子中我们把文件写到`System.out`中，但我们也能得到文件的字符串\(`JavaFile.toString()`\) 或把它写到文件系统里\(`JavaPoet.writeTo()`\)。

[Javadoc](https://square.github.io/javapoet/1.x/javapoet/)是全部的JavaPoet API，我们接下来看一下。

## 代码和控制流

大多数的JavaPoet的API用简单的不可变的Java对象。也有builders，方法链和可变参数来使API友好。JavaPoet 提供类和接口的模型\(`TypeSpec`\)，属性的模型\(`FieldSpec`\)，方法和构造函数的模型\(`MethodSpec`\)，参数的模型\(`ParameterSpec`\) 和注解的模型\(`AnnotationSpec`\)。

但是方法和构造函数的函数体没有被模型化。没有表达式类，没有语句类也没有语法树。取而代之的是，JavaPoet使用字符串来表示代码块:  


```java
MethodSpec main = MethodSpec.methodBuilder("main")
    .addCode(""
        + "int total = 0;\n"
        + "for (int i = 0; i < 10; i++) {\n"
        + "  total += i;\n"
        + "}\n")
    .build();
```

将生成如下代码:

```text
void main() {
  int total = 0;
  for (int i = 0; i < 10; i++) {
    total += i;
  }
}
```

手动写分号，换行和缩进是枯燥的所以JavaPoet提供了API使之写得更容易。`addStatement()`接管了分行和新行，`beginControlFlow()` + `endControlFlow()` 一同用于括号，新行和缩进:

```java
MethodSpec main = MethodSpec.methodBuilder("main")
    .addStatement("int total = 0")
    .beginControlFlow("for (int i = 0; i < 10; i++)")
    .addStatement("total += i")
    .endControlFlow()
    .build();
```

这个例子是简陋的，因为生成的代码是不变的！设想取代写死0到10，我们想要操作和范围是可配置的。这是一个方法来生成一个方法:

```java
private MethodSpec computeRange(String name, int from, int to, String op) {
  return MethodSpec.methodBuilder(name)
      .returns(int.class)
      .addStatement("int result = 0")
      .beginControlFlow("for (int i = " + from + "; i < " + to + "; i++)")
      .addStatement("result = result " + op + " i")
      .endControlFlow()
      .addStatement("return result")
      .build();
}
```

当我们调用`computeRange("multiply10to20", 10, 20, "*")`时下面是我们得到的代码:

```java
int multiply10to20() {
  int result = 0;
  for (int i = 10; i < 20; i++) {
    result = result * i;
  }
  return result;
}
```

方法生成方法！并且由于JavaPoet生成源代码而不是字节码，你可以通过阅读它来确保正确性。

## $L 用于表示字面量

在调用`beginControlFlow()` 和 `addStatement`时字符串连接是令人分心的。太多的操作符。为了解决这个问题，JavaPoet提供了一个受[`String.format()`](http://developer.android.com/reference/java/util/Formatter.html)启发而又不兼容的语法。该语法接收\*\*`$L`\*\*来发出一个字面值到输出中。行为类似`Formatter`'s `%s`:

```java
private MethodSpec computeRange(String name, int from, int to, String op) {
  return MethodSpec.methodBuilder(name)
      .returns(int.class)
      .addStatement("int result = 0")
      .beginControlFlow("for (int i = $L; i < $L; i++)", from, to)
      .addStatement("result = result $L i", op)
      .endControlFlow()
      .addStatement("return result")
      .build();
}
```

字面量被直接不经过转义地写到输出代码中。字面量的参数可能是字符串原始类型，和一些后文描述的JavaPoet类型。

## $S 用于表示字符串

当发送包含字符串的代码时，我们可以用\*\*`$S`\*\* 来发送一个**string**，包含双引号的包裹和转义。下面是一个发送三个方法的程序，每个都返回它自己的名字:

```java
public static void main(String[] args) throws Exception {
  TypeSpec helloWorld = TypeSpec.classBuilder("HelloWorld")
      .addModifiers(Modifier.PUBLIC, Modifier.FINAL)
      .addMethod(whatsMyName("slimShady"))
      .addMethod(whatsMyName("eminem"))
      .addMethod(whatsMyName("marshallMathers"))
      .build();

  JavaFile javaFile = JavaFile.builder("com.example.helloworld", helloWorld)
      .build();

  javaFile.writeTo(System.out);
}

private static MethodSpec whatsMyName(String name) {
  return MethodSpec.methodBuilder(name)
      .returns(String.class)
      .addStatement("return $S", name)
      .build();
}
```

在这个例子中，使用`$S` 给我们添加双引号标记:

```java
public final class HelloWorld {
  String slimShady() {
    return "slimShady";
  }

  String eminem() {
    return "eminem";
  }

  String marshallMathers() {
    return "marshallMathers";
  }
}
```

## $T 用来表示类型

我们Java程序员喜欢我们的类型:类型使我们的代码易于理解。并且JavaPoet也是同理。它有丰富的内建支持类型，包含自动生成`import`语句。使用\*\*`$T`\*\* 来引用 **types**:

```java
MethodSpec today = MethodSpec.methodBuilder("today")
    .returns(Date.class)
    .addStatement("return new $T()", Date.class)
    .build();

TypeSpec helloWorld = TypeSpec.classBuilder("HelloWorld")
    .addModifiers(Modifier.PUBLIC, Modifier.FINAL)
    .addMethod(today)
    .build();

JavaFile javaFile = JavaFile.builder("com.example.helloworld", helloWorld)
    .build();

javaFile.writeTo(System.out);
```

这生成下面的`.java` 文件，包含了必要的`import`语句

```java
package com.example.helloworld;

import java.util.Date;

public final class HelloWorld {
  Date today() {
    return new Date();
  }
}
```

我们传递`Date.class`来引用一个当我们生成代码时恰好可用的类。这不需要这么做\(使用一个存在的类\)。有一个相似的例子，但这个引用的类（还）并不存在（比如要引用的这个类也是要生成的类）:

```java
ClassName hoverboard = ClassName.get("com.mattel", "Hoverboard");

MethodSpec today = MethodSpec.methodBuilder("tomorrow")
    .returns(hoverboard)
    .addStatement("return new $T()", hoverboard)
    .build();
```

并且这个还并不存在的类也被引入进来了:

```java
package com.example.helloworld;

import com.mattel.Hoverboard;

public final class HelloWorld {
  Hoverboard tomorrow() {
    return new Hoverboard();
  }
}
```

`ClassName`类型非常重要,并且在你使用JavaPoet时你将频繁地需要使用它。它辨认任何\_声明\_的类。声明的类型仅仅是Java丰富的类型系统的开始:你也可以拥有数组，参数化的类型，通配符类型和类型变量。JavaPoet有用于构建这些的类:

```java
ClassName hoverboard = ClassName.get("com.mattel", "Hoverboard");
ClassName list = ClassName.get("java.util", "List");
ClassName arrayList = ClassName.get("java.util", "ArrayList");
TypeName listOfHoverboards = ParameterizedTypeName.get(list, hoverboard);

MethodSpec beyond = MethodSpec.methodBuilder("beyond")
    .returns(listOfHoverboards)
    .addStatement("$T result = new $T<>()", listOfHoverboards, arrayList)
    .addStatement("result.add(new $T())", hoverboard)
    .addStatement("result.add(new $T())", hoverboard)
    .addStatement("result.add(new $T())", hoverboard)
    .addStatement("return result")
    .build();
```

JavaPoet将分解每个类型并在可能的地方引入它的组件。

```java
package com.example.helloworld;

import com.mattel.Hoverboard;
import java.util.ArrayList;
import java.util.List;

public final class HelloWorld {
  List<Hoverboard> beyond() {
    List<Hoverboard> result = new ArrayList<>();
    result.add(new Hoverboard());
    result.add(new Hoverboard());
    result.add(new Hoverboard());
    return result;
  }
}
```

### **Import static**

JavaPoet支持`import static`。它通过明确地收集类型成员名字来完成的。让我们使用一些静态语法糖来完善前一个例子:

```java
...
ClassName namedBoards = ClassName.get("com.mattel", "Hoverboard", "Boards");

MethodSpec beyond = MethodSpec.methodBuilder("beyond")
    .returns(listOfHoverboards)
    .addStatement("$T result = new $T<>()", listOfHoverboards, arrayList)
    .addStatement("result.add($T.createNimbus(2000))", hoverboard)
    .addStatement("result.add($T.createNimbus(\"2001\"))", hoverboard)
    .addStatement("result.add($T.createNimbus($T.THUNDERBOLT))", hoverboard, namedBoards)
    .addStatement("$T.sort(result)", Collections.class)
    .addStatement("return result.isEmpty() ? $T.emptyList() : result", Collections.class)
    .build();

TypeSpec hello = TypeSpec.classBuilder("HelloWorld")
    .addMethod(beyond)
    .build();

JavaFile.builder("com.example.helloworld", hello)
    .addStaticImport(hoverboard, "createNimbus") //静态导入
    .addStaticImport(namedBoards, "*")
    .addStaticImport(Collections.class, "*")
    .build();
```

JavaPoet will first add your `import static` block to the file as configured, match and mangle all calls accordingly and also import all other types as needed.

JavaPoet将先添加你的`import static`块到文件中作为配置，匹配和压碎所有调用因此也引入所有需要的其他类型。（翻译不通）  


```java
package com.example.helloworld;

import static com.mattel.Hoverboard.Boards.*;
import static com.mattel.Hoverboard.createNimbus;
import static java.util.Collections.*;

import com.mattel.Hoverboard;
import java.util.ArrayList;
import java.util.List;

class HelloWorld {
  List<Hoverboard> beyond() {
    List<Hoverboard> result = new ArrayList<>();
    result.add(createNimbus(2000));
    result.add(createNimbus("2001"));
    result.add(createNimbus(THUNDERBOLT));
    sort(result);
    return result.isEmpty() ? emptyList() : result;
  }
}
```

## $N 用于表示名字

生成的代码经常是自我参考的。使用 **`$N`** 来通过它的名字来指代另一个生成的声明。这是一个方法调用另一个方法:

```java
public String byteToHex(int b) {
  char[] result = new char[2];
  result[0] = hexDigit((b >>> 4) & 0xf);
  result[1] = hexDigit(b & 0xf);
  return new String(result);
}

public char hexDigit(int i) {
  return (char) (i < 10 ? i + '0' : i - 10 + 'a');
}
```

当生成上面的代码，我使用`$N`传递`hexDigit()`方法作为`byteToHex()`方法的一个参数:

```java
MethodSpec hexDigit = MethodSpec.methodBuilder("hexDigit")
    .addParameter(int.class, "i")
    .returns(char.class)
    .addStatement("return (char) (i < 10 ? i + '0' : i - 10 + 'a')")
    .build();

MethodSpec byteToHex = MethodSpec.methodBuilder("byteToHex")
    .addParameter(int.class, "b")
    .returns(String.class)
    .addStatement("char[] result = new char[2]")
    .addStatement("result[0] = $N((b >>> 4) & 0xf)", hexDigit)
    .addStatement("result[1] = $N(b & 0xf)", hexDigit)
    .addStatement("return new String(result)")
    .build();
```

## 代码块格式字符串

代码块也许有多种方法指定他们的占位符的值。在代码块中只有一种形式也许被用于每个操作。（没读懂什么意思）

### **相对参数\(按顺序的参数\)**

给每个在格式化字符串中的占位符传递一个参数值到`CodeBlock.add()`。在每个例子中，我们生成代码来说"I ate 3 tacos"

```java
CodeBlock.builder().add("I ate $L $L", 3, "tacos")
```

### **位置参数\(指定位置的参数\)**

传入一个整数索引\(从1开始\)到格式化字符串占位符之前来指定要使用的参数。

```java
CodeBlock.builder().add("I ate $2L $1L", "tacos", 3)
```

### **命名参数\(指定名字的参数\)**

使用语法`$argumentName:X`其中`X`是格式化字符并调用`CodeBlock.addNamed()`使用一个包含所有格式化字符串中的参数键的字典。参数名使用`a-z`, `A-Z`, `0-9`, 和 `_`，并且必须以小写字符开头。

```java
Map<String, Object> map = new LinkedHashMap<>();
map.put("food", "tacos");
map.put("count", 3);
CodeBlock.builder().addNamed("I ate $count:L $food:L", map)
```

## 方法

以上所有方法都有方法体。使用`Modifiers.ABSTRACT`可以获取一个没有方法体的方法。如果是抽象类或者接口的话则是合法的。

```java
MethodSpec flux = MethodSpec.methodBuilder("flux")
    .addModifiers(Modifier.ABSTRACT, Modifier.PROTECTED)
    .build();

TypeSpec helloWorld = TypeSpec.classBuilder("HelloWorld")
    .addModifiers(Modifier.PUBLIC, Modifier.ABSTRACT)
    .addMethod(flux)
    .build();
```

生成这样的代码:

```java
public abstract class HelloWorld {
  protected abstract void flux();
}
```

其他修饰符在允许的地方工作。记住当指定修饰符，JavaPoet使用[`javax.lang.model.element.Modifier`](http://docs.oracle.com/javase/8/docs/api/javax/lang/model/element/Modifier.html),这个类在Android不可用。这个限制只在代码生成的代码中有效；输出的代码可以运行在各种地方:JVM，Android和GWT。

方法也有参数，异常，可变参数，Java文档，注解，类型变量和一个返回类型。所有这些都可以在`MethodSpec.Builder`中配置。

## 构造器

`MethodSpec` （当做构造器）稍有不妥；它也可以用作构造函数:

```java
MethodSpec flux = MethodSpec.constructorBuilder()
    .addModifiers(Modifier.PUBLIC)
    .addParameter(String.class, "greeting")
    .addStatement("this.$N = $N", "greeting", "greeting")
    .build();

TypeSpec helloWorld = TypeSpec.classBuilder("HelloWorld")
    .addModifiers(Modifier.PUBLIC)
    .addField(String.class, "greeting", Modifier.PRIVATE, Modifier.FINAL)
    .addMethod(flux)
    .build();
```

生成如下代码:

```java
public class HelloWorld {
  private final String greeting;

  public HelloWorld(String greeting) {
    this.greeting = greeting;
  }
}
```

对于多数部分（情况），构造器类似方法一样。当发送代码时，JavaPoet将把构造器放到普通方法之前输出到输出文件。

## 参数

声明方法和构造器中的参数使用`ParameterSpec.builder()`或者`MethodSpec`的简便方法 `addParameter()`:

```java
ParameterSpec android = ParameterSpec.builder(String.class, "android")
    .addModifiers(Modifier.FINAL) //final修饰
    .build();

MethodSpec welcomeOverlords = MethodSpec.methodBuilder("welcomeOverlords")
    .addParameter(android)
    .addParameter(String.class, "robot", Modifier.FINAL)
    .build();
```

虽然上面代码生成`android` 和 `robot`的参数不同，但是输出是相同的:

```java
void welcomeOverlords(final String android, final String robot) {
}
```

当参数有注解\(例如 `@Nullable`\)时扩展的`Builder`类型是必要的。

## 成员变量

与参数类似，成员变量也是既能使用builder创建也能使用方便的帮助方法创建:

```java
FieldSpec android = FieldSpec.builder(String.class, "android")
    .addModifiers(Modifier.PRIVATE, Modifier.FINAL)
    .build();

TypeSpec helloWorld = TypeSpec.classBuilder("HelloWorld")
    .addModifiers(Modifier.PUBLIC)
    .addField(android)
    .addField(String.class, "robot", Modifier.PRIVATE, Modifier.FINAL)
    .build();
```

生成:

```java
public class HelloWorld {
  private final String android;

  private final String robot;
}
```

当一个成员变量有Javadoc，注解，或者成员变量初始化则扩展的`Builder`形式是必要的。成员变量初始化使用与代码块相同的[`String.format()`](http://developer.android.com/reference/java/util/Formatter.html)类似语法

```java
FieldSpec android = FieldSpec.builder(String.class, "android")
    .addModifiers(Modifier.PRIVATE, Modifier.FINAL)
    .initializer("$S + $L", "Lollipop v.", 5.0d)
    .build();
```

生成:

```java
private final String android = "Lollipop v." + 5.0;
```

## 接口

JavaPoet处理接口没有问题。记住接口放必须总是使用`PUBLIC ABSTRACT`并且接口的成员变量必须总是`PUBLIC STATIC FINAL`。当定义接口时这些修饰符总是必要的:

```java
TypeSpec helloWorld = TypeSpec.interfaceBuilder("HelloWorld")
    .addModifiers(Modifier.PUBLIC)
    .addField(FieldSpec.builder(String.class, "ONLY_THING_THAT_IS_CONSTANT")
        .addModifiers(Modifier.PUBLIC, Modifier.STATIC, Modifier.FINAL)
        .initializer("$S", "change")
        .build())
    .addMethod(MethodSpec.methodBuilder("beep")
        .addModifiers(Modifier.PUBLIC, Modifier.ABSTRACT)
        .build())
    .build();
```

但是当代码被生成时这些修饰符总是被忽略。这是默认的所以我们不需要在把它们包含在`javac`中！

```java
public interface HelloWorld {
  String ONLY_THING_THAT_IS_CONSTANT = "change";

  void beep();
}
```

## 枚举

使用`enumBuilder`创建枚举类型，并且 `addEnumConstant()` 用于添加每个值:

```java
TypeSpec helloWorld = TypeSpec.enumBuilder("Roshambo")
    .addModifiers(Modifier.PUBLIC)
    .addEnumConstant("ROCK")
    .addEnumConstant("SCISSORS")
    .addEnumConstant("PAPER")
    .build();
```

生成:

```java
public enum Roshambo {
  ROCK,

  SCISSORS,

  PAPER
}
```

想要枚举被支持，枚举值覆盖方法或者调用超类的构造函数。下面是一个全面的例子:

```java
TypeSpec helloWorld = TypeSpec.enumBuilder("Roshambo")
    .addModifiers(Modifier.PUBLIC)
    .addEnumConstant("ROCK", TypeSpec.anonymousClassBuilder("$S", "fist")
        .addMethod(MethodSpec.methodBuilder("toString")
            .addAnnotation(Override.class)
            .addModifiers(Modifier.PUBLIC)
            .addStatement("return $S", "avalanche!")
            .build())
        .build())
    .addEnumConstant("SCISSORS", TypeSpec.anonymousClassBuilder("$S", "peace")
        .build())
    .addEnumConstant("PAPER", TypeSpec.anonymousClassBuilder("$S", "flat")
        .build())
    .addField(String.class, "handsign", Modifier.PRIVATE, Modifier.FINAL)
    .addMethod(MethodSpec.constructorBuilder()
        .addParameter(String.class, "handsign")
        .addStatement("this.$N = $N", "handsign", "handsign")
        .build())
    .build();
```

生成：

```java
public enum Roshambo {
  ROCK("fist") {
    @Override
    public void toString() {
      return "avalanche!";
    }
  },

  SCISSORS("peace"),

  PAPER("flat");

  private final String handsign;

  Roshambo(String handsign) {
    this.handsign = handsign;
  }
}
```

## 匿名内部类

在枚举代码中，我们使用`Types.anonymousInnerClass()`。匿名内部类也能被用于代码块中。它们可以被`$L`引用的值:

```java
TypeSpec comparator = TypeSpec.anonymousClassBuilder("")
    .addSuperinterface(ParameterizedTypeName.get(Comparator.class, String.class))
    .addMethod(MethodSpec.methodBuilder("compare")
        .addAnnotation(Override.class)
        .addModifiers(Modifier.PUBLIC)
        .addParameter(String.class, "a")
        .addParameter(String.class, "b")
        .returns(int.class)
        .addStatement("return $N.length() - $N.length()", "a", "b")
        .build())
    .build();

TypeSpec helloWorld = TypeSpec.classBuilder("HelloWorld")
    .addMethod(MethodSpec.methodBuilder("sortByLength")
        .addParameter(ParameterizedTypeName.get(List.class, String.class), "strings")
        .addStatement("$T.sort($N, $L)", Collections.class, "strings", comparator)
        .build())
    .build();
```

这生成一个包含一个有方法的类的方法:

```java
void sortByLength(List<String> strings) {
  Collections.sort(strings, new Comparator<String>() {
    @Override
    public int compare(String a, String b) {
      return a.length() - b.length();
    }
  });
}
```

定义匿名内部类的一个棘手的部分是超类构造器的参数。在上述代码中我们传递空字符串带包没有参数:`TypeSpec.anonymousClassBuilder("")`。用JavaPoet代码块语法用逗号来分隔参数类传递不同参数。

## 注解

简单注解很容易:

```java
MethodSpec toString = MethodSpec.methodBuilder("toString")
    .addAnnotation(Override.class)
    .returns(String.class)
    .addModifiers(Modifier.PUBLIC)
    .addStatement("return $S", "Hoverboard")
    .build();
```

生成带`@Override`注解的方法:

```java
  @Override
  public String toString() {
    return "Hoverboard";
  }
```

使用`AnnotationSpec.builder()`设置注解的属性

```java
MethodSpec logRecord = MethodSpec.methodBuilder("recordEvent")
    .addModifiers(Modifier.PUBLIC, Modifier.ABSTRACT)
    .addAnnotation(AnnotationSpec.builder(Headers.class)
        .addMember("accept", "$S", "application/json; charset=utf-8")
        .addMember("userAgent", "$S", "Square Cash")
        .build())
    .addParameter(LogRecord.class, "logRecord")
    .returns(LogReceipt.class)
    .build();
```

生成带有`accept` 和 `userAgent`属性的注解:

```java
@Headers(
    accept = "application/json; charset=utf-8",
    userAgent = "Square Cash"
)
LogReceipt recordEvent(LogRecord logRecord);
```

注解值可以是注解本身。使用`$L`嵌套注解:

```java
MethodSpec logRecord = MethodSpec.methodBuilder("recordEvent")
    .addModifiers(Modifier.PUBLIC, Modifier.ABSTRACT)
    .addAnnotation(AnnotationSpec.builder(HeaderList.class)
        .addMember("value", "$L", AnnotationSpec.builder(Header.class)
            .addMember("name", "$S", "Accept")
            .addMember("value", "$S", "application/json; charset=utf-8")
            .build())
        .addMember("value", "$L", AnnotationSpec.builder(Header.class)
            .addMember("name", "$S", "User-Agent")
            .addMember("value", "$S", "Square Cash")
            .build())
        .build())
    .addParameter(LogRecord.class, "logRecord")
    .returns(LogReceipt.class)
    .build();
```

生成:

```java
@HeaderList({
    @Header(name = "Accept", value = "application/json; charset=utf-8"),
    @Header(name = "User-Agent", value = "Square Cash")
})
LogReceipt recordEvent(LogRecord logRecord);
```

记住你可以用相同的属性名多次调用`addMember()` 来填充列表该属性的值。

## Javadoc

成员变量，方法和类型可以使用Javadoc来生成文档:

```java
MethodSpec dismiss = MethodSpec.methodBuilder("dismiss")
    .addJavadoc("Hides {@code message} from the caller's history. Other\n"
        + "participants in the conversation will continue to see the\n"
        + "message in their own history unless they also delete it.\n")
    .addJavadoc("\n")
    .addJavadoc("<p>Use {@link #delete($T)} to delete the entire\n"
        + "conversation for all participants.\n", Conversation.class)
    .addModifiers(Modifier.PUBLIC, Modifier.ABSTRACT)
    .addParameter(Message.class, "message")
    .build();
```

生成:

```java
  /**
   * Hides {@code message} from the caller's history. Other
   * participants in the conversation will continue to see the
   * message in their own history unless they also delete it.
   *
   * <p>Use {@link #delete(Conversation)} to delete the entire
   * conversation for all participants.
   */
  void dismiss(Message message);
```

当在Javadoc中引用类型时使用`$T`来获得自动导入。

