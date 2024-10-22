// 防止DNS泄漏的脚本
const dnsServer = "1.1.1.1"; // 替换为你的DNS服务器
const encryptedDnsServer = "https://dns.example.com"; // 替换为你的加密DNS服务器

// 监听DNS请求
function onDnsRequest(request) {
    // 检查请求的域名
    const domain = request.url.split("/")[2];

    // 劫持DNS请求并重定向到指定的DNS服务器
    if (domain) {
        return {
            dns: {
                server: dnsServer,
                url: encryptedDnsServer,
            },
        };
    }
}

// 注册监听器
$dns.onRequest(onDnsRequest);