// routes/auth.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Employer = require("../models/Employer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

router.post("/signup", async (req, res) => {
  log("signup-start");
  try {
    const { type, email, password, companyName, contactName } = req.body;
    if (!type || !email || !password) {
      log("signup-missing-params");
      return res.status(400).json({ error: "type, email and password required" });
    }

    log("signup-looking-for-existing", email);
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      log("signup-existing", email);
      return res.json({ error: "Email already exists" });
    }

    log("signup-hashing");
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ email, passwordHash: hash, role: type === "employer" ? "employer" : "worker" });
    await user.save();
    log("signup-user-saved", user._id);

    if (type === "employer") {
      await Employer.create({ userId: user._id, companyName, contactName });
      log("signup-created-employer", user._id);
    }

    const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET || "secret", { expiresIn: "30d" });
    log("signup-done", user._id);
    res.json({ ok: true, token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    log("signup-err", err && err.message ? err.message : err);
    console.error(err);
    res.status(500).json({ error: "signup-failed" });
  }
});

router.post("/login", async (req, res) => {
  log("login-start");
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      log("login-missing-params");
      return res.status(400).json({ error: "type, email, password required" });
    }

    log("login-find-user", email);
    // Read raw doc from collection to avoid schema select:false hiding passwordHash
    const raw = await User.collection.findOne({ email });
    log("login-find-user-done", !!raw);

    if (!raw) {
      log("login-no-user", email);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Accept any of the legacy / current fields
    let stored = raw.passwordHash || raw.password || raw.password_hash || raw.pwd;
    if (!stored) {
      log("login-no-passwordhash", raw._id);
      return res.status(400).json({ error: "user-missing-password-hash" });
    }

    // Compare: if bcrypt-style hash use bcrypt.compare; otherwise handle plaintext legacy
    let ok = false;
    if (typeof stored === "string" && stored.startsWith("$2")) {
      ok = await bcrypt.compare(password, stored);
    } else {
      // legacy plaintext fallback
      ok = stored === password;
    }

    // extra attempt if not OK: try bcrypt compare once more (some hashes may be stored without prefix)
    if (!ok && typeof stored === "string" && !stored.startsWith("$2")) {
      try {
        ok = await bcrypt.compare(password, stored);
      } catch (e) {
        // ignore
      }
    }

    if (!ok) {
      log("login-bad-password", raw._id);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Ensure we store secure bcrypt hash for future (migrate plaintext -> hash)
    if (!(typeof stored === "string" && stored.startsWith("$2"))) {
      try {
        const newHash = await bcrypt.hash(password, 10);
        await User.updateOne({ email }, { $set: { passwordHash: newHash }, $unset: { password: "" } });
        log("login-migrated-password-to-hash", email);
      } catch (e) {
        log("login-migrate-error", e && e.message);
      }
    }

    // Pull canonical mongoose user doc (with any virtuals)
    const user = await User.findOne({ email }).lean();
    const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET || "secret", { expiresIn: "30d" });
    log("login-success", user._id);
    res.json({ ok: true, token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    log("login-err", err && err.message ? err.message : err);
    console.error(err);
    res.status(500).json({ error: "login-failed" });
  }
});

module.exports = router;
