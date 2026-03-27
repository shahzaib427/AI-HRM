const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const csv = require('csv-writer').createObjectCsvWriter;
const csvStringifier = require('csv-writer').createObjectCsvStringifier;
const nodemailer = require('nodemailer');
const moment = require('moment');

// =============== EMAIL CONFIGURATION ===============

// Configure email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
  });
};

// =============== HELPER FUNCTIONS ===============

// Helper to get start and end of day
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

// =============== CSV EXPORT FUNCTIONS ===============

// Export all attendance data as CSV (Admin)
exports.exportAttendanceCSV = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    let query = {};

    // Filter by employee if specified
    if (employeeId) {
      query.employee = employeeId;
    }

    // Filter by date range if specified
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const fromDate = getStartOfDay(startDate);
        query.date.$gte = fromDate;
      }
      if (endDate) {
        const toDate = getEndOfDay(endDate);
        query.date.$lte = toDate;
      }
    }

    // Default to last 2 weeks if no date range
    if (!startDate && !endDate) {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      query.date = { $gte: twoWeeksAgo };
    }

    const attendanceData = await Attendance.find(query)
      .populate('employee', 'name email employeeId department')
      .sort({ date: -1 });

    if (attendanceData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No attendance data found for the specified period'
      });
    }

    // Format data for CSV
    const csvData = attendanceData.map(record => ({
      'Employee ID': record.employee?.employeeId || 'N/A',
      'Employee Name': record.employee?.name || 'N/A',
      'Department': record.employee?.department || 'N/A',
      'Email': record.employee?.email || 'N/A',
      'Date': record.date ? moment(record.date).format('YYYY-MM-DD') : 'N/A',
      'Day': record.date ? moment(record.date).format('dddd') : 'N/A',
      'Check In': record.approvedCheckIn ? moment(record.approvedCheckIn).format('HH:mm') : 
                  record.requestedCheckIn ? moment(record.requestedCheckIn).format('HH:mm') + ' (Pending)' : '--:--',
      'Check Out': record.approvedCheckOut ? moment(record.approvedCheckOut).format('HH:mm') :
                   record.requestedCheckOut ? moment(record.requestedCheckOut).format('HH:mm') + ' (Pending)' : '--:--',
      'Total Hours': record.totalHours?.toFixed(2) || '0.00',
      'Status': record.status || 'N/A',
      'Late Minutes': record.lateMinutes || 0,
      'Approval Status': record.approvedCheckIn && record.approvedCheckOut ? 'Approved' :
                         record.checkInRequest?.approved === false || record.checkOutRequest?.approved === false ? 'Pending' : 'Partial',
      'Remarks': record.checkInRequest?.remarks || record.checkOutRequest?.remarks || ''
    }));

    // Create CSV file
    const fileName = `attendance_${employeeId ? employeeId + '_' : ''}${moment().format('YYYYMMDD_HHmmss')}.csv`;
    const filePath = path.join(__dirname, '../exports', fileName);

    // Ensure exports directory exists
    if (!fs.existsSync(path.join(__dirname, '../exports'))) {
      fs.mkdirSync(path.join(__dirname, '../exports'), { recursive: true });
    }

    const csvWriter = csv({
      path: filePath,
      header: [
        { id: 'Employee ID', title: 'EMPLOYEE_ID' },
        { id: 'Employee Name', title: 'EMPLOYEE_NAME' },
        { id: 'Department', title: 'DEPARTMENT' },
        { id: 'Email', title: 'EMAIL' },
        { id: 'Date', title: 'DATE' },
        { id: 'Day', title: 'DAY' },
        { id: 'Check In', title: 'CHECK_IN' },
        { id: 'Check Out', title: 'CHECK_OUT' },
        { id: 'Total Hours', title: 'TOTAL_HOURS' },
        { id: 'Status', title: 'STATUS' },
        { id: 'Late Minutes', title: 'LATE_MINUTES' },
        { id: 'Approval Status', title: 'APPROVAL_STATUS' },
        { id: 'Remarks', title: 'REMARKS' }
      ]
    });

    await csvWriter.writeRecords(csvData);

    // Send file as response
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ success: false, error: 'Failed to download CSV' });
      }
      // Clean up file after download
      fs.unlinkSync(filePath);
    });

  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Export individual employee's attendance as CSV (Employee)
exports.exportEmployeeAttendanceCSV = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { startDate, endDate } = req.query;

    let query = { employee: employeeId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const fromDate = getStartOfDay(startDate);
        query.date.$gte = fromDate;
      }
      if (endDate) {
        const toDate = getEndOfDay(endDate);
        query.date.$lte = toDate;
      }
    } else {
      // Default to last 30 days for employees
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.date = { $gte: thirtyDaysAgo };
    }

    const attendanceData = await Attendance.find(query)
      .populate('employee', 'name email employeeId department')
      .sort({ date: -1 });

    // Prepare CSV data
    const csvData = attendanceData.map(record => ({
      Date: record.date ? moment(record.date).format('YYYY-MM-DD') : '',
      Day: record.date ? moment(record.date).format('dddd') : '',
      'Check In': record.approvedCheckIn ? moment(record.approvedCheckIn).format('HH:mm') : 
                  record.requestedCheckIn ? moment(record.requestedCheckIn).format('HH:mm') + ' (Pending)' : '--:--',
      'Check Out': record.approvedCheckOut ? moment(record.approvedCheckOut).format('HH:mm') :
                   record.requestedCheckOut ? moment(record.requestedCheckOut).format('HH:mm') + ' (Pending)' : '--:--',
      'Total Hours': (record.totalHours?.toFixed(2) || '0.00'),
      Status: record.status || '',
      'Late Minutes': record.lateMinutes || 0,
      'Approval Status': record.approvedCheckIn && record.approvedCheckOut ? 'Approved' :
                         record.checkInRequest?.approved === false || record.checkOutRequest?.approved === false ? 'Pending' : 'Partial'
    }));

    // Set headers
    const fileName = `my_attendance_${moment().format('YYYYMMDD_HHmmss')}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');

    // Create CSV writer that writes directly to response
    const csvWriter = csvStringifier({
      header: [
        { id: 'Date', title: 'DATE' },
        { id: 'Day', title: 'DAY' },
        { id: 'Check In', title: 'CHECK_IN' },
        { id: 'Check Out', title: 'CHECK_OUT' },
        { id: 'Total Hours', title: 'TOTAL_HOURS' },
        { id: 'Status', title: 'STATUS' },
        { id: 'Late Minutes', title: 'LATE_MINUTES' },
        { id: 'Approval Status', title: 'APPROVAL_STATUS' }
      ]
    });

    // Write CSV to response
    const headerString = csvWriter.getHeaderString();
    const recordsString = csvWriter.stringifyRecords(csvData);
    
    res.send(headerString + recordsString);

  } catch (error) {
    console.error('Employee CSV export error:', error);
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send(`Error generating CSV: ${error.message}`);
  }
};

// =============== EMAIL FUNCTIONS ===============

// Send attendance report email to employee
exports.sendAttendanceReportEmail = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.body.employeeId;
    const { periodStart, periodEnd } = req.body;

    // Get employee details
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Calculate date range (default: last 2 weeks)
    const endDate = periodEnd ? getEndOfDay(periodEnd) : new Date();
    const startDate = periodStart ? getStartOfDay(periodStart) : new Date();
    startDate.setDate(startDate.getDate() - 14);

    // Get attendance data
    const attendanceData = await Attendance.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate }
    })
    .populate('employee', 'name email employeeId department')
    .sort({ date: -1 });

    if (attendanceData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No attendance data found for the specified period'
      });
    }

    // Create CSV attachment
    const csvData = attendanceData.map(record => ({
      'Date': moment(record.date).format('YYYY-MM-DD'),
      'Day': moment(record.date).format('dddd'),
      'Check In': record.approvedCheckIn ? moment(record.approvedCheckIn).format('HH:mm') : '--:--',
      'Check Out': record.approvedCheckOut ? moment(record.approvedCheckOut).format('HH:mm') : '--:--',
      'Total Hours': record.totalHours?.toFixed(2) || '0.00',
      'Status': record.status || 'N/A'
    }));

    const fileName = `attendance_report_${employee.employeeId}_${moment().format('YYYYMMDD')}.csv`;
    const filePath = path.join(__dirname, '../exports', fileName);

    if (!fs.existsSync(path.join(__dirname, '../exports'))) {
      fs.mkdirSync(path.join(__dirname, '../exports'), { recursive: true });
    }

    const csvWriter = csv({
      path: filePath,
      header: [
        { id: 'Date', title: 'DATE' },
        { id: 'Day', title: 'DAY' },
        { id: 'Check In', title: 'CHECK_IN' },
        { id: 'Check Out', title: 'CHECK_OUT' },
        { id: 'Total Hours', title: 'TOTAL_HOURS' },
        { id: 'Status', title: 'STATUS' }
      ]
    });

    await csvWriter.writeRecords(csvData);

    // Calculate statistics
    const presentDays = attendanceData.filter(r => r.status === 'present' || r.status === 'late').length;
    const totalHours = attendanceData.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const avgHoursPerDay = totalHours / attendanceData.length;

    // Create email content
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'HR System <hr@company.com>',
      to: employee.email,
      subject: `📊 Attendance Report - ${moment(startDate).format('MMM DD')} to ${moment(endDate).format('MMM DD, YYYY')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📊 Attendance Report</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Period: ${moment(startDate).format('MMM DD, YYYY')} - ${moment(endDate).format('MMM DD, YYYY')}</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
            <div style="margin-bottom: 20px;">
              <h2 style="color: #333; margin-bottom: 10px;">Hello ${employee.name},</h2>
              <p style="color: #666; line-height: 1.6;">
                Here is your attendance report for the last 2 weeks. Please find the detailed CSV attachment.
              </p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
              <h3 style="color: #333; margin-bottom: 15px;">📈 Summary</h3>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                <div style="text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #667eea;">${presentDays}</div>
                  <div style="font-size: 12px; color: #666;">Days Present</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #764ba2;">${attendanceData.length}</div>
                  <div style="font-size: 12px; color: #666;">Total Days</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #4CAF50;">${avgHoursPerDay.toFixed(1)}</div>
                  <div style="font-size: 12px; color: #666;">Avg Hours/Day</div>
                </div>
              </div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="color: #333; margin-bottom: 10px;">📋 Recent Attendance</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Status</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  ${attendanceData.slice(0, 5).map(record => `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #eee;">${moment(record.date).format('MMM DD')}</td>
                      <td style="padding: 10px; border-bottom: 1px solid #eee;">
                        <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 12px; background: ${
                          record.status === 'present' ? '#d4edda' :
                          record.status === 'late' ? '#fff3cd' :
                          record.status === 'absent' ? '#f8d7da' : '#e2e3e5'
                        }; color: ${
                          record.status === 'present' ? '#155724' :
                          record.status === 'late' ? '#856404' :
                          record.status === 'absent' ? '#721c24' : '#383d41'
                        };">
                          ${record.status || 'N/A'}
                        </span>
                      </td>
                      <td style="padding: 10px; border-bottom: 1px solid #eee;">${record.totalHours?.toFixed(1) || '0.0'}h</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
              <p>📎 A detailed CSV file is attached to this email.</p>
              <p>If you have any questions about your attendance, please contact HR.</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>This is an automated email from the HR Attendance System</p>
            <p>© ${new Date().getFullYear()} Company Name. All rights reserved.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          path: filePath,
          contentType: 'text/csv'
        }
      ]
    };

    // Send email
    await transporter.sendMail(mailOptions);
    
    // Clean up file
    fs.unlinkSync(filePath);

    // Log the email sent
    console.log(`📧 Attendance report email sent to ${employee.email}`);

    res.json({
      success: true,
      message: `Attendance report sent to ${employee.email}`,
      data: {
        employee: employee.name,
        email: employee.email,
        period: `${moment(startDate).format('MMM DD')} - ${moment(endDate).format('MMM DD, YYYY')}`,
        days: attendanceData.length,
        presentDays,
        averageHours: avgHoursPerDay.toFixed(1)
      }
    });

  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all sent attendance reports
exports.getAttendanceReports = async (req, res) => {
  try {
    // This would typically query a reports collection
    // For now, we'll return a placeholder
    res.json({
      success: true,
      message: 'Attendance reports endpoint',
      data: []
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// =============== AUTOMATIC BI-WEEKLY EMAIL FUNCTION ===============

// This function should be called by a cron job every 2 weeks
exports.sendBiWeeklyReports = async (req, res) => {
  try {
    console.log('🔄 Starting bi-weekly attendance report process...');

    // Get all active employees
    const employees = await User.find({ 
      isActive: true,
      role: { $ne: 'admin' } // Don't send to admins
    });

    if (employees.length === 0) {
      console.log('No employees found for bi-weekly reports');
      return res.json({ success: false, message: 'No employees found' });
    }

    const results = [];
    const errors = [];

    // Send report to each employee
    for (const employee of employees) {
      try {
        // Create mock request object for sendAttendanceReportEmail
        const mockReq = {
          params: { employeeId: employee._id.toString() },
          body: {}
        };

        const mockRes = {
          json: (data) => {
            results.push({ employee: employee.name, email: employee.email, success: true });
            console.log(`✅ Report sent to ${employee.email}`);
          }
        };

        await exports.sendAttendanceReportEmail(mockReq, mockRes);
        
        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        errors.push({ employee: employee.name, email: employee.email, error: error.message });
        console.error(`❌ Failed to send to ${employee.email}:`, error.message);
      }
    }

    const summary = {
      totalEmployees: employees.length,
      successful: results.length,
      failed: errors.length,
      errors
    };

    console.log('📊 Bi-weekly report summary:', summary);

    res.json({
      success: true,
      message: `Bi-weekly reports sent: ${results.length} successful, ${errors.length} failed`,
      data: summary
    });

  } catch (error) {
    console.error('Bi-weekly report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// =============== EMPLOYEE FUNCTIONS ===============

// ✅ FIXED: Get own attendance history
exports.getMyAttendance = async (req, res) => {
  try {
    const employeeId = req.user._id || req.user.id;
    const { startDate, endDate } = req.query;
    
    let query = { employee: employeeId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = getStartOfDay(startDate);
      if (endDate) query.date.$lte = getEndOfDay(endDate);
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'name email employeeId department')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: attendance,
      count: attendance.length,
      message: 'Attendance records retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Get attendance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ✅ FIXED: Check-in request
// ✅ CORRECTED: Check-in request
// ✅ FIXED: Check-in request
exports.requestCheckIn = async (req, res) => {
  try {
    console.log('🔍 req.user for check-in:', JSON.stringify(req.user, null, 2));
    
    // ✅ Get employee ID properly
    const employeeId = req.user?._id || req.user?.id;
    if (!employeeId) {
      return res.status(401).json({
        success: false,
        message: '❌ Authentication failed. No user ID found.'
      });
    }

    console.log('📋 Employee ID for check-in:', employeeId.toString());
    
    // Get today's date at start of day (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('📅 Date range for query:', today, 'to', tomorrow);
    
    // ✅ FIXED: Query using employee field only (not employeeId)
    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: today, $lt: tomorrow }
    });

    console.log('🔍 Found existing attendance:', attendance ? {
      id: attendance._id,
      employee: attendance.employee,
      date: attendance.date,
      status: attendance.status,
      approvedCheckIn: attendance.approvedCheckIn,
      checkInRequest: attendance.checkInRequest
    } : 'None');

    const requestedTime = new Date();
    
    if (!attendance) {
      // Create new attendance record
      console.log('📝 Creating NEW attendance record');
      
      attendance = new Attendance({
        employee: employeeId,
        date: today,
        status: 'checkin_pending',
        checkInRequest: {
          requestedAt: requestedTime,
          approved: false,
          remarks: 'Awaiting admin approval'
        },
        requestedCheckIn: requestedTime,
        // Copy employee info for easy access
        employeeName: req.user?.name,
        employeeEmail: req.user?.email,
        employeeDepartment: req.user?.department
      });
      
      console.log('📊 New attendance object to save:', {
        employee: employeeId.toString(),
        date: today,
        employeeName: req.user?.name
      });
    } else {
      console.log('📋 Found existing record, checking status...');
      
      // If check-in is already approved
      if (attendance.approvedCheckIn) {
        return res.status(400).json({
          success: false,
          message: '✅ You have already checked in today!'
        });
      }
      
      // If check-in request is already pending
      if (attendance.checkInRequest?.approved === false) {
        return res.status(400).json({
          success: false,
          message: '⏳ Your check-in request is already pending approval'
        });
      }
      
      // Update existing record with new check-in request
      attendance.checkInRequest = {
        requestedAt: requestedTime,
        approved: false,
        remarks: 'New check-in request'
      };
      attendance.requestedCheckIn = requestedTime;
      attendance.status = 'checkin_pending';
    }

    // ✅ Save the attendance record
    const savedAttendance = await attendance.save();
    console.log('✅ Attendance saved successfully:', {
      id: savedAttendance._id,
      employee: savedAttendance.employee,
      date: savedAttendance.date,
      status: savedAttendance.status
    });
    
    res.json({ 
      success: true, 
      message: '✅ Check-in request sent successfully!',
      data: savedAttendance 
    });

  } catch (error) {
    console.error('❌ Check-in error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      // Duplicate key error - handle gracefully
      return res.status(409).json({
        success: false,
        message: '⚠️ An attendance record already exists for today. Please refresh the page.',
        error: 'Duplicate record found',
        code: 'DUPLICATE_RECORD'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error'
    });
  }
};



// ✅ FIXED: Check-out request
exports.requestCheckOut = async (req, res) => {
  try {
    const employeeId = req.user._id || req.user.id;
    const today = getStartOfDay(new Date());

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    }).populate('employee', 'name email employeeId department');

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'No attendance record found for today. Please check in first.'
      });
    }

    if (attendance.approvedCheckOut) {
      return res.status(400).json({ success: false, message: 'Already checked out today' });
    }

    if (!attendance.approvedCheckIn) {
      return res.status(400).json({ success: false, message: 'Your check-in must be approved first' });
    }

    if (attendance.checkOutRequest?.approved === false) {
      return res.status(400).json({ success: false, message: 'Check-out request already pending approval' });
    }

    attendance.checkOutRequest = {
      requestedAt: new Date(),
      approved: false,
      remarks: 'Awaiting admin approval'
    };
    attendance.requestedCheckOut = new Date();
    attendance.status = 'checkout_pending';

    await attendance.save();

    res.json({
      success: true,
      message: 'Check-out request submitted. Awaiting admin approval.',
      data: attendance
    });

  } catch (error) {
    console.error('❌ Checkout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// =============== ADMIN FUNCTIONS ===============

// ✅ FIXED: Get pending requests
exports.getPendingRequests = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    let query = {
      $or: [
        { 'checkInRequest.approved': false },
        { 'checkOutRequest.approved': false }
      ]
    };

    if (type === 'checkin') {
      query = { 'checkInRequest.approved': false, approvedCheckIn: { $exists: false } };
    } else if (type === 'checkout') {
      query = { 'checkOutRequest.approved': false, approvedCheckOut: { $exists: false } };
    }

    const total = await Attendance.countDocuments(query);
    const requests = await Attendance.find(query)
      .populate('employee', 'name email employeeId department')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({
      success: true,
      count: requests.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: requests
    });
  } catch (error) {
    console.error('❌ Pending requests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ FIXED: Approve check-in

// ✅ FIXED: Approve check-in
// ✅ FIXED: Approve check-in
exports.approveCheckIn = async (req, res) => {
  try {
    console.log('🔍 Approve Check-in - Starting...');
    console.log('📋 Request params:', req.params);
    console.log('📋 Request body:', req.body);
    console.log('👤 Admin user:', req.user);
    
    const { id } = req.params;
    const { actualTime, remarks } = req.body;
    
    // ✅ Validate ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid attendance record ID' 
      });
    }

    // ✅ Get admin ID
    const adminId = req.user?.id || req.user?._id || req.user?.userId;
    if (!adminId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin authentication required' 
      });
    }

    console.log('🔍 Looking for attendance ID:', id);
    
    // ✅ FIXED: Find attendance with better error handling
    const attendance = await Attendance.findById(id)
      .populate('employee', 'name email employeeId department')
      .populate('checkInRequest.approvedBy', 'name email');

    if (!attendance) {
      console.error('❌ Attendance not found for ID:', id);
      return res.status(404).json({ 
        success: false, 
        message: 'Attendance record not found' 
      });
    }

    console.log('✅ Found attendance:', {
      id: attendance._id,
      employee: attendance.employee?.name,
      status: attendance.status,
      checkInRequest: attendance.checkInRequest
    });

    // ✅ Check if there's a pending check-in request
    if (!attendance.checkInRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'No check-in request found for this record' 
      });
    }

    if (attendance.checkInRequest.approved !== false) {
      return res.status(400).json({ 
        success: false, 
        message: 'Check-in request is not pending approval' 
      });
    }

    // ✅ Set approved time
    const approvedTime = actualTime ? new Date(actualTime) : 
                       attendance.requestedCheckIn || 
                       attendance.checkInRequest?.requestedAt || 
                       new Date();
    
    console.log('⏰ Setting approved time:', approvedTime);

    // ✅ Update attendance record
    attendance.approvedCheckIn = approvedTime;
    attendance.checkInRequest = {
      ...attendance.checkInRequest,
      approved: true,
      approvedBy: adminId,
      approvedAt: new Date(),
      actualTime: approvedTime,
      remarks: remarks || 'Approved by admin'
    };

    // ✅ Clear any pending checkout request
    if (attendance.checkOutRequest?.approved === false) {
      console.log('🔄 Clearing pending checkout request');
      attendance.checkOutRequest = undefined;
      attendance.requestedCheckOut = undefined;
    }

    // ✅ Calculate late minutes
    const expectedStart = new Date(attendance.date);
    expectedStart.setHours(9, 0, 0, 0); // 9 AM
    
    if (approvedTime > expectedStart) {
      attendance.lateMinutes = Math.round((approvedTime - expectedStart) / (1000 * 60));
      attendance.status = 'late';
      console.log(`⏰ Late by ${attendance.lateMinutes} minutes`);
    } else {
      attendance.status = 'present';
      attendance.lateMinutes = 0;
      console.log('✅ On time');
    }

    // ✅ If checkout is already approved, calculate total hours
    if (attendance.approvedCheckOut) {
      const checkInTime = new Date(attendance.approvedCheckIn);
      const checkOutTime = new Date(attendance.approvedCheckOut);
      const diffMs = checkOutTime - checkInTime;
      attendance.totalHours = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)));
      console.log(`⏱️ Total hours: ${attendance.totalHours}`);
    }

    // ✅ Save the record
    const savedAttendance = await attendance.save();
    console.log('💾 Attendance saved successfully:', savedAttendance._id);

    // ✅ Populate the approver info for response
    await savedAttendance.populate('checkInRequest.approvedBy', 'name email');

    res.json({
      success: true,
      message: 'Check-in approved successfully',
      data: savedAttendance
    });

  } catch (error) {
    console.error('❌ Approve check-in error:', error);
    
    // Handle specific errors
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid attendance record ID format' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// ✅ FIXED: Approve check-out
// ✅ FIXED: Approve check-out
exports.approveCheckOut = async (req, res) => {
  try {
    console.log('🔍 Approve Check-out - Starting...');
    console.log('📋 Request params:', req.params);
    console.log('📋 Request body:', req.body);
    console.log('👤 Admin user:', req.user);
    
    const { id } = req.params;
    const { actualTime, remarks } = req.body;
    
    // ✅ Validate ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid attendance record ID' 
      });
    }

    // ✅ Get admin ID
    const adminId = req.user?.id || req.user?._id || req.user?.userId;
    if (!adminId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin authentication required' 
      });
    }

    console.log('🔍 Looking for attendance ID:', id);
    
    // ✅ Find attendance
    const attendance = await Attendance.findById(id)
      .populate('employee', 'name email employeeId department')
      .populate('checkOutRequest.approvedBy', 'name email');

    if (!attendance) {
      console.error('❌ Attendance not found for ID:', id);
      return res.status(404).json({ 
        success: false, 
        message: 'Attendance record not found' 
      });
    }

    console.log('✅ Found attendance:', {
      id: attendance._id,
      employee: attendance.employee?.name,
      status: attendance.status,
      checkOutRequest: attendance.checkOutRequest
    });

    // ✅ Check if there's a pending check-out request
    if (!attendance.checkOutRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'No check-out request found for this record' 
      });
    }

    if (attendance.checkOutRequest.approved !== false) {
      return res.status(400).json({ 
        success: false, 
        message: 'Check-out request is not pending approval' 
      });
    }

    // ✅ Verify check-in is approved
    if (!attendance.approvedCheckIn) {
      return res.status(400).json({ 
        success: false, 
        message: 'Check-in must be approved first' 
      });
    }

    // ✅ Set approved time
    const approvedTime = actualTime ? new Date(actualTime) : 
                       attendance.requestedCheckOut || 
                       attendance.checkOutRequest?.requestedAt || 
                       new Date();
    
    console.log('⏰ Setting approved check-out time:', approvedTime);

    // ✅ Update attendance record
    attendance.approvedCheckOut = approvedTime;
    attendance.checkOutRequest = {
      ...attendance.checkOutRequest,
      approved: true,
      approvedBy: adminId,
      approvedAt: new Date(),
      actualTime: approvedTime,
      remarks: remarks || 'Approved by admin'
    };

    // ✅ Calculate total hours
    const checkInTime = new Date(attendance.approvedCheckIn);
    const checkOutTime = new Date(approvedTime);
    const diffMs = checkOutTime - checkInTime;
    
    if (diffMs > 0) {
      attendance.totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      console.log(`⏱️ Total hours: ${attendance.totalHours}`);
    } else {
      attendance.totalHours = 0;
      console.log('⚠️ Invalid time difference - check-out before check-in');
    }

    // ✅ Update status
    attendance.status = attendance.lateMinutes > 0 ? 'late' : 'present';

    // ✅ Save the record
    const savedAttendance = await attendance.save();
    console.log('💾 Attendance saved successfully:', savedAttendance._id);

    // ✅ Populate the approver info for response
    await savedAttendance.populate('checkOutRequest.approvedBy', 'name email');

    res.json({
      success: true,
      message: 'Check-out approved successfully',
      data: savedAttendance
    });

  } catch (error) {
    console.error('❌ Approve check-out error:', error);
    
    // Handle specific errors
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid attendance record ID format' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};


// Get all attendance (admin dashboard)

exports.getAllAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 50, employeeId, dateFrom, dateTo, status, search } = req.query;
    let query = {};

    if (employeeId) query.employee = employeeId;
    if (status) query.status = status;

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = getStartOfDay(dateFrom);
      if (dateTo) query.date.$lte = getEndOfDay(dateTo);
    }

    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      query.employee = { $in: users.map(user => user._id) };
    }

    const total = await Attendance.countDocuments(query);
    const attendance = await Attendance.find(query)
      .populate('employee', 'name email employeeId department')
      // ✅ ADD THIS LINE to populate approvers
      .populate('checkInRequest.approvedBy checkOutRequest.approvedBy', 'name email')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ date: -1 });

    res.json({
      success: true,
      data: attendance,
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ GetAllAttendance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// =============== FULL CRUD OPERATIONS ===============

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
    const { id } = req.params;
    const updates = req.body;
    const adminId = req.user._id;

    const attendance = await Attendance.findById(id).populate('employee');
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    // Allowed fields
    const allowedUpdates = ['status', 'lateMinutes', 'totalHours', 'approvedCheckIn', 'approvedCheckOut', 'remarks'];
    const invalidFields = Object.keys(updates).filter(field => !allowedUpdates.includes(field));
    if (invalidFields.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid fields: ${invalidFields.join(', ')}` });
    }

    // Auto-calculate total hours
    if (updates.approvedCheckIn && updates.approvedCheckOut) {
      const diffMs = new Date(updates.approvedCheckOut) - new Date(updates.approvedCheckIn);
      updates.totalHours = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)));
    }

    // Auto-calculate late minutes
    if (updates.approvedCheckIn) {
      const checkInTime = new Date(updates.approvedCheckIn);
      const expectedStart = new Date(attendance.date);
      expectedStart.setHours(9, 0, 0, 0);
      
      if (checkInTime > expectedStart) {
        updates.lateMinutes = Math.round((checkInTime - expectedStart) / (1000 * 60));
        updates.status = 'late';
      } else {
        updates.lateMinutes = 0;
        updates.status = 'present';
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
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Reject attendance request
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, reason } = req.body;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    if (type === 'checkin') {
      attendance.checkInRequest = {
        ...attendance.checkInRequest,
        approved: false,
        remarks: reason || 'Rejected by admin'
      };
    } else if (type === 'checkout') {
      attendance.checkOutRequest = {
        ...attendance.checkOutRequest,
        approved: false,
        remarks: reason || 'Rejected by admin'
      };
    }

    await attendance.save();
    res.json({ 
      success: true, 
      message: `${type.toUpperCase()} request rejected` 
    });
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Clear stuck checkout request (for admin)
exports.clearStuckCheckout = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ 
        success: false, 
        message: 'Attendance record not found' 
      });
    }

    // Clear checkout request
    attendance.checkOutRequest = undefined;
    attendance.requestedCheckOut = undefined;
    attendance.status = attendance.approvedCheckIn ? 'present' : attendance.status;
    
    await attendance.save();
    
    console.log('✅ Cleared stuck checkout for attendance:', attendance._id);
    
    res.json({ 
      success: true, 
      message: 'Stuck checkout request cleared successfully',
      data: attendance
    });
  } catch (error) {
    console.error('❌ Clear stuck checkout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// =============== TEST ENDPOINT ===============

// Test endpoint to check if API is working
exports.testEndpoint = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Attendance API is working',
      timestamp: new Date().toISOString(),
      user: req.user ? {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name
      } : 'No user authenticated'
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};