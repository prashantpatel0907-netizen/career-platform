const mongoose = require('mongoose');
const s = new mongoose.Schema({
  email: String,
  subject: String,
  message: String,
  status: { type: String, default: 'open' }
}, { timestamps: true });
module.exports = mongoose.models.SupportTicket || mongoose.model('SupportTicket', s);
