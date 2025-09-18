// routes/employer_analytics.js
// CommonJS route - uses existing models (Job, Wallet, Application) from your backend
// Adapt field names if your models differ.

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const Job = require('../models/Job');         // adjust path if your model names differ
const Application = require('../models/Application'); // candidate applications
const Wallet = require('../models/Wallet');   // wallet model

// Middleware: simple auth expecting Authorization Bearer <jwt> and sets req.user (reuse your existing auth middleware)
// If you have a shared middleware file, replace inline logic with 'require("../middleware/auth")'
const auth = require('../middleware/auth'); // reuse your middleware (should set req.user)

router.get('/', auth, async (req, res) => {
  try {
    // ensure only employers can access employer analytics
    if (!req.user || req.user.role !== 'employer') {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    const employerId = req.user.id;

    // Jobs posted by this employer
    const jobsCount = await Job.countDocuments({ companyId: ObjectId(employerId) }).catch(()=>0);

    // Active jobs
    const activeJobsCount = await Job.countDocuments({ companyId: ObjectId(employerId), isActive: true }).catch(()=>0);

    // Applicants across employer's jobs
    // We assume Application model stores jobId reference and status fields
    const applicationsAgg = await Application.aggregate([
      { $match: { employerId: ObjectId(employerId) } }, // if your app stores employerId; otherwise match jobIds
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).catch(()=>[]);

    // Convert aggregation into object map
    const applicationsByStatus = {};
    applicationsAgg.forEach(a => { applicationsByStatus[a._id || 'unknown'] = a.count; });

    // Hires count — if your application model has status 'hired'
    const hires = applicationsByStatus['hired'] || 0;

    // Wallet balance
    const wallet = await Wallet.findOne({ ownerId: ObjectId(employerId), ownerType: 'employer' }).lean().catch(()=>null);
    const balance = wallet ? wallet.balance : 0;

    // Basic timeline sample: jobs created per country (top 5)
    const jobsByCountry = await Job.aggregate([
      { $match: { companyId: ObjectId(employerId) } },
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).catch(()=>[]);

    res.json({
      ok: true,
      stats: {
        jobsCount,
        activeJobsCount,
        hires,
        applicationsByStatus,
        balance,
        jobsByCountry
      }
    });
  } catch (err) {
    console.error("employer analytics error", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, error: 'analytics-failed' });
  }
});

module.exports = router;
