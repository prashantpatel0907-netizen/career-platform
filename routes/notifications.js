const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const jwt = require("jsonwebtoken");

// Simple header admin key
router.post("/admin/create", async (req, res) => {
  const key = req.headers["x-admin-key"];
  if (key !== (process.env.X_ADMIN_KEY || "very-simple-admin-key")) return res.status(403).json({ error: "forbidden" });
  const { ownerId, ownerType, title, message, data } = req.body;
  if (!title || (!ownerId && !ownerType)) return res.status(400).json({ error: "ownerId, ownerType, title required" });
  try {
    const n = await Notification.create({ ownerId, ownerType, title, message, data, read:false, channel:"in-app" });
    res.json({ ok: true, notification: n });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "create-notification failed" });
  }
});
// Add near other handlers in routes/notifications.js
router.post("/mark-all-read", async (req, res) => {
  // require auth header
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Invalid auth header" });
  let user;
  try { user = require("jsonwebtoken").verify(auth.split(" ")[1], process.env.JWT_SECRET || "secret"); } catch(e){ return res.status(401).json({ error: "Invalid auth header" }); }

  try {
    // Mark all notifications for this user as read
    await Notification.updateMany({ $or: [{ ownerId: user.id }, { ownerType: user.role }], read: false }, { $set: { read: true } });
    return res.json({ ok: true });
  } catch (err) {
    console.error("mark-all-read error", err);
    return res.status(500).json({ error: "mark-all-read-failed" });
  }
});

router.get("/", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Invalid auth header" });
  // decode token quickly
  let user;
  try { user = require("jsonwebtoken").verify(auth.split(" ")[1], process.env.JWT_SECRET || "secret"); } catch(e){ return res.status(401).json({ error: "Invalid auth header" }); }
  const notifs = await Notification.find({ $or: [{ ownerId: user.id }, { ownerType: user.role }] }).sort({ createdAt:-1 }).lean();
  res.json({ ok: true, notifications: notifs, unread: notifs.filter(n=>!n.read).length });
});

/**
 * New: mark notification(s) as read
 * POST /api/notifications/mark-read
 * Body: { ids: [id1,id2,...] } OR { id: "..." }
 * Requires Authorization header with Bearer token (same as GET)
 */
router.post("/mark-read", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Invalid auth header" });
  let user;
  try { user = require("jsonwebtoken").verify(auth.split(" ")[1], process.env.JWT_SECRET || "secret"); } catch(e){ return res.status(401).json({ error: "Invalid auth header" }); }

  const { id, ids } = req.body || {};
  const list = Array.isArray(ids) ? ids : (id ? [id] : []);
  if (!list.length) return res.status(400).json({ error: "id or ids required" });

  try {
    // Only mark notifications that belong to this user (ownerId or ownerType)
    const r = await Notification.updateMany(
      { _id: { $in: list }, $or: [{ ownerId: user.id }, { ownerType: user.role }] },
      { $set: { read: true, updatedAt: new Date() } }
    );
    res.json({ ok: true, modifiedCount: r.modifiedCount || r.nModified || 0 });
  } catch (err) {
    console.error("mark-read error", err);
    res.status(500).json({ error: "mark-read-failed" });
  }
});
// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    const id = req.params.id;
    await Notification.updateOne({ _id: id }, { $set: { read: true } });
    return res.json({ ok: true });
  } catch (e) {
    console.error('/api/notifications/:id/read error', e);
    return res.status(500).json({ error: 'mark-read-failed' });
  }
});
function decodeTokenFromHeader(authHeader) {
  if (!authHeader) return null;
  try {
    return jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET || "secret");
  } catch (e) {
    return null;
  }
}
router.put("/:id/read", async (req, res) => {
  try {
    const user = decodeTokenFromHeader(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Invalid auth header" });

    const id = req.params.id;
    const n = await Notification.findOneAndUpdate(
      { _id: id, $or: [{ ownerId: user.id }, { ownerType: user.role }] },
      { $set: { read: true } },
      { new: true }
    ).lean();

    if (!n) return res.status(404).json({ error: "not-found" });
    return res.json({ ok: true, notification: n });
  } catch (err) {
    console.error("PUT /api/notifications/:id/read error", err);
    return res.status(500).json({ error: "mark-read-failed" });
  }
});
router.put("/read-all", async (req, res) => {
  try {
    const user = decodeTokenFromHeader(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Invalid auth header" });

    await Notification.updateMany(
      { $or: [{ ownerId: user.id }, { ownerType: user.role }] },
      { $set: { read: true } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/notifications/read-all error", err);
    return res.status(500).json({ error: "mark-all-read-failed" });
  }
});
module.exports = router;
