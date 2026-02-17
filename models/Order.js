const mongoose = require('mongoose');
const Counter = require('./Counter');

// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    index: true
  },

  customerName: {
    type: String,
    required: true,
    trim: true
  },

  phone: {
    type: String,
    required: true,
    trim: true
  },

  product: {
    type: String,
    required: true,
    trim: true
  },

  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },

  status: {
    type: String,
    enum: ['pending', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  }

}, {
  timestamps: true,
  versionKey: false
});


// 🔥 Auto-generate readable Order ID before saving
orderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'orderId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    this.orderId = `ORD-${counter.seq}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
