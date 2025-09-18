// backend/routes/payments_sim.js
const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');

function decodeTokenFromHeader(authHeader) {
  if (!authHeader) return null;
  try { return jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'secret'); }
  catch(e){ return null; }
}

/**
 * POST /api/payments/simulate
 * Body: { amount, currency }
 * Requires Authorization (to identify user / owner)
 * This simulates a successful payment and credits wallet.
 */
router.post('/simulate', async (req, res) => {
  try {
    const user = decodeTokenFromHeader(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Invalid auth header' });

    const { amount, currency } = req.body || {};
    if (!amount) return res.status(400).json({ error: 'amount required' });

    // find or create wallet
    let wallet = await Wallet.findOne({ ownerId: user.id });
    if (!wallet) {
      wallet = await Wallet.create({ ownerId: user.id, ownerType: user.role || 'employer', balance: 0, currency: currency || 'USD' });
    }

    wallet.balance = (wallet.balance || 0) + Number(amount);
    if (currency) wallet.currency = currency;
    await wallet.save();

    const tx = await Transaction.create({
      walletId: wallet._id.toString(),
      ownerId: user.id,
      ownerType: user.role || 'employer',
      type: 'credit',
      amount: Number(amount),
      currency: currency || wallet.currency || 'USD',
      reason: 'simulate:topup',
    });

    return res.json({ ok: true, wallet: wallet.toObject(), tx });
  } catch (err) {
    console.error('POST /api/payments/simulate error', err);
    return res.status(500).json({ error: 'simulate-payment-failed' });
  }
});

module.exports = router;
