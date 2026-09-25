const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aquatrack';
  try {
    await mongoose.connect(uri);
    const redacted = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`[db] connected -> ${redacted}`);
  } catch (err) {
    console.error('[db] connection failed:', err.message);
    console.error('[db] make sure MongoDB is running locally (mongod) or MONGO_URI is set correctly.');
    process.exit(1);
  }
}

module.exports = connectDB;
