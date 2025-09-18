const express = require("express");
const router = express.Router();

router.post("/echo", (req, res) => {
  console.log(new Date().toISOString(), "debug-echo-start");
  // try to echo body and headers quickly
  res.json({ ok: true, gotBody: req.body || null, gotHeaders: req.headers });
  console.log(new Date().toISOString(), "debug-echo-done");
});

module.exports = router;
