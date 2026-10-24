const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { MONGO_URI } = require("./env");
const {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  FACULTY_ROLES,
  DEMO_USERS,
  ADMIN_EMAILS,
  STAFF_BY_EMAIL
} = require("./constants");

mongoose.connect(MONGO_URI).then(async () => {
  console.log("MongoDB connected");
  await migrateLegacyData();
  await createTextIndexes();
  await seedDemoUsers();
}).catch(err => console.error("MongoDB error:", err.message));

async function migrateLegacyData() {
  try {
    const db = mongoose.connection.db;
    const docsResult = await db.collection('documents').updateMany(
      { $or: [{ status: { $exists: false } }, { status: null }, { status: "" }] },
      { $set: { status: "published" } }
    );
    if (docsResult.modifiedCount > 0) {
      console.log(`Migrated ${docsResult.modifiedCount} legacy documents to published`);
    }
    if (ADMIN_EMAILS.length > 0) {
      for (const adminEmail of ADMIN_EMAILS) {
        const adminUser = await db.collection('users').findOne({ email: adminEmail });
        if (adminUser && adminUser.role !== ROLES.ADMIN) {
          await db.collection('users').updateOne(
            { email: adminEmail },
            { $set: { role: ROLES.ADMIN, permissions: ROLE_PERMISSIONS[ROLES.ADMIN], department: null, branch: null } }
          );
          console.log(`Promoted ${adminEmail} to admin`);
        }
      }
    }
    const staffEmails = Array.from(STAFF_BY_EMAIL.keys());
    const demoted = await db.collection('users').updateMany(
      { email: { $nin: staffEmails }, $or: [{ role: { $ne: ROLES.STUDENT } }, { permissions: { $ne: ROLE_PERMISSIONS[ROLES.STUDENT] } }] },
      { $set: { role: ROLES.STUDENT, department: null, branch: null, permissions: ROLE_PERMISSIONS[ROLES.STUDENT] } }
    );
    if (demoted.modifiedCount > 0) {
      console.log(`Reset ${demoted.modifiedCount} non-staff accounts to student`);
    }
    const usersToFix = await db.collection('users').find({
      role: { $in: FACULTY_ROLES }
    }).toArray();
    for (const user of usersToFix) {
      const expectedPerms = ROLE_PERMISSIONS[user.role] || [];
      const currentPerms = user.permissions || [];
      if (!currentPerms.includes(PERMISSIONS.CREATE_DOCUMENT) || !currentPerms.includes(PERMISSIONS.MANAGE_DRAFTS)) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { permissions: expectedPerms } }
        );
      }
    }
    await db.collection('documents').updateMany(
      { department: { $exists: false } },
      { $set: { department: null } }
    );
    const orphanDocs = await db.collection('documents').updateMany(
      {
        $and: [
          { $or: [ { branch: "All Branches" }, { branch: "" }, { branch: null } ] },
          { department: { $ne: null } }
        ]
      },
      { $set: { department: null } }
    );
    if (orphanDocs.modifiedCount > 0) {
      console.log(`Cleared department on ${orphanDocs.modifiedCount} All-Branches documents`);
    }
  } catch (e) {
    console.log("Legacy migration warning:", e.message);
  }
}

async function createTextIndexes() {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('documents');
    const existingIndexes = await collection.indexes();
    const textIndex = existingIndexes.find(idx => idx.key && idx.key._fts === "text");
    if (textIndex) {
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
        textContentRomanized: "text",
        officialDocType: "text",
        paperType: "text",
        branch: "text",
        year: "text",
        semester: "text",
        session: "text",
        department: "text"
      },
      {
        weights: {
          title: 15, titleHindi: 15, titleRomanized: 12,
          officialDocType: 10, paperType: 8,
          extractedText: 5, extractedTextHindi: 5, extractedTextRomanized: 4,
          textContent: 3, textContentHindi: 3, textContentRomanized: 2,
          branch: 5, year: 4, semester: 4, session: 3, department: 6
        },
        name: "document_text_search_v4"
      }
    );
    console.log("Text indexes created");
  } catch (e) {
    console.log("Text index warning:", e.message);
  }
}

async function seedDemoUsers() {
  try {
    const User = mongoose.model("User");
    for (const userData of DEMO_USERS) {
      const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = new User({
          name: userData.name,
          email: userData.email.toLowerCase(),
          password: hashedPassword,
          role: userData.role,
          department: userData.department,
          branch: userData.branch || null,
          permissions: userData.permissions
        });
        await user.save();
        console.log(`Seeded demo user: ${userData.email}`);
      } else {
        const expectedPerms = ROLE_PERMISSIONS[userData.role] || [];
        const currentPerms = existingUser.permissions || [];
        if (!currentPerms.includes(PERMISSIONS.MANAGE_DRAFTS) ||
            !currentPerms.includes(PERMISSIONS.CREATE_DOCUMENT) ||
            existingUser.department !== userData.department) {
          existingUser.permissions = expectedPerms;
          existingUser.role = userData.role;
          existingUser.department = userData.department;
          existingUser.branch = userData.branch || null;
          await existingUser.save();
          console.log(`Updated permissions for: ${userData.email}`);
        }
      }
    }
  } catch (error) {
    console.error("Seed error:", error.message);
  }
}

module.exports = {};