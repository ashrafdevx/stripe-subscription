const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const Purchase = require('../models/Purchase');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const purchases = await Purchase.find({ user: req.auth.userId })
      .select('productName productDescription amount currency status paidAt createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      purchases: purchases.map((purchase) => ({
        id: purchase._id.toString(),
        productName: purchase.productName,
        productDescription: purchase.productDescription,
        amount: purchase.amount,
        currency: purchase.currency,
        status: purchase.status,
        paidAt: purchase.paidAt,
        createdAt: purchase.createdAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
