/**
 * routes/applications.js
 * - GET /api/applications[?jobId][?applicantId]
 * - GET /api/applications/:id
 * - POST /api/applications
 * - PATCH /api/applications/:id   -> body: { action: "accept"|"reject", message?: "..." }
 *
 * When employer accepts/rejects an application this will create an in-app notification
 * for the applicant (ownerType = "worker").
 */

const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');

function decodeTokenFromHeader(authHeader) {
  if (!authHeader) return null;
  try { return jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'secret'); }
  catch (e) { return null; }
}

// GET /api/applications?jobId=...&applicantId=...
router.get('/', async (req, res) => {
  try {
    const q = {};
    if (req.query.jobId) q.jobId = req.query.jobId;
    if (req.query.applicantId) q.applicantId = req.query.applicantId;

    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.max(1, parseInt(req.query.limit || '50'));
    const skip = (page - 1) * limit;

    const total = await Application.countDocuments(q);
    const apps = await Application.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    return res.json({ ok: true, total, page, limit, applications: apps });
  } catch (err) {
    console.error('GET /api/applications error', err);
    return res.status(500).json({ error: 'applications-list-failed' });
  }
});

// GET /api/applications/:id
router.get('/:id', async (req, res) => {
  try {
    const a = await Application.findById(req.params.id).lean();
    if (!a) return res.status(404).json({ error: 'application-not-found' });
    return res.json({ ok: true, application: a });
  } catch (err) {
    console.error('GET /api/applications/:id error', err);
    return res.status(500).json({ error: 'application-fetch-failed' });
  }
});

// POST /api/applications
router.post('/', async (req, res) => {
  try {
    const auth = decodeTokenFromHeader(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: 'auth-required' });
    const applicantId = auth.id || auth._id || auth.userId;
    if (!applicantId) return res.status(401).json({ error: 'auth-required' });

    const { jobId, coverLetter = '', expectedSalary = '' } = req.body || {};
    if (!jobId) return res.status(400).json({ error: 'jobId required' });

    const obj = {
      jobId: jobId,
      applicantId: applicantId,
      applicantEmail: auth.email || '',
      coverLetter,
      expectedSalary,
      status: 'applied',
      createdAt: new Date()
    };

    const saved = await Application.create(obj);
    return res.json({ ok: true, application: saved });
  } catch (err) {
    console.error('POST /api/applications error', err);
    return res.status(500).json({ error: 'application-create-failed' });
  }
});

/**
 * PATCH /api/applications/:id
 * body: { action: "accept" | "reject", message?: "optional message to applicant" }
 * - Only admin or the employer who owns the job can accept/reject
 * - On accept/reject, creates an in-app notification for applicant (ownerType: worker)
 */
router.patch('/:id', async (req, res) => {
  try {
    const auth = decodeTokenFromHeader(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: 'auth-required' });

    const userId = auth.id || auth._id || auth.userId;
    const role = auth.role || null;
    const id = req.params.id;
    const { action, message = '' } = req.body || {};

    if (!action || !['accept','reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be accept or reject' });
    }

    const app = await Application.findById(id);
    if (!app) return res.status(404).json({ error: 'application-not-found' });

    // load job to check ownership
    const job = await Job.findById(app.jobId).lean();
    if (!job) return res.status(404).json({ error: 'job-not-found' });

    // permit if admin OR employer who owns the job
    if (!(role === 'admin' || (role === 'employer' && String(job.companyId) === String(userId)))) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const newStatus = (action === 'accept') ? 'accepted' : 'rejected';
    app.status = newStatus;
    app.updatedAt = new Date();
    if (message) app.adminMessage = message;
    await app.save();

    // Create an in-app notification for the applicant
    try {
      await Notification.create({
        ownerId: app.applicantId,
        ownerType: 'worker',
        title: action === 'accept' ? `Application accepted` : `Application rejected`,
        message: message || (action === 'accept' ? `Your application for "${job.title || 'the job'}" was accepted.` : `Your application for "${job.title || 'the job'}" was rejected.`),
        read: false,
        channel: 'in-app',
        createdAt: new Date()
      });
    } catch (nerr) {
      console.error('Failed to create notification', nerr);
    }

    return res.json({ ok: true, application: app.toObject() });
  } catch (err) {
    console.error('PATCH /api/applications/:id error', err);
    return res.status(500).json({ error: 'application-update-failed' });
  }
});

module.exports = router;
