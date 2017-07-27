



### jarsigner使用

语法

```
jarsigner [选项] jar-file 别名
       jarsigner -verify [选项] jar-file [别名...]

[-keystore <url>]           密钥库位置

[-storepass <口令>]         用于密钥库完整性的口令

[-storetype <类型>]         密钥库类型

[-keypass <口令>]           私有密钥的口令 (如果不同)

[-certchain <文件>]         替代证书链文件的名称

[-sigfile <文件>]           .SF/.DSA 文件的名称

[-signedjar <文件>]         已签名的 JAR 文件的名称

[-digestalg <算法>]        摘要算法的名称

[-sigalg <算法>]           签名算法的名称

[-verify]                   验证已签名的 JAR 文件

[-verbose[:suboptions]]     签名/验证时输出详细信息。
                            子选项可以是 all, grouped 或 summary

[-certs]                    输出详细信息和验证时显示证书

[-tsa <url>]                时间戳颁发机构的位置

[-tsacert <别名>]           时间戳颁发机构的公共密钥证书

[-tsapolicyid <oid>]        时间戳颁发机构的 TSAPolicyID

[-altsigner <类>]           替代的签名机制的类名

[-altsignerpath <路径列表>] 替代的签名机制的位置

[-internalsf]               在签名块内包含 .SF 文件

[-sectionsonly]             不计算整个清单的散列

[-protected]                密钥库具有受保护验证路径

[-providerName <名称>]      提供方名称

[-providerClass <类>        加密服务提供方的名称
  [-providerArg <参数>]]... 主类文件和构造器参数

[-strict]                   将警告视为错误
```
例子：

```
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.keystore
my_application.apk alias_name
```
### 参考

* [发布您的应用](https://developer.android.com/studio/publish/index.html)
* [apksigner](https://developer.android.com/studio/command-line/apksigner.html)