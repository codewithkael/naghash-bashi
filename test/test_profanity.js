const assert = require('assert');
const { validateName } = require('../js/profanity.js');

console.log('--- Testing Profanity & Name Filter ---');

// Test Cases that MUST be REJECTED (Invalid)
const badNames = [
  // Persian
  'کیر',
  'کص',
  'کس',
  'کون',
  'جنده',
  'خارکصه',
  'مادرجنده',
  'لاشی',
  'دیوث',
  'کسکش',
  'کونی',
  // Spaced / Punctuation in Persian
  'ک ی ر',
  'ک.ی.ر',
  'ک-و-ن',
  'ک ص',
  'ج ن د ه',
  // Finglish
  'kir',
  'keer',
  'kyr',
  'kos',
  'koss',
  'koon',
  'kooon',
  'kuni',
  'jende',
  'jendeh',
  'lashi',
  'dayoos',
  'kharkose',
  // Finglish with Leetspeak & Punctuation
  'k1r',
  'k00n',
  'k.o.o.n',
  'k-i-r',
  'k_o_s',
  'k!r',
  // English
  'fuck',
  'fucker',
  'shit',
  'bitch',
  'dick',
  'pussy',
  'asshole',
  'f u c k',
  'f.u.c.k',
  'b!tch'
];

let failedBadTests = 0;
for (const name of badNames) {
  const result = validateName(name);
  if (result.isValid) {
    console.error(`❌ FAILED: "${name}" should have been REJECTED, but passed!`);
    failedBadTests++;
  } else {
    console.log(`✅ Correctly rejected: "${name}" (${result.reason})`);
  }
}

// Test Cases that MUST be ACCEPTED (Valid Clean Names)
const goodNames = [
  'علی رضایی',
  'سارا احمدی',
  'مهرداد کمالی',
  'بهسازان ملت',
  'کیارش راد',
  'کسری محمدی',
  'کامیار',
  'Nima',
  'Ali Reza',
  'Sara_Dev',
  'Pouya Tech',
  'Mellat User'
];

let failedGoodTests = 0;
for (const name of goodNames) {
  const result = validateName(name);
  if (!result.isValid) {
    console.error(`❌ FAILED: "${name}" should have PASSED, but was rejected! (${result.reason})`);
    failedGoodTests++;
  } else {
    console.log(`✅ Correctly accepted: "${name}"`);
  }
}

console.log(`\nSummary:`);
console.log(`Bad names tested: ${badNames.length} (Failures: ${failedBadTests})`);
console.log(`Good names tested: ${goodNames.length} (Failures: ${failedGoodTests})`);

if (failedBadTests > 0 || failedGoodTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 All profanity tests passed successfully!');
}
