const Session = require('../models/Session');

// GET /api/sessions/check?phone=2547...&mac=AA:BB:CC:DD:EE:FF
async function check(req, res) {
  const { phone, mac } = req.query;
  if (!phone && !mac) return res.status(400).json({ error: 'phone or mac is required' });

  const or = [];
  if (phone) or.push({ radiusUsername: phone });
  if (mac) or.push({ macAddress: mac });

  const session = await Session.findOne({
    $or: or,
    status: 'ACTIVE',
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: -1 });

  if (!session) return res.json({ active: false });

  res.json({
    active: true,
    expiresAt: session.expiresAt,
    secondsRemaining: Math.max(0, Math.round((session.expiresAt.getTime() - Date.now()) / 1000)),
  });
}

// GET /api/sessions — admin: recent sessions
async function list(req, res) {
  const sessions = await Session.find()
    .populate('package', 'name')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json(sessions);
}

module.exports = { check, list };
