// routes/employer_jobs.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Job = require('../models/Job'); // assume exists

// Helper to get user id from Authorization header if present
function getUserIdFromAuth(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  try {
    const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET || 'secret');
    return payload.id;
  } catch (e) {
    return null;
  }
}

// POST /api/employer/jobs
// Body: { title, description, companyName, salaryMin?, salaryMax?, salaryCurrency?, ownerId? }
router.post('/', async (req, res) => {
  try {
    const userIdFromAuth = getUserIdFromAuth(req);
    const { title, description, companyName, salaryMin, salaryMax, salaryCurrency, ownerId } = req.body || {};
    const owner = ownerId || userIdFromAuth;
    if (!owner) return res.status(401).json({ error: 'ownerId or Authorization required' });
    if (!title || !description) return res.status(400).json({ error: 'title and description required' });

    const job = await Job.create({
      title,
      description,
      companyName: companyName || '',
      salaryMin: salaryMin || null,
      salaryMax: salaryMax || null,
      salaryCurrency: salaryCurrency || 'USD',
      companyId: owner,
      companyName: companyName || '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.json({ ok: true, job });
  } catch (err) {
    console.error('POST /api/employer/jobs error', err && (err.stack || err));
    return res.status(500).json({ error: 'job-create-failed' });
  }
});

// GET /api/employer/jobs?ownerId=...
router.get('/', async (req, res) => {
  try {
    const userIdFromAuth = getUserIdFromAuth(req);
    const owner = req.query.ownerId || userIdFromAuth;
    const q = {};
    if (owner) q.companyId = owner;
    // optionally filter isActive via ?active=true
    if (req.query.active) q.isActive = String(req.query.active) === 'true';
    const list = await Job.find(q).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, jobs: list });
  } catch (err) {
    console.error('GET /api/employer/jobs error', err && (err.stack || err));
    return res.status(500).json({ error: 'jobs-list-failed' });
  }
});

// DELETE /api/employer/jobs/:id
router.delete('/:id', async (req, res) => {
  try {
    const jobId = req.params.id;
    const userIdFromAuth = getUserIdFromAuth(req);
    if (!userIdFromAuth) return res.status(401).json({ error: 'Authorization required' });

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'job-not-found' });
    // Only companyId owner can delete
    if (String(job.companyId) !== String(userIdFromAuth)) return res.status(403).json({ error: 'forbidden' });

    await Job.deleteOne({ _id: jobId });
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/employer/jobs/:id error', err && (err.stack || err));
    return res.status(500).json({ error: 'job-delete-failed' });
  }
});

module.exports = router;
