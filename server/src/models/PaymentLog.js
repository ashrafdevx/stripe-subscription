const mongoose = require('mongoose');

const paymentLogSchema = new mongoose.Schema(
  {
    stripeEventId: {
      type: String,
      required: true,
      unique: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    stripePaymentIntentId: String,
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
    },
    outcome: {
      type: String,
      enum: ['succeeded', 'processing', 'failed', 'canceled', 'purchase_not_found', 'ignored'],
      required: true,
    },
    amount: Number,
    currency: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model('PaymentLog', paymentLogSchema);
