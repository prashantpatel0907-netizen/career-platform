// routes/feedback.js
const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/auth');
const { credit } = require('../utils/wallet');

// POST /api/feedback  (authenticated)
router.post('/', jwtAuth, async (req, res) => {
  try {
    const user = req.user; // id, role
    const { subject, message, spentAmount } = req.body;
    // In production you would save feedback to DB. Here we focus on cashback.
    let cashback = 0;
    if (spentAmount && Number(spentAmount) > 0) {
      cashback = Number((Number(spentAmount) * 0.10).toFixed(2)); // 10% cashback
      await credit(user.id, user.role, cashback, { reason: 'Feedback cashback', meta: { subject } });
    }
    res.json({ ok: true, message: 'Thanks for feedback', cashback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
