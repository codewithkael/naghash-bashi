const assert = require('assert');
const WordBank = require('../js/words.js');

console.log('--- Testing WordBank Module ---');

// 1. Check count
console.log(`Total words loaded: ${WordBank.WORDS.length}`);
assert.ok(WordBank.WORDS.length >= 180, 'Must have at least 180 Persian words');

// 2. Check difficulty distribution
const easy = WordBank.WORDS.filter(w => w.difficulty === 'easy');
const medium = WordBank.WORDS.filter(w => w.difficulty === 'medium');
const hard = WordBank.WORDS.filter(w => w.difficulty === 'hard');
console.log(`Easy: ${easy.length}, Medium: ${medium.length}, Hard: ${hard.length}`);
assert.ok(easy.length > 20, 'Easy word pool too small');
assert.ok(medium.length > 20, 'Medium word pool too small');
assert.ok(hard.length > 20, 'Hard word pool too small');

// 3. Test Persian Normalization
assert.strictEqual(WordBank.normalizePersian('كتاب'), 'کتاب', 'Arabic kaf should convert to Persian');
assert.strictEqual(WordBank.normalizePersian('چاي'), 'چای', 'Arabic yeh should convert to Persian');
assert.strictEqual(WordBank.normalizePersian('برنامه‌نویس'), 'برنامه نویس', 'ZWNJ should normalize cleanly');
assert.strictEqual(WordBank.normalizePersian('سَلامٌ'), 'سلام', 'Diacritics/tashkeel should be removed');
assert.strictEqual(WordBank.normalizePersian('پـیـتـزا'), 'پیتزا', 'Tatweel should be removed');

// 4. Test Check Guess
let res = WordBank.checkGuess('سیب', 'سیب');
assert.strictEqual(res.isCorrect, true);

res = WordBank.checkGuess('برنامه نویس', 'برنامه‌نویس');
assert.strictEqual(res.isCorrect, true);

res = WordBank.checkGuess('برنامهنویس', 'برنامه‌نویس');
assert.strictEqual(res.isCorrect, true);

res = WordBank.checkGuess('هندوانه', 'هندونه'); // Levenshtein dist
assert.strictEqual(res.isClose, true, 'هندوانه vs هندونه should be close');

res = WordBank.checkGuess('هواپیما', 'قایق');
assert.strictEqual(res.isCorrect, false);
assert.strictEqual(res.isClose, false);

// 5. Test Masked Display
const masked1 = WordBank.getMaskedDisplay('سیب');
assert.strictEqual(masked1, '_ _ _');

const masked2 = WordBank.getMaskedDisplay('سیب', new Set([0]));
assert.strictEqual(masked2, 'س _ _');

const choices = WordBank.pickWordChoices();
assert.strictEqual(choices.length, 3);
const unique = new Set(choices.map(c => c.word));
assert.strictEqual(unique.size, 3, 'Choices must be 3 distinct words');
assert.strictEqual(choices[0].difficulty, 'easy', 'First choice must be easy');
assert.strictEqual(choices[1].difficulty, 'medium', 'Second choice must be medium');
assert.strictEqual(choices[2].difficulty, 'hard', 'Third choice must be hard');

console.log('✅ WordBank tests passed successfully!');
