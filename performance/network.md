# 网络优化

## 网络优化

### 网络基础知识

* [HTTPS 详解一：附带最精美详尽的 HTTPS 原理图](https://segmentfault.com/a/1190000021494676)
* [HTTPS详解二：SSL / TLS 工作原理和详细握手过程](https://segmentfault.com/a/1190000021559557)
* [HTTP 2.0与OkHttp](https://juejin.im/post/6844903785232498696)

## 使用HttpDns优化DNS解析

DNS 的解析是我们网络请求的第一项工作，默认我们使用运营商的 LocalDNS 服务。这块耗时在 3G 网络下可能是 200～300ms，4G 网络也需要 100ms。解析慢并不是默认 LocalDNS 最大的“原罪”，它还存在一些其他问题：稳定性。UDP 协议，无状态，容易域名劫持（难复现、难定位、难解决），每天至少几百万个域名被劫持，一年至少十次大规模事件。准确性。LocalDNS 调度经常出现不准确，比如北京的用户调度到广东 IP，移动的运营商调度到电信的 IP，跨运营商调度会导致访问慢，甚至访问不了。及时性。运营商可能会修改 DNS 的 TTL，导致 DNS 修改生效延迟。不同运营商的服务实现不一致，我们也很难保证 DNS 解析的耗时。

## 复用链接

1. 连接复用在 DNS 解析之后，我们来到了创建连接这个环节。创建连接要经过 TCP 三次握手、TLS 密钥协商，连接建立的代价是非常大的。这里我们主要的优化思路是复用连接，这样不用每次请求都重新建立连接。

在前面我就讲过连接管理，网络库并不会立刻把连接释放，而是放到连接池中。这时如果有另一个请求的域名和端口是一样的，就直接拿出连接池中的连接进行发送和接收数据，少了建立连接的耗时。这里我们利用 HTTP 协议里的 keep-alive，而 HTTP/2.0 的多路复用则可以进一步的提升连接复用率。它复用的这条连接支持同时处理多条请求，所有请求都可以并发在这条连接上进行。

## 3. 压缩与加密

讲完连接，我们再来看看发送和接收的优化。我第一时间想到的还是减少传输的数据量，也就是我们常说的数据压缩。首先对于 HTTP 请求来说，数据主要包括三个部分：请求 URL请求 header请求 body对于 header 来说，如果使用 HTTP/2.0 连接本身的头部压缩技术，因此需要压缩的主要是请求 URL 和请求 body。对于请求 URL 来说，一般会带很多的公共参数，这些参数大部分都是不变的。这样不变的参数客户端只需要上传一次即可，其他请求我们可以在接入层中进行参数扩展。对于请求 body 来说，一方面是数据通信协议的选择，在网络传输中目前最流行的两种数据序列化方式是 JSON 和 Protocol Buffers。正如我之前所说的一样，Protocol Buffers 使用起来更加复杂一些，但在数据压缩率、序列化与反序列化速度上面都有很大的优势。另外一方面是压缩算法的选择，通用的压缩算法主要是如 gzip，Google 的Brotli或者 Facebook 的Z-standard都是压缩率更高的算法。其中如果 Z-standard 通过业务数据样本训练出适合的字典，是目前压缩率表现最好的算法。但是各个业务维护字典的成本比较大，这个时候我们的大网络平台的统一接入层又可以大显神威了。例如我们可以抽样 1% 的请求数据用来训练字典，字典的下发与更新都由统一接入层负责，业务并不需要关心。当然针对特定数据我们还有其他的压缩方法，例如针对图片我们可以使用 webp、hevc、SharpP等压缩率更高的格式。另外一方面，基于 AI 的图片超清化也是一大神器，QQ 空间通过这个技术节约了大量的带宽成本。

### 参考

* [百度App网络深度优化系列《一》DNS优化](https://mp.weixin.qq.com/s/iaPtSF-twWz-AN66UJUBDg)
* [减少网络耗电量](https://developer.android.com/topic/performance/power/network)
* [Android性能优化典范 - 第4季](http://hukai.me/android-performance-patterns-season-4/)
* [Android Performance Patterns Season 4](https://www.youtube.com/watch?v=7lxVqqWwTb0&list=PLOU2XLYxmsIKEOXh5TwZEv89aofHzNCiu&index=1)

