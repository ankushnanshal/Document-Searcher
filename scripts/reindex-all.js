const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eduvault";

async function reindexAll() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    const documentSchema = new mongoose.Schema({
      title: String,
      titleHindi: String,
      titleRomanized: String,
      fileUrl: String,
      fileType: String,
      uploadedBy: String,
      category: String,
      docDate: String,
      year: String,
      semester: String,
      branch: String,
      paperType: String,
      officialDocType: String,
      session: String,
      storageName: String,
      createdAt: Date,
      textContent: String,
      textContentHindi: String,
      textContentRomanized: String,
      extractedText: String,
      extractedTextHindi: String,
      extractedTextRomanized: String,
      language: String,
      pageCount: Number,
      ocrConfidence: Number,
      ocrApplied: Boolean,
      isScanned: Boolean,
      searchTerms: [String],
      searchTermsHindi: [String],
      searchTermsRomanized: [String],
      keywords: [String],
      keywordsHindi: [String],
      keywordsRomanized: [String],
      keywordSynonyms: [String],
      keywordSynonymsHindi: [String],
      embedding: [Number],
      processingStatus: String,
      processingError: String,
      pageTexts: [String]
    });
    
    const Document = mongoose.model('Document', documentSchema);
    const docs = await Document.find({});
    console.log(`Found ${docs.length} documents to re-index`);
    
    let processed = 0;
    for (const doc of docs) {
      processed++;
      console.log(`Processing ${processed}/${docs.length}: ${doc.title}`);
      
      try {
        const text = doc.extractedText || doc.textContent || '';
        if (text && text.length > 100) {
          console.log(`   - Text length: ${text.length} characters`);
        }
        if (doc.extractedTextHindi) {
          console.log(`   - Has Hindi text: ${doc.extractedTextHindi.length} characters`);
        }
        if (doc.keywords && doc.keywords.length > 0) {
          console.log(`   - Keywords: ${doc.keywords.slice(0, 5).join(', ')}`);
        }
        if (doc.ocrApplied) {
          console.log(`   - OCR Applied: ${doc.ocrConfidence}% confidence`);
        }
        if (doc.isScanned) {
          console.log(`   - Scanned document`);
        }
      } catch (e) {
        console.log(`   - Error processing: ${e.message}`);
      }
    }
    
    console.log('\n✅ Re-indexing complete!');
    console.log(`   Total documents: ${docs.length}`);
    console.log(`   Documents with embedding: ${docs.filter(d => d.embedding && d.embedding.length > 0).length}`);
    console.log(`   Documents with OCR: ${docs.filter(d => d.ocrApplied).length}`);
    console.log(`   Documents with Hindi text: ${docs.filter(d => d.extractedTextHindi && d.extractedTextHindi.length > 0).length}`);
    
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

reindexAll();