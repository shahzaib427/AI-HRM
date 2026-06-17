const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

// ── Import routes ──────────────────────────────────────────────────────────
const recruitmentRoutes       = require('./routes/recruitmentRoutes');
const publicRoutes            = require('./routes/publicRoutes');
const uploadRoutes            = require('./routes/upload');
const employeeDashboardRoutes = require('./routes/employeeDashboardRoutes');
const messageRoutes           = require('./routes/messageRoutes');
const onboardingRoutes = require('./routes/onboarding');
const contractRoutes = require('./routes/contracts');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes'); // ✅ ADD THIS LINE
const atsProxyRoutes = require('./routes/atsProxyRoutes');
const contactRoutes = require('./routes/contactRoutes');


const adminProfileRoutes    = require('./routes/adminProfileRoutes');
const hrProfileRoutes       = require('./routes/hrProfileRoutes');
const employeeProfileRoutes = require('./routes/employeeProfileRoutes');

const app = express();
const server = http.createServer(app);

// ── Socket.IO Setup ─────────────────────────────────────────────────────────
const io = socketIO(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.log('❌ Socket: No token');
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    console.log('✅ Socket decoded:', decoded);

    const User = require('./models/User');
    const user = await User.findById(decoded.id).select('-password');
    console.log('✅ Socket user:', user ? user.email : 'NOT FOUND');

    if (!user) return next(new Error('User not found'));

    socket.user = user;
    next();
  } catch (err) {
    console.error('❌ Socket auth error:', err.message);
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.user._id, socket.user.role);
  
  socket.join(`user_${socket.user._id}`);
  socket.join(`role_${socket.user.role}`);
  
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.user._id);
  });
});

// Make io accessible in routes
app.set('io', io);

// ── Create upload dirs ─────────────────────────────────────────────────────
['uploads', 'uploads/messages', 'uploads/resumes'].forEach(dir => {
  const full = path.join(__dirname, dir);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, { recursive: true });
    console.log('✅ Created directory:', full);
  }
});

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── MongoDB ────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));

// Profile routes
app.use('/api/admin',     adminProfileRoutes);
app.use('/api/hr',        hrProfileRoutes);
app.use('/api/employees', employeeProfileRoutes);

// Core routes
app.use('/api/employees',          require('./routes/employee'));
app.use('/api/attendance',         require('./routes/attendance'));
app.use('/api/leaves',             require('./routes/leave'));

// ✅ PAYROLL routes
app.use('/api/admin/payroll',      require('./routes/adminPayroll'));
app.use('/api/hr/payroll',         require('./routes/hrPayroll'));
app.use('/api/employee/payroll',   require('./routes/employeePayroll'));
app.use('/api/contact', contactRoutes);

// Notifications route
app.use('/api/notifications',      notificationRoutes);

app.use('/api/onboarding', onboardingRoutes);
app.use('/api/contracts', contractRoutes);

app.use('/api/recruitment',        recruitmentRoutes);
app.use('/api/ats', atsProxyRoutes);
app.use('/api/public',             publicRoutes);
app.use('/api/upload',             uploadRoutes);
app.use('/api/employee-dashboard', employeeDashboardRoutes);
app.use('/api/messages',           messageRoutes);

// ✅ REPORTS ROUTE - ADD THIS LINE
app.use('/api/reports',            reportRoutes);

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'HRM System API is running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    socketio: io ? 'running' : 'not running',
    timestamp: new Date().toISOString(),
    availableRoutes: {
      reports: '/api/reports/*',
      recruitment: '/api/recruitment/*',
      public: '/api/public/*'
    }
  });
});

// ── 404 ────────────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.originalUrl}`,
    availableRoutes: {
      reports: '/api/reports/generate, /api/reports/all, /api/reports/shared, /api/reports/stats',
      adminPayroll: '/api/admin/payroll/*',
      hrPayroll: '/api/hr/payroll/*',
      employeePayroll: '/api/employee/payroll/*'
    }
  });
});

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log('─────────────────────────────────────────');
  console.log('✅ Admin Payroll    → /api/admin/payroll/*');
  console.log('✅ HR Payroll       → /api/hr/payroll/*');
  console.log('✅ Employee Payroll → /api/employee/payroll/*');
  console.log('✅ Notifications    → /api/notifications/*');
  console.log('✅ Reports          → /api/reports/*');  // ✅ ADD THIS LINE
  console.log('✅ Socket.IO        → WebSocket ready');
  console.log('─────────────────────────────────────────\n');
});

// Export for testing
module.exports = { app, server, io };