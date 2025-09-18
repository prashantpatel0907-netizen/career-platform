// routes/employers.js
const express = require("express");
const router = express.Router();
const Employer = require("../models/Employer");
const auth = require("../middleware/auth");

// list employers (public)
router.get("/", async (req, res) => {
  const list = await Employer.find().limit(200);
  res.json(list);
});

// create employer (public)
router.post("/", async (req, res) => {
  try {
    const created = await Employer.create(req.body);
    res.json(created);
  } catch (err) {
    console.error("Create employer error", err);
    res.status(500).json({ error: "Server error" });
  }
});

// get current employer profile (protected)
router.get("/me", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "employer") return res.status(403).json({ error: "Forbidden" });
    const emp = await Employer.findById(req.user.id).select("-passwordHash");
    if (!emp) return res.status(404).json({ error: "Not found" });
    res.json(emp);
  } catch (err) {
    console.error("Employer me error", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
