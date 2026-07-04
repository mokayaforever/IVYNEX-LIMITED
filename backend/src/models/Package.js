const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    durationMins: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 1, max: 1000 }, // whole KES shillings
    dataCapMb: { type: Number, default: null }, // null = unlimited
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Package', packageSchema);
