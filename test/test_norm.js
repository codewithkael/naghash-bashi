const HOMOGLYPHS = {
  '\u0430': 'a', '\u0410': 'a',
  '\u0435': 'e', '\u0415': 'e',
  '\u0451': 'e', '\u0401': 'e',
  '\u043E': 'o', '\u041E': 'o',
  '\u0440': 'p', '\u0420': 'p',
  '\u0441': 'c', '\u0421': 'c',
  '\u0443': 'y', '\u0423': 'y',
  '\u0445': 'x', '\u0425': 'x',
  '\u0456': 'i', '\u0406': 'i',
  '\u0458': 'j', '\u0408': 'j',
  '\u0455': 's', '\u0405': 's',
  '\u0432': 'b', '\u0412': 'b',
  '\u043A': 'k', '\u041A': 'k',
  '\u043D': 'h', '\u041D': 'h',
  '\u0442': 't', '\u0422': 't',
  '\u044C': 'b',
  '\u057D': 'u',
  '\u0585': 'o',
  '\u03B1': 'a', '\u0391': 'a',
  '\u03B2': 'b', '\u0392': 'b',
  '\u03B5': 'e', '\u0395': 'e',
  '\u03B9': 'i', '\u0399': 'i',
  '\u03BA': 'k', '\u039A': 'k',
  '\u03BF': 'o', '\u039F': 'o',
  '\u03C1': 'p', '\u03A1': 'p',
  '\u03C5': 'u', '\u03A5': 'u',
  '\u03C7': 'x', '\u03A7': 'x'
};

function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim().toLowerCase();

  // Convert fullwidth Latin characters
  cleaned = cleaned.replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));

  // Convert Unicode Homoglyphs
  cleaned = cleaned.replace(/[\u0400-\u04FF\u0530-\u058F\u0370-\u03FF]/g, ch => HOMOGLYPHS[ch] || ch);

  // NFKD decomposition (strips Latin accents: é -> e, etc.)
  cleaned = cleaned.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  // Strip Persian & Arabic invisible characters and Tatweel/Kashida (ـ)
  cleaned = cleaned
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '') // Zero width & directional formatting
    .replace(/\u0640/g, '') // Tatweel / Kashida (ـ)
    .replace(/[\u064B-\u065F\u0670]/g, ''); // Arabic Harakat / Diacritics (Fatha, Damma, Kasra, Tanween, Shadda, Sukun, Dagger Alef)

  // Unify Persian / Arabic characters
  cleaned = cleaned
    .replace(/[يى]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[ة]/g, 'ه')
    .replace(/[ؤ]/g, 'و')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/[ئ]/g, 'ی');

  return cleaned;
}

console.log('Testing normalization...');
console.log('کـیـر =>', normalizeText('کـیـر'));
console.log('کِیر =>', normalizeText('کِیر'));
console.log('دَیّوث =>', normalizeText('دَیّوث'));
console.log('kіr (Cyrillic і) =>', normalizeText('kіr'));
console.log('fuсk (Cyrillic с) =>', normalizeText('fuсk'));
console.log('fսck (Armenian ս) =>', normalizeText('fսck'));
