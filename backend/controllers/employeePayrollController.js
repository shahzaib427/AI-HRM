const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const User = require('../models/User');
const mongoose = require('mongoose');
const NotificationService = require('../services/notificationService');

// ======================= HELPER: GENERATE PAYSLIP HTML =======================
const generatePayslipHTML = (payroll, employee) => {
  // Support both naming conventions
  const basicSalary = payroll.basicSalary || payroll.salary || 0;
  const allowances = payroll.allowances || 
    (payroll.fuelAllowance || 0) +
    (payroll.medicalAllowance || 0) +
    (payroll.specialAllowance || 0) +
    (payroll.otherAllowance || 0);
  const bonus = payroll.bonus || 0;
  const deductions = payroll.deductions || 0;
  const netSalary = payroll.netSalary || (basicSalary + allowances + bonus - deductions);
  
  const status = payroll.status || payroll.paymentStatus || 'Pending';
  const month = payroll.month;
  const year = payroll.year;
  const employeeName = payroll.employeeName || employee?.fullName || employee?.name || 'Employee';
  const employeeCode = payroll.employeeCode || employee?.employeeId || 'N/A';
  const employeeDepartment = payroll.employeeDepartment || employee?.department || 'N/A';
  const employeePosition = payroll.employeePosition || employee?.position || 'N/A';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payslip - ${employeeName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; padding: 40px; }
        .payslip { max-width: 900px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
        .header { background: #1e3c72; color: white; padding: 30px; text-align: center; }
        .company-name { font-size: 28px; font-weight: bold; }
        .subtitle { margin-top: 10px; opacity: 0.9; }
        .section { padding: 30px; border-bottom: 1px solid #e2e8f0; }
        .section-title { font-size: 18px; font-weight: bold; color: #1e3c72; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .info-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; }
        .label { font-weight: 600; color: #475569; }
        .value { color: #1e293b; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f1f5f9; }
        .amount { text-align: right; }
        .total-row { background: #f1f5f9; font-weight: bold; }
        .footer { padding: 20px; text-align: center; background: #f8fafc; font-size: 12px; color: #666; }
        .status-paid { color: #10b981; font-weight: bold; }
        .status-pending { color: #f59e0b; font-weight: bold; }
        button { margin-top: 20px; padding: 10px 24px; background: #1e3c72; color: white; border: none; border-radius: 8px; cursor: pointer; }
        @media print { body { background: white; padding: 0; } button { display: none; } }
      </style>
    </head>
    <body>
      <div class="payslip">
        <div class="header">
          <div class="company-name">HRM SYSTEM</div>
          <div class="subtitle">MONTHLY PAYSLIP - ${month} ${year}</div>
        </div>
        <div class="section">
          <div class="section-title">Employee Information</div>
          <div class="info-grid">
            <div class="info-item"><span class="label">Employee ID:</span><span class="value">${employeeCode}</span></div>
            <div class="info-item"><span class="label">Name:</span><span class="value">${employeeName}</span></div>
            <div class="info-item"><span class="label">Department:</span><span class="value">${employeeDepartment}</span></div>
            <div class="info-item"><span class="label">Position:</span><span class="value">${employeePosition}</span></div>
            <div class="info-item"><span class="label">Status:</span>
              <span class="value ${status === 'Paid' || status === 'Processed' ? 'status-paid' : 'status-pending'}">
                ${status === 'Processed' ? 'Paid' : status}
              </span>
            </div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Salary Details</div>
          <table>
            <thead><tr><th>Description</th><th class="amount">Amount (PKR)</th></tr></thead>
            <tbody>
              <tr><td>Basic Salary</td><td class="amount">${basicSalary.toLocaleString()}</td></tr>
              ${allowances > 0 ? `<tr><td>Allowances</td><td class="amount">${allowances.toLocaleString()}</td></tr>` : ''}
              ${bonus > 0 ? `<tr><td>Bonus</td><td class="amount">${bonus.toLocaleString()}</td></tr>` : ''}
              ${deductions > 0 ? `<tr><td>Deductions</td><td class="amount">-${deductions.toLocaleString()}</td></tr>` : ''}
              <tr class="total-row"><td><strong>TOTAL SALARY</strong></td><td class="amount"><strong>PKR ${netSalary.toLocaleString()}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <div class="footer">
          <div>Generated: ${new Date().toLocaleString()}</div>
          <button onclick="window.print()">🖨️ Print Payslip</button>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ======================= GET EMPLOYEE DASHBOARD =======================
const getMyDashboard = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const employeeId = req.user._id;
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear();

    const currentPayroll = await Payroll.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      month: currentMonth,
      year: currentYear
    });

    const ytdSummary = await Payroll.aggregate([
      {
        $match: {
          employeeId: new mongoose.Types.ObjectId(employeeId),
          year: currentYear
        }
      },
      {
        $group: {
          _id: null,
          totalNetSalary: {
            $sum: {
              $add: [
                '$salary',
                { $ifNull: ['$fuelAllowance', 0] },
                { $ifNull: ['$medicalAllowance', 0] },
                { $ifNull: ['$specialAllowance', 0] },
                { $ifNull: ['$otherAllowance', 0] }
              ]
            }
          },
          count: { $sum: 1 },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, 1, 0] }
          }
        }
      }
    ]);

    const recentPayrolls = await Payroll.find({
      employeeId: new mongoose.Types.ObjectId(employeeId)
    })
      .sort({ year: -1, createdAt: -1 })
      .limit(6)
      .lean();

    const currentTotalSalary = currentPayroll
      ? (currentPayroll.salary || 0) +
        (currentPayroll.fuelAllowance || 0) +
        (currentPayroll.medicalAllowance || 0) +
        (currentPayroll.specialAllowance || 0) +
        (currentPayroll.otherAllowance || 0)
      : 0;

    const transformedCurrentPayroll = currentPayroll
      ? {
          _id: currentPayroll._id,
          month: currentPayroll.month,
          year: currentPayroll.year,
          netSalary: currentTotalSalary,
          basicSalary: currentPayroll.salary || 0,
          allowances:
            (currentPayroll.fuelAllowance || 0) +
            (currentPayroll.medicalAllowance || 0) +
            (currentPayroll.specialAllowance || 0) +
            (currentPayroll.otherAllowance || 0),
          bonus: currentPayroll.specialAllowance || 0,
          deductions: 0,
          status: currentPayroll.paymentStatus === 'Paid' ? 'Processed' : 'Pending',
          paymentDate: currentPayroll.paidAt || currentPayroll.createdAt
        }
      : null;

    res.json({
      success: true,
      data: {
        currentPayroll: transformedCurrentPayroll,
        ytdSummary: ytdSummary[0] || { totalNetSalary: 0, count: 0, paidCount: 0 },
        recentPayrolls: recentPayrolls.map(p => ({
          _id: p._id,
          month: p.month,
          year: p.year,
          netSalary: (p.salary || 0) + (p.fuelAllowance || 0) + (p.medicalAllowance || 0) + (p.specialAllowance || 0) + (p.otherAllowance || 0),
          paymentDate: p.paidAt || p.createdAt,
          status: p.paymentStatus === 'Paid' ? 'Processed' : 'Pending'
        }))
      }
    });
  } catch (error) {
    console.error('❌ getMyDashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GET EMPLOYEE PAYROLLS WITH PAGINATION =======================
const getMyPayroll = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const employeeId = req.user._id;
    const { year, status, page = 1, limit = 10 } = req.query;

    const query = { employeeId: new mongoose.Types.ObjectId(employeeId) };
    if (year && year !== 'all') {
      query.year = parseInt(year);
    }
    if (status && status !== 'all') {
      query.paymentStatus = status;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [payrolls, total] = await Promise.all([
      Payroll.find(query)
        .sort({ year: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Payroll.countDocuments(query)
    ]);

    const transformedPayrolls = payrolls.map(payroll => {
      const allowances = (payroll.fuelAllowance || 0) + (payroll.medicalAllowance || 0) + (payroll.specialAllowance || 0) + (payroll.otherAllowance || 0);
      const totalSalary = (payroll.salary || 0) + allowances;

      return {
        _id: payroll._id,
        month: payroll.month,
        year: payroll.year,
        basicSalary: payroll.salary || 0,
        allowances: allowances,
        bonus: payroll.specialAllowance || 0,
        deductions: 0,
        netSalary: totalSalary,
        status: payroll.paymentStatus === 'Paid' ? 'Processed' : 'Pending',
        paymentDate: payroll.paidAt || payroll.createdAt,
        createdAt: payroll.createdAt,
        updatedAt: payroll.updatedAt
      };
    });

    res.json({
      success: true,
      data: transformedPayrolls,
      total: total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum
    });
  } catch (error) {
    console.error('❌ getMyPayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GET PAYROLL YEARS =======================
const getPayrollYears = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const employeeId = req.user._id;

    const years = await Payroll.aggregate([
      { $match: { employeeId: new mongoose.Types.ObjectId(employeeId) } },
      { $group: { _id: '$year' } },
      { $sort: { _id: -1 } }
    ]);

    let yearList = years.map(item => item._id);
    const currentYear = new Date().getFullYear();
    if (!yearList.includes(currentYear)) {
      yearList.unshift(currentYear);
    }

    res.json({ success: true, data: yearList });
  } catch (error) {
    console.error('❌ getPayrollYears error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= VIEW PAYSLIP (HTML) =======================
const getMyPayslip = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).send('User not authenticated');
    }

    const { id } = req.params;
    const employeeId = req.user._id;

    const payroll = await Payroll.findOne({
      _id: id,
      employeeId: new mongoose.Types.ObjectId(employeeId)
    });

    if (!payroll) {
      return res.status(404).send('Payslip not found or access denied');
    }

    const employee = await Employee.findById(employeeId);
    const payslipHTML = generatePayslipHTML(payroll, employee);

    // Send notification (optional, can be removed if causing issues)
    try {
      const io = req.app.get('io');
      if (io) {
        const notificationService = new NotificationService(io);
        const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
        for (const hr of hrUsers) {
          await notificationService.createNotification({
            recipient: { userId: hr._id, userModel: 'User', role: hr.role },
            type: 'payroll_processed',
            title: 'Payslip Viewed',
            message: `${req.user.name || req.user.email} viewed their payslip for ${payroll.month} ${payroll.year}`,
            data: { payrollId: payroll._id, month: payroll.month, year: payroll.year },
            priority: 'low'
          }).catch(() => {});
        }
      }
    } catch (notifError) {
      console.log('Notification error (non-critical):', notifError.message);
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(payslipHTML);
  } catch (error) {
    console.error('❌ getMyPayslip error:', error);
    res.status(500).send('Error generating payslip');
  }
};

// ======================= DOWNLOAD PAYSLIP =======================
const downloadPayslip = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { id } = req.params;
    const employeeId = req.user._id;

    const payroll = await Payroll.findOne({
      _id: id,
      employeeId: new mongoose.Types.ObjectId(employeeId)
    });

    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payslip not found or access denied' });
    }

    const employee = await Employee.findById(employeeId);
    const payslipHTML = generatePayslipHTML(payroll, employee);

    // Send notification (optional)
    try {
      const io = req.app.get('io');
      if (io) {
        const notificationService = new NotificationService(io);
        const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
        for (const hr of hrUsers) {
          await notificationService.createNotification({
            recipient: { userId: hr._id, userModel: 'User', role: hr.role },
            type: 'payroll_processed',
            title: 'Payslip Downloaded',
            message: `${req.user.name || req.user.email} downloaded their payslip for ${payroll.month} ${payroll.year}`,
            data: { payrollId: payroll._id, month: payroll.month, year: payroll.year },
            priority: 'low'
          }).catch(() => {});
        }
      }
    } catch (notifError) {
      console.log('Notification error (non-critical):', notifError.message);
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${payroll.month}-${payroll.year}.html"`);
    res.send(payslipHTML);
  } catch (error) {
    console.error('❌ downloadPayslip error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= REQUEST CORRECTION =======================
const requestCorrection = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { id } = req.params;
    const { issue, details } = req.body;
    const employeeId = req.user._id;

    const payroll = await Payroll.findOne({
      _id: id,
      employeeId: new mongoose.Types.ObjectId(employeeId)
    });

    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found or access denied' });
    }

    if (!payroll.correctionRequests) {
      payroll.correctionRequests = [];
    }

    payroll.correctionRequests.push({
      issue: issue || 'Salary Discrepancy',
      details: details || 'No details provided',
      requestedBy: employeeId,
      requestedAt: new Date(),
      status: 'Pending'
    });

    await payroll.save();

    // Send notification to HR
    try {
      const io = req.app.get('io');
      if (io) {
        const notificationService = new NotificationService(io);
        const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
        for (const hr of hrUsers) {
          await notificationService.createNotification({
            recipient: { userId: hr._id, userModel: 'User', role: hr.role },
            type: 'payroll_processed',
            title: 'Payroll Correction Requested',
            message: `${req.user.name || req.user.email} requested a correction for ${payroll.month} ${payroll.year}`,
            data: { payrollId: payroll._id, month: payroll.month, year: payroll.year, issue, details },
            priority: 'high'
          }).catch(() => {});
        }
      }
    } catch (notifError) {
      console.log('Notification error (non-critical):', notifError.message);
    }

    res.json({ success: true, message: 'Correction request submitted successfully' });
  } catch (error) {
    console.error('❌ requestCorrection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getMyDashboard,
  getMyPayroll,
  getPayrollYears,
  getMyPayslip,
  downloadPayslip,
  requestCorrection
};