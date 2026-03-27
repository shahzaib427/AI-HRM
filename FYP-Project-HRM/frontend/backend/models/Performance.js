const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
  metric: {
    type: String,
    enum: ['uptime', 'responseTime', 'satisfaction', 'completion'],
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Performance', performanceSchema);