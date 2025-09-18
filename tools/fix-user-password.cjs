// backend/tools/fix-user-password.cjs
// Usage: node tools/fix-user-password.cjs user@example.com NewPassword123

const connectDB = require("../utils/connect");
const User = require("../models/User"); // <<-- adjust if your model file name is different (user.js vs User.js)
const bcrypt = require("bcryptjs");

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error("Usage: node tools/fix-user-password.cjs <email> <newPassword>");
  process.exit(1);
}

(async () => {
  try {
    // connect to DB (uses same connect helper your server uses)
    await connectDB();
    console.log("Connected to DB");

    const hashed = await bcrypt.hash(newPassword, 10);
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { password: hashed } },
      { new: true }
    ).exec();

    if (!user) {
      console.error("User not found:", email);
      process.exit(2);
    }

    console.log("Password updated for user:", user._id.toString(), "email:", user.email);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err && err.message ? err.message : err);
    process.exit(3);
  }
})();
