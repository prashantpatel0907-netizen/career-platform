// models/AuditLog.js
const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  actorId: { type: String },           // admin id or system id
  actorType: { type: String, default: 'admin' }, // admin, system
  action: { type: String, required: true }, // e.g., 'job.approve'
  targetType: { type: String },       // e.g., 'job', 'ticket', 'user'
  targetId: { type: String },         // target object id
  details: { type: mongoose.Schema.Types.Mixed }, // extra info: reason, payload
  ip: { type: String },
  userAgent: { type: String }
}, { timestamps: true });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
