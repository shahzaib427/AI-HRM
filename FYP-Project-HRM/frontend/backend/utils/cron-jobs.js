const cron = require('node-cron');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { sendAttendanceReportEmail } = require('../controllers/attendanceController');

// Function to send bi-weekly reports
const sendBiWeeklyAttendanceReports = async () => {
  console.log('🕒 Starting bi-weekly attendance report process...');

  try {
    // Get all active employees (excluding admins)
    const employees = await User.find({ 
      isActive: true,
      role: { $ne: 'admin' } // Don't send to admins
    });

    console.log(`👥 Found ${employees.length} employees for reports`);

    if (employees.length === 0) {
      console.log('No employees found for bi-weekly reports');
      return { success: false, message: 'No employees found' };
    }

    const results = [];
    const errors = [];

    // Send report to each employee
    for (const employee of employees) {
      try {
        console.log(`📧 Processing report for ${employee.name} (${employee.email})...`);
        
        // Calculate date range (last 2 weeks)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 14); // 2 weeks ago
        
        // Get attendance data for this employee
        const attendanceData = await Attendance.find({
          employee: employee._id,
          date: { 
            $gte: startDate, 
            $lte: endDate 
          }
        })
        .populate('employee', 'name email employeeId department')
        .sort({ date: -1 });

        if (attendanceData.length === 0) {
          console.log(`⚠️ No attendance data for ${employee.name}`);
          continue;
        }

        // Create mock request/response objects
        const mockReq = {
          params: { employeeId: employee._id.toString() },
          body: {
            periodStart: startDate.toISOString(),
            periodEnd: endDate.toISOString()
          },
          user: { _id: employee._id } // Add user context if needed
        };

        const mockRes = {
          json: (data) => {
            results.push({ 
              employee: employee.name, 
              email: employee.email, 
              success: true,
              data 
            });
            console.log(`✅ Report sent to ${employee.email}`);
          },
          status: () => mockRes
        };

        // Call the sendAttendanceReportEmail function
        await sendAttendanceReportEmail(mockReq, mockRes);
        
        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errors.push({ 
          employee: employee.name, 
          email: employee.email, 
          error: error.message 
        });
        console.error(`❌ Failed to send to ${employee.email}:`, error.message);
      }
    }

    const summary = {
      totalEmployees: employees.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    };

    console.log('📊 Bi-weekly report summary:', JSON.stringify(summary, null, 2));

    return {
      success: true,
      message: `Bi-weekly reports completed: ${results.length} successful, ${errors.length} failed`,
      data: summary
    };

  } catch (error) {
    console.error('❌ Bi-weekly report error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Schedule cron jobs
const initializeCronJobs = () => {
  console.log('⏰ Initializing cron jobs...');

  // Schedule 1: Run every 2 weeks on Monday at 9 AM
  cron.schedule('0 9 */14 * *', async () => {
    console.log('🕒 Running bi-weekly attendance report cron job...');
    const result = await sendBiWeeklyAttendanceReports();
    console.log('📋 Cron job result:', result);
  }, {
    scheduled: true,
    timezone: "Asia/Karachi"
  });

  // Schedule 2: Test job - run every day at 10 AM for testing
  if (process.env.NODE_ENV === 'development') {
    cron.schedule('0 10 * * *', async () => {
      console.log('🧪 Running test attendance report cron job...');
      const result = await sendBiWeeklyAttendanceReports();
      console.log('🧪 Test job result:', result);
    }, {
      scheduled: true,
      timezone: "Asia/Karachi"
    });
  }

  // Schedule 3: Daily cleanup of old CSV files
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running daily cleanup job...');
    // Add cleanup logic here
  }, {
    scheduled: true,
    timezone: "Asia/Karataka"
  });

  console.log('✅ All cron jobs scheduled successfully');
};

module.exports = {
  sendBiWeeklyAttendanceReports,
  initializeCronJobs
};