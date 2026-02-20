const Joi = require('joi');

// Validation schemas for orders
const createOrderSchema = Joi.object({
  customerName: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.empty': 'Customer name is required',
      'string.min': 'Customer name must be at least 2 characters',
      'string.max': 'Customer name cannot exceed 100 characters'
    }),

  phone: Joi.string()
    .pattern(/^[\d\s\-\+\(\)]+$/)
    .min(10)
    .required()
    .messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Invalid phone number format',
      'string.min': 'Phone number must be at least 10 digits'
    }),

  product: Joi.string()
    .min(2)
    .max(200)
    .trim()
    .required()
    .messages({
      'string.empty': 'Product name is required',
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name cannot exceed 200 characters'
    }),

  quantity: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(1)
    .messages({
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 1000'
    }),

  notes: Joi.string()
    .max(1000)
    .trim()
    .allow('', null)
});

const updateOrderSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'processing', 'shipped', 'delivered', 'cancelled')
    .messages({
      'any.only': 'Invalid status value'
    }),

  customerName: Joi.string()
    .min(2)
    .max(100)
    .trim(),

  phone: Joi.string()
    .pattern(/^[\d\s\-\+\(\)]+$/)
    .min(10),

  product: Joi.string()
    .min(2)
    .max(200)
    .trim(),

  quantity: Joi.number()
    .integer()
    .min(1)
    .max(1000),

  notes: Joi.string()
    .max(1000)
    .trim()
    .allow('', null),

  cancellationReason: Joi.string()
    .max(500)
    .trim()
    .allow('', null)
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

const cancelOrderSchema = Joi.object({
  reason: Joi.string()
    .max(500)
    .trim()
    .allow('', null)
});

// Middleware functions
const validateCreateOrder = (req, res, next) => {
  const { error, value } = createOrderSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: { errors }
    });
  }

  req.validatedData = value;
  next();
};

const validateUpdateOrder = (req, res, next) => {
  const { error, value } = updateOrderSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: { errors }
    });
  }

  req.validatedData = value;
  next();
};

const validateCancelOrder = (req, res, next) => {
  const { error, value } = cancelOrderSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: { errors }
    });
  }

  req.validatedData = value;
  next();
};

module.exports = {
  validateCreateOrder,
  validateUpdateOrder,
  validateCancelOrder,
  createOrderSchema,
  updateOrderSchema,
  cancelOrderSchema
};
