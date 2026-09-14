const http = require('http');

const PORT = 8088;
const TARGET_HOST = '127.0.0.1';
const TARGET_PORT = 8080;

const server = http.createServer((req, res) => {
    // CORS headers for all incoming mobile/web requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const options = {
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        path: req.url,
        method: req.method,
        headers: {
            ...req.headers,
            host: `${TARGET_HOST}:${TARGET_PORT}`,
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        console.error(`[Mobile Proxy Error] ${err.message}`);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Backend unreachable: ' + err.message }));
    });

    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Mobile Proxy] Running on 0.0.0.0:${PORT} -> 127.0.0.1:${TARGET_PORT}`);
});
