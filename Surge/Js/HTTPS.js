const { URL } = require('url');

$done({});

const url = new URL($request.url);
const newURL = `https://${url.host}${url.pathname}`;

const response = {
    status: 302,
    statusDescription: 'Found',
    headers: {
        Location: newURL
    }
};

$done({ response });