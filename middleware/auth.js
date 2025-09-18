// middleware/auth.js
require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function(req, res, next) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth) return res.status(401).json({ error: 'Authorization header missing' });
    const parts = String(auth).split(' ');
    if (parts.length !== 2) return res.status(401).json({ error: 'Invalid auth header' });
    const token = parts[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    // attach user minimal info
    req.user = { id: decoded.id || decoded._id, role: decoded.role || decoded.type || 'worker', email: decoded.email };
    // Optionally fetch full user from DB (uncomment if you need)
    // const full = await User.findById(req.user.id);
    // if (full) req.user.full = full;
    next();
  } catch (err) {
    console.error('auth middleware error', err.message || err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
