// backend/routes/payments_razorpay.js
// Full replacement: create-order, verify, capture, webhook (fast-ack + background processing), debug route (dev only)

const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const fs = require('fs');
const path = require('path');

const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

const router = express.Router();

const rp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

// ----------------- Utilities -----------------
function computeHmacHex(secret, body) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function getRawBodyStringFromReq(req) {
  if (req.rawBody && Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8');
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  try { return JSON.stringify(req.body || {}); } catch (e) { return ''; }
}

// ----------------- Background processor -----------------
async function processWebhookEvent(event) {
  try {
    if (!event) {
      console.warn('processWebhookEvent: empty event');
      return;
    }

    // Handle payment captured/authorized events
    if (event.event === 'payment.captured' || event.event === 'payment.authorized') {
      const payment = event.payload?.payment?.entity;
      if (!payment) return;

      const amountMajor = (payment.amount || 0) / 100;
      const ownerId = payment.notes?.ownerId || null;
      const ownerType = payment.notes?.ownerType || 'employer';
      const razorpayPaymentId = payment.id;

      if (!ownerId) {
        console.warn('Webhook payment has no ownerId in notes', razorpayPaymentId);
        return;
      }

      // Idempotency: skip if already processed
      const exists = await Transaction.findOne({ reason: `razorpay:${razorpayPaymentId}` }).lean().exec();
      if (exists) {
        console.log('Webhook: already processed', razorpayPaymentId);
        return;
      }

      let wallet = await Wallet.findOne({ ownerId: ownerId.toString() }).exec();
      if (!wallet) {
        wallet = await Wallet.create({
          ownerId: ownerId.toString(),
          ownerType,
          balance: 0,
          currency: payment.currency || 'USD'
        });
      }

      wallet.balance = (wallet.balance || 0) + Number(amountMajor || 0);
      if (payment.currency) wallet.currency = payment.currency;
      await wallet.save();

      const tx = {
        walletId: wallet._id.toString(),
        ownerId: ownerId.toString(),
        ownerType,
        type: 'credit',
        amount: Number(amountMajor),
        currency: payment.currency || wallet.currency || 'USD',
        reason: `razorpay:${razorpayPaymentId}`,
        data: { payment }
      };

      await Transaction.create(tx);

      console.log(`Background: credited wallet ${wallet._id} amount ${amountMajor} ${payment.currency}`);
    } else {
      // Log other events if needed
      console.log('processWebhookEvent: ignored event', event.event);
    }
  } catch (err) {
    console.error('processWebhookEvent error', err && (err.stack || err));
    // In production, push to retry queue or alerting system
  }
}

// ----------------- Routes: create-order / verify / capture -----------------

// Create order
router.post('/create-order', express.json(), async (req, res) => {
  try {
    const { amount, currency = 'INR', ownerId, ownerType = 'employer' } = req.body || {};
    if (!amount || !ownerId) return res.status(400).json({ error: 'amount and ownerId required' });

    const amountSmallest = Math.round(Number(amount) * 100); // paise for INR
    const options = {
      amount: amountSmallest,
      currency,
      receipt: `rcpt_${Date.now()}`,
      notes: { ownerId: ownerId.toString(), ownerType: ownerType.toString() }
    };

    const order = await rp.orders.create(options);
    return res.json({ ok: true, order });
  } catch (err) {
    console.error('create-order error', err && (err.stack || err));
    return res.status(500).json({ error: 'create-order-failed' });
  }
});

// Verify payment (fetch)
router.post('/verify', express.json(), async (req, res) => {
  try {
    const { paymentId } = req.body || {};
    if (!paymentId) return res.status(400).json({ error: 'paymentId required' });

    const payment = await rp.payments.fetch(paymentId);
    return res.json({ ok: true, payment });
  } catch (err) {
    console.error('verify error', err && (err.stack || err));
    return res.status(500).json({ error: 'verify-failed' });
  }
});

// Capture payment
router.post('/capture', express.json(), async (req, res) => {
  try {
    const { paymentId, amount } = req.body || {};
    if (!paymentId || !amount) return res.status(400).json({ error: 'paymentId and amount required' });

    const amountSmallest = Math.round(Number(amount) * 100);
    const captured = await rp.payments.capture(paymentId, amountSmallest);
    return res.json({ ok: true, captured });
  } catch (err) {
    console.error('capture error', err && (err.stack || err));
    return res.status(500).json({ error: 'capture-failed' });
  }
});

// ----------------- Webhook: fast-ack + background processing -----------------
// This route expects raw body (Buffer). It validates signature, responds 200 quickly,
// and then calls processWebhookEvent(event) in background via setImmediate.
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    req.rawBody = req.body; // raw Buffer

    const skipSig = (process.env.SKIP_RAZORPAY_SIGNATURE === '1');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const rawBodyStr = getRawBodyStringFromReq(req);
    const signature = (req.headers['x-razorpay-signature'] || '').toString();

    if (!skipSig) {
      if (!secret) {
        console.error('Webhook secret not set in env (RAZORPAY_WEBHOOK_SECRET)');
        return res.status(500).send('server-config-missing');
      }
      const expected = computeHmacHex(secret, rawBodyStr);
      if (signature !== expected) {
        console.warn('Invalid webhook signature', {
          received_length: signature ? signature.length : 0,
          expected_length: expected.length
        });
        return res.status(400).json({ error: 'invalid-signature' });
      }
    } else {
      console.log('Webhook signature verification SKIPPED (SKIP_RAZORPAY_SIGNATURE=1)');
    }

    // Parse payload (safe)
    let event = null;
    try {
      event = JSON.parse(rawBodyStr);
    } catch (e) {
      if (req.body && !Buffer.isBuffer(req.body)) event = req.body;
    }

    if (!event) {
      console.warn('Webhook: could not parse event payload');
      return res.status(400).json({ error: 'invalid-payload' });
    }

    // Immediate ack
    res.json({ ok: true, message: 'accepted' });

    // Background processing (non-blocking). For production use a durable job queue.
    setImmediate(() => {
      processWebhookEvent(event);
    });

  } catch (err) {
    console.error('webhook route error (fast-ack wrapper)', err && (err.stack || err));
    try { return res.status(500).send('error'); } catch (e) { /* ignore */ }
  }
});

// ----------------- Debug route (dev only) -----------------
// Computes expected HMAC for a local sample file. Only available when NODE_ENV === 'development'.
if (process.env.NODE_ENV === 'development') {
  router.get('/webhook/debug-signature', (req, res) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
      const candidates = [
        path.join(__dirname, '..', 'dev-data', 'webhook.normal.json'),
        path.join(__dirname, '..', 'dev-data', 'webhook.min.json'),
        path.join(__dirname, '..', 'dev-data', 'webhook.credit.json'),
        path.join(__dirname, '..', 'webhook.normal.json'),
        path.join(__dirname, '..', 'webhook.json')
      ];
      let filePath;
      for (const p of candidates) if (fs.existsSync(p)) { filePath = p; break; }
      if (!filePath) return res.status(404).json({ error: 'no-webhook-file-found', candidates });

      const body = fs.readFileSync(filePath);
      const expected = computeHmacHex(secret, body);
      return res.json({ ok: true, secret_set: !!secret, file_len: body.length, expected, filePath });
    } catch (err) {
      return res.status(500).json({ error: 'debug-failed', detail: String(err) });
    }
  });
}

// Export router (works with app.use('/api/payments/razorpay', router))
module.exports = router;
