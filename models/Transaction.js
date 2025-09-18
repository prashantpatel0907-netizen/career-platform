const mongoose = require('mongoose');
const s = new mongoose.Schema({
  walletId: String,
  ownerId: String,
  ownerType: String,
  type: String,
  amount: Number,
  currency: String,
  status: String,
  reason: String
}, { timestamps: true });
module.exports = mongoose.models.Transaction || mongoose.model('Transaction', s);
