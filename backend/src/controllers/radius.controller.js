const Session = require('../models/Session');

/**
 * POST /api/radius/authorize
 * Called by FreeRADIUS (rlm_rest, "authorize" section) on every hotspot
 * login attempt. Body shape is whatever radius/mods-available/rest sends —
 * in this project's config that's:
 *   { username, password, macAddress, nasIpAddress }
 * where username/password are exactly what the captive portal submitted to
 * MikroTik's hotspot login form.
 *
 * Response is a flat JSON object using FreeRADIUS's "list:Attribute" key
 * convention, which rlm_rest maps directly onto the request's attribute
 * lists (control:, reply:) — see radius/sites-available/default.
 */
async function authorize(req, res) {
  const { username, password, macAddress } = req.body;

  if (!username || !password) {
    return res.json({ 'control:Auth-Type': 'Reject' });
  }

  const session = await Session.findOne({ radiusUsername: username });

  if (!session || session.radiusPassword !== password) {
    return res.json({ 'control:Auth-Type': 'Reject' });
  }

  if (session.status === 'REVOKED') {
    return res.json({ 'control:Auth-Type': 'Reject' });
  }

  const now = new Date();

  if (session.status === 'UNUSED') {
    // First-ever successful login: the paid clock starts now, not at
    // purchase time, so a customer who buys at 9am and connects at noon
    // still gets their full package.
    session.status = 'ACTIVE';
    session.startsAt = now;
    session.expiresAt = new Date(now.getTime() + session.durationMins * 60 * 1000);
    if (macAddress && !session.macAddress) session.macAddress = macAddress;
    await session.save();
  } else if (session.status === 'ACTIVE' && session.expiresAt <= now) {
    session.status = 'EXPIRED';
    await session.save();
    return res.json({ 'control:Auth-Type': 'Reject' });
  } else if (session.status === 'EXPIRED') {
    return res.json({ 'control:Auth-Type': 'Reject' });
  }

  const secondsRemaining = Math.max(1, Math.round((session.expiresAt.getTime() - now.getTime()) / 1000));

  return res.json({
    'control:Auth-Type': 'Accept',
    // MikroTik disconnects the session itself once Session-Timeout elapses.
    'reply:Session-Timeout': secondsRemaining,
    'reply:Idle-Timeout': 600,
  });
}

/**
 * POST /api/radius/accounting
 * Called by FreeRADIUS ("accounting" section) for Start / Interim-Update /
 * Stop packets MikroTik sends throughout (and at the end of) a session.
 */
async function accounting(req, res) {
  const {
    username,
    acctStatusType, // 'Start' | 'Interim-Update' | 'Stop'
    acctSessionId,
    nasIpAddress,
    framedIpAddress,
    inputOctets,
    outputOctets,
  } = req.body;

  const session = await Session.findOne({ radiusUsername: username });
  if (!session) return res.json({ ok: true }); // nothing to reconcile against — ack anyway

  session.acctSessionId = acctSessionId || session.acctSessionId;
  session.nasIpAddress = nasIpAddress || session.nasIpAddress;
  session.framedIpAddress = framedIpAddress || session.framedIpAddress;
  session.inputOctets = Number(inputOctets || 0);
  session.outputOctets = Number(outputOctets || 0);
  session.lastSeenAt = new Date();

  if (acctStatusType === 'Stop' && session.status === 'ACTIVE') {
    session.status = 'EXPIRED'; // device disconnected — package is considered used up
  }

  await session.save();
  res.json({ ok: true });
}

module.exports = { authorize, accounting };
