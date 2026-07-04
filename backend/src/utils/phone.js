const crypto = require('crypto');

const KENYAN_PHONE_RE = /^254(7|1)\d{8}$/;

/** Accepts 07xxxxxxxx, 01xxxxxxxx, 2547xxxxxxxx, +2547xxxxxxxx -> 2547xxxxxxxx */
function normalizePhone(raw) {
  let p = String(raw || '').replace(/\s+/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '254' + p.slice(1);
  return p;
}

function isValidKenyanPhone(phone) {
  return KENYAN_PHONE_RE.test(phone);
}

/** Short random token used as the one-time RADIUS password for a session. */
function generateSessionToken() {
  return crypto.randomBytes(6).toString('hex'); // 12 chars
}

module.exports = { normalizePhone, isValidKenyanPhone, generateSessionToken };
