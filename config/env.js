const path = require("path");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const { DEPARTMENTS, CSE_BRANCHES, FACULTY_ROLES, ROLE_PERMISSIONS, PERMISSIONS } = require("./constants");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eduvault";
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE) || 500;
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP) || 100;
const MIN_CHUNK_LENGTH = parseInt(process.env.MIN_CHUNK_LENGTH) || 100;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION) || 768;
const SEARCH_RESULTS_LIMIT = parseInt(process.env.SEARCH_RESULTS_LIMIT) || 50;
const OCR_DPI = parseInt(process.env.OCR_DPI) || 300;
const OCR_RETRY_ATTEMPTS = parseInt(process.env.OCR_RETRY_ATTEMPTS) || 2;
const STORAGE_MODE = process.env.STORAGE_MODE || "local";

const uploadDir = path.join(__dirname, "..", "uploads", "documents");
const tessdataDir = path.join(__dirname, "..", "tessdata");
const tempDir = path.join(__dirname, "..", "temp");

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

module.exports = {
  PORT,
  MONGO_URI,
  JWT_SECRET,
  CHUNK_SIZE,
  CHUNK_OVERLAP,
  MIN_CHUNK_LENGTH,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSION,
  SEARCH_RESULTS_LIMIT,
  OCR_DPI,
  OCR_RETRY_ATTEMPTS,
  STORAGE_MODE,
  uploadDir,
  tessdataDir,
  tempDir,
  genAI,
  openai,
  DEPARTMENTS,
  CSE_BRANCHES,
  FACULTY_ROLES,
  ROLE_PERMISSIONS,
  PERMISSIONS
};