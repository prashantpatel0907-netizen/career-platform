// tools/set-password-full.cjs
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("../models/User");
const Employer = require("../models/Employer");
const Worker = require("../models/Worker");

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.log("Usage: node tools/set-password-full.cjs <email> <newPassword>");
    process.exit(1);
  }
  const [email, newPass] = argv;
  const mongo = process.env.MONGODB_URI;
  if (!mongo) {
    console.error("MONGODB_URI missing in .env");
    process.exit(1);
  }
  await mongoose.connect(mongo, {});
  console.log("Connected to MongoDB...");
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    console.error("User not found:", email);
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPass, 10);
  user.password = hash;
  await user.save();
  console.log("Updated User password for:", email, "id:", user._id.toString());

  try {
    const emp = await Employer.findOne({ userId: user._id });
    if (emp) {
      emp.password = hash;
      await emp.save();
      console.log("Updated Employer.password (if present)");
    }
  } catch (e) {}

  try {
    const w = await Worker.findOne({ userId: user._id });
    if (w) {
      w.password = hash;
      await w.save();
      console.log("Updated Worker.password (if present)");
    }
  } catch (e) {}

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
