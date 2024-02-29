
上层View的`dispatchTouchEvent`会优先调用`onInterceptTouchEvent`判断自己是否处理，如果自己不处理则调用子`View`的`dispatchTouchEvent`，子`View`和上层`View`执行相同的操作，直到最底层的`View`。这和我们现实生活中的公司运作模式差不多，老板通过dispatchTouchEvent把任务交给经理，onInterceptTouchEvent用于判断自己是否要处理此事。如果自己没有时间或其他原因不处理，则返回`false`，然后交给底层处理。onTouchEvent是实际处理的动作，false代表不处理。如果工作传递给最底层，最底层的不能继续向下传递所以必须调用onTouchEvent，如果返回false，则调用上层的onTouchEvent，会层层调用onTouchEvent，直到最上层，丢弃事件。


如果上层 View 拦截了当前正在处理的事件，会收到一个 ACTION_CANCEL，表示当前事件已经结束，后续事件不会再传递过来。

```kotlin
class ParentView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet?,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {
    override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
        Log.d(ViewSample.TAG,"onInterceptTouchEvent ParentView = ${getNameForEvent(event.actionMasked)}")
        return event.actionMasked==MotionEvent.ACTION_MOVE
    }

    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        Log.d(ViewSample.TAG,"dispatchTouchEvent ParentView = ${getNameForEvent(event.actionMasked)}")

        return super.dispatchTouchEvent(event)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        Log.d(ViewSample.TAG,"ParentView = ${getNameForEvent(event.actionMasked)}")
        return super.onTouchEvent(event)
    }

}
```


```kotlin
class ChildView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet?,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {


    override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
        Log.d(ViewSample.TAG,"onInterceptTouchEvent ChildView = ${getNameForEvent(event.actionMasked)}")
        return super.onInterceptTouchEvent(event)
    }

    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        Log.d(ViewSample.TAG,"dispatchTouchEvent ChildView = ${getNameForEvent(event.actionMasked)}")

        return super.dispatchTouchEvent(event)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        Log.d(ViewSample.TAG,"onTouchEvent ChildView = ${getNameForEvent(event.actionMasked)}")
        return true
    }

}
```


```shell
D/ViewSample: dispatchTouchEvent ParentView = down
D/ViewSample: onInterceptTouchEvent ParentView = down
D/ViewSample: dispatchTouchEvent ChildView = down
D/ViewSample: onInterceptTouchEvent ChildView = down
D/ViewSample: onTouchEvent ChildView = down
D/ViewSample: dispatchTouchEvent ParentView = move
D/ViewSample: onInterceptTouchEvent ParentView = move
D/ViewSample: dispatchTouchEvent ChildView = cancel
D/ViewSample: onTouchEvent ChildView = cancel
D/ViewSample: dispatchTouchEvent ParentView = move
D/ViewSample: ParentView = move
```


## 源码分析



### 判断是否拦截事件

```java
//是否拦截
final boolean intercepted;
//当事件由子View处理，mFirstTouchTarget将指向子View
//所以这里的条件是如果是ACTION_DOWN或者由子View处理
//如果子View不处理ACTION_DOWN，则intercepted为true
if (actionMasked == MotionEvent.ACTION_DOWN
        || mFirstTouchTarget != null) {
    //如果调用requestDisallowInterceptTouchEvent，则disallowIntercept为true，则不拦截事件
    final boolean disallowIntercept = (mGroupFlags & FLAG_DISALLOW_INTERCEPT) != 0;
    if (!disallowIntercept) {
        intercepted = onInterceptTouchEvent(ev);
        ev.setAction(action); // restore action in case it was changed
    } else {
        intercepted = false;
    }
} else {
    // There are no touch targets and this action is not an initial down
    // so this view group continues to intercept touches.
    intercepted = true;
}
```


### 如果不拦截

```java
if (!canceled && !intercepted) {
    // If the event is targeting accessibility focus we give it to the
    // view that has accessibility focus and if it does not handle it
    // we clear the flag and dispatch the event to all children as usual.
    // We are looking up the accessibility focused host to avoid keeping
    // state since these events are very rare.
    View childWithAccessibilityFocus = ev.isTargetAccessibilityFocus()
            ? findChildWithAccessibilityFocus() : null;
    //如果是DOWN 
    if (actionMasked == MotionEvent.ACTION_DOWN
            || (split && actionMasked == MotionEvent.ACTION_POINTER_DOWN)
            || actionMasked == MotionEvent.ACTION_HOVER_MOVE) {
        final int actionIndex = ev.getActionIndex(); // always 0 for down
        final int idBitsToAssign = split ? 1 << ev.getPointerId(actionIndex)
                : TouchTarget.ALL_POINTER_IDS;

        // Clean up earlier touch targets for this pointer id in case they
        // have become out of sync.
        removePointersFromTouchTargets(idBitsToAssign);

        final int childrenCount = mChildrenCount;
        if (newTouchTarget == null && childrenCount != 0) {
            final float x =
                    isMouseEvent ? ev.getXCursorPosition() : ev.getX(actionIndex);
            final float y =
                    isMouseEvent ? ev.getYCursorPosition() : ev.getY(actionIndex);
            // Find a child that can receive the event.
            // Scan children from front to back.
            final ArrayList<View> preorderedList = buildTouchDispatchChildList();
            final boolean customOrder = preorderedList == null
                    && isChildrenDrawingOrderEnabled();
            final View[] children = mChildren;
            //遍历ViewGroup中的所有子元素
            for (int i = childrenCount - 1; i >= 0; i--) {
                final int childIndex = getAndVerifyPreorderedIndex(
                        childrenCount, i, customOrder);
                final View child = getAndVerifyPreorderedView(
                        preorderedList, children, childIndex);

                // If there is a view that has accessibility focus we want it
                // to get the event first and if not handled we will perform a
                // normal dispatch. We may do a double iteration but this is
                // safer given the timeframe.
                if (childWithAccessibilityFocus != null) {
                    if (childWithAccessibilityFocus != child) {
                        continue;
                    }
                    childWithAccessibilityFocus = null;
                    i = childrenCount - 1;
                }
                //判断子元素是否能够接收到点击事件
                //能够接收点击事件主要由两点衡量
                //1.子元素是否在播放动画
                //2.点击事件的坐标是否落在子元素的区域内
                if (!child.canReceivePointerEvents()
                        || !isTransformedTouchPointInView(x, y, child, null)) {
                    ev.setTargetAccessibilityFocus(false);
                    continue;
                }

                newTouchTarget = getTouchTarget(child);
                if (newTouchTarget != null) {
                    // Child is already receiving touch within its bounds.
                    // Give it the new pointer in addition to the ones it is handling.
                    newTouchTarget.pointerIdBits |= idBitsToAssign;
                    break;
                }

                resetCancelNextUpFlag(child);
                //dispatchTransformedTouchEvent实际上调用的是子元素的dispatchTouchEvent方法
                //如果子元素的dispatchTouchEvent方法返回true就会调用break跳出循环
                //如果子元素的dispatchTouchEvent方法返回false，ViewGroup就会将事件分发给下一个子元素
                if (dispatchTransformedTouchEvent(ev, false, child, idBitsToAssign)) {
                    // Child wants to receive touch within its bounds.
                    mLastTouchDownTime = ev.getDownTime();
                    if (preorderedList != null) {
                        // childIndex points into presorted list, find original index
                        for (int j = 0; j < childrenCount; j++) {
                            if (children[childIndex] == mChildren[j]) {
                                mLastTouchDownIndex = j;
                                break;
                            }
                        }
                    } else {
                        mLastTouchDownIndex = childIndex;
                    }
                    mLastTouchDownX = ev.getX();
                    mLastTouchDownY = ev.getY();
                    newTouchTarget = addTouchTarget(child, idBitsToAssign);
                    alreadyDispatchedToNewTouchTarget = true;
                    break;
                }

                // The accessibility focus didn't handle the event, so clear
                // the flag and do a normal dispatch to all children.
                ev.setTargetAccessibilityFocus(false);
            }
            if (preorderedList != null) preorderedList.clear();
        }

        if (newTouchTarget == null && mFirstTouchTarget != null) {
            // Did not find a child to receive the event.
            // Assign the pointer to the least recently added target.
            newTouchTarget = mFirstTouchTarget;
            while (newTouchTarget.next != null) {
                newTouchTarget = newTouchTarget.next;
            }
            newTouchTarget.pointerIdBits |= idBitsToAssign;
        }
    }
}
```


```java
private TouchTarget addTouchTarget(@NonNull View child, int pointerIdBits) {
    final TouchTarget target = TouchTarget.obtain(child, pointerIdBits);
    target.next = mFirstTouchTarget;
    mFirstTouchTarget = target;
    return target;
}
```


```java
private static final class TouchTarget {
    private static final int MAX_RECYCLED = 32;
    private static final Object sRecycleLock = new Object[0];
    private static TouchTarget sRecycleBin;
    private static int sRecycledCount;

    public static final int ALL_POINTER_IDS = -1; // all ones

    // The touched child view.
    @UnsupportedAppUsage
    public View child;

    // The combined bit mask of pointer ids for all pointers captured by the target.
    public int pointerIdBits;

    // The next target in the target list.
    public TouchTarget next;

    @UnsupportedAppUsage
    private TouchTarget() {
    }

    public static TouchTarget obtain(@NonNull View child, int pointerIdBits) {
        if (child == null) {
            throw new IllegalArgumentException("child must be non-null");
        }

        final TouchTarget target;
        synchronized (sRecycleLock) {
            if (sRecycleBin == null) {
                target = new TouchTarget();
            } else {
                target = sRecycleBin;
                sRecycleBin = target.next;
                 sRecycledCount--;
                target.next = null;
            }
        }
        target.child = child;
        target.pointerIdBits = pointerIdBits;
        return target;
    }

    public void recycle() {
        if (child == null) {
            throw new IllegalStateException("already recycled once");
        }

        synchronized (sRecycleLock) {
            if (sRecycledCount < MAX_RECYCLED) {
                next = sRecycleBin;
                sRecycleBin = this;
                sRecycledCount += 1;
            } else {
                next = null;
            }
            child = null;
        }
    }
}
```


### 如果子类不处理

安卓为了保证所有的事件都是被一个 View 消费的，对第一次的事件( ACTION_DOWN )进行了特殊判断，View 只有消费了 `ACTION_DOWN` 事件，才能接收到后续的事件(可点击控件会默认消费所有事件)，并且会将后续所有事件传递过来，不会再传递给其他 View，除非上层 View 进行了拦截。如果不消费`ACTION_DOWN`则mFirstTouchTarget为null，则会调用dispatchTransformedTouchEvent。调用dispatchTransformedTouchEvent传入的child为null，所以会调用ViewGroup的父类的dispatchTouchEvent，即View的dispatchTouchEvent方法。View的dispatchTouchEvent不会向下分发。当按下一个View，然后滑出View的范围。mFirstTouchTarget依然没有改变，所以会继续向该View分发事件。


```java
if (mFirstTouchTarget == null) {
    // No touch targets so treat this as an ordinary view.
    //这里传入的child为null，所有会调用View的dispatchTouchEvent
    handled = dispatchTransformedTouchEvent(ev, canceled, null,
            TouchTarget.ALL_POINTER_IDS);
} else {
    // Dispatch to touch targets, excluding the new touch target if we already
    // dispatched to it.  Cancel touch targets if necessary.
    TouchTarget predecessor = null;
    TouchTarget target = mFirstTouchTarget;
    while (target != null) {
        final TouchTarget next = target.next;
        if (alreadyDispatchedToNewTouchTarget && target == newTouchTarget) {
            handled = true;
        } else {
            final boolean cancelChild = resetCancelNextUpFlag(target.child)
                    || intercepted;
            if (dispatchTransformedTouchEvent(ev, cancelChild,
                    target.child, target.pointerIdBits)) {
                handled = true;
            }
            if (cancelChild) {
                if (predecessor == null) {
                    mFirstTouchTarget = next;
                } else {
                    predecessor.next = next;
                }
                target.recycle();
                target = next;
                continue;
            }
        }
        predecessor = target;
        target = next;
    }
}
```


### resetTouchState()

```java
private void resetTouchState() {
    clearTouchTargets();
    resetCancelNextUpFlag(this);
    mGroupFlags &= ~FLAG_DISALLOW_INTERCEPT;//重置FLAG_DISALLOW_INTERCEPT
    mNestedScrollAxes = SCROLL_AXIS_NONE;
}
```


### dispatchTransformedTouchEvent()

```java
//frameworks/base/core/java/android/view/ViewGroup.java
private boolean dispatchTransformedTouchEvent(MotionEvent event, boolean cancel,
        View child, int desiredPointerIdBits) {
    final boolean handled;

    // Canceling motions is a special case.  We don't need to perform any transformations
    // or filtering.  The important part is the action, not the contents.
    final int oldAction = event.getAction();
    if (cancel || oldAction == MotionEvent.ACTION_CANCEL) {
        event.setAction(MotionEvent.ACTION_CANCEL);
				//如果child为空调用父类的dispatchTouchEvent也就是View的dispatchTouchEvent
        if (child == null) {
            handled = super.dispatchTouchEvent(event);
        } else {
            handled = child.dispatchTouchEvent(event);
        }
        event.setAction(oldAction);
        return handled;
    }
    //...
    return handled;
}
```


### dispatchTouchEvent()

```java
//frameworks/base/core/java/android/view/View.java
//View的dispatchTouchEvent无法向下传递事件
public boolean dispatchTouchEvent(MotionEvent event) {
    // If the event should be handled by accessibility focus first.
    if (event.isTargetAccessibilityFocus()) {
        // We don't have focus or no virtual descendant has it, do not handle the event.
        if (!isAccessibilityFocusedViewOrHost()) {
            return false;
        }
        // We have focus and got the event, then use normal event dispatch.
        event.setTargetAccessibilityFocus(false);
    }
    boolean result = false;

    if (mInputEventConsistencyVerifier != null) {
        mInputEventConsistencyVerifier.onTouchEvent(event, 0);
    }

    final int actionMasked = event.getActionMasked();
    if (actionMasked == MotionEvent.ACTION_DOWN) {
        // Defensive cleanup for new gesture
        stopNestedScroll();
    }

    if (onFilterTouchEventForSecurity(event)) {
        if ((mViewFlags & ENABLED_MASK) == ENABLED && handleScrollBarDragging(event)) {
            result = true;
        }
        //noinspection SimplifiableIfStatement
        //判断设置了onTouchListener调用listener的onTouch方法
        ListenerInfo li = mListenerInfo;
        if (li != null && li.mOnTouchListener != null
                && (mViewFlags & ENABLED_MASK) == ENABLED
                && li.mOnTouchListener.onTouch(this, event)) {
            result = true;
        }
				//调用onTouchEvent方法
        if (!result && onTouchEvent(event)) {
            result = true;
        }
    }

    if (!result && mInputEventConsistencyVerifier != null) {
        mInputEventConsistencyVerifier.onUnhandledEvent(event, 0);
    }

    // Clean up after nested scrolls if this is the end of a gesture;
    // also cancel it if we tried an ACTION_DOWN but we didn't want the rest
    // of the gesture.
    if (actionMasked == MotionEvent.ACTION_UP ||
            actionMasked == MotionEvent.ACTION_CANCEL ||
            (actionMasked == MotionEvent.ACTION_DOWN && !result)) {
        stopNestedScroll();
    }

    return result;
}
```


## 参考

* [安卓自定义View进阶-事件分发机制原理](http://www.gcssloop.com/customview/dispatch-touchevent-theory.html)

* [安卓自定义View进阶-事件分发机制详解](http://www.gcssloop.com/customview/dispatch-touchevent-source.html)

