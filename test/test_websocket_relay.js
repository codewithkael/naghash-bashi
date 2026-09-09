const assert = require('assert');
const { server } = require('../server.js');

console.log('--- Testing Zero-Dependency WebSocket Room Relay ---');

// Wait for server to listen if not already
function run() {
  const ws1 = new WebSocket('ws://localhost:3000');
  const ws2 = new WebSocket('ws://localhost:3000');

  let hostReceived = null;
  let guestReceived = null;
  let disconnectReceived = null;

  let openCount = 0;

  function onOpen() {
    openCount++;
    if (openCount === 2) {
      // 1. Register host and guest
      ws1.send(JSON.stringify({
        action: 'REGISTER_ROOM',
        roomCode: 'NB-WS1',
        isHost: true,
        playerId: 'host_p1'
      }));

      ws2.send(JSON.stringify({
        action: 'REGISTER_ROOM',
        roomCode: 'NB-WS1',
        isHost: false,
        playerId: 'guest_p2'
      }));

      // 2. Guest sends TO_HOST packet
      setTimeout(() => {
        ws2.send(JSON.stringify({
          action: 'TO_HOST',
          roomCode: 'NB-WS1',
          packet: { type: 'JOIN', senderId: 'guest_p2', text: 'Hello Host!' }
        }));
      }, 50);
    }
  }

  ws1.onopen = onOpen;
  ws2.onopen = onOpen;

  ws1.onmessage = (evt) => {
    const data = JSON.parse(evt.data);
    if (data.action === 'RELAY') {
      hostReceived = data.packet;
      console.log('✓ Host received relay from guest:', hostReceived.text);

      // Host broadcasts to guest
      ws1.send(JSON.stringify({
        action: 'BROADCAST',
        roomCode: 'NB-WS1',
        packet: { type: 'ROOM_STATE', senderId: 'host_p1', text: 'Welcome Guest!' }
      }));
    } else if (data.action === 'PLAYER_DISCONNECTED') {
      disconnectReceived = data.playerId;
      console.log('✓ Host received disconnect event for:', disconnectReceived);

      assert.strictEqual(disconnectReceived, 'guest_p2');
      assert.strictEqual(hostReceived.text, 'Hello Host!');
      assert.strictEqual(guestReceived.text, 'Welcome Guest!');

      console.log('🎉 WebSocket Room Relay completely verified!');
      ws1.close();
      server.close();
      process.exit(0);
    }
  };

  ws2.onmessage = (evt) => {
    const data = JSON.parse(evt.data);
    if (data.action === 'RELAY') {
      guestReceived = data.packet;
      console.log('✓ Guest received relay from host:', guestReceived.text);

      // Now close guest to trigger disconnect event on host
      setTimeout(() => {
        ws2.close();
      }, 50);
    }
  };

  ws1.onerror = (err) => {
    console.error('ws1 error:', err);
    process.exit(1);
  };
  ws2.onerror = (err) => {
    console.error('ws2 error:', err);
    process.exit(1);
  };
}

if (!server.listening) {
  server.on('listening', run);
} else {
  run();
}
