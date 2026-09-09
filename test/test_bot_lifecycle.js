const assert = require('assert');
const { BotPlayer, getAvailableBotProfile } = require('../js/bot.js');

console.log('--- Testing Bot Player Lifecycle & Clean Cancellation ---');

// 1. Create bot
const profile = getAvailableBotProfile(['سهراب نقاشباشی']);
assert.ok(profile.name !== 'سهراب نقاشباشی', 'Must avoid duplicate names');
const bot = new BotPlayer('bot_1', profile);
assert.strictEqual(bot.isCancelled, false);
console.log('✓ Bot profile selected and initialized:', profile.name);

// 2. Start drawing
let drawnActions = [];
bot.startDrawing(null, (action) => {
  drawnActions.push(action);
});
assert.ok(bot.drawInterval !== null, 'Draw interval must be active');
assert.strictEqual(bot.isCancelled, false);

// 3. Schedule guess
let guessFired = false;
bot.scheduleGuess('سیب', (id, word) => {
  guessFired = true;
});
assert.ok(bot.guessTimeout !== null, 'Guess timeout must be active');

// 4. Cancel actions (e.g. on round end or turn advance)
bot.cancelActions();
assert.strictEqual(bot.drawInterval, null, 'Draw interval must be cleared');
assert.strictEqual(bot.guessTimeout, null, 'Guess timeout must be cleared');
assert.strictEqual(bot.isCancelled, true, 'isCancelled flag must be true');
console.log('✓ Bot actions successfully cancelled without memory or interval leaks.');

console.log('🎉 All Bot Lifecycle tests passed successfully!');
