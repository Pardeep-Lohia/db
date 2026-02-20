const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const app = express();

// ===============================
// Security Middleware
// ===============================
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    data: {}
  }
});
app.use('/api', limiter);

// Body parsing with limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ===============================
// MongoDB Connection for Serverless
// ===============================
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb) {
    return cachedDb;
  }
  
  const mongoUri = process.env.MONGO_URI;
  
  if (!mongoUri) {
    throw new Error('MONGO_URI environment variable is not defined');
  }

  try {
    const options = {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const db = await mongoose.connect(mongoUri, options);
    cachedDb = db;
    console.log('MongoDB connected in serverless function');
    return cachedDb;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

// ===============================
// Order Schema (inline for serverless simplicity)
// ===============================
const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    index: true,
    default: () => `ORD-${uuidv4().substring(0, 8).toUpperCase()}`
  },
  customerName: { 
    type: String, 
    required: [true, 'Customer name is required'], 
    trim: true 
  },
  phone: { 
    type: String, 
    required: [true, 'Phone is required'], 
    trim: true 
  },
  product: { 
    type: String, 
    required: [true, 'Product is required'], 
    trim: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: [1, 'Quantity must be at least 1'],
    max: [1000, 'Quantity cannot exceed 1000']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
    index: true
  },
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null },
  notes: { type: String, default: null }
}, { 
  timestamps: true, 
  versionKey: 'version' 
});

// Indexes
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// ===============================
// Status Transitions (Business Rules)
// ===============================
const ALLOWED_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],   // Terminal state
  cancelled: []    // Terminal state - cannot be changed
};

// ===============================
// Validation Helpers
// ===============================
const validateStatusTransition = (currentStatus, newStatus) => {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    return { 
      valid: false, 
      message: `Cannot change status from '${currentStatus}' to '${newStatus}'` 
    };
  }
  return { valid: true };
};

const validateCreateInput = (data) => {
  const errors = [];
  
  if (!data.customerName || data.customerName.trim().length < 2) {
    errors.push('Customer name must be at least 2 characters');
  }
  if (!data.phone || !/^[\d\s\-\+\(\)]+$/.test(data.phone) || data.phone.replace(/\D/g, '').length < 10) {
    errors.push('Valid phone number is required (min 10 digits)');
  }
  if (!data.product || data.product.trim().length < 2) {
    errors.push('Product name must be at least 2 characters');
  }
  if (data.quantity !== undefined && (data.quantity < 1 || data.quantity > 1000)) {
    errors.push('Quantity must be between 1 and 1000');
  }
  
  return errors;
};

// ===============================
// Health Check
// ===============================
app.get('/api/health', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    res.status(isConnected ? 200 : 503).json({
      success: isConnected,
      message: isConnected ? 'API is healthy' : 'DB disconnected',
      data: { timestamp: new Date().toISOString() }
    });
  } catch (error) {
    res.status(503).json({ 
      success: false, 
      message: 'Health check failed', 
      data: {} 
    });
  }
});

// ===============================
// GET /api/orders - Get All Orders
// ===============================
app.get('/api/orders', async (req, res, next) => {
  try {
    await connectDB();
    
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const status = req.query.status;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status && ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    res.json({
      success: true,
      message: 'Orders retrieved successfully',
      data: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
        orders
      }
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// GET /api/orders/:orderId - Get Single Order
// ===============================
app.get('/api/orders/:orderId', async (req, res, next) => {
  try {
    await connectDB();
    
    const { orderId } = req.params;
    
    if (!orderId || orderId.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format',
        data: {}
      });
    }

    const order = await Order.findOne({ orderId }).lean();
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        data: {}
      });
    }

    res.json({ 
      success: true, 
      message: 'Order retrieved successfully', 
      data: order 
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// POST /api/orders - Create Order
// ===============================
app.post('/api/orders', async (req, res, next) => {
  try {
    await connectDB();
    
    const { customerName, phone, product, quantity, notes } = req.body;

    // Input validation
    const validationErrors = validateCreateInput({ customerName, phone, product, quantity });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: { errors: validationErrors }
      });
    }

    // Create order with auto-generated orderId
    const newOrder = new Order({
      customerName: customerName.trim(),
      phone: phone.trim(),
      product: product.trim(),
      quantity: quantity || 1,
      status: 'pending',
      notes: notes?.trim()
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: savedOrder.orderId,
        customerName: savedOrder.customerName,
        phone: savedOrder.phone,
        product: savedOrder.product,
        quantity: savedOrder.quantity,
        status: savedOrder.status,
        createdAt: savedOrder.createdAt,
        updatedAt: savedOrder.updatedAt
      }
    });
  } catch (error) {
    // Handle duplicate orderId
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Order creation failed. Please try again.',
        data: {}
      });
    }
    next(error);
  }
});

// ===============================
// PATCH /api/orders/:orderId - Update Order
// ===============================
app.patch('/api/orders/:orderId', async (req, res, next) => {
  try {
    await connectDB();
    
    const { orderId } = req.params;
    const { status, customerName, phone, product, quantity, notes, cancellationReason } = req.body;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        data: {}
      });
    }

    // Status transition validation
    if (status) {
      const transition = validateStatusTransition(order.status, status);
      if (!transition.valid) {
        return res.status(400).json({
          success: false,
          message: transition.message,
          data: {
            currentStatus: order.status,
            attemptedStatus: status,
            allowedTransitions: ALLOWED_TRANSITIONS[order.status]
          }
        });
      }

      // Handle cancellation
      if (status === 'cancelled') {
        order.cancelledAt = new Date();
        order.cancellationReason = cancellationReason?.trim() || 'Cancelled by user';
      } else {
        order.cancelledAt = null;
        order.cancellationReason = null;
      }

      order.status = status;
    }

    // Field updates
    if (customerName !== undefined) order.customerName = customerName.trim();
    if (phone !== undefined) order.phone = phone.trim();
    if (product !== undefined) order.product = product.trim();
    if (quantity !== undefined) order.quantity = quantity;
    if (notes !== undefined) order.notes = notes?.trim();

    const updatedOrder = await order.save();

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// POST /api/orders/:orderId/cancel - Cancel Order (Proper Cancellation)
// ===============================
app.post('/api/orders/:orderId/cancel', async (req, res, next) => {
  try {
    await connectDB();
    
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        data: {}
      });
    }

    // Check if already cancelled
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled',
        data: {
          orderId: order.orderId,
          cancelledAt: order.cancelledAt,
          cancellationReason: order.cancellationReason
        }
      });
    }

    // Check if delivered (cannot cancel delivered orders)
    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a delivered order',
        data: {}
      });
    }

    // Perform cancellation
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason?.trim() || 'Cancelled by customer';

    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        orderId: order.orderId,
        status: order.status,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason
      }
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// Error Handling Middleware
// ===============================
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  
  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
    
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: message,
    data: {}
  });
});

// ===============================
// Export handler for Vercel
// ===============================
module.exports = async (req, res) => {
  try {
    await connectDB();
    app(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      data: {}
    });
  }
};
