// tools/make-jwt.cjs
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;
const secret = process.env.JWT_SECRET || "change_this_jwt_secret";

if (!MONGODB_URI) {
  console.error("MONGODB_URI missing in .env");
  process.exit(1);
}

async function main(){
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB for make-jwt.");
  // try workers first, else employers
  const Worker = mongoose.model("workers", new mongoose.Schema({}, { strict:false }), "workers");
  const Employer = mongoose.model("employers", new mongoose.Schema({}, { strict:false }), "employers");
  let user = await Worker.findOne({});
  let role = "worker";
  if (!user) {
    user = await Employer.findOne({});
    role = "employer";
  }
  if (!user) {
    console.error("No seeded users found. Run seed-users.cjs first.");
    process.exit(1);
  }
  const payload = { id: user._id.toString(), role: user.role || role, email: user.email || (user.username||"demo@local") };
  const token = jwt.sign(payload, secret, { expiresIn: "7d" });
  console.log("Sample user (from DB):", { _id: user._id.toString(), email: payload.email, role: payload.role });
  console.log("JWT:\n" + token);
  await mongoose.disconnect();
  process.exit(0);
}
main().catch(e=>{ console.error(e); process.exit(1); });
