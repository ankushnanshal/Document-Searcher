const { tokenize, getSynonymMatches } = require("./textUtils");

function calculateMetadataScore(chunk, query) {
  let score = 0;
  const q = query.toLowerCase();
  const metadata = chunk.metadata || {};
  const fields = [metadata.title, metadata.category, metadata.branch, metadata.semester, metadata.year, metadata.session, metadata.officialDocType, metadata.paperType, metadata.department];
  for (const field of fields) {
    if (field && field.toLowerCase().includes(q)) score += 0.2;
  }
  return Math.min(score, 1);
}

function calculateEnhancedExactMatchScore(doc, query, processedQuery) {
  let score = 0;
  const originalQuery = query.toLowerCase().trim();
  const queryWords = originalQuery.split(/\s+/).filter(w => w.length > 1);
  const titleLower = (doc.title || '').toLowerCase();
  const titleHindiLower = (doc.titleHindi || '').toLowerCase();
  const titleRomanizedLower = (doc.titleRomanized || '').toLowerCase();
  if (titleLower === originalQuery || titleLower.includes(originalQuery)) score += 10.0;
  if (titleHindiLower.includes(originalQuery)) score += 8.0;
  if (titleRomanizedLower.includes(originalQuery)) score += 6.0;
  let allWordsInTitle = true;
  let matchedCount = 0;
  for (const word of queryWords) {
    if (titleLower.includes(word) || titleHindiLower.includes(word) || titleRomanizedLower.includes(word)) matchedCount++;
    else allWordsInTitle = false;
  }
  if (allWordsInTitle && queryWords.length > 0) score += 5.0 * (matchedCount / queryWords.length);
  else if (matchedCount > 0) score += 2.0 * (matchedCount / queryWords.length);
  const metadataFields = [doc.officialDocType, doc.paperType, doc.category, doc.branch, doc.year, doc.semester, doc.session, doc.department];
  for (const field of metadataFields) {
    if (field && field.toLowerCase().includes(originalQuery)) score += 3.0;
    else if (field) {
      const fieldLower = field.toLowerCase();
      for (const word of queryWords) {
        if (fieldLower.includes(word)) { score += 1.5; break; }
      }
    }
  }
  const filenameLower = (doc.storageName || '').toLowerCase();
  if (filenameLower === originalQuery || filenameLower === originalQuery + '.pdf' || filenameLower === originalQuery + '.docx' || filenameLower === originalQuery + '.doc') score += 6.0;
  else if (filenameLower.includes(originalQuery)) score += 3.0;
  const contentLower = (doc.extractedText || '').toLowerCase();
  const contentHindiLower = (doc.extractedTextHindi || '').toLowerCase();
  if (contentLower.includes(originalQuery)) score += 4.0;
  if (contentHindiLower.includes(originalQuery)) score += 3.0;
  if (originalQuery.includes('elective') || queryWords.some(w => w === 'elective')) {
    const docText = ((doc.extractedText || '') + (doc.title || '')).toLowerCase();
    if (docText.includes('elective')) score += 8.0;
    if (doc.title.toLowerCase().includes('syllabus') || doc.titleHindi.toLowerCase().includes('पाठ्यक्रम') || doc.officialDocType === 'Syllabus') score += 10.0;
  }
  if (originalQuery.includes('syllabus') || queryWords.some(w => w === 'syllabus')) {
    if (doc.title.toLowerCase().includes('syllabus') || doc.titleHindi.toLowerCase().includes('पाठ्यक्रम') || doc.officialDocType === 'Syllabus') score += 10.0;
  }
  const yearMatch = originalQuery.match(/(\d+)(?:st|nd|rd|th)?\s*year/i);
  if (yearMatch && doc.year && doc.year.includes(yearMatch[1])) score += 3.0;
  const semMatch = originalQuery.match(/(\d+)(?:st|nd|rd|th)?\s*semester/i);
  if (semMatch && doc.semester && doc.semester.includes(semMatch[1])) score += 3.0;
  return Math.min(score, 30);
}

function calculateEnhancedKeywordScore(doc, queryTokens, processedQuery) {
  if (!queryTokens || queryTokens.length === 0) return 0;
  let score = 0;
  const allText = `${doc.title || ''} ${doc.titleHindi || ''} ${doc.titleRomanized || ''} ${doc.extractedText || ''} ${doc.extractedTextHindi || ''} ${doc.extractedTextRomanized || ''} ${doc.keywords || []} ${doc.keywordsHindi || []} ${doc.searchTerms || []} ${doc.searchTermsHindi || []}`.toLowerCase();
  const tokens = tokenize(allText);
  const tokenSet = new Set(tokens);
  let matchedCount = 0;
  const importantTerms = ['elective', 'syllabus', 'course', 'curriculum', '1st', '2nd', '3rd', '4th', 'year', 'semester'];
  for (const token of queryTokens) {
    if (tokenSet.has(token)) {
      matchedCount++;
      if (importantTerms.some(term => token.includes(term) || term.includes(token))) matchedCount += 0.5;
    }
  }
  if (matchedCount > 0) score = Math.min(matchedCount / queryTokens.length, 1) * 2.0;
  const synonymMatches = getSynonymMatches(tokens, queryTokens);
  if (synonymMatches.length > 0) score += Math.min(synonymMatches.length * 0.3, 1.0);
  return Math.min(score, 3);
}

function calculatePhraseMatchBonus(doc, query) {
  let bonus = 0;
  const queryLower = query.toLowerCase().trim();
  const titleLower = (doc.title || '').toLowerCase();
  if (titleLower.includes(queryLower)) bonus += 5.0;
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);
  if (queryWords.length >= 2) {
    let foundSequence = 0;
    let lastIndex = -1;
    for (const word of queryWords) {
      const idx = titleLower.indexOf(word, lastIndex + 1);
      if (idx !== -1 && idx > lastIndex) { foundSequence++; lastIndex = idx; }
    }
    if (foundSequence === queryWords.length) bonus += 3.0;
    else if (foundSequence >= 2) bonus += 1.5;
  }
  return bonus;
}

function calculateKeywordBoost(doc, query) {
  let boost = 0;
  const queryLower = query.toLowerCase();
  const docLower = ((doc.extractedText || '') + (doc.title || '')).toLowerCase();
  if (queryLower.includes('elective') && queryLower.includes('syllabus')) {
    if (doc.officialDocType === 'Syllabus' && docLower.includes('elective')) boost += 15.0;
    if (doc.officialDocType === 'Syllabus' && doc.category === 'Official Update') boost += 5.0;
  }
  const yearMatch = queryLower.match(/(\d+)(?:st|nd|rd|th)?\s*year/);
  const semMatch = queryLower.match(/(\d+)(?:st|nd|rd|th)?\s*semester/);
  if (yearMatch && semMatch) {
    if (doc.year && doc.year.includes(yearMatch[1]) && doc.semester && doc.semester.includes(semMatch[1])) boost += 8.0;
  }
  const branches = ['cse', 'cs', 'computer', 'ece', 'ee', 'me', 'ce', 'chemical', 'aai', 'ai'];
  for (const branch of branches) {
    if (queryLower.includes(branch) && doc.branch && doc.branch.toLowerCase().includes(branch)) boost += 3.0;
  }
  return boost;
}

module.exports = {
  calculateMetadataScore,
  calculateEnhancedExactMatchScore,
  calculateEnhancedKeywordScore,
  calculatePhraseMatchBonus,
  calculateKeywordBoost
};