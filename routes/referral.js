// routes/referral.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { creditWallet } = require("../utils/wallet");

// POST /api/referral/claim  { referrerId }
router.post("/claim", auth, async (req, res) => {
  try {
    const { referrerId } = req.body;
    const owner = { id: req.user.id, type: req.user.role };
    // credit welcome bonus $0.5
    await creditWallet(owner, 0.5, "referral_welcome", { referrerId });
    res.json({ ok: true, message: "Welcome bonus credited" });
  } catch (err) {
    console.error("Referral claim error", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
