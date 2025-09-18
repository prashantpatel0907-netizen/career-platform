// backend/routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/:id', async (req, res) => {
  try {
    const u = await User.findById(req.params.id).lean();
    if (!u) return res.status(404).json({ error: 'not-found' });
    // hide sensitive fields
    delete u.password;
    delete u.passwordHash;
    delete u.__v;
    return res.json({ ok: true, user: u });
  } catch (err) {
    console.error('GET /api/users/:id error', err);
    return res.status(500).json({ error: 'user-fetch-failed' });
  }
});

module.exports = router;
