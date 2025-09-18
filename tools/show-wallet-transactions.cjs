// tools/show-wallet-transactions.cjs
// Usage: node tools\show-wallet-transactions.cjs <WALLET_ID>
// Example: node tools\show-wallet-transactions.cjs 68c16056ee99266b99ef3d9c

require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');

async function main() {
  const walletId = process.argv[2];
  if (!walletId) {
    console.error("Usage: node tools\\show-wallet-transactions.cjs <WALLET_ID>");
    process.exit(1);
  }

  // Load your project's connect helper if present to reuse settings
  try {
    // prefer utils/connect if available
    const connectDB = require(path.join(__dirname, '..', 'utils', 'connect'));
    await connectDB();
  } catch (e) {
    // fallback: use MONGODB_URI from .env
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.error("No DB connection helper and no MONGODB_URI in .env. Please set MONGODB_URI.");
      process.exit(1);
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  }

  // Load Transaction model (adjust path if your model name differs)
  let Transaction;
  try {
    Transaction = require(path.join(__dirname, '..', 'models', 'Transaction'));
  } catch (err) {
    // If model file exports a mongoose model object, require returns the model function.
    // If not found, try to define a minimal schema to query the collection.
    console.warn("Could not require models/Transaction, falling back to raw collection query.");
    const db = mongoose.connection.db;
    const docs = await db.collection('transactions').find({ walletId: walletId }).sort({ createdAt: -1 }).toArray();
    console.log(`Found ${docs.length} transaction(s) for wallet ${walletId}:`);
    console.log(JSON.stringify(docs, null, 2));
    process.exit(0);
  }

  // If Transaction is a model, use it
  let docs = [];
  try {
    docs = await Transaction.find({ walletId: walletId }).sort({ createdAt: -1 }).lean().exec();
  } catch (err) {
    // maybe stored as ObjectId references; also try string search
    try {
      docs = await Transaction.find({ walletId: mongoose.Types.ObjectId(walletId) }).sort({ createdAt: -1 }).lean().exec();
    } catch (e2) {
      console.error("Error querying Transaction model:", e2.message || e2);
      process.exit(1);
    }
  }

  console.log(`Found ${docs.length} transaction(s) for wallet ${walletId}:`);
  console.log(JSON.stringify(docs, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error("Script error:", err && (err.stack || err.message || err));
  process.exit(1);
});
