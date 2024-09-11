// dns-request.js
// 该脚本拦截 DNS 请求，检测是否受到污染，并在必要时采取行动。

const trustedDNS = ["1.1.1.1", "8.8.8.8"]; // 可信的 DNS 服务器 IP 列表

$httpClient.get('https://your-server.com/check-ip', function(error, response, data) {
    if (error) {
        console.log("Failed to fetch trusted IP list.");
        return;
    }
    
    let dnsResponse = $response.dns;
    if (trustedDNS.includes(dnsResponse.server) && isValidIP(dnsResponse.ip)) {
        console.log("DNS response is clean.");
    } else {
        console.log("Potential DNS pollution detected, switching to a proxy.");
        // 将受污染的 DNS 请求重定向到代理处理
        $done({ response: { action: "proxy" } });
    }
});

function isValidIP(ip) {
    // 简单的 IP 地址验证逻辑
    const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipPattern.test(ip);
}