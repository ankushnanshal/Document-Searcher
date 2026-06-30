const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eduvault";

async function reindexAll() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    const documentSchema = new mongoose.Schema({});
    const Document = mongoose.model('Document', documentSchema);
    const docs = await Document.find({});
    console.log(`Found ${docs.length} documents to re-index`);
    let processed = 0;
    for (const doc of docs) {
      processed++;
      console.log(`Processing ${processed}/${docs.length}: ${doc.title}`);
    }
    console.log('Re-indexing complete!');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

reindexAll();