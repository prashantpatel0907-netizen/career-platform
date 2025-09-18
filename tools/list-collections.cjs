// tools/list-collections.cjs
// Usage: node tools\list-collections.cjs
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');

async function main() {
  // try to reuse utils/connect if present
  try {
    const connectDB = require(path.join(__dirname, '..', 'utils', 'connect'));
    await connectDB();
  } catch (err) {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.error("No connect helper and no MONGODB_URI set in .env");
      process.exit(1);
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  }

  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();
  console.log("Collections in DB:");
  cols.forEach(c => console.log(" -", c.name));

  // show sample from likely collections
  const tryNames = ['transactions','transaction','tx','wallets','wallet','jobs','users','notifications'];
  for (const name of tryNames) {
    try {
      const col = db.collection(name);
      const count = await col.countDocuments();
      if (count === 0) {
        console.log(`\n${name}: (count 0)`);
        continue;
      }
      const docs = await col.find({}).sort({ createdAt: -1 }).limit(5).toArray();
      console.log(`\n${name}: count=${count}, sample up to 5 docs:`);
      console.log(JSON.stringify(docs, null, 2));
    } catch (e) {
      // ignore missing collections
    }
  }

  // also show latest 20 docs across entire DB (dangerous on huge DB; it's safe for demo)
  try {
    console.log("\nSample latest documents from any collection (scanning):");
    for (const c of cols) {
      try {
        const docs = await db.collection(c.name).find({}).sort({ createdAt: -1 }).limit(2).toArray();
        if (docs.length) {
          console.log(`\n== ${c.name} (latest 2) ==`);
          console.log(JSON.stringify(docs, null, 2));
        }
      } catch (err) {}
    }
  } catch (e) {}

  process.exit(0);
}

main().catch(err=>{
  console.error("Error:", err && (err.stack||err.message||err));
  process.exit(1);
});
