# SparseArray

## 官方文档

> SparseArray maps integers to Objects and, unlike a normal array of Objects, its indices can contain gaps. SparseArray is intended to be more memory-efficient than a HashMap, because it avoids auto-boxing keys and its data structure doesn't rely on an extra entry object for each mapping.

`SparseArray`将整数映射到`Objects`，与普通的`Objects`数组不同，它的索引可以包含间隙。`SparseArray`的目的是比`HashMap`更节省内存，因为它避免了自动装箱键，而且它的数据结构不依赖于每个映射的额外条目对象。

> Note that this container keeps its mappings in an array data structure, using a binary search to find keys. The implementation is not intended to be appropriate for data structures that may contain large numbers of items. It is generally slower than a `HashMap` because lookups require a binary search, and adds and removes require inserting and deleting entries in the array. For containers holding up to hundreds of items, the performance difference is less than 50%.

请注意，这个容器将其映射保存在数组数据结构中，使用二进制搜索来查找键。这个实现并不适合可能包含大量项目的数据结构。它通常比HashMap慢，因为查找需要二进制搜索，而添加和删除需要在数组中插入和删除条目。对于最多容纳数百个项目的容器，性能差异小于50%。

> To help with performance, the container includes an optimization when removing keys: instead of compacting its array immediately, it leaves the removed entry marked as deleted. The entry can then be re-used for the same key or compacted later in a single garbage collection of all removed entries. This garbage collection must be performed whenever the array needs to be grown, or when the map size or entry values are retrieved.

为了帮助提高性能，容器在删除键时包含了一个优化：它不立即压缩其数组，而是将删除的条目标记为删除。然后，该条目可以为相同的键重新使用，或者在以后对所有删除的条目进行一次垃圾收集时进行压缩。每当需要增长数组，或者检索映射大小或条目值时，都必须执行这个垃圾收集。

> It is possible to iterate over the items in this container using keyAt\(int\) and valueAt\(int\). Iterating over the keys using keyAt\(int\) with ascending values of the index returns the keys in ascending order. In the case of valueAt\(int\), the values corresponding to the keys are returned in ascending order.

可以使用`keyAt(int)`和`valueAt(int)`对这个容器中的项目进行迭代。使用keyAt\(int\)以索引的升序值对键进行迭代，按升序返回键。在valueAt\(int\)的情况下，按升序返回键对应的值。

## 源码分析

### 构造函数

```java
private int[] mKeys; 
private Object[] mValues;
private int mSize;
public SparseArray() {
    this(10);
}
public SparseArray(int initialCapacity) {
    if (initialCapacity == 0) {
        mKeys = EmptyArray.INT;
        mValues = EmptyArray.OBJECT;
    } else {
        mValues = ArrayUtils.newUnpaddedObjectArray(initialCapacity);
        mKeys = new int[mValues.length];
    }
    mSize = 0;
}
```

### get

```java
public E get(int key) {
    return get(key, null);
}
```

```java
public E get(int key, E valueIfKeyNotFound) {
    //二分查找从mKeys获取索引
    int i = ContainerHelpers.binarySearch(mKeys, mSize, key);
    if (i < 0 || mValues[i] == DELETED) {
        return valueIfKeyNotFound;
    } else {
        return (E) mValues[i];
    }
}
```

### put

```java
public void put(int key, E value) {
    //二分查找
    int i = ContainerHelpers.binarySearch(mKeys, mSize, key);

    if (i >= 0) {
        //说明存在值 直接覆盖
        mValues[i] = value;
    } else {
        i = ~i;
        //
        if (i < mSize && mValues[i] == DELETED) {
            mKeys[i] = key;
            mValues[i] = value;
            return;
        }

        if (mGarbage && mSize >= mKeys.length) {
            gc();

            // Search again because indices may have changed.
            i = ~ContainerHelpers.binarySearch(mKeys, mSize, key);
        }
        mKeys = GrowingArrayUtils.insert(mKeys, mSize, i, key);
        mValues = GrowingArrayUtils.insert(mValues, mSize, i, value);
        mSize++;
    }
}
```

```java
//frameworks/base/core/java/com/android/internal/util/GrowingArrayUtils.java
public static <T> T[] insert(T[] array, int currentSize, int index, T element) {
    assert currentSize <= array.length;

    if (currentSize + 1 <= array.length) {
        //移动
        System.arraycopy(array, index, array, index + 1, currentSize - index);
        array[index] = element;
        return array;
    }

    @SuppressWarnings("unchecked")
    T[] newArray = ArrayUtils.newUnpaddedArray((Class<T>)array.getClass().getComponentType(),
            growSize(currentSize));
    System.arraycopy(array, 0, newArray, 0, index);
    newArray[index] = element;
    System.arraycopy(array, index, newArray, index + 1, array.length - index);
    return newArray;
}
```



```java
public static int growSize(int currentSize) {
    return currentSize <= 4 ? 8 : currentSize * 2;
}
```









