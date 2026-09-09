const assert = require('assert');
const { GameRoom } = require('../js/room_logic.js');
const { NetworkManager } = require('../js/network.js');
const { server, activeRooms, encodeTextFrame } = require('../server.js');

console.log('=== RUNNING WEBRTC & NETWORK RESILIENCE TEST SUITE ===');

// --- Mock localStorage & BroadcastChannel for Node.js environment ---
const mockStorage = new Map();
global.localStorage = {
  getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear()
};

const bcSubscribers = new Map(); // channelName -> Set<callback>
global.BroadcastChannel = class MockBroadcastChannel {
  constructor(channelName) {
    this.name = channelName;
    if (!bcSubscribers.has(channelName)) {
      bcSubscribers.set(channelName, new Set());
    }
    bcSubscribers.get(channelName).add(this);
    this.onmessage = null;
  }
  postMessage(data) {
    const subs = bcSubscribers.get(this.name);
    if (subs) {
      subs.forEach(sub => {
        if (sub !== this && typeof sub.onmessage === 'function') {
          sub.onmessage({ data });
        }
      });
    }
  }
  close() {
    const subs = bcSubscribers.get(this.name);
    if (subs) subs.delete(this);
  }
};

// =========================================================================
// 1. Connection Persistence & Graceful Disconnection (Grace Period)
// =========================================================================
console.log('\n1. Testing Graceful Disconnection & Grace Period...');
const room = new GameRoom('NB-7777', { id: 'p_host', name: 'استاد نقاش' });
room.addPlayer({ id: 'p_guest1', name: 'سارا' });
room.addPlayer({ id: 'p_guest2', name: 'نیما' });

// Start game
room.startGame();
assert.strictEqual(room.status, 'CHOOSING');
const roundData = room.selectWord({ word: 'هواپیما', category: 'وسایل نقلیه', difficulty: 'medium' });
assert.strictEqual(room.status, 'DRAWING');

// Guest 1 scores points
const guessRes = room.submitGuess('p_guest1', 'هواپیما');
assert.strictEqual(guessRes.type, 'CORRECT');
const p1Before = room.players.find(p => p.id === 'p_guest1');
assert.ok(p1Before.score > 0, 'Guest 1 must have earned points');
const p1Score = p1Before.score;

// Guest 1 internet blips / tab switches -> temporary disconnect
const tempDisc = room.markPlayerDisconnected('p_guest1');
assert.strictEqual(tempDisc.player.connected, false, 'Player must be marked connected: false');
assert.strictEqual(room.players.length, 3, 'Player slot must NOT be removed from room during grace period!');
assert.strictEqual(room.status, 'DRAWING', 'Game must NOT be killed on temporary disconnect!');
assert.strictEqual(p1Before.score, p1Score, 'Player score must remain intact!');
console.log('✓ Temporary disconnect preserves player slot, score, and in-game status.');

// NetworkManager grace timer verification
const netHost = new NetworkManager();
netHost.isHost = true;
let tempDiscEmitted = false;
netHost.callbacks.onPlayerTemporarilyDisconnected = (pId) => {
  tempDiscEmitted = true;
  assert.strictEqual(pId, 'p_guest1');
};
netHost.handlePeerDisconnection('p_guest1');
assert.strictEqual(tempDiscEmitted, true, 'NetworkManager must immediately emit onPlayerTemporarilyDisconnected');
assert.ok(netHost.disconnectTimers.has('p_guest1'), 'Disconnect grace timer must be scheduled');
assert.strictEqual(netHost.gracePeriodMs, 28000, 'Grace period must be generous (28 seconds)');
console.log('✓ NetworkManager triggers temporary disconnect and schedules 28s grace timer.');

// =========================================================================
// 2. Seamless Reconnection & Score/Role Restoration
// =========================================================================
console.log('\n2. Testing Seamless Reconnection...');

// Guest 1 reconnects with same playerId
const reconnectRes = room.addPlayer({ id: 'p_guest1', name: 'سارا', avatar: '🎨' });
assert.strictEqual(reconnectRes.success, true);
assert.strictEqual(reconnectRes.isReconnect, true, 'Host must recognize reconnecting player by playerId');
assert.strictEqual(reconnectRes.player.connected, true, 'Player must be restored to connected: true');
assert.strictEqual(reconnectRes.player.score, p1Score, 'Player score must be preserved on reconnect');
assert.strictEqual(room.players.length, 3, 'Player count must remain 3');

// Reconnection packet cancels disconnect grace timer in NetworkManager
netHost.handleGuestMessage('peer_reconnect_123', {
  type: 'JOIN',
  player: { id: 'p_guest1', name: 'سارا' }
});
assert.strictEqual(netHost.disconnectTimers.has('p_guest1'), false, 'Grace timer must be cancelled on reconnection!');
assert.strictEqual(netHost.playerIdToPeer.get('p_guest1'), 'peer_reconnect_123', 'Peer connection must be updated to new peer ID');
console.log('✓ Reconnection cancels grace timer and restores player connection mapping.');

// =========================================================================
// 3. Canvas History Recording & Snapshot Replay
// =========================================================================
console.log('\n3. Testing Canvas History Recording & Catch-Up Snapshot...');
assert.strictEqual(room.getCanvasHistory().length, 0);

// Drawer draws a stroke
const strokeAction = {
  type: 'STROKE',
  color: '#f59e0b',
  size: 8,
  points: [{ rx: 0.1, ry: 0.1 }, { rx: 0.4, ry: 0.4 }]
};
room.recordDrawingAction(strokeAction);
assert.strictEqual(room.getCanvasHistory().length, 1);

// Drawer performs flood fill
const fillAction = {
  type: 'FILL',
  rx: 0.5,
  ry: 0.5,
  color: '#3b82f6'
};
room.recordDrawingAction(fillAction);
assert.strictEqual(room.getCanvasHistory().length, 2);

// State snapshot must contain canvasHistory
const snap = room.getStateSnapshot();
assert.ok(Array.isArray(snap.canvasHistory), 'State snapshot must include canvasHistory array');
assert.strictEqual(snap.canvasHistory.length, 2);
assert.strictEqual(snap.canvasHistory[0].type, 'STROKE');
assert.strictEqual(snap.canvasHistory[1].type, 'FILL');
console.log('✓ Authoritative canvas history correctly recorded and included in state snapshot.');

// Undo pops from canvas history
room.recordDrawingAction({ type: 'UNDO' });
assert.strictEqual(room.getCanvasHistory().length, 1);
assert.strictEqual(room.getCanvasHistory()[0].type, 'STROKE');

// Clear resets canvas history
room.recordDrawingAction({ type: 'CLEAR' });
assert.strictEqual(room.getCanvasHistory().length, 1);
assert.strictEqual(room.getCanvasHistory()[0].type, 'CLEAR');
console.log('✓ Canvas UNDO and CLEAR actions correctly reflected in canvas history.');

// =========================================================================
// 4. Post-Game Seamless Room Retention ("Play Again")
// =========================================================================
console.log('\n4. Testing Post-Game Seamless Room Retention ("Play Again")...');
// Advance game to GAME_OVER
room.currentRound = room.totalRounds;
room.drawerIndex = room.players.length - 1;
room.endTurn();
const gameOverRes = room.nextTurn();
assert.strictEqual(gameOverRes.status, 'GAME_OVER');
assert.strictEqual(room.status, 'GAME_OVER');
assert.ok(gameOverRes.podium);

// Host triggers restartGame ("بازی مجدد")
const restartRes = room.restartGame();
assert.strictEqual(restartRes.status, 'LOBBY');
assert.strictEqual(room.status, 'LOBBY');
assert.strictEqual(room.currentRound, 1, 'Round counter must be reset to 1');
assert.strictEqual(room.drawerIndex, 0, 'Drawer index must be reset to 0');
assert.strictEqual(room.roomCode, 'NB-7777', 'Room code must be strictly preserved!');
assert.strictEqual(room.players.length, 3, 'All 3 players must remain in the room waiting lobby together');
room.players.forEach(p => {
  assert.strictEqual(p.score, 0, 'Scores must be reset to 0 for the fresh game');
  assert.strictEqual(p.guessedThisRound, false);
});
assert.strictEqual(room.canStartGame(), true, 'Room must be immediately ready to start next game without re-sharing codes');
console.log('✓ "Play Again" resets game state to round 1 and lobby while retaining room code & all players.');

// =========================================================================
// 5. Serverless Active Rooms Discovery
// =========================================================================
console.log('\n5. Testing Serverless Active Rooms Discovery Protocol...');
global.localStorage.clear();

// Host announces room
const hostNet = new NetworkManager();
hostNet.isHost = true;
hostNet.roomCode = 'NB-9999';
hostNet.startDiscoveryBroadcast({
  roomCode: 'NB-9999',
  hostName: 'علی',
  hostAvatar: '🦁',
  playerCount: 3,
  maxPlayers: 6,
  status: 'LOBBY'
});

// Client queries active rooms
const activeList1 = NetworkManager.getActiveRooms();
assert.strictEqual(activeList1.length, 1);
assert.strictEqual(activeList1[0].roomCode, 'NB-9999');
assert.strictEqual(activeList1[0].hostName, 'علی');
assert.strictEqual(activeList1[0].playerCount, 3);
assert.strictEqual(activeList1[0].status, 'LOBBY');
console.log('✓ Active rooms correctly recorded in distributed storage and retrieved.');

// Update room status (e.g. game starts)
hostNet.updateDiscoveryStatus('IN_GAME', 4);
const activeList2 = NetworkManager.getActiveRooms();
assert.strictEqual(activeList2.length, 1);
assert.strictEqual(activeList2[0].status, 'IN_GAME');
assert.strictEqual(activeList2[0].playerCount, 4);
console.log('✓ Host discovery status update immediately reflected.');

// Expired room purge (> 14 seconds)
const raw = JSON.parse(global.localStorage.getItem('naghash_active_rooms'));
raw['NB-EXPIRED'] = {
  roomCode: 'NB-EXPIRED',
  hostName: 'قدیمی',
  updatedAt: Date.now() - 20000 // 20 seconds ago
};
global.localStorage.setItem('naghash_active_rooms', JSON.stringify(raw));

const activeListWithPurge = NetworkManager.getActiveRooms();
assert.strictEqual(activeListWithPurge.some(r => r.roomCode === 'NB-EXPIRED'), false, 'Expired rooms must be automatically purged');
assert.strictEqual(activeListWithPurge.some(r => r.roomCode === 'NB-9999'), true);
console.log('✓ Expired rooms automatically purged from active room registry.');

// Host leaves / room closes -> unannounce
hostNet.stopDiscoveryBroadcast();
const activeListAfterClose = NetworkManager.getActiveRooms();
assert.strictEqual(activeListAfterClose.length, 0, 'Room must be removed from active discovery when host closes room');
console.log('✓ Host clean unannounce removes room from active discovery.');

// Clean up hostNet
hostNet.destroy();
netHost.destroy();

// =========================================================================
// 6. WebSocket Relay Room Discovery Integration
// =========================================================================
console.log('\n6. Testing WebSocket Relay Room Discovery...');
const wsClient = new WebSocket('ws://localhost:3000');

wsClient.onopen = () => {
  // Announce room to WS relay
  wsClient.send(JSON.stringify({
    action: 'ANNOUNCE_ROOM',
    room: {
      roomCode: 'NB-WS-DISC',
      hostName: 'پوریا',
      hostAvatar: '🐱',
      playerCount: 2,
      maxPlayers: 6,
      status: 'LOBBY'
    }
  }));

  // Request room list from WS relay
  setTimeout(() => {
    wsClient.send(JSON.stringify({ action: 'GET_ROOMS' }));
  }, 40);
};

wsClient.onmessage = (evt) => {
  const data = JSON.parse(evt.data);
  if (data.action === 'ROOMS_LIST') {
    assert.ok(Array.isArray(data.rooms));
    const found = data.rooms.find(r => r.roomCode === 'NB-WS-DISC');
    assert.ok(found, 'Announced room must be found in WebSocket relay rooms list');
    assert.strictEqual(found.hostName, 'پوریا');
    assert.strictEqual(found.playerCount, 2);
    console.log('✓ WebSocket relay active rooms discovery verified.');

    // Close room
    wsClient.send(JSON.stringify({ action: 'CLOSE_ROOM', roomCode: 'NB-WS-DISC' }));
    setTimeout(() => {
      wsClient.close();
      server.close();
      console.log('\n🎉 ALL WEBRTC & NETWORK RESILIENCE TESTS PASSED FLAWLESSLY! 🎉');
      process.exit(0);
    }, 50);
  }
};

wsClient.onerror = (err) => {
  console.error('WebSocket client error:', err);
  process.exit(1);
};
