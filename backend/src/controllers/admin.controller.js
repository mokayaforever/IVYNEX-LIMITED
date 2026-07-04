const Transaction = require('../models/Transaction');
const Session = require('../models/Session');

async function stats(req, res) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [today, allTime, activeNow, byPackage] = await Promise.all([
    Transaction.aggregate([
      { $match: { status: 'SUCCESS', createdAt: { $gte: startOfToday } } },
      { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { status: 'SUCCESS' } },
      { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
    ]),
    Session.countDocuments({ status: 'ACTIVE', expiresAt: { $gt: new Date() } }),
    Transaction.aggregate([
      { $match: { status: 'SUCCESS' } },
      {
        $lookup: { from: 'packages', localField: 'package', foreignField: '_id', as: 'pkg' },
      },
      { $unwind: '$pkg' },
      {
        $group: { _id: '$pkg.name', sales: { $sum: 1 }, revenue: { $sum: '$amount' } },
      },
      { $sort: { revenue: -1 } },
    ]),
  ]);

  res.json({
    today: { count: today[0]?.count || 0, revenue: today[0]?.revenue || 0 },
    allTime: { count: allTime[0]?.count || 0, revenue: allTime[0]?.revenue || 0 },
    activeNow,
    byPackage: byPackage.map((p) => ({ name: p._id, sales: p.sales, revenue: p.revenue })),
  });
}

async function transactions(req, res) {
  const rows = await Transaction.find().populate('package', 'name').sort({ createdAt: -1 }).limit(200);
  res.json(rows);
}

module.exports = { stats, transactions };
