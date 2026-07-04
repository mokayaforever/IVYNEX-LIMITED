const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ivynex_wifi';
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`[mongo] connected -> ${uri}`);
  } catch (err) {
    console.error('[mongo] connection failed:', err.message);
    console.error('[mongo] the API will keep running, but every DB-backed route will fail until MongoDB is reachable.');
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[mongo] disconnected');
  });
}

module.exports = connectDB;
