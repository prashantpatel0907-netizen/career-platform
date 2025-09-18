const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: String,
  description: String,
  companyId: String,
  companyName: String,
  salaryMin: Number,
  salaryMax: Number,
  salaryCurrency: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);
