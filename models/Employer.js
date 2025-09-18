// models/Employer.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const EmployerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  companyName: String,
  contactName: String,
  country: String
}, { timestamps: true });

module.exports = mongoose.models.Employer || mongoose.model('Employer', EmployerSchema);
