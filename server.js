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
const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/eduvault";
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const uploadDir = path.join(__dirname, "uploads", "documents");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => console.error("MongoDB connection error:", err.message));
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String, default: "" },
  role: { type: String, enum: ["student", "admin"], default: "student" },
  year: { type: String, default: "" },
  semester: { type: String, default: "" },
  branch: { type: String, default: "" }
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
  storageName: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  textContent: { type: String, default: "" },
  textContentHindi: { type: String, default: "" },
  textContentRomanized: { type: String, default: "" },
  extractedText: { type: String, default: "" },
  extractedTextHindi: { type: String, default: "" },
  extractedTextRomanized: { type: String, default: "" },
  language: { type: String, default: "en" },
  searchTerms: { type: [String], default: [] },
  searchTermsHindi: { type: [String], default: [] },
  searchTermsRomanized: { type: [String], default: [] },
  keywords: { type: [String], default: [] },
  keywordsHindi: { type: [String], default: [] },
  keywordsRomanized: { type: [String], default: [] },
  keywordSynonyms: { type: [String], default: [] },
  keywordSynonymsHindi: { type: [String], default: [] }
});
documentSchema.index({
  title: "text",
  extractedText: "text",
  textContent: "text",
  titleHindi: "text",
  extractedTextHindi: "text",
  textContentHindi: "text",
  titleRomanized: "text",
  extractedTextRomanized: "text",
  textContentRomanized: "text"
});
documentSchema.index({ searchTerms: 1 });
documentSchema.index({ searchTermsHindi: 1 });
documentSchema.index({ searchTermsRomanized: 1 });
documentSchema.index({ keywords: 1 });
documentSchema.index({ keywordsHindi: 1 });
documentSchema.index({ keywordsRomanized: 1 });
documentSchema.index({ keywordSynonyms: 1 });
documentSchema.index({ keywordSynonymsHindi: 1 });
const historySchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  title: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema);
const Document = mongoose.model("Document", documentSchema);
const History = mongoose.model("History", historySchema);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "ankushadmin@gmail.com")
  .split(",")
  .map((email) => email.toLowerCase().trim())
  .filter(Boolean);
function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(String(email || "").toLowerCase().trim());
}
function createToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }
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
  const hindiRegex = /[\u0900-\u097F]/;
  const hindiCount = (text.match(hindiRegex) || []).length;
  const totalChars = text.length || 1;
  if (hindiCount > 0 && (hindiCount / totalChars) > 0.02) {
    return 'hi';
  }
  return 'en';
}
function romanizeHindi(text) {
  if (!text) return '';
  const mapping = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah',
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
    'ष': 'sh', 'स': 's', 'ह': 'h', 'क्ष': 'ksh', 'त्र': 'tr',
    'ज्ञ': 'gya', 'ड़': 'd', 'ढ़': 'dh', '़': '',
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n',
    'ः': 'h', '्': ''
  };
  let result = '';
  let i = 0;
  while (i < text.length) {
    let char = text[i];
    let nextChar = i + 1 < text.length ? text[i + 1] : '';
    let twoChar = char + nextChar;
    if (mapping[twoChar]) {
      result += mapping[twoChar];
      i += 2;
    } else if (mapping[char]) {
      result += mapping[char];
      i++;
    } else {
      result += char;
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
  if (romanized !== original) {
    variants.push(romanized);
  }
  const words = original.split(/\s+/);
  for (const word of words) {
    if (word.length > 1) {
      const wordRomanized = romanizeHindi(word);
      if (wordRomanized !== word) {
        variants.push(wordRomanized);
      }
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
          if (v !== wordRomanized && !variants.includes(v)) {
            variants.push(v);
          }
        }
      }
    }
  }
  const hindiToEnglishMap = {
    'ईद': ['eid', 'id'],
    'छुट्टी': ['chutti', 'chuti', 'chhutti', 'holiday', 'leave', 'vacation', 'off', 'break', 'rest'],
    'सूचना': ['soochana', 'suchna', 'sucna', 'notice', 'notification', 'announcement', 'circular', 'alert'],
    'अवकाश': ['avkash', 'avakash', 'avakas', 'leave', 'vacation', 'holiday', 'off', 'break', 'rest'],
    'नोटिस': ['notice', 'notis', 'notification', 'announcement', 'circular', 'alert'],
    'परीक्षा': ['pariksha', 'pariksa', 'exam', 'examination', 'test', 'assessment'],
    'परिणाम': ['parinam', 'result', 'outcome', 'score', 'grade', 'marks'],
    'पाठ्यक्रम': ['pathyakram', 'syllabus', 'curriculum', 'course', 'study plan'],
    'कार्यक्रम': ['karyakram', 'program', 'schedule', 'plan', 'agenda'],
    'अधिसूचना': ['adhisuchna', 'adhsuchna', 'notification', 'notice', 'announcement', 'circular'],
    'आदेश': ['adesh', 'order', 'command', 'directive'],
    'नियम': ['niyam', 'rule', 'regulation', 'policy'],
    'विनियम': ['viniyam', 'regulation', 'rule', 'policy'],
    'अनुसूची': ['anusuchi', 'schedule', 'timetable', 'plan', 'agenda'],
    'पत्र': ['patr', 'letter', 'correspondence', 'document'],
    'प्रपत्र': ['prapatra', 'form', 'application', 'document'],
    'आवेदन': ['aavedan', 'application', 'request', 'form'],
    'प्रवेश': ['pravesh', 'admission', 'enrollment', 'registration', 'entry'],
    'शुल्क': ['shulk', 'fee', 'fees', 'cost', 'charge', 'payment'],
    'छात्र': ['chhatr', 'student', 'pupil', 'scholar', 'learner'],
    'शिक्षक': ['shikshak', 'teacher', 'instructor', 'educator', 'faculty'],
    'प्राध्यापक': ['pradhyapak', 'professor', 'teacher', 'instructor', 'educator'],
    'विभाग': ['vibhag', 'department', 'division', 'section', 'unit'],
    'संकाय': ['sankay', 'faculty', 'staff', 'teachers'],
    'पुस्तकालय': ['pustakalay', 'library', 'reading room', 'book center'],
    'प्रयोगशाला': ['prayogshala', 'laboratory', 'lab', 'workshop'],
    'सेमिनार': ['seminar', 'workshop', 'lecture', 'presentation'],
    'कार्यशाला': ['karyashala', 'workshop', 'training', 'seminar'],
    'प्रशिक्षण': ['prashikshan', 'training', 'orientation', 'instruction', 'learning'],
    'इंटर्नशिप': ['internship', 'intern', 'internship program'],
    'प्लेसमेंट': ['placement', 'job placement', 'recruitment', 'placement drive'],
    'भर्ती': ['bharti', 'recruitment', 'hiring', 'placement'],
    'नौकरी': ['naukri', 'job', 'work', 'employment'],
    'वेतन': ['vetan', 'salary', 'pay', 'wages'],
    'भत्ता': ['bhatta', 'allowance', 'benefit', 'perk'],
    'अनुदान': ['anudan', 'grant', 'aid', 'stipend'],
    'छात्रवृत्ति': ['chhatravritti', 'scholarship', 'grant', 'aid', 'stipend'],
    'ऋण': ['rin', 'loan', 'credit', 'finance'],
    'छात्रावास': ['chhatravas', 'hostel', 'dormitory', 'residence'],
    'पंजीकरण': ['panjikaran', 'registration', 'enrollment', 'signup'],
    'कक्षा': ['kaksha', 'class', 'course', 'lecture', 'session'],
    'सेमेस्टर': ['semester', 'sem', 'term', 'session'],
    'अंक': ['ank', 'marks', 'grade', 'score'],
    'ग्रेड': ['grade', 'marks', 'score', 'result']
  };
  for (const [hindi, english] of Object.entries(hindiToEnglishMap)) {
    if (original.includes(hindi) || original.includes(hindi.toLowerCase())) {
      for (const eng of english) {
        if (!variants.includes(eng)) {
          variants.push(eng);
        }
      }
    }
  }
  for (const [hindi, english] of Object.entries(hindiToEnglishMap)) {
    for (const eng of english) {
      if (original.includes(eng) || original.includes(eng.toLowerCase())) {
        if (!variants.includes(hindi)) {
          variants.push(hindi);
        }
        const romanizedHindi = romanizeHindi(hindi);
        if (romanizedHindi !== hindi && !variants.includes(romanizedHindi)) {
          variants.push(romanizedHindi);
        }
      }
    }
  }
  const commonSynonyms = {
    'holiday': ['leave', 'vacation', 'off', 'break', 'rest'],
    'leave': ['holiday', 'vacation', 'off', 'break', 'rest'],
    'vacation': ['holiday', 'leave', 'off', 'break', 'rest'],
    'notice': ['notification', 'announcement', 'circular', 'alert'],
    'notification': ['notice', 'announcement', 'circular', 'alert'],
    'announcement': ['notice', 'notification', 'circular', 'alert'],
    'circular': ['notice', 'notification', 'announcement'],
    'exam': ['examination', 'test', 'assessment'],
    'examination': ['exam', 'test', 'assessment'],
    'test': ['exam', 'examination', 'assessment'],
    'result': ['outcome', 'score', 'grade', 'marks'],
    'syllabus': ['curriculum', 'course outline', 'study plan'],
    'schedule': ['timetable', 'plan', 'agenda'],
    'timetable': ['schedule', 'plan', 'agenda'],
    'fee': ['fees', 'cost', 'charge', 'payment'],
    'student': ['pupil', 'scholar', 'learner'],
    'teacher': ['instructor', 'educator', 'faculty', 'professor'],
    'professor': ['teacher', 'instructor', 'educator', 'faculty'],
    'faculty': ['teacher', 'instructor', 'educator', 'staff'],
    'department': ['division', 'section', 'unit'],
    'library': ['reading room', 'book center'],
    'laboratory': ['lab', 'workshop'],
    'training': ['orientation', 'instruction', 'learning'],
    'internship': ['internship', 'internship program'],
    'placement': ['job placement', 'recruitment', 'placement drive'],
    'scholarship': ['grant', 'aid', 'stipend'],
    'grant': ['scholarship', 'aid', 'stipend'],
    'admission': ['enrollment', 'registration', 'entry'],
    'hostel': ['dormitory', 'residence'],
    'dormitory': ['hostel', 'residence'],
    'registration': ['enrollment', 'signup'],
    'enrollment': ['registration', 'signup'],
    'class': ['course', 'lecture', 'session'],
    'course': ['class', 'lecture', 'session'],
    'semester': ['sem', 'term', 'session'],
    'marks': ['grade', 'score'],
    'grade': ['marks', 'score'],
    'application': ['request', 'form'],
    'form': ['application', 'request']
  };
  for (const [word, synonyms] of Object.entries(commonSynonyms)) {
    if (original.includes(word) || original.includes(word.toLowerCase())) {
      for (const syn of synonyms) {
        if (!variants.includes(syn)) {
          variants.push(syn);
        }
        const romanizedSyn = romanizeHindi(syn);
        if (romanizedSyn !== syn && !variants.includes(romanizedSyn)) {
          variants.push(romanizedSyn);
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
      if (word.endsWith('s') && word.length > 2) {
        variants.push(word.slice(0, -1));
      }
      if (word.endsWith('es') && word.length > 3) {
        variants.push(word.slice(0, -2));
      }
      if (word.endsWith('ed') && word.length > 3) {
        variants.push(word.slice(0, -2));
      }
      if (word.endsWith('ing') && word.length > 4) {
        variants.push(word.slice(0, -3));
      }
      if (word.endsWith('tion') && word.length > 5) {
        variants.push(word.slice(0, -4) + 't');
      }
      if (word.endsWith('ly') && word.length > 3) {
        variants.push(word.slice(0, -2));
      }
      if (word.endsWith('al') && word.length > 3) {
        variants.push(word.slice(0, -2));
      }
    }
  }
  const romanized = romanizeHindi(original);
  if (romanized !== original) {
    variants.push(romanized);
    const romanizedWords = romanized.split(/\s+/);
    for (const rw of romanizedWords) {
      if (rw.length > 1 && !variants.includes(rw)) {
        variants.push(rw);
      }
    }
  }
  const commonSynonyms = {
    'holiday': ['leave', 'vacation', 'off', 'break', 'rest', 'chutti', 'chhutti', 'छुट्टी', 'avkash', 'अवकाश'],
    'leave': ['holiday', 'vacation', 'off', 'break', 'rest', 'chutti', 'छुट्टी', 'avkash', 'अवकाश'],
    'vacation': ['holiday', 'leave', 'off', 'break', 'rest', 'chutti', 'छुट्टी', 'avkash', 'अवकाश'],
    'notice': ['notification', 'announcement', 'circular', 'alert', 'soochana', 'suchna', 'sucna', 'सूचना', 'notis', 'नोटिस'],
    'notification': ['notice', 'announcement', 'circular', 'alert', 'soochana', 'suchna', 'सूचना', 'notis', 'नोटिस'],
    'announcement': ['notice', 'notification', 'circular', 'alert', 'soochana', 'suchna', 'सूचना'],
    'circular': ['notice', 'notification', 'announcement', 'soochana', 'suchna', 'सूचना'],
    'exam': ['examination', 'test', 'assessment', 'pariksha', 'pariksa', 'परीक्षा'],
    'examination': ['exam', 'test', 'assessment', 'pariksha', 'pariksa', 'परीक्षा'],
    'test': ['exam', 'examination', 'assessment', 'pariksha', 'परीक्षा'],
    'result': ['outcome', 'score', 'grade', 'marks', 'parinam', 'परिणाम', 'ank', 'अंक'],
    'syllabus': ['curriculum', 'course outline', 'study plan', 'pathyakram', 'पाठ्यक्रम'],
    'schedule': ['timetable', 'plan', 'agenda', 'karyakram', 'कार्यक्रम', 'anusuchi', 'अनुसूची'],
    'timetable': ['schedule', 'plan', 'agenda', 'anusuchi', 'अनुसूची'],
    'fee': ['fees', 'cost', 'charge', 'payment', 'shulk', 'शुल्क'],
    'student': ['pupil', 'scholar', 'learner', 'chhatr', 'छात्र'],
    'teacher': ['instructor', 'educator', 'faculty', 'professor', 'shikshak', 'शिक्षक'],
    'professor': ['teacher', 'instructor', 'educator', 'faculty', 'pradhyapak', 'प्राध्यापक'],
    'faculty': ['teacher', 'instructor', 'educator', 'staff', 'sankay', 'संकाय'],
    'department': ['division', 'section', 'unit', 'vibhag', 'विभाग'],
    'training': ['orientation', 'instruction', 'learning', 'prashikshan', 'प्रशिक्षण'],
    'internship': ['intern', 'internship program', 'intarnship', 'इंटर्नशिप'],
    'placement': ['job placement', 'recruitment', 'placement drive', 'प्लेसमेंट', 'bharti', 'भर्ती'],
    'scholarship': ['grant', 'aid', 'stipend', 'chhatravritti', 'छात्रवृत्ति', 'anudan', 'अनुदान'],
    'admission': ['enrollment', 'registration', 'entry', 'pravesh', 'प्रवेश', 'panjikaran', 'पंजीकरण'],
    'grant': ['scholarship', 'aid', 'stipend', 'anudan', 'अनुदान'],
    'hostel': ['dormitory', 'residence', 'chhatravas', 'छात्रावास'],
    'dormitory': ['hostel', 'residence', 'chhatravas', 'छात्रावास'],
    'registration': ['enrollment', 'signup', 'panjikaran', 'पंजीकरण'],
    'enrollment': ['registration', 'signup', 'panjikaran', 'पंजीकरण'],
    'class': ['course', 'lecture', 'session', 'kaksha', 'कक्षा'],
    'course': ['class', 'lecture', 'session', 'kaksha', 'कक्षा'],
    'semester': ['sem', 'term', 'session', 'सेमेस्टर'],
    'marks': ['grade', 'score', 'ank', 'अंक'],
    'grade': ['marks', 'score', 'ग्रेड'],
    'application': ['request', 'form', 'aavedan', 'आवेदन', 'prapatra', 'प्रपत्र'],
    'form': ['application', 'request', 'prapatra', 'प्रपत्र', 'aavedan', 'आवेदन'],
    'order': ['command', 'directive', 'adesh', 'आदेश'],
    'rule': ['regulation', 'policy', 'niyam', 'नियम', 'viniyam', 'विनियम'],
    'regulation': ['rule', 'policy', 'niyam', 'नियम', 'viniyam', 'विनियम'],
    'policy': ['rule', 'regulation', 'niyam', 'नियम'],
    'letter': ['correspondence', 'document', 'patr', 'पत्र'],
    'document': ['letter', 'file', 'patr', 'पत्र', 'prapatra', 'प्रपत्र'],
    'library': ['reading room', 'book center', 'pustakalay', 'पुस्तकालय'],
    'laboratory': ['lab', 'workshop', 'prayogshala', 'प्रयोगशाला'],
    'lab': ['laboratory', 'workshop', 'prayogshala', 'प्रयोगशाला'],
    'workshop': ['training', 'seminar', 'karyashala', 'कार्यशाला', 'prayogshala', 'प्रयोगशाला'],
    'seminar': ['workshop', 'lecture', 'सेमिनार'],
    'job': ['work', 'employment', 'naukri', 'नौकरी'],
    'salary': ['pay', 'wages', 'vetan', 'वेतन'],
    'allowance': ['benefit', 'perk', 'bhatta', 'भत्ता'],
    'loan': ['credit', 'finance', 'rin', 'ऋण']
  };
  for (const [word, synonyms] of Object.entries(commonSynonyms)) {
    if (original.includes(word) || original.includes(word.toLowerCase())) {
      for (const syn of synonyms) {
        if (!variants.includes(syn)) {
          variants.push(syn);
        }
        const romanizedSyn = romanizeHindi(syn);
        if (romanizedSyn !== syn && !variants.includes(romanizedSyn)) {
          variants.push(romanizedSyn);
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
function normalizeText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9\s\-\.\u0900-\u097F]/g, ' ')
    .trim();
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
function buildIndexedDocument(title, extractedText, fileUrl, fileType, uploadedBy, category, docDate, year, semester, branch, paperType, officialDocType, storageName) {
  const finalTitle = title || '';
  const titleLang = detectLanguage(finalTitle);
  const textLang = detectLanguage(extractedText);
  const language = (titleLang === 'hi' || textLang === 'hi') ? 'hi' : 'en';
  const romanizedTitle = romanizeHindi(finalTitle);
  const romanizedText = romanizeHindi(extractedText);
  const normalizedTitle = normalizeText(finalTitle);
  const normalizedText = normalizeText(extractedText);
  const metaBlob = [finalTitle, officialDocType, paperType, category, storageName].filter(Boolean).join(' ');
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
    if (titleLang === 'hi') {
      titleHindi = normalizedTitle;
    }
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
    fileUrl,
    fileType: fileType || "",
    uploadedBy,
    category: category || "General",
    docDate: docDate || "",
    year: year || "",
    semester: semester || "",
    branch: branch || "",
    paperType: paperType || "",
    officialDocType: officialDocType || "",
    storageName: storageName || "",
    textContent: textContent,
    textContentHindi: textContentHindi || '',
    textContentRomanized: textContentRomanized,
    extractedText: normalizedText,
    extractedTextHindi: extractedTextHindi || '',
    extractedTextRomanized: romanizedText,
    language: language,
    searchTerms: searchTerms,
    searchTermsHindi: searchTermsHindi,
    searchTermsRomanized: romanizedSearchTerms,
    keywords: keywords,
    keywordsHindi: keywordsHindi,
    keywordsRomanized: keywordSynonyms,
    keywordSynonyms: keywordSynonyms,
    keywordSynonymsHindi: keywordSynonymsHindi
  };
}
async function extractTextFromPDF(filePath) {
  return new Promise((resolve) => {
    try {
      const pdfParser = new PDFParser();
      let extractedText = '';
      pdfParser.on('pdfParser_dataError', (errData) => {
        console.log('PDF parse error:', errData.parserError);
        resolve(extractedText);
      });
      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        try {
          if (pdfData && pdfData.Pages) {
            for (let page of pdfData.Pages) {
              if (page.Texts) {
                for (let text of page.Texts) {
                  if (text.R) {
                    for (let line of text.R) {
                      if (line.T) {
                        const decodedText = decodeURIComponent(line.T);
                        extractedText += decodedText + ' ';
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.log('PDF text extraction error:', e.message);
        }
        if (extractedText) {
          extractedText = extractedText.replace(/\s+/g, ' ').trim();
        }
        resolve(extractedText);
      });
      pdfParser.loadPDF(filePath);
    } catch (error) {
      console.log('PDF parser error:', error.message);
      resolve('');
    }
  });
}
async function extractTextFromWord(filePath) {
  let text = '';
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.docx') {
      try {
        const { stdout } = await exec(`python -c "import docx; doc=docx.Document('${filePath}'); print(' '.join([p.text for p in doc.paragraphs]))"`);
        text = stdout || '';
      } catch (e) {
        console.log("python-docx error:", e.message);
      }
    } else if (ext === '.doc') {
      try {
        const { stdout } = await exec(`antiword "${filePath}"`);
        text = stdout || '';
      } catch (e) {
        console.log("antiword error:", e.message);
      }
    }
    if (!text) {
      try {
        const { stdout } = await exec(`python -c "import textract; print(textract.process('${filePath}').decode('utf-8'))"`);
        text = stdout || '';
      } catch (e) {
        console.log("textract error:", e.message);
      }
    }
  } catch (error) {
    console.log("Word extraction error:", error.message);
  }
  if (text) {
    text = text.replace(/\s+/g, ' ').trim();
  }
  return text || '';
}
function extractTextFromTXT(filePath) {
  try {
    let text = fs.readFileSync(filePath, 'utf8');
    if (text) {
      text = text.replace(/\s+/g, ' ').trim();
    }
    return text || '';
  } catch (error) {
    console.log("TXT extraction error:", error.message);
    return '';
  }
}
function extractTextFromCSV(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let text = lines.map(line => line.replace(/,/g, ' ')).join(' ');
    if (text) {
      text = text.replace(/\s+/g, ' ').trim();
    }
    return text || '';
  } catch (error) {
    console.log("CSV extraction error:", error.message);
    return '';
  }
}
function extractTextFromJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    let text = JSON.stringify(data).replace(/[{},:"\[\]]/g, ' ').replace(/\s+/g, ' ');
    if (text) {
      text = text.replace(/\s+/g, ' ').trim();
    }
    return text || '';
  } catch (error) {
    console.log("JSON extraction error:", error.message);
    return '';
  }
}
async function extractTextFromImage(filePath) {
  try {
    const tesseract = 'tesseract';
    try {
      await exec(`"${tesseract}" --version`);
    } catch (e) {
      console.log("Tesseract not installed. Image OCR skipped.");
      return '';
    }
    const outputPath = path.join(__dirname, `ocr_${Date.now()}`);
    const langs = ['hin+eng', 'hin', 'eng'];
    let text = '';
    for (const lang of langs) {
      try {
        await exec(`"${tesseract}" "${filePath}" "${outputPath}" -l ${lang} --psm 6 --oem 3`);
        const ocrResultPath = `${outputPath}.txt`;
        if (fs.existsSync(ocrResultPath)) {
          const content = fs.readFileSync(ocrResultPath, 'utf8');
          if (content.trim().length > text.length) {
            text = content;
          }
          fs.unlinkSync(ocrResultPath);
        }
      } catch (e) {
        continue;
      }
    }
    if (text) {
      text = text.replace(/\s+/g, ' ').trim();
    }
    return text || '';
  } catch (error) {
    console.log("Image OCR error:", error.message);
    return '';
  }
}
async function extractTextFromExcel(filePath) {
  let text = '';
  try {
    try {
      const { stdout } = await exec(`python -c "import pandas as pd; df=pd.read_excel('${filePath}'); print(df.to_string())"`);
      text = stdout || '';
    } catch (e) {
      console.log("pandas excel error:", e.message);
    }
    if (!text) {
      try {
        const { stdout } = await exec(`python -c "import textract; print(textract.process('${filePath}').decode('utf-8'))"`);
        text = stdout || '';
      } catch (e) {
        console.log("textract excel error:", e.message);
      }
    }
  } catch (error) {
    console.log("Excel extraction error:", error.message);
  }
  if (text) {
    text = text.replace(/\s+/g, ' ').trim();
  }
  return text || '';
}
async function extractTextFromPowerPoint(filePath) {
  let text = '';
  try {
    try {
      const { stdout } = await exec(`python -c "from pptx import Presentation; prs=Presentation('${filePath}'); text=[]; [text.append(shape.text) for slide in prs.slides for shape in slide.shapes if hasattr(shape, 'text')]; print(' '.join(text))"`);
      text = stdout || '';
    } catch (e) {
      console.log("python-pptx error:", e.message);
    }
    if (!text) {
      try {
        const { stdout } = await exec(`python -c "import textract; print(textract.process('${filePath}').decode('utf-8'))"`);
        text = stdout || '';
      } catch (e) {
        console.log("textract ppt error:", e.message);
      }
    }
  } catch (error) {
    console.log("PowerPoint extraction error:", error.message);
  }
  if (text) {
    text = text.replace(/\s+/g, ' ').trim();
  }
  return text || '';
}
async function extractTextFromFile(filePath, fileType) {
  const ext = path.extname(filePath).toLowerCase();
  let extractedText = '';
  try {
    switch (ext) {
      case '.pdf':
        extractedText = await extractTextFromPDF(filePath);
        break;
      case '.doc':
      case '.docx':
        extractedText = await extractTextFromWord(filePath);
        break;
      case '.txt':
        extractedText = extractTextFromTXT(filePath);
        break;
      case '.csv':
        extractedText = extractTextFromCSV(filePath);
        break;
      case '.json':
        extractedText = extractTextFromJSON(filePath);
        break;
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.webp':
        extractedText = await extractTextFromImage(filePath);
        break;
      case '.xls':
      case '.xlsx':
        extractedText = await extractTextFromExcel(filePath);
        break;
      case '.ppt':
      case '.pptx':
        extractedText = await extractTextFromPowerPoint(filePath);
        break;
      default:
        extractedText = '';
    }
  } catch (error) {
    console.log(`Text extraction error for ${filePath}:`, error.message);
    return '';
  }
  if (extractedText) {
    extractedText = normalizeText(extractedText);
  }
  return extractedText;
}
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname);
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .slice(0, 80);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {
    const allowedExtensions = [
      ".pdf",
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".gif",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".txt",
      ".csv",
      ".json"
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error("Unsupported file type."));
    }
    cb(null, true);
  }
});
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, avatar, year, semester, branch } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing registration details." });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = isAdminEmail(normalizedEmail) ? "admin" : "student";
    const user = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      avatar: avatar || "",
      role: assignedRole,
      year: assignedRole === "student" ? year || "" : "",
      semester: assignedRole === "student" ? semester || "" : "",
      branch: assignedRole === "student" ? branch || "" : ""
    });
    await user.save();
    const token = createToken(user);
    return res.status(201).json({
      token,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      year: user.year,
      semester: user.semester,
      branch: user.branch
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Server error during signup." });
  }
});
app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid credentials." });
    }
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
    return res.status(200).json({
      token,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      year: user.year,
      semester: user.semester,
      branch: user.branch
    });
  } catch (error) {
    console.error("Signin error:", error);
    return res.status(500).json({ message: "Server error during signin." });
  }
});
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json({
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      year: user.year,
      semester: user.semester,
      branch: user.branch
    });
  } catch (error) {
    console.error("Me error:", error);
    return res.status(500).json({ message: "Server error while loading user." });
  }
});
app.put("/api/auth/update-avatar", authenticateToken, async (req, res) => {
  try {
    const { email, avatar } = req.body;
    const normalizedEmail = String(email || "").toLowerCase().trim();
    if (req.user.email !== normalizedEmail) {
      return res.status(403).json({ message: "Unauthorized action." });
    }
    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { avatar: avatar || "" },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json({
      message: "Avatar updated successfully.",
      avatar: user.avatar
    });
  } catch (error) {
    console.error("Avatar update error:", error);
    return res.status(500).json({ message: "Server error while updating avatar." });
  }
});
app.post("/api/documents/upload", authenticateToken, requireAdmin, upload.single("file"), async (req, res) => {
  try {
    const { title, category, docDate, year, semester, branch, paperType, officialDocType } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    const finalTitle = title || req.file.originalname;
    if (!finalTitle.trim()) {
      return res.status(400).json({ message: "Missing title data." });
    }
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/documents/${req.file.filename}`;
    const filePath = req.file.path;
    const extractedText = await extractTextFromFile(filePath, req.file.mimetype);
    const docData = buildIndexedDocument(
      finalTitle,
      extractedText,
      fileUrl,
      req.file.mimetype || "",
      req.user.email,
      category,
      docDate,
      year,
      semester,
      branch,
      paperType,
      officialDocType,
      req.file.filename
    );
    const newDoc = new Document(docData);
    await newDoc.save();
    return res.status(201).json({
      message: "Document uploaded and indexed successfully.",
      id: newDoc._id,
      fileUrl,
      language: docData.language,
      extractedTextLength: extractedText.length,
      hasHindiText: !!(docData.extractedTextHindi || docData.titleHindi)
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Upload error:", error);
    return res.status(500).json({
      message: error.message || "Server error while uploading document."
    });
  }
});
app.get("/api/documents/search", authenticateToken, async (req, res) => {
  try {
    const { query, category, branch, semester, year } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (branch) filter.branch = branch;
    if (semester) filter.semester = semester;
    if (year) filter.year = year;
    if (!query || query.trim() === '') {
      const docs = await Document.find(filter).sort({ createdAt: -1 }).limit(100);
      return res.status(200).json(docs);
    }
    const searchQuery = query.trim();
    const isHindi = detectLanguage(searchQuery) === 'hi';
    const variants = isHindi ? generateHindiSearchVariants(searchQuery) : generateEnglishSearchVariants(searchQuery);
    const searchConditions = [];
    for (const variant of variants) {
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (escaped.length > 0) {
        searchConditions.push({ title: { $regex: escaped, $options: "i" } });
        searchConditions.push({ titleHindi: { $regex: escaped, $options: "i" } });
        searchConditions.push({ titleRomanized: { $regex: escaped, $options: "i" } });
        searchConditions.push({ extractedText: { $regex: escaped, $options: "i" } });
        searchConditions.push({ extractedTextHindi: { $regex: escaped, $options: "i" } });
        searchConditions.push({ extractedTextRomanized: { $regex: escaped, $options: "i" } });
        searchConditions.push({ textContent: { $regex: escaped, $options: "i" } });
        searchConditions.push({ textContentHindi: { $regex: escaped, $options: "i" } });
        searchConditions.push({ textContentRomanized: { $regex: escaped, $options: "i" } });
        searchConditions.push({ officialDocType: { $regex: escaped, $options: "i" } });
        searchConditions.push({ paperType: { $regex: escaped, $options: "i" } });
        searchConditions.push({ category: { $regex: escaped, $options: "i" } });
        searchConditions.push({ storageName: { $regex: escaped, $options: "i" } });
      }
    }
    for (const variant of variants) {
      const lower = variant.toLowerCase();
      if (lower.length > 1) {
        searchConditions.push({ searchTerms: { $in: [lower] } });
        searchConditions.push({ searchTermsHindi: { $in: [lower] } });
        searchConditions.push({ searchTermsRomanized: { $in: [lower] } });
        searchConditions.push({ keywords: { $in: [lower] } });
        searchConditions.push({ keywordsHindi: { $in: [lower] } });
        searchConditions.push({ keywordsRomanized: { $in: [lower] } });
        searchConditions.push({ keywordSynonyms: { $in: [lower] } });
        searchConditions.push({ keywordSynonymsHindi: { $in: [lower] } });
      }
    }
    if (searchConditions.length === 0) {
      const docs = await Document.find(filter).sort({ createdAt: -1 }).limit(100);
      return res.status(200).json(docs);
    }
    const finalQuery = { $or: searchConditions, ...filter };
    let docs = await Document.find(finalQuery).sort({ createdAt: -1 }).limit(200);
    const results = docs.map(doc => {
      const docObj = doc.toObject();
      let score = 0;
      const searchLower = searchQuery.toLowerCase();
      const title = doc.title ? doc.title.toLowerCase() : '';
      const titleHindi = doc.titleHindi ? doc.titleHindi.toLowerCase() : '';
      const titleRomanized = doc.titleRomanized ? doc.titleRomanized.toLowerCase() : '';
      const extractedText = doc.extractedText ? doc.extractedText.toLowerCase() : '';
      const extractedTextHindi = doc.extractedTextHindi ? doc.extractedTextHindi.toLowerCase() : '';
      const extractedTextRomanized = doc.extractedTextRomanized ? doc.extractedTextRomanized.toLowerCase() : '';
      const officialDocType = doc.officialDocType ? doc.officialDocType.toLowerCase() : '';
      const paperType = doc.paperType ? doc.paperType.toLowerCase() : '';
      const categoryText = doc.category ? doc.category.toLowerCase() : '';
      const storageName = doc.storageName ? doc.storageName.toLowerCase() : '';
      const allText = `${title} ${titleHindi} ${titleRomanized} ${extractedText} ${extractedTextHindi} ${extractedTextRomanized} ${officialDocType} ${paperType} ${categoryText} ${storageName}`;
      if (title === searchLower) score += 200;
      if (titleHindi === searchLower) score += 200;
      if (titleRomanized === searchLower) score += 180;
      if (title.includes(searchLower)) score += 100;
      if (titleHindi.includes(searchLower)) score += 100;
      if (titleRomanized.includes(searchLower)) score += 90;
      if (officialDocType.includes(searchLower)) score += 120;
      if (paperType.includes(searchLower)) score += 120;
      if (categoryText.includes(searchLower)) score += 60;
      if (storageName.includes(searchLower)) score += 70;
      for (const variant of variants) {
        const lowerVariant = variant.toLowerCase();
        if (lowerVariant.length < 2) continue;
        if (title.includes(lowerVariant)) score += 80;
        if (titleHindi.includes(lowerVariant)) score += 80;
        if (titleRomanized.includes(lowerVariant)) score += 70;
        if (extractedText.includes(lowerVariant)) score += 50;
        if (extractedTextHindi.includes(lowerVariant)) score += 50;
        if (extractedTextRomanized.includes(lowerVariant)) score += 40;
        if (officialDocType.includes(lowerVariant)) score += 90;
        if (paperType.includes(lowerVariant)) score += 90;
        if (categoryText.includes(lowerVariant)) score += 40;
        if (storageName.includes(lowerVariant)) score += 50;
        const occurrences = (allText.match(new RegExp(lowerVariant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        score += occurrences * 10;
      }
      if (doc.keywords && doc.keywords.some(k => k && k.includes(searchLower))) score += 30;
      if (doc.keywordsHindi && doc.keywordsHindi.some(k => k && k.includes(searchLower))) score += 30;
      if (doc.keywordSynonyms && doc.keywordSynonyms.some(s => s && s.includes(searchLower))) score += 20;
      if (doc.keywordSynonymsHindi && doc.keywordSynonymsHindi.some(s => s && s.includes(searchLower))) score += 20;
      if (doc.searchTerms && doc.searchTerms.some(t => t && t.includes(searchLower))) score += 15;
      if (doc.searchTermsHindi && doc.searchTermsHindi.some(t => t && t.includes(searchLower))) score += 15;
      if (doc.searchTermsRomanized && doc.searchTermsRomanized.some(t => t && t.includes(searchLower))) score += 10;
      const words = searchLower.split(/\s+/);
      if (words.length > 1) {
        let phraseMatchCount = 0;
        for (const word of words) {
          if (word.length > 2 && allText.includes(word)) phraseMatchCount++;
        }
        if (phraseMatchCount === words.length) score += 60;
        else if (phraseMatchCount >= words.length * 0.6) score += 30;
        if (allText.includes(searchLower)) score += 80;
      }
      docObj.relevanceScore = score;
      return docObj;
    });
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const filteredResults = results.filter(doc => doc.relevanceScore > 0);
    return res.status(200).json(filteredResults.length > 0 ? filteredResults : results.slice(0, 50));
  } catch (error) {
    console.error("Search endpoint error:", error);
    try {
      const { query } = req.query;
      const filter = {};
      if (req.query.category) filter.category = req.query.category;
      if (req.query.branch) filter.branch = req.query.branch;
      if (req.query.semester) filter.semester = req.query.semester;
      if (req.query.year) filter.year = req.query.year;
      const isHindi = detectLanguage(query || '') === 'hi';
      const variants = isHindi ? generateHindiSearchVariants(query || '') : generateEnglishSearchVariants(query || '');
      const conditions = [];
      for (const variant of variants) {
        const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (escaped.length > 0) {
          conditions.push({ title: { $regex: escaped, $options: "i" } });
          conditions.push({ titleHindi: { $regex: escaped, $options: "i" } });
          conditions.push({ extractedText: { $regex: escaped, $options: "i" } });
          conditions.push({ extractedTextHindi: { $regex: escaped, $options: "i" } });
          conditions.push({ officialDocType: { $regex: escaped, $options: "i" } });
          conditions.push({ paperType: { $regex: escaped, $options: "i" } });
          conditions.push({ category: { $regex: escaped, $options: "i" } });
          conditions.push({ storageName: { $regex: escaped, $options: "i" } });
        }
      }
      const fallback = await Document.find({
        $or: conditions.length > 0 ? conditions : [{ title: { $regex: query || '', $options: "i" } }],
        ...filter
      }).sort({ createdAt: -1 }).limit(50);
      return res.status(200).json(fallback);
    } catch (fallbackError) {
      return res.status(500).json({ message: "Search failed", error: error.message });
    }
  }
});
app.get("/api/documents/:id", authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found." });
    }
    return res.status(200).json(doc);
  } catch (error) {
    console.error("Get document error:", error);
    return res.status(500).json({ message: "Server error while fetching document." });
  }
});
app.put("/api/documents/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, category, docDate, year, semester, branch, paperType, officialDocType } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found." });
    }
    if (title !== undefined && title !== doc.title) {
      doc.title = title;
      const lang = detectLanguage(title);
      if (lang === 'hi') {
        doc.titleHindi = title;
      }
      doc.titleRomanized = romanizeHindi(title);
    }
    if (category !== undefined) doc.category = category;
    if (docDate !== undefined) doc.docDate = docDate;
    if (year !== undefined) doc.year = year;
    if (semester !== undefined) doc.semester = semester;
    if (branch !== undefined) doc.branch = branch;
    if (paperType !== undefined) doc.paperType = paperType;
    if (officialDocType !== undefined) doc.officialDocType = officialDocType;
    const metaBlob = [doc.title, doc.officialDocType, doc.paperType, doc.category, doc.storageName].filter(Boolean).join(' ');
    const metaBlobRomanized = romanizeHindi(metaBlob);
    if (doc.extractedText) {
      doc.extractedTextRomanized = romanizeHindi(doc.extractedText);
      doc.textContentRomanized = `${doc.titleRomanized} ${doc.extractedTextRomanized} ${metaBlobRomanized}`.trim();
      doc.searchTermsRomanized = getUniqueWords(`${doc.extractedTextRomanized} ${metaBlobRomanized}`).slice(0, 1000);
      doc.keywords = getUniqueWords(`${doc.extractedText} ${metaBlob}`).slice(0, 200);
      doc.keywordSynonyms = generateEnglishSearchVariants(`${doc.extractedText} ${metaBlob}`);
    } else {
      doc.textContentRomanized = metaBlobRomanized;
      doc.searchTermsRomanized = getUniqueWords(metaBlobRomanized).slice(0, 1000);
      doc.keywords = getUniqueWords(metaBlob).slice(0, 200);
      doc.keywordSynonyms = generateEnglishSearchVariants(metaBlob);
    }
    doc.searchTerms = getUniqueWords(`${doc.title} ${doc.extractedText || ''} ${metaBlob}`).slice(0, 1000);
    doc.textContent = `${doc.title} ${doc.extractedText || ''} ${metaBlob}`.trim();
    if (doc.extractedText) {
      const textLang = detectLanguage(doc.extractedText);
      if (textLang === 'hi' || detectLanguage(doc.title) === 'hi') {
        doc.language = 'hi';
        doc.extractedTextHindi = doc.extractedText;
        doc.textContentHindi = `${doc.title} ${doc.extractedText} ${metaBlob}`.trim();
        doc.searchTermsHindi = getUniqueWords(`${doc.extractedText} ${metaBlob}`).slice(0, 1000);
        doc.keywordsHindi = getUniqueWords(`${doc.extractedText} ${metaBlob}`).slice(0, 200);
        doc.keywordSynonymsHindi = generateHindiSearchVariants(`${doc.extractedText} ${metaBlob}`);
        if (doc.titleHindi) {
          doc.textContentHindi = `${doc.titleHindi} ${doc.extractedText} ${metaBlob}`.trim();
        }
      }
    }
    await doc.save();
    return res.status(200).json({ message: "Document updated successfully.", doc });
  } catch (error) {
    console.error("Update document error:", error);
    return res.status(500).json({ message: "Server error while updating document." });
  }
});
app.delete("/api/documents/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found." });
    }
    if (doc.storageName) {
      const filePath = path.join(uploadDir, doc.storageName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await Document.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Resource removed successfully." });
  } catch (error) {
    console.error("Delete document error:", error);
    return res.status(500).json({ message: "Server error while deleting document." });
  }
});
app.post("/api/history", authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Missing history details." });
    }
    const newHistory = new History({
      email: req.user.email,
      title
    });
    await newHistory.save();
    return res.status(201).json({ message: "History logged successfully." });
  } catch (error) {
    console.error("History save error:", error);
    return res.status(500).json({ message: "Server error while saving history." });
  }
});
app.get("/api/history/:email", authenticateToken, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    if (req.user.email !== email) {
      return res.status(403).json({ message: "Unauthorized action." });
    }
    const logs = await History.find({ email }).sort({ timestamp: -1 });
    return res.status(200).json(logs);
  } catch (error) {
    console.error("History fetch error:", error);
    return res.status(500).json({ message: "Server error while loading history." });
  }
});
app.delete("/api/history/:email", authenticateToken, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    if (req.user.email !== email) {
      return res.status(403).json({ message: "Unauthorized action." });
    }
    await History.deleteMany({ email });
    return res.status(200).json({ message: "History cleared successfully." });
  } catch (error) {
    console.error("History clear error:", error);
    return res.status(500).json({ message: "Server error while clearing history." });
  }
});
app.post("/api/documents/reindex", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const docs = await Document.find({});
    let reindexedCount = 0;
    let errors = [];
    for (const doc of docs) {
      if (doc.storageName) {
        const filePath = path.join(uploadDir, doc.storageName);
        if (fs.existsSync(filePath)) {
          try {
            const extractedText = await extractTextFromFile(filePath, doc.fileType);
            if (extractedText) {
              const docData = buildIndexedDocument(
                doc.title,
                extractedText,
                doc.fileUrl,
                doc.fileType,
                doc.uploadedBy,
                doc.category,
                doc.docDate,
                doc.year,
                doc.semester,
                doc.branch,
                doc.paperType,
                doc.officialDocType,
                doc.storageName
              );
              Object.assign(doc, docData);
              await doc.save();
              reindexedCount++;
            }
          } catch (err) {
            errors.push({ id: doc._id, error: err.message });
          }
        }
      }
    }
    return res.status(200).json({
      message: `Re-indexed ${reindexedCount} documents successfully.`,
      total: docs.length,
      reindexed: reindexedCount,
      errors: errors
    });
  } catch (error) {
    console.error("Re-index error:", error);
    return res.status(500).json({ message: "Server error during re-indexing." });
  }
});
app.get("/api/documents/debug", authenticateToken, async (req, res) => {
  try {
    const total = await Document.countDocuments();
    const sample = await Document.find().limit(5);
    const indexes = await Document.collection.indexes();
    return res.json({
      totalDocuments: total,
      sample: sample.map(d => ({ 
        title: d.title,
        titleHindi: d.titleHindi,
        titleRomanized: d.titleRomanized,
        hasExtractedText: !!d.extractedText,
        hasExtractedTextHindi: !!d.extractedTextHindi,
        hasExtractedTextRomanized: !!d.extractedTextRomanized,
        extractedTextLength: d.extractedText ? d.extractedText.length : 0,
        extractedTextHindiLength: d.extractedTextHindi ? d.extractedTextHindi.length : 0,
        extractedTextRomanizedLength: d.extractedTextRomanized ? d.extractedTextRomanized.length : 0,
        language: d.language,
        category: d.category,
        keywordsCount: d.keywords ? d.keywords.length : 0,
        keywordsHindiCount: d.keywordsHindi ? d.keywordsHindi.length : 0,
        keywordSynonymsCount: d.keywordSynonyms ? d.keywordSynonyms.length : 0,
        keywordSynonymsHindiCount: d.keywordSynonymsHindi ? d.keywordSynonymsHindi.length : 0
      })),
      indexes: indexes.map(i => ({ 
        name: i.name, 
        key: i.key,
        isTextIndex: i.textIndexVersion ? true : false
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File is too large. Maximum size is 50MB." });
    }
    return res.status(400).json({ message: error.message });
  }
  return res.status(500).json({
    message: error.message || "Server error."
  });
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});