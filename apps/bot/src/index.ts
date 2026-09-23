import http from 'node:http';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT) || 4001;

/**
 * CargonaOS Bot Runner & Companion Daemon
 */
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: 'CargonaOS Bot Companion Daemon',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 CargonaOS Bot Companion Daemon running on port ${PORT}`);
});
