## 常见使用问题



### 1.

####问题


```

  	java.lang.IllegalArgumentException: method ID not in [0, 0xffff]: 65536
  		at com.android.dx.merge.DexMerger$6.updateIndex(DexMerger.java:501)
  		at com.android.dx.merge.DexMerger$IdMerger.mergeSorted(DexMerger.java:276)
  		at com.android.dx.merge.DexMerger.mergeMethodIds(DexMerger.java:490)
  		at com.android.dx.merge.DexMerger.mergeDexes(DexMerger.java:167)
  		at com.android.dx.merge.DexMerger.merge(DexMerger.java:188)
  		at com.android.dx.command.dexer.Main.mergeLibraryDexBuffers(Main.java:439)
  		at com.android.dx.command.dexer.Main.runMonoDex(Main.java:287)
  		at com.android.dx.command.dexer.Main.run(Main.java:230)
  		at com.android.dx.command.dexer.Main.main(Main.java:199)
  		at com.android.dx.command.Main.main(Main.java:103)

```
####解决方案

```
    defaultConfig {

        multiDexEnabled=true;
        ...
    }

```



#### 参考

* <http://blog.csdn.net/t12x3456/article/details/40837287>
* <http://blog.osom.info/2014/10/multi-dex-to-rescue-from-infamous-65536.html>


