import net from 'net';
import http from 'http';
import { WebSocketServer } from 'ws';

const TCP_HOST = '127.0.0.1';
const TCP_PORT = 7001; // C++ device server port
const WS_PORT = 4000; // WebSocket port for React clients

let deviceSocket = null;
let deviceConnected = false;

const httpServer = http.createServer();
const wss = new WebSocketServer({ server: httpServer });

function broadcast(line) {
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(line);
    }
  }
}

function connectToDevice() {
  console.log(`Connecting to device TCP at ${TCP_HOST}:${TCP_PORT}...`);

  deviceSocket = net.createConnection({ host: TCP_HOST, port: TCP_PORT }, () => {
    deviceConnected = true;
    console.log('✅ Connected to C++ device server');
  });

  let buffer = '';

  deviceSocket.on('data', (chunk) => {
    buffer += chunk.toString();

    // Your C++ server sends newline-delimited JSON (NDJSON)
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      broadcast(trimmed);
    }
  });

  deviceSocket.on('error', (err) => {
    deviceConnected = false;
    console.error('Device TCP error:', err.message);
  });

  deviceSocket.on('close', () => {
    deviceConnected = false;
    console.log('Device TCP disconnected. Reconnecting in 2s...');
    setTimeout(connectToDevice, 2000);
  });
}

// WebSocket side (React clients)
wss.on('connection', (ws) => {
  console.log('🌐 React client connected');

  ws.on('message', (data) => {
    // For now: the device server only streams state.
    // If you later implement force commands, forward them here.
    // const message = data.toString();
    // if (deviceSocket && deviceConnected) deviceSocket.write(message + '\n');
    void data;
  });

  ws.on('close', () => {
    console.log('React client disconnected');
  });
});

httpServer.listen(WS_PORT, () => {
  console.log(`🌐 WebSocket bridge listening on ws://localhost:${WS_PORT}`);
  console.log('Waiting for React clients...');
  connectToDevice();
});

