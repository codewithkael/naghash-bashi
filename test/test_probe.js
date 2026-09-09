const p = require('../js/profanity.js');

const probeCases = [
  // Compound words / prefixes / suffixes in Finglish
  { input: 'alikir', expectBad: true },
  { input: 'kirbazi', expectBad: true },
  { input: 'kiri', expectBad: true },
  { input: 'sagkoon', expectBad: true },
  { input: 'koonkesh', expectBad: true },
  { input: 'koskesh', expectBad: true },
  { input: 'mamadkos', expectBad: true },
  { input: 'sarakeer', expectBad: true },
  { input: 'keeri', expectBad: true },
  { input: 'kosam', expectBad: true },
  { input: 'kiret', expectBad: true },
  { input: 'koonam', expectBad: true },
  { input: 'kirtoos', expectBad: true },
  { input: 'dokhtarejende', expectBad: true },
  { input: 'jendeha', expectBad: true },
  { input: 'kharkoseha', expectBad: true },
  { input: 'lashikhan', expectBad: true },
  
  // Leetspeak / Numbers / Obfuscation
  { input: 'k!r', expectBad: true },
  { input: 'k1r', expectBad: true },
  { input: 'k!rr', expectBad: true },
  { input: 'k1rr', expectBad: true },
  { input: 'k00n', expectBad: true },
  { input: 'k00ni', expectBad: true },
  { input: 'k0s', expectBad: true },
  { input: 'k0ss', expectBad: true },
  { input: 'cunt', expectBad: true },
  { input: 'b1tch', expectBad: true },
  { input: 'f.u.c.k', expectBad: true },
  { input: 'f_u_c_k', expectBad: true },
  { input: 'sh!t', expectBad: true },
  { input: 'd!ck', expectBad: true },
  { input: 'p*ssy', expectBad: true },
  { input: 'pu$$y', expectBad: true },
  { input: 'a$$hole', expectBad: true },
  { input: 'a55hole', expectBad: true },

  // Cyrillic homoglyphs / Unicode substitution
  { input: 'kіr', expectBad: true }, // Cyrillic і (U+0456)
  { input: 'kооn', expectBad: true }, // Cyrillic о (U+043E)
  { input: 'kоs', expectBad: true }, // Cyrillic о
  { input: 'fսck', expectBad: true }, // Armenian ս (U+057D)
  { input: 'fuсk', expectBad: true }, // Cyrillic с (U+0441)
  { input: 'fսсk', expectBad: true },

  // Spaced / punctuation variations in Persian
  { input: 'ک ی ر', expectBad: true },
  { input: 'ک.ی.ر', expectBad: true },
  { input: 'ک_ی_ر', expectBad: true },
  { input: 'کـیـر', expectBad: true }, // Tatweel / Kashida (U+0640)
  { input: 'کــص', expectBad: true },
  { input: 'کـــــون', expectBad: true },
  { input: 'ک یـ ر', expectBad: true },
  { input: 'ک  ی  ر', expectBad: true },
  { input: 'ک\u200Cی\u200Cر', expectBad: true }, // ZWNJ
  { input: 'ک\u200Dی\u200Dر', expectBad: true }, // ZWJ
  { input: 'ک‌یر', expectBad: true }, // ZWNJ in Persian word
  { input: 'کـص', expectBad: true },
  { input: 'کـس', expectBad: true },
  { input: 'کــون', expectBad: true },
  { input: 'کصکش', expectBad: true },
  { input: 'کص کش', expectBad: true },
  { input: 'کص_کش', expectBad: true },
  { input: 'کص-کش', expectBad: true },
  { input: 'خارکصه', expectBad: true },
  { input: 'خار کصه', expectBad: true },
  { input: 'خوارکصه', expectBad: true },
  { input: 'خوار کصه', expectBad: true },
  { input: 'جنده', expectBad: true },
  { input: 'ج ن د ه', expectBad: true },
  { input: 'جـنـده', expectBad: true },
  { input: 'جِندِه', expectBad: true }, // E'rab / Harakat
  { input: 'کِیر', expectBad: true },
  { input: 'کُس', expectBad: true },
  { input: 'کُونَ', expectBad: true },
  { input: 'دَیّوث', expectBad: true },
  { input: 'لٰاشی', expectBad: true },

  // Arabic vs Persian letters
  { input: 'كير', expectBad: true }, // Arabic kaf (U+0643)
  { input: 'كص', expectBad: true },
  { input: 'كوس', expectBad: true },
  { input: 'كون', expectBad: true },
  { input: 'دیوث', expectBad: true },
  { input: 'ديوث', expectBad: true }, // Arabic Yeh (U+064A)
  { input: 'جندة', expectBad: true }, // Teh Marbuta (U+0629)

  // Substrings / compounds in Persian
  { input: 'علیکیر', expectBad: true },
  { input: 'ساراکص', expectBad: true },
  { input: 'کیرکلفت', expectBad: true },
  { input: 'کونگشاد', expectBad: true },
  { input: 'کون‌گشاد', expectBad: true },
  { input: 'کس‌کش', expectBad: true },
  { input: 'کسکش', expectBad: true },
  { input: 'کصکش', expectBad: true },
  { input: 'کصلیس', expectBad: true },
  { input: 'کسلیس', expectBad: true },
  { input: 'کیرم', expectBad: true },
  { input: 'کیرت', expectBad: true },
  { input: 'کیرش', expectBad: true },
  { input: 'کیرتون', expectBad: true },
  { input: 'کیرمون', expectBad: true },
  { input: 'کیرشون', expectBad: true },
  { input: 'کیرخر', expectBad: true },
  { input: 'کونخر', expectBad: true },

  // Clean Persian & English names that MUST be ACCEPTED
  { input: 'کسری', expectBad: false },
  { input: 'کسری محمدی', expectBad: false },
  { input: 'شکست‌ناپذیر', expectBad: false },
  { input: 'عکس‌ساز', expectBad: false },
  { input: 'نرگس محمدی', expectBad: false },
  { input: 'سیروس پورمند', expectBad: false },
  { input: 'کامیار شایان', expectBad: false },
  { input: 'کیارش آریا', expectBad: false },
  { input: 'کوشا بهزاد', expectBad: false },
  { input: 'سکینه نوری', expectBad: false },
  { input: 'مسکونی تهران', expectBad: false },
  { input: 'تاکنون راد', expectBad: false },
  { input: 'اکنون فردا', expectBad: false },
  { input: 'کانون بهسازان', expectBad: false }
];

console.log('--- Probing Profanity Filter Weaknesses ---');
let bugsFound = 0;
for (const tc of probeCases) {
  const res = p.validateName(tc.input);
  const isBad = !res.isValid;
  if (isBad !== tc.expectBad) {
    bugsFound++;
    console.log(`❌ BUG FOUND: "${tc.input}" | Expected Bad: ${tc.expectBad} | Actual Bad: ${isBad} | Reason: ${res.reason || 'None'}`);
  }
}
console.log(`Total bugs found: ${bugsFound} / ${probeCases.length}`);
