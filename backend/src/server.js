require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cron = require('node-cron');

const connectDB = require('./config/db');
const Session = require('./models/Session');

const packageRoutes = require('./routes/package.routes');
const paymentRoutes = require('./routes/payment.routes');
const radiusRoutes = require('./routes/radius.routes');
const sessionRoutes = require('./routes/session.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/packages', packageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/radius', radiusRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/admin', adminRoutes);

// Central error handler — anything thrown/rejected in a route lands here
// instead of crashing the process or hanging the request.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Housekeeping: flip any ACTIVE session whose time has run out to EXPIRED,
// even if MikroTik never sent a clean RADIUS Accounting-Stop for it.
cron.schedule('* * * * *', async () => {
  try {
    await Session.updateMany(
      { status: 'ACTIVE', expiresAt: { $lte: new Date() } },
      { $set: { status: 'EXPIRED' } }
    );
  } catch (err) {
    console.error('[cron] session expiry sweep failed:', err.message);
  }
});

async function start() {
  await connectDB();
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`IVYNEX WIFI LIMITED backend running on http://localhost:${PORT}`);
  });
}

start();
