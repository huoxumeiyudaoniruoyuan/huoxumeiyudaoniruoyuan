/*
DNS配置模块 - 使用国外DNS服务器
作用：配置Surge使用国外DNS服务器进行域名解析，避免DNS污染
使用方法：在Surge配置中添加此脚本
*/

// 常用的国外DNS服务器列表
const FOREIGN_DNS_SERVERS = [
  // Cloudflare DNS
  "1.1.1.1",
  "1.0.0.1",
  
  // Google DNS
  "8.8.8.8",
  "8.8.4.4",
  
  // Quad9
  "9.9.9.9",
  "149.112.112.112",
  
  // OpenDNS
  "208.67.222.222",
  "208.67.220.220",
  
  // AdGuard DNS
  "94.140.14.14",
  "94.140.15.15"
];

// 优选的DNS服务器（按优先级排序）
const PREFERRED_DNS_SERVERS = [
  "1.1.1.1", // Cloudflare主要DNS
  "8.8.8.8", // Google主要DNS
  "9.9.9.9"  // Quad9主要DNS
];

// 检测DNS服务器响应时间
async function checkDnsResponseTime(dnsServer) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const timeout = setTimeout(() => {
      resolve({ server: dnsServer, time: 2000, status: "timeout" }); // 2秒超时
    }, 2000);
    
    $httpClient.get(`http://${dnsServer}/dns-query?name=www.google.com&type=A`, (error, response) => {
      clearTimeout(timeout);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (error) {
        resolve({ server: dnsServer, time: responseTime, status: "error" });
      } else {
        resolve({ server: dnsServer, time: responseTime, status: "success" });
      }
    });
  });
}

// 选择最佳DNS服务器
async function selectBestDnsServers() {
  try {
    // 首先尝试优选的DNS服务器
    const preferredResults = await Promise.all(
      PREFERRED_DNS_SERVERS.map(server => checkDnsResponseTime(server))
    );
    
    // 过滤出成功响应的服务器
    const successfulServers = preferredResults
      .filter(result => result.status === "success")
      .sort((a, b) => a.time - b.time);
    
    // 如果有至少两个成功响应的优选服务器，直接使用它们
    if (successfulServers.length >= 2) {
      return [
        successfulServers[0].server,
        successfulServers[1].server
      ];
    }
    
    // 否则，测试所有DNS服务器
    const allResults = await Promise.all(
      FOREIGN_DNS_SERVERS.map(server => checkDnsResponseTime(server))
    );
    
    // 按响应时间排序并选择最快的两个
    const bestServers = allResults
      .filter(result => result.status === "success")
      .sort((a, b) => a.time - b.time)
      .slice(0, 2)
      .map(result => result.server);
    
    // 如果没有成功响应的服务器，使用默认值
    if (bestServers.length === 0) {
      return ["1.1.1.1", "8.8.8.8"];
    }
    
    // 如果只有一个成功响应的服务器，添加一个备用
    if (bestServers.length === 1) {
      const backupServer = bestServers[0] === "1.1.1.1" ? "8.8.8.8" : "1.1.1.1";
      return [bestServers[0], backupServer];
    }
    
    return bestServers;
  } catch (error) {
    // 出错时使用默认值
    return ["1.1.1.1", "8.8.8.8"];
  }
}

// 生成DNS配置
async function generateDnsConfig() {
  const bestDnsServers = await selectBestDnsServers();
  
  // 构建DNS配置
  const dnsConfig = {
    primaryDns: bestDnsServers[0],
    secondaryDns: bestDnsServers[1],
    dohPrimaryDns: `https://${bestDnsServers[0]}/dns-query`,
    dohSecondaryDns: `https://${bestDnsServers[1]}/dns-query`
  };
  
  // 保存配置到持久存储
  $persistentStore.write(JSON.stringify(dnsConfig), "foreign_dns_config");
  
  // 发送通知
  $notification.post(
    "DNS配置已更新",
    "已选择最佳国外DNS服务器",
    `主要DNS: ${dnsConfig.primaryDns}\n备用DNS: ${dnsConfig.secondaryDns}`
  );
  
  return dnsConfig;
}

// 获取当前DNS配置
function getCurrentDnsConfig() {
  const storedConfig = $persistentStore.read("foreign_dns_config");
  if (storedConfig) {
    try {
      return JSON.parse(storedConfig);
    } catch (e) {
      // 解析失败，返回默认配置
      return {
        primaryDns: "1.1.1.1",
        secondaryDns: "8.8.8.8",
        dohPrimaryDns: "https://1.1.1.1/dns-query",
        dohSecondaryDns: "https://8.8.8.8/dns-query"
      };
    }
  }
  
  // 没有存储的配置，返回默认配置
  return {
    primaryDns: "1.1.1.1",
    secondaryDns: "8.8.8.8",
    dohPrimaryDns: "https://1.1.1.1/dns-query",
    dohSecondaryDns: "https://8.8.8.8/dns-query"
  };
}

// 处理DNS请求
function processDns(dnsEvent) {
  const domain = dnsEvent.domain || "";
  
  // 获取当前DNS配置
  const dnsConfig = getCurrentDnsConfig();
  
  // 对于特定域名使用特定DNS服务器
  if (domain.endsWith(".cn") || domain.endsWith(".com.cn")) {
    // 中国域名使用阿里DNS
    return { server: "223.5.5.5" };
  }
  
  // 对于Google、Facebook等域名，使用主要国外DNS
  if (domain.includes("google") || 
      domain.includes("facebook") || 
      domain.includes("twitter") || 
      domain.includes("youtube") || 
      domain.includes("instagram")) {
    return { server: dnsConfig.primaryDns };
  }
  
  // 其他域名随机使用配置的国外DNS
  return { 
    server: Math.random() > 0.5 ? dnsConfig.primaryDns : dnsConfig.secondaryDns 
  };
}

// 主函数
async function main() {
  if ($network.v4.primaryInterface === "en0") {
    // 在Wi-Fi网络下更新DNS配置
    await generateDnsConfig();
  }
  
  if ($domain) {
    // 处理DNS请求
    const dnsResult = processDns({ domain: $domain });
    $done(dnsResult);
  } else {
    // 脚本被直接执行，更新DNS配置
    await generateDnsConfig();
    $done();
  }
}

// 执行主函数
main().catch(error => {
  console.log("DNS配置脚本执行错误:", error);
  $done();
});
