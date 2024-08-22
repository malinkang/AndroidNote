---
title: Android抓包
comments: true
---

## 使用HttpCanary抓包

### 工具

* [MT管理器](https://mt2.cn/)
* [HttpCanary安装包](https://drive.malinkang.com/api/raw/?path=/Files/HttpCanary_3.3.5.apk)
* [HttpCanary根证书](https://drive.malinkang.com/api/raw/?path=/Files/HttpCanary%E6%A0%B9%E8%AF%81%E4%B9%A6.zip)
* [TrustMe安装包](https://drive.malinkang.com/api/raw/?path=/Files/TrustMeAlready_1.11.apk)

### 安装证书

1. MT管理器打开`/data/user/0/com.guoshi.httpcanary/cache`，新建名为`HttpCanary.jks`的空文件；然后把`HttpCanary.p12` 和 `HttpCanary.pem`两个文件复制到其他文件夹里（比如 Download 文件夹）。
2. 打开手机设置→安全→加密与凭据→安装证书
    1. 点击 CA 证书，它会提示您的数据将不再是私密的，点仍然安装。找到刚才放证书的文件夹，选择 HttpCanary.pem 。 显示已安装CA证书。
    2. 点击 xxx和应用用户证书，选择`HttpCanary.p12` ，密码为`HttpCanary`。
    3. 点击WLAN证书，选择 HttpCanary.p12 ，密码为 HttpCanary，证书名称为 WiFi。

### Magisk移动根证书

1. 安装完用户证书后会在`/data/misc/user/0/cacerts-added/`目录下生成一个以`.0`结尾的整数文件，复制到`HttpCanary根证书.zip/system/etc/security/cacerts/`目录下。
2. 打开 Magisk→模块→从本地安装→选择“HttpCanary根证书.zip”→确定安装，安装完成后重启手机。

### 固定证书无法抓包

安装TrustMe，并勾选要抓包的App。



## 参考
* [安卓14 + HttpCanary 抓包设置](https://yuqi.fun/posts/5fb4c97d.html)
* [mitmproxy](https://github.com/mitmproxy/mitmproxy)
* [r0capture](https://github.com/r0ysue/r0capture)
* [JustTrustMe](https://github.com/Fuzion24/JustTrustMe)
* [XposedOkHttpCat](https://github.com/w296488320/XposedOkHttpCat)
* [安卓高版本HTTPS抓包：终极解决方案](https://juejin.cn/post/7360242772303577125)