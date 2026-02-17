const mongoose = require('mongoose');

// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
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
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

}, {
  versionKey: false
});

module.exports = mongoose.model('Order', orderSchema);
