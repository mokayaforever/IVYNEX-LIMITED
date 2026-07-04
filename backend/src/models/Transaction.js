const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    phone: { type: String, required: true, index: true }, // 2547xxxxxxxx / 2541xxxxxxxx
    macAddress: { type: String, default: null, index: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    mpesaCheckoutRequestId: { type: String, default: null, index: true },
    mpesaMerchantRequestId: { type: String, default: null },
    mpesaReceipt: { type: String, default: null },
    resultDesc: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
