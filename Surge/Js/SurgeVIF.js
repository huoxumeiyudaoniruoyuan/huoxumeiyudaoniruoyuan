function onFetch(options) {
  // 注册自己为代理服务器
  Surge.registerProxy('我的Surge模块', '127.0.0.1', 1080);
  
  // 创建一个 TUN 虚拟网卡
  var tun = Surge.createTUN();
  
  // 设置 TUN 接口将流量转发到代理服务器
  tun.forward('127.0.0.1', 1080);
  
  // 接管请求
  options.requestPolicy = 'i';
  
  // 可以在这里修改请求头或体
  // options.requestHeaders = {...}
  // options.requestBody = ...
  
  return {
    request: {
      path: options.url,
      method: options.method,
      headers: options.requestHeaders,
      body: options.requestBody
    }
  };
}

function onResponse(options) {
  // 可以在这里修改响应头或体
  // options.responseHeaders = {...}
  // options.responseBody = ...
  
  return {
    response: {
      headers: options.responseHeaders,
      body: options.responseBody
    }
  };
}