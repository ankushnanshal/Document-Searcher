const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const PDFParser = require('pdf2json');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eduvault";
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "ankushadmin@gmail.com").split(",").map(e => e.toLowerCase().trim());
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE) || 500;
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP) || 100;
const MIN_CHUNK_LENGTH = parseInt(process.env.MIN_CHUNK_LENGTH) || 100;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION) || 768;
const SEARCH_RESULTS_LIMIT = parseInt(process.env.SEARCH_RESULTS_LIMIT) || 50;

const uploadDir = path.join(__dirname, "uploads", "documents");
const tessdataDir = path.join(__dirname, "tessdata");
const tempDir = path.join(__dirname, "temp");

[uploadDir, tessdataDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

let genAI = null;
let openai = null;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("Gemini AI initialized");
  }
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log("OpenAI initialized");
  }
} catch (e) {
  console.log("AI initialization warning:", e.message);
}

mongoose.connect(MONGO_URI).then(() => {
  console.log("MongoDB connected");
  createTextIndexes();
}).catch(err => console.error("MongoDB error:", err.message));

async function createTextIndexes() {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('documents');
    
    const existingIndexes = await collection.indexes();
    const textIndex = existingIndexes.find(idx => idx.key && idx.key._fts === "text");
    
    if (textIndex) {
      console.log(`Dropping existing text index: ${textIndex.name}`);
      await collection.dropIndex(textIndex.name);
    }
    
    await collection.createIndex(
      { 
        title: "text", 
        titleHindi: "text", 
        titleRomanized: "text",
        extractedText: "text", 
        extractedTextHindi: "text",
        extractedTextRomanized: "text",
        textContent: "text",
        textContentHindi: "text",
        textContentRomanized: "text"
      },
      { 
        weights: {
          title: 10,
          titleHindi: 10,
          titleRomanized: 8,
          extractedText: 5,
          extractedTextHindi: 5,
          extractedTextRomanized: 4,
          textContent: 3,
          textContentHindi: 3,
          textContentRomanized: 2
        },
        name: "document_text_search_v2"
      }
    );
    console.log("Text indexes created successfully");
  } catch (e) {
    console.log("Text index creation warning:", e.message);
  }
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String, default: "" },
  role: { type: String, enum: ["student", "admin"], default: "student" },
  year: { type: String, default: "" },
  semester: { type: String, default: "" },
  branch: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  titleHindi: { type: String, default: "" },
  titleRomanized: { type: String, default: "" },
  fileUrl: { type: String, required: true },
  fileType: { type: String, default: "" },
  uploadedBy: { type: String, required: true },
  category: { type: String, default: "General" },
  docDate: { type: String, default: "" },
  year: { type: String, default: "" },
  semester: { type: String, default: "" },
  branch: { type: String, default: "" },
  paperType: { type: String, default: "" },
  officialDocType: { type: String, default: "" },
  session: { type: String, default: "" },
  storageName: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  textContent: { type: String, default: "" },
  textContentHindi: { type: String, default: "" },
  textContentRomanized: { type: String, default: "" },
  extractedText: { type: String, default: "" },
  extractedTextHindi: { type: String, default: "" },
  extractedTextRomanized: { type: String, default: "" },
  language: { type: String, default: "en" },
  pageCount: { type: Number, default: 0 },
  ocrConfidence: { type: Number, default: 0 },
  ocrApplied: { type: Boolean, default: false },
  isScanned: { type: Boolean, default: false },
  searchTerms: { type: [String], default: [] },
  searchTermsHindi: { type: [String], default: [] },
  searchTermsRomanized: { type: [String], default: [] },
  keywords: { type: [String], default: [] },
  keywordsHindi: { type: [String], default: [] },
  keywordsRomanized: { type: [String], default: [] },
  keywordSynonyms: { type: [String], default: [] },
  keywordSynonymsHindi: { type: [String], default: [] },
  embedding: { type: [Number], default: [] },
  processingStatus: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
  processingError: { type: String, default: "" },
  pageTexts: { type: [String], default: [] },
  fullTextSearchScore: { type: Number, default: 0 }
});

const chunkSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  textHindi: { type: String, default: "" },
  textRomanized: { type: String, default: "" },
  pageNumber: { type: Number, default: 0 },
  startOffset: { type: Number, default: 0 },
  endOffset: { type: Number, default: 0 },
  embedding: { type: [Number], default: [] },
  metadata: {
    title: { type: String, default: "" },
    category: { type: String, default: "" },
    branch: { type: String, default: "" },
    semester: { type: String, default: "" },
    year: { type: String, default: "" },
    session: { type: String, default: "" },
    officialDocType: { type: String, default: "" },
    paperType: { type: String, default: "" }
  },
  createdAt: { type: Date, default: Date.now }
});

chunkSchema.index({ documentId: 1, chunkIndex: 1 });
chunkSchema.index({ text: "text" });
chunkSchema.index({ "metadata.category": 1, "metadata.branch": 1 });

const historySchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  title: { type: String, required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
  chunkId: { type: mongoose.Schema.Types.ObjectId, ref: "Chunk" },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Document = mongoose.model("Document", documentSchema);
const Chunk = mongoose.model("Chunk", chunkSchema);
const History = mongoose.model("History", historySchema);

function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(String(email || "").toLowerCase().trim());
}

function createToken(user) {
  return jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access denied. No token provided." });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admin role required." });
  }
  next();
}

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

async function generateEmbedding(text) {
  if (!text || text.length < 5) {
    return [];
  }
  try {
    const cleanText = text.substring(0, 2000).trim();
    if (genAI) {
      const model = genAI.getGenerativeModel({ model: "embedding-001" });
      const result = await model.embedContent(cleanText);
      if (result && result.embedding && result.embedding.values) {
        return result.embedding.values;
      }
      return [];
    }
    if (openai) {
      const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: cleanText
      });
      if (response && response.data && response.data.length > 0) {
        return response.data[0].embedding || [];
      }
      return [];
    }
  } catch (e) {
    console.error("Embedding generation error:", e.message);
    return [];
  }
  return [];
}

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  if (!text || text.length < MIN_CHUNK_LENGTH) {
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
      if (currentChunk.length >= MIN_CHUNK_LENGTH) {
        chunks.push({ text: currentChunk.trim(), index: chunkIndex++ });
        const words = currentChunk.split(/\s+/);
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(" ") + " " + sentence;
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence;
      }
    }
  }
  
  if (currentChunk.length >= MIN_CHUNK_LENGTH) {
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
          paperType: document.paperType || metadata.paperType || ""
        }
      });
    }
  }
  return embeddedChunks;
}

function buildIndexedDocument(title, extractedText, fileUrl, fileType, uploadedBy, category, docDate, year, semester, branch, paperType, officialDocType, session, storageName, pageTexts, ocrConfidence, ocrApplied, isScanned) {
  const finalTitle = title || '';
  const titleLang = detectLanguage(finalTitle);
  const textLang = detectLanguage(extractedText);
  const language = (titleLang === 'hi' || textLang === 'hi') ? 'hi' : 'en';
  const romanizedTitle = romanizeHindi(finalTitle);
  const romanizedText = romanizeHindi(extractedText);
  const normalizedTitle = normalizeText(finalTitle);
  const normalizedText = normalizeText(extractedText);
  const metaBlob = [finalTitle, officialDocType, paperType, category, storageName, year, semester, branch, session].filter(Boolean).join(' ');
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
    uploadedBy, category: category || "General",
    docDate: docDate || "", year: year || "",
    semester: semester || "", branch: branch || "",
    paperType: paperType || "", officialDocType: officialDocType || "",
    session: session || "", storageName: storageName || "",
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
    isScanned: isScanned || false
  };
}

const synonymMap = {
  'eid': ['eid', 'ईद', 'bakrid', 'eid ul azha', 'bakri eid', 'ईद उल अज़हा', 'बकरीद'],
  'hostel': ['hostel', 'छात्रावास', 'होस्टल', 'dormitory', 'residence hall'],
  'holiday': ['holiday', 'छुट्टी', 'अवकाश', 'vacation', 'break', 'leave'],
  'exam': ['exam', 'examination', 'परीक्षा', 'test', 'assessment'],
  'fee': ['fee', 'fees', 'शुल्क', 'payment', 'tuition'],
  'admission': ['admission', 'admissions', 'प्रवेश', 'enrollment', 'registration'],
  'notice': ['notice', 'सूचना', 'announcement', 'notification', 'circular'],
  'result': ['result', 'परिणाम', 'marks', 'grades', 'scorecard'],
  'placement': ['placement', 'placements', 'campus placement', 'recruitment', 'job placement'],
  'scholarship': ['scholarship', 'छात्रवृत्ति', 'financial aid', 'grant', 'fellowship'],
  'internship': ['internship', 'internships', 'training', 'apprenticeship', 'intern'],
  'seminar': ['seminar', 'संगोष्ठी', 'workshop', 'presentation', 'guest lecture'],
  'syllabus': ['syllabus', 'पाठ्यक्रम', 'curriculum', 'course', 'study material'],
  'library': ['library', 'पुस्तकालय', 'reading room', 'study center'],
  'sports': ['sports', 'खेल', 'athletics', 'games', 'physical education'],
  'canteen': ['canteen', 'कैंटीन', 'cafeteria', 'mess', 'food court'],
  'rules': ['rules', 'नियम', 'regulations', 'guidelines', 'policy'],
  'timetable': ['timetable', 'time table', 'schedule', 'routine', 'class schedule'],
  'ramadan': ['ramadan', 'रमज़ान', 'ramzan', 'roza', 'iftaar'],
  'diwali': ['diwali', 'दीपावली', 'deepawali', 'festival of lights'],
  'holi': ['holi', 'होली', 'festival of colors'],
  'bakrid': ['bakrid', 'बकरीद', 'eid ul adha', 'eid ul azha', 'qurbani'],
  'christmas': ['christmas', 'क्रिसमस', 'xmas', 'christmas day'],
  'new year': ['new year', 'नया साल', 'new years', 'new year day'],
  'republic day': ['republic day', 'गणतंत्र दिवस', '26 january'],
  'independence day': ['independence day', 'स्वतंत्रता दिवस', '15 august'],
  'gandhi jayanti': ['gandhi jayanti', 'गांधी जयंती', '2 october'],
};

function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase().split(/[\s,.\-_\'\"()\[\]{}:;!?@#$%^&*+=/\\|<>~`]+/).filter(w => w.length > 0);
}

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','of','to','in','on','at','for','with',
  'about','me','my','mine','i','you','your','yours','we','us','our','ours','he','she','it','its',
  'they','them','their','this','that','these','those','and','or','but','if','then','than','so',
  'give','giving','gave','show','showing','find','finding','want','wanting','need','needing',
  'please','tell','telling','get','getting','can','could','would','should','do','does','did',
  'from','by','as','all','any','some','any','have','has','had','will','shall','not','no','yes',
  'there','here','what','which','who','whom','how','when','where','why'
]);

function filterStopWords(tokens) {
  const filtered = tokens.filter(t => !STOP_WORDS.has(t));
  return filtered.length > 0 ? filtered : tokens;
}

function normalizeUnicode(text) {
  if (!text) return '';
  return text.normalize('NFKC');
}

function getWholeWordMatches(tokens, searchTokens) {
  const matches = [];
  const tokenSet = new Set(tokens);
  for (const st of searchTokens) {
    if (tokenSet.has(st)) {
      matches.push(st);
    }
  }
  return matches;
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

function getRomanizedMatches(tokens, searchTokens) {
  const matches = [];
  const tokenSet = new Set(tokens);
  for (const st of searchTokens) {
    const romanized = romanizeHindi(st);
    if (romanized && romanized !== st && tokenSet.has(romanized)) {
      matches.push(romanized);
    }
  }
  return matches;
}

function getFuzzyMatches(tokens, searchTokens) {
  const matches = [];
  const tokenSet = new Set(tokens);
  for (const st of searchTokens) {
    if (st.length < 3) continue;
    for (const token of tokenSet) {
      if (token === st) continue;
      if (token.length < 3) continue;
      const maxDist = Math.min(2, Math.max(1, Math.floor(Math.max(st.length, token.length) * 0.3)));
      const dist = levenshteinDistance(st, token);
      if (dist <= maxDist) {
        matches.push(token);
      }
    }
  }
  return matches;
}

function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i-1] === a[j-1]) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i-1][j-1] + 1,
          matrix[i][j-1] + 1,
          matrix[i-1][j] + 1
        );
      }
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
    'eid': 'ईद',
    'id': 'ईद',
    'e': 'इ',
    'i': 'इ',
    'ee': 'ई',
    'a': 'अ',
    'aa': 'आ',
    'u': 'उ',
    'oo': 'ऊ',
    'k': 'क',
    'kh': 'ख',
    'g': 'ग',
    'gh': 'घ',
    'ch': 'च',
    'chh': 'छ',
    'j': 'ज',
    'jh': 'झ',
    't': 'ट',
    'th': 'ठ',
    'd': 'ड',
    'dh': 'ढ',
    'n': 'न',
    'p': 'प',
    'ph': 'फ',
    'b': 'ब',
    'bh': 'भ',
    'm': 'म',
    'y': 'य',
    'r': 'र',
    'l': 'ल',
    'v': 'व',
    'sh': 'श',
    's': 'स',
    'h': 'ह',
    'ng': 'ंग',
    'ny': 'ञ',
    'ksh': 'क्ष',
    'tr': 'त्र',
    'gya': 'ज्ञ'
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

function calculateMetadataScore(chunk, query) {
  let score = 0;
  const q = query.toLowerCase();
  const metadata = chunk.metadata || {};
  const fields = [
    metadata.title, metadata.category, metadata.branch,
    metadata.semester, metadata.year, metadata.session,
    metadata.officialDocType, metadata.paperType
  ];
  for (const field of fields) {
    if (field && field.toLowerCase().includes(q)) {
      score += 0.2;
    }
  }
  return Math.min(score, 1);
}

function calculateExactMatchScore(doc, query, processedQuery) {
  let score = 0;
  const queryLower = processedQuery.toLowerCase();
  const titleLower = (doc.title || '').toLowerCase();
  const titleHindiLower = (doc.titleHindi || '').toLowerCase();
  const titleRomanizedLower = (doc.titleRomanized || '').toLowerCase();
  const filenameLower = (doc.storageName || '').toLowerCase();
  const originalQuery = query.toLowerCase().trim();
  
  if (titleLower === originalQuery) {
    score += 5.0;
  } else if (titleLower.includes(originalQuery)) {
    score += 3.0;
  } else if (titleLower.split(' ').some(word => word === originalQuery)) {
    score += 2.5;
  }
  
  if (titleHindiLower === originalQuery) {
    score += 5.0;
  } else if (titleHindiLower.includes(originalQuery)) {
    score += 3.0;
  }
  
  if (titleRomanizedLower === originalQuery) {
    score += 4.0;
  } else if (titleRomanizedLower.includes(originalQuery)) {
    score += 2.5;
  }
  
  if (filenameLower === originalQuery || filenameLower === originalQuery + '.pdf' || filenameLower === originalQuery + '.docx' || filenameLower === originalQuery + '.doc' || filenameLower === originalQuery + '.xlsx' || filenameLower === originalQuery + '.pptx' || filenameLower === originalQuery + '.txt') {
    score += 4.0;
  } else if (filenameLower.includes(originalQuery)) {
    score += 2.0;
  }
  
  if (doc.category && doc.category.toLowerCase().includes(originalQuery)) {
    score += 1.0;
  }
  
  if (doc.officialDocType && doc.officialDocType.toLowerCase().includes(originalQuery)) {
    score += 1.0;
  }
  
  if (doc.paperType && doc.paperType.toLowerCase().includes(originalQuery)) {
    score += 1.0;
  }
  
  if (doc.branch && doc.branch.toLowerCase().includes(originalQuery)) {
    score += 0.5;
  }
  
  if (doc.year && doc.year.toLowerCase().includes(originalQuery)) {
    score += 0.5;
  }
  
  if (doc.semester && doc.semester.toLowerCase().includes(originalQuery)) {
    score += 0.5;
  }
  
  const queryTokens = tokenize(processedQuery);
  const titleTokens = tokenize(titleLower);
  const matchedTokens = queryTokens.filter(t => titleTokens.includes(t));
  if (matchedTokens.length > 0) {
    score += matchedTokens.length * 0.5;
  }
  
  return Math.min(score, 10);
}

function calculateKeywordScore(doc, queryTokens) {
  if (!queryTokens || queryTokens.length === 0) return 0;
  let score = 0;
  const allText = `${doc.title || ''} ${doc.titleHindi || ''} ${doc.titleRomanized || ''} ${doc.extractedText || ''} ${doc.extractedTextHindi || ''} ${doc.extractedTextRomanized || ''} ${doc.keywords || []} ${doc.keywordsHindi || []} ${doc.searchTerms || []} ${doc.searchTermsHindi || []}`.toLowerCase();
  const tokens = tokenize(allText);
  const matched = queryTokens.filter(t => tokens.includes(t));
  if (matched.length > 0) {
    score = Math.min(matched.length / queryTokens.length, 1) * 1.5;
  }
  return score;
}

async function semanticSearch(query, filter = {}, limit = SEARCH_RESULTS_LIMIT) {
  const processedQuery = preprocessQuery(query);
  if (!processedQuery || processedQuery.length < 2) {
    const docs = await Document.find(filter).sort({ createdAt: -1 }).limit(limit);
    return docs;
  }
  
  const queryEmbedding = await generateEmbedding(processedQuery);
  if (!queryEmbedding || queryEmbedding.length === 0) {
    return [];
  }
  
  const filterQuery = {};
  if (filter.category) filterQuery['metadata.category'] = filter.category;
  if (filter.branch) filterQuery['metadata.branch'] = filter.branch;
  if (filter.semester) filterQuery['metadata.semester'] = filter.semester;
  if (filter.year) filterQuery['metadata.year'] = filter.year;
  
  let chunks = await Chunk.find(filterQuery).limit(200);
  
  if (chunks.length === 0) {
    return [];
  }
  
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

async function fullTextSearch(query, filter = {}, limit = SEARCH_RESULTS_LIMIT) {
  const processedQuery = preprocessQuery(query);
  if (!processedQuery || processedQuery.length < 2) {
    return [];
  }
  
  try {
    const filterConditions = {};
    if (filter.category) filterConditions.category = filter.category;
    if (filter.branch) filterConditions.branch = filter.branch;
    if (filter.semester) filterConditions.semester = filter.semester;
    if (filter.year) filterConditions.year = filter.year;
    
    const textSearchQuery = { $text: { $search: processedQuery } };
    const combinedQuery = Object.keys(filterConditions).length > 0 ? { $and: [textSearchQuery, filterConditions] } : textSearchQuery;
    
    const results = await Document.find(
      combinedQuery,
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .limit(limit);
    
    return results.map(doc => {
      const docObj = doc.toObject ? doc.toObject() : doc;
      docObj.fullTextScore = doc._doc ? doc._doc.score : 0;
      docObj.relevanceScore = Math.round((doc._doc ? doc._doc.score : 0) * 100);
      return docObj;
    });
  } catch (e) {
    console.log("Full text search error:", e.message);
    return [];
  }
}

async function fallbackSearch(query, filter = {}, limit = SEARCH_RESULTS_LIMIT) {
  const processedQuery = preprocessQuery(query);
  const searchTokens = filterStopWords(tokenize(processedQuery));
  const searchConditions = [];
  const escapedQuery = processedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  searchConditions.push({ title: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ titleHindi: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ titleRomanized: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ extractedText: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ extractedTextHindi: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ extractedTextRomanized: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ textContent: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ textContentHindi: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ textContentRomanized: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ officialDocType: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ paperType: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ category: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ year: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ semester: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ branch: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ session: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ keywords: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ keywordsHindi: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ searchTerms: { $regex: escapedQuery, $options: "i" } });
  searchConditions.push({ searchTermsHindi: { $regex: escapedQuery, $options: "i" } });
  
  for (const token of searchTokens) {
    if (token.length < 2) continue;
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    searchConditions.push({ title: { $regex: escapedToken, $options: "i" } });
    searchConditions.push({ titleHindi: { $regex: escapedToken, $options: "i" } });
    searchConditions.push({ titleRomanized: { $regex: escapedToken, $options: "i" } });
    searchConditions.push({ extractedText: { $regex: escapedToken, $options: "i" } });
    searchConditions.push({ extractedTextHindi: { $regex: escapedToken, $options: "i" } });
    searchConditions.push({ extractedTextRomanized: { $regex: escapedToken, $options: "i" } });
    searchConditions.push({ textContent: { $regex: escapedToken, $options: "i" } });
    searchConditions.push({ textContentHindi: { $regex: escapedToken, $options: "i" } });
    searchConditions.push({ textContentRomanized: { $regex: escapedToken, $options: "i" } });
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
  
  const finalQuery = searchConditions.length > 0 ? { $or: searchConditions, ...dbFilter } : dbFilter;
  let docs = await Document.find(finalQuery).limit(limit);
  
  if (docs.length === 0 && processedQuery.length > 2) {
    const chunkMatch = await Chunk.find({
      $text: { $search: processedQuery },
      ...(filter.category ? { 'metadata.category': filter.category } : {}),
      ...(filter.branch ? { 'metadata.branch': filter.branch } : {})
    }).limit(limit);
    
    if (chunkMatch.length > 0) {
      const docIds = [...new Set(chunkMatch.map(c => c.documentId.toString()))];
      docs = await Document.find({ _id: { $in: docIds } });
    }
  }
  
  return docs.slice(0, limit);
}

async function hybridSearch(query, filter = {}, limit = SEARCH_RESULTS_LIMIT) {
  const processedQuery = preprocessQuery(query);
  const queryTokens = filterStopWords(tokenize(processedQuery));
  
  if (!processedQuery || processedQuery.length < 2) {
    const docs = await Document.find(filter).sort({ createdAt: -1 }).limit(limit);
    return docs;
  }
  
  const [semanticResults, fullTextResults, fallbackResults] = await Promise.all([
    semanticSearch(query, filter, limit * 2),
    fullTextSearch(query, filter, limit * 2),
    fallbackSearch(query, filter, limit * 2)
  ]);
  
  const resultMap = new Map();
  const scoreMap = new Map();
  const detailMap = new Map();
  
  for (const doc of semanticResults) {
    const id = doc._id.toString();
    const semanticScore = doc.semanticScore || 0;
    const semanticWeight = 2.0;
    resultMap.set(id, doc);
    scoreMap.set(id, (scoreMap.get(id) || 0) + semanticScore * semanticWeight);
    detailMap.set(id, { semanticScore: semanticScore * semanticWeight });
  }
  
  for (const doc of fullTextResults) {
    const id = doc._id.toString();
    const textScore = doc.fullTextScore || 0;
    const textWeight = 2.0;
    if (!resultMap.has(id)) {
      resultMap.set(id, doc);
    }
    scoreMap.set(id, (scoreMap.get(id) || 0) + textScore * textWeight);
    const details = detailMap.get(id) || {};
    details.textScore = textScore * textWeight;
    detailMap.set(id, details);
  }
  
  for (const doc of fallbackResults) {
    const id = doc._id.toString();
    if (resultMap.has(id)) {
      const existing = resultMap.get(id);
      if (existing.relevanceScore && doc.relevanceScore && doc.relevanceScore > existing.relevanceScore) {
        resultMap.set(id, doc);
      }
    } else {
      resultMap.set(id, doc);
    }
    const fallbackScore = doc.relevanceScore || 0;
    const fallbackWeight = 1.0;
    scoreMap.set(id, (scoreMap.get(id) || 0) + fallbackScore * fallbackWeight);
    const details = detailMap.get(id) || {};
    details.fallbackScore = fallbackScore * fallbackWeight;
    detailMap.set(id, details);
  }
  
  const finalResults = Array.from(resultMap.values()).map(doc => {
    const id = doc._id.toString();
    const currentScore = scoreMap.get(id) || 0;
    const exactMatchScore = calculateExactMatchScore(doc, query, processedQuery);
    const keywordScore = calculateKeywordScore(doc, queryTokens);
    const totalScore = currentScore + (exactMatchScore * 100) + (keywordScore * 50);
    doc.relevanceScore = Math.round(totalScore);
    const details = detailMap.get(id) || {};
    doc._rankingDetails = {
      ...details,
      exactMatchScore: exactMatchScore * 100,
      keywordScore: keywordScore * 50,
      totalScore: totalScore
    };
    return doc;
  });
  
  finalResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  
  return finalResults.slice(0, limit);
}

function preprocessImage(imagePath) {
  return new Promise((resolve) => {
    try {
      const outputPath = imagePath.replace(/(\.[^.]+)$/, '_processed$1');
      sharp(imagePath)
        .greyscale()
        .normalize()
        .sharpen()
        .threshold(128)
        .toFile(outputPath)
        .then(() => resolve(outputPath))
        .catch(() => resolve(imagePath));
    } catch (e) {
      resolve(imagePath);
    }
  });
}

async function checkTesseractLangs() {
  try {
    const { stdout, stderr } = await exec(`tesseract --list-langs`);
    const output = `${stdout || ""}\n${stderr || ""}`;
    return output.split("\n").map(line => line.trim()).filter(line => line && !line.toLowerCase().startsWith("list of"));
  } catch (e) {
    return [];
  }
}

async function ocrImage(imagePath, lang = 'eng') {
  const availableLangs = await checkTesseractLangs();
  const hasHindi = availableLangs.includes('hin');
  const langOption = hasHindi && lang === 'hi' ? 'hin+eng' : 'eng';
  const outputPath = path.join(tempDir, `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  try {
    const processedPath = await preprocessImage(imagePath);
    const { stdout, stderr } = await exec(`tesseract "${processedPath}" "${outputPath}" -l ${langOption} --psm 6 --oem 3 --dpi 300 2>&1`);
    const resultPath = `${outputPath}.txt`;
    let text = '';
    if (fs.existsSync(resultPath)) {
      text = fs.readFileSync(resultPath, 'utf8');
      fs.unlinkSync(resultPath);
    }
    if (processedPath !== imagePath && fs.existsSync(processedPath)) {
      fs.unlinkSync(processedPath);
    }
    const confidenceMatch = stderr.match(/confidence = (\d+\.?\d*)/i);
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 60;
    return { text: text.trim(), confidence };
  } catch (e) {
    return { text: '', confidence: 0 };
  }
}

async function ocrImageWithRetry(imagePath, lang = 'eng', attempts = 2) {
  let lastResult = { text: '', confidence: 0 };
  for (let i = 0; i < attempts; i++) {
    const result = await ocrImage(imagePath, lang);
    lastResult = result;
    if (result.text && result.text.length > 20 && result.confidence >= 50) {
      return result;
    }
    if (i < attempts - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return lastResult;
}

async function extractPDFText(filePath) {
  let embeddedText = '';
  let pageTexts = [];
  let ocrApplied = false;
  let isScanned = false;
  let ocrConfidence = 0;
  let totalPages = 0;
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    embeddedText = data.text || '';
    totalPages = data.numpages || 0;
    if (embeddedText && embeddedText.trim().length > 50) {
      const words = embeddedText.split(/\s+/).filter(w => w.length > 2);
      if (words.length > 20) {
        const devanagariCount = (embeddedText.match(/[\u0900-\u097F]/g) || []).length;
        const asciiCount = (embeddedText.match(/[a-zA-Z]/g) || []).length;
        if ((devanagariCount + asciiCount) / (embeddedText.length || 1) > 0.4) {
          pageTexts = [embeddedText];
          ocrConfidence = 85;
          return { text: embeddedText, pageTexts, ocrApplied: false, isScanned: false, ocrConfidence: 85, totalPages };
        }
      }
    }
  } catch (e) {}
  try {
    const pdfParser = new PDFParser(null, 1);
    const extracted = await new Promise((resolve) => {
      let text = '';
      let pages = [];
      pdfParser.on('pdfParser_dataError', () => resolve({ text: '', pages: [] }));
      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        try {
          if (pdfData && pdfData.Pages) {
            for (let page of pdfData.Pages) {
              let pageText = '';
              if (page.Texts) {
                for (let textItem of page.Texts) {
                  if (textItem.R) {
                    for (let line of textItem.R) {
                      if (line.T) {
                        const decoded = decodeURIComponent(line.T);
                        pageText += decoded + ' ';
                      }
                    }
                  }
                }
              }
              if (pageText.trim()) {
                pages.push(pageText.trim());
                text += pageText + ' ';
              }
            }
          }
        } catch (e) {}
        resolve({ text: text.trim(), pages });
      });
      pdfParser.loadPDF(filePath);
    });
    if (extracted.text && extracted.text.trim().length > 20) {
      pageTexts = extracted.pages;
      return { text: extracted.text, pageTexts, ocrApplied: false, isScanned: false, ocrConfidence: 80, totalPages: extracted.pages.length || totalPages };
    }
  } catch (e) {}
  try {
    const { stdout } = await exec(`pdftotext -layout -nopgbrk "${filePath}" -`);
    if (stdout && stdout.trim().length > 20) {
      const words = stdout.split(/\s+/).filter(w => w.length > 2);
      if (words.length > 5) {
        pageTexts = [stdout];
        ocrConfidence = 85;
        return { text: stdout, pageTexts, ocrApplied: false, isScanned: false, ocrConfidence: 85, totalPages: totalPages || 1 };
      }
    }
  } catch (e) {}
  try {
    const tempPdfDir = path.join(tempDir, `pdf_ocr_${Date.now()}`);
    if (!fs.existsSync(tempPdfDir)) {
      fs.mkdirSync(tempPdfDir, { recursive: true });
    }
    await exec(`pdftoppm -png -r 300 "${filePath}" "${path.join(tempPdfDir, 'page')}"`);
    const pageFiles = fs.readdirSync(tempPdfDir).filter(f => f.startsWith('page') && f.endsWith('.png')).sort();
    if (pageFiles.length > 0) {
      let combinedText = '';
      let pageTextsOcr = [];
      let totalConfidence = 0;
      let pageCount = 0;
      for (const pageFile of pageFiles) {
        const pagePath = path.join(tempPdfDir, pageFile);
        try {
          const processedPath = await preprocessImage(pagePath);
          const result = await ocrImageWithRetry(processedPath, 'hi+eng', 3);
          if (result.text && result.text.length > 10) {
            combinedText += result.text + ' ';
            pageTextsOcr.push(result.text);
            totalConfidence += result.confidence;
            pageCount++;
          }
          if (processedPath !== pagePath && fs.existsSync(processedPath)) {
            fs.unlinkSync(processedPath);
          }
        } catch (e) {}
        if (fs.existsSync(pagePath)) {
          fs.unlinkSync(pagePath);
        }
      }
      if (fs.existsSync(tempPdfDir)) {
        fs.rmdirSync(tempPdfDir, { recursive: true });
      }
      if (combinedText.trim()) {
        ocrApplied = true;
        isScanned = true;
        ocrConfidence = pageCount > 0 ? totalConfidence / pageCount : 60;
        return { text: combinedText.trim(), pageTexts: pageTextsOcr, ocrApplied, isScanned, ocrConfidence, totalPages: pageCount };
      }
    }
    if (fs.existsSync(tempPdfDir)) {
      fs.rmdirSync(tempPdfDir, { recursive: true });
    }
  } catch (e) {}
  if (embeddedText && embeddedText.trim()) {
    return { text: embeddedText, pageTexts: [embeddedText], ocrApplied: false, isScanned: false, ocrConfidence: 70, totalPages: totalPages || 1 };
  }
  return { text: '', pageTexts: [], ocrApplied: false, isScanned: true, ocrConfidence: 0, totalPages: totalPages || 0 };
}

async function extractImageText(filePath) {
  try {
    const result = await ocrImageWithRetry(filePath, 'hi+eng', 2);
    return { text: result.text || '', confidence: result.confidence || 0, ocrApplied: true };
  } catch (e) {
    return { text: '', confidence: 0, ocrApplied: false };
  }
}

async function extractWordText(filePath) {
  let text = '';
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.docx') {
      try {
        const { stdout } = await exec(`python -c "import docx; doc=docx.Document('${filePath}'); print(' '.join([p.text for p in doc.paragraphs]))"`);
        text = stdout || '';
      } catch (e) {}
    } else if (ext === '.doc') {
      try {
        const { stdout } = await exec(`antiword "${filePath}"`);
        text = stdout || '';
      } catch (e) {}
    }
    if (!text) {
      try {
        const { stdout } = await exec(`python -c "import textract; print(textract.process('${filePath}').decode('utf-8'))"`);
        text = stdout || '';
      } catch (e) {}
    }
  } catch (e) {}
  return text ? normalizeText(text) : '';
}

async function extractExcelText(filePath) {
  let text = '';
  try {
    try {
      const { stdout } = await exec(`python -c "import pandas as pd; df=pd.read_excel('${filePath}'); print(df.to_string())"`);
      text = stdout || '';
    } catch (e) {}
    if (!text) {
      try {
        const { stdout } = await exec(`python -c "import textract; print(textract.process('${filePath}').decode('utf-8'))"`);
        text = stdout || '';
      } catch (e) {}
    }
  } catch (e) {}
  return text ? normalizeText(text) : '';
}

async function extractPowerPointText(filePath) {
  let text = '';
  try {
    try {
      const { stdout } = await exec(`python -c "from pptx import Presentation; prs=Presentation('${filePath}'); text=[]; [text.append(shape.text) for slide in prs.slides for shape in slide.shapes if hasattr(shape, 'text')]; print(' '.join(text))"`);
      text = stdout || '';
    } catch (e) {}
    if (!text) {
      try {
        const { stdout } = await exec(`python -c "import textract; print(textract.process('${filePath}').decode('utf-8'))"`);
        text = stdout || '';
      } catch (e) {}
    }
  } catch (e) {}
  return text ? normalizeText(text) : '';
}

function extractTextFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content ? normalizeText(content) : '';
  } catch (e) {
    return '';
  }
}

async function extractFileContent(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  let result = { text: '', pageTexts: [], ocrApplied: false, isScanned: false, ocrConfidence: 0, totalPages: 0 };
  try {
    if (ext === '.pdf') {
      const pdfResult = await extractPDFText(filePath);
      result.text = pdfResult.text;
      result.pageTexts = pdfResult.pageTexts;
      result.ocrApplied = pdfResult.ocrApplied;
      result.isScanned = pdfResult.isScanned;
      result.ocrConfidence = pdfResult.ocrConfidence;
      result.totalPages = pdfResult.totalPages;
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff'].includes(ext)) {
      const imageResult = await extractImageText(filePath);
      result.text = imageResult.text;
      result.ocrApplied = imageResult.ocrApplied;
      result.isScanned = true;
      result.ocrConfidence = imageResult.confidence;
      result.totalPages = 1;
      result.pageTexts = [imageResult.text];
    } else if (['.doc', '.docx'].includes(ext)) {
      result.text = await extractWordText(filePath);
      result.totalPages = 1;
      result.pageTexts = [result.text];
    } else if (['.xls', '.xlsx'].includes(ext)) {
      result.text = await extractExcelText(filePath);
      result.totalPages = 1;
      result.pageTexts = [result.text];
    } else if (['.ppt', '.pptx'].includes(ext)) {
      result.text = await extractPowerPointText(filePath);
      result.totalPages = 1;
      result.pageTexts = [result.text];
    } else if (['.txt', '.csv', '.json', '.md'].includes(ext)) {
      result.text = extractTextFile(filePath);
      result.totalPages = 1;
      result.pageTexts = [result.text];
    } else {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        result.text = normalizeText(content);
        result.totalPages = 1;
        result.pageTexts = [result.text];
      } catch (e) {}
    }
  } catch (e) {
    result.text = '';
  }
  return result;
}

async function generateRAGResponse(query, context) {
  try {
    if (genAI) {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `You are a college document assistant. Answer the user's question based ONLY on the following document excerpts. If the answer is not found in the excerpts, say "I don't have information about that in the uploaded documents." Do not make up information.

Document excerpts:
${context}

User question: ${query}

Answer:`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a college document assistant. Answer based ONLY on the document excerpts provided. If the answer is not found, say you don't have that information." },
          { role: "user", content: `Document excerpts:\n${context}\n\nQuestion: ${query}` }
        ],
        max_tokens: 500
      });
      return response.choices[0].message.content;
    }
  } catch (e) {
    return "AI service unavailable. Please try again later.";
  }
  return "AI service not configured. Please set up OpenAI or Gemini API key.";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 80);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.tiff', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.json', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error("Unsupported file type."));
    cb(null, true);
  }
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, avatar, year, semester, branch } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Missing registration details." });
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: "Email already registered." });
    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = isAdminEmail(normalizedEmail) ? "admin" : "student";
    const user = new User({
      name, email: normalizedEmail, password: hashedPassword,
      avatar: avatar || "", role: assignedRole,
      year: assignedRole === "student" ? year || "" : "",
      semester: assignedRole === "student" ? semester || "" : "",
      branch: assignedRole === "student" ? branch || "" : ""
    });
    await user.save();
    const token = createToken(user);
    res.status(201).json({ token, name: user.name, email: user.email, avatar: user.avatar, role: user.role, year: user.year, semester: user.semester, branch: user.branch });
  } catch (error) {
    res.status(500).json({ message: "Server error during signup." });
  }
});

app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: "Invalid credentials." });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Invalid credentials." });
    const shouldBeAdmin = isAdminEmail(user.email);
    if (shouldBeAdmin && user.role !== "admin") {
      user.role = "admin";
      user.year = "";
      user.semester = "";
      user.branch = "";
      await user.save();
    }
    if (!shouldBeAdmin && user.role === "admin") {
      user.role = "student";
      await user.save();
    }
    const token = createToken(user);
    res.status(200).json({ token, name: user.name, email: user.email, avatar: user.avatar, role: user.role, year: user.year, semester: user.semester, branch: user.branch });
  } catch (error) {
    res.status(500).json({ message: "Server error during signin." });
  }
});

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    res.status(200).json({ name: user.name, email: user.email, avatar: user.avatar, role: user.role, year: user.year, semester: user.semester, branch: user.branch });
  } catch (error) {
    res.status(500).json({ message: "Server error while loading user." });
  }
});

app.put("/api/auth/update-avatar", authenticateToken, async (req, res) => {
  try {
    const { avatar } = req.body;
    const user = await User.findOneAndUpdate({ email: req.user.email }, { avatar: avatar || "" }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found." });
    res.status(200).json({ message: "Avatar updated successfully.", avatar: user.avatar });
  } catch (error) {
    res.status(500).json({ message: "Server error while updating avatar." });
  }
});

app.post("/api/documents/upload", authenticateToken, requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });
    const { title, category, docDate, year, semester, branch, paperType, officialDocType, session } = req.body;
    let finalTitle = (title && title.trim()) ? title.trim() : req.file.originalname;
    if (!finalTitle.trim()) finalTitle = req.file.originalname;
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/documents/${req.file.filename}`;
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff'].includes(ext);
    const isPDF = ext === '.pdf';
    let extractionResult = { text: '', pageTexts: [], ocrApplied: false, isScanned: false, ocrConfidence: 0, totalPages: 0 };
    if (isPDF || isImage) {
      extractionResult = await extractFileContent(filePath, req.file.mimetype);
    } else {
      const text = await extractFileContent(filePath, req.file.mimetype);
      extractionResult.text = text.text || '';
      extractionResult.pageTexts = text.pageTexts || [];
      extractionResult.totalPages = text.totalPages || 1;
    }
    const extractedText = extractionResult.text || '';
    const metaBlob = [finalTitle, officialDocType, paperType, category, year, semester, branch, session].filter(Boolean).join(' ');
    const docData = buildIndexedDocument(
      finalTitle, extractedText, fileUrl, req.file.mimetype || "",
      req.user.email, category, docDate, year || "", semester || "",
      branch || "", paperType || "", officialDocType || "", session || "",
      req.file.filename, extractionResult.pageTexts || [],
      extractionResult.ocrConfidence || 0,
      extractionResult.ocrApplied || false,
      extractionResult.isScanned || false
    );
    docData.processingStatus = "completed";
    docData.pageCount = extractionResult.totalPages || 0;
    const newDoc = new Document(docData);
    await newDoc.save();
    
    const textToChunk = (extractedText || docData.textContent || finalTitle);
    const textChunks = chunkText(textToChunk);
    
    if (textChunks.length > 0) {
      const metadata = {
        pageNumber: 0,
        title: finalTitle,
        category: category || "General",
        branch: branch || "",
        semester: semester || "",
        year: year || "",
        session: session || "",
        officialDocType: officialDocType || "",
        paperType: paperType || ""
      };
      const embeddedChunks = await embedDocumentChunks(newDoc, textChunks, metadata);
      if (embeddedChunks.length > 0) {
        await Chunk.insertMany(embeddedChunks);
        console.log(`Created ${embeddedChunks.length} chunks with embeddings for ${finalTitle}`);
      }
    }
    
    try {
      if (extractedText && extractedText.length > 100) {
        const embedding = await generateEmbedding(extractedText.substring(0, 2000));
        if (embedding && embedding.length > 0) {
          newDoc.embedding = embedding;
          await newDoc.save();
        }
      }
    } catch (e) {
      console.error("Document embedding error:", e.message);
    }
    res.status(201).json({
      message: "Document uploaded and indexed successfully.",
      id: newDoc._id,
      fileUrl,
      language: docData.language,
      extractedTextLength: extractedText.length,
      hasHindiText: !!(docData.extractedTextHindi || docData.titleHindi),
      pageCount: extractionResult.totalPages || 0,
      ocrApplied: extractionResult.ocrApplied || false,
      ocrConfidence: extractionResult.ocrConfidence || 0,
      isScanned: extractionResult.isScanned || false,
      contentPreview: extractedText.substring(0, 300) + (extractedText.length > 300 ? '...' : ''),
      keywords: docData.keywords.slice(0, 10),
      chunksCreated: textChunks.length
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error("Upload error:", error);
    res.status(500).json({ message: error.message || "Server error while uploading document." });
  }
});

app.get("/api/documents/search", authenticateToken, async (req, res) => {
  try {
    const { q, category, branch, semester, year, limit } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (branch) filter.branch = branch;
    if (semester) filter.semester = semester;
    if (year) filter.year = year;
    const resultLimit = parseInt(limit) || SEARCH_RESULTS_LIMIT;
    if (!q || q.trim() === '') {
      const docs = await Document.find(filter).sort({ createdAt: -1 }).limit(resultLimit);
      return res.status(200).json(docs);
    }
    const useSemantic = process.env.SEMANTIC_SEARCH_ENABLED === 'true';
    let results;
    if (useSemantic) {
      results = await hybridSearch(q.trim(), filter, resultLimit);
    } else {
      results = await fallbackSearch(q.trim(), filter, resultLimit);
    }
    res.status(200).json(results);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Search failed", error: error.message });
  }
});

app.get("/api/documents/:id", authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found." });
    res.status(200).json(doc);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching document." });
  }
});

app.put("/api/documents/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, category, docDate, year, semester, branch, paperType, officialDocType, session } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found." });
    if (title !== undefined && title !== doc.title) {
      doc.title = title;
      const lang = detectLanguage(title);
      if (lang === 'hi') doc.titleHindi = title;
      doc.titleRomanized = romanizeHindi(title);
    }
    if (category !== undefined) doc.category = category;
    if (docDate !== undefined) doc.docDate = docDate;
    if (year !== undefined) doc.year = year;
    if (semester !== undefined) doc.semester = semester;
    if (branch !== undefined) doc.branch = branch;
    if (paperType !== undefined) doc.paperType = paperType;
    if (officialDocType !== undefined) doc.officialDocType = officialDocType;
    if (session !== undefined) doc.session = session;
    const metaBlob = [doc.title, doc.officialDocType, doc.paperType, doc.category, doc.storageName, doc.year, doc.semester, doc.branch, doc.session].filter(Boolean).join(' ');
    if (doc.extractedText) {
      doc.extractedTextRomanized = romanizeHindi(doc.extractedText);
      doc.textContentRomanized = `${doc.titleRomanized} ${doc.extractedTextRomanized} ${romanizeHindi(metaBlob)}`.trim();
      doc.searchTermsRomanized = getUniqueWords(`${doc.extractedTextRomanized} ${romanizeHindi(metaBlob)}`).slice(0, 1000);
      doc.keywords = getUniqueWords(`${doc.extractedText} ${metaBlob}`).slice(0, 200);
      doc.keywordSynonyms = generateEnglishSearchVariants(`${doc.extractedText} ${metaBlob}`);
    }
    doc.searchTerms = getUniqueWords(`${doc.title} ${doc.extractedText || ''} ${metaBlob}`).slice(0, 1000);
    doc.textContent = `${doc.title} ${doc.extractedText || ''} ${metaBlob}`.trim();
    await doc.save();
    
    await Chunk.deleteMany({ documentId: doc._id });
    const textChunks = chunkText(doc.extractedText || doc.textContent || doc.title);
    if (textChunks.length > 0) {
      const metadata = {
        pageNumber: 0,
        title: doc.title,
        category: doc.category,
        branch: doc.branch,
        semester: doc.semester,
        year: doc.year,
        session: doc.session,
        officialDocType: doc.officialDocType,
        paperType: doc.paperType
      };
      const embeddedChunks = await embedDocumentChunks(doc, textChunks, metadata);
      if (embeddedChunks.length > 0) {
        await Chunk.insertMany(embeddedChunks);
      }
    }
    res.status(200).json({ message: "Document updated successfully.", doc });
  } catch (error) {
    res.status(500).json({ message: "Server error while updating document." });
  }
});

app.delete("/api/documents/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found." });
    if (doc.storageName) {
      const filePath = path.join(uploadDir, doc.storageName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await Chunk.deleteMany({ documentId: doc._id });
    await Document.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Resource removed successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting document." });
  }
});

app.post("/api/history", authenticateToken, async (req, res) => {
  try {
    const { title, documentId, chunkId } = req.body;
    if (!title) return res.status(400).json({ message: "Missing history details." });
    const newHistory = new History({ email: req.user.email, title, documentId, chunkId });
    await newHistory.save();
    res.status(201).json({ message: "History logged successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while saving history." });
  }
});

app.get("/api/history/:email", authenticateToken, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    if (req.user.email !== email) return res.status(403).json({ message: "Unauthorized action." });
    const logs = await History.find({ email }).sort({ timestamp: -1 });
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: "Server error while loading history." });
  }
});

app.delete("/api/history/:email", authenticateToken, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    if (req.user.email !== email) return res.status(403).json({ message: "Unauthorized action." });
    await History.deleteMany({ email });
    res.status(200).json({ message: "History cleared successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while clearing history." });
  }
});

app.post("/api/chat", authenticateToken, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ message: "Question is required." });
    const queryEmbedding = await generateEmbedding(question);
    let context = '';
    let sources = [];
    if (queryEmbedding && queryEmbedding.length > 0) {
      const chunks = await Chunk.find().limit(100);
      const scored = chunks.map(chunk => ({
        chunk,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding || [])
      }));
      scored.sort((a, b) => b.similarity - a.similarity);
      const topChunks = scored.slice(0, 5);
      for (const sc of topChunks) {
        if (sc.similarity > 0.3) {
          context += `\n--- ${sc.chunk.metadata.title || 'Document'} ---\n${sc.chunk.text.substring(0, 1500)}\n`;
          sources.push({ title: sc.chunk.metadata.title || 'Document', chunkId: sc.chunk._id });
        }
      }
    }
    if (!context) {
      const searchResults = await fallbackSearch(question, {});
      const topDocs = searchResults.slice(0, 3);
      for (const doc of topDocs) {
        const text = doc.extractedText || doc.textContent || '';
        context += `\n--- Document: ${doc.title} (${doc.category || 'General'}) ---\n`;
        context += text.substring(0, 1500) + '\n';
        sources.push({ title: doc.title, id: doc._id });
      }
    }
    if (!context) {
      return res.status(200).json({ answer: "I don't have information about that in the uploaded documents." });
    }
    const answer = await generateRAGResponse(question, context);
    res.status(200).json({ answer, sources });
  } catch (error) {
    res.status(500).json({ message: "Chat error", error: error.message });
  }
});

app.post("/api/documents/reindex", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const docs = await Document.find({});
    let reindexedCount = 0;
    let chunkCount = 0;
    let errors = [];
    await Chunk.deleteMany({});
    for (const doc of docs) {
      if (doc.storageName) {
        const filePath = path.join(uploadDir, doc.storageName);
        if (fs.existsSync(filePath)) {
          try {
            const result = await extractFileContent(filePath, doc.fileType);
            if (result.text) {
              const docData = buildIndexedDocument(
                doc.title, result.text, doc.fileUrl, doc.fileType,
                doc.uploadedBy, doc.category, doc.docDate,
                doc.year, doc.semester, doc.branch, doc.paperType,
                doc.officialDocType, doc.session, doc.storageName,
                result.pageTexts || [], result.ocrConfidence || 0,
                result.ocrApplied || false, result.isScanned || false
              );
              Object.assign(doc, docData);
              doc.pageCount = result.totalPages || 0;
              doc.processingStatus = "completed";
              await doc.save();
              reindexedCount++;
              const textChunks = chunkText(result.text || doc.textContent || doc.title);
              if (textChunks.length > 0) {
                const metadata = {
                  pageNumber: 0,
                  title: doc.title,
                  category: doc.category,
                  branch: doc.branch,
                  semester: doc.semester,
                  year: doc.year,
                  session: doc.session,
                  officialDocType: doc.officialDocType,
                  paperType: doc.paperType
                };
                const embeddedChunks = await embedDocumentChunks(doc, textChunks, metadata);
                if (embeddedChunks.length > 0) {
                  await Chunk.insertMany(embeddedChunks);
                  chunkCount += embeddedChunks.length;
                }
              }
            }
          } catch (err) {
            errors.push({ id: doc._id, error: err.message });
          }
        }
      }
    }
    res.status(200).json({ message: `Re-indexed ${reindexedCount} documents and ${chunkCount} chunks successfully.`, total: docs.length, reindexed: reindexedCount, chunks: chunkCount, errors });
  } catch (error) {
    res.status(500).json({ message: "Server error during re-indexing." });
  }
});

app.get("/api/documents/debug", authenticateToken, async (req, res) => {
  try {
    const total = await Document.countDocuments();
    const chunks = await Chunk.countDocuments();
    const sample = await Document.find().limit(5);
    const chunkSample = await Chunk.find().limit(5);
    res.json({
      totalDocuments: total,
      totalChunks: chunks,
      sample: sample.map(d => ({
        title: d.title, titleHindi: d.titleHindi, titleRomanized: d.titleRomanized,
        hasExtractedText: !!d.extractedText, hasExtractedTextHindi: !!d.extractedTextHindi,
        hasExtractedTextRomanized: !!d.extractedTextRomanized,
        extractedTextLength: d.extractedText ? d.extractedText.length : 0,
        language: d.language, category: d.category, year: d.year,
        semester: d.semester, branch: d.branch, session: d.session,
        officialDocType: d.officialDocType, pageCount: d.pageCount,
        ocrApplied: d.ocrApplied, ocrConfidence: d.ocrConfidence,
        isScanned: d.isScanned, processingStatus: d.processingStatus,
        keywordsCount: d.keywords ? d.keywords.length : 0,
        hasEmbedding: d.embedding && d.embedding.length > 0
      })),
      chunkSample: chunkSample.map(c => ({
        documentId: c.documentId,
        chunkIndex: c.chunkIndex,
        textLength: c.text ? c.text.length : 0,
        hasEmbedding: c.embedding && c.embedding.length > 0,
        metadata: c.metadata
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/status", async (req, res) => {
  const docCount = await Document.countDocuments().catch(() => 0);
  const chunkCount = await Chunk.countDocuments().catch(() => 0);
  res.json({
    status: "online",
    version: "2.0.0",
    features: {
      ocr: true,
      semanticSearch: process.env.SEMANTIC_SEARCH_ENABLED === 'true',
      vectorSearch: process.env.VECTOR_SEARCH_ENABLED === 'true',
      chunking: true,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimension: EMBEDDING_DIMENSION,
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
      chatbot: !!(genAI || openai)
    },
    storage: "local",
    adminEmails: ADMIN_EMAILS,
    stats: {
      documents: docCount,
      chunks: chunkCount
    }
  });
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: error.code === "LIMIT_FILE_SIZE" ? "File is too large. Maximum size is 50MB." : error.message });
  }
  res.status(500).json({ message: error.message || "Server error." });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Storage mode: local`);
  console.log(`OCR DPI: 300`);
  console.log(`AI services: ${genAI || openai ? 'Enabled' : 'Disabled'}`);
  console.log(`Semantic search: ${process.env.SEMANTIC_SEARCH_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
  console.log(`Embedding model: ${EMBEDDING_MODEL}`);
  console.log(`Chunk size: ${CHUNK_SIZE}, Overlap: ${CHUNK_OVERLAP}`);
  const docCount = await Document.countDocuments().catch(() => 0);
  const chunkCount = await Chunk.countDocuments().catch(() => 0);
  console.log(`Existing documents: ${docCount}, chunks: ${chunkCount}`);
});