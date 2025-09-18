// tools/find-account.cjs
// Usage: node tools/find-account.cjs user@example.com
const connectDB = require("../utils/connect");

async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node tools/find-account.cjs <email>");
    process.exit(1);
  }
  await connectDB();
  console.log("Connected to MongoDB.");

  // Try multiple models
  const models = [
    { name: "User", path: "../models/User" },
    { name: "Employer", path: "../models/Employer" },
    { name: "Worker", path: "../models/Worker" }
  ];

  for (const m of models) {
    try {
      const Model = require(m.path);
      const doc = await Model.findOne({ email: email.toLowerCase() }).lean().exec();
      if (doc) {
        console.log(`\nFound in collection: ${m.name}`);
        console.log(JSON.stringify(doc, null, 2));
      } else {
        console.log(`\nNot found in: ${m.name}`);
      }
    } catch (err) {
      console.warn(`Could not check ${m.name} (module missing?):`, err.message);
    }
  }
  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err && err.message ? err.message : err);
  process.exit(2);
});
