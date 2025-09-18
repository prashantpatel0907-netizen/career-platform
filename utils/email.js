// utils/email.js
const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL
} = process.env;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.warn('Warning: SMTP not fully configured. Emails will fail unless env variables are set.');
}

function createTransporter() {
  const secure = (String(SMTP_SECURE || 'true') === 'true');
  return nodemailer.createTransport({
    host: SMTP_HOST || 'smtp.gmail.com',
    port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : (secure ? 465 : 587),
    secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

async function sendMail({ to, subject, html, text }) {
  if (!SMTP_USER || !SMTP_PASS || !SMTP_HOST) {
    throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
  }
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: FROM_EMAIL || SMTP_USER,
    to,
    subject,
    text: text || undefined,
    html: html || undefined
  });
  return info;
}

module.exports = { sendMail };
