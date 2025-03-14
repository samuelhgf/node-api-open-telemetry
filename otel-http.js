const http = require('http');
const https = require('https');

// Create deep copies of the original request methods
const originalHttpRequest = http.request.bind({});
const originalHttpsRequest = https.request.bind({});

module.exports = {
    originalHttpRequest,
    originalHttpsRequest
};