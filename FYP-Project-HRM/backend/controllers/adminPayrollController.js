const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const mongoose = require('mongoose');

// ======================= HELPER FUNCTIONS =======================
const getMonthNumber = (monthName) => {
  const months = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
    'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
  };
  return months[monthName] || 1;
};

// ======================= GET ALL PAYROLL (Admin) =======================
const getAllPayroll = async (req, res) => {
  try {
    console.log('📊 Admin: Getting all payrolls');
    
    const { month, year, status, employeeId, department, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (month && month !== 'all') filter.month = month;
    if (year) filter.year = parseInt(year);
    if (status && status !== 'all') filter.paymentStatus = status;
    if (employeeId && employeeId !== 'all') {
      filter.employeeId = new mongoose.Types.ObjectId(employeeId);
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    let matchStage = { $match: filter };
    
    // Build lookup stage
    let lookupStage = {
      $lookup: {
        from: 'users',
        localField: 'employeeId',
        foreignField: '_id',
        as: 'employee'
      }
    };
    
    // Add department filter if specified
    if (department && department !== 'all') {
      lookupStage = {
        $lookup: {
          from: 'users',
          let: { empId: '$employeeId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$empId'] } } },
            { $match: { department: department } }
          ],
          as: 'employee'
        }
      };
    }
    
    const aggregationPipeline = [
      matchStage,
      lookupStage,
      { 
        $unwind: { 
          path: '$employee', 
          preserveNullAndEmptyArrays: true 
        } 
      },
      {
        $project: {
          month: 1,
          year: 1,
          basicSalary: 1,
          netSalary: 1,
          paymentStatus: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          employeeName: { $ifNull: ['$employee.name', 'Unknown Employee'] },
          employeeEmail: { $ifNull: ['$employee.email', 'Email not available'] },
          employeeIdCode: { $ifNull: ['$employee.employeeId', 'ID: N/A'] },
          employeeDepartment: { $ifNull: ['$employee.department', 'Department not set'] },
          employeePosition: { $ifNull: ['$employee.position', 'Position not set'] }
        }
      },
      { $sort: { year: -1, month: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum }
    ];
    
    // Filter out records if no employee found but department was filtered
    if (department && department !== 'all') {
      aggregationPipeline.splice(3, 0, { $match: { employee: { $ne: null } } });
    }
    
    const payrolls = await Payroll.aggregate(aggregationPipeline);
    
    const total = await Payroll.countDocuments(filter);
    
    console.log(`✅ Loaded ${payrolls.length} payrolls`);
    
    res.status(200).json({
      success: true,
      count: payrolls.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: payrolls
    });
  } catch (error) {
    console.error('❌ getAllPayroll ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ======================= GENERATE PAYROLL FOR EMPLOYEE =======================
// ======================= GENERATE PAYROLL FOR EMPLOYEE =======================
const generatePayroll = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;
    
    console.log('📥 Received payroll generation request:', { employeeId, month, year });
    
    // ✅ BETTER VALIDATION
    if (!employeeId || employeeId === '') {
      return res.status(400).json({ success: false, error: 'Employee is required' });
    }
    if (!month || month === '') {
      return res.status(400).json({ success: false, error: 'Month is required' });
    }
    if (!year || isNaN(parseInt(year))) {
      return res.status(400).json({ success: false, error: 'Valid year is required' });
    }
    
    // ✅ Check if employee exists in User collection
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        error: `Employee not found with ID: ${employeeId}` 
      });
    }
    
    console.log(`👤 Found employee: ${employee.name} (${employee.employeeId})`);
    console.log(`💰 Employee base salary from database: ${employee.salary || 50000}`);
    
    // Check if payroll already exists for this month/year
    const existingPayroll = await Payroll.findOne({
      employeeId: employeeId,
      month: month,
      year: parseInt(year)
    });
    
    if (existingPayroll) {
      return res.status(400).json({
        success: false,
        error: `Payroll already exists for ${employee.name} for ${month} ${year}`,
        data: existingPayroll
      });
    }
    
    // Get attendance data
    const monthNumber = getMonthNumber(month);
    const startDate = new Date(parseInt(year), parseInt(monthNumber) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNumber), 0);
    
    console.log(`📅 Querying attendance from ${startDate.toDateString()} to ${endDate.toDateString()}`);
    
    // Try to find attendance
    const attendance = await Attendance.find({
      employeeId: employeeId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    console.log(`📊 Found ${attendance.length} attendance records`);
    
    // If you want to show attendance data
    attendance.forEach(record => {
      console.log(`   ${record.date.toDateString()}: ${record.status}`);
    });
    
    const workingDays = 22; // Default working days
    let attendanceDays = 0;
    let halfDays = 0;
    let presentDays = 0;
    
    // Count attendance days
    attendance.forEach(record => {
      if (record.status === 'Present' || record.status === 'present') {
        attendanceDays++;
        presentDays++;
      } else if (record.status === 'Half-Day' || record.status === 'half-day') {
        attendanceDays += 0.5;
        halfDays++;
      } else if (record.status === 'Leave' || record.status === 'leave') {
        // Leave days don't count for attendance
        console.log(`   Leave on ${record.date.toDateString()}`);
      }
    });
    
    console.log(`📈 Attendance Summary:`);
    console.log(`   Present Days: ${presentDays}`);
    console.log(`   Half Days: ${halfDays}`);
    console.log(`   Total Attendance Days: ${attendanceDays}`);
    console.log(`   Working Days: ${workingDays}`);
    
    // IMPORTANT: If no attendance found, use FULL salary (not zero)
    // This allows admin to manually adjust later
    const baseSalary = employee.salary || 50000;
    
    // Option 1: Use full salary regardless of attendance (admin can adjust)
    // Option 2: Calculate based on attendance (current logic)
    // For now, let's use a hybrid approach:
    
    let actualSalary = baseSalary; // Default to full salary
    
    if (attendance.length > 0) {
      // Only calculate based on attendance if we have attendance records
      const dailyRate = baseSalary / workingDays;
      actualSalary = dailyRate * attendanceDays;
      console.log(`   Daily Rate: ${dailyRate.toFixed(2)}`);
      console.log(`   Calculated Salary: ${actualSalary.toFixed(2)}`);
    } else {
      console.log(`   No attendance records found, using full salary: ${baseSalary}`);
      // You could also set attendanceDays to workingDays for a full month
      attendanceDays = workingDays;
      presentDays = workingDays;
    }
    
    // Ensure salary is not zero or negative
    if (actualSalary <= 0) {
      console.log(`⚠️ Warning: Calculated salary is ${actualSalary}, using minimum wage`);
      actualSalary = 20000; // Minimum wage
    }
    
    // Calculate salary components
    const basicSalary = Math.round(actualSalary * 0.5);
    const hra = Math.round(basicSalary * 0.4);
    const da = Math.round(basicSalary * 0.2);
    const conveyance = 1600;
    const medicalAllowance = 1250;
    const specialAllowance = Math.round(basicSalary * 0.1);
    
    // Calculate gross salary
    const grossSalary = basicSalary + hra + da + conveyance + medicalAllowance + specialAllowance;
    
    // Calculate deductions (apply deductions if attendance is reasonable)
    let deductions = { tds: 0, pf: 0, professionalTax: 0 };
    
    // Apply deductions only if attendance is decent (e.g., at least 10 days)
    // Or if it's a full month salary (no attendance data)
    if (attendanceDays >= 10 || attendance.length === 0) {
      deductions.tds = Math.round(grossSalary * 0.1);
      deductions.pf = Math.round(basicSalary * 0.12);
      deductions.professionalTax = 200;
    } else if (attendanceDays > 0) {
      // Partial deductions for partial attendance
      const attendanceRatio = attendanceDays / workingDays;
      deductions.tds = Math.round(grossSalary * 0.1 * attendanceRatio);
      deductions.pf = Math.round(basicSalary * 0.12 * attendanceRatio);
      deductions.professionalTax = 200 * attendanceRatio;
    }
    
    const totalDeductions = deductions.tds + deductions.pf + deductions.professionalTax;
    
    // Calculate net salary
    const netSalary = grossSalary - totalDeductions;
    
    // Debug log all calculations
    console.log('🧮 Salary Calculation Breakdown:');
    console.log(`   Base Salary: ${baseSalary}`);
    console.log(`   Basic Salary: ${basicSalary}`);
    console.log(`   HRA: ${hra}`);
    console.log(`   DA: ${da}`);
    console.log(`   Conveyance: ${conveyance}`);
    console.log(`   Medical Allowance: ${medicalAllowance}`);
    console.log(`   Special Allowance: ${specialAllowance}`);
    console.log(`   Gross Salary: ${grossSalary}`);
    console.log(`   TDS: ${deductions.tds}`);
    console.log(`   PF: ${deductions.pf}`);
    console.log(`   Professional Tax: ${deductions.professionalTax}`);
    console.log(`   Total Deductions: ${totalDeductions}`);
    console.log(`   Net Salary: ${netSalary}`);
    
    // Create payroll record
    const payroll = new Payroll({
      employeeId: employee._id,
      month,
      year: parseInt(year),
      basicSalary,
      hra,
      da,
      conveyance,
      medicalAllowance,
      specialAllowance,
      grossSalary,
      tds: deductions.tds,
      pf: deductions.pf,
      professionalTax: deductions.professionalTax,
      totalDeductions,
      netSalary,
      attendanceDays: parseFloat(attendanceDays.toFixed(1)),
      workingDays,
      halfDays,
      presentDays,
      leaves: Math.max(0, workingDays - attendanceDays),
      status: 'Generated',
      paymentStatus: 'Pending',
      generatedBy: req.user?._id || req.user?.id,
      notes: attendance.length === 0 ? 'No attendance records found for this month' : ''
    });
    
    await payroll.save();
    
    console.log(`✅ Payroll generated: ${payroll._id} for ${employee.name}`);
    console.log(`💰 Final Net Salary: PKR ${netSalary.toLocaleString()}`);
    
    // Populate employee details
    await payroll.populate('employeeId', 'name email employeeId department position salary');
    
    res.status(201).json({
      success: true,
      message: `Payroll generated successfully for ${employee.name}`,
      data: payroll,
      calculationDetails: {
        baseSalary: employee.salary,
        attendanceRecords: attendance.length,
        attendanceDays,
        workingDays,
        calculationBreakdown: {
          basicSalary,
          hra,
          da,
          conveyance,
          medicalAllowance,
          specialAllowance,
          grossSalary,
          tds: deductions.tds,
          pf: deductions.pf,
          professionalTax: deductions.professionalTax,
          totalDeductions,
          netSalary
        }
      }
    });
  } catch (error) {
    console.error('❌ generatePayroll error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ======================= GET EMPLOYEES FOR PAYROLL =======================
const getEmployeesForPayroll = async (req, res) => {
  try {
    console.log('📋 Fetching employees for payroll dropdown');
    
    const { department, status = 'active' } = req.query;
    
    const filter = { 
      role: { $in: ['employee', 'hr', 'admin'] },
      isActive: status === 'active' ? true : { $ne: false }
    };
    
    if (department && department !== 'all') {
      filter.department = department;
    }
    
    // ✅ Get employees from User collection
    const employees = await User.find(filter)
      .select('_id name employeeId email department position salary employmentType')
      .sort({ name: 1 })
      .lean();
    
    console.log(`✅ Found ${employees.length} employees`);
    
    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('❌ getEmployeesForPayroll error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ======================= GET PAYROLL STATS =======================
const getPayrollStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const filter = {};
    if (month && month !== 'all') filter.month = month;
    if (year) filter.year = parseInt(year);
    
    const stats = await Payroll.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPayrolls: { $sum: 1 },
          totalAmount: { $sum: '$netSalary' },
          averageSalary: { $avg: '$netSalary' },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, 1, 0] }
          },
          paidPayments: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, 1, 0] }
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Failed'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalPayrolls: 1,
          totalAmount: 1,
          averageSalary: { $round: ['$averageSalary', 2] },
          pendingPayments: 1,
          paidPayments: 1,
          failedPayments: 1
        }
      }
    ]);
    
    const defaultStats = {
      totalPayrolls: 0,
      totalAmount: 0,
      averageSalary: 0,
      pendingPayments: 0,
      paidPayments: 0,
      failedPayments: 0
    };
    
    res.json({
      success: true,
      data: stats.length > 0 ? stats[0] : defaultStats
    });
  } catch (error) {
    console.error('❌ getPayrollStats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GET PAYROLL MONTHS & YEARS =======================
const getPayrollMonthsYears = async (req, res) => {
  try {
    const distinctMonthsYears = await Payroll.aggregate([
      {
        $group: {
          _id: { month: '$month', year: '$year' }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': 1 }
      },
      {
        $project: {
          _id: 0,
          month: '$_id.month',
          year: '$_id.year'
        }
      }
    ]);
    
    res.json({
      success: true,
      data: distinctMonthsYears
    });
  } catch (error) {
    console.error('❌ getPayrollMonthsYears error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= UPDATE PAYROLL =======================
// ======================= UPDATE PAYROLL =======================
const updatePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('✏️ Updating payroll:', { id, updates });
    
    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.employeeId;
    delete updates.createdAt;
    
    // If admin is updating salary components, recalculate totals
    if (updates.basicSalary || updates.hra || updates.da || 
        updates.conveyance || updates.medicalAllowance || updates.specialAllowance ||
        updates.tds || updates.pf || updates.professionalTax) {
      
      // Recalculate gross salary
      const basic = updates.basicSalary || 0;
      const hra = updates.hra || 0;
      const da = updates.da || 0;
      const conveyance = updates.conveyance || 0;
      const medical = updates.medicalAllowance || 0;
      const special = updates.specialAllowance || 0;
      
      updates.grossSalary = basic + hra + da + conveyance + medical + special;
      
      // Recalculate total deductions
      const tds = updates.tds || 0;
      const pf = updates.pf || 0;
      const ptax = updates.professionalTax || 0;
      
      updates.totalDeductions = tds + pf + ptax;
      
      // Recalculate net salary
      updates.netSalary = updates.grossSalary - updates.totalDeductions;
      
      // Mark as manually adjusted
      updates.isManuallyAdjusted = true;
      updates.adjustedBy = req.user?._id || req.user?.id;
      updates.adjustedAt = new Date();
    }
    
    const payroll = await Payroll.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('employeeId', 'name email employeeId');
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'Payroll not found'
      });
    }
    
    console.log('✅ Payroll updated successfully');
    
    res.json({
      success: true,
      message: 'Payroll updated successfully',
      data: payroll
    });
  } catch (error) {
    console.error('❌ updatePayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= UPDATE PAYROLL STATUS =======================
const updatePayrollStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentDate, transactionId, notes } = req.body;
    
    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        error: 'Payment status is required'
      });
    }
    
    const updateData = {
      paymentStatus,
      updatedAt: Date.now()
    };
    
    if (paymentDate) updateData.paymentDate = paymentDate;
    if (transactionId) updateData.transactionId = transactionId;
    if (notes) updateData.notes = notes;
    
    const payroll = await Payroll.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('employeeId', 'name email employeeId');
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'Payroll not found'
      });
    }
    
    res.json({
      success: true,
      message: `Payroll status updated to ${paymentStatus}`,
      data: payroll
    });
  } catch (error) {
    console.error('❌ updatePayrollStatus error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= BULK GENERATE PAYROLL =======================
const bulkGeneratePayroll = async (req, res) => {
  try {
    const { employeeIds, month, year } = req.body;
    
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Employee IDs array is required'
      });
    }
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: 'Month and year are required'
      });
    }
    
    const results = {
      success: [],
      failed: [],
      skipped: []
    };
    
    for (const employeeId of employeeIds) {
      try {
        // Check if payroll already exists
        const existing = await Payroll.findOne({
          employeeId,
          month,
          year: parseInt(year)
        });
        
        if (existing) {
          results.skipped.push({
            employeeId,
            reason: 'Payroll already exists'
          });
          continue;
        }
        
        // Create individual payroll (simplified version)
        // In production, you might want to call generatePayroll logic for each
        const employee = await User.findById(employeeId);
        
        if (!employee) {
          results.failed.push({
            employeeId,
            reason: 'Employee not found'
          });
          continue;
        }
        
        const payroll = new Payroll({
          employeeId,
          month,
          year: parseInt(year),
          basicSalary: employee.salary || 50000,
          netSalary: employee.salary || 50000,
          status: 'Generated',
          paymentStatus: 'Pending',
          generatedBy: req.user?._id || req.user?.id
        });
        
        await payroll.save();
        results.success.push(employeeId);
        
      } catch (error) {
        results.failed.push({
          employeeId,
          reason: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Bulk payroll generation completed`,
      data: results
    });
    
  } catch (error) {
    console.error('❌ bulkGeneratePayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= DELETE PAYROLL =======================
const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payroll = await Payroll.findByIdAndDelete(id);
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'Payroll not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Payroll deleted successfully'
    });
  } catch (error) {
    console.error('❌ deletePayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GENERATE PAYSLIP =======================
const generatePayslip = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payroll = await Payroll.findById(id)
      .populate('employeeId', 'name employeeId email department position')
      .populate('generatedBy', 'name');
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'Payroll not found'
      });
    }
    
    // Create payslip data structure
    const payslip = {
      employee: {
        name: payroll.employeeId?.name || 'Unknown',
        employeeId: payroll.employeeId?.employeeId || 'N/A',
        department: payroll.employeeId?.department || 'N/A',
        position: payroll.employeeId?.position || 'N/A',
        email: payroll.employeeId?.email || 'N/A'
      },
      period: {
        month: payroll.month,
        year: payroll.year,
        generatedDate: payroll.createdAt
      },
      earnings: {
        basicSalary: payroll.basicSalary,
        hra: payroll.hra,
        da: payroll.da,
        conveyance: payroll.conveyance,
        medicalAllowance: payroll.medicalAllowance,
        specialAllowance: payroll.specialAllowance
      },
      deductions: {
        tds: payroll.tds,
        pf: payroll.pf,
        professionalTax: payroll.professionalTax
      },
      summary: {
        grossSalary: payroll.grossSalary,
        totalDeductions: payroll.totalDeductions,
        netSalary: payroll.netSalary,
        attendanceDays: payroll.attendanceDays,
        workingDays: payroll.workingDays
      },
      payment: {
        status: payroll.paymentStatus,
        paymentDate: payroll.paymentDate,
        transactionId: payroll.transactionId
      }
    };
    
    // You can also generate PDF here if needed
    
    res.json({
      success: true,
      data: payslip
    });
  } catch (error) {
    console.error('❌ generatePayslip error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
// ======================= CREATE MANUAL PAYROLL =======================
const createManualPayroll = async (req, res) => {
  try {
    const {
      employeeId,
      month,
      year,
      basicSalary,
      netSalary,
      hra = 0,
      da = 0,
      conveyance = 1600,
      medicalAllowance = 1250,
      specialAllowance = 0,
      tds = 0,
      pf = 0,
      professionalTax = 200,
      notes = ''
    } = req.body;
    
    console.log('📝 Creating manual payroll:', { employeeId, month, year });
    
    // ✅ VALIDATION
    if (!employeeId || !month || !year) {
      return res.status(400).json({ 
        success: false, 
        error: 'Employee, month, and year are required' 
      });
    }
    
    if (!basicSalary && !netSalary) {
      return res.status(400).json({ 
        success: false, 
        error: 'Either basic salary or net salary is required' 
      });
    }
    
    // ✅ Check if employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        error: `Employee not found with ID: ${employeeId}` 
      });
    }
    
    // Check if payroll already exists
    const existingPayroll = await Payroll.findOne({
      employeeId: employeeId,
      month: month,
      year: parseInt(year)
    });
    
    if (existingPayroll) {
      return res.status(400).json({
        success: false,
        error: `Payroll already exists for ${employee.name} for ${month} ${year}`,
        data: existingPayroll
      });
    }
    
    let finalBasicSalary = basicSalary;
    let finalNetSalary = netSalary;
    let finalGrossSalary = 0;
    let finalTotalDeductions = 0;
    
    // If net salary is provided but not basic, calculate basic from net
    if (netSalary && !basicSalary) {
      // Simple calculation: basic = net * 1.2 (approximate)
      finalBasicSalary = Math.round(netSalary * 1.2);
    }
    
    // If basic salary is provided but not net, calculate net
    if (basicSalary && !netSalary) {
      // Calculate other components
      const calculatedHra = hra || Math.round(basicSalary * 0.4);
      const calculatedDa = da || Math.round(basicSalary * 0.2);
      const calculatedConveyance = conveyance;
      const calculatedMedical = medicalAllowance;
      const calculatedSpecial = specialAllowance || Math.round(basicSalary * 0.1);
      
      // Calculate gross
      finalGrossSalary = basicSalary + calculatedHra + calculatedDa + 
                        calculatedConveyance + calculatedMedical + calculatedSpecial;
      
      // Calculate deductions
      const calculatedTds = tds || Math.round(finalGrossSalary * 0.1);
      const calculatedPf = pf || Math.round(basicSalary * 0.12);
      const calculatedPTax = professionalTax;
      
      finalTotalDeductions = calculatedTds + calculatedPf + calculatedPTax;
      finalNetSalary = finalGrossSalary - finalTotalDeductions;
    } else {
      // Both provided, calculate other fields
      finalGrossSalary = basicSalary + hra + da + conveyance + medicalAllowance + specialAllowance;
      finalTotalDeductions = tds + pf + professionalTax;
    }
    
    // Create manual payroll record
    const payroll = new Payroll({
      employeeId: employee._id,
      month,
      year: parseInt(year),
      basicSalary: finalBasicSalary,
      netSalary: finalNetSalary,
      hra: hra || Math.round(finalBasicSalary * 0.4),
      da: da || Math.round(finalBasicSalary * 0.2),
      conveyance,
      medicalAllowance,
      specialAllowance: specialAllowance || Math.round(finalBasicSalary * 0.1),
      grossSalary: finalGrossSalary,
      tds: tds || Math.round(finalGrossSalary * 0.1),
      pf: pf || Math.round(finalBasicSalary * 0.12),
      professionalTax,
      totalDeductions: finalTotalDeductions,
      attendanceDays: 22, // Assume full attendance
      workingDays: 22,
      presentDays: 22,
      status: 'Generated',
      paymentStatus: 'Pending',
      generatedBy: req.user?._id || req.user?.id,
      isManuallyCreated: true,
      notes: notes || 'Manually created payroll by admin'
    });
    
    await payroll.save();
    
    console.log(`✅ Manual payroll created: ${payroll._id} for ${employee.name}`);
    
    // Populate employee details
    await payroll.populate('employeeId', 'name email employeeId department position');
    
    res.status(201).json({
      success: true,
      message: `Manual payroll created successfully for ${employee.name}`,
      data: payroll
    });
  } catch (error) {
    console.error('❌ createManualPayroll error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

module.exports = {
  getAllPayroll,
  generatePayroll,
  getEmployeesForPayroll,
  getPayrollStats,
  getPayrollMonthsYears,
  updatePayroll,
  updatePayrollStatus,
  bulkGeneratePayroll,
  deletePayroll,
  generatePayslip,
  createManualPayroll
};