require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const orderRoutes = require('./routes/orderRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// ===============================
// Security Middleware
// ===============================
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

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
// Health Check
// ===============================
app.get('/api/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const isConnected = mongoose.connection.readyState === 1;
    
    res.status(isConnected ? 200 : 503).json({
      success: isConnected,
      message: isConnected ? 'API is running and healthy' : 'API is running but DB disconnected',
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
// Routes
// ===============================
app.use('/api/orders', orderRoutes);

// ===============================
// Error Handling Middleware
// ===============================
app.use(notFound);
app.use(errorHandler);

// ===============================
// Start Server
// ===============================
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        console.log('HTTP server closed');
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
