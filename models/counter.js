const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 1000  // starting number
  }
});

module.exports = mongoose.model('Counter', counterSchema);
