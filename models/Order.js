const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    index: true,
    default: uuidv4   // 🔥 Auto-generate UUID
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
  timestamps: true,   // 🔥 Better than manual createdAt
  versionKey: false
});

module.exports = mongoose.model('Order', orderSchema);
