// models/Admin.js
const mongoose = require("mongoose");
const AdminSchema = new mongoose.Schema({
  username: String,
  passwordHash: String, // demo only - do not store plain text in prod
  role: { type: String, default: "super" }
});
module.exports = mongoose.model("Admin", AdminSchema);
