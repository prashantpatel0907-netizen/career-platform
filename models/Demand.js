// models/Demand.js
const mongoose = require("mongoose");

const DemandSchema = new mongoose.Schema({
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer" },
  title: String,
  skills: [String],
  country: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Demand", DemandSchema);
