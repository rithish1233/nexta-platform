require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../models');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexta');
  const exists = await User.findOne({ email: 'demo@nexta.ai' });
  if (!exists) {
    await User.create({ name: 'Demo User', email: 'demo@nexta.ai', password: 'demo1234', role: 'manager', domain: 'saas' });
    console.log('[Seed] Created demo@nexta.ai / demo1234');
  } else {
    console.log('[Seed] Demo user already exists');
  }
  await mongoose.disconnect();
  process.exit(0);
}
seed().catch(e => { console.error(e); process.exit(1); });
