const mongoose = require('mongoose');
const axios    = require('axios');
const Attendance = require('../models/Attendance');
const User       = require('../models/User');
const fs   = require('fs');
const path = require('path');
const csv             = require('csv-writer').createObjectCsvWriter;
const csvStringifier  = require('csv-writer').createObjectCsvStringifier;
const nodemailer = require('nodemailer');
const moment     = require('moment');
const NotificationService = require('../services/notificationService');

// =============== EMAIL CONFIGURATION ===============

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER     || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
  });
};

// =============== HELPER FUNCTIONS ===============

const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

// =============== AI / GPS HELPERS ===============

/** Python Flask AI service — same app.py, port 5001 */
const AI_SERVICE_URL   = process.env.AI_SERVICE_URL            || 'http://localhost:5001';
const INTERNAL_TOKEN   = process.env.INTERNAL_SERVICE_TOKEN    || 'internal-secret-change-me';

/** Office location — set these in your .env */
const OFFICE_LAT       = parseFloat(process.env.OFFICE_LAT     || '31.5204');
const OFFICE_LNG       = parseFloat(process.env.OFFICE_LNG     || '74.3587');
const MAX_DISTANCE_M   = parseFloat(process.env.OFFICE_RADIUS  || '100');
const MIN_CONFIDENCE   = parseFloat(process.env.FACE_MIN_CONFIDENCE || '0.70');

/**
 * Haversine formula — returns distance in metres between two GPS points.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R    = 6_371_000;
  const toR  = (d) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Validate GPS — returns { valid, distance, message }
 */
function validateGPS(latitude, longitude) {
  if (process.env.BYPASS_GPS === 'true') {
    return { valid: true, distance: 0, message: 'GPS bypassed (dev mode)' };
  }

  if (latitude == null || longitude == null) {
    return { valid: false, distance: null, message: 'GPS coordinates are required' };
  }
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng)) {
    return { valid: false, distance: null, message: 'Invalid GPS coordinates' };
  }
  const distance = haversineDistance(OFFICE_LAT, OFFICE_LNG, lat, lng);
  const valid    = distance <= MAX_DISTANCE_M;
  return {
    valid,
    distance: Math.round(distance),
    message: valid
      ? `Within office range (${Math.round(distance)} m)`
      : `Out of office range — ${Math.round(distance)} m away (max ${MAX_DISTANCE_M} m)`
  };
} 

/** Call Python AI service to verify a face */
async function callAIVerify(employeeId, imageBase64) {
  const { data } = await axios.post(
    `${AI_SERVICE_URL}/ai/face/verify`,
    { employeeId, image: imageBase64 },
    {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${INTERNAL_TOKEN}` },
      timeout: 30_000
    }
  );
  return data;
}

/** Call Python AI service to register a face */
async function callAIRegister(employeeId, imageBase64) {
  const { data } = await axios.post(
    `${AI_SERVICE_URL}/ai/face/register`,
    { employeeId, image: imageBase64 },
    {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${INTERNAL_TOKEN}` },
      timeout: 30_000
    }
  );
  return data;
}

// =============== CSV EXPORT FUNCTIONS ===============

exports.exportAttendanceCSV = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    let query = {};

    if (employeeId) query.employee = employeeId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = getStartOfDay(startDate);
      if (endDate)   query.date.$lte = getEndOfDay(endDate);
    }
    if (!startDate && !endDate) {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      query.date = { $gte: twoWeeksAgo };
    }

    const attendanceData = await Attendance.find(query)
      .populate('employee', 'name email employeeId department')
      .sort({ date: -1 });

    if (attendanceData.length === 0) {
      return res.status(404).json({ success: false, message: 'No attendance data found for the specified period' });
    }

    const csvData = attendanceData.map(record => ({
      'Employee ID':      record.employee?.employeeId || 'N/A',
      'Employee Name':    record.employee?.name       || 'N/A',
      'Department':       record.employee?.department || 'N/A',
      'Email':            record.employee?.email      || 'N/A',
      'Date':             record.date ? moment(record.date).format('YYYY-MM-DD') : 'N/A',
      'Day':              record.date ? moment(record.date).format('dddd')       : 'N/A',
      'Check In':         record.approvedCheckIn  ? moment(record.approvedCheckIn).format('HH:mm')
                        : record.requestedCheckIn ? moment(record.requestedCheckIn).format('HH:mm') + ' (Pending)' : '--:--',
      'Check Out':        record.approvedCheckOut  ? moment(record.approvedCheckOut).format('HH:mm')
                        : record.requestedCheckOut ? moment(record.requestedCheckOut).format('HH:mm') + ' (Pending)' : '--:--',
      'Total Hours':      record.totalHours?.toFixed(2) || '0.00',
      'Status':           record.status || 'N/A',
      'Late Minutes':     record.lateMinutes || 0,
      'Approval Status':  record.approvedCheckIn && record.approvedCheckOut ? 'Approved'
                        : record.checkInRequest?.approved === false || record.checkOutRequest?.approved === false ? 'Pending' : 'Partial',
      'Remarks':          record.checkInRequest?.remarks || record.checkOutRequest?.remarks || ''
    }));

    const fileName = `attendance_${employeeId ? employeeId + '_' : ''}${moment().format('YYYYMMDD_HHmmss')}.csv`;
    const filePath = path.join(__dirname, '../exports', fileName);

    if (!fs.existsSync(path.join(__dirname, '../exports'))) {
      fs.mkdirSync(path.join(__dirname, '../exports'), { recursive: true });
    }

    const csvWriter = csv({
      path: filePath,
      header: [
        { id: 'Employee ID',     title: 'EMPLOYEE_ID' },
        { id: 'Employee Name',   title: 'EMPLOYEE_NAME' },
        { id: 'Department',      title: 'DEPARTMENT' },
        { id: 'Email',           title: 'EMAIL' },
        { id: 'Date',            title: 'DATE' },
        { id: 'Day',             title: 'DAY' },
        { id: 'Check In',        title: 'CHECK_IN' },
        { id: 'Check Out',       title: 'CHECK_OUT' },
        { id: 'Total Hours',     title: 'TOTAL_HOURS' },
        { id: 'Status',          title: 'STATUS' },
        { id: 'Late Minutes',    title: 'LATE_MINUTES' },
        { id: 'Approval Status', title: 'APPROVAL_STATUS' },
        { id: 'Remarks',         title: 'REMARKS' }
      ]
    });

    await csvWriter.writeRecords(csvData);
    res.download(filePath, fileName, (err) => {
      if (err) console.error('Download error:', err);
      fs.unlinkSync(filePath);
    });

  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.exportEmployeeAttendanceCSV = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { startDate, endDate } = req.query;

    let query = { employee: employeeId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = getStartOfDay(startDate);
      if (endDate)   query.date.$lte = getEndOfDay(endDate);
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.date = { $gte: thirtyDaysAgo };
    }

    const attendanceData = await Attendance.find(query)
      .populate('employee', 'name email employeeId department')
      .sort({ date: -1 });

    const csvData = attendanceData.map(record => ({
      Date:             record.date ? moment(record.date).format('YYYY-MM-DD') : '',
      Day:              record.date ? moment(record.date).format('dddd')       : '',
      'Check In':       record.approvedCheckIn  ? moment(record.approvedCheckIn).format('HH:mm')
                      : record.requestedCheckIn ? moment(record.requestedCheckIn).format('HH:mm') + ' (Pending)' : '--:--',
      'Check Out':      record.approvedCheckOut  ? moment(record.approvedCheckOut).format('HH:mm')
                      : record.requestedCheckOut ? moment(record.requestedCheckOut).format('HH:mm') + ' (Pending)' : '--:--',
      'Total Hours':    record.totalHours?.toFixed(2) || '0.00',
      Status:           record.status || '',
      'Late Minutes':   record.lateMinutes || 0,
      'Approval Status': record.approvedCheckIn && record.approvedCheckOut ? 'Approved'
                       : record.checkInRequest?.approved === false || record.checkOutRequest?.approved === false ? 'Pending' : 'Partial'
    }));

    const fileName = `my_attendance_${moment().format('YYYYMMDD_HHmmss')}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');

    const csvWriter = csvStringifier({
      header: [
        { id: 'Date',            title: 'DATE' },
        { id: 'Day',             title: 'DAY' },
        { id: 'Check In',        title: 'CHECK_IN' },
        { id: 'Check Out',       title: 'CHECK_OUT' },
        { id: 'Total Hours',     title: 'TOTAL_HOURS' },
        { id: 'Status',          title: 'STATUS' },
        { id: 'Late Minutes',    title: 'LATE_MINUTES' },
        { id: 'Approval Status', title: 'APPROVAL_STATUS' }
      ]
    });

    res.send(csvWriter.getHeaderString() + csvWriter.stringifyRecords(csvData));

  } catch (error) {
    console.error('Employee CSV export error:', error);
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send(`Error generating CSV: ${error.message}`);
  }
};

// =============== EMAIL FUNCTIONS ===============

exports.sendAttendanceReportEmail = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.body.employeeId;
    const { periodStart, periodEnd } = req.body;

    const employee = await User.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const endDate   = periodEnd   ? getEndOfDay(periodEnd)     : new Date();
    const startDate = periodStart ? getStartOfDay(periodStart) : new Date();
    startDate.setDate(startDate.getDate() - 14);

    const attendanceData = await Attendance.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate }
    }).populate('employee', 'name email employeeId department').sort({ date: -1 });

    if (attendanceData.length === 0) {
      return res.status(404).json({ success: false, message: 'No attendance data found' });
    }

    const transporter = createTransporter();
    await transporter.sendMail({
      from:    process.env.EMAIL_USER,
      to:      employee.email,
      subject: `Attendance Report — ${employee.name}`,
      text:    `Please find your attendance report attached for the period ${moment(startDate).format('DD MMM YYYY')} to ${moment(endDate).format('DD MMM YYYY')}.`
    });

    res.json({ success: true, message: `Attendance report sent to ${employee.email}` });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAttendanceReports = async (req, res) => {
  try {
    res.json({ success: true, message: 'Attendance reports endpoint', data: [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.sendBiWeeklyReports = async (req, res) => {
  try {
    console.log('🔄 Starting bi-weekly attendance report process...');
    res.json({ success: true, message: 'Bi-weekly reports sent' });
  } catch (error) {
    console.error('Bi-weekly report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// =============== EMPLOYEE FUNCTIONS ===============

exports.getMyAttendance = async (req, res) => {
  try {
    const employeeId = req.user._id || req.user.id;
    const { startDate, endDate } = req.query;

    let query = { employee: employeeId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = getStartOfDay(startDate);
      if (endDate)   query.date.$lte = getEndOfDay(endDate);
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'name email employeeId department')
      .sort({ date: -1 });

    res.json({ success: true, data: attendance, count: attendance.length });
  } catch (error) {
    console.error('❌ Get attendance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ CHECK-IN REQUEST (manual — needs HR approval)
exports.requestCheckIn = async (req, res) => {
  try {
    const employeeId = req.user?._id || req.user?.id;
    if (!employeeId) return res.status(401).json({ success: false, message: 'Authentication failed' });

    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    let attendance = await Attendance.findOne({ employee: employeeId, date: { $gte: today, $lt: tomorrow } });

    const requestedTime = new Date();

    if (!attendance) {
      attendance = new Attendance({
        employee:           employeeId,
        date:               today,
        status:             'checkin_pending',
        checkInRequest:     { requestedAt: requestedTime, approved: false, remarks: 'Awaiting admin approval' },
        requestedCheckIn:   requestedTime,
        employeeName:       req.user?.name,
        employeeEmail:      req.user?.email,
        employeeDepartment: req.user?.department
      });
    } else {
      if (attendance.approvedCheckIn) {
        return res.status(400).json({ success: false, message: 'Already checked in today!' });
      }
      if (attendance.checkInRequest?.approved === false && attendance.checkInRequest?.rejected !== true) {
        return res.status(400).json({ success: false, message: 'Check-in request already pending' });
      }
      attendance.checkInRequest   = { requestedAt: requestedTime, approved: false, remarks: 'New check-in request' };
      attendance.requestedCheckIn = requestedTime;
      attendance.status           = 'checkin_pending';
    }

    const savedAttendance = await attendance.save();

    const io                  = req.app.get('io');
    const notificationService = new NotificationService(io);
    const employee            = await User.findById(employeeId).select('name employeeId');
    const hrUsers             = await User.find({ role: { $in: ['hr', 'admin'] } });

    for (const hr of hrUsers) {
      await notificationService.createNotification({
        recipient: { userId: hr._id, userModel: 'User', role: hr.role },
        sender:    { userId: employeeId, userModel: 'User', name: employee?.name || req.user?.name },
        type:      'attendance_updated',
        title:     'Check-in Request ⏰',
        message:   `${employee?.name || req.user?.name} requested check-in approval at ${requestedTime.toLocaleTimeString()}`,
        data:      { attendanceId: savedAttendance._id, employeeName: employee?.name || req.user?.name, requestedTime, type: 'checkin' },
        priority:  'medium'
      });
    }

    res.json({ success: true, message: '✅ Check-in request sent! Waiting for approval.', data: savedAttendance });

  } catch (error) {
    console.error('❌ Check-in error:', error);
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Duplicate record found' });
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ CHECK-OUT REQUEST (manual — needs HR approval)
exports.requestCheckOut = async (req, res) => {
  try {
    const employeeId = req.user._id || req.user.id;
    const today      = getStartOfDay(new Date());

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date:     { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    }).populate('employee', 'name email employeeId department');

    if (!attendance)              return res.status(400).json({ success: false, message: 'No attendance record found. Please check in first.' });
    if (attendance.approvedCheckOut) return res.status(400).json({ success: false, message: 'Already checked out today' });
    if (!attendance.approvedCheckIn) return res.status(400).json({ success: false, message: 'Your check-in must be approved first' });
    if (attendance.checkOutRequest?.approved === false && attendance.checkOutRequest?.rejected !== true) {
      return res.status(400).json({ success: false, message: 'Check-out request already pending' });
    }

    attendance.checkOutRequest   = { requestedAt: new Date(), approved: false, remarks: 'Awaiting admin approval' };
    attendance.requestedCheckOut = new Date();
    attendance.status            = 'checkout_pending';
    await attendance.save();

    const io                  = req.app.get('io');
    const notificationService = new NotificationService(io);
    const employee            = await User.findById(employeeId).select('name employeeId');
    const hrUsers             = await User.find({ role: { $in: ['hr', 'admin'] } });

    for (const hr of hrUsers) {
      await notificationService.createNotification({
        recipient: { userId: hr._id, userModel: 'User', role: hr.role },
        sender:    { userId: employeeId, userModel: 'User', name: employee?.name || req.user?.name },
        type:      'attendance_updated',
        title:     'Check-out Request ⏰',
        message:   `${employee?.name || req.user?.name} requested check-out approval`,
        data:      { attendanceId: attendance._id, employeeName: employee?.name || req.user?.name, type: 'checkout' },
        priority:  'medium'
      });
    }

    res.json({ success: true, message: 'Check-out request submitted! Waiting for approval.', data: attendance });

  } catch (error) {
    console.error('❌ Checkout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// =============== AI-POWERED CHECK-IN / CHECK-OUT ===============

async function _processAIAttendance(req, res, type) {
  try {
    const employeeId = req.user?._id || req.user?.id;
    if (!employeeId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { image, latitude, longitude } = req.body;

    const gps = validateGPS(latitude, longitude);
    if (!gps.valid) {
      return res.status(400).json({ 
        success: false, 
        stage: 'gps', 
        message: gps.message, 
        distance: gps.distance,
        maxDistance: MAX_DISTANCE_M 
      });
    }

    if (!image) return res.status(400).json({ success: false, message: 'Face image is required' });

    let aiResult;
    try {
      aiResult = await callAIVerify(String(employeeId), image);
    } catch (err) {
      if (err.response?.status === 404) {
        return res.status(400).json({
          success: false, stage: 'face',
          message: 'No registered face found. Please ask HR to register your face first.'
        });
      }
      return res.status(502).json({
        success: false, stage: 'face',
        message: `Face recognition service error: ${err.response?.data?.error || err.message}`
      });
    }

    if (!aiResult.match || aiResult.confidence < MIN_CONFIDENCE) {
      return res.status(401).json({
        success: false, stage: 'face',
        message: aiResult.match
          ? `Low confidence (${(aiResult.confidence * 100).toFixed(1)}%). Please retry in better lighting.`
          : 'Face verification failed — identity could not be confirmed.',
        confidence: aiResult.confidence
      });
    }

    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const now      = new Date();

    const locationData = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
    const aiRemarks    = `AI verified — confidence: ${(aiResult.confidence * 100).toFixed(1)}%, GPS: ${gps.distance} m from office`;

    if (type === 'checkin') {
      let attendance = await Attendance.findOne({ employee: employeeId, date: { $gte: today, $lt: tomorrow } });
      if (attendance?.approvedCheckIn) {
        return res.status(400).json({ success: false, message: 'Already checked in today' });
      }

      if (!attendance) {
        attendance = new Attendance({
          employee:           employeeId,
          date:               today,
          employeeName:       req.user?.name,
          employeeEmail:      req.user?.email,
          employeeDepartment: req.user?.department
        });
      }

      attendance.approvedCheckIn  = now;
      attendance.requestedCheckIn = now;
      attendance.checkInLocation  = locationData;
      attendance.checkInRequest   = { requestedAt: now, approved: true, approvedAt: now, remarks: aiRemarks };

      const expectedStart = new Date(today); expectedStart.setHours(9, 0, 0, 0);
      attendance.lateMinutes = now > expectedStart ? Math.round((now - expectedStart) / 60_000) : 0;
      attendance.status      = attendance.lateMinutes > 0 ? 'late' : 'present';

      await attendance.save();
      return res.json({
        success: true,
        message: `✅ Checked in via AI (${(aiResult.confidence * 100).toFixed(1)}% confidence)`,
        data:    attendance,
        ai:      { confidence: aiResult.confidence, gpsDistance: gps.distance }
      });
    }

    const attendance = await Attendance.findOne({ employee: employeeId, date: { $gte: today, $lt: tomorrow } });
    if (!attendance)               return res.status(400).json({ success: false, message: 'No check-in record found for today' });
    if (!attendance.approvedCheckIn)  return res.status(400).json({ success: false, message: 'Check-in must be approved first' });
    if (attendance.approvedCheckOut)  return res.status(400).json({ success: false, message: 'Already checked out today' });

    attendance.approvedCheckOut  = now;
    attendance.requestedCheckOut = now;
    attendance.checkOutLocation  = locationData;
    attendance.checkOutRequest   = { requestedAt: now, approved: true, approvedAt: now, remarks: aiRemarks };
    attendance.totalHours        = parseFloat(((now - new Date(attendance.approvedCheckIn)) / 3_600_000).toFixed(2));
    attendance.status            = attendance.lateMinutes > 0 ? 'late' : 'present';

    await attendance.save();
    return res.json({
      success:    true,
      message:    `✅ Checked out via AI (${(aiResult.confidence * 100).toFixed(1)}% confidence)`,
      data:       attendance,
      totalHours: attendance.totalHours,
      ai:         { confidence: aiResult.confidence, gpsDistance: gps.distance }
    });

  } catch (err) {
    console.error(`❌ AI ${type} error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** POST /attendance/ai/checkin */
exports.aiCheckIn = (req, res) => _processAIAttendance(req, res, 'checkin');

/** POST /attendance/ai/checkout */
exports.aiCheckOut = (req, res) => _processAIAttendance(req, res, 'checkout');

/**
 * POST /attendance/ai/register-face
 * HR / Admin registers an employee's face using MULTIPLE photos.
 * Body: { employeeId, images: [base64, base64, ...] }
 */
exports.registerFace = async (req, res) => {
  try {
    const { employeeId, images } = req.body;
    const requesterRole = req.user?.role;
    const requesterId    = req.user?._id || req.user?.id;

    console.log('📸 Face Registration Request:');
    console.log('   Requested by:', requesterId, `(${requesterRole})`);
    console.log('   Employee ID:', employeeId);
    console.log('   Images count:', images?.length);

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId is required' });
    }
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one image is required' });
    }
    if (images.length > 20) {
      return res.status(400).json({ success: false, message: `Maximum 20 images allowed, but received ${images.length}` });
    }

    // Need the target's role to enforce the HR rule below
    const employee = await User.findById(employeeId).select('name email role');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // 🔒 Only an Admin can register a face for an HR account.
    // This also blocks an HR user from registering their own face,
    // since they themselves carry the 'hr' role.
    if (employee.role === 'hr' && requesterRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only an Admin can register a face for an HR account. Please ask an Admin to do this.'
      });
    }

    // ── everything below this line is unchanged from your original code ──
    let successfulImages = 0;
    let failedImages = [];
    let finalEmbeddingDim = null;

    for (let i = 0; i < images.length; i++) {
      try {
        const aiResult = await callAIRegister(String(employeeId), images[i]);
        if (aiResult.success) {
          successfulImages++;
          finalEmbeddingDim = aiResult.embeddingDim;
        } else {
          failedImages.push({ index: i + 1, error: aiResult.error || 'Registration failed' });
        }
      } catch (err) {
        const status = err.response?.status;
        const message = err.response?.data?.error || err.message;
        if (status === 401) {
          return res.status(502).json({ success: false, message: 'AI service auth failed — check INTERNAL_SERVICE_TOKEN' });
        }
        if (status === 422) {
          failedImages.push({ index: i + 1, error: message || 'No face detected in image' });
        } else if (!err.response) {
          return res.status(503).json({ success: false, message: 'AI service is unreachable — is it running on port 5001?' });
        } else {
          failedImages.push({ index: i + 1, error: message });
        }
      }
    }

    const successRate = successfulImages / images.length;
    const MIN_SUCCESS_RATE = 0.6;

    if (successfulImages === 0) {
      return res.status(422).json({ success: false, message: 'Face registration failed for all images', details: { failedImages, totalAttempted: images.length } });
    }
    if (successRate < MIN_SUCCESS_RATE) {
      return res.status(422).json({ success: false, message: `Only ${successfulImages}/${images.length} images succeeded (need ${Math.ceil(MIN_SUCCESS_RATE * images.length)} minimum)`, details: { successfulImages, failedImages, totalAttempted: images.length } });
    }

    await User.findByIdAndUpdate(employeeId, { hasFaceRegistered: true, faceRegistrationDate: new Date(), registeredImageCount: successfulImages });

    return res.json({
      success: true,
      message: `Face registered for ${employee.name} using ${successfulImages}/${images.length} photos`,
      employeeId, embeddingDim: finalEmbeddingDim, successfulImages,
      failedImages: failedImages.length > 0 ? failedImages : undefined
    });

  } catch (err) {
    console.error('❌ Register face error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
/**
 * GET /attendance/ai/gps-validate?lat=xx&lng=yy
 */
exports.validateGPSEndpoint = (req, res) => {
  const { lat, lng } = req.query;
  const result = validateGPS(lat, lng);
  return res.json({
    success: true,
    ...result,
    officeLocation: { lat: OFFICE_LAT, lng: OFFICE_LNG },
    maxDistance:    MAX_DISTANCE_M
  });
};

/**
 * GET /attendance/ai/service-health
 */
exports.aiServiceHealth = async (req, res) => {
  try {
    const { data } = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5_000 });
    res.json({ success: true, aiService: data });
  } catch (err) {
    res.status(503).json({ success: false, message: 'AI service is unreachable', error: err.message });
  }
};

// =============== ADMIN FUNCTIONS ===============

exports.getPendingRequests = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    let query = {
      $or: [
        { 'checkInRequest.approved': false },
        { 'checkOutRequest.approved': false }
      ]
    };

    if (type === 'checkin')  query = { 'checkInRequest.approved': false, approvedCheckIn: { $exists: false } };
    if (type === 'checkout') query = { 'checkOutRequest.approved': false, approvedCheckOut: { $exists: false } };

    const total    = await Attendance.countDocuments(query);
    const requests = await Attendance.find(query)
      .populate('employee', 'name email employeeId department')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({ success: true, count: requests.length, total, pages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page), data: requests });
  } catch (error) {
    console.error('❌ Pending requests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.approveCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualTime, remarks } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid attendance record ID' });
    }

    const adminId    = req.user?.id || req.user?._id;
    const admin      = await User.findById(adminId).select('name');
    const attendance = await Attendance.findById(id).populate('employee', 'name email employeeId');

    if (!attendance) return res.status(404).json({ success: false, message: 'Attendance record not found' });
    if (!attendance.checkInRequest || attendance.checkInRequest.approved !== false) {
      return res.status(400).json({ success: false, message: 'Check-in request is not pending' });
    }

    const approvedTime = actualTime ? new Date(actualTime) : attendance.requestedCheckIn || new Date();

    attendance.approvedCheckIn = approvedTime;
    attendance.checkInRequest  = {
      ...attendance.checkInRequest,
      approved:   true,
      approvedBy: adminId,
      approvedAt: new Date(),
      actualTime: approvedTime,
      remarks:    remarks || 'Approved by admin'
    };

    if (attendance.checkOutRequest?.approved === false) {
      attendance.checkOutRequest   = undefined;
      attendance.requestedCheckOut = undefined;
    }

    const expectedStart = new Date(attendance.date); expectedStart.setHours(9, 0, 0, 0);
    if (approvedTime > expectedStart) {
      attendance.lateMinutes = Math.round((approvedTime - expectedStart) / (1000 * 60));
      attendance.status      = 'late';
    } else {
      attendance.status      = 'present';
      attendance.lateMinutes = 0;
    }

    if (attendance.approvedCheckOut) {
      const diffMs = new Date(attendance.approvedCheckOut) - new Date(attendance.approvedCheckIn);
      attendance.totalHours = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)));
    }

    const savedAttendance = await attendance.save();

    const io                  = req.app.get('io');
    const notificationService = new NotificationService(io);
    await notificationService.createNotification({
      recipient: { userId: attendance.employee._id, userModel: 'User', role: 'employee' },
      sender:    { userId: adminId, userModel: 'User', name: admin?.name || req.user?.name },
      type:      'attendance_updated',
      title:     'Check-in Approved ✅',
      message:   `Your check-in for ${new Date(attendance.date).toLocaleDateString()} has been approved${attendance.lateMinutes > 0 ? ` (Late by ${attendance.lateMinutes} min)` : ''}`,
      data:      { attendanceId: savedAttendance._id, date: attendance.date, approvedTime, lateMinutes: attendance.lateMinutes },
      priority:  'medium'
    });

    res.json({ success: true, message: 'Check-in approved and employee notified', data: savedAttendance });

  } catch (error) {
    console.error('❌ Approve check-in error:', error);
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid attendance record ID format' });
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.approveCheckOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualTime, remarks } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid attendance record ID' });
    }

    const adminId    = req.user?.id || req.user?._id;
    const admin      = await User.findById(adminId).select('name');
    const attendance = await Attendance.findById(id).populate('employee', 'name email employeeId');

    if (!attendance)                 return res.status(404).json({ success: false, message: 'Attendance record not found' });
    if (!attendance.checkOutRequest || attendance.checkOutRequest.approved !== false) {
      return res.status(400).json({ success: false, message: 'Check-out request is not pending' });
    }
    if (!attendance.approvedCheckIn) return res.status(400).json({ success: false, message: 'Check-in must be approved first' });

    const approvedTime = actualTime ? new Date(actualTime) : attendance.requestedCheckOut || new Date();

    attendance.approvedCheckOut = approvedTime;
    attendance.checkOutRequest  = {
      ...attendance.checkOutRequest,
      approved:   true,
      approvedBy: adminId,
      approvedAt: new Date(),
      actualTime: approvedTime,
      remarks:    remarks || 'Approved by admin'
    };

    const diffMs = new Date(approvedTime) - new Date(attendance.approvedCheckIn);
    attendance.totalHours = diffMs > 0 ? parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)) : 0;
    attendance.status     = attendance.lateMinutes > 0 ? 'late' : 'present';

    const savedAttendance = await attendance.save();

    const io                  = req.app.get('io');
    const notificationService = new NotificationService(io);
    await notificationService.createNotification({
      recipient: { userId: attendance.employee._id, userModel: 'User', role: 'employee' },
      sender:    { userId: adminId, userModel: 'User', name: admin?.name || req.user?.name },
      type:      'attendance_updated',
      title:     'Check-out Approved ✅',
      message:   `Your check-out for ${new Date(attendance.date).toLocaleDateString()} has been approved. Total: ${attendance.totalHours}h`,
      data:      { attendanceId: savedAttendance._id, date: attendance.date, approvedTime, totalHours: attendance.totalHours },
      priority:  'medium'
    });

    res.json({ success: true, message: 'Check-out approved and employee notified', data: savedAttendance });

  } catch (error) {
    console.error('❌ Approve check-out error:', error);
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid attendance record ID format' });
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, reason } = req.body;

    const attendance = await Attendance.findById(id).populate('employee', 'name email');
    if (!attendance) return res.status(404).json({ success: false, message: 'Record not found' });

    const adminId = req.user?.id || req.user?._id;
    const admin   = await User.findById(adminId).select('name');

    if (type === 'checkin') {
      attendance.checkInRequest = {
        ...attendance.checkInRequest,
        approved: false,
        rejected: true,
        remarks:  reason || 'Rejected by admin'
      };
    } else if (type === 'checkout') {
      attendance.checkOutRequest = {
        ...attendance.checkOutRequest,
        approved: false,
        rejected: true,
        remarks:  reason || 'Rejected by admin'
      };
    }

    await attendance.save();

    const io                  = req.app.get('io');
    const notificationService = new NotificationService(io);
    await notificationService.createNotification({
      recipient: { userId: attendance.employee._id, userModel: 'User', role: 'employee' },
      sender:    { userId: adminId, userModel: 'User', name: admin?.name || req.user?.name },
      type:      'attendance_updated',
      title:     `${type === 'checkin' ? 'Check-in' : 'Check-out'} Request Rejected ❌`,
      message:   `Your ${type} request for ${new Date(attendance.date).toLocaleDateString()} was rejected. Reason: ${reason || 'Not specified'}`,
      data:      { attendanceId: attendance._id, date: attendance.date, type, reason },
      priority:  'high'
    });

    res.json({ success: true, message: `${type.toUpperCase()} request rejected and employee notified` });
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// =============== FULL CRUD ===============

exports.getAllAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 50, employeeId, dateFrom, dateTo, status, search } = req.query;
    let query = {};

    if (employeeId) query.employee = employeeId;
    if (status)     query.status   = status;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = getStartOfDay(dateFrom);
      if (dateTo)   query.date.$lte = getEndOfDay(dateTo);
    }
    if (search) {
      const users = await User.find({
        $or: [
          { name:       { $regex: search, $options: 'i' } },
          { email:      { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      query.employee = { $in: users.map(u => u._id) };
    }

    const total      = await Attendance.countDocuments(query);
    const attendance = await Attendance.find(query)
      .populate('employee', 'name email employeeId department')
      .populate('checkInRequest.approvedBy checkOutRequest.approvedBy', 'name email')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ date: -1 });

    res.json({ success: true, data: attendance, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('❌ GetAllAttendance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createAttendance = async (req, res) => {
  try {
    const attendance = new Attendance(req.body);
    await attendance.save();
    await attendance.populate('employee', 'name email employeeId');
    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const { id }      = req.params;
    const updates     = req.body;
    const adminId     = req.user._id;
    const attendance  = await Attendance.findById(id).populate('employee');
    if (!attendance) return res.status(404).json({ success: false, message: 'Record not found' });

    const allowedUpdates = ['status', 'lateMinutes', 'totalHours', 'approvedCheckIn', 'approvedCheckOut', 'remarks'];
    const invalidFields  = Object.keys(updates).filter(f => !allowedUpdates.includes(f));
    if (invalidFields.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid fields: ${invalidFields.join(', ')}` });
    }

    if (updates.approvedCheckIn && updates.approvedCheckOut) {
      const diffMs = new Date(updates.approvedCheckOut) - new Date(updates.approvedCheckIn);
      updates.totalHours = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)));
    }

    if (updates.approvedCheckIn) {
      const checkInTime   = new Date(updates.approvedCheckIn);
      const expectedStart = new Date(attendance.date); expectedStart.setHours(9, 0, 0, 0);
      if (checkInTime > expectedStart) {
        updates.lateMinutes = Math.round((checkInTime - expectedStart) / (1000 * 60));
        updates.status      = 'late';
      } else {
        updates.lateMinutes = 0;
        updates.status      = 'present';
      }
    }

    Object.assign(attendance, updates, { lastUpdatedBy: adminId, lastUpdatedAt: new Date() });
    await attendance.save();
    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error('❌ Update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.clearStuckCheckout = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ success: false, message: 'Attendance record not found' });

    attendance.checkOutRequest   = undefined;
    attendance.requestedCheckOut = undefined;
    attendance.status            = attendance.approvedCheckIn ? 'present' : attendance.status;
    await attendance.save();

    res.json({ success: true, message: 'Stuck checkout request cleared', data: attendance });
  } catch (error) {
    console.error('❌ Clear stuck checkout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.testEndpoint = async (req, res) => {
  try {
    res.json({
      success:   true,
      message:   'Attendance API is working',
      timestamp: new Date().toISOString(),
      user:      req.user ? { id: req.user._id, email: req.user.email, name: req.user.name } : 'No user authenticated'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};