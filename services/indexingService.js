const { generateEmbedding } = require("../utils/aiUtils");
const {
  detectLanguage,
  romanizeHindi,
  normalizeText,
  getUniqueWords,
  generateEnglishSearchVariants,
  generateHindiSearchVariants
} = require("../utils/textUtils");
const env = require("../config/env");

function chunkText(text, chunkSize = env.CHUNK_SIZE, overlap = env.CHUNK_OVERLAP) {
  if (!text || text.length < env.MIN_CHUNK_LENGTH) {
    return text.length > 0 ? [{ text: text.substring(0, 500), index: 0 }] : [];
  }
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let currentChunk = "";
  let chunkIndex = 0;
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= chunkSize) {
      currentChunk += (currentChunk ? " " : "") + sentence;
    } else {
      if (currentChunk.length >= env.MIN_CHUNK_LENGTH) {
        chunks.push({ text: currentChunk.trim(), index: chunkIndex++ });
        const words = currentChunk.split(/\s+/);
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(" ") + " " + sentence;
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence;
      }
    }
  }
  if (currentChunk.length >= env.MIN_CHUNK_LENGTH) {
    chunks.push({ text: currentChunk.trim(), index: chunkIndex });
  } else if (chunks.length > 0 && currentChunk.length > 0) {
    chunks[chunks.length - 1].text += " " + currentChunk;
  }
  return chunks;
}

async function embedDocumentChunks(document, chunks, metadata) {
  const embeddedChunks = [];
  for (const chunk of chunks) {
    const textToEmbed = chunk.text;
    const embedding = await generateEmbedding(textToEmbed);
    if (embedding && embedding.length > 0) {
      const hindiText = document.extractedTextHindi || "";
      const romanizedText = romanizeHindi(textToEmbed);
      embeddedChunks.push({
        documentId: document._id,
        chunkIndex: chunk.index,
        text: textToEmbed,
        textHindi: hindiText,
        textRomanized: romanizedText,
        pageNumber: metadata.pageNumber || 0,
        embedding: embedding,
        metadata: {
          title: document.title || metadata.title || "",
          category: document.category || metadata.category || "",
          branch: document.branch || metadata.branch || "",
          semester: document.semester || metadata.semester || "",
          year: document.year || metadata.year || "",
          session: document.session || metadata.session || "",
          officialDocType: document.officialDocType || metadata.officialDocType || "",
          paperType: document.paperType || metadata.paperType || "",
          department: document.department || metadata.department || "",
          status: document.status || metadata.status || "published"
        }
      });
    }
  }
  return embeddedChunks;
}

function buildIndexedDocument(title, extractedText, fileUrl, fileType, uploadedBy, uploadedByRole, category, docDate, year, semester, branch, paperType, officialDocType, session, storageName, department, pageTexts, ocrConfidence, ocrApplied, isScanned, status) {
  const finalTitle = title || '';
  const titleLang = detectLanguage(finalTitle);
  const textLang = detectLanguage(extractedText);
  const language = (titleLang === 'hi' || textLang === 'hi') ? 'hi' : 'en';
  const romanizedTitle = romanizeHindi(finalTitle);
  const romanizedText = romanizeHindi(extractedText);
  const normalizedTitle = normalizeText(finalTitle);
  const normalizedText = normalizeText(extractedText);
  const metaBlob = [finalTitle, officialDocType, paperType, category, storageName, year, semester, branch, session, department].filter(Boolean).join(' ');
  const metaBlobRomanized = romanizeHindi(metaBlob);
  let extractedTextHindi = '';
  let searchTermsHindi = [];
  let titleHindi = '';
  let textContentHindi = '';
  let keywordsHindi = [];
  let keywordSynonymsHindi = [];
  if (language === 'hi' || textLang === 'hi' || titleLang === 'hi') {
    extractedTextHindi = normalizedText;
    if (normalizedText) {
      searchTermsHindi = getUniqueWords(`${normalizedText} ${metaBlob}`).slice(0, 1000);
      keywordsHindi = getUniqueWords(`${normalizedText} ${metaBlob}`).slice(0, 200);
      keywordSynonymsHindi = generateHindiSearchVariants(`${normalizedText} ${metaBlob}`);
    }
    if (titleLang === 'hi') titleHindi = normalizedTitle;
    textContentHindi = `${normalizedTitle} ${normalizedText} ${metaBlob}`.trim();
  }
  const searchTerms = normalizedText ? getUniqueWords(`${normalizedText} ${metaBlob}`).slice(0, 1000) : getUniqueWords(metaBlob).slice(0, 1000);
  const romanizedSearchTerms = romanizedText ? getUniqueWords(`${romanizedText} ${metaBlobRomanized}`).slice(0, 1000) : getUniqueWords(metaBlobRomanized).slice(0, 1000);
  const keywords = normalizedText ? getUniqueWords(`${normalizedText} ${metaBlob}`).slice(0, 200) : getUniqueWords(metaBlob).slice(0, 200);
  const keywordSynonyms = normalizedText ? generateEnglishSearchVariants(`${normalizedText} ${metaBlob}`) : generateEnglishSearchVariants(metaBlob);
  const textContent = `${normalizedTitle} ${normalizedText} ${metaBlob}`.trim();
  const textContentRomanized = `${romanizedTitle} ${romanizedText} ${metaBlobRomanized}`.trim();
  return {
    title: normalizedTitle,
    titleHindi: titleHindi || '',
    titleRomanized: romanizedTitle,
    fileUrl, fileType: fileType || "",
    uploadedBy, uploadedByRole: uploadedByRole || "",
    category: category || "General",
    docDate: docDate || "", year: year || "",
    semester: semester || "", branch: branch || "",
    paperType: paperType || "", officialDocType: officialDocType || "",
    session: session || "", storageName: storageName || "",
    department: department || null,
    textContent, textContentHindi: textContentHindi || '',
    textContentRomanized, extractedText: normalizedText,
    extractedTextHindi: extractedTextHindi || '',
    extractedTextRomanized: romanizedText,
    language, searchTerms, searchTermsHindi,
    searchTermsRomanized: romanizedSearchTerms,
    keywords, keywordsHindi, keywordsRomanized: keywordSynonyms,
    keywordSynonyms, keywordSynonymsHindi,
    pageTexts: pageTexts || [],
    ocrConfidence: ocrConfidence || 0,
    ocrApplied: ocrApplied || false,
    isScanned: isScanned || false,
    status: status || "pending_approval"
  };
}

module.exports = { chunkText, embedDocumentChunks, buildIndexedDocument };