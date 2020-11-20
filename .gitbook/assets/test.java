public Intent transformIntentToExplicitAsNeeded(Intent intent) {
    ComponentName component = intent.getComponent();
    if (component == null
        || component.getPackageName().equals(mContext.getPackageName())) {
        ResolveInfo info = mPluginManager.resolveActivity(intent);
        if (info != null && info.activityInfo != null) {
            component = new ComponentName(info.activityInfo.packageName, info.activityInfo.name);
            intent.setComponent(component);
        }
    }

    return intent;
}