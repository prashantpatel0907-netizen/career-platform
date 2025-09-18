const mongoose = require("mongoose");
const { Schema } = mongoose;
const WalletSchema = new Schema({
  ownerId: Schema.Types.ObjectId,
  ownerType: String,
  balance: { type: Number, default: 0 },
  currency: { type: String, default: "USD" }
}, { timestamps: true });
module.exports = mongoose.model("Wallet", WalletSchema);
