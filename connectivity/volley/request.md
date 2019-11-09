# 提出标准要求

本课描述了如何使用Volley支持的常见请求类型：

- `StringRequest`。指定一个URL并接收一个原始字符串作为响应。有关示例，请参见 [设置请求队列](https://developer.android.com/training/volley/requestqueue.html)。
- `JsonObjectRequest`和`JsonArrayRequest`（均为的子类 `JsonRequest`）。指定一个URL并分别获取一个JSON对象或数组作为响应。

如果您期望的响应是这些类型之一，则可能不必实现自定义请求。本课描述如何使用这些标准请求类型。有关如何实施自己的自定义请求的信息，请参见[ 实施自定义请求](https://developer.android.com/training/volley/request-custom.html)。

## 请求JSON

Volley为JSON请求提供以下类：

- `JsonArrayRequest`— `JSONArray` 在给定URL上检索响应正文的请求 。
- `JsonObjectRequest`— `JSONObject` 在给定URL上检索响应正文的请求 ，允许将可选内容 `JSONObject` 作为请求正文的一部分传入。

这两个类都基于通用基类`JsonRequest`。您可以按照用于其他类型请求的相同基本模式来使用它们。例如，此代码片段获取一个JSON feed，并将其显示为UI中的文本：

```java
String url = "http://my-json-feed";

JsonObjectRequest jsonObjectRequest = new JsonObjectRequest
        (Request.Method.GET, url, null, new Response.Listener<JSONObject>() {

    @Override
    public void onResponse(JSONObject response) {
        textView.setText("Response: " + response.toString());
    }
}, new Response.ErrorListener() {

    @Override
    public void onErrorResponse(VolleyError error) {
        // TODO: Handle error

    }
});

// Access the RequestQueue through your singleton class.
MySingleton.getInstance(this).addToRequestQueue(jsonObjectRequest);
```

有关基于[Gson](http://code.google.com/p/google-gson/)实现自定义JSON请求的示例 ，请参阅下一课， [实现自定义请求](https://developer.android.com/training/volley/request-custom.html)。