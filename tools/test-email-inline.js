// tools/test-email-inline.js
const nodemailer = require('nodemailer');

(async () => {
  try {
    const SMTP_HOST = 'smtp.gmail.com';
    const SMTP_PORT = 587;
    const SMTP_USER = 'prashantpatel0907@gmail.com';          // <- REPLACE
    const SMTP_PASS = 'leavjablqmpnxrzf';            // <- REPLACE (16 chars, no spaces)

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      requireTLS: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const info = await transporter.sendMail({
      from: `"Career Platform" <${SMTP_USER}>`,
      to: SMTP_USER, // send to yourself for testing
      subject: 'Career Platform: SMTP Inline Test',
      html: '<p>This is an SMTP inline test from Career Platform</p>',
    });

    console.log('Test email sent, messageId=', info.messageId);
    process.exit(0);
  } catch (err) {
    console.error('Inline send error:', err);
    process.exit(1);
  }
})();
