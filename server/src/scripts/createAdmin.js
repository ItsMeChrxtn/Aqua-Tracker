// One-time bootstrap script: creates the first Administrator account so
// someone can log in to the Admin panel and create further staff accounts.
// Usage: npm run create-admin -- --name "Juan Dela Cruz" --email admin@aquatrack.local --password changeme123
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const { passwordError } = require('../utils/password');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      out[key] = args[i + 1];
      i += 1;
    }
  }
  return out;
}

async function main() {
  const { name, email, password } = parseArgs();

  if (!name || !email || !password) {
    console.error('Usage: npm run create-admin -- --name "Full Name" --email you@example.com --password yourpassword');
    process.exit(1);
  }
  const invalidPassword = passwordError(password);
  if (invalidPassword) {
    console.error(`${invalidPassword}.`);
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`An account with email ${email} already exists (role: ${existing.role}).`);
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log('Promoted existing account to admin.');
    }
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ name, email: email.toLowerCase(), passwordHash, role: 'admin' });
    console.log(`Admin account created: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
