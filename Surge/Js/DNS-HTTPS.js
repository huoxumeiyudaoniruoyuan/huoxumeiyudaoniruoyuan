/*
防流量劫持模块 - 针对DNS和HTTP劫持
作用：防止ISP或恶意程序对DNS解析结果和HTTP请求进行劫持
使用方法：在Surge配置中添加此脚本
*/

// 可疑IP地址列表（常见的劫持IP）
const SUSPICIOUS_IPS = [
  "120.240.95.37",
  "221.179.140.145",
  "124.232.132.94",
  "61.160.200.223",
  "61.160.200.252",
  "121.251.255.237",
  "119.4.249.166",
  "61.174.50.167",
  "218.93.127.37",
  "61.174.50.211",
  "220.196.52.141",
  "124.232.132.95",
  "58.217.200.15",
  "202.102.110.203",
  "202.102.110.204",
  "60.191.124.236",
  "113.142.0.0/16",
  "114.135.0.0/16",
  "115.233.0.0/16",
  "123.129.0.0/16"
];

// 可疑域名关键词
const SUSPICIOUS_DOMAINS = [
  "ad.12306.cn",
  "ad.3.cn",
  "adm.10jqka.com.cn",
  "ads.csdn.net",
  "ads.mopub.com",
  "adsapi.manhuaren.com",
  "adsfile.bssdlbig.kugou.com",
  "adsame.com",
  "adse.ximalaya.com",
  "adshow.58.com",
  "adui.tg.meitu.com",
  "adv.bandi.so",
  "adwzw.com",
  "aegis.qq.com",
  "api.cupid.iqiyi.com",
  "api.cupid.qiyi.com"
];

// 检查HTTP响应是否被劫持
function isResponseHijacked(resp) {
  if (!resp || !resp.status || !resp.headers) return false;
  
  // 检查状态码是否异常（常见劫持会返回302或200但内容被替换）
  if (resp.status === 302) {
    // 检查重定向URL是否可疑
    const location = resp.headers["Location"] || resp.headers["location"];
    if (location) {
      for (const domain of SUSPICIOUS_DOMAINS) {
        if (location.includes(domain)) return true;
      }
    }
  }
  
  // 检查响应头中是否包含可疑信息
  const server = resp.headers["Server"] || resp.headers["server"];
  if (server && (server.includes("WebGuard") || server.includes("WAF"))) {
    return true;
  }
  
  return false;
}

// 检查DNS解析结果是否被劫持
function isDnsHijacked(ip) {
  if (!ip) return false;
  
  // 检查IP是否在可疑列表中
  for (const suspiciousIp of SUSPICIOUS_IPS) {
    if (suspiciousIp.includes("/")) {
      // CIDR格式检查
      if (isIpInCidr(ip, suspiciousIp)) return true;
    } else {
      // 精确IP匹配
      if (ip === suspiciousIp) return true;
    }
  }
  
  return false;
}

// 检查IP是否在CIDR范围内
function isIpInCidr(ip, cidr) {
  const [range, bits] = cidr.split("/");
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  
  const ipNum = ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  const rangeNum = range.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  const maskNum = mask >>> 0;
  
  return (ipNum & maskNum) === (rangeNum & maskNum);
}

// 处理HTTP请求
function processRequest(requestEvent) {
  const requestUrl = requestEvent.url || "";
  const requestHeaders = requestEvent.headers || {};
  
  // 添加防劫持请求头
  requestHeaders["Cache-Control"] = "no-cache";
  requestHeaders["Pragma"] = "no-cache";
  
  // 防止请求被篡改
  if (requestUrl.startsWith("http://")) {
    // 尝试将HTTP请求升级为HTTPS（如果可能）
    const httpsUrl = requestUrl.replace("http://", "https://");
    // 这里可以添加域名白名单检查，仅对支持HTTPS的域名执行升级
    
    // 返回修改后的请求
    return {
      url: httpsUrl,
      headers: requestHeaders
    };
  }
  
  return {
    headers: requestHeaders
  };
}

// 处理HTTP响应
function processResponse(responseEvent) {
  const response = responseEvent.response || {};
  
  // 检查响应是否被劫持
  if (isResponseHijacked(response)) {
    // 如果检测到劫持，返回一个阻断响应
    return {
      response: {
        status: 200,
        headers: {
          "Content-Type": "text/html;charset=utf-8"
        },
        body: $surge.utils.utf8EncodeToBase64(
          "<html><body><h1>检测到可能的流量劫持，已阻止</h1></body></html>"
        )
      }
    };
  }
  
  return {};
}

// 处理DNS结果
function processDns(dnsEvent) {
  const domain = dnsEvent.domain || "";
  const ip = dnsEvent.ip || "";
  
  // 检查DNS解析结果是否被劫持
  if (isDnsHijacked(ip)) {
    // 如果检测到DNS劫持，可以返回一个安全的IP或拒绝解析
    $notification.post(
      "DNS劫持警告",
      domain,
      `检测到DNS劫持尝试，原始IP: ${ip}`
    );
    
    // 返回拒绝解析的结果
    return { address: "0.0.0.0" };
  }
  
  return {};
}

// 根据脚本类型执行不同的处理函数
if ($request && $response) {
  // HTTP响应处理
  const modifiedResponse = processResponse({ response: $response });
  $done(modifiedResponse);
} else if ($request) {
  // HTTP请求处理
  const modifiedRequest = processRequest({ url: $request.url, headers: $request.headers });
  $done(modifiedRequest);
} else if ($domain && $ip) {
  // DNS处理
  const modifiedDns = processDns({ domain: $domain, ip: $ip });
  $done(modifiedDns);
} else {
  $done({});
}
