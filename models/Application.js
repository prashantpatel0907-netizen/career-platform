// backend/models/Application.js
const mongoose = require("mongoose");
const Schema = new mongoose.Schema({
  jobId: String,
  applicantId: String,
  applicantEmail: String,
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Application", Schema);
