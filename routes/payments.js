// routes/payments.js
const express = require("express");
const router = express.Router();
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

// POST /api/payments/topup
// Body: { userId, amount, currency }
router.post("/topup", async (req, res) => {
  try {
    const { userId, amount, currency } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: "missing-fields" });

    // find or create wallet
    let wallet = await Wallet.findOne({ ownerId: userId });
    if (!wallet) {
      wallet = new Wallet({ ownerId: userId, ownerType: "employer", balance: 0, currency: currency || "USD" });
    }
    wallet.balance += Number(amount);
    wallet.updatedAt = new Date();
    await wallet.save();

    const tx = await Transaction.create({
      walletId: wallet._id,
      ownerId: userId,
      ownerType: "employer",
      type: "credit",
      amount: Number(amount),
      currency: currency || "USD",
      reason: "topup-simulated"
    });

    return res.json({ ok: true, wallet, tx });
  } catch (err) {
    console.error("POST /api/payments/topup error", err);
    return res.status(500).json({ error: "topup-failed" });
  }
});

module.exports = router;
