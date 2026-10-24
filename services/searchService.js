const { Document } = require("../models/Document");
const { Chunk } = require("../models/Chunk");
const env = require("../config/env");
const {
  preprocessQuery,
  tokenize,
  filterStopWords,
  romanizeHindi,
  transliterateEnglishToHindi,
  cosineSimilarity
} = require("../utils/textUtils");
const { generateEmbedding } = require("../utils/aiUtils");
const {
  calculateMetadataScore,
  calculateEnhancedExactMatchScore,
  calculateEnhancedKeywordScore,
  calculatePhraseMatchBonus,
  calculateKeywordBoost
} = require("../utils/scoring");

async function semanticSearch(query, filter = {}, limit = env.SEARCH_RESULTS_LIMIT) {
  const processedQuery = preprocessQuery(query);
  if (!processedQuery || processedQuery.length < 2) return await Document.find(filter).sort({ createdAt: -1 }).limit(limit);
  const queryEmbedding = await generateEmbedding(processedQuery);
  if (!queryEmbedding || queryEmbedding.length === 0) return [];
  const filterQuery = {};
  if (filter.category) filterQuery['metadata.category'] = filter.category;
  if (filter.branch) filterQuery['metadata.branch'] = filter.branch;
  if (filter.semester) filterQuery['metadata.semester'] = filter.semester;
  if (filter.year) filterQuery['metadata.year'] = filter.year;
  if (filter.status) filterQuery['metadata.status'] = filter.status;
  if (filter.department) filterQuery['metadata.department'] = filter.department;
  let chunks = await Chunk.find(filterQuery).limit(200);
  if (chunks.length === 0) return [];
  const scoredChunks = chunks.map(chunk => {
    const similarity = cosineSimilarity(queryEmbedding, chunk.embedding || []);
    const textTokens = tokenize(chunk.text);
    const queryTokens = tokenize(processedQuery);
    const keywordScore = textTokens.filter(t => queryTokens.includes(t)).length / Math.max(queryTokens.length, 1);
    const metadataScore = calculateMetadataScore(chunk, processedQuery);
    const combinedScore = (similarity * 0.6) + (keywordScore * 0.3) + (metadataScore * 0.1);
    return { chunk, similarity, keywordScore, metadataScore, combinedScore };
  });
  scoredChunks.sort((a, b) => b.combinedScore - a.combinedScore);
  const topChunks = scoredChunks.slice(0, limit);
  const documentIds = [...new Set(topChunks.map(sc => sc.chunk.documentId.toString()))];
  const documents = await Document.find({ _id: { $in: documentIds } });
  const docMap = {};
  documents.forEach(doc => { docMap[doc._id.toString()] = doc; });
  return topChunks.map(sc => {
    const doc = docMap[sc.chunk.documentId.toString()];
    if (!doc) return null;
    const docObj = doc.toObject ? doc.toObject() : doc;
    docObj._ranking = {
      score: Math.round(sc.combinedScore * 1000),
      semanticScore: Math.round(sc.similarity * 1000),
      keywordScore: Math.round(sc.keywordScore * 1000),
      metadataScore: Math.round(sc.metadataScore * 1000),
      matchedChunk: sc.chunk.text.substring(0, 300) + (sc.chunk.text.length > 300 ? '...' : ''),
      chunkId: sc.chunk._id
    };
    docObj.relevanceScore = Math.round(sc.combinedScore * 1000);
    docObj.semanticScore = sc.similarity;
    return docObj;
  }).filter(Boolean);
}

async function fullTextSearch(query, filter = {}, limit = env.SEARCH_RESULTS_LIMIT) {
  const processedQuery = preprocessQuery(query);
  if (!processedQuery || processedQuery.length < 2) return [];
  try {
    const filterConditions = {};
    if (filter.category) filterConditions.category = filter.category;
    if (filter.branch) filterConditions.branch = filter.branch;
    if (filter.semester) filterConditions.semester = filter.semester;
    if (filter.year) filterConditions.year = filter.year;
    if (filter.status) filterConditions.status = filter.status;
    if (filter.department) filterConditions.department = filter.department;
    const textSearchQuery = { $text: { $search: processedQuery } };
    const combinedQuery = Object.keys(filterConditions).length > 0 ? { $and: [textSearchQuery, filterConditions] } : textSearchQuery;
    const results = await Document.find(combinedQuery, { score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" } }).limit(limit);
    return results.map(doc => {
      const docObj = doc.toObject ? doc.toObject() : doc;
      docObj.fullTextScore = doc._doc ? doc._doc.score : 0;
      docObj.relevanceScore = Math.round((doc._doc ? doc._doc.score : 0) * 100);
      return docObj;
    });
  } catch (e) {
    return [];
  }
}

async function fallbackSearch(query, filter = {}, limit = env.SEARCH_RESULTS_LIMIT) {
  const processedQuery = preprocessQuery(query);
  const searchTokens = filterStopWords(tokenize(processedQuery));
  const searchConditions = [];
  const escapedQuery = processedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  ['title','titleHindi','titleRomanized','extractedText','extractedTextHindi','extractedTextRomanized','textContent','textContentHindi','textContentRomanized','officialDocType','paperType','category','year','semester','branch','session','department','keywords','keywordsHindi','searchTerms','searchTermsHindi'].forEach(field => {
    searchConditions.push({ [field]: { $regex: escapedQuery, $options: "i" } });
  });
  for (const token of searchTokens) {
    if (token.length < 2) continue;
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    ['title','titleHindi','titleRomanized','extractedText','extractedTextHindi','extractedTextRomanized','textContent','textContentHindi','textContentRomanized'].forEach(field => {
      searchConditions.push({ [field]: { $regex: escapedToken, $options: "i" } });
    });
  }
  const hindiTransliteration = transliterateEnglishToHindi(processedQuery);
  if (hindiTransliteration && hindiTransliteration !== processedQuery) {
    const escapedHindi = hindiTransliteration.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    searchConditions.push({ titleHindi: { $regex: escapedHindi, $options: "i" } });
    searchConditions.push({ extractedTextHindi: { $regex: escapedHindi, $options: "i" } });
    searchConditions.push({ textContentHindi: { $regex: escapedHindi, $options: "i" } });
  }
  const romanizedQuery = romanizeHindi(processedQuery);
  if (romanizedQuery && romanizedQuery !== processedQuery) {
    const escapedRomanized = romanizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    searchConditions.push({ titleRomanized: { $regex: escapedRomanized, $options: "i" } });
    searchConditions.push({ extractedTextRomanized: { $regex: escapedRomanized, $options: "i" } });
    searchConditions.push({ textContentRomanized: { $regex: escapedRomanized, $options: "i" } });
  }
  let dbFilter = { ...filter };
  if (filter.category) dbFilter.category = filter.category;
  if (filter.branch) dbFilter.branch = filter.branch;
  if (filter.semester) dbFilter.semester = filter.semester;
  if (filter.year) dbFilter.year = filter.year;
  if (filter.status) dbFilter.status = filter.status;
  if (filter.department) dbFilter.department = filter.department;
  const finalQuery = searchConditions.length > 0 ? { $or: searchConditions, ...dbFilter } : dbFilter;
  let docs = await Document.find(finalQuery).limit(limit);
  if (docs.length === 0 && processedQuery.length > 2) {
    const chunkMatch = await Chunk.find({
      $text: { $search: processedQuery },
      ...(filter.category ? { 'metadata.category': filter.category } : {}),
      ...(filter.branch ? { 'metadata.branch': filter.branch } : {}),
      ...(filter.department ? { 'metadata.department': filter.department } : {})
    }).limit(limit);
    if (chunkMatch.length > 0) {
      const docIds = [...new Set(chunkMatch.map(c => c.documentId.toString()))];
      docs = await Document.find({ _id: { $in: docIds } });
    }
  }
  return docs.slice(0, limit);
}

async function enhancedHybridSearch(query, filter = {}, limit = env.SEARCH_RESULTS_LIMIT) {
  const processedQuery = preprocessQuery(query);
  const queryTokens = filterStopWords(tokenize(processedQuery));
  if (!processedQuery || processedQuery.length < 2) return await Document.find(filter).sort({ createdAt: -1 }).limit(limit);
  const [semanticResults, fullTextResults, fallbackResults] = await Promise.all([
    semanticSearch(query, filter, limit * 3),
    fullTextSearch(query, filter, limit * 3),
    fallbackSearch(query, filter, limit * 3)
  ]);
  const resultMap = new Map();
  const scoreMap = new Map();
  const detailMap = new Map();
  for (const doc of semanticResults) {
    const id = doc._id.toString();
    const semanticScore = doc.semanticScore || 0;
    resultMap.set(id, doc);
    scoreMap.set(id, (scoreMap.get(id) || 0) + semanticScore * 3.0);
    detailMap.set(id, { semanticScore: semanticScore * 3.0 });
  }
  for (const doc of fullTextResults) {
    const id = doc._id.toString();
    const textScore = doc.fullTextScore || 0;
    if (!resultMap.has(id)) resultMap.set(id, doc);
    scoreMap.set(id, (scoreMap.get(id) || 0) + textScore * 3.0);
    const details = detailMap.get(id) || {};
    details.textScore = textScore * 3.0;
    detailMap.set(id, details);
  }
  for (const doc of fallbackResults) {
    const id = doc._id.toString();
    if (!resultMap.has(id)) resultMap.set(id, doc);
    const fallbackScore = doc.relevanceScore || 0;
    scoreMap.set(id, (scoreMap.get(id) || 0) + fallbackScore * 0.8);
    const details = detailMap.get(id) || {};
    details.fallbackScore = fallbackScore * 0.8;
    detailMap.set(id, details);
  }
  const finalResults = Array.from(resultMap.values()).map(doc => {
    const id = doc._id.toString();
    const currentScore = scoreMap.get(id) || 0;
    const exactMatchScore = calculateEnhancedExactMatchScore(doc, query, processedQuery);
    const keywordScore = calculateEnhancedKeywordScore(doc, queryTokens, processedQuery);
    const phraseBonus = calculatePhraseMatchBonus(doc, query);
    const keywordBoost = calculateKeywordBoost(doc, query);
    const totalScore = currentScore + (exactMatchScore * 150) + (keywordScore * 75) + phraseBonus + keywordBoost;
    doc.relevanceScore = Math.round(totalScore);
    doc._rankingDetails = {
      ...detailMap.get(id),
      exactMatchScore: exactMatchScore * 150,
      keywordScore: keywordScore * 75,
      phraseBonus, keywordBoost, totalScore
    };
    return doc;
  });
  finalResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  return finalResults.slice(0, limit);
}

module.exports = { semanticSearch, fullTextSearch, fallbackSearch, enhancedHybridSearch };