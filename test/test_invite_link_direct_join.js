const assert = require('assert');
const WordBank = require('../js/words.js');

console.log('--- Testing Invite Link Auto-Join & Physical Dictionary Integrity ---');

// 1. Verify Persian & English digits conversion for room codes in URLs
function toEnglishDigits(str) {
  if (!str) return '';
  return String(str)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧۸۹'.indexOf(d));
}

const rawPersianRoom = '۴۸۲۱';
const cleanRoom = toEnglishDigits(rawPersianRoom).replace(/[^0-9]/g, '');
assert.strictEqual(cleanRoom, '4821', 'Persian room digits must convert to 4-digit standard');

// 2. Verify URL cleanup simulation
function cleanUrlSimulation(urlStr) {
  const url = new URL(urlStr);
  if (url.searchParams.has('room')) {
    url.searchParams.delete('room');
  }
  const cleanQuery = url.searchParams.toString();
  return url.pathname + (cleanQuery ? `?${cleanQuery}` : '') + (url.hash || '');
}

const testUrl = 'https://codewithkael.github.io/naghash-bashi/?room=5912#game';
const cleaned = cleanUrlSimulation(testUrl);
assert.strictEqual(cleaned, '/naghash-bashi/#game', 'room query param must be stripped on exit');

// 3. Verify WordBank physical purity
const abstractTerms = [
  'درد', 'سوزش', 'خارش', 'سکوت', 'رویا', 'کابوس', 'تب', 'لرز', 'صبح', 'ظهر', 'عصر', 'سحر', 'فلق', 'شفق', 'دویدن', 'خوابیدن'
];
const wordsSet = new Set(WordBank.WORDS.map(w => w.word));
abstractTerms.forEach(term => {
  assert.strictEqual(wordsSet.has(term), false, `Abstract term "${term}" must NOT exist in physical dictionary`);
});

// 4. Verify no glued phrases like دستگاه... or ...بزرگ
WordBank.WORDS.forEach(w => {
  assert.ok(!w.word.includes('دستگاهفرز'), 'Must not contain glued machinery compounds');
  assert.ok(!w.word.includes('کابلبرق'), 'Must not contain glued cables');
  assert.ok(!w.word.includes(' '), 'Zero spaces');
  assert.ok(!w.word.includes('\u200C'), 'Zero ZWNJ');
  assert.ok(w.word.length <= 11, `Word "${w.word}" is suspiciously long`);
});

assert.strictEqual(WordBank.WORDS.length, 2400, 'Word bank must have exactly 2400 curated words');

console.log('✅ Invite link auto-join & physical dictionary verification passed 100%!');
