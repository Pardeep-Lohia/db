const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    index: true,
    // Generate nanoid-based orderId: ORD-XXXXXX (6 chars)
    default: () => `ORD-${nanoid(6).toUpperCase()}`
  },

  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    minlength: [2, 'Customer name must be at least 2 characters'],
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },

  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Allow formats: +1234567890, 123-456-7890, (123) 456-7890, etc.
        return /^[\d\s\-\+\(\)]+$/.test(v) && v.replace(/\D/g, '').length >= 10;
      },
      message: 'Invalid phone number format'
    }
  },

  product: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [2, 'Product name must be at least 2 characters'],
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },

  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [1000, 'Quantity cannot exceed 1000'],
    default: 1
  },

  status: {
    type: String,
    enum: {
      values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      message: 'Invalid status value'
    },
    default: 'pending',
    index: true
  },

  cancelledAt: {
    type: Date,
    default: null
  },

  cancellationReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    default: null
  },

  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },

  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  }

}, {
  timestamps: true,
  versionKey: 'version',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for common queries
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customerName: 'text', product: 'text' });

module.exports = mongoose.model('Order', orderSchema);
