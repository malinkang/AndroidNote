# GSON



## 扩展阅读

* [Gson User Guide](https://sites.google.com/site/gson/gson-user-guide)
* [GSON SERIALISER EXAMPLE](http://www.javacreed.com/gson-serialiser-example/)
* [GSON DESERIALISER EXAMPLE](http://www.javacreed.com/gson-deserialiser-example/)
* [GSON TYPEADAPTER EXAMPLE](http://www.javacreed.com/gson-typeadapter-example/)
* [SIMPLE GSON EXAMPLE](http://www.javacreed.com/simple-gson-example/)
* [Gson v Jackson - Part 1](http://programmerbruce.blogspot.com/2011/06/gson-v-jackson.html)
* [Gson v Jackson - Part 2](http://programmerbruce.blogspot.com/2011/06/gson-v-jackson-part-2.html)
* [Gson v Jackson - Part 3](http://programmerbruce.blogspot.com/2011/07/gson-v-jackson-part-3.html)
* [Gson v Jackson - Part 4](http://programmerbruce.blogspot.com/2011/07/gson-v-jackson-part-4.html)
* [Gson v Jackson - Part 5](http://programmerbruce.blogspot.com/2011/07/gson-v-jackson-part-5.html)
* [Gson v Jackson - Part 6](http://programmerbruce.blogspot.com/2011/07/gson-v-jackson-part-6.html)
* [Jackson 2 VS GSON Performance Comparison](http://blaazinsoftwaretech.blogspot.com/2013/08/jackson-2-vs-gson-performance-comparison.html)
* [Json转换利器Gson之实例一-简单对象转化和带泛型的List转化](http://blog.csdn.net/lk_blog/article/details/7685169)
* [Json转换利器Gson之实例二-Gson注解和GsonBuilder](http://blog.csdn.net/lk_blog/article/details/7685190)
* [Json转换利器Gson之实例三-Map处理(上)](http://blog.csdn.net/lk_blog/article/details/7685210)
* [Json转换利器Gson之实例四-Map处理(下)](http://blog.csdn.net/lk_blog/article/details/7685224)
* [Json转换利器Gson之实例五-实际开发中的特殊需求处理](http://blog.csdn.net/lk_blog/article/details/7685237)
* [Json转换利器Gson之实例六-注册TypeAdapter及处理Enum类型](http://blog.csdn.net/lk_blog/article/details/7685347)
* [A Gson TypeAdapterFactory](https://gist.github.com/JakeWharton/0d67d01badcee0ae7bc9)

  @Override
            public void success(CourseListInfo courseListInfo, Response response) {
            
   
            
                if (courseListInfo != null
                        && courseListInfo.getResultCode() == 0
                        ) {
                    if (courseListInfo.getData() != null && courseListInfo.getData().size() != 0) {
                        ArrayList<CourseList> roomList = courseListInfo
                                .getData();
                        
                        }
                        state = LoadDataEvent.State.SUCCESS;
                        event.state = state;
                        event.id = request.getPartType();
                        mBus.post(event);

                    } else {
                        if ("0".equals(request.getPageNo())) {
                            state = LoadDataEvent.State.NODATA;
                            event.state = state;
                            event.id = request.getPartType();
                            mBus.post(event);
                        } else {
                            Timber.e("发送没有更多数据的通知");
                            postNoMoreData();
                        }
                    }

                } else {
                    state = LoadDataEvent.State.FAILURE;
                    event.state = state;
                    event.id = request.getPartType();
                    mBus.post(event);

                    // 失败
                    try {
                        throw new ApiException(courseListInfo);
                    } catch (ApiException e) {
                        e.printStackTrace();
                    }

                }
            }

            @Override
            public void failure(RetrofitError error) {
                switch (error.getKind()) {
                    case NETWORK:
                        state = LoadDataEvent.State.NETWORKERROR;
                        event.state = state;
                        event.id = request.getPartType();
                        mBus.post(event);
                        break;
                    default:
                        state = LoadDataEvent.State.FAILURE;
                        event.state = state;
                        event.id = request.getPartType();
                        mBus.post(event);
                        break;
                }

            }


