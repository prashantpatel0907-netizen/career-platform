// backend/utils/validateEnv.js
'use strict';

/**
 * Simple environment validator. Call early in server startup.
 * - In production: require all keys in requiredProd.
 * - In development: require a minimal set.
 *
 * Throws Error if required variables missing.
 */

const requiredProd = [
  'MONGODB_URI',
  'JWT_SECRET',
  'RAZORPAY_WEBHOOK_SECRET'
];

const requiredDev = [
  // allow missing DB in local dev if you use a different local setup,
  // but we still recommend setting these.
  'JWT_SECRET',
  'RAZORPAY_WEBHOOK_SECRET'
];

function missing(list) {
  return list.filter(k => !process.env[k] || String(process.env[k]).trim() === '');
}

/**
 * Validate env. Throws if critical vars missing in production.
 * Returns an object { ok, missing } for informational use.
 */
function validateEnv() {
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const required = env === 'production' ? requiredProd : requiredDev;
  const miss = missing(required);

  if (env === 'production' && miss.length) {
    const msg = `Missing required environment variables for production: ${miss.join(', ')}`;
    throw new Error(msg);
  }

  // log a friendly message in dev
  if (env !== 'production') {
    if (miss.length) {
      console.warn(`Dev environment - recommend setting: ${miss.join(', ')}`);
    } else {
      console.log('Dev environment - all recommended env vars present');
    }
  }

  return { ok: true, env, missing: miss };
}

module.exports = validateEnv;
