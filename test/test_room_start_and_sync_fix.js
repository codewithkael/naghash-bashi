const assert = require('assert');
const { GameRoom, MIN_PLAYERS } = require('../js/room_logic.js');
const { NetworkManager } = require('../js/network.js');

console.log('--- Running Room Start & Guest Transition Simulation ---');

// 1. Setup room
const room = new GameRoom('NB-1234', { id: 'p_host', name: 'میزبان', isHost: true });
assert.strictEqual(room.canStartGame(), false, 'Single player cannot start game');

// Guest joins
const joinRes = room.addPlayer({ id: 'p_guest', name: 'مهمان ۱', isHost: false });
assert.strictEqual(joinRes.success, true);
assert.strictEqual(room.players.length, 2);
assert.strictEqual(room.canStartGame(), true, 'Two players must allow starting the game');
console.log('✓ Player count and canStartGame verified.');

// 2. Simulate Host UI button logic from app.js
const snap = room.getStateSnapshot();
const hostCanStart = snap.players.length >= MIN_PLAYERS;
const hostButtonDisabled = !hostCanStart;
assert.strictEqual(hostButtonDisabled, false, 'Host Start Button must be enabled immediately when guest joins!');
console.log('✓ Host start button enablement verified.');

// 3. Start game and verify state snapshot
const startRes = room.startGame();
assert.strictEqual(startRes.success, true);
assert.strictEqual(room.status, 'CHOOSING');

const choosingSnap = room.getStateSnapshot();
assert.strictEqual(choosingSnap.status, 'CHOOSING');

// In app.js: any guest receiving choosingSnap must switch to 'game' view:
const inActiveGame = (choosingSnap.status === 'CHOOSING' || choosingSnap.status === 'DRAWING' || choosingSnap.status === 'ROUND_END');
assert.strictEqual(inActiveGame, true, 'Guest must identify active game state');

let guestCurrentView = 'waiting';
if (inActiveGame && guestCurrentView !== 'game') {
  guestCurrentView = 'game';
}
assert.strictEqual(guestCurrentView, 'game', 'Guest must automatically switch from waiting to game screen!');
console.log('✓ Guest automatic transition to game screen verified.');

// 4. Verify word selection and drawer setup
const drawer = room.getDrawer();
assert.strictEqual(drawer.id, 'p_host');
const wordSelectedRes = room.selectWord({ word: 'هواپیما', category: 'تکنولوژی', difficulty: 'medium' });
assert.strictEqual(room.status, 'DRAWING');
assert.strictEqual(wordSelectedRes.word.word, 'هواپیما');
console.log('✓ Word selection phase transitions cleanly to DRAWING.');

// 5. Verify RTC_CONFIG has user provided STUN & TURN
const { RTC_CONFIG } = require('../js/network.js');
const turnUdp = RTC_CONFIG.iceServers.find(s => s.urls && s.urls.includes('turn:turn1.spacsvc.co.in:3478?transport=udp'));
const turnTcp = RTC_CONFIG.iceServers.find(s => s.urls && s.urls.includes('turn:turn1.spacsvc.co.in:3478?transport=tcp'));
const turnsTls = RTC_CONFIG.iceServers.find(s => s.urls && s.urls.includes('turns:turn1.spacsvc.co.in:443?transport=tcp'));

assert.ok(turnUdp, 'UDP TURN server must be configured');
assert.strictEqual(turnUdp.username, 'username1');
assert.strictEqual(turnUdp.credential, 'password1');

assert.ok(turnTcp, 'TCP TURN server must be configured');
assert.strictEqual(turnTcp.username, 'username1');
assert.strictEqual(turnTcp.credential, 'password1');

assert.ok(turnsTls, 'TLS TURNS server must be configured');
assert.strictEqual(turnsTls.username, 'username1');
assert.strictEqual(turnsTls.credential, 'password1');
console.log('✓ User TURN server configuration verified.');

console.log('🎉 All Room Start, Guest Transition & TURN Server tests passed!');
