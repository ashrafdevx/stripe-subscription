const mongoose = require('mongoose');
const AuthSession = require('../models/AuthSession');
const PaymentLog = require('../models/PaymentLog');
const Purchase = require('../models/Purchase');
const User = require('../models/User');

mongoose.set('bufferCommands', false);

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('Missing MONGODB_URI. Add your MongoDB connection string to server/.env.');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 10000,
    });
    await Promise.all([
      AuthSession.init(),
      Purchase.init(),
      PaymentLog.init(),
      User.init(),
    ]);
  } catch (error) {
    if (error.name === 'MongooseServerSelectionError') {
      throw new Error(
        'Could not reach MongoDB Atlas. Check Atlas Network Access for this machine public IP, confirm the database user and password in MONGODB_URI, and verify the cluster is running.',
        { cause: error },
      );
    }
    throw error;
  }

  console.log('Connected to MongoDB.');
}

module.exports = connectDatabase;
