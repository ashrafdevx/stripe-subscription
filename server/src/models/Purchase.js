const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    productSource: {
      type: String,
      enum: ['demo', 'stripe'],
    },
    productId: String,
    priceId: String,
    productDescription: String,
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
