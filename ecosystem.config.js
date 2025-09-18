// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "career-platform",
      script: "server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: process.env.NODE_ENV || "production",
        PORT: process.env.PORT || 4000,
        JWT_SECRET: process.env.JWT_SECRET || "",
        RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
        RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
        RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || ""
      },
      // log files
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      combine_logs: true,
      autorestart: true,
      watch: false
    }
  ]
};
