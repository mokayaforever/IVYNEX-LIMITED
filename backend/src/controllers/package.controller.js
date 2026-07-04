const Package = require('../models/Package');

async function listActive(req, res) {
  const packages = await Package.find({ isActive: true }).sort({ sortOrder: 1 });
  res.json(packages);
}

async function listAll(req, res) {
  const packages = await Package.find().sort({ sortOrder: 1 });
  res.json(packages);
}

async function create(req, res) {
  const { name, durationMins, price, dataCapMb, sortOrder } = req.body;
  if (!name || !durationMins || !price) {
    return res.status(400).json({ error: 'name, durationMins and price are required' });
  }
  if (price < 1 || price > 1000) {
    return res.status(400).json({ error: 'price must be a sane whole-shilling amount' });
  }
  const pkg = await Package.create({ name, durationMins, price, dataCapMb: dataCapMb || null, sortOrder: sortOrder || 0 });
  res.status(201).json(pkg);
}

async function update(req, res) {
  const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  res.json(pkg);
}

async function deactivate(req, res) {
  const pkg = await Package.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  res.json({ ok: true });
}

module.exports = { listActive, listAll, create, update, deactivate };
