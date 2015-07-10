## HttpURLConnection使用

URLConnection是JDK提供的网络请求的APi。URLConnection是一个抽象类，在实际使用中，我们创建它的子类HttpURLConnection的实例来进行网络请求。

<h3 >1.HttpUrlConnection基本使用</h3>

调用URL的`openConnection`方法来创建实例。

```java
 HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
```

常用方法

```java
// 设置连接超时时间
  connection.setConnectTimeout(CONNECT_TIMEOUT);
// 设置读取超时时间
  connection.setReadTimeout(READ_TIMEOUT);
//设置是否向HttpURLConnection输出，Post请求参数要放在正文中，因此需要设为true，默认情况为false。
  connection.setDoOutput(true);
//设置是否从HttpURLConnection输入，默认情况下true
  connection.setDoInput(true);
  // 设置请求方法
  connection.setRequestMethod("POST");
  //添加请求头
  connection.addRequestProperty("Content-Length", "106512");
```
<h3 >2.示例</h3>

接下来我们将用实例来演示HttpUrlConnection的用法


<h4>2.1Get请求</h4>

略

<h4>2.2Post请求</h4>

```java
   public static String postRequest(String url, Map<String, String> headers, Map<String, String> params) {
        try {
            HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(CONNECT_TIMEOUT);
            connection.setReadTimeout(READ_TIMEOUT);
            connection.setDoOutput(true);
            connection.setDoInput(true);
            connection.setRequestMethod("POST");
            connection.connect();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();

            if (headers != null) {
                Set<String> keys = headers.keySet();
                Iterator<String> iterator = keys.iterator();
                while (iterator.hasNext()) {
                    String key = iterator.next();
                    String value = params.get(key);
                    // 添加请求头
                    connection.addRequestProperty(key, value);
                }
            }

            if (params != null) {
                Set<String> keys = params.keySet();
                Iterator<String> iterator = keys.iterator();
                while (iterator.hasNext()) {
                    String key = iterator.next();
                    String value = params.get(key);
                    if (baos.size() > 0) {
                        baos.write('&');
                    }
                    baos.write(URLEncoder.encode(key, "UTF-8").getBytes("UTF-8"));
                    baos.write('=');
                    baos.write(URLEncoder.encode(value, "UTF-8").getBytes("UTF-8"));
                }
            }
            System.out.println(new String(baos.toByteArray()));
            OutputStream os = connection.getOutputStream();
            os.write(baos.toByteArray());
            int status = connection.getResponseCode();
            InputStream is;
            if (status >= 400) {
                is = connection.getErrorStream();
            } else {
                is = connection.getInputStream();
            }

            InputStreamReader isr = new InputStreamReader(is);
            BufferedReader bufr = new BufferedReader(isr);
            String line;
            StringBuilder sb = new StringBuilder();
            while ((line = bufr.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }
```
下面我们使用新浪微博提供的Api进行网络请求，相关的请求URL和请求参数可以点击[这里](http://open.weibo.com/wiki/Oauth2/authorize)进行查看。

```java
   /**
     * http://open.weibo.com/wiki/Oauth2/authorize
     */
    private static void post() {
        Map<String, String> p = new HashMap<>();
        p.put("client_id", Constants.APP_KEY);
        p.put("client_secret", Constants.APP_SECRET);
        p.put("code", "7a77090e366ceb92977f846e7fd564d0");
        p.put("redirect_uri", Constants.REDIRECT_URI);
        String result = HttpUrlConnectionUtils.postRequest(Constants.ACCESS_TOKEN_URL, null, p);
        System.out.println("result=" + result);
        // 输出 {"access_token":"2.00l35WyB02VWykbbf1c46abc05qOF5","remind_in":"157679999","expires_in":157679999,"uid":"1810433155","scope":"follow_app_official_microblog"}
    }
```

<h4>2.3文件上传</h4>

从普通的web页面上传文件很简单，只需要在form标签标上`enctype="multipart/form-data"`即可，浏览器将自动完成数据收集并发送Http请求。由于脱离了浏览器的环境，我们就要自己去完成数据的收集并发送请求。首先我们写一个JSP页面来看看浏览器是如何发送Http请求的。

```html
<html>
 <head>
  <meta charset="UTF-8">
  <title>TestSubmit</title>
 </head>
 <body>
  <form name="upform" action="upload.do" method="POST" enctype="multipart/form-data">
　　参数<input type="text" name="username"/><br/>
　　文件1<input type="file" name="file1"/><br/>
　　文件2<input type="file" name="file2"/><br/>
　　<input type="submit" value="Submit" /><br/>
  </form>
 </body>
</html>
```
form提交的信息如下。

```java
-----------------------------7da2e536604c8
Content-Disposition: form-data; name="username"

hello word
-----------------------------7da2e536604c8
Content-Disposition: form-data; name="file1"; filename="D:/haha.txt"
Content-Type: text/plain

haha
hahaha
-----------------------------7da2e536604c8
Content-Disposition: form-data; name="file2"; filename="D:/huhu.txt"
Content-Type: text/plain

messi
huhu
-----------------------------7da2e536604c8--


```
我们只要模拟这个数据，并写入Http请求中就能实现文件的上传。

```java
// 构建分割线
private static byte[] buildBoundary(String boundary, boolean last) {
        try {
            // Pre-size for the last boundary, the worst case scenario.
            StringBuilder sb = new StringBuilder(boundary.length() + 8);
            sb.append("\r\n");
            sb.append("--");
            sb.append(boundary);
            if (last) {
                sb.append("--");
            }
            sb.append("\r\n\r\n");
            return sb.toString().getBytes("UTF-8");
        } catch (IOException ex) {
            throw new RuntimeException("Unable to write multipart boundary", ex);
        }
    }
//构建请求头
    private static byte[] buildHeader(String name, Object value) {
        try {
            String transferEncoding = "binary";
            // Initial size estimate based on always-present strings and conservative value lengths.
            StringBuilder headers = new StringBuilder(128);

            headers.append("Content-Disposition: form-data; name=\"");
            headers.append(name);
            long length = 0;
            if (value instanceof File) {
                String fileName = ((File) value).getName();
                if (fileName != null) {
                    headers.append("\"; filename=\"");
                    headers.append(fileName);
                }
                headers.append("\"\r\nContent-Type: ");
                headers.append(URLConnection.guessContentTypeFromName(((File) value).getPath()));
                length = ((File) value).length();
            } else if (value instanceof String) {
                headers.append("\"\r\nContent-Type: ");
                headers.append("text/plain;charset=UTF-8");
                length = ((String) value).getBytes().length;
            }
            if (length != -1) {
                headers.append("\r\nContent-Length: ").append(length);
            }

            headers.append("\r\nContent-Transfer-Encoding: ");
            headers.append(transferEncoding);
            headers.append("\r\n\r\n");

            return headers.toString().getBytes("UTF-8");
        } catch (IOException ex) {
            throw new RuntimeException("Unable to write multipart header", ex);
        }
    }

    public static String upload(String url, Map<String, String> headers, Map<String, Object> params) {
        try {
            String BOUNDARY = UUID.randomUUID().toString();
            HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(CONNECT_TIMEOUT);
            connection.setReadTimeout(READ_TIMEOUT);
            connection.setDoOutput(true);
            connection.setDoInput(true);
            connection.setRequestMethod("POST");
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            if (headers != null) {
                Set<String> keys = headers.keySet();
                Iterator<String> iterator = keys.iterator();
                while (iterator.hasNext()) {
                    String key = iterator.next();
                    String value = headers.get(key);
                    // 添加请求头
                    connection.addRequestProperty(key, value);
                }
            }
            connection.addRequestProperty("Content-Type", "multipart/form-data; boundary="+BOUNDARY);


            if (params != null) {
                Set<String> keys = params.keySet();
                Iterator<String> iterator = keys.iterator();
                while (iterator.hasNext()) {
                    String key = iterator.next();
                    Object value = params.get(key);
                    baos.write(buildBoundary(BOUNDARY, false));
                    baos.write(buildHeader(key, value));
                    if (value instanceof String) {
                        baos.write(((String) value+"\r\n").getBytes("UTF-8"));
                    } else if (value instanceof File) {
                        FileInputStream fis = new FileInputStream((File) value);
                        byte[] bytes = new byte[4096];
                        int hasRead = 0;
                        while ((hasRead = fis.read(bytes)) != -1) {
                            baos.write(bytes, 0, hasRead);
                        }
                    }
                }
            }

            baos.write(buildBoundary(BOUNDARY, true));
            System.out.println(new String(baos.toByteArray()));
            OutputStream os = connection.getOutputStream();
            os.write(baos.toByteArray());
            int status = connection.getResponseCode();
            InputStream is;
            if (status >= 400) {
                is = connection.getErrorStream();
            } else {
                is = connection.getInputStream();
            }
            InputStreamReader isr = new InputStreamReader(is);
            BufferedReader bufr = new BufferedReader(isr);
            String line;
            StringBuilder sb = new StringBuilder();
            while ((line = bufr.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }
```
下面我们使用新浪微博提供的Api进行网络请求，相关的请求URL和请求参数可以点击[这里](http://open.weibo.com/wiki/2/statuses/upload)进行查看。

```java
private static void upload() {


        Map<String, Object> params = new LinkedHashMap<>();
        params.put("access_token", "2.00l35WyB02VWykbbf1c46abc05qOF5");
        params.put("status", "测试测试");

        params.put("pic", new File("/Users/malinkang/Downloads/a.jpg"));
        String result = HttpUrlConnectionUtils.upload(Constants.UPLOAD_URL, null, params);
        System.out.println("result=" + result);

    }
```

注：请求未成功，Bug未找到。





