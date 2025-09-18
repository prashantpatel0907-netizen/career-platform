// routes/workers.js
const express = require("express");
const router = express.Router();
const Worker = require("../models/Worker");

// GET /api/workers?country=India&limit=20
router.get("/", async (req, res) => {
  const { country, q, limit } = req.query;
  const filter = {};
  if (country) filter.country = country;
  if (q) filter.$text = { $search: q }; // optional; ensure text index for production
  const list = await Worker.find(filter).limit(parseInt(limit || "100"));
  res.json(list);
});

router.get("/:id", async (req, res) => {
  const w = await Worker.findById(req.params.id);
  if (!w) return res.status(404).json({ error: "Not found" });
  res.json(w);
});

router.post("/", async (req, res) => {
  const payload = req.body;
  const created = await Worker.create(payload);
  res.json(created);
});

module.exports = router;
