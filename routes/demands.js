// routes/demands.js
const express = require("express");
const router = express.Router();
const Demand = require("../models/Demand");

// create demand
router.post("/", async (req, res) => {
  const d = await Demand.create(req.body);
  res.json(d);
});

router.get("/", async (req, res) => {
  const list = await Demand.find().limit(200);
  res.json(list);
});

module.exports = router;
