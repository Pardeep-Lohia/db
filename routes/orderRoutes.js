const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { validateCreateOrder, validateUpdateOrder, validateCancelOrder } = require('../middleware/validationMiddleware');

// ===============================
// Allowed Status Transitions (Business Rules)
// ===============================
const ALLOWED_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],   // Terminal state
  cancelled: []    // Terminal state - cannot be changed
};

// ===============================
// Validation Helper
// ===============================
const validateStatusTransition = (currentStatus, newStatus) => {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    return { 
      valid: false, 
      message: `Cannot transition from '${currentStatus}' to '${newStatus}'` 
    };
  }
  return { valid: true };
};

// ===============================
// GET /orders - Get All Orders with Pagination
// ===============================
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const status = req.query.status;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const filter = { isDeleted: false };
    if (status && ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .sort({ [sortBy]: sortOrder })
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
// GET /orders/:orderId - Get Single Order
// ===============================
router.get('/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!orderId || orderId.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format',
        data: {}
      });
    }

    const order = await Order.findOne({ orderId, isDeleted: false }).lean();

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
// POST /orders - Create New Order
// ===============================
router.post('/', validateCreateOrder, async (req, res, next) => {
  try {
    const { customerName, phone, product, quantity, notes } = req.validatedData;

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
// PATCH /orders/:orderId - Update Order (Partial Update)
// ===============================
router.patch('/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, customerName, phone, product, quantity, notes, cancellationReason } = req.body;

    const order = await Order.findOne({ orderId, isDeleted: false });

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
// POST /orders/:orderId/cancel - Cancel Order (Proper Cancellation)
// ===============================
router.post('/:orderId/cancel', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ orderId, isDeleted: false });

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
// PUT /orders/:orderId - Full Update (Replace Order)
// ===============================
router.put('/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { customerName, phone, product, quantity, status, notes } = req.body;

    const order = await Order.findOne({ orderId, isDeleted: false });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        data: {}
      });
    }

    // Status transition validation for PUT
    if (status && status !== order.status) {
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
        order.cancellationReason = 'Cancelled during update';
      } else {
        order.cancelledAt = null;
        order.cancellationReason = null;
      }
    }

    // Update all fields
    order.customerName = customerName?.trim() || order.customerName;
    order.phone = phone?.trim() || order.phone;
    order.product = product?.trim() || order.product;
    order.quantity = quantity || order.quantity;
    if (status) order.status = status;
    order.notes = notes?.trim() || order.notes;

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
// DELETE /orders/:orderId - Soft Delete
// ===============================
router.delete('/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId, isDeleted: false });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        data: {}
      });
    }

    // Perform soft delete
    order.isDeleted = true;
    await order.save();

    res.json({
      success: true,
      message: 'Order deleted successfully',
      data: {
        orderId: order.orderId,
        isDeleted: order.isDeleted
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
