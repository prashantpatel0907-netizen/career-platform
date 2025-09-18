// routes/payments_offline.js
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const WalletUtils = require('../utils/wallet');
const { requireAdmin } = require('../middleware/admin') || (() => (req,res,next)=>next()); // fallback if missing

// 1) User requests offline payment (creates pending transaction)
router.post('/request-offline', async (req, res) => {
  try {
    const { ownerId, ownerType, amount, currency='USD', details } = req.body || {};
    if (!ownerId || !ownerType || !amount) return res.status(400).json({ error: 'ownerId, ownerType, amount required' });

    const tx = await Transaction.create({
      walletId: null,
      ownerId,
      ownerType,
      amount: Number(amount),
      currency,
      type: 'offline_request',
      status: 'pending',
      meta: { details }
    });

    return res.json({ ok: true, tx });
  } catch (err) {
    console.error('request-offline error', err);
    return res.status(500).json({ error: err.message || 'request-offline failed' });
  }
});

// 2) Admin approves offline payment -> credit wallet, mark txn completed
router.post('/admin/approve-offline', async (req, res) => {
  try {
    // If you have admin middleware, replace this block with requireAdmin middleware.
    // For now we require a simple token check in header 'x-admin-key' OR you can wire real middleware.
    const ADMIN_KEY = process.env.ADMIN_SIMPLE_KEY || 'very-simple-admin-key';
    if (req.headers['x-admin-key'] !== ADMIN_KEY) {
      return res.status(403).json({ error: 'admin auth required (set x-admin-key or implement requireAdmin middleware)' });
    }

    const { txId } = req.body || {};
    if (!txId) return res.status(400).json({ error: 'txId required' });

    const tx = await Transaction.findById(txId);
    if (!tx) return res.status(404).json({ error: 'tx not found' });
    if (tx.status === 'completed') return res.json({ ok:true, message: 'already completed' });

    // credit the wallet
    const credit = await WalletUtils.credit(tx.ownerId, tx.ownerType, tx.amount, {
      reason: 'Admin-approved offline payment',
      meta: { offline_tx: txId }
    });

    tx.status = 'completed';
    tx.walletId = credit.wallet._id;
    await tx.save();

    return res.json({ ok:true, credit, tx });
  } catch (err) {
    console.error('approve-offline error', err);
    return res.status(500).json({ error: err.message || 'approve-offline failed' });
  }
});

module.exports = router;
