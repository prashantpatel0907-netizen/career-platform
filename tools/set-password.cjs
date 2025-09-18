// tools/set-password.cjs
// Usage: node tools/set-password.cjs user@example.com NewPass123
const connectDB = require("../utils/connect");
const bcrypt = require("bcryptjs");

const email = process.argv[2];
const newPass = process.argv[3];
if (!email || !newPass) {
  console.error("Usage: node tools/set-password.cjs <email> <newPassword>");
  process.exit(1);
}

(async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    // Try Employer -> Worker -> User (order of precedence)
    const tryModels = ["../models/Employer", "../models/Worker", "../models/User"];
    let updated = false;

    for (const mPath of tryModels) {
      try {
        const M = require(mPath);
        const doc = await M.findOne({ email: email.toLowerCase() });
        if (doc) {
          const hash = await bcrypt.hash(newPass, 10);
          // set both common field names to be safe
          doc.password = hash;
          doc.passwordHash = hash;
          // you may optionally set other fields if your login code expects them:
          // doc.hash = hash; doc.pw = hash;
          await doc.save();
          console.log(`Password updated in ${mPath} for ${email}.`);
          updated = true;
          break;
        }
      } catch (err) {
        console.warn(`Skipping ${mPath}: ${err.message}`);
      }
    }

    if (!updated) {
      console.error("Account not found in Employer/Worker/User models.");
      process.exit(2);
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err && err.message ? err.message : err);
    process.exit(3);
  }
})();
