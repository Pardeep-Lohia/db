const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ===============================
// Middleware
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ===============================
// MongoDB Connection with Caching
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
    const db = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    cachedDb = db;
    console.log('MongoDB connected successfully');
    return cachedDb;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

// ===============================
// Order Model
// ===============================
const orderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  product: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
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
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// ===============================
// Routes
// ===============================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    data: {}
  });
});

// POST /api/orders - Create order
app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, phone, product, quantity, status } = req.body;

    // Validate required fields
    if (!customerName || !phone || !product || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: customerName, phone, product, quantity",
        data: {}
      });
    }

    // Create new order
    const newOrder = new Order({
      customerName,
      phone,
      product,
      quantity,
      status: status || 'pending'
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: savedOrder
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
});

// GET /api/orders - Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "Orders retrieved successfully",
      data: orders
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
});

// GET /api/orders/:id - Get single order
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
        data: {}
      });
    }

    res.json({
      success: true,
      message: "Order retrieved successfully",
      data: order
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
});

// PUT /api/orders/:id - Update order
app.put('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, customerName, phone, product, quantity } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
        data: {}
      });
    }

    // Update fields if provided
    if (status) {
      // Validate status enum
      const validStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be one of: pending, shipped, delivered, cancelled",
          data: {}
        });
      }
      order.status = status;
    }
    if (customerName) order.customerName = customerName;
    if (phone) order.phone = phone;
    if (product) order.product = product;
    if (quantity !== undefined) order.quantity = quantity;

    const updatedOrder = await order.save();

    res.json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
});

// DELETE /api/orders/:id - Delete order
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
        data: {}
      });
    }

    res.json({
      success: true,
      message: "Order deleted successfully",
      data: {}
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
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
      message: "Database connection error",
      data: {}
    });
  }
};
