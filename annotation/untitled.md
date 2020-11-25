# Untitled

## ProcessingEnvironment

```java
public interface ProcessingEnvironment {
    Map<String, String> getOptions();

    Messager getMessager();

    Filer getFiler(); //获取Filer

    Elements getElementUtils(); //Elements

    Types getTypeUtils(); //获取Types

    SourceVersion getSourceVersion();

    Locale getLocale();
}
```

## Elements

Elements是一个处理Element的工具类。常用的方法如下：

```java
public interface Elements {
    PackageElement getPackageElement(CharSequence var1); //获取指定Element的PackageElement
    TypeElement getTypeElement(CharSequence var1);//获取TypeElement
}
```

## Element

在注解处理过程中，我们扫描所有的Java源文件。源代码的每一个部分都是一个特定类型的`Element`。换句话说：`Element`代表程序的元素，例如包、类或者方法。每个`Element`代表一个静态的、语言级别的构件。在下面的例子中，我们通过注释来说明这个。



```java
package com.example;    // PackageElement

public class Foo {        // TypeElement

    private int a;      // VariableElement
    private Foo other;  // VariableElement

    public Foo () {}    // ExecuteableElement

    public void setA (  // ExecuteableElement
                     int newA   // VariableElement
                     ) {}
}
```

```java
public interface Element extends AnnotatedConstruct {
    TypeMirror asType();//获取TypeMirror

    ElementKind getKind(); //获取ElementKind

    Set<Modifier> getModifiers();

    Name getSimpleName();

    Element getEnclosingElement();

    List<? extends Element> getEnclosedElements();

    boolean equals(Object var1);

    int hashCode();

    List<? extends AnnotationMirror> getAnnotationMirrors();

    <A extends Annotation> A getAnnotation(Class<A> var1);

    <R, P> R accept(ElementVisitor<R, P> var1, P var2);
}
```

**Element**代表的是源代码。`TypeElement`代表的是源代码中的类型元素，例如类。然而，`TypeElement`并不包含类本身的信息。你可以从`TypeElement`中获取类的名字，但是你获取不到类的信息，例如它的父类。这种信息需要通过`TypeMirror`获取。你可以通过调用`elements.asType()`获取元素的`TypeMirror`。





