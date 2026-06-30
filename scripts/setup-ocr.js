const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tessdataDir = path.join(__dirname, '..', 'tessdata');

if (!fs.existsSync(tessdataDir)) {
  fs.mkdirSync(tessdataDir, { recursive: true });
}

console.log('Setting up Tesseract OCR language data...');

const languages = [
  { name: 'Hindi', file: 'hin.traineddata', url: 'https://github.com/tesseract-ocr/tessdata/raw/main/hin.traineddata' },
  { name: 'English', file: 'eng.traineddata', url: 'https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata' }
];

for (const lang of languages) {
  const filePath = path.join(tessdataDir, lang.file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${lang.name} data already exists`);
  } else {
    console.log(`⬇️ Downloading ${lang.name} data...`);
    try {
      execSync(`curl -L -o "${filePath}" "${lang.url}"`, { stdio: 'pipe' });
      console.log(`✅ ${lang.name} data downloaded`);
    } catch (e) {
      console.log(`❌ Failed to download ${lang.name} data: ${e.message}`);
      console.log(`   Please download manually from: ${lang.url}`);
    }
  }
}

console.log('OCR setup complete!');
console.log(`Tessdata directory: ${tessdataDir}`);