/**
 * FreeRADIUS's rlm_rest module calls /api/radius/authorize and
 * /api/radius/accounting on every hotspot login/accounting packet. Since
 * these endpoints effectively grant or deny internet access, they must not
 * be callable by anyone else — require a shared secret header configured
 * to match radius/mods-available/rest.
 */
function requireRadiusSecret(req, res, next) {
  const provided = req.header('X-Radius-Secret');
  const expected = process.env.RADIUS_REST_SHARED_SECRET;

  if (!expected || provided !== expected) {
    return res.status(401).json({ error: 'Unauthorized RADIUS caller' });
  }
  next();
}

module.exports = { requireRadiusSecret };
