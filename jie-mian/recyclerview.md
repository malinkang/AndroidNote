# RecyclerView

## 简化Adapter

在实际的开发中，我们的项目中可能存在多个列表，每个列表都必须创建一个Adapter。每一个Adapter都有大量的重复代码，比如`onCreateViewHolder`方法，每个adapter的操作都差不多，获取view，然后创建一个ViewHolder并返回。我们可以保留相同的操作，将不同的操作抽取出来，达到简化代码的效果。

下面是我进行抽取和封装一个BaseRecyclerViewAdapter：

```java
public abstract class BaseRecyclerViewAdapter<T> extends RecyclerView.Adapter {
    private List<T> mList;
    private Context mContext;
    private OnItemClickListener mOnItemClickListener;
    public static final int TYPE_HEADER = 100;
    public static final int TYPE_FOOTER = 101;
    private List<View> mHeaders = new ArrayList<>();
    private List<View> mFooters = new ArrayList<>();
    public interface OnItemClickListener {
        void onItemClick(View v, int position);
    }
    public void setOnItemClickListener(OnItemClickListener onItemClickListener) {
        mOnItemClickListener = onItemClickListener;
    }
    public BaseRecyclerViewAdapter(Context context, List<T> list) {
        mContext = context;
        mList = list;
    }
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        if (viewType != TYPE_HEADER && viewType != TYPE_FOOTER) {
            AdapterItem<T> item = createAdapterItem();
            View view = LayoutInflater.from(mContext).inflate(item.getLayoutResId(viewType), parent, false);
            return new ViewHolder(view, createAdapterItem());
        } else {
            FrameLayout frameLayout = new FrameLayout(parent.getContext());
            frameLayout.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
            return new HeaderFooterViewHolder(frameLayout);
        }
    }
    public abstract AdapterItem<T> createAdapterItem();
    @Override
    public void onBindViewHolder(RecyclerView.ViewHolder holder, int position) {
        if (isHeader(position)) {
            View v = mHeaders.get(position);
            prepareHeaderFooter((HeaderFooterViewHolder) holder, v);
        } else if (isFooter(position)) {
            View v = mFooters.get(position - mList.size() - mHeaders.size());
            prepareHeaderFooter((HeaderFooterViewHolder) holder, v);
        } else {
            T t = mList.get(position - mHeaders.size());
            ((ViewHolder) holder).item.bindData(mContext, position, t, getItemViewType(position));
            if (mOnItemClickListener != null) {
                holder.itemView.setOnClickListener(v -> {
                    mOnItemClickListener.onItemClick(v, position);
                });
            }
        }
    }
    private void prepareHeaderFooter(HeaderFooterViewHolder vh, View view) {
        if (view.getParent() != null) {
            ((ViewGroup) view.getParent()).removeView(view);
        }
        vh.base.removeAllViews();
        vh.base.addView(view);
    }
    @Override
    public int getItemCount() {
        return mHeaders.size() + mList.size() + mFooters.size();
    }
    private boolean isHeader(int position) {
        return (position < mHeaders.size());
    }
    private boolean isFooter(int position) {
        return (position >= mHeaders.size() + mList.size());
    }
    @Override
    public int getItemViewType(int position) {
        if (isHeader(position)) {
            return TYPE_HEADER;
        } else if (isFooter(position)) {
            return TYPE_FOOTER;
        } else {
            T t = mList.get(position - mHeaders.size());
            return createViewType(position, t);
        }
    }
    public abstract int createViewType(int position, T t);
    public boolean hasFooter() {
        return mFooters.size() > 0;
    }
    public void addHeader(View header) {
        if (!mHeaders.contains(header)) {
            mHeaders.add(header);
            notifyItemInserted(mHeaders.size() - 1);
        }
    }
    public void removeHeader(View header) {
        if (mHeaders.contains(header)) {
            notifyItemRemoved(mHeaders.indexOf(header));
            mHeaders.remove(header);
        }
    }
    public void addFooter(View footer) {
        if (!mFooters.contains(footer)) {
            mFooters.add(footer);
            notifyItemInserted(mHeaders.size() + mList.size() + mFooters.size() - 1);
        }
    }
    public void removeFooter(View footer) {
        if (mFooters.contains(footer)) {
            notifyItemRemoved(mHeaders.size() + mList.size() + mFooters.indexOf(footer));
            mFooters.remove(footer);
        }
    }
    static class ViewHolder<T> extends RecyclerView.ViewHolder {
        protected AdapterItem<T> item;
        protected ViewHolder(View itemView, AdapterItem<T> item) {
            super(itemView);
            this.item = item;
            this.item.bindViews(itemView);
        }
    }

    public static class HeaderFooterViewHolder extends RecyclerView.ViewHolder {
        FrameLayout base;
        public HeaderFooterViewHolder(View itemView) {
            super(itemView);
            base = (FrameLayout) itemView;
        }
    }
}
```

我们通过观察可以发现，每个Adapter不同的地方就是布局文件不同和绑定数据不一样。我们封装了一个AdapterItem的类来处理这些不同的操作。

```java
public interface AdapterItem<T> {
    @LayoutRes
    int getLayoutResId(int viewType);//获取布局文件的id
    void bindViews(final View root);//进行findViewById的操作
    void bindData(Context context, int position, T t, int viewType);//绑定数据
}
```

多个不同的列表我们就不需要创建多个Adapter，只需要实现自己的AdapterItem传给BaseRecyclerViewAdapter即可。AdapterItem相比创建一个Adapter代码量少很多。

```java
//实现自己的AdapterItem
public class FeedBackAdapterItem implements AdapterItem<FeedBackMessage> {
    @BindView(R.id.tv_user_name) TextView mUserName;
    @Override
    public int getLayoutResId(int viewType) {
        if (viewType == 0) {
            return R.layout.left_message_item;
        }
        return R.layout.right_message_item;
    }
    @Override
    public void bindViews(View root) {
        ButterKnife.bind(this, root);
    }
    @Override
    public void bindData(Context context, int position, FeedBackMessage feedBackMessage, int viewType) {
        mUserName.setText(feedBackMessage.nickname);
    }
}
//创建Adapter
BaseRecyclerViewAdapter adapter = new BaseRecyclerViewAdapter<FeedBackMessage>(this, mFeedBackMessageList) {
    @Override
    public AdapterItem<FeedBackMessage> createAdapterItem() {
        FeedBackAdapterItem adapterItem = new FeedBackAdapterItem();
        adapterItem.setOnThumbClickListener(FeedBackActivity.this);
        return adapterItem;
    }
    @Override
    public int createViewType(int position, FeedBackMessage message) {
        return message.is_admin == 1 ? 0 : 1;
    }
};
```

## 更多阅读

* [RecyclerView Part 1: Fundamentals For ListView Experts](http://www.bignerdranch.com/blog/recyclerview-part-1-fundamentals-for-listview-experts/)
* [RecyclerView Part 2: Choice Modes](https://www.bignerdranch.com/blog/recyclerview-part-2-choice-modes/)
* [CursorRecyclerAdapter](https://gist.github.com/Shywim/127f207e7248fe48400b)
* [expandable-recycler-view](https://github.com/bignerdranch/expandable-recycler-view)

