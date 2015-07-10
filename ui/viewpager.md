## ViewPager使用

### PagerAdapter

如果要继承PagerAdapter，必须重写四个方法

* public Object instantiateItem(ViewGroup container, int position) 
* public void destroyItem(ViewGroup container, int position, Object object)
* public abstract int getCount();
* public abstract boolean isViewFromObject(View view, Object object);

## 扩展更多
* [Great animations with PageTransformer](https://medium.com/@BashaChris/the-android-viewpager-has-become-a-fairly-popular-component-among-android-apps-its-simple-6bca403b16d4)
* [为什么调用 FragmentPagerAdapter.notifyDataSetChanged() 并不能更新其 Fragment？](http://www.cnblogs.com/dancefire/archive/2013/01/02/why-notifyDataSetChanged-does-not-work.html)

