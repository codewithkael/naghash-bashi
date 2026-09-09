/**
 * Behsazan 256 - Profanity & Inappropriate Name Filter
 * Supports: Persian (فارسی), English, and Finglish (فینگلیش)
 * Handles: Leetspeak, Unicode homoglyphs (Cyrillic/Greek/Armenian), Tatweel/Kashida (ـ),
 *          Harakat/diacritics, obfuscation, character repeats, punctuation, and spaced/compound bypasses.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ProfanityFilter = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // Non-Persian character or start/end acts as Persian boundary
  const PB = '(?:^|[^\\u0600-\\u06FF])';
  const PE = '(?:$|[^\\u0600-\\u06FF])';

  // Direct Persian patterns
  const PERSIAN_PATTERNS = [
    // کیر and any compound or variant (کیر، کیرم، کیرت، کیرش، کیری، کیرخر، علیکیر، کیرباز، ...)
    /ک[یيئ]+ر(?:[یي]|م|ت|ش|ها|خر|کلفت|باز)?/,
    // کص is ALWAYS 100% vulgar in Persian (no clean Persian word contains کص)
    /ک[ص]+/,
    // کون and compounds, EXCLUDING legitimate Arabic root words: مسکونی, مسکون, سکونت
    // Lookbehind alternative: check if preceded by 'س' (like مسکونی) or match explicit vulgar forms
    new RegExp(`${PB}ک[وۆ]+ن(?:[یي]|ده|کش|م|ت|ش|خر|گشاد|یا|سفید|دماغ)?`),
    /(?:علی|رضا|محمد|سارا|مریم|خر|سگ|تخم)ک[وۆ]+ن/,
    // کس with vulgar suffix/boundary, excluding valid words like کسری, شکست, کرکس, نرگس, کسب, کسالت, عکس, اکنون
    new RegExp(`${PB}کس(?:[یي]|م|ت|ش|کش|لیس|خل|خول|شعر|ده|پاره|تنگ|طلا|ننه|مادر|خر)?${PE}`),
    // کوس (vulgar slang for کس), excluding کوسه (shark), کوسن (cushion)
    new RegExp(`${PB}ک[وۆ]+س(?:[یي]|م|ت|ش|کش|لیس|خل|خول|شعر|ده)?${PE}`),
    // جنده and compounds (جنده، مادرجنده، دخترجنده، خواهرجنده)
    /ج[نند]{1,2}[دذ][هة]/,
    // خارکصه / خارکسده / خواهرکصه / خوارکصه
    /(?:خار|خواهر|خوار)\s*ک[صس]/,
    // مادرجنده / مادرقهوه / مادربه‌خطا / مادرقحبه
    /مادر\s*(?:ج[نند]|ق[حھ]ب|خراب|قهوه)/,
    // لاشی and compounds
    /لا[شس][یي]/,
    // دیوث / دیوس / دایوث
    /د[ا]?[یي][وۆ][ثس]/,
    // قحبه
    /ق[حھ][بپ][هة]/,
    // کسکش / کصکش
    /ک[صس]ک[شس]/,
    // کصلیس / کسلیس
    /ک[صس]لیس/,
    // سکس (except when part of harmless transliteration)
    new RegExp(`${PB}س[کك][سث]${PE}`),
    // پورن
    /پ[وۆ]رن/,
    // ممه
    new RegExp(`${PB}م[م]+[هة]${PE}`),
    // بی ناموس / بیناموس
    /بی\s*ناموس/
  ];

  // English bad words
  const ENGLISH_EXACT_WORDS = [
    'fuck', 'fucker', 'fucking', 'motherfucker', 'shit', 'bullshit',
    'bitch', 'bitches', 'dick', 'pussy', 'cunt', 'asshole', 'bastard',
    'whore', 'slut', 'cock', 'boobs', 'penis', 'vagina', 'nude', 'porn',
    'sex', 'nigger', 'nigga', 'fag', 'faggot'
  ];

  // English wildcard / asterisk obfuscation patterns (e.g. f*ck, sh*t, p*ssy, b*tch)
  const ENGLISH_WILDCARD_PATTERNS = [
    /\bf+[\*u]+c+k+[a-z]*\b/i,
    /\bs+h+[\*i!1]+t+[a-z]*\b/i,
    /\bb+[\*i!1]+t+c+h+[a-z]*\b/i,
    /\bd+[\*i!1]+c+k+[a-z]*\b/i,
    /\bp+[\*u]+s+s+y+\b/i,
    /\bp+u+[\$s]{2,}[ye]*\b/i,
    /\bc+[\*u]+n+t+[a-z]*\b/i,
    /\ba+[\*s\$5]{2,}h+o+l+e+\b/i
  ];

  // Finglish regexes (phonetic transliterations and compounds)
  const FINGLISH_PATTERNS = [
    // kir, keer, kyr, k1r, k!r and compounds (alikir, sarakeer, kirekhar, kirtoos, etc.)
    // Differentiates from kiarash (ia), kian (no r), karim (ar), kamran (am)
    /k+[eiy!|1]+r+(?:i|e|am|et|esh|o|ha|bazi|khar|toos|koloft)?\b/,
    /(?:ali|reza|mamad|sara|pesar|dokhtar|sag|khar)k+[eiy!|1]+r+/,
    
    // koon, kuni, k00n and compounds (sagkoon, alikoon, koonkesh, etc.)
    /k+[o0u]{2,}n+(?:i|e|am|et|esh|kesh|khar|goshad|bazi|de|deh)?\b/,
    /k+[u]n+i+\b/,
    /(?:ali|reza|mamad|sara|pesar|dokhtar|sag|khar)k+[o0u]{2,}n+/,
    
    // kos, koss, k0s, koos, kus, kharkos and compounds (alikos, mamadkos, koskesh)
    // Excludes koosha / kousha (contains sh)
    /k+[o0u]+s+(?!h[^e]|tas)(?:i|e|am|et|esh|kesh|khol|khesh|lis|baz|ha|bazi)?\b/,
    /k+[o0u]{1,2}s{2,}/,
    /(?:ali|reza|mamad|sara|dokhtar|khahar|pesar)k+[o0u]+s+/,
    
    // jende, jendeh, jande, dokhtarejende, jendeha
    /j+[ea3]+n+d+[e3]+h*/,
    
    // lashi, lashikhan, lashibazi
    /l+[a4]+s+h+[iy]+/,
    
    // dayoos, dayus
    /d+[a4]+y+[o0u]+s+/,
    
    // kharkos, kharkose
    /k+h+[a4]+r+k+[o0u]+s+/,
    
    // koskesh
    /k+[o0u]+s+k+[e3]+s+h+/,
    
    // sex, sexy, porno
    /\bs+e+x+y*\b/,
    /\bp+o+r+n+o*\b/
  ];

  // Leetspeak substitution map for Latin characters
  const LEET_MAP = {
    '0': 'o',
    '1': 'i',
    '!': 'i',
    '|': 'i',
    '3': 'e',
    '4': 'a',
    '@': 'a',
    '5': 's',
    '$': 's',
    '7': 't',
    '8': 'b',
    '9': 'g',
    'v': 'u'
  };

  // Unicode visual homoglyphs map (Cyrillic, Greek, Armenian to Latin)
  const HOMOGLYPHS = {
    // Cyrillic
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
    // Armenian
    '\u057D': 'u',
    '\u0585': 'o',
    // Greek
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

  /**
   * Normalize text by mapping homoglyphs, stripping diacritics/kashida,
   * unifying Persian/Arabic characters, and removing invisible zero-width chars.
   */
  function normalizeText(text) {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text.trim().toLowerCase();

    // 1. Fullwidth Latin characters (e.g. ｆｕｃｋ)
    cleaned = cleaned.replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));

    // 2. Unicode Homoglyphs (Cyrillic/Greek/Armenian)
    cleaned = cleaned.replace(/[\u0400-\u04FF\u0530-\u058F\u0370-\u03FF]/g, ch => HOMOGLYPHS[ch] || ch);

    // 3. NFKD decomposition to strip Latin diacritics (e.g. é -> e)
    cleaned = cleaned.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

    // 4. Strip Persian & Arabic zero-width, formatting, Tatweel/Kashida (ـ), and Harakat/Diacritics
    cleaned = cleaned
      .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '') // Zero width & directional marks
      .replace(/\u0640/g, '') // Tatweel / Kashida (ـ)
      .replace(/[\u064B-\u065F\u0670]/g, ''); // Arabic Harakat (Fatha, Damma, Kasra, Shadda, Tanween, etc.)

    // 5. Unify Persian / Arabic letter variants
    cleaned = cleaned
      .replace(/[يى]/g, 'ی')
      .replace(/[ك]/g, 'ک')
      .replace(/[ة]/g, 'ه')
      .replace(/[ؤ]/g, 'و')
      .replace(/[إأآٱ]/g, 'ا')
      .replace(/[ئ]/g, 'ی');

    return cleaned;
  }

  /**
   * Convert leetspeak characters in Latin string
   */
  function deLeet(str) {
    return str.split('').map(ch => LEET_MAP[ch] || ch).join('');
  }

  /**
   * Remove repeated consecutive characters: "kooooon" -> "koon", "kiiir" -> "kir"
   */
  function collapseRepeats(str) {
    return str.replace(/(.)\1{2,}/g, '$1$1');
  }

  /**
   * Check if a given string contains prohibited profane words
   * @param {string} input - The name or text to validate
   * @returns {{isValid: boolean, matchedWord?: string, reason?: string}}
   */
  function validateName(input) {
    if (!input || typeof input !== 'string') {
      return { isValid: false, reason: 'نام نمی‌تواند خالی باشد.' };
    }

    const trimmed = input.trim();
    if (trimmed.length < 2) {
      return { isValid: false, reason: 'نام باید حداقل ۲ کاراکتر باشد.' };
    }
    if (trimmed.length > 25) {
      return { isValid: false, reason: 'نام نباید بیشتر از ۲۵ کاراکتر باشد.' };
    }

    const normalized = normalizeText(trimmed);

    // 1. Direct Persian check
    for (const pattern of PERSIAN_PATTERNS) {
      if (pattern.test(normalized)) {
        return {
          isValid: false,
          matchedWord: 'واژه نامناسب فارسی',
          reason: 'لطفاً یک نام شایسته برای پرسنل متعهد بهسازان ملت انتخاب کنید! 😉 (واژه نامناسب شناسایی شد)'
        };
      }
    }

    // Direct check for 'کون' unless it's part of clean root 'مسکونی' / 'سکونت'
    if (/ک[وۆ]+ن/.test(normalized)) {
      // Check if it's solely legitimate words (مسکونی، سکونت، مسکون)
      const sanitized = normalized.replace(/(?:م)?سکون(?:ی|ت)?/g, '');
      if (/ک[وۆ]+ن/.test(sanitized)) {
        return {
          isValid: false,
          matchedWord: 'واژه نامناسب فارسی',
          reason: 'نام وارد شده غیرمجاز است.'
        };
      }
    }

    // 2. Persian check without non-Persian punctuation, dashes, or whitespace (e.g. "ک.ی.ر" or "ک ی ر")
    const persianOnlyChars = normalized.replace(/[^\u0600-\u06FF]/g, '');
    const collapsedPersian = collapseRepeats(persianOnlyChars);
    
    // Check specific vulgar roots that should never be formed by spacing or punctuation
    const spacedVulgarPersianRoots = [
      /ک[یيئ]ر/,
      /ک[ص]/,
      /ج[نند]{1,2}[دذ][هة]/,
      /لا[شس][یي]/,
      /د[ا]?[یي][وۆ][ثس]/,
      /ق[حھ][بپ][هة]/,
      /خارک[صس]/,
      /ک[صس]ک[شس]/,
      /ک[صس]لیس/
    ];
    for (const p of spacedVulgarPersianRoots) {
      if (p.test(persianOnlyChars) || p.test(collapsedPersian)) {
        return {
          isValid: false,
          matchedWord: 'واژه نامناسب فارسی',
          reason: 'لطفاً از به کار بردن واژه‌های نامناسب با فاصله یا کاراکترهای جداکننده خودداری کنید.'
        };
      }
    }

    // Spaced 'کون' check (unless part of مسکونی/سکونت)
    if (/ک[وۆ]+ن/.test(persianOnlyChars) || /ک[وۆ]+ن/.test(collapsedPersian)) {
      const sanitized = persianOnlyChars.replace(/(?:م)?سکون(?:ی|ت)?/g, '');
      if (/ک[وۆ]+ن/.test(sanitized)) {
        return {
          isValid: false,
          matchedWord: 'واژه نامناسب فارسی',
          reason: 'نام وارد شده غیرمجاز است.'
        };
      }
    }

    // 3. English Wildcard patterns (e.g. "f*ck", "p*ssy", "b*tch", "sh*t")
    for (const wp of ENGLISH_WILDCARD_PATTERNS) {
      if (wp.test(normalized) || wp.test(trimmed)) {
        return {
          isValid: false,
          matchedWord: 'واژه نامناسب انگلیسی',
          reason: 'استفاده از واژه‌های نامناسب انگلیسی مجاز نیست.'
        };
      }
    }

    // 4. English & Finglish token check
    const rawTokens = normalized.split(/[\s_\-.,!?+*#/\\~`|()\[\]{}]+/);
    
    for (const token of rawTokens) {
      if (!token) continue;
      const deLeetedToken = collapseRepeats(deLeet(token.replace(/[^a-z0-9!@$|]/g, '')));
      
      // Check English exact tokens
      if (ENGLISH_EXACT_WORDS.includes(deLeetedToken)) {
        return {
          isValid: false,
          matchedWord: token,
          reason: 'استفاده از واژه‌های نامناسب انگلیسی مجاز نیست.'
        };
      }

      // Check Finglish regex tokens
      for (const fp of FINGLISH_PATTERNS) {
        if (fp.test(deLeetedToken) || fp.test(token)) {
          return {
            isValid: false,
            matchedWord: token,
            reason: 'نام انتخابی حاوی واژه فینگلیش نامناسب است.'
          };
        }
      }
    }

    // 5. English & Finglish dense/spaced check (e.g. "f.u.c.k", "k 1 r", "k.o.o.n", "k-i-r", "kіr")
    const latinOnly = normalized.replace(/[^a-z0-9!@$|]/g, '');
    const deLeetedDense = deLeet(latinOnly);
    const collapsedDense = collapseRepeats(deLeetedDense);

    for (const fp of FINGLISH_PATTERNS) {
      if (fp.test(deLeetedDense) || fp.test(collapsedDense) || fp.test(latinOnly)) {
        return {
          isValid: false,
          matchedWord: 'واژه نامناسب فینگلیش',
          reason: 'لطفاً یک نام شایسته و محترمانه انتخاب کنید.'
        };
      }
    }

    for (const bad of ENGLISH_EXACT_WORDS) {
      if (bad.length <= 3) {
        if (deLeetedDense === bad || collapsedDense === bad) {
          return {
            isValid: false,
            matchedWord: bad,
            reason: 'استفاده از واژه‌های نامناسب انگلیسی مجاز نیست.'
          };
        }
      } else {
        if (deLeetedDense.includes(bad) || collapsedDense.includes(bad)) {
          return {
            isValid: false,
            matchedWord: bad,
            reason: 'استفاده از واژه‌های نامناسب انگلیسی مجاز نیست.'
          };
        }
      }
    }

    // All checks passed!
    return { isValid: true };
  }

  return {
    validateName,
    normalizeText,
    deLeet,
    collapseRepeats,
    HOMOGLYPHS
  };
});
