const axios = require('axios');

function baseUrl() {
  return process.env.MPESA_ENV === 'production'
    ? process.env.MPESA_BASE_URL_PRODUCTION
    : process.env.MPESA_BASE_URL_SANDBOX;
}

function timestampNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function stkPassword(timestamp) {
  const raw = process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp;
  return Buffer.from(raw).toString('base64');
}

/** OAuth: exchange consumer key/secret for a short-lived bearer token. */
async function getAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const credentials = Buffer.from(`${key}:${secret}`).toString('base64');

  const { data } = await axios.get(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  return data.access_token;
}

/**
 * Sends a Lipa Na M-Pesa Online (STK Push) request. The customer gets a
 * PIN prompt on their phone; Safaricom later POSTs the outcome to
 * MPESA_CALLBACK_URL (handled in controllers/payment.controller.js).
 */
async function stkPush({ phone, amount, accountReference, transactionDesc }) {
  const token = await getAccessToken();
  const timestamp = timestampNow();

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: stkPassword(timestamp),
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: accountReference.slice(0, 12),
    TransactionDesc: transactionDesc.slice(0, 13),
  };

  const { data } = await axios.post(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, payload, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  // { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription, CustomerMessage }
  return data;
}

/**
 * Active poll fallback for environments where the async callback can be
 * slow or unreachable (e.g. sandbox testing behind NAT). Not required if
 * your callback URL is reliably reachable.
 */
async function stkQuery(checkoutRequestId) {
  const token = await getAccessToken();
  const timestamp = timestampNow();

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: stkPassword(timestamp),
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const { data } = await axios.post(`${baseUrl()}/mpesa/stkpushquery/v1/query`, payload, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return data; // { ResultCode, ResultDesc, ... }
}

module.exports = { stkPush, stkQuery, getAccessToken };
