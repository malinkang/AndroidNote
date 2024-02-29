`RecyclerView`是我们开发中最常用的控件，`RecyclerView`是如何工作的，如何处理缓存的有助于解决一些使用`RecyclerView`的bug和优化`RecyclerView`。


## RecyclerView

`RecyclerView`内部定义了如下几个内部类。

![](https://s3.us-west-2.amazonaws.com/secure.notion-static.com/41b1ea9e-4147-4ad4-b0ef-b747faea32e3/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220422%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220422T090454Z&X-Amz-Expires=3600&X-Amz-Signature=d295f17253368371f77eb2a82e5478cdea3f1268175e92e9f30f547da39dd41c&X-Amz-SignedHeaders=host&x-id=GetObject)
我们接下来将逐个分析每个内部类的主要功能，和一些常用的方法。后面再把各个部分串起来看他们是如何工作的。


## Adapter

`Adapter`是一个典型的适配器模式。负责将数据转换成`ItemView`，然后添加到`RecyclerView`。

常用方法

```java
public abstract VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType);

public abstract void onBindViewHolder(@NonNull VH holder, int position);

public int getItemViewType(int position) {
  return 0;
}

* @see #notifyItemChanged(int)
* @see #notifyItemInserted(int)
* @see #notifyItemRemoved(int)
* @see #notifyItemRangeChanged(int, int)
* @see #notifyItemRangeInserted(int, int)
* @see #notifyItemRangeRemoved(int, int)
*/
public final void notifyDataSetChanged() {
  mObservable.notifyChanged();
}
```


## ViewHolder

在使用`ListView`的时候我们都使用过`ViewHolder`.`ViewHolder`主要是为了防止多次`findViewById`.


## LayoutManager

`LayoutManager`负责测量和定位RecyclerView中的项目视图，以及决定何时回收用户不再可见的项目视图。通过改变`LayoutManager`，一个`RecyclerView`可以被用来实现一个标准的垂直滚动列表，一个统一的网格，交错的网格，水平滚动的集合等等。系统提供了几种常用的布局管理器。


## ItemDecoration

`ItemDecoration`顾名思义就是用来对Item进行装饰的。我们最常用的就是为每个Item添加分割线。


## ItemAnimator

`ItemAnimator`定义了当适配器发生变化时的动画。我们可以调用RecyclerView的setItemAnimator方法设置`ItemAnimator`.系统为我们默认设置了一个`DefaultItemAnimator`。


## Recycler

`Recycler`的官方解释如下：

`Recycler`负责管理废弃或拆分的`item views`，以便再利用。

一个 ”废弃“的`view`是一个仍然附着在它的父`RecyclerView`上的`view`，但它已经被标记为移除或重用。

`LayoutManager`对`Recycler`的典型使用是为适配器的数据集获取给定位置或`item ID`的数据的视图。如果要重用的视图被认为是 “脏的”，适配器将被要求重新绑定它。如果不是，该视图可以被`LayoutManager`快速重用，而无需进一步的工作。没有的干净视图可以由`LayoutManager`重新定位，而无需重新测量。

简单来说`Recycler`用来缓存和从缓存中获取`ViewHoder`的。`Recycler`中定义了如下几个`list`来存放缓存：

```java
//存放废弃的view
 final ArrayList<ViewHolder> mAttachedScrap = new ArrayList<>();
 //存放改变的废弃的view
 ArrayList<ViewHolder> mChangedScrap = null;
 //缓存view
 final ArrayList<ViewHolder> mCachedViews = new ArrayList<ViewHolder>();
 //最多缓存个数
 int mViewCacheMax = DEFAULT_CACHE_SIZE;
 //默认缓存为2
 static final int DEFAULT_CACHE_SIZE = 2;
 //更新缓存大小
void updateViewCacheSize() {
    int extraCache = mLayout != null ? mLayout.mPrefetchMaxCountObserved : 0;
    mViewCacheMax = mRequestedCacheMax + extraCache;

    // first, try the views that can be recycled
    for (int i = mCachedViews.size() - 1;
            i >= 0 && mCachedViews.size() > mViewCacheMax; i--) {
        recycleCachedViewAt(i);
    }
}
```

查找这几个list的`add`和`remove`以及`clear`方法调用。

`mCachedViews`的`add`、`remove`以及`clear`方法调用。

```java
//从mCachedViews中移除
void recycleCachedViewAt(int cachedViewIndex) {
    ViewHolder viewHolder = mCachedViews.get(cachedViewIndex);
    //从mCachedViews中移除添加到RecycledViewPool
    addViewHolderToRecycledViewPool(viewHolder, true);
    mCachedViews.remove(cachedViewIndex);
}
//添加到RecycledViewPool
void addViewHolderToRecycledViewPool(@NonNull ViewHolder holder, boolean dispatchRecycled) {
    clearNestedRecyclerViewIfNotNested(holder);
    View itemView = holder.itemView;
    //
    holder.mBindingAdapter = null;
    holder.mOwnerRecyclerView = null;
    //调用RecycledViewPool的putRecycledView方法
    getRecycledViewPool().putRecycledView(holder);
}
//添加到mCachedViews中
void recycleViewHolderInternal(ViewHolder holder) {
  if (forceRecycle || holder.isRecyclable()) {
      //存入到mCachedViews中
      if (mViewCacheMax > 0
              && !holder.hasAnyOfTheFlags(ViewHolder.FLAG_INVALID
              | ViewHolder.FLAG_REMOVED
              | ViewHolder.FLAG_UPDATE
              | ViewHolder.FLAG_ADAPTER_POSITION_UNKNOWN)) {
          // Retire oldest cached view
          int cachedViewSize = mCachedViews.size();
          //当mCachedViews size超过最大缓存数时移除第一个
          if (cachedViewSize >= mViewCacheMax && cachedViewSize > 0) {
              recycleCachedViewAt(0);
              cachedViewSize--;
          }

          int targetCacheIndex = cachedViewSize;
          if (ALLOW_THREAD_GAP_WORK
                  && cachedViewSize > 0
                  && !mPrefetchRegistry.lastPrefetchIncludedPosition(holder.mPosition)) {
              // when adding the view, skip past most recently prefetched views
              int cacheIndex = cachedViewSize - 1;
              while (cacheIndex >= 0) {
                  int cachedPos = mCachedViews.get(cacheIndex).mPosition;
                  if (!mPrefetchRegistry.lastPrefetchIncludedPosition(cachedPos)) {
                      break;
                  }
                  cacheIndex--;
              }
              targetCacheIndex = cacheIndex + 1;
          }
          mCachedViews.add(targetCacheIndex, holder);
          cached = true;
      }
      //不满足条件的时候存入RecyclerViewPool
      if (!cached) {
          addViewHolderToRecycledViewPool(holder, true);
          recycled = true;
      }
  } else {
      // NOTE: A view can fail to be recycled when it is scrolled off while an animation
      // runs. In this case, the item is eventually recycled by
      // ItemAnimatorRestoreListener#onAnimationFinished.

      // TODO: consider cancelling an animation when an item is removed scrollBy,
      // to return it to the pool faster
  }
}
//
void recycleAndClearCachedViews() {
    final int count = mCachedViews.size();
    for (int i = count - 1; i >= 0; i--) {
        recycleCachedViewAt(i);
    }
    mCachedViews.clear();
    //...
}
```

`mAttachedScrap`和`mChangedScrap`的`add`、`remove`以及`clear`方法调用。

```java
/**
  * Mark an attached view as scrap.
  *
  * <p>"Scrap" views are still attached to their parent RecyclerView but are eligible
  * for rebinding and reuse. Requests for a view for a given position may return a
  * reused or rebound scrap view instance.</p>
  *
  * @param view View to scrap
  */
void scrapView(View view) {
    final ViewHolder holder = getChildViewHolderInt(view);
    if (holder.hasAnyOfTheFlags(ViewHolder.FLAG_REMOVED | ViewHolder.FLAG_INVALID)
            || !holder.isUpdated() || canReuseUpdatedViewHolder(holder)) {
        if (holder.isInvalid() && !holder.isRemoved() && !mAdapter.hasStableIds()) {
            throw new IllegalArgumentException("Called scrap view with an invalid view."
                    + " Invalid views cannot be reused from scrap, they should rebound from"
                    + " recycler pool." + exceptionLabel());
        }
        holder.setScrapContainer(this, false);
        //添加到mAttachedScrap集合中
        mAttachedScrap.add(holder);
    } else {
        if (mChangedScrap == null) {
            mChangedScrap = new ArrayList<ViewHolder>();
        }
        holder.setScrapContainer(this, true);
        mChangedScrap.add(holder);
    }
}
void clearScrap() {
    mAttachedScrap.clear();
    if (mChangedScrap != null) {
        mChangedScrap.clear();
    }
}
/**
  * Remove a previously scrapped view from the pool of eligible scrap.
  *
  * <p>This view will no longer be eligible for reuse until re-scrapped or
  * until it is explicitly removed and recycled.</p>
  */
void unscrapView(ViewHolder holder) {
    if (holder.mInChangeScrap) {
        mChangedScrap.remove(holder);
    } else {
        mAttachedScrap.remove(holder);
    }
    holder.mScrapContainer = null;
    holder.mInChangeScrap = false;
    holder.clearReturnedFromScrapFlag();
}
```


## RecycledViewPool

`RecycledViewPool`允许多个`RecyclerView`共享`View`.

如果你想在不同的RecyclerViews中循环使用视图。创建一个`RecycledViewPool`的实例并传递给`RecyclerView#setRecycledViewPool(RecycledViewPool)`。

如果你不提供一个`RecycledViewPool`，`RecyclerView`会自动为自己创建一个。

默认`RecycledViewPool`在`Recycler`的`getRecycledViewPool`方法中创建。

```java
RecycledViewPool getRecycledViewPool() {
  if (mRecyclerPool == null) {
      mRecyclerPool = new RecycledViewPool();
  }
  return mRecyclerPool;
}
```

```java
//缓存池
SparseArray<ScrapData> mScrap = new SparseArray<>();

static class ScrapData {
    final ArrayList<ViewHolder> mScrapHeap = new ArrayList<>();
    int mMaxScrap = DEFAULT_MAX_SCRAP;
    long mCreateRunningAverageNs = 0;
    long mBindRunningAverageNs = 0;
}
//存入缓存
public void putRecycledView(ViewHolder scrap) {
    final int viewType = scrap.getItemViewType();
    final ArrayList<ViewHolder> scrapHeap = getScrapDataForType(viewType).mScrapHeap;
    if (mScrap.get(viewType).mMaxScrap <= scrapHeap.size()) {
        return;
    }
    if (DEBUG && scrapHeap.contains(scrap)) {
        throw new IllegalArgumentException("this scrap item already exists");
    }
    scrap.resetInternal();
    scrapHeap.add(scrap);
}
//从缓存中获取ViewHolder
/**
  * Acquire a ViewHolder of the specified type from the pool, or {@code null} if none are
  * present.
  *
  * @param viewType ViewHolder type.
  * @return ViewHolder of the specified type acquired from the pool, or {@code null} if none
  * are present.
  */
@Nullable
public ViewHolder getRecycledView(int viewType) {
    final ScrapData scrapData = mScrap.get(viewType);
    if (scrapData != null && !scrapData.mScrapHeap.isEmpty()) {
        final ArrayList<ViewHolder> scrapHeap = scrapData.mScrapHeap;
        for (int i = scrapHeap.size() - 1; i >= 0; i--) {
            if (!scrapHeap.get(i).isAttachedToTransitionOverlay()) {
                return scrapHeap.remove(i);
            }
        }
    }
    return null;
}
```

