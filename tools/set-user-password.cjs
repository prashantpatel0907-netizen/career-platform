// tools/set-user-password.cjs
// Usage: node tools/set-user-password.cjs user@example.com NewPassword123
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User'); // path relative to backend/tools

const email = process.argv[2];
const plain = process.argv[3];

if (!email || !plain) {
  console.error('Usage: node tools/set-user-password.cjs <email> <newPassword>');
  process.exit(1);
}

async function main() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('Error: MONGODB_URI not set in .env');
      process.exit(2);
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error('User not found:', email);
      process.exit(3);
    }

    const hashed = await bcrypt.hash(plain, 10);
    // write hashed password to field `password` (what auth.js expects)
    user.password = hashed;
    await user.save();

    console.log(`Password updated for user: ${user._id} email: ${user.email}`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err && err.stack ? err.stack : err);
    process.exit(4);
  }
}

main();
