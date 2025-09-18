// routes/wallet.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

// Helper: decode bearer JWT token without requiring auth middleware
function decodeBearerToken(req) {
  try {
    const h = req.headers.authorization || req.headers.Authorization || "";
    if (!h) return null;
    const parts = h.split(" ");
    if (parts.length !== 2) return null;
    const token = parts[1];
    // If you want to verify signature, use jwt.verify with secret
    // Here we decode payload (not verifying) for convenience:
    const payload = jwt.decode(token);
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * GET /api/wallet
 * - If Authorization Bearer JWT with user id present, returns that user's wallet & last 10 txs.
 * - Or use query ?ownerId=... for testing/admin.
 */
router.get("/", async (req, res) => {
  try {
    // 1) try req.user (if an auth middleware populated it)
    let ownerId = req.user && req.user.id ? req.user.id : null;

    // 2) try Bearer token (decode)
    if (!ownerId) {
      const payload = decodeBearerToken(req);
      if (payload && (payload.id || payload._id)) {
        ownerId = payload.id || payload._id;
      }
    }

    // 3) allow query param fallback (useful for admin/testing)
    if (!ownerId && req.query && req.query.ownerId) {
      ownerId = req.query.ownerId;
    }

    if (!ownerId) {
      return res.status(401).json({ error: "Authorization header missing or no ownerId provided" });
    }

    const wallet = await Wallet.findOne({ ownerId }).lean();
    if (!wallet) return res.json({ wallet: null, transactions: [] });

    const txs = await Transaction.find({ walletId: wallet._id.toString() })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return res.json({ wallet, transactions: txs });
  } catch (err) {
    console.error("GET /api/wallet error", err && (err.stack || err));
    return res.status(500).json({ error: "wallet-fetch-failed" });
  }
});

/**
 * POST /api/wallet/credit
 * Body: { ownerId, amount, currency, reason?, source?, ownerType? }
 * - Updates wallet balance and creates a Transaction document.
 * - This endpoint currently accepts an ownerId in body (admin/test use).
 */
router.post("/credit", async (req, res) => {
  try {
    const { ownerId, amount, currency, reason, source, ownerType } = req.body || {};
    if (!ownerId || (amount === undefined || amount === null)) {
      return res.status(400).json({ error: "ownerId and amount required" });
    }

    // find or create wallet
    let wallet = await Wallet.findOne({ ownerId });
    if (!wallet) {
      wallet = await Wallet.create({
        ownerId,
        ownerType: ownerType || "employer",
        balance: 0,
        currency: currency || "USD",
      });
    }

    // update balance
    wallet.balance = (Number(wallet.balance) || 0) + Number(amount || 0);
    if (currency) wallet.currency = currency;
    await wallet.save();

    // create transaction record
    const txDoc = {
      walletId: wallet._id.toString(),
      ownerId,
      ownerType: ownerType || wallet.ownerType || "employer",
      type: "credit",
      amount: Number(amount),
      currency: currency || wallet.currency || "USD",
      reason: reason || (source ? `credit:${source}` : "credit"),
    };
    const tx = await Transaction.create(txDoc);

    return res.json({ ok: true, wallet: wallet.toObject(), tx });
  } catch (err) {
    console.error("POST /api/wallet/credit error", err && (err.stack || err));
    return res.status(500).json({ error: "credit-failed" });
  }
});
/**
 * GET /api/wallet/transactions
 * Query params:
 *  - walletId (optional) OR ownerId (optional)
 *  - page (default 1) - 1-based
 *  - limit (default 10)
 *
 * If no walletId provided and ownerId is present (or token contains id), will find wallet.
 */
router.get('/transactions', async (req, res) => {
  try {
    const { walletId, ownerId, page = 1, limit = 10 } = req.query;
    let wId = walletId;
    // simple token decode support
    if (!wId && !ownerId && req.headers.authorization) {
      try {
        const user = require('jsonwebtoken').verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET || 'secret');
        if (user && user.id) req.query.ownerId = user.id;
      } catch(e){}
    }

    if (!wId && req.query.ownerId) {
      const w = await Wallet.findOne({ ownerId: String(req.query.ownerId) }).lean();
      if (!w) return res.json({ ok:true, transactions: [], total:0, page: Number(page), limit: Number(limit) });
      wId = w._id.toString();
    }

    if (!wId) return res.status(400).json({ error: 'walletId or ownerId required' });

    const qPage = Math.max(1, parseInt(String(page), 10) || 1);
    const qLimit = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 10));
    const skip = (qPage - 1) * qLimit;

    const [total, txs] = await Promise.all([
      Transaction.countDocuments({ walletId: wId }),
      Transaction.find({ walletId: wId }).sort({ createdAt: -1 }).skip(skip).limit(qLimit).lean()
    ]);

    return res.json({ ok: true, transactions: txs, total, page: qPage, limit: qLimit });
  } catch (err) {
    console.error('GET /api/wallet/transactions error', err);
    return res.status(500).json({ error: 'transactions-fetch-failed' });
  }
});

module.exports = router;
