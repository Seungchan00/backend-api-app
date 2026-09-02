const http = require('http');
const client = require('prom-client');

client.collectDefaultMetrics();

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
});

let leakyMemory = [];

const server = http.createServer(async (req, res) => {
  const end = httpDuration.startTimer({ method: req.method, route: req.url });

  if (req.url === '/healthz') {
    httpRequestCounter.inc({ method: req.method, route: '/healthz', status_code: 200 });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': client.register.contentType });
    res.end(await client.register.metrics());
  } else if (req.url === '/leak') {
    leakyMemory.push(new Array(1e6).fill('leak'));
    httpRequestCounter.inc({ method: req.method, route: '/leak', status_code: 200 });
    res.writeHead(200);
    res.end(`Leaked. Current chunks: ${leakyMemory.length}`);
  } else {
    httpRequestCounter.inc({ method: req.method, route: req.url, status_code: 200 });
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello from backend-api!\n');
  }

  end();
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
});
