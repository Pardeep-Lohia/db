const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// ===============================
// Allowed Status Transitions
// ===============================
const allowedTransitions = {
  pending: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
};

// ===============================
// GET /health
// ===============================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    data: {}
  });
});

// ===============================
// POST /orders
// ===============================
router.post('/orders', async (req, res) => {
  try {
    const { customerName, phone, product, quantity } = req.body;

    // Validate required fields
    if (!customerName || !phone || !product) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: customerName, phone, product",
        data: {}
      });
    }

    // Validate quantity
    if (quantity !== undefined && quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
        data: {}
      });
    }

    // ✅ Let schema auto-generate orderId (UUID)
    const newOrder = new Order({
      customerName,
      phone,
      product,
      quantity: quantity || 1,
      status: "pending"
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

// ===============================
// GET /orders/:orderId
// ===============================
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });

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

// ===============================
// PUT /orders/:orderId
// ===============================
router.put('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, customerName, phone, product, quantity } = req.body;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
        data: {}
      });
    }

    // ===============================
    // SAFE STATUS TRANSITIONS
    // ===============================
    if (status) {
      const currentStatus = order.status;

      if (!allowedTransitions[currentStatus].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status from ${currentStatus} to ${status}`,
          data: {}
        });
      }

      order.status = status;
    }

    // Optional updates
    if (customerName) order.customerName = customerName;
    if (phone) order.phone = phone;
    if (product) order.product = product;

    if (quantity !== undefined) {
      if (quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be at least 1",
          data: {}
        });
      }
      order.quantity = quantity;
    }

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

// ===============================
// DELETE /orders/:orderId
// ===============================
router.delete('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOneAndDelete({ orderId });

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

module.exports = router;
