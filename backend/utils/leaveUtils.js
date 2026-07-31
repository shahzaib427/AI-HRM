// utils/leaveUtils.js

// Calculate working days between two dates (excluding weekends)
exports.calculateWorkingDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let days = 0;
  
  // Adjust to start of day
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  while (start <= end) {
    const day = start.getDay();
    if (day !== 0 && day !== 6) { // Skip Sunday (0) and Saturday (6)
      days++;
    }
    start.setDate(start.getDate() + 1);
  }
  
  return days;
};

// Validate leave dates
exports.validateLeaveDates = (startDate, endDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  if (start < today) {
    return { valid: false, error: 'Start date cannot be in the past' };
  }
  
  if (end < start) {
    return { valid: false, error: 'End date cannot be before start date' };
  }
  
  // Maximum leave duration (90 days)
  const maxDays = 90;
  const maxEndDate = new Date(start);
  maxEndDate.setDate(maxEndDate.getDate() + maxDays);
  
  if (end > maxEndDate) {
    return { valid: false, error: `Leave cannot exceed ${maxDays} days` };
  }
  
  return { valid: true };
};

// Get leave type display name
exports.getLeaveTypeDisplay = (type) => {
  const types = {
    annual: 'Annual Leave',
    casual: 'Casual Leave',
    sick: 'Sick Leave',
    earned: 'Earned Leave',
    maternity: 'Maternity Leave',
    paternity: 'Paternity Leave'
  };
  
  return types[type] || type;
};

// Get leave type icon (for frontend)
exports.getLeaveTypeIcon = (type) => {
  const icons = {
    annual: '🏖️',
    casual: '😊',
    sick: '🏥',
    earned: '⭐',
    maternity: '👶',
    paternity: '👨'
  };
  
  return icons[type] || '📅';
};

// Get leave type color (for frontend)
exports.getLeaveTypeColor = (type) => {
  const colors = {
    annual: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    casual: 'bg-gradient-to-br from-green-500 to-emerald-500',
    sick: 'bg-gradient-to-br from-red-500 to-pink-500',
    earned: 'bg-gradient-to-br from-amber-500 to-orange-500',
    maternity: 'bg-gradient-to-br from-purple-500 to-pink-500',
    paternity: 'bg-gradient-to-br from-blue-500 to-indigo-500'
  };
  
  return colors[type] || 'bg-gradient-to-br from-gray-500 to-gray-700';
};