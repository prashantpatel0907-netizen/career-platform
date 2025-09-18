// routes/auth_login_fix.js
// CommonJS route: POST /api/auth/login2
// Tries lots of common password field names and returns a JWT on success.

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // should exist
const Employer = require("../models/Employer");
const Worker = require("../models/Worker");

const router = express.Router();

function makeToken(user) {
  const payload = { id: user._id.toString(), role: user.role || (user.type || "user"), email: user.email };
  const secret = process.env.JWT_SECRET || process.env.CP_SECRET || "secret";
  const token = jwt.sign(payload, secret, { expiresIn: "30d" });
  return token;
}

router.post("/login2", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    const e = (email || "").toLowerCase();
    // Search across plausible collections
    const models = [User, Employer, Worker].filter(Boolean);

    let found = null;
    for (const M of models) {
      try {
        const doc = await M.findOne({ email: e }).exec();
        if (doc) { found = { doc, model: M.modelName || "Model" }; break; }
      } catch (err) { /* skip */ }
    }
    if (!found) return res.status(404).json({ error: "user-not-found" });

    const doc = found.doc;
    // Candidate fields to compare bcrypt against (common names)
    const tries = [];
    // top-level fields
    ["password", "passwordHash", "password_hash", "passHash", "hash", "pw", "pwd", "local"]
      .forEach(k => tries.push(k));
    // if nested local.hash exists, treat specially below

    // Gather candidate hash strings from the document
    const candidateHashes = [];
    try {
      for (const k of tries) {
        if (k === "local") {
          if (doc.local && typeof doc.local === "object") {
            if (doc.local.hash) candidateHashes.push(String(doc.local.hash));
            if (doc.local.password) candidateHashes.push(String(doc.local.password));
          }
        } else {
          if (typeof doc[k] !== "undefined" && doc[k] !== null) candidateHashes.push(String(doc[k]));
        }
      }
    } catch (err) {
      // ignore
    }

    // If schema hides fields and candidateHashes length is 0, try raw doc.toObject()
    if (candidateHashes.length === 0) {
      try {
        const obj = doc.toObject ? doc.toObject() : doc;
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          if (typeof v === "string" && v.length > 20) { // possible hash
            candidateHashes.push(v);
          }
        }
      } catch (e) {}
    }

    // Try bcrypt.compare against each candidate
    for (const h of candidateHashes) {
      try {
        const ok = await bcrypt.compare(password, h);
        if (ok) {
          // success — create token
          const token = makeToken(doc);
          return res.json({ ok: true, token, user: { id: doc._id, email: doc.email, role: doc.role || doc.type } });
        }
      } catch (err) { /* ignore */ }
    }

    // last attempt: some user docs store bcrypt in nested strange places; do a raw JSON string scan for "$2" prefix substrings
    try {
      const str = JSON.stringify(doc);
      const re = /\$2[ayb]\$.{50,}$/m;
      const m = str.match(re);
      if (m && m[0]) {
        const candidate = m[0];
        if (await bcrypt.compare(password, candidate)) {
          const token = makeToken(doc);
          return res.json({ ok: true, token, user: { id: doc._id, email: doc.email, role: doc.role || doc.type } });
        }
      }
    } catch (e) {}

    return res.status(401).json({ error: "invalid-credentials" });
  } catch (err) {
    console.error("login2 error:", err);
    return res.status(500).json({ error: "login2-failed", detail: err.message });
  }
});

module.exports = router;
