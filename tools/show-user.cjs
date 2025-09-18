// backend/tools/show-user.cjs
// Usage: node tools/show-user.cjs user@example.com

require("dotenv").config();   // 👈 this loads .env so MONGODB_URI is available
const connectDB = require("../utils/connect");
const User = require("../models/User"); // adjust if filename is different

const email = process.argv[2];
if (!email) {
  console.error("Usage: node tools/show-user.cjs <email>");
  process.exit(1);
}

(async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");
    const u = await User.findOne({ email: email.toLowerCase() }).lean().exec();
    if (!u) {
      console.error("User not found:", email);
      process.exit(2);
    }
    console.log("User document:");
    console.log(JSON.stringify(u, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Error:", err && err.message ? err.message : err);
    process.exit(3);
  }
})();
