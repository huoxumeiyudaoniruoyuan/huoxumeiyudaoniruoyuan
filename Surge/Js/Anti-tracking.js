/*
防跟踪模块 - 主要防止网站指纹跟踪
作用：清除或修改可能被用于跟踪用户的HTTP头和参数
使用方法：在Surge配置中添加此脚本
*/

// 需要移除的跟踪相关请求头
const TRACKING_HEADERS_TO_REMOVE = [
  // 指纹跟踪相关
  "X-Forwarded-For",
  "X-Real-IP",
  "X-Client-IP",
  "CF-Connecting-IP",
  "True-Client-IP",
  "X-Originating-IP",
  
  // 广告和分析相关
  "X-FB-HTTP-Engine",
  "X-ATT-DeviceId",
  "X-UIDH",
  "X-Twitter-Client",
  "X-Twitter-Client-Version",
  
  // 设备信息相关
  "X-Device-Model",
  "X-Device-Memory",
  "X-Device-Id",
  "X-Device-Info",
  "X-Device-User-Agent",
  
  // 其他跟踪相关
  "X-Requested-With",
  "X-Correlation-ID",
  "X-Analytics",
  "X-Tracking-ID"
];

// 需要随机化的请求头
const HEADERS_TO_RANDOMIZE = {
  // 浏览器指纹相关
  "Sec-CH-UA-Platform-Version": ["15.0.0", "14.0.0", "13.0.0", "12.0.0", "11.0.0"],
  "Sec-CH-UA-Model": ["", "iPhone", "Pixel"],
  "Sec-CH-UA-Mobile": ["?0", "?1"],
  "Sec-CH-UA-Full-Version": ["121.0.6167.171", "120.0.6099.119", "119.0.6045.163"],
  "Sec-CH-UA-Arch": ["x86", "arm", "arm64"],
  "Sec-CH-UA-Bitness": ["64", "32"],
  
  // 屏幕和窗口信息
  "Viewport-Width": ["1920", "1440", "1366", "1280", "1024"],
  "DPR": ["1", "2", "3"],
  "Device-Memory": ["8", "4", "2"]
};

// 需要移除的URL参数
const URL_PARAMS_TO_REMOVE = [
  // 广告跟踪参数
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  
  // Facebook跟踪参数
  "fbclid",
  
  // Google跟踪参数
  "gclid",
  "gclsrc",
  "dclid",
  "gbraid",
  "wbraid",
  
  // 其他常见跟踪参数
  "ref",
  "referrer",
  "source",
  "track",
  "tracking",
  "trackingId",
  "campaign",
  "from",
  "partner",
  "affiliate",
  "mc_cid",
  "mc_eid",
  "_hsenc",
  "_hsmi",
  "oly_enc_id",
  "oly_anon_id",
  "ml_subscriber",
  "ml_subscriber_hash",
  "s_cid",
  "ncid",
  "icid",
  "WT.mc_id",
  "rb_clickid",
  "yclid",
  "twclid"
];

// 随机选择数组中的一个元素
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// 清理URL中的跟踪参数
function cleanUrl(url) {
  try {
    const urlObj = new URL(url);
    let paramsRemoved = false;
    
    // 检查并移除跟踪参数
    URL_PARAMS_TO_REMOVE.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.delete(param);
        paramsRemoved = true;
      }
    });
    
    // 检查是否有以跟踪前缀开头的参数
    const trackingPrefixes = ["utm_", "fbclid", "gclid", "_"];
    for (const [key] of urlObj.searchParams) {
      for (const prefix of trackingPrefixes) {
        if (key.startsWith(prefix)) {
          urlObj.searchParams.delete(key);
          paramsRemoved = true;
          break;
        }
      }
    }
    
    return {
      url: urlObj.toString(),
      modified: paramsRemoved
    };
  } catch (e) {
    // 如果URL解析失败，返回原始URL
    return {
      url: url,
      modified: false
    };
  }
}

// 处理HTTP请求
function processRequest(requestEvent) {
  const requestUrl = requestEvent.url || "";
  const requestHeaders = requestEvent.headers || {};
  const modifiedHeaders = {...requestHeaders};
  
  // 移除跟踪相关的请求头
  TRACKING_HEADERS_TO_REMOVE.forEach(header => {
    delete modifiedHeaders[header];
  });
  
  // 随机化某些请求头以防止指纹跟踪
  for (const [header, values] of Object.entries(HEADERS_TO_RANDOMIZE)) {
    if (Math.random() > 0.5) { // 50%的概率添加随机化的请求头
      modifiedHeaders[header] = getRandomElement(values);
    }
  }
  
  // 添加Do Not Track请求头
  modifiedHeaders["DNT"] = "1";
  
  // 清理URL中的跟踪参数
  const cleanedUrl = cleanUrl(requestUrl);
  
  // 返回修改后的请求
  return {
    url: cleanedUrl.url,
    headers: modifiedHeaders
  };
}

// 处理HTTP响应
function processResponse(responseEvent) {
  const response = responseEvent.response || {};
  const responseHeaders = response.headers || {};
  const modifiedHeaders = {...responseHeaders};
  
  // 移除可能用于跟踪的响应头
  const trackingResponseHeaders = [
    "Set-Cookie",
    "ETag",
    "X-Served-By",
    "X-Cache",
    "X-Cache-Hits",
    "X-Timer",
    "X-Request-ID",
    "X-Correlation-ID",
    "X-Runtime",
    "Server-Timing"
  ];
  
  // 处理Set-Cookie头，移除跟踪相关的cookie
  if (modifiedHeaders["Set-Cookie"]) {
    // 如果是数组形式的cookies
    if (Array.isArray(modifiedHeaders["Set-Cookie"])) {
      modifiedHeaders["Set-Cookie"] = modifiedHeaders["Set-Cookie"].filter(cookie => {
        return !isTrackingCookie(cookie);
      });
    } 
    // 如果是单个cookie字符串
    else if (typeof modifiedHeaders["Set-Cookie"] === "string") {
      if (isTrackingCookie(modifiedHeaders["Set-Cookie"])) {
        delete modifiedHeaders["Set-Cookie"];
      }
    }
  }
  
  // 移除其他跟踪响应头
  trackingResponseHeaders.forEach(header => {
    if (header !== "Set-Cookie") { // Set-Cookie已单独处理
      delete modifiedHeaders[header];
    }
  });
  
  // 添加安全相关的响应头
  modifiedHeaders["Referrer-Policy"] = "no-referrer";
  modifiedHeaders["X-Content-Type-Options"] = "nosniff";
  
  // 返回修改后的响应
  return {
    headers: modifiedHeaders
  };
}

// 检查cookie是否为跟踪cookie
function isTrackingCookie(cookieStr) {
  const trackingCookieKeywords = [
    "_ga", "_gid", "_gat", 
    "fbp", "fr", 
    "NID", "APISID", "SSID", "SID", "SAPISID", 
    "AMCV_", "AMCVS_", 
    "anj", "uids", "uuid", "adid", "sess", "csm", 
    "tracking", "track", "visitor", "analytics"
  ];
  
  for (const keyword of trackingCookieKeywords) {
    if (cookieStr.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

// 根据脚本类型执行不同的处理函数
if ($request && $response) {
  // HTTP响应处理
  const modifiedResponse = processResponse({ response: $response });
  $done(modifiedResponse);
} else if ($request) {
  // HTTP请求处理
  const modifiedRequest = processRequest({ 
    url: $request.url, 
    headers: $request.headers 
  });
  $done(modifiedRequest);
} else {
  $done({});
}
