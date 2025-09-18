// tools/send-webhook-test.cjs
const https = require('https');
const crypto = require('crypto');

const url = process.argv[2] || 'https://<NGROK_HOST>/api/payments/razorpay/webhook';
const secret = process.argv[3] || 'your_webhook_secret';
const payload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_test' } } } });

const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

const u = new URL(url);
const options = {
  hostname: u.hostname,
  path: u.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'x-razorpay-signature': signature
  }
};

const req = https.request(options, (res) => {
  console.log('status', res.statusCode);
  res.on('data', (d) => process.stdout.write(d));
});
req.on('error', (e) => console.error(e));
req.write(payload);
req.end();
