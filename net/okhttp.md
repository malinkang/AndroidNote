## Okhttp使用


<h3>1.OkHttp使用</h3>

<h4>1.1Get请求</h4>

略

<h4>1.2表单提交</h4>

```java
 /**
     * 使用okhttp进行表单提交
     * @param url
     * @param params
     * @throws IOException
     */
    public static void okHttpPost(String url, Map<String, String> params) throws IOException {

        OkHttpClient client = new OkHttpClient();
        FormEncodingBuilder builder = new FormEncodingBuilder();
        Iterator<String> iterator = params.keySet().iterator();
        while (iterator.hasNext()){
           String key= iterator.next();
            String value=params.get(key);
            builder.add(key,value);
        }

        RequestBody formBody=builder.build();

        com.squareup.okhttp.Request request = new
                com.squareup.okhttp.Request.Builder()
                .url(url)
                .post(formBody)
                .build();
        com.squareup.okhttp.Response response=client.newCall(request).execute();

        if(response.isSuccessful()){
            System.out.println(response.body().string());
        }else{
            System.out.println(response.body().string());
        }
    }

```

调用方法

```java

    private static void post() throws IOException {
        Map<String, String> p = new HashMap<>();
        p.put("client_id", Constants.APP_KEY);
        p.put("client_secret", Constants.APP_SECRET);
        p.put("code", "f45259c351190e6118734dfaff36ccb9");
        p.put("redirect_uri", Constants.REDIRECT_URI);
        HttpUrlConnectionUtils.okHttpPost(Constants.ACCESS_TOKEN_URL, p);
    }

```

<h4>1.3文件上传</h4>

```java

    public static void okHttpUpload(String url,Map<String,Object> params) throws IOException {
        OkHttpClient client = new OkHttpClient();
        MultipartBuilder builder=new MultipartBuilder().type(MultipartBuilder.FORM);
        Iterator<String> iterator= params.keySet().iterator();
        while (iterator.hasNext()){
            String key=iterator.next();
            Object value =params.get(key);
            if(value instanceof String){
                builder.addPart(Headers.of("Content-Disposition", "form-data; name=\""+key+"\""),
                        RequestBody.create(null, (String) value));
            }else if(value instanceof File){
                builder.addPart(Headers.of("Content-Disposition", "form-data; name=\""+key+"\";filename=\""+((File)value).getName()+"\""),
                        RequestBody.create(MediaType.parse(URLConnection.guessContentTypeFromName(((File)value).getName())),(File)value));
            }

        }

        RequestBody requestBody=builder.build();

        com.squareup.okhttp.Request request = new
                com.squareup.okhttp.Request.Builder()
                .url(url)
                .post(requestBody)
                .build();
        com.squareup.okhttp.Response response=client.newCall(request).execute();
        if(response.isSuccessful()){
            System.out.println(response.body().string());
        }else{
            System.out.println(response.body().string());
        }
    }
```

方法调用

```java
    private static void upload() throws IOException {


        Map<String, Object> params = new LinkedHashMap<>();
        params.put("access_token", "2.00l35WyB02VWykbbf1c46abc05qOF5");
        params.put("status", "测试测试");

        params.put("pic", new File("/Users/malinkang/Downloads/a.jpg"));
        HttpUrlConnectionUtils.okHttpUpload(Constants.UPLOAD_URL,params);
    }
```

<h3>参考</h3>
* [ OkHttp Recipes page](https://github.com/square/okhttp/wiki/Recipes)
* [OkHttp源码解析](http://frodoking.github.io/2015/03/12/android-okhttp/)
