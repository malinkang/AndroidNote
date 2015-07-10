## ListView



<h3>1.ListView源码分析</h3>


<h4 id="1.1SetAdapter过程分析">1.1SetAdapter过程分析</h4>

```java

    /**
     * Sets the data behind this ListView.
     *
     * The adapter passed to this method may be wrapped by a {@link WrapperListAdapter},
     * depending on the ListView features currently in use. For instance, adding
     * headers and/or footers will cause the adapter to be wrapped.
     *
     * @param adapter The ListAdapter which is responsible for maintaining the
     *        data backing this list and for producing a view to represent an
     *        item in that data set.
     *
     * @see #getAdapter()
     */
    @Override
    public void setAdapter(ListAdapter adapter) {
        if (mAdapter != null && mDataSetObserver != null) {
            mAdapter.unregisterDataSetObserver(mDataSetObserver);
        }
        resetList();
        mRecycler.clear();

        if (mHeaderViewInfos.size() > 0|| mFooterViewInfos.size() > 0) {
            mAdapter = new HeaderViewListAdapter(mHeaderViewInfos, mFooterViewInfos, adapter);
        } else {
            mAdapter = adapter;
        }

        mOldSelectedPosition = INVALID_POSITION;
        mOldSelectedRowId = INVALID_ROW_ID;
        // 调用父类的setAdapter方法
        super.setAdapter(adapter);

        if (mAdapter != null) {
            mAreAllItemsSelectable = mAdapter.areAllItemsEnabled();
            mOldItemCount = mItemCount;
            mItemCount = mAdapter.getCount();
            checkFocus();
            // 创建DataSetObserver
            mDataSetObserver = new AdapterDataSetObserver();
            mAdapter.registerDataSetObserver(mDataSetObserver);

            mRecycler.setViewTypeCount(mAdapter.getViewTypeCount());

            int position;
            if (mStackFromBottom) {
                position = lookForSelectablePosition(mItemCount - 1, false);
            } else {
                position = lookForSelectablePosition(0, true);
            }
            setSelectedPositionInt(position);
            setNextSelectedPositionInt(position);

            if (mItemCount == 0) {
                // Nothing selected
                checkSelectionChanged();
            }
        } else {
            mAreAllItemsSelectable = true;
            checkFocus();
            // Nothing selected
            checkSelectionChanged();
        }

        requestLayout();
    }

```
`AbsListView`的内部类`RecycleBin`用于辅助ListView复用View。

```java
/**
     * The RecycleBin facilitates reuse of views across layouts. The RecycleBin has two levels of
     * storage: ActiveViews and ScrapViews. ActiveViews are those views which were onscreen at the
     * start of a layout. By construction, they are displaying current information. At the end of
     * layout, all views in ActiveViews are demoted to ScrapViews. ScrapViews are old views that
     * could potentially be used by the adapter to avoid allocating views unnecessarily.
     *
     * @see android.widget.AbsListView#setRecyclerListener(android.widget.AbsListView.RecyclerListener)
     * @see android.widget.AbsListView.RecyclerListener
     */
 class RecycleBin {
        private RecyclerListener mRecyclerListener;

        /**
         * The position of the first view stored in mActiveViews.
         */
        private int mFirstActivePosition;

        /**
         * Views that were on screen at the start of layout. This array is populated at the start of
         * layout, and at the end of layout all view in mActiveViews are moved to mScrapViews.
         * Views in mActiveViews represent a contiguous range of Views, with position of the first
         * view store in mFirstActivePosition.
         */
        private View[] mActiveViews = new View[0];

        /**
         * Unsorted views that can be used by the adapter as a convert view.
         */
        private ArrayList<View>[] mScrapViews;

        private int mViewTypeCount;

        private ArrayList<View> mCurrentScrap;

        private ArrayList<View> mSkippedScrap;

        private SparseArray<View> mTransientStateViews;
        private LongSparseArray<View> mTransientStateViewsById;

        public void setViewTypeCount(int viewTypeCount) {
            if (viewTypeCount < 1) {
                throw new IllegalArgumentException("Can't have a viewTypeCount < 1");
            }
            //noinspection unchecked
            ArrayList<View>[] scrapViews = new ArrayList[viewTypeCount];
            for (int i = 0; i < viewTypeCount; i++) {
                scrapViews[i] = new ArrayList<View>();
            }
            mViewTypeCount = viewTypeCount;
            mCurrentScrap = scrapViews[0];
            mScrapViews = scrapViews;
        }

        public void markChildrenDirty() {
            if (mViewTypeCount == 1) {
                final ArrayList<View> scrap = mCurrentScrap;
                final int scrapCount = scrap.size();
                for (int i = 0; i < scrapCount; i++) {
                    scrap.get(i).forceLayout();
                }
            } else {
                final int typeCount = mViewTypeCount;
                for (int i = 0; i < typeCount; i++) {
                    final ArrayList<View> scrap = mScrapViews[i];
                    final int scrapCount = scrap.size();
                    for (int j = 0; j < scrapCount; j++) {
                        scrap.get(j).forceLayout();
                    }
                }
            }
            if (mTransientStateViews != null) {
                final int count = mTransientStateViews.size();
                for (int i = 0; i < count; i++) {
                    mTransientStateViews.valueAt(i).forceLayout();
                }
            }
            if (mTransientStateViewsById != null) {
                final int count = mTransientStateViewsById.size();
                for (int i = 0; i < count; i++) {
                    mTransientStateViewsById.valueAt(i).forceLayout();
                }
            }
        }

        public boolean shouldRecycleViewType(int viewType) {
            return viewType >= 0;
        }

        /**
         * Clears the scrap heap.
         */
        void clear() {
            if (mViewTypeCount == 1) {
                final ArrayList<View> scrap = mCurrentScrap;
                clearScrap(scrap);
            } else {
                final int typeCount = mViewTypeCount;
                for (int i = 0; i < typeCount; i++) {
                    final ArrayList<View> scrap = mScrapViews[i];
                    clearScrap(scrap);
                }
            }

            clearTransientStateViews();
        }

        /**
         * Fill ActiveViews with all of the children of the AbsListView.
         *
         * @param childCount The minimum number of views mActiveViews should hold
         * @param firstActivePosition The position of the first view that will be stored in
         *        mActiveViews
         */
        void fillActiveViews(int childCount, int firstActivePosition) {
            if (mActiveViews.length < childCount) {
                mActiveViews = new View[childCount];
            }
            mFirstActivePosition = firstActivePosition;

            //noinspection MismatchedReadAndWriteOfArray
            final View[] activeViews = mActiveViews;
            for (int i = 0; i < childCount; i++) {
                View child = getChildAt(i);
                AbsListView.LayoutParams lp = (AbsListView.LayoutParams) child.getLayoutParams();
                // Don't put header or footer views into the scrap heap
                if (lp != null && lp.viewType != ITEM_VIEW_TYPE_HEADER_OR_FOOTER) {
                    // Note:  We do place AdapterView.ITEM_VIEW_TYPE_IGNORE in active views.
                    //        However, we will NOT place them into scrap views.
                    activeViews[i] = child;
                }
            }
        }

        /**
         * Get the view corresponding to the specified position. The view will be removed from
         * mActiveViews if it is found.
         *
         * @param position The position to look up in mActiveViews
         * @return The view if it is found, null otherwise
         */
        View getActiveView(int position) {
            int index = position - mFirstActivePosition;
            final View[] activeViews = mActiveViews;
            if (index >=0 && index < activeViews.length) {
                final View match = activeViews[index];
                activeViews[index] = null;
                return match;
            }
            return null;
        }

        View getTransientStateView(int position) {
            if (mAdapter != null && mAdapterHasStableIds && mTransientStateViewsById != null) {
                long id = mAdapter.getItemId(position);
                View result = mTransientStateViewsById.get(id);
                mTransientStateViewsById.remove(id);
                return result;
            }
            if (mTransientStateViews != null) {
                final int index = mTransientStateViews.indexOfKey(position);
                if (index >= 0) {
                    View result = mTransientStateViews.valueAt(index);
                    mTransientStateViews.removeAt(index);
                    return result;
                }
            }
            return null;
        }

        /**
         * Dumps and fully detaches any currently saved views with transient
         * state.
         */
        void clearTransientStateViews() {
            final SparseArray<View> viewsByPos = mTransientStateViews;
            if (viewsByPos != null) {
                final int N = viewsByPos.size();
                for (int i = 0; i < N; i++) {
                    removeDetachedView(viewsByPos.valueAt(i), false);
                }
                viewsByPos.clear();
            }

            final LongSparseArray<View> viewsById = mTransientStateViewsById;
            if (viewsById != null) {
                final int N = viewsById.size();
                for (int i = 0; i < N; i++) {
                    removeDetachedView(viewsById.valueAt(i), false);
                }
                viewsById.clear();
            }
        }

        /**
         * @return A view from the ScrapViews collection. These are unordered.
         */
        View getScrapView(int position) {
            if (mViewTypeCount == 1) {
                return retrieveFromScrap(mCurrentScrap, position);
            } else {
                final int whichScrap = mAdapter.getItemViewType(position);
                if (whichScrap >= 0 && whichScrap < mScrapViews.length) {
                    return retrieveFromScrap(mScrapViews[whichScrap], position);
                }
            }
            return null;
        }

        /**
         * Puts a view into the list of scrap views.
         * <p>
         * If the list data hasn't changed or the adapter has stable IDs, views
         * with transient state will be preserved for later retrieval.
         *
         * @param scrap The view to add
         * @param position The view's position within its parent
         */
        void addScrapView(View scrap, int position) {
            final AbsListView.LayoutParams lp = (AbsListView.LayoutParams) scrap.getLayoutParams();
            if (lp == null) {
                return;
            }

            lp.scrappedFromPosition = position;

            // Remove but don't scrap header or footer views, or views that
            // should otherwise not be recycled.
            final int viewType = lp.viewType;
            if (!shouldRecycleViewType(viewType)) {
                return;
            }

            scrap.dispatchStartTemporaryDetach();

            // The the accessibility state of the view may change while temporary
            // detached and we do not allow detached views to fire accessibility
            // events. So we are announcing that the subtree changed giving a chance
            // to clients holding on to a view in this subtree to refresh it.
            notifyViewAccessibilityStateChangedIfNeeded(
                    AccessibilityEvent.CONTENT_CHANGE_TYPE_SUBTREE);

            // Don't scrap views that have transient state.
            final boolean scrapHasTransientState = scrap.hasTransientState();
            if (scrapHasTransientState) {
                if (mAdapter != null && mAdapterHasStableIds) {
                    // If the adapter has stable IDs, we can reuse the view for
                    // the same data.
                    if (mTransientStateViewsById == null) {
                        mTransientStateViewsById = new LongSparseArray<View>();
                    }
                    mTransientStateViewsById.put(lp.itemId, scrap);
                } else if (!mDataChanged) {
                    // If the data hasn't changed, we can reuse the views at
                    // their old positions.
                    if (mTransientStateViews == null) {
                        mTransientStateViews = new SparseArray<View>();
                    }
                    mTransientStateViews.put(position, scrap);
                } else {
                    // Otherwise, we'll have to remove the view and start over.
                    if (mSkippedScrap == null) {
                        mSkippedScrap = new ArrayList<View>();
                    }
                    mSkippedScrap.add(scrap);
                }
            } else {
                if (mViewTypeCount == 1) {
                    mCurrentScrap.add(scrap);
                } else {
                    mScrapViews[viewType].add(scrap);
                }

                if (mRecyclerListener != null) {
                    mRecyclerListener.onMovedToScrapHeap(scrap);
                }
            }
        }

        /**
         * Finish the removal of any views that skipped the scrap heap.
         */
        void removeSkippedScrap() {
            if (mSkippedScrap == null) {
                return;
            }
            final int count = mSkippedScrap.size();
            for (int i = 0; i < count; i++) {
                removeDetachedView(mSkippedScrap.get(i), false);
            }
            mSkippedScrap.clear();
        }

        /**
         * Move all views remaining in mActiveViews to mScrapViews.
         */
        void scrapActiveViews() {
            final View[] activeViews = mActiveViews;
            final boolean hasListener = mRecyclerListener != null;
            final boolean multipleScraps = mViewTypeCount > 1;

            ArrayList<View> scrapViews = mCurrentScrap;
            final int count = activeViews.length;
            for (int i = count - 1; i >= 0; i--) {
                final View victim = activeViews[i];
                if (victim != null) {
                    final AbsListView.LayoutParams lp
                            = (AbsListView.LayoutParams) victim.getLayoutParams();
                    final int whichScrap = lp.viewType;

                    activeViews[i] = null;

                    if (victim.hasTransientState()) {
                        // Store views with transient state for later use.
                        victim.dispatchStartTemporaryDetach();

                        if (mAdapter != null && mAdapterHasStableIds) {
                            if (mTransientStateViewsById == null) {
                                mTransientStateViewsById = new LongSparseArray<View>();
                            }
                            long id = mAdapter.getItemId(mFirstActivePosition + i);
                            mTransientStateViewsById.put(id, victim);
                        } else if (!mDataChanged) {
                            if (mTransientStateViews == null) {
                                mTransientStateViews = new SparseArray<View>();
                            }
                            mTransientStateViews.put(mFirstActivePosition + i, victim);
                        } else if (whichScrap != ITEM_VIEW_TYPE_HEADER_OR_FOOTER) {
                            // The data has changed, we can't keep this view.
                            removeDetachedView(victim, false);
                        }
                    } else if (!shouldRecycleViewType(whichScrap)) {
                        // Discard non-recyclable views except headers/footers.
                        if (whichScrap != ITEM_VIEW_TYPE_HEADER_OR_FOOTER) {
                            removeDetachedView(victim, false);
                        }
                    } else {
                        // Store everything else on the appropriate scrap heap.
                        if (multipleScraps) {
                            scrapViews = mScrapViews[whichScrap];
                        }

                        victim.dispatchStartTemporaryDetach();
                        lp.scrappedFromPosition = mFirstActivePosition + i;
                        scrapViews.add(victim);

                        if (hasListener) {
                            mRecyclerListener.onMovedToScrapHeap(victim);
                        }
                    }
                }
            }

            pruneScrapViews();
        }

        /**
         * Makes sure that the size of mScrapViews does not exceed the size of
         * mActiveViews, which can happen if an adapter does not recycle its
         * views. Removes cached transient state views that no longer have
         * transient state.
         */
        private void pruneScrapViews() {
            final int maxViews = mActiveViews.length;
            final int viewTypeCount = mViewTypeCount;
            final ArrayList<View>[] scrapViews = mScrapViews;
            for (int i = 0; i < viewTypeCount; ++i) {
                final ArrayList<View> scrapPile = scrapViews[i];
                int size = scrapPile.size();
                final int extras = size - maxViews;
                size--;
                for (int j = 0; j < extras; j++) {
                    removeDetachedView(scrapPile.remove(size--), false);
                }
            }

            final SparseArray<View> transViewsByPos = mTransientStateViews;
            if (transViewsByPos != null) {
                for (int i = 0; i < transViewsByPos.size(); i++) {
                    final View v = transViewsByPos.valueAt(i);
                    if (!v.hasTransientState()) {
                        removeDetachedView(v, false);
                        transViewsByPos.removeAt(i);
                        i--;
                    }
                }
            }

            final LongSparseArray<View> transViewsById = mTransientStateViewsById;
            if (transViewsById != null) {
                for (int i = 0; i < transViewsById.size(); i++) {
                    final View v = transViewsById.valueAt(i);
                    if (!v.hasTransientState()) {
                        removeDetachedView(v, false);
                        transViewsById.removeAt(i);
                        i--;
                    }
                }
            }
        }

        /**
         * Puts all views in the scrap heap into the supplied list.
         */
        void reclaimScrapViews(List<View> views) {
            if (mViewTypeCount == 1) {
                views.addAll(mCurrentScrap);
            } else {
                final int viewTypeCount = mViewTypeCount;
                final ArrayList<View>[] scrapViews = mScrapViews;
                for (int i = 0; i < viewTypeCount; ++i) {
                    final ArrayList<View> scrapPile = scrapViews[i];
                    views.addAll(scrapPile);
                }
            }
        }

        /**
         * Updates the cache color hint of all known views.
         *
         * @param color The new cache color hint.
         */
        void setCacheColorHint(int color) {
            if (mViewTypeCount == 1) {
                final ArrayList<View> scrap = mCurrentScrap;
                final int scrapCount = scrap.size();
                for (int i = 0; i < scrapCount; i++) {
                    scrap.get(i).setDrawingCacheBackgroundColor(color);
                }
            } else {
                final int typeCount = mViewTypeCount;
                for (int i = 0; i < typeCount; i++) {
                    final ArrayList<View> scrap = mScrapViews[i];
                    final int scrapCount = scrap.size();
                    for (int j = 0; j < scrapCount; j++) {
                        scrap.get(j).setDrawingCacheBackgroundColor(color);
                    }
                }
            }
            // Just in case this is called during a layout pass
            final View[] activeViews = mActiveViews;
            final int count = activeViews.length;
            for (int i = 0; i < count; ++i) {
                final View victim = activeViews[i];
                if (victim != null) {
                    victim.setDrawingCacheBackgroundColor(color);
                }
            }
        }

        private View retrieveFromScrap(ArrayList<View> scrapViews, int position) {
            final int size = scrapViews.size();
            if (size > 0) {
                // See if we still have a view for this position or ID.
                for (int i = 0; i < size; i++) {
                    final View view = scrapViews.get(i);
                    final AbsListView.LayoutParams params =
                            (AbsListView.LayoutParams) view.getLayoutParams();

                    if (mAdapterHasStableIds) {
                        final long id = mAdapter.getItemId(position);
                        if (id == params.itemId) {
                            return scrapViews.remove(i);
                        }
                    } else if (params.scrappedFromPosition == position) {
                        final View scrap = scrapViews.remove(i);
                        clearAccessibilityFromScrap(scrap);
                        return scrap;
                    }
                }
                final View scrap = scrapViews.remove(size - 1);
                clearAccessibilityFromScrap(scrap);
                return scrap;
            } else {
                return null;
            }
        }

        private void clearScrap(final ArrayList<View> scrap) {
            final int scrapCount = scrap.size();
            for (int j = 0; j < scrapCount; j++) {
                removeDetachedView(scrap.remove(scrapCount - 1 - j), false);
            }
        }

        private void clearAccessibilityFromScrap(View view) {
            if (view.isAccessibilityFocused()) {
                view.clearAccessibilityFocus();
            }
            view.setAccessibilityDelegate(null);
        }

        private void removeDetachedView(View child, boolean animate) {
            child.setAccessibilityDelegate(null);
            AbsListView.this.removeDetachedView(child, animate);
        }
    }
```

AbsListView的obtain方法
```java

    /**
     * Get a view and have it show the data associated with the specified
     * position. This is called when we have already discovered that the view is
     * not available for reuse in the recycle bin. The only choices left are
     * converting an old view or making a new one.
     *
     * @param position The position to display
     * @param isScrap Array of at least 1 boolean, the first entry will become true if
     *                the returned view was taken from the scrap heap, false if otherwise.
     *
     * @return A view displaying the data associated with the specified position
     */
    View obtainView(int position, boolean[] isScrap) {
        Trace.traceBegin(Trace.TRACE_TAG_VIEW, "obtainView");

        isScrap[0] = false;

        // Check whether we have a transient state view. Attempt to re-bind the
        // data and discard the view if we fail.
        final View transientView = mRecycler.getTransientStateView(position);
        if (transientView != null) {
            final LayoutParams params = (LayoutParams) transientView.getLayoutParams();

            // If the view type hasn't changed, attempt to re-bind the data.
            if (params.viewType == mAdapter.getItemViewType(position)) {
                final View updatedView = mAdapter.getView(position, transientView, this);

                // If we failed to re-bind the data, scrap the obtained view.
                if (updatedView != transientView) {
                    setItemViewLayoutParams(updatedView, position);
                    mRecycler.addScrapView(updatedView, position);
                }
            }

            // Scrap view implies temporary detachment.
            isScrap[0] = true;
            return transientView;
        }

        final View scrapView = mRecycler.getScrapView(position);
        final View child = mAdapter.getView(position, scrapView, this);
        if (scrapView != null) {
            if (child != scrapView) {
                // Failed to re-bind the data, return scrap to the heap.
                mRecycler.addScrapView(scrapView, position);
            } else {
                isScrap[0] = true;

                child.dispatchFinishTemporaryDetach();
            }
        }

        if (mCacheColorHint != 0) {
            child.setDrawingCacheBackgroundColor(mCacheColorHint);
        }

        if (child.getImportantForAccessibility() == IMPORTANT_FOR_ACCESSIBILITY_AUTO) {
            child.setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_YES);
        }

        setItemViewLayoutParams(child, position);

        if (AccessibilityManager.getInstance(mContext).isEnabled()) {
            if (mAccessibilityDelegate == null) {
                mAccessibilityDelegate = new ListItemAccessibilityDelegate();
            }
            if (child.getAccessibilityDelegate() == null) {
                child.setAccessibilityDelegate(mAccessibilityDelegate);
            }
        }

        Trace.traceEnd(Trace.TRACE_TAG_VIEW);

        return child;
    }
```
<h4 id="1.2Adapter刷新">1.2Adapter刷新</h4>

Adapter刷新调用ListView中定义的DataSetObserver的onChanged方法。
```java
class AdapterDataSetObserver extends DataSetObserver {

        private Parcelable mInstanceState = null;

        @Override
        public void onChanged() {
            mDataChanged = true;
            mOldItemCount = mItemCount;
            mItemCount = getAdapter().getCount();

            // Detect the case where a cursor that was previously invalidated has
            // been repopulated with new data.
            if (AdapterView.this.getAdapter().hasStableIds() && mInstanceState != null
                    && mOldItemCount == 0 && mItemCount > 0) {
                AdapterView.this.onRestoreInstanceState(mInstanceState);
                mInstanceState = null;
            } else {
                rememberSyncState();
            }
            checkFocus();
            requestLayout();
        }

     ...
```
```java
 /**
     * Remember enough information to restore the screen state when the data has
     * changed.
     *
     */
    void rememberSyncState() {
        if (getChildCount() > 0) {
            mNeedSync = true;
            mSyncHeight = mLayoutHeight;
            if (mSelectedPosition >= 0) {
                // Sync the selection state
                View v = getChildAt(mSelectedPosition - mFirstPosition);
                mSyncRowId = mNextSelectedRowId;
                mSyncPosition = mNextSelectedPosition;
                if (v != null) {
                    mSpecificTop = v.getTop();
                }
                mSyncMode = SYNC_SELECTED_POSITION;
            } else {
                // Sync the based on the offset of the first view
                View v = getChildAt(0);
                T adapter = getAdapter();
                if (mFirstPosition >= 0 && mFirstPosition < adapter.getCount()) {
                    mSyncRowId = adapter.getItemId(mFirstPosition);
                } else {
                    mSyncRowId = NO_ID;
                }
                mSyncPosition = mFirstPosition;
                if (v != null) {
                    mSpecificTop = v.getTop();
                }
                mSyncMode = SYNC_FIRST_POSITION;
            }
        }
    }
```



