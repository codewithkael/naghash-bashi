const assert = require('assert');
const { GameRoom, MAX_PLAYERS } = require('../js/room_logic.js');

console.log('--- Running 6-Player Full Match Simulation Test ---');

// 1. Setup Room with 6 players
const room = new GameRoom('NB-777', { id: 'host', name: 'استاد نقاشی', avatar: '🎨' }, { totalRounds: 2 });

const guests = [
  { id: 'p2', name: 'سارا', avatar: '🐱' },
  { id: 'p3', name: 'رضا', avatar: '🦁' },
  { id: 'p4', name: 'مریم', avatar: '🚀' },
  { id: 'p5', name: 'امید', avatar: '☕' },
  { id: 'p6', name: 'نیما', avatar: '🤖' }
];

guests.forEach(g => {
  const res = room.addPlayer(g);
  assert.strictEqual(res.success, true);
});

assert.strictEqual(room.players.length, 6);
console.log('✓ Successfully populated 6 players in room.');

// 2. Start Game
const startRes = room.startGame();
assert.strictEqual(startRes.success, true);
assert.strictEqual(room.currentRound, 1);

// 3. Simulate all turns across 2 rounds (total 12 turns)
const totalTurns = 2 * 6;
let turnCount = 0;

while (room.status !== 'GAME_OVER') {
  turnCount++;
  assert.strictEqual(room.status, 'CHOOSING');

  const drawer = room.getDrawer();
  assert.ok(drawer, 'Drawer must exist');
  assert.strictEqual(room.wordChoices.length, 3);

  // Drawer chooses 2nd word
  const chosenWord = room.wordChoices[1];
  room.selectWord(chosenWord);
  assert.strictEqual(room.status, 'DRAWING');

  // Guessers guess at different times
  const guessers = room.players.filter(p => p.id !== drawer.id);

  // 1 guesser makes wrong guess
  const wrongRes = room.submitGuess(guessers[0].id, 'کلمه نامربوط');
  assert.strictEqual(wrongRes.type, 'CHAT');

  // Fast timer ticks
  for (let s = 0; s < 10; s++) {
    room.tick();
  }

  // All 5 guessers guess correctly
  guessers.forEach((g, idx) => {
    // Tick a little for each guesser to vary scores
    room.tick();
    const gRes = room.submitGuess(g.id, chosenWord.word);
    assert.strictEqual(gRes.type, 'CORRECT');
    assert.ok(gRes.points > 0);
  });

  assert.strictEqual(room.status, 'ROUND_END');

  // Advance turn
  const nextRes = room.nextTurn();
  if (nextRes.status === 'GAME_OVER') {
    break;
  }
}

assert.strictEqual(turnCount, totalTurns, `Should have completed exactly ${totalTurns} turns`);
assert.strictEqual(room.status, 'GAME_OVER');
console.log(`✓ Completed full match of ${totalTurns} turns seamlessly.`);

// 4. Verify Podium and Leaderboard
const podium = room.getPodium();
assert.ok(podium.first, 'Must have 1st place');
assert.ok(podium.second, 'Must have 2nd place');
assert.ok(podium.third, 'Must have 3rd place');
assert.strictEqual(podium.all.length, 6, 'Must rank all 6 players');

assert.ok(podium.first.score >= podium.second.score, '1st score must be >= 2nd score');
assert.ok(podium.second.score >= podium.third.score, '2nd score must be >= 3rd score');

console.log('🏆 Final Podium:');
console.log(`  🥇 1st: ${podium.first.avatar} ${podium.first.name} - ${podium.first.score} pts`);
console.log(`  🥈 2nd: ${podium.second.avatar} ${podium.second.name} - ${podium.second.score} pts`);
console.log(`  🥉 3rd: ${podium.third.avatar} ${podium.third.name} - ${podium.third.score} pts`);

console.log('🎉 6-Player Full Match Simulation Test PASSED completely!');
