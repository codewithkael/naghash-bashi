/**
 * نقاشباشی (Naghash Bashi) - Local Development Static & WebSocket Server
 * Built with standard Node.js libraries (http, fs, path, crypto) - Zero npm install required.
 * Provides both static file serving and real-time WebSocket room messaging relay.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// --- Zero-Dependency RFC 6455 WebSocket Room Relay ---
const rooms = new Map(); // roomCode -> Set<socket>

function encodeTextFrame(text) {
  const buf = Buffer.from(text, 'utf8');
  let header;
  if (buf.length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text opcode (1)
    header[1] = buf.length;
  } else if (buf.length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(buf.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(buf.length), 2);
  }
  return Buffer.concat([header, buf]);
}

function sendToSocket(socket, obj) {
  if (socket && !socket.destroyed && socket.writable) {
    try {
      socket.write(encodeTextFrame(JSON.stringify(obj)));
    } catch (e) {}
  }
}

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`
  ];

  socket.write(headers.join('\r\n') + '\r\n\r\n');
  socket.meta = { roomCode: null, playerId: null, isHost: false };

  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const byte1 = buffer[0];
      const byte2 = buffer[1];
      const opcode = byte1 & 0x0f;
      const isMasked = (byte2 & 0x80) !== 0;
      let payloadLength = byte2 & 0x7f;
      let headerLength = 2;

      if (payloadLength === 126) {
        if (buffer.length < 4) break;
        payloadLength = buffer.readUInt16BE(2);
        headerLength = 4;
      } else if (payloadLength === 127) {
        if (buffer.length < 10) break;
        payloadLength = Number(buffer.readBigUInt64BE(2));
        headerLength = 10;
      }

      const maskKeyLength = isMasked ? 4 : 0;
      const totalLength = headerLength + maskKeyLength + payloadLength;
      if (buffer.length < totalLength) break;

      let maskKey = null;
      if (isMasked) {
        maskKey = buffer.slice(headerLength, headerLength + 4);
      }

      const rawPayload = buffer.slice(headerLength + maskKeyLength, totalLength);
      buffer = buffer.slice(totalLength);

      if (opcode === 0x8) {
        // Close frame -> send close acknowledgement frame back per RFC 6455
        try {
          socket.write(Buffer.from([0x88, 0x00]));
        } catch (e) {}
        socket.end();
        return;
      }

      if (opcode === 0x9) {
        // Ping -> send Pong
        const pongHeader = Buffer.from([0x8a, 0x00]);
        socket.write(pongHeader);
        continue;
      }

      if (opcode === 0x1) {
        // Text frame
        if (isMasked && maskKey) {
          for (let i = 0; i < rawPayload.length; i++) {
            rawPayload[i] ^= maskKey[i % 4];
          }
        }
        const text = rawPayload.toString('utf8');
        handleClientMessage(socket, text);
      }
    }
  });

  const cleanup = () => {
    if (socket.meta && socket.meta.roomCode) {
      const room = rooms.get(socket.meta.roomCode);
      if (room) {
        room.delete(socket);
        if (room.size === 0) {
          rooms.delete(socket.meta.roomCode);
        } else if (socket.meta.playerId) {
          room.forEach((s) => {
            sendToSocket(s, {
              action: 'PLAYER_DISCONNECTED',
              playerId: socket.meta.playerId
            });
          });
        }
      }
    }
  };

  socket.on('close', cleanup);
  socket.on('error', cleanup);
});

function handleClientMessage(socket, text) {
  try {
    const msg = JSON.parse(text);
    if (!msg || !msg.action) return;

    if (msg.action === 'REGISTER_ROOM') {
      const roomCode = (msg.roomCode || '').toUpperCase();
      socket.meta.roomCode = roomCode;
      socket.meta.playerId = msg.playerId;
      socket.meta.isHost = !!msg.isHost;

      if (!rooms.has(roomCode)) {
        rooms.set(roomCode, new Set());
      }
      rooms.get(roomCode).add(socket);
      return;
    }

    const roomCode = socket.meta.roomCode || (msg.roomCode || '').toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return;

    if (msg.action === 'BROADCAST') {
      room.forEach((s) => {
        if (s !== socket) {
          sendToSocket(s, { action: 'RELAY', packet: msg.packet });
        }
      });
    } else if (msg.action === 'TO_HOST') {
      room.forEach((s) => {
        if (s.meta.isHost) {
          sendToSocket(s, { action: 'RELAY', packet: msg.packet });
        }
      });
    } else if (msg.action === 'TO_PEER') {
      room.forEach((s) => {
        if (s.meta.playerId === msg.targetPlayerId) {
          sendToSocket(s, { action: 'RELAY', packet: msg.packet });
        }
      });
    }
  } catch (e) {}
}

if (!server.listening) {
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  نقاشباشی (Naghash Bashi) - بازی آنلاین حدس نقاشی`);
    console.log(`  Online Multiplayer Drawing & Guessing Game`);
    console.log(`  Server is running on: http://localhost:${PORT}`);
    console.log(`  WebSocket Room Relay: ws://localhost:${PORT}`);
    console.log(`  Open in browser: http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

module.exports = {
  server,
  rooms,
  encodeTextFrame,
  PORT
};
