const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    phone: { type: String, required: true, index: true },
    macAddress: { type: String, default: null, index: true },

    // Credentials the captive portal hands to the MikroTik hotspot login
    // form, and that FreeRADIUS validates on every connect/re-connect.
    radiusUsername: { type: String, required: true, unique: true, index: true }, // = phone number
    radiusPassword: { type: String, required: true }, // random token, single-use per session

    durationMins: { type: Number, required: true },
    startsAt: { type: Date, default: null }, // set on first successful RADIUS auth, not at purchase
    expiresAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ['UNUSED', 'ACTIVE', 'EXPIRED', 'REVOKED'],
      default: 'UNUSED',
      index: true,
    },

    // Populated by RADIUS accounting (Start/Interim-Update/Stop) via /api/radius/accounting
    acctSessionId: { type: String, default: null },
    nasIpAddress: { type: String, default: null },
    framedIpAddress: { type: String, default: null },
    inputOctets: { type: Number, default: 0 },
    outputOctets: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
