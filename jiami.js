const CryptoJS = require('crypto-js');

const key = 'YourEncryptionKey'; // 替换为你的加密密钥

function encryptContent(data) {
    // 使用 AES 加密算法对数据进行加密
    const encryptedData = CryptoJS.AES.encrypt(data, key).toString();
    return encryptedData;
}

function decryptContent(data) {
    // 使用 AES 解密算法对数据进行解密
    const decryptedData = CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8);
    return decryptedData;
}

$done({
    response: {
        body: encryptContent($response.body) // 对响应体进行加密处理
    }
});