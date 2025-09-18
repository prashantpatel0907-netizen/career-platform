// models/Worker.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const WorkerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  fullName: String,
  country: String,
  skills: [String]
}, { timestamps: true });

module.exports = mongoose.models.Worker || mongoose.model('Worker', WorkerSchema);
