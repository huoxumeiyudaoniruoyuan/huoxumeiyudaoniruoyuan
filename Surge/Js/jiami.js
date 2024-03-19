const url = $request.url;
const body = $response.body;

// HTTPS 重定向
if (url.startsWith("http://")) {
    const httpsUrl = url.replace(/^http:/, "https:");
    const status = "HTTP/1.1 302 Found";
    const headers = {
        Location: httpsUrl
    };
    const resp = {
        status: status,
        headers: headers
    };
    $done(resp);
}

// 内容加密
if (url.startsWith("https://")) {
    // 对响应体进行加密处理，这里使用 Base64 编码作为示例
    const encodedBody = $text.base64Encode(body);
    const resp = {
        body: encodedBody
    };
    $done(resp);
} else {
    $done({});
}