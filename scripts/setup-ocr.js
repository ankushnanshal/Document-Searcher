const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tessdataDir = path.join(__dirname, 'tessdata');

if (!fs.existsSync(tessdataDir)) {
  fs.mkdirSync(tessdataDir, { recursive: true });
}

console.log('🔍 Setting up Tesseract OCR language data...');

const languages = [
  { name: 'Hindi', file: 'hin.traineddata', url: 'https://github.com/tesseract-ocr/tessdata/raw/main/hin.traineddata' },
  { name: 'English', file: 'eng.traineddata', url: 'https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata' }
];

for (const lang of languages) {
  const filePath = path.join(tessdataDir, lang.file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ ${lang.name} data already exists (${sizeMB} MB)`);
  } else {
    console.log(`⬇️ Downloading ${lang.name} data...`);
    try {
      execSync(`curl -L -o "${filePath}" "${lang.url}"`, { stdio: 'pipe' });
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`✅ ${lang.name} data downloaded (${sizeMB} MB)`);
    } catch (e) {
      console.log(`❌ Failed to download ${lang.name} data: ${e.message}`);
      console.log(`   Please download manually from: ${lang.url}`);
      console.log(`   And place it in: ${filePath}`);
    }
  }
}

console.log('\n📁 Checking Tesseract installation...');
try {
  const output = execSync('tesseract --version', { stdio: 'pipe', encoding: 'utf8' });
  const versionMatch = output.match(/tesseract\s+([\d.]+)/i);
  if (versionMatch) {
    console.log(`✅ Tesseract version: ${versionMatch[1]}`);
  } else {
    console.log('✅ Tesseract installed');
  }
} catch (e) {
  console.log('❌ Tesseract not found in PATH');
  console.log('   Please install Tesseract OCR:');
  console.log('   - Ubuntu: sudo apt-get install tesseract-ocr');
  console.log('   - macOS: brew install tesseract');
  console.log('   - Windows: https://github.com/UB-Mannheim/tesseract/wiki');
}

console.log('\n📋 OCR setup complete!');
console.log(`📁 Tessdata directory: ${tessdataDir}`);
console.log('\nℹ️  Note: The Hindi language pack (hin.traineddata) is required for Hindi OCR support.');