const assert = require('assert');
const { GameRoom, MAX_PLAYERS, MIN_PLAYERS } = require('../js/room_logic.js');

console.log('--- Testing GameRoom & RoomLogic ---');

// 1. Create Room and Host
const room = new GameRoom('NB-123', { id: 'p1', name: 'علی', avatar: '🎨' });
assert.strictEqual(room.players.length, 1);
assert.strictEqual(room.players[0].isHost, true);
assert.strictEqual(room.status, 'LOBBY');
console.log('✓ Room creation & host assignment verified.');

// 2. Add players up to 6
for (let i = 2; i <= 6; i++) {
  const res = room.addPlayer({ id: `p${i}`, name: `بازیکن ${i}`, avatar: '🦁' });
  assert.strictEqual(res.success, true, `Player ${i} should be added`);
}
assert.strictEqual(room.players.length, 6);
console.log('✓ Successfully joined 6 players.');

// 3. Attempt to add 7th player (Strict 6 player capacity enforcement)
const seventh = room.addPlayer({ id: 'p7', name: 'بازیکن اضافه', avatar: '🤖' });
assert.strictEqual(seventh.success, false, '7th player must be rejected');
assert.strictEqual(seventh.error, 'ROOM_FULL', 'Error must be ROOM_FULL');
assert.strictEqual(room.players.length, 6, 'Room capacity must remain at 6');
console.log('✓ 6-player limit strictly enforced.');

// 4. Test Profanity Filter rejection in room join
const badRoom = new GameRoom('NB-999', { id: 'h1', name: 'میزبان', avatar: '👑' });
const badJoin = badRoom.addPlayer({ id: 'bad1', name: 'کیر', avatar: '🦊' });
assert.strictEqual(badJoin.success, false);
assert.strictEqual(badJoin.error, 'PROFANITY_DETECTED');
console.log('✓ Profanity filter blocks vulgar names from entering room.');

// 5. Start Game & Word Selection
assert.strictEqual(room.canStartGame(), true);
const startRes = room.startGame();
assert.strictEqual(startRes.success, true);
assert.strictEqual(room.status, 'CHOOSING');
assert.strictEqual(room.wordChoices.length, 3);
console.log('✓ Game started with 3 word choices for drawer.');

// 6. Drawer Selects Word
const drawer = room.getDrawer();
assert.strictEqual(drawer.id, 'p1', 'First drawer should be host p1');
const chosenWord = room.wordChoices[1];
const drawStart = room.selectWord(chosenWord);
assert.strictEqual(room.status, 'DRAWING');
assert.strictEqual(room.currentWord.word, chosenWord.word);
assert.strictEqual(room.timerSeconds, 60);
console.log(`✓ Word "${chosenWord.word}" selected, timer set to 60s.`);

// 7. Test Guess Submission
// Guess by drawer should not score
const drawerGuess = room.submitGuess('p1', chosenWord.word);
assert.strictEqual(drawerGuess.type, 'CHAT');

// Wrong guess by p2
const wrongGuess = room.submitGuess('p2', 'کلمه اشتباه');
assert.strictEqual(wrongGuess.type, 'CHAT');

// Correct guess by p2
const correctGuess = room.submitGuess('p2', chosenWord.word);
assert.strictEqual(correctGuess.type, 'CORRECT');
assert.ok(correctGuess.points >= 400, 'Fast guess should score 400+ points');
assert.strictEqual(room.players.find(p => p.id === 'p2').score, correctGuess.points);
assert.strictEqual(drawer.score, 60, 'Drawer should receive +60 bonus points');
console.log(`✓ Guess correctly scored: +${correctGuess.points} to guesser, +60 to drawer.`);

// 8. Re-guessing by same player
const reGuess = room.submitGuess('p2', chosenWord.word);
assert.strictEqual(reGuess.type, 'ALREADY_GUESSED');

// 9. All remaining players guess -> round ends immediately
for (let i = 3; i <= 6; i++) {
  const g = room.submitGuess(`p${i}`, chosenWord.word);
  assert.strictEqual(g.type, 'CORRECT');
  if (i === 6) {
    assert.strictEqual(g.allGuessed, true, 'All guessers finished, round must end early');
    assert.strictEqual(room.status, 'ROUND_END');
  }
}
console.log('✓ All players guessed -> round automatically concluded.');

// 10. Turn advancement
const nextRes = room.nextTurn();
assert.strictEqual(room.status, 'CHOOSING');
assert.strictEqual(room.getDrawer().id, 'p2', 'Next drawer must be p2');
console.log('✓ Turn successfully passed to next drawer (p2).');

console.log('🎉 All GameRoom logic tests passed successfully!');
