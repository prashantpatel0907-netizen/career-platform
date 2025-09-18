// tools/find-transactions-any-key.cjs
// Usage: node tools\find-transactions-any-key.cjs <WALLET_ID>
// Example: node tools\find-transactions-any-key.cjs 68c16056ee99266b99ef3d9c
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');

async function main(){
  const walletId = process.argv[2];
  if (!walletId) {
    console.error("Usage: node tools\\find-transactions-any-key.cjs <WALLET_ID>");
    process.exit(1);
  }
  try {
    const connectDB = require(path.join(__dirname, '..', 'utils', 'connect'));
    await connectDB();
  } catch (e) {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) { console.error("No MONGODB_URI"); process.exit(1); }
    await mongoose.connect(uri, { useNewUrlParser:true, useUnifiedTopology:true });
  }

  const db = mongoose.connection.db;
  const allCols = (await db.listCollections().toArray()).map(c=>c.name);
  console.log("Collections scanned:", allCols.join(', '));

  const keysToTry = ['walletId','wallet','wallet_id','walletid','walletRef','ownerId','owner','ownerId_str'];
  for (const colName of allCols) {
    try {
      const col = db.collection(colName);
      for (const k of keysToTry) {
        const q = {};
        q[k] = walletId;
        const found = await col.findOne(q);
        if (found) {
          console.log(`\nFound document in collection "${colName}" where ${k} == ${walletId}`);
          const docs = await col.find(q).sort({createdAt:-1}).limit(10).toArray();
          console.log(JSON.stringify(docs, null, 2));
        }
        // also try ObjectId typed match
        try {
          const ObjectId = require('mongodb').ObjectId;
          const q2 = {};
          q2[k] = ObjectId(walletId);
          const found2 = await col.findOne(q2);
          if (found2) {
            console.log(`\nFound (ObjectId) document in collection "${colName}" where ${k} == ObjectId(${walletId})`);
            const docs = await col.find(q2).sort({createdAt:-1}).limit(10).toArray();
            console.log(JSON.stringify(docs, null, 2));
          }
        } catch(e){}
      }
    } catch(e){}
  }
  console.log("\nDone scan.");
  process.exit(0);
}

main().catch(err=>{ console.error(err); process.exit(1); });
