const http = require('http');
const https = require('https');

const common = { keepAlive: true, maxSockets: 50, maxFreeSockets: 10, timeout: 60000, freeSocketTimeout: 30000 };

const httpAgent = new http.Agent(common);
const httpsAgent = new https.Agent(common);

module.exports = { httpAgent, httpsAgent };
