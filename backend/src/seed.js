require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('./models/Package');

const DEFAULT_PACKAGES = [
  { name: '1 Hour Browse', durationMins: 60, price: 10, sortOrder: 1 },
  { name: '3 Hour Browse', durationMins: 180, price: 15, sortOrder: 2 },
  { name: '6 Hour Browse', durationMins: 360, price: 20, sortOrder: 3 },
  { name: '12 Hour Browse', durationMins: 720, price: 25, sortOrder: 4 },
  { name: 'Full Day (24h)', durationMins: 1440, price: 30, sortOrder: 5 },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ivynex_wifi');
  const count = await Package.countDocuments();
  if (count > 0) {
    console.log(`[seed] ${count} package(s) already exist — skipping.`);
  } else {
    await Package.insertMany(DEFAULT_PACKAGES);
    console.log(`[seed] inserted ${DEFAULT_PACKAGES.length} default packages.`);
  }
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] failed:', err.message);
  process.exit(1);
});
