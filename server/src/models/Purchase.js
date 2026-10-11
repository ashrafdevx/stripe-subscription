const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    stripePaymentIntentId: {
      type: String,
      required: true,
      unique: true,
    },
    productName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'succeeded', 'failed', 'canceled'],
      default: 'pending',
      required: true,
    },
    paidAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model('Purchase', purchaseSchema);
