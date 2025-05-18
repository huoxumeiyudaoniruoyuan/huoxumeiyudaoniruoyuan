/*
流量伪装模块 - 伪装成普通浏览器流量
作用：修改HTTP请求头，使网络流量看起来像是来自普通浏览器
使用方法：在Surge配置中添加此脚本
*/

// 常见浏览器的User-Agent列表
const USER_AGENTS = [
  // Chrome
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/121.0.6167.171 Mobile/15E148 Safari/604.1",
  // Safari
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  // Firefox
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0"
];

// 常见的Accept头
const ACCEPT_HEADERS = [
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
];

// 常见的Accept-Language头
const ACCEPT_LANGUAGE_HEADERS = [
  "zh-CN,zh;q=0.9,en;q=0.8",
  "en-US,en;q=0.9",
  "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
  "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7"
];

// 常见的Accept-Encoding头
const ACCEPT_ENCODING_HEADERS = [
  "gzip, deflate, br",
  "gzip, deflate",
  "br;q=1.0, gzip;q=0.8, *;q=0.1"
];

// 随机选择数组中的一个元素
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// 生成随机的浏览器指纹
function generateBrowserFingerprint() {
  // 随机选择一个User-Agent
  const userAgent = getRandomElement(USER_AGENTS);
  
  // 根据User-Agent确定浏览器类型
  let browserType = "";
  if (userAgent.includes("Chrome") || userAgent.includes("CriOS")) {
    browserType = "chrome";
  } else if (userAgent.includes("Firefox")) {
    browserType = "firefox";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browserType = "safari";
  }
  
  // 生成一致的请求头集合
  const headers = {
    "User-Agent": userAgent,
    "Accept": getRandomElement(ACCEPT_HEADERS),
    "Accept-Language": getRandomElement(ACCEPT_LANGUAGE_HEADERS),
    "Accept-Encoding": getRandomElement(ACCEPT_ENCODING_HEADERS),
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1"
  };
  
  // 根据浏览器类型添加特定的请求头
  if (browserType === "chrome") {
    headers["sec-ch-ua"] = `"Google Chrome";v="121", "Not A(Brand";v="99"`;
    headers["sec-ch-ua-mobile"] = userAgent.includes("Mobile") ? "?1" : "?0";
    headers["sec-ch-ua-platform"] = userAgent.includes("Windows") ? "Windows" : 
                                   userAgent.includes("Mac") ? "macOS" : 
                                   userAgent.includes("iPhone") ? "iOS" : "Unknown";
  } else if (browserType === "firefox") {
    // Firefox特有的请求头
    headers["DNT"] = "1";
  }
  
  return headers;
}

// 处理HTTP请求
function processRequest(requestEvent) {
  const requestUrl = requestEvent.url || "";
  const requestHeaders = requestEvent.headers || {};
  
  // 生成随机浏览器指纹
  const browserHeaders = generateBrowserFingerprint();
  
  // 合并原始请求头和伪装请求头
  // 注意：保留原始请求中的一些关键头（如Cookie、Authorization等）
  const mergedHeaders = {...browserHeaders};
  
  // 保留原始请求中的关键头
  const keysToPreserve = ["Cookie", "Authorization", "Content-Type", "Content-Length", "Host", "Origin", "Referer"];
  for (const key of keysToPreserve) {
    if (requestHeaders[key]) {
      mergedHeaders[key] = requestHeaders[key];
    }
  }
  
  // 添加随机的请求时间戳参数，避免缓存
  let modifiedUrl = requestUrl;
  if (!requestUrl.includes("_t=")) {
    const separator = requestUrl.includes("?") ? "&" : "?";
    modifiedUrl = `${requestUrl}${separator}_t=${Date.now()}`;
  }
  
  // 返回修改后的请求
  return {
    url: modifiedUrl,
    headers: mergedHeaders
  };
}

// 根据脚本类型执行不同的处理函数
if ($request) {
  // 仅处理HTTP请求
  const modifiedRequest = processRequest({ 
    url: $request.url, 
    headers: $request.headers 
  });
  $done(modifiedRequest);
} else {
  $done({});
}
