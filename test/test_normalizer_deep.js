const assert = require('assert');
const WordBank = require('../js/words.js');

console.log('--- Running Deep Persian Normalization & Guess Evaluation Tests ---');

// 1. Arabic & Persian letter unification
const pairs = [
  ['كتاب', 'کتاب'],             // Arabic Kaf
  ['چاي', 'چای'],               // Arabic Yeh
  ['پنجرهٔ', 'پنجره'],          // Hamza above Heh
  ['قورمه‌سبزی', 'قورمه سبزی'], // ZWNJ vs Space
  ['قورمه‌سبزی', 'قورمهسبزی'],  // ZWNJ vs attached
  ['فنجان چای', 'فنجانچای'],    // Space vs attached
  ['برنامه‌نویس', 'برنامه نویس'],
  ['بستنیِ زعفرانی', 'بستنی زعفرانی'], // Kasreh Ezafe
  ['پیتزا!', 'پیتزا'],          // Punctuation
  ['«خرگوش»', 'خرگوش'],         // Quotations
  ['مـاشـیـن', 'ماشین'],         // Tatweel / Kashida
  ['آتشفشان', 'اتشفشان'],       // Alef with Madda vs plain Alef
  ['هواپيما', 'هواپیما']        // Arabic Yeh inside word
];

pairs.forEach(([guess, target]) => {
  const res = WordBank.checkGuess(guess, target);
  assert.strictEqual(
    res.isCorrect,
    true,
    `Guess "${guess}" should match target "${target}"`
  );
});
console.log(`✓ Passed ${pairs.length} Persian/Arabic keyboard variant pairs.`);

// 2. Levenshtein "Close!" guess test (dist == 1 for words of 4+ chars)
const closePairs = [
  ['هندونه', 'هندوانه'],
  ['زرافه', 'زراقه'],
  ['هواپیما', 'هواپیمل'],
  ['برنامه‌نویس', 'برنامه‌نویص']
];

closePairs.forEach(([guess, target]) => {
  const res = WordBank.checkGuess(guess, target);
  assert.strictEqual(
    res.isClose,
    true,
    `Guess "${guess}" should be marked close for target "${target}"`
  );
  assert.strictEqual(res.isCorrect, false);
});
console.log(`✓ Passed ${closePairs.length} Levenshtein close-guess tests.`);

// 3. Negative tests (distinct words must NOT match)
const nonMatchingPairs = [
  ['سیب', 'پرتقال'],
  ['گربه', 'سگ'],
  ['شیر', 'شتر'],
  ['کتاب', 'کفش']
];

nonMatchingPairs.forEach(([guess, target]) => {
  const res = WordBank.checkGuess(guess, target);
  assert.strictEqual(res.isCorrect, false, `"${guess}" must NOT match "${target}"`);
  assert.strictEqual(res.isClose, false, `"${guess}" must NOT be close to "${target}"`);
});
console.log(`✓ Passed ${nonMatchingPairs.length} distinct-word negative tests.`);

// 4. Test Hint generator
const target = 'فیل هوا کردن';
const revealed = new Set();
for (let i = 0; i < 4; i++) {
  const hintIdx = WordBank.getNextHintIndex(target, revealed);
  assert.notStrictEqual(hintIdx, null, 'Hint index should be generated');
  assert.ok(!revealed.has(hintIdx), 'Must be unrevealed character');
  assert.notStrictEqual(target[hintIdx], ' ', 'Hint must not be space');
  revealed.add(hintIdx);
}
const masked = WordBank.getMaskedDisplay(target, revealed);
console.log(`Sample masked display with 4 hints: "${masked}"`);
assert.ok(masked.includes('_'), 'Should still contain blanks');

console.log('🎉 All Deep Normalization & Guess Evaluation tests passed successfully!');
