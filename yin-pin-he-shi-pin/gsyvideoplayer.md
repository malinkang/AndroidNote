# GsyVideoPlayer

```java
//GSYVideoBaseManager
protected IPlayerManager getPlayManager() {
    return PlayerFactory.getPlayManager();
}
```

//设置Surface

```java
//GSYTextureRenderView
@Override
public void onSurfaceAvailable(Surface surface) {
    pauseLogic(surface, (mTextureView != null && mTextureView.getShowView() instanceof TextureView));
}
protected void pauseLogic(Surface surface, boolean pauseLogic) {
    mSurface = surface;
    if (pauseLogic)
        //显示暂停切换显示的图片
    {
        showPauseCover();
    }
    setDisplay(mSurface);
}
//GSYVideoView
@Override
protected void setDisplay(Surface surface) {
    getGSYVideoManager().setDisplay(surface);
}
//IjkPlayerManager
@Override
public void showDisplay(Message msg) {
    if (msg.obj == null && mediaPlayer != null) {
        mediaPlayer.setSurface(null);
    } else {
        Surface holder = (Surface) msg.obj;
        surface = holder;
        if (mediaPlayer != null && holder.isValid()) {
            mediaPlayer.setSurface(holder);
        }
    }
}
```

