// prevent_dns_leak.js

// This script checks if DNS queries are going through the proxy, and if not, it forces them to do so.

let dnsQueryPattern = /^https?:\/\/([^\/]+)\//;
let requestUrl = $request.url;

if (dnsQueryPattern.test(requestUrl)) {
  let domain = requestUrl.match(dnsQueryPattern)[1];

  // Check if the request is going through the proxy
  if ($network.vpn && $network.vpn.enabled) {
    console.log(`DNS query for ${domain} is going through the proxy.`);
  } else {
    console.log(`DNS query for ${domain} is not going through the proxy. Blocking request.`);
    $done({response: {status: 403, body: "DNS Leak detected and blocked."}});
    return;
  }
}

$done({});