const mongoose = require("mongoose");
const { Schema } = mongoose;
const NotificationSchema = new Schema({
  ownerId: Schema.Types.ObjectId,
  ownerType: String,
  title: String,
  message: String,
  data: Schema.Types.Mixed,
  read: { type: Boolean, default: false },
  channel: String
}, { timestamps: true });
module.exports = mongoose.model("Notification", NotificationSchema);
