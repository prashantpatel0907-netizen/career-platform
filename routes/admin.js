// routes/admin.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const Job = require('../models/Job');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const AuditLog = (() => {
  try { return require('../models/AuditLog'); } catch(e){ return null; }
})();

// Admin helper: simple header key (same pattern used earlier)
function requireAdminKey(req, res) {
  const key = req.headers['x-admin-key'];
  const expected = process.env.X_ADMIN_KEY || 'very-simple-admin-key';
  if (key !== expected) {
    res.status(403).json({ error: 'forbidden' });
    return false;
  }
  return true;
}

/**
 * GET /api/admin/jobs?status=pending
 * List jobs filtered by status (pending/approved/rejected) default pending
 */
router.get('/jobs', async (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const status = req.query.status || 'pending';
    const q = {};
    if (status) q.status = status;
    const list = await Job.find(q).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, jobs: list });
  } catch (err) {
    console.error('GET /api/admin/jobs error', err);
    return res.status(500).json({ error: 'jobs-list-failed' });
  }
});

/**
 * POST /api/admin/jobs/:id/approve
 * Approve job (set status 'approved', isActive true)
 */
router.post('/jobs/:id/approve', async (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const id = req.params.id;
    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ error: 'job-not-found' });
    job.status = 'approved';
    job.isActive = true;
    await job.save();

    if (AuditLog) {
      await AuditLog.create({ actorId: 'admin', actorType: 'admin', action: 'job.approve', targetType: 'job', targetId: id, details: { jobTitle: job.title } });
    }
    return res.json({ ok: true, job });
  } catch (err) {
    console.error('POST /api/admin/jobs/:id/approve error', err);
    return res.status(500).json({ error: 'job-approve-failed' });
  }
});

/**
 * POST /api/admin/jobs/:id/reject
 * Body: { reason? }
 */
router.post('/jobs/:id/reject', async (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const id = req.params.id;
    const reason = (req.body && req.body.reason) || 'rejected-by-admin';
    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ error: 'job-not-found' });
    job.status = 'rejected';
    job.isActive = false;
    job.updatedAt = new Date();
    await job.save();

    if (AuditLog) {
      await AuditLog.create({ actorId: 'admin', actorType: 'admin', action: 'job.reject', targetType: 'job', targetId: id, details: { reason, jobTitle: job.title } });
    }
    return res.json({ ok: true, job });
  } catch (err) {
    console.error('POST /api/admin/jobs/:id/reject error', err);
    return res.status(500).json({ error: 'job-reject-failed' });
  }
});

/**
 * GET /api/admin/users?limit=50
 */
router.get('/users', async (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const users = await User.find({}).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ ok: true, users });
  } catch (err) {
    console.error('GET /api/admin/users error', err);
    return res.status(500).json({ error: 'users-list-failed' });
  }
});

/**
 * GET /api/admin/wallets
 */
router.get('/wallets', async (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const wallets = await Wallet.find({}).sort({ updatedAt: -1 }).limit(200).lean();
    return res.json({ ok: true, wallets });
  } catch (err) {
    console.error('GET /api/admin/wallets error', err);
    return res.status(500).json({ error: 'wallets-list-failed' });
  }
});

/**
 * GET /api/admin/transactions
 */
router.get('/transactions', async (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const txs = await Transaction.find({}).sort({ createdAt: -1 }).limit(500).lean();
    return res.json({ ok: true, transactions: txs });
  } catch (err) {
    console.error('GET /api/admin/transactions error', err);
    return res.status(500).json({ error: 'transactions-list-failed' });
  }
});

/**
 * GET /api/admin/stats
 * simple counts
 */
router.get('/stats', async (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const jobsPending = await Job.countDocuments({ status: 'pending' });
    const usersCount = await User.countDocuments({});
    const walletsCount = await Wallet.countDocuments({});
    return res.json({ ok: true, stats: { jobsPending, usersCount, walletsCount } });
  } catch (err) {
    console.error('GET /api/admin/stats error', err);
    return res.status(500).json({ error: 'stats-failed' });
  }
});

module.exports = router;
