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
        $addFields: {
          // Add employee fields at root level for easier access
          employeeName: '$employee.name',
          employeeEmail: '$employee.email',
          employeeIdCode: '$employee.employeeId',
          employeeDepartment: '$employee.department',
          employeePosition: '$employee.position',
          employeeBankDetails: {
            bankName: '$employee.bankName',
            accountNumber: '$employee.bankAccountNumber',
            ifscCode: '$employee.ifscCode'
          }
        }
      },
      {
        $project: {
          // Include ALL payroll fields
          __v: 0,
          // Remove employee object (we already extracted what we need)
          employee: 0
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
    
    // 🔍 DEBUG: Log the first payroll to see all fields
    if (payrolls.length > 0) {
      console.log('📋 First payroll ALL fields:', Object.keys(payrolls[0]));
      console.log('📋 Bank details:', payrolls[0].bankDetails);
      console.log('📋 Employee bank details:', payrolls[0].employeeBankDetails);
    }
    
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

// ======================= GENERATE INDIVIDUAL PAYROLL =======================
const generateIndividualPayroll = async (req, res) => {
  try {
    const { 
      employeeId, 
      employeeName, 
      employeeDepartment,
      month, 
      year, 
      basicSalary, 
      netSalary,
      paymentStatus = 'Pending',
      hra = 0,
      da = 0,
      conveyance = 0,
      medicalAllowance = 0,
      specialAllowance = 0,
      tds = 0,
      pf = 0,
      professionalTax = 0,
      notes = ''
    } = req.body;
    
    console.log('📥 Received individual payroll request:', { employeeId, month, year });
    
    // ✅ VALIDATION
    if (!employeeId || employeeId === '') {
      return res.status(400).json({ success: false, error: 'Employee ID is required' });
    }
    if (!month || month === '') {
      return res.status(400).json({ success: false, error: 'Month is required' });
    }
    if (!year || isNaN(parseInt(year))) {
      return res.status(400).json({ success: false, error: 'Valid year is required' });
    }
    if (!basicSalary || basicSalary <= 0) {
      return res.status(400).json({ success: false, error: 'Valid basic salary is required' });
    }
    if (!netSalary || netSalary <= 0) {
      return res.status(400).json({ success: false, error: 'Valid net salary is required' });
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
    
    // Calculate gross salary
    const grossSalary = basicSalary + hra + da + conveyance + medicalAllowance + specialAllowance;
    
    // Calculate total deductions
    const totalDeductions = tds + pf + professionalTax;
    
    // Create payroll record
    const payroll = new Payroll({
      employeeId: employee._id,
      employeeIdCode: `EMP${employeeId.toString().slice(-6)}`,
      month,
      year: parseInt(year),
      basicSalary,
      netSalary,
      hra,
      da,
      conveyance,
      medicalAllowance,
      specialAllowance,
      grossSalary,
      totalDeductions,
      tds,
      pf,
      professionalTax,
      paymentStatus,
      generatedBy: req.user?._id || req.user?.id,
      notes: notes || 'Generated individually',
      isManuallyCreated: true
    });
    
    await payroll.save();
    
    console.log(`✅ Individual payroll generated: ${payroll._id} for ${employee.name}`);
    
    // Populate employee details
    await payroll.populate('employeeId', 'name email employeeId department position salary');
    
    res.status(201).json({
      success: true,
      message: `Payroll generated successfully for ${employee.name}`,
      data: payroll
    });
  } catch (error) {
    console.error('❌ generateIndividualPayroll error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ======================= GENERATE PAYROLL (Original - based on attendance) =======================
// ======================= GENERATE PAYROLL (Using employee's saved salary data) =======================
const generatePayroll = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;
    
    console.log('📥 Generating payroll for:', { employeeId, month, year });
    
    // Validation
    if (!employeeId || !month || !year) {
      return res.status(400).json({ 
        success: false, 
        error: 'Employee ID, month, and year are required' 
      });
    }
    
    // Get employee with ALL salary details from AddEmployee form
    const employee = await User.findById(employeeId).lean();
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        error: 'Employee not found' 
      });
    }
    
    console.log('👤 Employee salary data from AddEmployee:', {
      basicSalary: employee.salary,
      fuelAllowance: employee.fuelAllowance,
      medicalAllowance: employee.medicalAllowance,
      specialAllowance: employee.specialAllowance,
      otherAllowance: employee.otherAllowance,
      currency: employee.currency,
      bankName: employee.bankName,
      bankAccountNumber: employee.bankAccountNumber?.slice(-4) // Show last 4 digits only
    });
    
    // Check if payroll already exists
    const existingPayroll = await Payroll.findOne({
      employeeId,
      month,
      year: parseInt(year)
    });
    
    if (existingPayroll) {
      return res.status(400).json({
        success: false,
        error: `Payroll already exists for ${employee.name} for ${month} ${year}`
      });
    }
    
    // Get attendance data (optional - can be used for deductions)
    const monthNumber = getMonthNumber(month);
    const startDate = new Date(parseInt(year), parseInt(monthNumber) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNumber), 0);
    
    const attendance = await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    // Calculate attendance
    const workingDays = 22;
    let attendanceDays = workingDays; // Default to full month
    
    if (attendance.length > 0) {
      attendanceDays = 0;
      attendance.forEach(record => {
        if (record.status === 'Present' || record.status === 'present') {
          attendanceDays++;
        } else if (record.status === 'Half-Day' || record.status === 'half-day') {
          attendanceDays += 0.5;
        }
      });
    }
    
    // Use employee's saved salary data from AddEmployee form
    const basicSalary = employee.salary || 0;
    const fuelAllowance = employee.fuelAllowance || 0;
    const medicalAllowance = employee.medicalAllowance || 0;
    const specialAllowance = employee.specialAllowance || 0;
    const otherAllowance = employee.otherAllowance || 0;
    
    // Calculate allowances as percentages of basic salary
    const hra = Math.round(basicSalary * 0.4); // 40% of basic
    const da = Math.round(basicSalary * 0.2);   // 20% of basic
    const conveyance = 1600; // Fixed amount
    
    // Calculate gross salary (includes all allowances)
    const grossSalary = basicSalary + 
                       hra + 
                       da + 
                       conveyance + 
                       medicalAllowance + 
                       fuelAllowance + 
                       specialAllowance + 
                       otherAllowance;
    
    // Calculate deductions (based on attendance if needed)
    let tds = 0, pf = 0, professionalTax = 0;
    
    // Apply deductions based on attendance
    const attendanceRatio = attendanceDays / workingDays;
    
    if (attendanceRatio >= 0.5) { // If attended at least 50%
      tds = Math.round(grossSalary * 0.1 * attendanceRatio); // 10% TDS
      pf = Math.round(basicSalary * 0.12 * attendanceRatio); // 12% PF
      professionalTax = Math.round(200 * attendanceRatio); // Fixed PT
    }
    
    const totalDeductions = tds + pf + professionalTax;
    const netSalary = grossSalary - totalDeductions;
    
    // Create payroll record with ALL salary components
    const payroll = new Payroll({
      employeeId: employee._id,
      employeeIdCode: employee.employeeId || `EMP${employeeId.toString().slice(-6)}`,
      month,
      year: parseInt(year),
      
      // Salary components from AddEmployee
      basicSalary,
      hra,
      da,
      conveyance,
      medicalAllowance,
      specialAllowance,
      fuelAllowance,
      otherAllowance,
      
      // Calculated totals
      grossSalary,
      totalDeductions,
      netSalary,
      
      // Deductions
      tds,
      pf,
      professionalTax,
      
      // Attendance
      attendanceDays: parseFloat(attendanceDays.toFixed(1)),
      workingDays,
      
      // Bank details from AddEmployee (for payment)
      bankDetails: {
        bankName: employee.bankName || '',
        accountNumber: employee.bankAccountNumber || '',
        ifscCode: employee.ifscCode || '',
        accountHolderName: employee.bankAccountTitle || employee.name
      },
      
      paymentStatus: 'Pending',
      currency: employee.currency || 'PKR',
      generatedBy: req.user?._id,
      notes: `Generated based on salary structure from employee profile`
    });
    
    await payroll.save();
    
    console.log('✅ Payroll generated with salary breakdown:', {
      basic: basicSalary,
      allowances: {
        hra, da, conveyance, medical: medicalAllowance, 
        fuel: fuelAllowance, special: specialAllowance, other: otherAllowance
      },
      gross: grossSalary,
      deductions: { tds, pf, professionalTax },
      net: netSalary
    });
    
    // Populate and return
    await payroll.populate('employeeId', 'name email employeeId department position');
    
    res.status(201).json({
      success: true,
      message: `Payroll generated successfully for ${employee.name}`,
      data: payroll,
      breakdown: {
        earnings: {
          basicSalary,
          hra,
          da,
          conveyance,
          medicalAllowance,
          fuelAllowance,
          specialAllowance,
          otherAllowance,
          grossSalary
        },
        deductions: {
          tds,
          pf,
          professionalTax,
          totalDeductions
        },
        netSalary,
        attendance: {
          workingDays,
          attended: attendanceDays,
          absent: workingDays - attendanceDays
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
      role: { $in: ['employee', 'hr', 'admin'] }
    };
    
    if (status === 'active') {
      filter.isActive = true;
    }
    
    if (department && department !== 'all') {
      filter.department = department;
    }
    
    // Get employees from User collection
    const employees = await User.find(filter)
      .select('_id name employeeId email department position salary employmentStatus isActive bankAccountNumber bankName ifscCode')
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
          totalAmount: { $round: ['$totalAmount', 2] },
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
      
      // Get existing payroll for reference
      const existing = await Payroll.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Payroll not found' });
      }
      
      // Recalculate gross salary
      const basic = updates.basicSalary !== undefined ? updates.basicSalary : existing.basicSalary;
      const hra = updates.hra !== undefined ? updates.hra : existing.hra;
      const da = updates.da !== undefined ? updates.da : existing.da;
      const conveyance = updates.conveyance !== undefined ? updates.conveyance : existing.conveyance;
      const medical = updates.medicalAllowance !== undefined ? updates.medicalAllowance : existing.medicalAllowance;
      const special = updates.specialAllowance !== undefined ? updates.specialAllowance : existing.specialAllowance;
      
      updates.grossSalary = basic + hra + da + conveyance + medical + special;
      
      // Recalculate total deductions
      const tds = updates.tds !== undefined ? updates.tds : existing.tds;
      const pf = updates.pf !== undefined ? updates.pf : existing.pf;
      const ptax = updates.professionalTax !== undefined ? updates.professionalTax : existing.professionalTax;
      
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
    const { paymentStatus, paymentDate, transactionId, paymentMethod, notes } = req.body;
    
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
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
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
// ======================= BULK GENERATE PAYROLL =======================
const bulkGeneratePayroll = async (req, res) => {
  try {
    // ✅ FIX: Check for both 'employees' and 'employeeIds'
    const { employees, employeeIds, month, year } = req.body;
    
    // Determine which array to use
    const employeeArray = employees || employeeIds || [];
    
    if (!Array.isArray(employeeArray) || employeeArray.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Employees array is required'
      });
    }
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: 'Month and year are required'
      });
    }
    
    console.log(`📦 Bulk generating ${employeeArray.length} payrolls for ${month} ${year}`);
    
    const results = {
      success: [],
      failed: [],
      skipped: []
    };
    
    for (const empData of employeeArray) {
      try {
        let employeeId, employeeName, employeeRecord;
        
        // Handle both formats:
        // 1. If empData is an object with employeeId (from frontend)
        // 2. If empData is just an ID string
        if (typeof empData === 'object' && empData.employeeId) {
          employeeId = empData.employeeId;
          employeeName = empData.employeeName;
          employeeRecord = empData;
        } else {
          employeeId = empData;
          // Fetch employee from database
          const emp = await User.findById(employeeId).lean();
          if (!emp) {
            results.failed.push({
              employeeId,
              employeeName: 'Unknown',
              reason: 'Employee not found in database'
            });
            continue;
          }
          employeeName = emp.name || 'Unknown';
          employeeRecord = {
            employeeId,
            employeeName,
            basicSalary: emp.salary || 50000,
            hra: Math.round((emp.salary || 50000) * 0.4),
            da: Math.round((emp.salary || 50000) * 0.2),
            conveyance: 1600,
            medicalAllowance: emp.medicalAllowance || 1250,
            specialAllowance: emp.specialAllowance || 0,
            tds: Math.round((emp.salary || 50000) * 0.1),
            pf: Math.round((emp.salary || 50000) * 0.12),
            professionalTax: 200,
            fuelAllowance: emp.fuelAllowance || 0,
            otherAllowance: emp.otherAllowance || 0,
            bankDetails: {
              bankName: emp.bankName || '',
              accountNumber: emp.bankAccountNumber || '',
              ifscCode: emp.ifscCode || '',
              accountHolderName: emp.bankAccountTitle || emp.name
            }
          };
        }
        
        // Check if payroll already exists
        const existing = await Payroll.findOne({
          employeeId,
          month,
          year: parseInt(year)
        });
        
        if (existing) {
          results.skipped.push({
            employeeId,
            employeeName: employeeName || 'Unknown',
            reason: 'Payroll already exists'
          });
          continue;
        }
        
        // Get values with defaults
        const basicSalary = employeeRecord.basicSalary || 50000;
        const hra = employeeRecord.hra || Math.round(basicSalary * 0.4);
        const da = employeeRecord.da || Math.round(basicSalary * 0.2);
        const conveyance = employeeRecord.conveyance || 1600;
        const medicalAllowance = employeeRecord.medicalAllowance || 1250;
        const fuelAllowance = employeeRecord.fuelAllowance || 0;
        const specialAllowance = employeeRecord.specialAllowance || 0;
        const otherAllowance = employeeRecord.otherAllowance || 0;
        
        // Calculate gross salary (include all allowances)
        const grossSalary = basicSalary + 
                           hra + 
                           da + 
                           conveyance + 
                           medicalAllowance + 
                           fuelAllowance + 
                           specialAllowance + 
                           otherAllowance;
        
        const tds = employeeRecord.tds || Math.round(grossSalary * 0.1);
        const pf = employeeRecord.pf || Math.round(basicSalary * 0.12);
        const professionalTax = employeeRecord.professionalTax || 200;
        
        const totalDeductions = tds + pf + professionalTax;
        const netSalary = Math.round(grossSalary - totalDeductions);
        
        // ✅ FIXED: Create payroll with ALL required fields matching your schema
        const payroll = new Payroll({
          employeeId,
          employeeIdCode: `EMP${employeeId.toString().slice(-6)}`,
          month,
          year: parseInt(year),
          
          // Earnings
          basicSalary,
          hra,
          da,
          conveyance,
          medicalAllowance,
          specialAllowance,
          fuelAllowance,
          otherAllowance,
          grossSalary,
          
          // Deductions
          tds,
          pf,
          professionalTax,
          totalDeductions,
          
          // Net
          netSalary,
          
          // Attendance (default values)
          attendanceDays: 22,
          workingDays: 22,
          presentDays: 22,
          halfDays: 0,
          leaves: 0,
          
          // Status
          paymentStatus: 'Pending',
          paymentMethod: 'Bank Transfer', // Default
          
          // Bank details
          bankDetails: employeeRecord.bankDetails || {
            bankName: '',
            accountNumber: '',
            ifscCode: '',
            accountHolderName: employeeName
          },
          
          // Metadata
          generatedBy: req.user?.id,
          notes: `Bulk generated for ${month} ${year}`,
          isBulkGenerated: true,
          isManuallyCreated: true
        });
        
        await payroll.save();
        
        results.success.push({
          employeeId,
          employeeName: employeeName || 'Unknown',
          netSalary
        });
        
      } catch (error) {
        console.error(`❌ Error processing employee:`, error);
        results.failed.push({
          employeeId: typeof empData === 'object' ? empData.employeeId : empData,
          employeeName: typeof empData === 'object' ? empData.employeeName : 'Unknown',
          reason: error.message
        });
      }
    }
    
    console.log(`✅ Bulk generation completed: ${results.success.length} success, ${results.failed.length} failed, ${results.skipped.length} skipped`);
    
    res.json({
      success: true,
      message: `Bulk payroll generation completed: ${results.success.length} created, ${results.skipped.length} skipped, ${results.failed.length} failed`,
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
        specialAllowance: payroll.specialAllowance,
        grossSalary: payroll.grossSalary
      },
      deductions: {
        tds: payroll.tds,
        pf: payroll.pf,
        professionalTax: payroll.professionalTax,
        totalDeductions: payroll.totalDeductions
      },
      summary: {
        netSalary: payroll.netSalary,
        attendanceDays: payroll.attendanceDays,
        workingDays: payroll.workingDays
      },
      payment: {
        status: payroll.paymentStatus,
        method: payroll.paymentMethod,
        paymentDate: payroll.paymentDate,
        transactionId: payroll.transactionId
      }
    };
    
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
    let finalHra = hra;
    let finalDa = da;
    let finalConveyance = conveyance;
    let finalMedical = medicalAllowance;
    let finalSpecial = specialAllowance;
    let finalTds = tds;
    let finalPf = pf;
    let finalPTax = professionalTax;
    
    // If net salary is provided but not basic, calculate basic from net
    if (netSalary && !basicSalary) {
      // Approximate calculation: basic = net * 1.2
      finalBasicSalary = Math.round(netSalary * 1.2);
      finalHra = Math.round(finalBasicSalary * 0.4);
      finalDa = Math.round(finalBasicSalary * 0.2);
      finalConveyance = 1600;
      finalMedical = 1250;
      finalSpecial = Math.round(finalBasicSalary * 0.1);
      
      finalGrossSalary = finalBasicSalary + finalHra + finalDa + finalConveyance + finalMedical + finalSpecial;
      finalTds = Math.round(finalGrossSalary * 0.1);
      finalPf = Math.round(finalBasicSalary * 0.12);
      finalPTax = 200;
      finalTotalDeductions = finalTds + finalPf + finalPTax;
    }
    
    // If basic salary is provided but not net, calculate net
    if (basicSalary && !netSalary) {
      finalHra = hra || Math.round(basicSalary * 0.4);
      finalDa = da || Math.round(basicSalary * 0.2);
      finalConveyance = conveyance || 1600;
      finalMedical = medicalAllowance || 1250;
      finalSpecial = specialAllowance || Math.round(basicSalary * 0.1);
      
      finalGrossSalary = basicSalary + finalHra + finalDa + finalConveyance + finalMedical + finalSpecial;
      
      finalTds = tds || Math.round(finalGrossSalary * 0.1);
      finalPf = pf || Math.round(basicSalary * 0.12);
      finalPTax = professionalTax || 200;
      
      finalTotalDeductions = finalTds + finalPf + finalPTax;
      finalNetSalary = finalGrossSalary - finalTotalDeductions;
    }
    
    // If both provided
    if (basicSalary && netSalary) {
      finalGrossSalary = basicSalary + hra + da + conveyance + medicalAllowance + specialAllowance;
      finalTotalDeductions = tds + pf + professionalTax;
    }
    
    // Create manual payroll record
    const payroll = new Payroll({
      employeeId: employee._id,
      employeeIdCode: `EMP${employeeId.toString().slice(-6)}`,
      month,
      year: parseInt(year),
      basicSalary: finalBasicSalary,
      netSalary: finalNetSalary || netSalary,
      hra: finalHra,
      da: finalDa,
      conveyance: finalConveyance,
      medicalAllowance: finalMedical,
      specialAllowance: finalSpecial,
      grossSalary: finalGrossSalary,
      tds: finalTds,
      pf: finalPf,
      professionalTax: finalPTax,
      totalDeductions: finalTotalDeductions,
      attendanceDays: 22,
      workingDays: 22,
      presentDays: 22,
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

// ======================= PROCESS BANK TRANSFER =======================
const processBankTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentDate, paymentMethod, transactionId, paymentNotes, bankDetails } = req.body;
    
    const payroll = await Payroll.findByIdAndUpdate(
      id,
      {
        paymentStatus,
        paymentDate,
        paymentMethod,
        transactionId,
        paymentNotes,
        bankDetails,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }
    
    res.json({
      success: true,
      message: 'Bank transfer processed successfully',
      data: payroll
    });
  } catch (error) {
    console.error('❌ processBankTransfer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= PROCESS BULK PAYMENT =======================
const processBulkPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentDate, paymentMethod, transactionId, paymentNotes, bankDetails } = req.body;
    
    const payroll = await Payroll.findByIdAndUpdate(
      id,
      {
        paymentStatus,
        paymentDate,
        paymentMethod,
        transactionId,
        paymentNotes,
        bankDetails,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }
    
    res.json({
      success: true,
      message: 'Bulk payment processed successfully',
      data: payroll
    });
  } catch (error) {
    console.error('❌ processBulkPayment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= EXPORT PAYROLL =======================
const exportPayroll = async (req, res) => {
  try {
    const { year, month, status, limit = 10000 } = req.query;
    
    const filter = {};
    if (year) filter.year = parseInt(year);
    if (month && month !== 'all') filter.month = month;
    if (status && status !== 'all') filter.paymentStatus = status;
    
    const payrolls = await Payroll.find(filter)
      .populate('employeeId', 'name email employeeId department')
      .limit(parseInt(limit))
      .sort({ year: -1, month: -1, createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      data: payrolls
    });
  } catch (error) {
    console.error('❌ exportPayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= IMPORT PAYROLL =======================
const importPayroll = async (req, res) => {
  try {
    const payrollData = req.body;
    
    // Check if exists
    const existing = await Payroll.findOne({
      employeeId: payrollData.employeeId,
      month: payrollData.month,
      year: payrollData.year
    });
    
    if (existing) {
      // Update existing
      const updated = await Payroll.findByIdAndUpdate(
        existing._id,
        payrollData,
        { new: true }
      );
      return res.json({ success: true, data: updated, message: 'Updated existing record' });
    } else {
      // Create new
      const payroll = new Payroll(payrollData);
      await payroll.save();
      return res.json({ success: true, data: payroll, message: 'Created new record' });
    }
  } catch (error) {
    console.error('❌ importPayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= SEND PAYSLIP =======================
const sendPayslip = async (req, res) => {
  try {
    const { payrollId, employeeEmail } = req.body;
    
    // In production, you would send actual email here
    console.log(`📧 Sending payslip ${payrollId} to ${employeeEmail}`);
    
    res.json({
      success: true,
      message: 'Payslip email sent successfully'
    });
  } catch (error) {
    console.error('❌ sendPayslip error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GET PAYSLIP TRANSCRIPT =======================
const getPayslipTranscript = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payroll = await Payroll.findById(id)
      .populate('employeeId', 'name email employeeId department position bankAccountNumber bankName ifscCode')
      .lean();
    
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }
    
    res.json({
      success: true,
      data: payroll
    });
  } catch (error) {
    console.error('❌ getPayslipTranscript error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GENERATE PAYSLIP PDF =======================
const generatePayslipPDF = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payroll = await Payroll.findById(id)
      .populate('employeeId', 'name employeeId email department position')
      .lean();
    
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }
    
    // For now, redirect to a PDF generation service or return JSON
    // In production, you'd generate an actual PDF here
    res.json({
      success: true,
      message: 'PDF generation endpoint - implement with pdfkit or similar',
      data: payroll
    });
  } catch (error) {
    console.error('❌ generatePayslipPDF error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= EXPORT MODULE =======================
module.exports = {
  getAllPayroll,
  generatePayroll,
  generateIndividualPayroll,
  getEmployeesForPayroll,
  getPayrollStats,
  getPayrollMonthsYears,
  updatePayroll,
  updatePayrollStatus,
  bulkGeneratePayroll,
  deletePayroll,
  generatePayslip,
  createManualPayroll,
  processBankTransfer,
  processBulkPayment,
  exportPayroll,
  importPayroll,
  sendPayslip,
  getPayslipTranscript,
  generatePayslipPDF
};