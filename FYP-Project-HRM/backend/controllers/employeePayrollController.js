const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const mongoose = require('mongoose');

// ======================= GET EMPLOYEE DASHBOARD =======================
const getMyDashboard = async (req, res) => {
  try {
    console.log('🔥 getMyDashboard called for user:', req.user._id);
    
    const employeeId = req.user._id;
    
    // Get current month/year
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear();
    
    console.log('📅 Current period:', currentMonth, currentYear);
    
    // Get current month payroll
    const currentPayroll = await Payroll.findOne({
      employeeId,
      month: currentMonth,
      year: currentYear
    }).populate('employeeId', 'name email department position');
    
    console.log('📊 Current payroll found:', currentPayroll ? 'Yes' : 'No');
    
    // Get YTD summary
    const ytdSummary = await Payroll.aggregate([
      {
        $match: {
          employeeId: new mongoose.Types.ObjectId(employeeId),
          year: currentYear,
          paymentStatus: 'Paid'
        }
      },
      {
        $group: {
          _id: null,
          totalNetSalary: { $sum: '$netSalary' },
          totalAllowances: { 
            $sum: { 
              $add: [
                { $ifNull: ['$hra', 0] },
                { $ifNull: ['$da', 0] },
                { $ifNull: ['$conveyance', 0] },
                { $ifNull: ['$medicalAllowance', 0] },
                { $ifNull: ['$specialAllowance', 0] }
              ]
            }
          },
          totalDeductions: { $sum: '$totalDeductions' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('📈 YTD Summary:', ytdSummary);
    
    // Get recent payrolls (last 5)
    const recentPayrolls = await Payroll.find({ 
      employeeId,
      paymentStatus: 'Paid'
    })
    .sort({ year: -1, month: -1 })
    .limit(5)
    .select('month year netSalary paymentDate status paymentStatus createdAt')
    .lean();
    
    console.log('📋 Recent payrolls:', recentPayrolls.length);
    
    // Transform current payroll for frontend
    const transformedCurrentPayroll = currentPayroll ? {
      month: currentPayroll.month,
      year: currentPayroll.year,
      netSalary: currentPayroll.netSalary || 0,
      basicSalary: currentPayroll.basicSalary || 0,
      allowances: (currentPayroll.hra || 0) + (currentPayroll.da || 0) + 
                  (currentPayroll.conveyance || 0) + (currentPayroll.medicalAllowance || 0) + 
                  (currentPayroll.specialAllowance || 0),
      bonus: currentPayroll.specialAllowance || 0,
      deductions: currentPayroll.totalDeductions || 0,
      status: currentPayroll.paymentStatus === 'Paid' ? 'Processed' : 
              currentPayroll.paymentStatus === 'Pending' ? 'Pending' : 'Generated',
      paymentDate: currentPayroll.paidAt || currentPayroll.createdAt
    } : {
      month: currentMonth,
      year: currentYear,
      netSalary: 0,
      basicSalary: 0,
      allowances: 0,
      bonus: 0,
      deductions: 0,
      status: 'Pending'
    };
    
    res.json({
      success: true,
      data: {
        currentPayroll: transformedCurrentPayroll,
        ytdSummary: ytdSummary[0] || {
          totalNetSalary: 0,
          totalAllowances: 0,
          totalDeductions: 0,
          count: 0
        },
        recentPayrolls: recentPayrolls.map(p => ({
          _id: p._id,
          month: p.month,
          year: p.year,
          netSalary: p.netSalary || 0,
          paymentDate: p.paidAt || p.createdAt,
          status: p.paymentStatus === 'Paid' ? 'Processed' : 'Pending'
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ getMyDashboard error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to load dashboard'
    });
  }
};

// ======================= GET EMPLOYEE PAYROLLS BY YEAR =======================
const getMyPayroll = async (req, res) => {
  try {
    console.log('🔥 getMyPayroll called');
    console.log('📋 Query params:', req.query);
    
    const { year } = req.query;
    const employeeId = req.user._id;
    
    if (!year) {
      return res.status(400).json({ 
        success: false, 
        error: 'Year parameter is required' 
      });
    }
    
    const payrolls = await Payroll.find({
      employeeId,
      year: parseInt(year)
    })
    .populate('employeeId', 'name employeeId department position')
    .sort({ year: -1, month: -1 })
    .lean();
    
    console.log('📊 Found payrolls:', payrolls.length);
    
    // Transform data for frontend
    const transformedPayrolls = payrolls.map(payroll => {
      const allowances = (payroll.hra || 0) + (payroll.da || 0) + 
                        (payroll.conveyance || 0) + (payroll.medicalAllowance || 0) + 
                        (payroll.specialAllowance || 0);
      
      return {
        _id: payroll._id,
        month: payroll.month,
        year: payroll.year,
        basicSalary: payroll.basicSalary || 0,
        allowances: allowances,
        bonus: payroll.specialAllowance || 0,
        deductions: payroll.totalDeductions || 0,
        netSalary: payroll.netSalary || 0,
        status: payroll.paymentStatus === 'Paid' ? 'Processed' : 
                payroll.paymentStatus === 'Pending' ? 'Pending' : 'Generated',
        paymentDate: payroll.paidAt || payroll.createdAt,
        createdAt: payroll.createdAt,
        updatedAt: payroll.updatedAt
      };
    });
    
    res.json({
      success: true,
      data: transformedPayrolls
    });
    
  } catch (error) {
    console.error('❌ getMyPayroll error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ======================= GET PAYROLL YEARS =======================
const getPayrollYears = async (req, res) => {
  try {
    console.log('🔥 getPayrollYears called');
    
    const employeeId = req.user._id;
    
    const years = await Payroll.aggregate([
      {
        $match: {
          employeeId: new mongoose.Types.ObjectId(employeeId)
        }
      },
      {
        $group: {
          _id: '$year'
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);
    
    const yearList = years.map(item => item._id);
    
    // If no years found, add current year
    if (yearList.length === 0) {
      yearList.push(new Date().getFullYear());
    }
    
    console.log('📅 Available years:', yearList);
    
    res.json({
      success: true,
      data: yearList
    });
    
  } catch (error) {
    console.error('❌ getPayrollYears error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ======================= GET PAYSLIP =======================
const getMyPayslip = async (req, res) => {
  try {
    console.log('🔥 getMyPayslip called for ID:', req.params.id);
    
    const { id } = req.params;
    const employeeId = req.user._id;
    
    const payroll = await Payroll.findOne({
      _id: id,
      employeeId
    }).populate('employeeId', 'name email employeeId department position joinDate');
    
    if (!payroll) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payslip not found or access denied' 
      });
    }
    
    // Generate HTML payslip
    const payslipHTML = generatePayslipHTML(payroll);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(payslipHTML);
    
  } catch (error) {
    console.error('❌ getMyPayslip error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ======================= DOWNLOAD PAYSLIP =======================
const downloadPayslip = async (req, res) => {
  try {
    console.log('🔥 downloadPayslip called for ID:', req.params.id);
    
    const { id } = req.params;
    const employeeId = req.user._id;
    
    const payroll = await Payroll.findOne({
      _id: id,
      employeeId
    }).populate('employeeId', 'name email employeeId department position');
    
    if (!payroll) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payslip not found or access denied' 
      });
    }
    
    const payslipHTML = generatePayslipHTML(payroll);
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${payroll.month}-${payroll.year}.html"`);
    res.send(payslipHTML);
    
  } catch (error) {
    console.error('❌ downloadPayslip error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ======================= REQUEST CORRECTION =======================
const requestCorrection = async (req, res) => {
  try {
    console.log('🔥 requestCorrection called for ID:', req.params.id);
    
    const { id } = req.params;
    const { issue, details } = req.body;
    const employeeId = req.user._id;
    
    const payroll = await Payroll.findOne({
      _id: id,
      employeeId
    });
    
    if (!payroll) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payroll not found' 
      });
    }
    
    // Add correction request
    if (!payroll.correctionRequests) {
      payroll.correctionRequests = [];
    }
    
    payroll.correctionRequests.push({
      issue,
      details,
      requestedBy: employeeId,
      requestedAt: new Date(),
      status: 'Pending'
    });
    
    payroll.status = 'Under Review';
    await payroll.save();
    
    res.json({
      success: true,
      message: 'Correction request submitted successfully',
      data: payroll
    });
    
  } catch (error) {
    console.error('❌ requestCorrection error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ======================= HELPER: GENERATE PAYSLIP HTML =======================
const generatePayslipHTML = (payroll) => {
  const allowancesTotal = (payroll.hra || 0) + (payroll.da || 0) + 
                         (payroll.conveyance || 0) + (payroll.medicalAllowance || 0) + 
                         (payroll.specialAllowance || 0);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payslip - ${payroll.employeeId.name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .details { margin: 20px 0; }
        .details table { width: 100%; border-collapse: collapse; }
        .details th, .details td { padding: 12px; border: 1px solid #ddd; text-align: left; }
        .details th { background-color: #3498db; color: white; }
        .total { font-weight: bold; background-color: #ecf0f1; }
        .amount { text-align: right; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">HRM SYSTEM</div>
        <div>Monthly Payslip - ${payroll.month} ${payroll.year}</div>
      </div>
      
      <div class="details">
        <h3>Employee Details</h3>
        <table>
          <tr><th>Employee ID:</th><td>${payroll.employeeId.employeeId || 'N/A'}</td></tr>
          <tr><th>Name:</th><td>${payroll.employeeId.name}</td></tr>
          <tr><th>Department:</th><td>${payroll.employeeId.department || 'N/A'}</td></tr>
          <tr><th>Position:</th><td>${payroll.employeeId.position || 'N/A'}</td></tr>
          <tr><th>Payment Status:</th><td>${payroll.paymentStatus}</td></tr>
        </table>
      </div>
      
      <div class="details">
        <h3>Earnings</h3>
        <table>
          <tr><th>Description</th><th class="amount">Amount (PKR)</th></tr>
          <tr><td>Basic Salary</td><td class="amount">${(payroll.basicSalary || 0).toLocaleString()}</td></tr>
          <tr><td>House Rent Allowance</td><td class="amount">${(payroll.hra || 0).toLocaleString()}</td></tr>
          <tr><td>Dearness Allowance</td><td class="amount">${(payroll.da || 0).toLocaleString()}</td></tr>
          <tr><td>Conveyance Allowance</td><td class="amount">${(payroll.conveyance || 0).toLocaleString()}</td></tr>
          <tr><td>Medical Allowance</td><td class="amount">${(payroll.medicalAllowance || 0).toLocaleString()}</td></tr>
          <tr><td>Special Allowance</td><td class="amount">${(payroll.specialAllowance || 0).toLocaleString()}</td></tr>
          <tr class="total"><td>Total Earnings</td><td class="amount">${(payroll.grossSalary || 0).toLocaleString()}</td></tr>
        </table>
      </div>
      
      <div class="details">
        <h3>Deductions</h3>
        <table>
          <tr><th>Description</th><th class="amount">Amount (PKR)</th></tr>
          <tr><td>Tax Deducted at Source</td><td class="amount">${(payroll.tds || 0).toLocaleString()}</td></tr>
          <tr><td>Provident Fund</td><td class="amount">${(payroll.pf || 0).toLocaleString()}</td></tr>
          <tr><td>Professional Tax</td><td class="amount">${(payroll.professionalTax || 0).toLocaleString()}</td></tr>
          <tr class="total"><td>Total Deductions</td><td class="amount">${(payroll.totalDeductions || 0).toLocaleString()}</td></tr>
        </table>
      </div>
      
      <div class="details">
        <table>
          <tr class="total"><td><strong>NET SALARY</strong></td><td class="amount"><strong>PKR ${(payroll.netSalary || 0).toLocaleString()}</strong></td></tr>
        </table>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  getMyDashboard,
  getMyPayroll,
  getPayrollYears,
  getMyPayslip,
  downloadPayslip,
  requestCorrection
};