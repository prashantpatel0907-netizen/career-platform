// middleware/admin.js
module.exports = function (req, res, next) {
  const key = req.get('x-admin-key') || process.env.XADMIN_KEY;
  if (!key || key !== (process.env.XADMIN_KEY || 'very-simple-admin-key')) {
    return res.status(403).json({ error: 'admin-key-missing-or-invalid' });
  }
  next();
}
