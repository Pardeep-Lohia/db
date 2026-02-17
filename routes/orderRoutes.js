const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

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
    const { customerName, phone, product } = req.body;

    // Validate required fields
    if (!customerName || !phone || !product) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: customerName, phone, product",
        data: {}
      });
    }

    // 🔹 Auto-generate orderId
    const generateOrderId = () => {
      const random = Math.floor(1000 + Math.random() * 9000);
      return `ORD${Date.now()}${random}`;
    };

    let orderId;
    let exists = true;

    // Ensure unique orderId
    while (exists) {
      orderId = generateOrderId();
      const existingOrder = await Order.findOne({ orderId });
      if (!existingOrder) exists = false;
    }

    // 🔹 Create new order
    const newOrder = new Order({
      orderId,
      customerName,
      phone,
      product,
      status: "placed", // default status
      createdAt: new Date()
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
    const { status, customerName, phone, product } = req.body;

    const order = await Order.findOne({ orderId });

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
