// server.js
// Key changes:
// - Very-early request logger
// - Single express.json() for normal routes
// - express.raw() used only inside the payments_razorpay router (so router must define /webhook)
// - Clean safeMount helper and route mounts
// - Validate environment early (validateEnv throws in production if required vars missing)

require('dotenv').config();

// Validate environment early. This will throw and stop startup in production
// if required env vars are missing. utils/validateEnv.js should exist (created earlier).
try {
  const validateEnv = require('./utils/validateEnv');
  const res = validateEnv();
  console.log('ENV-VALIDATION', res);
} catch (err) {
  console.error('ENV-VALIDATION-FAILED', err && err.message ? err.message : err);
  // Exit immediately so process managers know startup failed
  process.exit(1);
}

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const connectDB = require('./utils/connect');

const app = express();

// Connect DB
connectDB().then(() => console.log("MongoDB connected")).catch(err => {
  console.error("DB connect failed", err && err.message ? err.message : err);
});

// ---------- VERY EARLY LOGGER (helps diagnose incoming requests)
app.use((req, res, next) => {
  console.log(new Date().toISOString(), 'REQ-INCOMING', req.method, req.originalUrl, 'remote:', req.ip);
  const hdrs = {
    host: req.headers.host,
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length'],
    'user-agent': req.headers['user-agent'],
    authorization: !!req.headers.authorization
  };
  console.log(new Date().toISOString(), 'REQ-HDRS', hdrs);
  next();
});

// Standard middlewares
app.use(morgan('dev'));
app.use(cors());

// mount razorpay raw webhook BEFORE express.json if you prefer server-level handler.
// Note: payments_razorpay router also declares a router-level raw webhook route.
// We keep an explicit server-level wrapper here to support direct call into router.handleWebhook
// if the router exposes that function. If you prefer router-only handling, you can remove this block.
const razorpayRouter = require('./routes/payments_razorpay');
app.post(
  '/api/payments/razorpay/webhook',
  express.raw({ type: 'application/json' }), // capture raw body
  (req, res, next) => {
    // attach rawBody buffer for verification/processing
    req.rawBody = req.body;
    try {
      // If the router exports a handleWebhook function, call it (works when router.handleWebhook = fn)
      if (typeof razorpayRouter.handleWebhook === 'function') {
        return razorpayRouter.handleWebhook(req, res, next);
      }
      // Otherwise, forward to the router's route handlers (router-level /webhook with express.raw must exist)
      // Use next() so the normal router mount handles it.
      next();
    } catch (e) {
      console.error('webhook-err', e && (e.stack || e));
      return res.status(500).send('error');
    }
  }
);

// Use single express.json for typical JSON endpoints
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static public/data if you put demo jsons there
app.use('/data', express.static(path.join(__dirname, '..', 'app', 'public', 'data')));

// Helper: safe mount
function safeMount(routePath, mountPoint) {
  try {
    if (!fs.existsSync(__dirname + '/' + routePath + '.js') && !fs.existsSync(__dirname + '/' + routePath)) {
      console.warn(`Route file not found: ${routePath}. Skipping mount ${mountPoint}`);
      return;
    }
    const r = require(routePath);
    app.use(mountPoint, r);
    console.log(`Mounted ${routePath} -> ${mountPoint}`);
  } catch (e) {
    console.warn(`Route not mounted: ${routePath} -> ${mountPoint}  (${e.message})`);
  }
}

// ---------- Mount standard API routes (safeMount avoids crash if file missing)
// IMPORTANT: payments_razorpay router should itself define the raw webhook route:
// router.post('/webhook', express.raw({ type: 'application/json' }), handler)
safeMount('./routes/auth', '/api/auth');
safeMount('./routes/jobs', '/api/jobs');
safeMount('./routes/wallet', '/api/wallet');
safeMount('./routes/notifications', '/api/notifications');
safeMount('./routes/payments_razorpay', '/api/payments/razorpay'); // this router must export the webhook raw route or handleWebhook
safeMount('./routes/applications', '/api/applications');
safeMount('./routes/users', '/api/users');
safeMount('./routes/payments_sim', '/api/payments/simulate');
safeMount('./routes/employer_jobs', '/api/employer/jobs');
safeMount('./routes/admin', '/api/admin');
safeMount('./routes/debug', '/api/debug');

// health
app.get('/', (req, res) => res.json({ ok: true, message: 'API is running' }));

// global error handler
app.use((err, req, res, next) => {
  console.error('GLOBAL-ERR', err && err.stack ? err.stack : err);
  res.status(500).json({ ok: false, error: err && err.message ? err.message : 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
