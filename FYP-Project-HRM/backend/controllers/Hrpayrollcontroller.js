const Payroll = require('../models/Payroll');
const User = require('../models/User');
const mongoose = require('mongoose');
const NotificationService = require('../services/notificationService');

// ======================= GET ALL PAYROLLS =======================
const getAllPayroll = async (req, res) => {
  try {
    console.log('📊 [HR] getAllPayroll called');
    const { month, year, status, employeeId, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (month && month !== 'all') filter.month = month;
    if (year && year !== 'all' && year !== '') filter.year = parseInt(year);
    if (status && status !== 'all') filter.paymentStatus = status;
    if (employeeId && employeeId !== 'all') {
      filter.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [payrolls, total] = await Promise.all([
      Payroll.find(filter).sort({ year: -1, createdAt: -1 }).skip(skip).limit(limitNum),
      Payroll.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: payrolls.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: payrolls
    });
  } catch (error) {
    console.error('❌ [HR] getAllPayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GET PAYROLL STATS =======================
const getPayrollStats = async (req, res) => {
  try {
    console.log('📊 [HR] getPayrollStats called');
    const { month, year } = req.query;

    const filter = {};
    if (month && month !== 'all') filter.month = month;
    if (year && year !== 'all' && year !== '') filter.year = parseInt(year);

    const payrolls = await Payroll.find(filter);

    const totalAmount = payrolls.reduce((sum, p) => {
      return sum + (p.salary || 0) + (p.fuelAllowance || 0) +
             (p.medicalAllowance || 0) + (p.specialAllowance || 0) + (p.otherAllowance || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        totalPayrolls: payrolls.length,
        totalAmount,
        paidPayments: payrolls.filter(p => p.paymentStatus === 'Paid').length,
        pendingPayments: payrolls.filter(p => p.paymentStatus === 'Pending').length,
        failedPayments: payrolls.filter(p => p.paymentStatus === 'Failed').length,
        averageSalary: payrolls.length > 0 ? totalAmount / payrolls.length : 0
      }
    });
  } catch (error) {
    console.error('❌ [HR] getPayrollStats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GET MY OWN PAYROLL =======================
const getMyOwnPayroll = async (req, res) => {
  try {
    const { month, year, status, page = 1, limit = 10 } = req.query;

    const baseFilter = {};
    if (month  && month  !== 'all') baseFilter.month         = month;
    if (year   && year   !== 'all') baseFilter.year          = parseInt(year);
    if (status && status !== 'all') baseFilter.paymentStatus = status;

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

    const filterById    = { ...baseFilter, employeeId: new mongoose.Types.ObjectId(req.user._id) };
    const filterByEmail = { ...baseFilter, employeeEmail: req.user.email };

    let [payrolls, total] = await Promise.all([
      Payroll.find(filterById).sort({ year: -1, createdAt: -1 }).skip(skip).limit(limitNum),
      Payroll.countDocuments(filterById)
    ]);

    if (total === 0 && req.user.email) {
      [payrolls, total] = await Promise.all([
        Payroll.find(filterByEmail).sort({ year: -1, createdAt: -1 }).skip(skip).limit(limitNum),
        Payroll.countDocuments(filterByEmail)
      ]);
    }

    res.json({
      success: true,
      count: payrolls.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: payrolls
    });
  } catch (error) {
    console.error('❌ [HR] getMyOwnPayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GET MY OWN PAYROLL STATS =======================
const getMyOwnPayrollStats = async (req, res) => {
  try {
    let payrolls = await Payroll.find({
      employeeId: new mongoose.Types.ObjectId(req.user._id)
    });

    if (payrolls.length === 0 && req.user.email) {
      payrolls = await Payroll.find({ employeeEmail: req.user.email });
    }

    const totalAmount = payrolls.reduce((sum, p) => {
      return sum + (p.salary || 0) + (p.fuelAllowance || 0) +
        (p.medicalAllowance || 0) + (p.specialAllowance || 0) + (p.otherAllowance || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        totalPayrolls:   payrolls.length,
        totalAmount,
        paidPayments:    payrolls.filter(p => p.paymentStatus === 'Paid').length,
        pendingPayments: payrolls.filter(p => p.paymentStatus === 'Pending').length,
        failedPayments:  payrolls.filter(p => p.paymentStatus === 'Failed').length,
        averageSalary:   payrolls.length > 0 ? totalAmount / payrolls.length : 0
      }
    });
  } catch (error) {
    console.error('❌ [HR] getMyOwnPayrollStats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GET ALL EMPLOYEE PAYROLLS (EXCLUDING HR) =======================
const getEmployeePayrolls = async (req, res) => {
  try {
    console.log('📊 [HR] getEmployeePayrolls called');
    const { month, year, status, employeeId, page = 1, limit = 10, excludeSelf = 'true' } = req.query;

    const filter = {};
    
    if (excludeSelf === 'true' && req.user?.email) {
      filter.employeeEmail = { $ne: req.user.email };
    }
    
    if (month && month !== 'all') filter.month = month;
    if (year && year !== 'all' && year !== '') filter.year = parseInt(year);
    if (status && status !== 'all') filter.paymentStatus = status;
    if (employeeId && employeeId !== 'all') {
      filter.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [payrolls, total] = await Promise.all([
      Payroll.find(filter).sort({ year: -1, createdAt: -1 }).skip(skip).limit(limitNum),
      Payroll.countDocuments(filter)
    ]);

    console.log(`✅ [HR] Found ${payrolls.length} employee payroll records (total: ${total})`);

    res.json({
      success: true,
      count: payrolls.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: payrolls
    });
  } catch (error) {
    console.error('❌ [HR] getEmployeePayrolls error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GET EMPLOYEE PAYROLL STATS (EXCLUDING HR) =======================
const getEmployeePayrollStats = async (req, res) => {
  try {
    console.log('📊 [HR] getEmployeePayrollStats called');

    const filter = {};
    if (req.user?.email) {
      filter.employeeEmail = { $ne: req.user.email };
    }

    const payrolls = await Payroll.find(filter);

    const totalAmount = payrolls.reduce((sum, p) => {
      return sum + (p.salary || 0) + (p.fuelAllowance || 0) +
             (p.medicalAllowance || 0) + (p.specialAllowance || 0) + (p.otherAllowance || 0);
    }, 0);

    const uniqueEmployees = new Set(payrolls.map(p => p.employeeEmail));
    const uniqueEmployeesCount = payrolls.length > 0 ? uniqueEmployees.size : 0;

    res.json({
      success: true,
      data: {
        totalEmployees: uniqueEmployeesCount,
        totalPayrollAmount: totalAmount,
        paidCount: payrolls.filter(p => p.paymentStatus === 'Paid').length,
        pendingCount: payrolls.filter(p => p.paymentStatus === 'Pending').length,
        failedCount: payrolls.filter(p => p.paymentStatus === 'Failed').length,
        averageSalary: payrolls.length > 0 ? totalAmount / payrolls.length : 0
      }
    });
  } catch (error) {
    console.error('❌ [HR] getEmployeePayrollStats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GET MONTHS & YEARS =======================
const getPayrollMonthsYears = async (req, res) => {
  try {
    console.log('📅 [HR] getPayrollMonthsYears called');

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentYear = new Date().getFullYear();
    let existingYears = await Payroll.distinct('year');

    let years = existingYears.length > 0 ? [...existingYears] : [];

    [currentYear - 1, currentYear, currentYear + 1].forEach(y => {
      if (!years.includes(y)) years.push(y);
    });

    years = [...new Set(years)].sort((a, b) => b - a);

    res.json({ success: true, data: { months, years } });
  } catch (error) {
    console.error('❌ [HR] getPayrollMonthsYears error:', error);
    const currentYear = new Date().getFullYear();
    res.json({
      success: true,
      data: {
        months: ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'],
        years: [currentYear + 1, currentYear, currentYear - 1]
      }
    });
  }
};

// ======================= GET EMPLOYEES LIST =======================
const getEmployeesForPayroll = async (req, res) => {
  try {
    console.log('👥 [HR] getEmployeesForPayroll called');

    const employees = await User.find(
      { isActive: true, role: { $in: ['employee', 'hr', 'manager'] } },
      '_id name employeeId email department position salary fuelAllowance medicalAllowance specialAllowance otherAllowance profilePicture phone presentAddress bankName bankAccountNumber bankAccountTitle'
    ).sort({ name: 1 });

    console.log(`✅ [HR] Found ${employees.length} employees`);
    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('❌ [HR] getEmployeesForPayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GET PAYROLL BY ID =======================
const getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }
    res.json({ success: true, data: payroll });
  } catch (error) {
    console.error('❌ [HR] getPayrollById error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= VIEW PAYSLIP HTML =======================
const generatePayslip = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }

    const totalSalary = (payroll.salary || 0) + (payroll.fuelAllowance || 0) +
      (payroll.medicalAllowance || 0) + (payroll.specialAllowance || 0) +
      (payroll.otherAllowance || 0);

    const html = buildPayslipHTML(payroll, totalSalary);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('❌ [HR] generatePayslip error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= DOWNLOAD PAYSLIP - WITH NOTIFICATION =======================
const downloadPayslipFile = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }

    const totalSalary = (payroll.salary || 0) + (payroll.fuelAllowance || 0) +
      (payroll.medicalAllowance || 0) + (payroll.specialAllowance || 0) +
      (payroll.otherAllowance || 0);

    const html = buildPayslipHTML(payroll, totalSalary);
    
    // ✅ SEND NOTIFICATION when payslip is downloaded
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    // Find the employee
    const employee = await User.findOne({ email: payroll.employeeEmail });
    
    if (employee) {
      await notificationService.createNotification({
        recipient: {
          userId: employee._id,
          userModel: 'User',
          role: employee.role || 'employee'
        },
        type: 'payroll_processed',
        title: 'Payslip Downloaded 📄',
        message: `Your payslip for ${payroll.month} ${payroll.year} has been downloaded`,
        data: {
          payrollId: payroll._id,
          month: payroll.month,
          year: payroll.year,
          amount: totalSalary
        },
        priority: 'medium'
      });
      
      console.log(`✅ Notification sent to ${employee.email} for payslip download`);
    }
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition',
      `attachment; filename="payslip_${payroll.employeeCode}_${payroll.month}_${payroll.year}.html"`);
    res.send(html);
  } catch (error) {
    console.error('❌ [HR] downloadPayslipFile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GET PAYSLIP TRANSCRIPT =======================
const getPayslipTranscript = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }

    const totalSalary = (payroll.salary || 0) + (payroll.fuelAllowance || 0) +
      (payroll.medicalAllowance || 0) + (payroll.specialAllowance || 0) +
      (payroll.otherAllowance || 0);

    res.json({
      success: true,
      data: {
        employeeName: payroll.employeeName,
        employeeCode: payroll.employeeCode,
        employeeDepartment: payroll.employeeDepartment,
        month: payroll.month,
        year: payroll.year,
        salary: payroll.salary,
        fuelAllowance: payroll.fuelAllowance,
        medicalAllowance: payroll.medicalAllowance,
        specialAllowance: payroll.specialAllowance,
        otherAllowance: payroll.otherAllowance,
        totalSalary,
        paymentStatus: payroll.paymentStatus,
        paymentDate: payroll.paymentDate,
        bankName: payroll.bankName,
        bankAccountNumber: payroll.bankAccountNumber
      }
    });
  } catch (error) {
    console.error('❌ [HR] getPayslipTranscript error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= UPDATE PAYROLL STATUS - WITH NOTIFICATION =======================
const updatePayrollStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentDate, transactionId, notes } = req.body;

    console.log(`💰 [HR] Updating payroll ${id} → ${paymentStatus}`);

    const originalPayroll = await Payroll.findById(id);
    if (!originalPayroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }

    const updateData = {
      paymentStatus,
      ...(paymentDate && { paymentDate }),
      ...(transactionId && { transactionId }),
      ...(notes && { notes }),
      ...(paymentStatus === 'Paid' && { paidAt: new Date() })
    };

    const payroll = await Payroll.findByIdAndUpdate(id, updateData, { new: true });

    // ✅ SEND NOTIFICATION when payment status changes
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    // Find the employee
    const employee = await User.findOne({ email: payroll.employeeEmail });
    
    if (employee) {
      let title, message;
      if (paymentStatus === 'Paid') {
        title = 'Salary Payment Processed 💰';
        message = `Your salary for ${payroll.month} ${payroll.year} has been paid successfully. Amount: $${((payroll.salary || 0) + (payroll.fuelAllowance || 0) + (payroll.medicalAllowance || 0) + (payroll.specialAllowance || 0) + (payroll.otherAllowance || 0)).toLocaleString()}`;
      } else if (paymentStatus === 'Failed') {
        title = 'Salary Payment Failed ❌';
        message = `Your salary payment for ${payroll.month} ${payroll.year} has failed. Please contact HR for assistance.`;
      } else if (paymentStatus === 'Pending') {
        title = 'Salary Payment Pending ⏳';
        message = `Your salary payment for ${payroll.month} ${payroll.year} is pending processing.`;
      } else {
        title = 'Payroll Status Updated';
        message = `Your payroll status for ${payroll.month} ${payroll.year} has been updated to ${paymentStatus}`;
      }
      
      await notificationService.createNotification({
        recipient: {
          userId: employee._id,
          userModel: 'User',
          role: employee.role || 'employee'
        },
        type: 'payroll_processed',
        title: title,
        message: message,
        data: {
          payrollId: payroll._id,
          month: payroll.month,
          year: payroll.year,
          status: paymentStatus,
          transactionId: transactionId
        },
        priority: paymentStatus === 'Paid' ? 'high' : 'medium'
      });
      
      console.log(`✅ Notification sent to ${employee.email} for payment status: ${paymentStatus}`);
    }

    res.json({
      success: true,
      message: `Payroll status updated to ${paymentStatus} and notification sent to employee`,
      data: payroll
    });
  } catch (error) {
    console.error('❌ [HR] updatePayrollStatus error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= DELETE PAYROLL =======================
const deletePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndDelete(req.params.id);
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }
    res.json({ success: true, message: 'Payroll deleted successfully' });
  } catch (error) {
    console.error('❌ [HR] deletePayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= EXPORT TO EXCEL =======================
const exportToExcel = async (req, res) => {
  try {
    const { year, month, status, limit = 10000 } = req.query;

    const filter = {};
    if (year && year !== 'all') filter.year = parseInt(year);
    if (month && month !== 'all') filter.month = month;
    if (status && status !== 'all') filter.paymentStatus = status;

    const payrolls = await Payroll.find(filter).limit(parseInt(limit));

    const exportData = payrolls.map(p => {
      const total = (p.salary || 0) + (p.fuelAllowance || 0) + (p.medicalAllowance || 0) +
        (p.specialAllowance || 0) + (p.otherAllowance || 0);
      return {
        'Employee ID': p.employeeCode || 'N/A',
        'Employee Name': p.employeeName || 'N/A',
        'Employee Email': p.employeeEmail || 'N/A',
        'Department': p.employeeDepartment || 'N/A',
        'Month': p.month,
        'Year': p.year,
        'Basic Salary': p.salary || 0,
        'Fuel Allowance': p.fuelAllowance || 0,
        'Medical Allowance': p.medicalAllowance || 0,
        'Special Allowance': p.specialAllowance || 0,
        'Other Allowance': p.otherAllowance || 0,
        'Total Salary': total,
        'Status': p.paymentStatus || 'Pending',
        'Payment Date': p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '',
        'Payment Method': p.paymentMethod || '',
        'Transaction ID': p.transactionId || '',
        'Bank Name': p.bankName || '',
        'Account Number': p.bankAccountNumber || ''
      };
    });

    res.json({ success: true, data: exportData, count: exportData.length });
  } catch (error) {
    console.error('❌ [HR] exportToExcel error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= VIEW CORRECTION REQUESTS =======================
const getCorrectionRequests = async (req, res) => {
  try {
    console.log('📋 [HR] getCorrectionRequests called');

    const payrolls = await Payroll.find({
      'correctionRequests.0': { $exists: true }
    })
      .select('employeeName employeeCode month year correctionRequests')
      .sort({ createdAt: -1 });

    const requests = [];
    payrolls.forEach(p => {
      p.correctionRequests.forEach(cr => {
        requests.push({
          payrollId: p._id,
          employeeName: p.employeeName,
          employeeCode: p.employeeCode,
          month: p.month,
          year: p.year,
          issue: cr.issue,
          details: cr.details,
          requestedAt: cr.requestedAt,
          status: cr.status
        });
      });
    });

    res.json({ success: true, data: requests, count: requests.length });
  } catch (error) {
    console.error('❌ [HR] getCorrectionRequests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= PRIVATE HELPER: BUILD PAYSLIP HTML =======================
const buildPayslipHTML = (payroll, totalSalary) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Payslip - ${payroll.employeeName}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; padding: 40px; }
      .payslip { max-width: 900px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden; }
      .header { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 30px; text-align: center; }
      .company-name { font-size: 28px; font-weight: bold; }
      .employee-section { padding: 30px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
      .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .info-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; }
      .label { font-weight: 600; color: #475569; }
      .salary-section { padding: 30px; }
      .section-title { font-size: 18px; font-weight: bold; color: #1e3c72; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
      th { background: #f1f5f9; }
      .amount { text-align: right; }
      .total-row { background: #f1f5f9; font-weight: bold; }
      .bank-section { padding: 30px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
      .footer { padding: 20px; text-align: center; background: #f1f5f9; font-size: 12px; color: #64748b; }
      .status-paid { color: #10b981; font-weight: bold; }
      .status-pending { color: #f59e0b; font-weight: bold; }
      button { margin: 16px auto; display: block; padding: 10px 24px; background: #1e3c72; color: white; border: none; border-radius: 8px; cursor: pointer; }
      @media print { body { background: white; padding: 0; } button { display: none; } }
    </style>
  </head>
  <body>
    <div class="payslip">
      <div class="header">
        <div class="company-name">HRM SYSTEM</div>
        <div style="margin-top:8px">MONTHLY PAYSLIP — ${payroll.month} ${payroll.year}</div>
      </div>
      <div class="employee-section">
        <div class="section-title">Employee Information</div>
        <div class="info-grid">
          <div class="info-item"><span class="label">Employee ID:</span><span>${payroll.employeeCode || 'N/A'}</span></div>
          <div class="info-item"><span class="label">Name:</span><span>${payroll.employeeName || 'N/A'}</span></div>
          <div class="info-item"><span class="label">Department:</span><span>${payroll.employeeDepartment || 'N/A'}</span></div>
          <div class="info-item"><span class="label">Position:</span><span>${payroll.employeePosition || 'N/A'}</span></div>
          <div class="info-item"><span class="label">Email:</span><span>${payroll.employeeEmail || 'N/A'}</span></div>
          <div class="info-item"><span class="label">Phone:</span><span>${payroll.employeePhone || 'N/A'}</span></div>
          <div class="info-item"><span class="label">Status:</span>
            <span class="${payroll.paymentStatus === 'Paid' ? 'status-paid' : 'status-pending'}">${payroll.paymentStatus || 'Pending'}</span>
          </div>
        </div>
      </div>
      <div class="salary-section">
        <div class="section-title">Salary Breakdown</div>
        <table>
          <thead><tr><th>Earnings</th><th class="amount">Amount (PKR)</th></tr></thead>
          <tbody>
            <tr><td>Basic Salary</td><td class="amount">${(payroll.salary || 0).toLocaleString()}</td></tr>
            <tr><td>Fuel Allowance</td><td class="amount">${(payroll.fuelAllowance || 0).toLocaleString()}</td></tr>
            <tr><td>Medical Allowance</td><td class="amount">${(payroll.medicalAllowance || 0).toLocaleString()}</td></tr>
            <tr><td>Special Allowance</td><td class="amount">${(payroll.specialAllowance || 0).toLocaleString()}</td></tr>
            <tr><td>Other Allowance</td><td class="amount">${(payroll.otherAllowance || 0).toLocaleString()}</td></tr>
            <tr class="total-row"><td><strong>TOTAL SALARY</strong></td><td class="amount"><strong>PKR ${totalSalary.toLocaleString()}</strong></td></tr>
          </tbody>
        </table>
      </div>
      <div class="bank-section">
        <div class="section-title">Bank Details</div>
        <div class="info-grid">
          <div class="info-item"><span class="label">Bank Name:</span><span>${payroll.bankName || 'N/A'}</span></div>
          <div class="info-item"><span class="label">Account No:</span><span>${payroll.bankAccountNumber || 'N/A'}</span></div>
          <div class="info-item"><span class="label">Account Title:</span><span>${payroll.bankAccountTitle || 'N/A'}</span></div>
          <div class="info-item"><span class="label">Payment Method:</span><span>${payroll.paymentMethod || 'Bank Transfer'}</span></div>
          ${payroll.transactionId ? `<div class="info-item"><span class="label">Transaction ID:</span><span>${payroll.transactionId}</span></div>` : ''}
          ${payroll.paymentDate ? `<div class="info-item"><span class="label">Payment Date:</span><span>${new Date(payroll.paymentDate).toLocaleDateString()}</span></div>` : ''}
        </div>
      </div>
      <div class="footer">
        <div>System generated payslip. No signature required.</div>
        <div>Generated on: ${new Date().toLocaleString()}</div>
        <button onclick="window.print()">🖨️ Print Payslip</button>
      </div>
    </div>
  </body>
  </html>
`;

module.exports = {
  getAllPayroll,
  getPayrollStats,
  getPayrollMonthsYears,
  getEmployeesForPayroll,
  getPayrollById,
  generatePayslip,
  downloadPayslipFile,
  getPayslipTranscript,
  updatePayrollStatus,
  deletePayroll,
  exportToExcel,
  getCorrectionRequests,
  getMyOwnPayroll,
  getMyOwnPayrollStats,
  getEmployeePayrolls,
  getEmployeePayrollStats
};