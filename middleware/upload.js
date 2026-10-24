const multer = require("multer");
const path = require("path");
const { uploadDir } = require("../config/env");

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

module.exports = { upload };