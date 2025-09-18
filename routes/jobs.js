// routes/jobs.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Job = require("../models/Job");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

function decodeAuthHeader(authHeader) {
  if (!authHeader) return null;
  try {
    return jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET || "secret");
  } catch (e) {
    return null;
  }
}

// GET /api/jobs?page=1&limit=10
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const q = {};
    if (req.query.companyId) q.companyId = req.query.companyId;
    const total = await Job.countDocuments(q);
    const jobs = await Job.find(q).skip((page - 1) * limit).limit(limit).lean();
    return res.json({ ok: true, total, page, limit, jobs });
  } catch (err) {
    console.error("GET /api/jobs error", err);
    return res.status(500).json({ error: "jobs-list-failed" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ error: "job-not-found" });
    return res.json({ job });
  } catch (err) {
    console.error("GET /api/jobs/:id error", err);
    return res.status(500).json({ error: "job-fetch-failed" });
  }
});

// Create job (basic create) - POST /api/jobs
router.post("/", async (req, res) => {
  try {
    const job = new Job(req.body);
    await job.save();
    return res.json({ ok: true, job });
  } catch (err) {
    console.error("POST /api/jobs error", err);
    return res.status(500).json({ error: "post-job-failed" });
  }
});

// POST /api/jobs/create  (employer flow with wallet cost)
router.post("/create", async (req, res) => {
  try {
    // try req.auth first, else decode header
    const auth = req.auth || decodeAuthHeader(req.headers.authorization) || {};
    const userId = auth.userId || auth.id || auth._id || null;
    const role = auth.role || null;

    if (!userId || role !== "employer") {
      return res.status(403).json({ error: "only-employers" });
    }

    const cost = 20; // cost to post a job

    // find wallet
    let wallet = await Wallet.findOne({ ownerId: userId });
    if (!wallet || wallet.balance < cost) {
      return res.status(400).json({ error: "insufficient-balance" });
    }

    // deduct cost
    wallet.balance -= cost;
    await wallet.save();

    // create job
    const job = await Job.create({
      title: req.body.title,
      description: req.body.description,
      salaryMin: req.body.salaryMin || 0,
      salaryMax: req.body.salaryMax || 0,
      salaryCurrency: "USD",
      employmentType: req.body.employmentType || "full-time",
      companyId: userId,
      companyName: req.body.companyName || "Unknown",
      country: req.body.country || "N/A",
      city: req.body.city || "N/A",
      status: "pending",
      isActive: true,
      createdAt: new Date()
    });

    // log transaction
    await Transaction.create({
      walletId: wallet._id,
      ownerId: userId,
      ownerType: "employer",
      type: "debit",
      amount: cost,
      currency: wallet.currency,
      reason: "job-posting"
    });

    return res.json({ ok: true, job, wallet });
  } catch (err) {
    console.error("Job create error", err);
    return res.status(500).json({ error: "create-failed" });
  }
});

/**
 * PATCH /api/jobs/:id
 * - Only the job owner (employer who created it) or an admin can update
 * - This handler will decode the Authorization header itself if req.auth is not set.
 */
router.patch("/:id", async (req, res) => {
  try {
    // Prefer req.auth if middleware populated it, otherwise decode header
    const auth = req.auth || decodeAuthHeader(req.headers.authorization) || {};
    const userId = auth.userId || auth.id || auth._id || null;
    const role = auth.role || null;

    if (!userId) {
      return res.status(401).json({ error: "auth-required" });
    }

    const id = req.params.id;
    const job = await Job.findById(id).lean();
    if (!job) return res.status(404).json({ error: "job-not-found" });

    // allow if admin OR employer who owns this job
    if (!(role === "admin" || (role === "employer" && String(job.companyId) === String(userId)))) {
      return res.status(403).json({ error: "forbidden" });
    }

    const allowed = [
      "title",
      "description",
      "salary",
      "salaryMin",
      "salaryMax",
      "salaryCurrency",
      "country",
      "city",
      "employmentType",
      "isActive",
      "status",
      "companyName"
    ];
    const update = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) {
        update[k] = req.body[k];
      }
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "no-valid-fields" });
    }

    const updated = await Job.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: "job-not-found" });
    return res.json({ ok: true, job: updated });
  } catch (err) {
    console.error("PATCH /api/jobs/:id error", err);
    return res.status(500).json({ error: "update-failed" });
  }
});
// DELETE /api/jobs/:id  - only owner (companyId) or admin can delete
router.delete("/:id", async (req, res) => {
  try {
    // prefer middleware-populated req.auth else decode header
    const auth = req.auth || decodeAuthHeader(req.headers.authorization) || {};
    const userId = auth.userId || auth.id || auth._id || null;
    const role = auth.role || null;
    if (!userId) return res.status(401).json({ error: "auth-required" });

    const id = req.params.id;
    const job = await Job.findById(id).lean();
    if (!job) return res.status(404).json({ error: "job-not-found" });

    if (!(role === "admin" || (role === "employer" && String(job.companyId) === String(userId)))) {
      return res.status(403).json({ error: "forbidden" });
    }

    await Job.deleteOne({ _id: id });
    return res.json({ ok: true, deletedId: id });
  } catch (err) {
    console.error("DELETE /api/jobs/:id error", err);
    return res.status(500).json({ error: "delete-failed" });
  }
});

module.exports = router;
