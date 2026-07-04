const Package = require('../models/Package');
const Transaction = require('../models/Transaction');
const Session = require('../models/Session');
const mpesa = require('../services/mpesa.service');
const { normalizePhone, isValidKenyanPhone, generateSessionToken } = require('../utils/phone');

// POST /api/payments/initiate  { packageId, phone, macAddress? }
async function initiate(req, res) {
  const { packageId, phone: rawPhone, macAddress } = req.body;

  const pkg = await Package.findOne({ _id: packageId, isActive: true });
  if (!pkg) return res.status(404).json({ error: 'Selected package is not available' });

  const phone = normalizePhone(rawPhone || '');
  if (!isValidKenyanPhone(phone)) {
    return res.status(400).json({ error: 'Enter a valid Safaricom/Airtel number, e.g. 0712345678' });
  }

  const tx = await Transaction.create({
    package: pkg._id,
    phone,
    macAddress: macAddress || null,
    amount: pkg.price,
    status: 'PENDING',
  });

  try {
    const stk = await mpesa.stkPush({
      phone,
      amount: pkg.price,
      accountReference: 'IVYNEX-' + String(pkg._id).slice(-6),
      transactionDesc: 'IVYNEX WiFi',
    });

    tx.mpesaCheckoutRequestId = stk.CheckoutRequestID;
    tx.mpesaMerchantRequestId = stk.MerchantRequestID;
    await tx.save();

    res.json({
      transactionId: tx._id,
      checkoutRequestId: stk.CheckoutRequestID,
      message: stk.CustomerMessage || 'Enter your M-Pesa PIN on your phone to complete payment.',
    });
  } catch (err) {
    tx.status = 'FAILED';
    tx.resultDesc = err.response?.data?.errorMessage || err.message;
    await tx.save();
    res.status(502).json({ error: 'Could not reach M-Pesa. Please try again.' });
  }
}

// Shared by both the callback handler and (optionally) a manual reconcile job.
async function finalizeTransaction(tx, { success, mpesaReceipt, resultDesc }) {
  if (tx.status !== 'PENDING') return; // already finalized — avoid double-processing
  tx.status = success ? 'SUCCESS' : 'FAILED';
  tx.mpesaReceipt = mpesaReceipt || null;
  tx.resultDesc = resultDesc || null;
  await tx.save();

  if (!success) return;

  const pkg = await Package.findById(tx.package);

  // The session exists as soon as payment clears, but stays UNUSED (no
  // countdown) until the captive portal actually logs the device in via
  // RADIUS — see radius.controller.js#authorize.
  await Session.create({
    transaction: tx._id,
    package: pkg._id,
    phone: tx.phone,
    macAddress: tx.macAddress,
    radiusUsername: tx.phone,
    radiusPassword: generateSessionToken(),
    durationMins: pkg.durationMins,
    status: 'UNUSED',
  });
}

// GET /api/payments/:transactionId/status
async function status(req, res) {
  const tx = await Transaction.findById(req.params.transactionId);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });

  let session = null;
  if (tx.status === 'SUCCESS') {
    session = await Session.findOne({ transaction: tx._id });
  }
  res.json({ status: tx.status, transaction: tx, session });
}

// POST /api/payments/mpesa/callback — Safaricom Daraja calls this
async function mpesaCallback(req, res) {
  const callback = req.body?.Body?.stkCallback;
  if (!callback) return res.status(400).json({ error: 'Malformed callback' });

  const tx = await Transaction.findOne({ mpesaCheckoutRequestId: callback.CheckoutRequestID });
  if (!tx) return res.status(404).json({ error: 'Unknown transaction' });

  const success = callback.ResultCode === 0;
  const receiptItem = callback.CallbackMetadata?.Item?.find((i) => i.Name === 'MpesaReceiptNumber');

  await finalizeTransaction(tx, {
    success,
    mpesaReceipt: receiptItem?.Value || null,
    resultDesc: callback.ResultDesc,
  });

  // Safaricom just needs a 200 + this shape acknowledging receipt.
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}

module.exports = { initiate, status, mpesaCallback, finalizeTransaction };
