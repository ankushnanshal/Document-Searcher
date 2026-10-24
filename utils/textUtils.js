const { synonymMap, STOP_WORDS } = require("../config/constants");

function detectLanguage(text) {
  if (!text) return 'en';
  const hindiRegex = /[\u0900-\u097F]/g;
  const hindiCount = (text.match(hindiRegex) || []).length;
  const totalChars = text.replace(/\s/g, '').length || 1;
  if (hindiCount > 0 && (hindiCount / totalChars) > 0.01) return 'hi';
  return 'en';
}

function romanizeHindi(text) {
  if (!text) return '';
  const mapping = {
    '\u0905': 'a', '\u0906': 'aa', '\u0907': 'i', '\u0908': 'ee', '\u0909': 'u', '\u090A': 'oo',
    '\u090F': 'e', '\u0910': 'ai', '\u0913': 'o', '\u0914': 'au', '\u0902': 'an', '\u0903': 'ah',
    '\u0915': 'k', '\u0916': 'kh', '\u0917': 'g', '\u0918': 'gh', '\u0919': 'ng',
    '\u091A': 'ch', '\u091B': 'chh', '\u091C': 'j', '\u091D': 'jh', '\u091E': 'ny',
    '\u091F': 't', '\u0920': 'th', '\u0921': 'd', '\u0922': 'dh', '\u0923': 'n',
    '\u0924': 't', '\u0925': 'th', '\u0926': 'd', '\u0927': 'dh', '\u0928': 'n',
    '\u092A': 'p', '\u092B': 'ph', '\u092C': 'b', '\u092D': 'bh', '\u092E': 'm',
    '\u092F': 'y', '\u0930': 'r', '\u0932': 'l', '\u0935': 'v', '\u0936': 'sh',
    '\u0937': 'sh', '\u0938': 's', '\u0939': 'h', '\u0915\u094D\u0937': 'ksh', '\u0924\u094D\u0930': 'tr',
    '\u091C\u094D\u091E': 'gya', '\u0921\u093C': 'd', '\u0922\u093C': 'dh',
    '\u093E': 'a', '\u093F': 'i', '\u0940': 'ee', '\u0941': 'u', '\u0942': 'oo',
    '\u0947': 'e', '\u0948': 'ai', '\u094B': 'o', '\u094C': 'au', '\u0902': 'n',
    '\u0903': 'h', '\u094D': ''
  };
  let result = '';
  let i = 0;
  while (i < text.length) {
    let char = text[i];
    let nextChar = i + 1 < text.length ? text[i + 1] : '';
    let twoChar = char + nextChar;
    if (mapping[twoChar] !== undefined) {
      result += mapping[twoChar];
      i += 2;
    } else if (mapping[char] !== undefined) {
      result += mapping[char];
      i++;
    } else {
      result += char;
      i++;
    }
  }
  return result;
}

function normalizeText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').replace(/[^a-zA-Z0-9\s\-\.\u0900-\u097F]/g, ' ').trim();
}

function getUniqueWords(text) {
  if (!text) return [];
  const words = text.split(/\s+/).filter(word => word.length > 1);
  const unique = [];
  const seen = new Set();
  for (const word of words) {
    const normalized = word.toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(word);
    }
  }
  return unique;
}

function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase().split(/[\s,.\-_\'\"()\[\]{}:;!?@#$%^&*+=/\\|<>~`]+/).filter(w => w.length > 0);
}

function filterStopWords(tokens) {
  const filtered = tokens.filter(t => !STOP_WORDS.has(t));
  return filtered.length > 0 ? filtered : tokens;
}

function normalizeUnicode(text) {
  if (!text) return '';
  return text.normalize('NFKC');
}

function getSynonymMatches(tokens, searchTokens) {
  const matches = [];
  const tokenSet = new Set(tokens);
  for (const st of searchTokens) {
    for (const [key, synonyms] of Object.entries(synonymMap)) {
      const allTerms = [key, ...synonyms];
      const searchTerm = st.toLowerCase().trim();
      if (allTerms.some(t => t.toLowerCase().trim() === searchTerm)) {
        for (const syn of allTerms) {
          const synLower = syn.toLowerCase().trim();
          if (tokenSet.has(synLower) && !matches.includes(synLower)) {
            matches.push(synLower);
          }
        }
      }
    }
  }
  return matches;
}

function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i-1] === a[j-1]) matrix[i][j] = matrix[i-1][j-1];
      else matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const dotProduct = vecA.reduce((sum, val, i) => sum + val * (vecB[i] || 0), 0);
  const normA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

function preprocessQuery(query) {
  let processed = query.trim().toLowerCase();
  processed = normalizeUnicode(processed);
  processed = processed.replace(/[^\w\s\u0900-\u097F]/g, ' ');
  processed = processed.replace(/\s+/g, ' ').trim();
  return processed;
}

function transliterateEnglishToHindi(englishText) {
  const mapping = {
    'eid': 'ईद', 'id': 'ईद', 'e': 'इ', 'i': 'इ', 'ee': 'ई', 'a': 'अ', 'aa': 'आ',
    'u': 'उ', 'oo': 'ऊ', 'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ch': 'च',
    'chh': 'छ', 'j': 'ज', 'jh': 'झ', 't': 'ट', 'th': 'ठ', 'd': 'ड', 'dh': 'ढ',
    'n': 'न', 'p': 'प', 'ph': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म', 'y': 'य',
    'r': 'र', 'l': 'ल', 'v': 'व', 'sh': 'श', 's': 'स', 'h': 'ह', 'ng': 'ंग',
    'ny': 'ञ', 'ksh': 'क्ष', 'tr': 'त्र', 'gya': 'ज्ञ'
  };
  let result = '';
  let i = 0;
  const text = englishText.toLowerCase();
  while (i < text.length) {
    let found = false;
    for (let len = 5; len >= 1; len--) {
      if (i + len <= text.length) {
        const sub = text.substring(i, i + len);
        if (mapping[sub]) {
          result += mapping[sub];
          i += len;
          found = true;
          break;
        }
      }
    }
    if (!found) {
      result += text[i];
      i++;
    }
  }
  return result;
}

function generateHindiSearchVariants(query) {
  const variants = [];
  const original = query.trim().toLowerCase();
  if (!original) return variants;
  variants.push(original);
  const romanized = romanizeHindi(original);
  if (romanized !== original) variants.push(romanized);
  const words = original.split(/\s+/);
  for (const word of words) {
    if (word.length > 1) {
      const wordRomanized = romanizeHindi(word);
      if (wordRomanized !== word) variants.push(wordRomanized);
      if (wordRomanized.length > 1) {
        const variations = [
          wordRomanized,
          wordRomanized.replace(/aa/g, 'a'),
          wordRomanized.replace(/ee/g, 'i'),
          wordRomanized.replace(/oo/g, 'u'),
          wordRomanized.replace(/sh/g, 's'),
          wordRomanized.replace(/ch/g, 'c'),
          wordRomanized.replace(/kh/g, 'k'),
          wordRomanized.replace(/ph/g, 'p'),
          wordRomanized.replace(/bh/g, 'b'),
          wordRomanized.replace(/dh/g, 'd'),
          wordRomanized.replace(/gh/g, 'g'),
          wordRomanized.replace(/jh/g, 'j'),
          wordRomanized.replace(/th/g, 't'),
          wordRomanized.replace(/ng/g, 'n'),
          wordRomanized.replace(/ny/g, 'n'),
          wordRomanized.replace(/ksh/g, 'k')
        ];
        for (const v of variations) {
          if (v !== wordRomanized && !variants.includes(v)) variants.push(v);
        }
      }
    }
  }
  const unique = [];
  const seen = new Set();
  for (const v of variants) {
    const normalized = v.toLowerCase().trim();
    if (!seen.has(normalized) && normalized.length > 0) {
      seen.add(normalized);
      unique.push(v);
    }
  }
  return unique.slice(0, 50);
}

function generateEnglishSearchVariants(query) {
  const variants = [];
  const original = query.trim().toLowerCase();
  if (!original) return variants;
  variants.push(original);
  const words = original.split(/\s+/);
  for (const word of words) {
    if (word.length > 1) {
      variants.push(word);
      if (word.endsWith('s') && word.length > 2) variants.push(word.slice(0, -1));
      if (word.endsWith('es') && word.length > 3) variants.push(word.slice(0, -2));
      if (word.endsWith('ed') && word.length > 3) variants.push(word.slice(0, -2));
      if (word.endsWith('ing') && word.length > 4) variants.push(word.slice(0, -3));
      if (word.endsWith('tion') && word.length > 5) variants.push(word.slice(0, -4) + 't');
      if (word.endsWith('ly') && word.length > 3) variants.push(word.slice(0, -2));
      if (word.endsWith('al') && word.length > 3) variants.push(word.slice(0, -2));
    }
  }
  const romanized = romanizeHindi(original);
  if (romanized !== original) {
    variants.push(romanized);
    const romanizedWords = romanized.split(/\s+/);
    for (const rw of romanizedWords) {
      if (rw.length > 1 && !variants.includes(rw)) variants.push(rw);
    }
  }
  const unique = [];
  const seen = new Set();
  for (const v of variants) {
    const normalized = v.toLowerCase().trim();
    if (!seen.has(normalized) && normalized.length > 0) {
      seen.add(normalized);
      unique.push(v);
    }
  }
  return unique.slice(0, 50);
}

module.exports = {
  detectLanguage,
  romanizeHindi,
  normalizeText,
  getUniqueWords,
  tokenize,
  filterStopWords,
  normalizeUnicode,
  getSynonymMatches,
  levenshteinDistance,
  cosineSimilarity,
  preprocessQuery,
  transliterateEnglishToHindi,
  generateHindiSearchVariants,
  generateEnglishSearchVariants
};