const multer = require("multer");

module.exports = function errorHandler(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message: error.code === "LIMIT_FILE_SIZE" ? "File is too large. Maximum size is 50MB." : error.message
    });
  }
  res.status(500).json({ message: error.message || "Server error." });
};