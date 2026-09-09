const assert = require('assert');
const { GameRoom, MAX_PLAYERS, MIN_PLAYERS } = require('../js/room_logic.js');
const { NetworkManager, formatRoomPeerId } = require('../js/network.js');
const WordBank = require('../js/words.js');

console.log('--- Running Network, Guest Drawer & Anti-Spoiler Test ---');

// 1. Peer to Player ID mapping in NetworkManager
const netHost = new NetworkManager();
netHost.registerPlayerPeer('p_guest_1', 'peer_id_abc123');
assert.strictEqual(netHost.playerIdToPeer.get('p_guest_1'), 'peer_id_abc123');
assert.strictEqual(netHost.peerToPlayerId.get('peer_id_abc123'), 'p_guest_1');
console.log('✓ NetworkManager player <-> peer ID mapping verified.');

// 2. Targeted packet filtering
let packetReceived = false;
const netTargetTest = new NetworkManager({
  onWordChoices: (choices) => {
    packetReceived = true;
  }
});
netTargetTest.myPlayerId = 'p_guesser_only';

// Packet targeted to someone else must be ignored
netTargetTest.handlePacket({
  type: 'WORD_CHOICES',
  targetPlayerId: 'p_drawer_someone_else',
  choices: [{ word: 'سیب' }]
});
assert.strictEqual(packetReceived, false, 'Packet targeted to someone else must be ignored!');

// Packet targeted to me must be handled
netTargetTest.handlePacket({
  type: 'WORD_CHOICES',
  targetPlayerId: 'p_guesser_only',
  choices: [{ word: 'سیب' }]
});
assert.strictEqual(packetReceived, true, 'Packet targeted to my player ID must be accepted!');
console.log('✓ Targeted delivery prevents guessers from seeing secret choices.');

// 3. Guest Drawer Lifecycle Simulation
const room = new GameRoom('NB-555', { id: 'p_host', name: 'میزبان' });
room.addPlayer({ id: 'p_guest1', name: 'مهمان ۱' });
room.addPlayer({ id: 'p_guest2', name: 'مهمان ۲' });

// Start game: 1st drawer is p_host
room.startGame();
assert.strictEqual(room.getDrawer().id, 'p_host');

// Advance turn: 2nd drawer is p_guest1 (Guest Drawer!)
const turn1End = room.selectWord({ word: 'سیب', category: 'خوراکی', difficulty: 'easy' });
room.endTurn();
const nextTurnRes = room.nextTurn();
assert.strictEqual(nextTurnRes.status, 'CHOOSING');

const drawer2 = room.getDrawer();
assert.strictEqual(drawer2.id, 'p_guest1', 'Second drawer must be p_guest1');

// Drawer2 selects word
const guestChoices = nextTurnRes.data.wordChoices;
assert.strictEqual(guestChoices.length, 3);
const chosenWord = guestChoices[0];
const drawPhaseData = room.selectWord(chosenWord);

assert.strictEqual(room.status, 'DRAWING');
assert.strictEqual(drawPhaseData.word.word, chosenWord.word);
console.log(`✓ Guest drawer (p_guest1) selected word: "${chosenWord.word}".`);

// 4. Anti-Spoiler Tests
// 4a. Drawer cannot guess and cannot leak word in chat
const drawerLeak = room.submitGuess('p_guest1', `کلمه ما ${chosenWord.word} هست!`);
assert.strictEqual(drawerLeak.type, 'DRAWER_SPOILER_BLOCKED', 'Drawer leaking target word must be blocked!');

// 4b. Normal chat by drawer without the secret word is allowed
const drawerSafeChat = room.submitGuess('p_guest1', 'سلام نقاشیم چطوره؟');
assert.strictEqual(drawerSafeChat.type, 'CHAT');

// 4c. Guesser submitting sentence containing secret word -> counted as CORRECT guess (prevents chat spoiling!)
const guesserSpoiler = room.submitGuess('p_guest2', `من حدس میزنم ${chosenWord.word} باشه`);
assert.strictEqual(guesserSpoiler.type, 'CORRECT', 'Guess containing word must score and be hidden from chat!');
assert.strictEqual(room.players.find(p => p.id === 'p_guest2').guessedThisRound, true);

// 4d. Player who already guessed cannot leak word again
const repeatLeak = room.submitGuess('p_guest2', chosenWord.word);
assert.strictEqual(repeatLeak.type, 'ALREADY_GUESSED_SPOILER', 'Player who already guessed cannot leak word in chat');
console.log('✓ Anti-spoiler system thoroughly verified.');

// 5. Drawer Disconnection Test during Game
// When p_guest1 (current drawer) disconnects:
const disconnectRes = room.removePlayer('p_guest1');
assert.ok(disconnectRes, 'Removed object must be returned');
assert.strictEqual(disconnectRes.drawerLeft, true, 'Must detect that the drawer left');
assert.strictEqual(room.getDrawer().id, 'p_guest2', 'Must advance to next player (p_guest2) without skipping');
assert.strictEqual(room.status, 'CHOOSING', 'Must immediately start word selection for the next player');
console.log('✓ Drawer disconnect cleanly advances turn to next player.');

// 6. When players fall below 2, room returns to LOBBY
room.removePlayer('p_guest2');
assert.strictEqual(room.players.length, 1);
assert.strictEqual(room.status, 'LOBBY', 'Room must revert to LOBBY if fewer than 2 players remain');
console.log('✓ Under-capacity room reverts cleanly to LOBBY.');

console.log('🎉 All Network & Guest Drawer tests passed successfully!');
