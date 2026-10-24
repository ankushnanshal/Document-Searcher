const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const exec = promisify(require("child_process").exec);
const PDFParser = require("pdf2json");
const pdfParse = require("pdf-parse");
const sharp = require("sharp");
const env = require("../config/env");
const { normalizeText } = require("../utils/textUtils");

function preprocessImage(imagePath) {
  return new Promise((resolve) => {
    try {
      const outputPath = imagePath.replace(/(\.[^.]+)$/, '_processed$1');
      sharp(imagePath).greyscale().normalize().sharpen().threshold(128).toFile(outputPath).then(() => resolve(outputPath)).catch(() => resolve(imagePath));
    } catch (e) { resolve(imagePath); }
  });
}

async function checkTesseractLangs() {
  try {
    const { stdout, stderr } = await exec(`tesseract --list-langs`);
    const output = `${stdout || ""}\n${stderr || ""}`;
    return output.split("\n").map(line => line.trim()).filter(line => line && !line.toLowerCase().startsWith("list of"));
  } catch (e) { return []; }
}

async function ocrImage(imagePath, lang = 'eng') {
  const availableLangs = await checkTesseractLangs();
  const hasHindi = availableLangs.includes('hin');
  const langOption = hasHindi && lang === 'hi' ? 'hin+eng' : 'eng';
  const outputPath = path.join(env.tempDir, `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  try {
    const processedPath = await preprocessImage(imagePath);
    const { stdout, stderr } = await exec(`tesseract "${processedPath}" "${outputPath}" -l ${langOption} --psm 6 --oem 3 --dpi ${env.OCR_DPI} 2>&1`);
    const resultPath = `${outputPath}.txt`;
    let text = '';
    if (fs.existsSync(resultPath)) {
      text = fs.readFileSync(resultPath, 'utf8');
      fs.unlinkSync(resultPath);
    }
    if (processedPath !== imagePath && fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
    const confidenceMatch = stderr.match(/confidence = (\d+\.?\d*)/i);
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 60;
    return { text: text.trim(), confidence };
  } catch (e) { return { text: '', confidence: 0 }; }
}

async function ocrImageWithRetry(imagePath, lang = 'eng', attempts = env.OCR_RETRY_ATTEMPTS) {
  let lastResult = { text: '', confidence: 0 };
  for (let i = 0; i < attempts; i++) {
    const result = await ocrImage(imagePath, lang);
    lastResult = result;
    if (result.text && result.text.length > 20 && result.confidence >= 50) return result;
    if (i < attempts - 1) await new Promise(resolve => setTimeout(resolve, 1000));
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
                      if (line.T) pageText += decodeURIComponent(line.T) + ' ';
                    }
                  }
                }
              }
              if (pageText.trim()) { pages.push(pageText.trim()); text += pageText + ' '; }
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
        return { text: stdout, pageTexts, ocrApplied: false, isScanned: false, ocrConfidence: 85, totalPages: totalPages || 1 };
      }
    }
  } catch (e) {}
  try {
    const tempPdfDir = path.join(env.tempDir, `pdf_ocr_${Date.now()}`);
    if (!fs.existsSync(tempPdfDir)) fs.mkdirSync(tempPdfDir, { recursive: true });
    await exec(`pdftoppm -png -r ${env.OCR_DPI} "${filePath}" "${path.join(tempPdfDir, 'page')}"`);
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
          if (processedPath !== pagePath && fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
        } catch (e) {}
        if (fs.existsSync(pagePath)) fs.unlinkSync(pagePath);
      }
      if (fs.existsSync(tempPdfDir)) fs.rmdirSync(tempPdfDir, { recursive: true });
      if (combinedText.trim()) {
        ocrApplied = true; isScanned = true;
        ocrConfidence = pageCount > 0 ? totalConfidence / pageCount : 60;
        return { text: combinedText.trim(), pageTexts: pageTextsOcr, ocrApplied, isScanned, ocrConfidence, totalPages: pageCount };
      }
    }
    if (fs.existsSync(tempPdfDir)) fs.rmdirSync(tempPdfDir, { recursive: true });
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
  } catch (e) { return { text: '', confidence: 0, ocrApplied: false }; }
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
  } catch (e) { return ''; }
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
    }
  } catch (e) { result.text = ''; }
  return result;
}

module.exports = {
  preprocessImage,
  checkTesseractLangs,
  ocrImage,
  ocrImageWithRetry,
  extractPDFText,
  extractImageText,
  extractWordText,
  extractExcelText,
  extractPowerPointText,
  extractTextFile,
  extractFileContent
};