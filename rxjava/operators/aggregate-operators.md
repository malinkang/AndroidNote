
### concat


concat操作符将多个Observable结合成一个Observable并发射数据，并且严格按照先后顺序发射数据，前一个Observable的数据没有发射完，是不能发射后面Observable的数据的。

```java
Observable<Integer> observable1 = Observable.just(1,2,3);
Observable<Integer> observable2 = Observable.just(4,5,6);
Observable<Integer> observable3 = Observable.just(7,8,9);
Observable.concat(observable1,observable2,observable3).subscribe(new Subscriber<Integer>() {
    @Override
    public void onCompleted() {}
    @Override
    public void onError(Throwable e) {}
    @Override
    public void onNext(Integer integer) {
        Log.d(TAG,"integer="+integer);// 1,2,3,4,5,6,7,8,9
    }
});
```
当一个Observable发生错误的时候，发射会终止。

```java
Observable<Integer> observable1 = Observable.just(1, 2, 3);
Observable<Integer> observable2 = Observable.create(new Observable.OnSubscribe<Integer>() {
    @Override
    public void call(Subscriber<? super Integer> subscriber) {
        subscriber.onError(new Throwable("error"));
    }

});
Observable<Integer> observable3 = Observable.just(7, 8, 9);
Observable.concat(observable1, observable2, observable3).subscribe(new Subscriber<Integer>() {
    @Override
    public void onCompleted() {}
    @Override
    public void onError(Throwable e) {
        Log.e(TAG, e.getMessage());
    }
    @Override
    public void onNext(Integer integer) {
        Log.d(TAG, "integer=" + integer);// 1,2,3,error
    }
});
```

### count

count操作符用来统计源Observable发射了多少个数据，最后将数目给发射出来；如果源Observable发射错误，则会将错误直接报出来；在源Observable没有终止前，count是不会发射统计数据的。

```java
Observable.just(1, 2, 3).count().subscribe(new Subscriber<Integer>() {
    @Override
    public void onCompleted() {}
    @Override
    public void onError(Throwable e) {}
    @Override
    public void onNext(Integer integer) {
        Log.d(TAG, "integer=" + integer); // integer=3
    }
});
```

### toList


toList操作符可以将Observable发射的多个数据组合成一个List。

```java
 //过滤掉年级小于20的person
getPersons()
        .flatMap(new Func1<List<Person>, Observable<Person>>() {
            @Override
            public Observable<Person> call(List<Person> persons) {
                return Observable.from(persons);
            }
        })
        .filter(new Func1<Person, Boolean>() {
            @Override
            public Boolean call(Person person) {
                return person.age > 20;
            }
        })
        .toList()
        .subscribe(new Action1<List<Person>>() {
            @Override
            public void call(List<Person> persons) {
                //
            }
        });

```
### toSortedList

toSortedList类似于toList，不同的是，它会对产生的列表排序，默认是自然升序，如果发射的数据项没有实现Comparable接口，会抛出一个异常。然而，你也可以传递一个函数作为用于比较两个数据项，这是toSortedList不会使用Comparable接口。

* 实现Comparable接口

```java
public class Person implements Comparable<Person> {
    public String name;
    public Integer age;

    public Person(String name, Integer age) {
        this.name = name;
        this.age = age;
    }

    @Override
    public int compareTo(@NonNull Person person) {
        return age.compareTo(person.age);
    }
}

Observable.from(new Person[]{new Person("a", 22), new Person("b", 18), new Person("c", 21)})
        .toSortedList()
        .subscribe(new Action1<List<Person>>() {
            @Override
            public void call(List<Person> persons) {
                for (Person person : persons) {
                    System.out.println(person.name);
                    //b
                    //c
                    //a
                }
            }
        });

```



* 传递一个函数

```java
public class Person  {
    public String name;
    public Integer age;

    public Person(String name, Integer age) {
        this.name = name;
        this.age = age;
    }
}
Observable.from(new Person[]{new Person("a", 22), new Person("b", 18), new Person("c", 21)})
            .toSortedList(new Func2<Person, Person, Integer>() {
                @Override
                public Integer call(Person person, Person person2) {
                    return person.age.compareTo(person2.age);
                }
            })
            .subscribe(new Action1<List<Person>>() {
                @Override
                public void call(List<Person> persons) {
                    for (Person person : persons) {
                        System.out.println(person.name);
                        //b
                        //c
                        //a
                    }
                }
            });
```

### reduce

Reduce操作符接收Observable发射的数据并利用提供的函数的计算结果作为下次计算的参数，输出最后的结果。首次没有计算结果传入前两个参数。

```java
Observable.from(new Integer[]{1,2,3,4,5,6,7,8,9,10}).reduce(new Func2<Integer, Integer, Integer>() {
        @Override
        public Integer call(Integer x, Integer y) {
            return x+y; // 1+2+3+4+5+6+7+8+9+10
        }
    }).subscribe(new Action1<Integer>() {
        @Override
        public void call(Integer integer) {
            Log.d(TAG,"result="+ integer); // result = 55
        }
    });
```


