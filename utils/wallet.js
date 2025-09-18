// utils/wallet.js
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

async function getOrCreateWallet(ownerId, ownerType, currency = 'USD') {
  // If ownerId is a string, convert to ObjectId using 'new'
  const oid = (typeof ownerId === 'string') ? new mongoose.Types.ObjectId(ownerId) : ownerId;
  let wallet = await Wallet.findOne({ ownerId: oid });
  if (!wallet) {
    wallet = await Wallet.create({ ownerId: oid, ownerType, balance: 0, currency });
  }
  return wallet;
}

async function credit(ownerId, ownerType, amount, opts = {}) {
  if (!amount || Number(amount) <= 0) throw new Error('Amount must be positive');
  const wallet = await getOrCreateWallet(ownerId, ownerType, opts.currency || 'USD');
  wallet.balance = Number((wallet.balance + Number(amount)).toFixed(2));
  wallet.updatedAt = new Date();
  await wallet.save();

  const tx = await Transaction.create({
    walletId: wallet._id,
    ownerId: wallet.ownerId,
    ownerType: wallet.ownerType,
    type: 'credit',
    amount,
    currency: wallet.currency,
    reason: opts.reason || 'credit',
    meta: opts.meta || {}
  });

  return { wallet, tx };
}

async function debit(ownerId, ownerType, amount, opts = {}) {
  if (!amount || Number(amount) <= 0) throw new Error('Amount must be positive');
  const wallet = await getOrCreateWallet(ownerId, ownerType, opts.currency || 'USD');
  if (wallet.balance < amount) throw new Error('Insufficient balance');
  wallet.balance = Number((wallet.balance - Number(amount)).toFixed(2));
  wallet.updatedAt = new Date();
  await wallet.save();

  const tx = await Transaction.create({
    walletId: wallet._id,
    ownerId: wallet.ownerId,
    ownerType: wallet.ownerType,
    type: 'debit',
    amount,
    currency: wallet.currency,
    reason: opts.reason || 'debit',
    meta: opts.meta || {}
  });

  return { wallet, tx };
}

module.exports = { getOrCreateWallet, credit, debit };
