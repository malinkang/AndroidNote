### Okhttp使用


<h3>okHttp2.0使用</h3>

<h4>1.1Get请求</h4>

略

#### 1.2表单提交

```java
public static String okHttpPost(String url, Map<String, String> headers, Map<String, String> params) {

    try {
        Request.Builder builder = new Request.Builder();
        builder.url(url);
        OkHttpClient client = new OkHttpClient();
        FormBody.Builder formBodyBuilder = new FormBody.Builder();
        if (headers != null) {
            Iterator<String> iterator = params.keySet().iterator();
            while (iterator.hasNext()) {
                String key = iterator.next();
                String value = params.get(key);
                builder.addHeader(key, value);
            }
        }
        if (params != null) {
            Iterator<String> iterator = params.keySet().iterator();
            while (iterator.hasNext()) {
                String key = iterator.next();
                String value = params.get(key);
                formBodyBuilder.add(key, value);
            }
        }
        RequestBody formBody = formBodyBuilder.build();
        Request request = builder
                .post(formBody)
                .build();
        Response response = client.newCall(request).execute();
        if (response.isSuccessful()) {
            return new String(response.body().bytes());
        } else {
            return null;
        }
    } catch (IOException e) {
        e.printStackTrace();
        return null;
    }
}
```


#### 1.3文件上传

```java
public static String upload(String url, Map<String, Object> params) {
    try {
        Request.Builder builder = new Request.Builder();
        builder.url(url);
        OkHttpClient client = new OkHttpClient();
        MultipartBody.Builder multipartBodyBuilder = new MultipartBody.Builder();
        multipartBodyBuilder.setType(MultipartBody.FORM);
        Iterator<String> iterator = params.keySet().iterator();
        while (iterator.hasNext()) {
            String key = iterator.next();
            Object value = params.get(key);
            if (value instanceof String) {
    //                    Headers headers = Headers.of("Content-Disposition", "form-data; name=\"" + key + "\"");
    //                    multipartBodyBuilder.addPart(headers, RequestBody.create(null, (String) value));
                // 上面两行代码等价于 下面这行
                multipartBodyBuilder.addFormDataPart(key, (String) value);
            } else if (value instanceof File) {
                File file = (File) value;
                RequestBody requestFile = RequestBody.create(MediaType.parse("multipart/form-data"), file);
    //                    MultipartBody.Part part = MultipartBody.Part.createFormData(key, file.getName(), requestFile);
    //                    multipartBodyBuilder.addPart(part);
    //                    上面两行代码等价于 下面这行
                multipartBodyBuilder.addFormDataPart(key, file.getName(), requestFile);
            }
        }
        RequestBody requestBody = multipartBodyBuilder.build();
        Request request = builder
                .post(requestBody)
                .build();
        Response response = client.newCall(request).execute();
        Log.e(HttpClint.class.getSimpleName(), "response=" + new String(response.body().bytes()));
        if (response.isSuccessful()) {
            return new String(response.body().bytes());
        } else {
            return null;
        }
    } catch (IOException e) {
        e.printStackTrace();
        return null;
    }
}
```


### 参考
* [OkHttp Recipes page](https://github.com/square/okhttp/wiki/Recipes)
* [OkHttp源码解析](http://frodoking.github.io/2015/03/12/android-okhttp/)
