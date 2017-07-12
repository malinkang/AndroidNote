#### Google 架构研究总结

View层负责处理用户事件和视图部分的展示。在Android中，它可能是Activity或者Fragment类。
Model层负责访问数据。数据可以是远端的Server API，本地数据库或者SharedPreference等。
Presenter层是连接（或适配）View和Model的桥梁。

核心类：
BasePresenter是Presenter的基类
```java
public interface BasePresenter {
    void start();
}
```
BaseView是所有View的基类
```java
public interface BaseView<T> {
    void setPresenter(T presenter);
}
```
```java
public interface TasksContract {
    interface View extends BaseView<Presenter> {

        void setLoadingIndicator(boolean active);

        void showTasks(List<Task> tasks);

        void showAddTask();

        void showTaskDetailsUi(String taskId);

        void showTaskMarkedComplete();

        void showTaskMarkedActive();

        void showCompletedTasksCleared();

        void showLoadingTasksError();

        void showNoTasks();

        void showActiveFilterLabel();

        void showCompletedFilterLabel();

        void showAllFilterLabel();

        void showNoActiveTasks();

        void showNoCompletedTasks();

        void showSuccessfullySavedMessage();

        boolean isActive();

        void showFilteringPopUpMenu();
    }
    interface Presenter extends BasePresenter {

        void result(int requestCode, int resultCode);

        void loadTasks(boolean forceUpdate);

        void addNewTask();

        void openTaskDetails(@NonNull Task requestedTask);

        void completeTask(@NonNull Task completedTask);

        void activateTask(@NonNull Task activeTask);

        void clearCompletedTasks();

        void setFiltering(TasksFilterType requestType);

        TasksFilterType getFiltering();
    }
}
```
Fragment实现View接口
```java

```
创建一个Presenter的子类。
```java

```
```java


```

