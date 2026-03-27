console.log('🔥🔥🔥 ADMIN DASHBOARD ROUTES FILE IS BEING LOADED! 🔥🔥🔥');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const app = express();

/* ==============================
   IMPORT ROUTES
============================== */

// Core routes
const recruitmentRoutes = require('./routes/recruitmentRoutes');
const publicRoutes = require('./routes/publicRoutes');
const uploadRoutes = require('./routes/upload');
const employeeDashboardRoutes = require('./routes/employeeDashboardRoutes');
const messageRoutes = require('./routes/messageRoutes');

// Profile routes
const adminProfileRoutes = require('./routes/adminProfileRoutes');
const hrProfileRoutes = require('./routes/hrProfileRoutes');
const employeeProfileRoutes = require('./routes/employeeProfileRoutes');

// Dashboard routes
const adminDashboardRoutes = require('./routes/adminDashboardRoutes');

// Other routes
const employeeRoutes = require('./routes/employee');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const adminPayrollRoutes = require('./routes/adminPayroll');
const employeePayrollRoutes = require('./routes/employeePayroll');
const authRoutes = require('./routes/auth');


/* ==============================
   CREATE UPLOAD FOLDERS
============================== */

const createUploadsDir = () => {
  const uploadsDir = path.join(__dirname, 'uploads');
  const messagesDir = path.join(__dirname, 'uploads/messages');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Uploads directory created');
  }

  if (!fs.existsSync(messagesDir)) {
    fs.mkdirSync(messagesDir, { recursive: true });
    console.log('✅ Messages upload directory created');
  }
};

createUploadsDir();


/* ==============================
   MIDDLEWARE
============================== */

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174'
  ],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


/* ==============================
   DATABASE CONNECTION
============================== */

mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));


/* ==============================
   ROUTES
============================== */

// Auth
app.use('/api/auth', authRoutes);

/*
IMPORTANT:
Dashboard routes MUST come before /api/admin
Otherwise /api/admin intercepts them
*/

// Admin dashboard
app.use('/api/admin/dashboard', adminDashboardRoutes);

// Admin profile
app.use('/api/admin', adminProfileRoutes);

// HR profile
app.use('/api/hr', hrProfileRoutes);

// Employee profile
app.use('/api/employees', employeeProfileRoutes);

// Core HR routes
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);

// Payroll
app.use('/api/admin/payroll', adminPayrollRoutes);
app.use('/api/employee/payroll', employeePayrollRoutes);

// Other modules
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/employee-dashboard', employeeDashboardRoutes);

// Messages
app.use('/api/messages', messageRoutes);


/* ==============================
   HEALTH CHECK
============================== */

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HRM API running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});


/* ==============================
   404 HANDLER
============================== */

app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    error: `Route not found: ${req.originalUrl}`
  });
});


/* ==============================
   GLOBAL ERROR HANDLER
============================== */

app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});


/* ==============================
   START SERVER
============================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  console.log(`📊 Dashboard API → http://localhost:${PORT}/api/admin/dashboard/*`);
  console.log(`👑 Admin API → http://localhost:${PORT}/api/admin/*`);
  console.log(`👨‍💼 HR API → http://localhost:${PORT}/api/hr/*`);
  console.log(`👤 Employee API → http://localhost:${PORT}/api/employees/*`);
  console.log(`💬 Messages API → http://localhost:${PORT}/api/messages/*`);
});

