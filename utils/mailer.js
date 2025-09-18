// backend/utils/mailer.js
const nodemailer = require('nodemailer');

let transporter;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: (process.env.SMTP_SECURE === 'true'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} else {
  // fallback/mock transporter: logs to console
  transporter = {
    sendMail: async (opts) => {
      console.log('MAILER (mock) sendMail called:', opts);
      return { accepted: [opts.to] };
    }
  };
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.EMAIL_FROM || 'no-reply@example.com';
  if (!to) {
    throw new Error('No "to" address for sendMail');
  }
  const info = await transporter.sendMail({ from, to, subject, text, html });
  return info;
}

module.exports = { sendMail, transporter };
