const nodemailer = require("nodemailer");

(async () => {
  try {
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    let info = await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: "yourrealemail@gmail.com",  // replace with your Gmail
      subject: "Career Platform Test Email",
      html: "<p>Hello, this is a test email from Career Platform backend.</p>",
    });

    console.log("Test email sent:", info.messageId);
  } catch (err) {
    console.error("Error sending email:", err);
  }
})();
