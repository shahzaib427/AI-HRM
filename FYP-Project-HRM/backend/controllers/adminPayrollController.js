const Payroll = require('../models/Payroll');
const User = require('../models/User');
const mongoose = require('mongoose');
const { sendSalarySlipEmail } = require('../utils/emailService');
const PDFDocument = require('pdfkit');
const NotificationService = require('../services/notificationService');

// ======================= HELPER: GENERATE PDF BUFFER =======================
const generatePayslipPDFBuffer = async (payroll, employee) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end',  () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const totalSalary =
        (payroll.salary || 0) + (payroll.fuelAllowance || 0) +
        (payroll.medicalAllowance || 0) + (payroll.specialAllowance || 0) +
        (payroll.otherAllowance || 0);

      const empName     = employee?.name       || payroll.employeeName       || 'N/A';
      const empId       = employee?.employeeId  || payroll.employeeCode       || 'N/A';
      const empDept     = employee?.department  || payroll.employeeDepartment || 'N/A';
      const empPosition = employee?.position    || payroll.employeePosition   || 'N/A';
      const empEmail    = employee?.email       || payroll.employeeEmail      || 'N/A';

      doc.fontSize(20).font('Helvetica-Bold').text('HRM SYSTEMS', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('Official Salary Slip', { align: 'center' });
      doc.moveDown();
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      doc.fontSize(14).font('Helvetica-Bold').text('EMPLOYEE DETAILS', { underline: true });
      doc.moveDown(0.5);

      const row = (label, value) => {
        doc.fontSize(10).font('Helvetica-Bold').text(`${label}:`, 50, doc.y, { continued: true });
        doc.font('Helvetica').text(` ${value}`);
        doc.moveDown(0.3);
      };

      row('Employee Name', empName);
      row('Employee ID',   empId);
      row('Department',    empDept);
      row('Position',      empPosition);
      row('Email',         empEmail);

      doc.fontSize(10).font('Helvetica-Bold').text(`Payroll Period: ${payroll.month} ${payroll.year}`, 50, doc.y);
      doc.font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'right' });
      doc.moveDown();
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      doc.fontSize(14).font('Helvetica-Bold').text('EARNINGS', { underline: true });
      doc.moveDown(0.5);

      const earningRow = (label, amount) => {
        const y = doc.y;
        doc.fontSize(10).font('Helvetica').text(label, 50, y);
        doc.font('Helvetica').text(`PKR ${(amount || 0).toLocaleString()}`, 350, y, { align: 'right' });
        doc.moveDown(0.5);
      };

      earningRow('Basic Salary',     payroll.salary);
      earningRow('Fuel Allowance',    payroll.fuelAllowance);
      earningRow('Medical Allowance', payroll.medicalAllowance);
      earningRow('Special Allowance', payroll.specialAllowance);
      earningRow('Other Allowance',   payroll.otherAllowance);

      doc.moveDown();
      const grossY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').text('Gross Salary:', 50, grossY);
      doc.font('Helvetica-Bold').text(`PKR ${totalSalary.toLocaleString()}`, 350, grossY, { align: 'right' });
      doc.moveDown(2);

      doc.strokeColor('#10b981').lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      const netY = doc.y;
      doc.fontSize(16).font('Helvetica-Bold').text('NET SALARY:', 50, netY);
      doc.fillColor('#059669').text(`PKR ${totalSalary.toLocaleString()}`, 350, netY, { align: 'right' });
      doc.fillColor('#000000');
      doc.moveDown(0.5);
      doc.strokeColor('#10b981').lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(2);

      doc.fontSize(12).font('Helvetica-Bold').text('PAYMENT INFORMATION', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(`Payment Status: ${payroll.paymentStatus || 'Pending'}`, 50, doc.y);
      if (payroll.paymentDate) {
        doc.text(`Payment Date: ${new Date(payroll.paymentDate).toLocaleDateString()}`, 350, doc.y - 15, { align: 'right' });
      }
      if (payroll.transactionId) {
        doc.moveDown();
        doc.text(`Transaction ID: ${payroll.transactionId}`, 50, doc.y);
      }

      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor('#999999');
      doc.text('This is a system-generated document. For discrepancies, contact HR.', 50, 750, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ======================= PRIVATE HTML BUILDER =======================
const buildPayslipHTML = (payroll, totalSalary) => `
  <!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Payslip - ${payroll.employeeName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:40px}
    .payslip{max-width:900px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.1);overflow:hidden}
    .header{background:linear-gradient(135deg,#1e3c72,#2a5298);color:#fff;padding:30px;text-align:center}
    .company-name{font-size:28px;font-weight:700}
    .section{padding:30px;border-bottom:1px solid #e2e8f0}
    .section-title{font-size:18px;font-weight:700;color:#1e3c72;margin-bottom:20px;border-bottom:2px solid #e2e8f0;padding-bottom:10px}
    .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
    .item{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #cbd5e1}
    .lbl{font-weight:600;color:#475569}
    table{width:100%;border-collapse:collapse}
    th,td{padding:12px;text-align:left;border-bottom:1px solid #e2e8f0}
    th{background:#f1f5f9}
    .amt{text-align:right}
    .total{background:#f1f5f9;font-weight:700}
    .footer{padding:20px;text-align:center;background:#f8fafc;font-size:12px;color:#666}
    .paid{color:#10b981;font-weight:700}
    .pending{color:#f59e0b;font-weight:700}
    button{margin:16px auto;display:block;padding:10px 24px;background:#1e3c72;color:#fff;border:none;border-radius:8px;cursor:pointer}
    @media print{body{background:#fff;padding:0}button{display:none}}
  </style></head><body>
  <div class="payslip">
    <div class="header">
      <div class="company-name">HRM SYSTEM</div>
      <div style="margin-top:8px">MONTHLY PAYSLIP — ${payroll.month} ${payroll.year}</div>
    </div>
    <div class="section">
      <div class="section-title">Employee Information</div>
      <div class="grid">
        <div class="item"><span class="lbl">Employee ID:</span><span>${payroll.employeeCode||'N/A'}</span></div>
        <div class="item"><span class="lbl">Name:</span><span>${payroll.employeeName||'N/A'}</span></div>
        <div class="item"><span class="lbl">Department:</span><span>${payroll.employeeDepartment||'N/A'}</span></div>
        <div class="item"><span class="lbl">Position:</span><span>${payroll.employeePosition||'N/A'}</span></div>
        <div class="item"><span class="lbl">Email:</span><span>${payroll.employeeEmail||'N/A'}</span></div>
        <div class="item"><span class="lbl">Status:</span>
          <span class="${payroll.paymentStatus==='Paid'?'paid':'pending'}">${payroll.paymentStatus||'Pending'}</span></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Salary Details</div>
      <table>
        <thead><tr><th>Earnings</th><th class="amt">Amount (PKR)</th></tr></thead>
        <tbody>
          <tr><td>Basic Salary</th><td class="amt">${(payroll.salary||0).toLocaleString()}</td></tr>
          <tr><td>Fuel Allowance</th><td class="amt">${(payroll.fuelAllowance||0).toLocaleString()}</td></tr>
          <tr><td>Medical Allowance</th><td class="amt">${(payroll.medicalAllowance||0).toLocaleString()}</td></tr>
          <tr><td>Special Allowance</th><td class="amt">${(payroll.specialAllowance||0).toLocaleString()}</td></tr>
          <tr><td>Other Allowance</th><td class="amt">${(payroll.otherAllowance||0).toLocaleString()}</td></tr>
          <tr class="total"><td><strong>TOTAL SALARY</strong></th><td class="amt"><strong>PKR ${totalSalary.toLocaleString()}</strong></td></tr>
        </tbody>
      </table>
    </div>
    <div class="footer">
      <div>System generated. No signature required.</div>
      <div>Generated: ${new Date().toLocaleString()}</div>
      <button onclick="window.print()">Print Payslip</button>
    </div>
  </div></body></html>`;

// ======================= GET ALL PAYROLLS (ADMIN) =======================
const getAllPayroll = async (req, res) => {
  try {
    const { month, year, status, employeeId, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (month      && month      !== 'all') filter.month         = month;
    if (year       && year       !== 'all') filter.year          = parseInt(year);
    if (status     && status     !== 'all') filter.paymentStatus = status;
    if (employeeId && employeeId !== 'all') filter.employeeId    = new mongoose.Types.ObjectId(employeeId);

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

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
    console.error('[ADMIN] getAllPayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= GENERATE SINGLE PAYROLL - WITH NOTIFICATION =======================
const generatePayroll = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;

    if (!employeeId || !month || !year)
      return res.status(400).json({ success: false, error: 'Employee ID, month, and year are required' });

    const employee = await User.findById(employeeId);
    if (!employee)
      return res.status(404).json({ success: false, error: 'Employee not found' });

    const existing = await Payroll.findOne({ employeeId, month, year: parseInt(year) });
    if (existing)
      return res.status(400).json({ success: false, error: `Payroll already exists for ${employee.name} — ${month} ${year}` });

    const payroll = new Payroll({
      employeeId:         employee._id,
      month,
      year:               parseInt(year),
      salary:             employee.salary            || 0,
      fuelAllowance:      employee.fuelAllowance     || 0,
      medicalAllowance:   employee.medicalAllowance  || 0,
      specialAllowance:   employee.specialAllowance  || 0,
      otherAllowance:     employee.otherAllowance    || 0,
      employeeName:       employee.name              || '',
      employeeCode:       employee.employeeId        || '',
      employeeDepartment: employee.department        || 'General',
      employeePosition:   employee.position          || 'Employee',
      employeeEmail:      employee.email             || '',
      employeePhone:      employee.phone             || '',
      employeeAddress:    employee.presentAddress    || '',
      employeeImage:      employee.profilePicture    || '',
      bankName:           employee.bankName          || '',
      bankAccountNumber:  employee.bankAccountNumber || '',
      bankAccountTitle:   employee.bankAccountTitle  || '',
      paymentStatus:      'Pending',
      generatedBy:        req.user?._id,
      notes:              `Payroll generated for ${month} ${year}`
    });

    await payroll.save();

    // ✅ SEND NOTIFICATION to employee about generated payroll
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    await notificationService.createNotification({
      recipient: {
        userId: employee._id,
        userModel: 'User',
        role: employee.role || 'employee'
      },
      type: 'payroll_processed',
      title: 'Payroll Generated 📋',
      message: `Your payroll for ${month} ${year} has been generated and is pending approval`,
      data: {
        payrollId: payroll._id,
        month: month,
        year: year,
        amount: (payroll.salary + payroll.fuelAllowance + payroll.medicalAllowance + payroll.specialAllowance + payroll.otherAllowance)
      },
      priority: 'medium'
    });

    res.status(201).json({ 
      success: true, 
      message: `Payroll generated for ${employee.name} with notification`, 
      data: payroll 
    });
  } catch (error) {
    console.error('[ADMIN] generatePayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= BULK GENERATE PAYROLL - WITH NOTIFICATIONS =======================
const bulkGeneratePayroll = async (req, res) => {
  try {
    const { employeeIds, month, year } = req.body;

    if (!employeeIds?.length || !month || !year)
      return res.status(400).json({ success: false, error: 'Employee IDs, month, and year are required' });

    const results = { success: [], failed: [] };
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);

    for (const employeeId of employeeIds) {
      try {
        const employee = await User.findById(employeeId);
        if (!employee) { results.failed.push({ employeeId, error: 'Employee not found' }); continue; }

        const existing = await Payroll.findOne({ employeeId, month, year: parseInt(year) });
        if (existing) { results.failed.push({ employeeId, error: 'Payroll already exists' }); continue; }

        const payroll = new Payroll({
          employeeId:         employee._id,
          month,
          year:               parseInt(year),
          salary:             employee.salary            || 0,
          fuelAllowance:      employee.fuelAllowance     || 0,
          medicalAllowance:   employee.medicalAllowance  || 0,
          specialAllowance:   employee.specialAllowance  || 0,
          otherAllowance:     employee.otherAllowance    || 0,
          employeeName:       employee.name              || '',
          employeeCode:       employee.employeeId        || '',
          employeeDepartment: employee.department        || 'General',
          employeePosition:   employee.position          || 'Employee',
          employeeEmail:      employee.email             || '',
          employeePhone:      employee.phone             || '',
          employeeAddress:    employee.presentAddress    || '',
          employeeImage:      employee.profilePicture    || '',
          bankName:           employee.bankName          || '',
          bankAccountNumber:  employee.bankAccountNumber || '',
          bankAccountTitle:   employee.bankAccountTitle  || '',
          paymentStatus:      'Pending',
          generatedBy:        req.user?._id,
          notes:              `Bulk payroll generated for ${month} ${year}`
        });

        await payroll.save();
        results.success.push({ employeeId, name: employee.name });

        // ✅ SEND NOTIFICATION to each employee
        await notificationService.createNotification({
          recipient: {
            userId: employee._id,
            userModel: 'User',
            role: employee.role || 'employee'
          },
          type: 'payroll_processed',
          title: 'Payroll Generated 📋',
          message: `Your payroll for ${month} ${year} has been generated`,
          data: {
            payrollId: payroll._id,
            month: month,
            year: year
          },
          priority: 'medium'
        });
      } catch (err) {
        results.failed.push({ employeeId, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Generated ${results.success.length} payrolls with notifications, Failed: ${results.failed.length}`,
      data: results
    });
  } catch (error) {
    console.error('[ADMIN] bulkGeneratePayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= CREATE MANUAL PAYROLL - WITH NOTIFICATION =======================
const createManualPayroll = async (req, res) => {
  try {
    const { employeeId, month, year, salary, fuelAllowance, medicalAllowance, specialAllowance, otherAllowance, notes } = req.body;

    if (!employeeId || !month || !year)
      return res.status(400).json({ success: false, error: 'Employee, month, and year are required' });

    const employee = await User.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });

    const existing = await Payroll.findOne({ employeeId, month, year: parseInt(year) });
    if (existing) return res.status(400).json({ success: false, error: 'Payroll already exists for this period' });

    const payroll = new Payroll({
      employeeId:         employee._id,
      month,
      year:               parseInt(year),
      salary:             salary            ?? employee.salary            ?? 0,
      fuelAllowance:      fuelAllowance     ?? employee.fuelAllowance     ?? 0,
      medicalAllowance:   medicalAllowance  ?? employee.medicalAllowance  ?? 0,
      specialAllowance:   specialAllowance  ?? employee.specialAllowance  ?? 0,
      otherAllowance:     otherAllowance    ?? employee.otherAllowance    ?? 0,
      employeeName:       employee.name              || '',
      employeeCode:       employee.employeeId        || '',
      employeeDepartment: employee.department        || 'General',
      employeePosition:   employee.position          || 'Employee',
      employeeEmail:      employee.email             || '',
      employeePhone:      employee.phone             || '',
      employeeAddress:    employee.presentAddress    || '',
      employeeImage:      employee.profilePicture    || '',
      bankName:           employee.bankName          || '',
      bankAccountNumber:  employee.bankAccountNumber || '',
      bankAccountTitle:   employee.bankAccountTitle  || '',
      paymentStatus:      'Pending',
      isManuallyCreated:  true,
      notes:              notes || 'Manually created by admin',
      generatedBy:        req.user?._id
    });

    await payroll.save();

    // ✅ SEND NOTIFICATION to employee
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    await notificationService.createNotification({
      recipient: {
        userId: employee._id,
        userModel: 'User',
        role: employee.role || 'employee'
      },
      type: 'payroll_processed',
      title: 'Manual Payroll Created 📝',
      message: `A manual payroll record has been created for ${month} ${year}`,
      data: {
        payrollId: payroll._id,
        month: month,
        year: year
      },
      priority: 'medium'
    });

    res.status(201).json({ 
      success: true, 
      message: `Manual payroll created for ${employee.name} with notification`, 
      data: payroll 
    });
  } catch (error) {
    console.error('[ADMIN] createManualPayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= UPDATE PAYROLL STATUS (WITH NOTIFICATION & EMAIL) =======================
const updatePayrollStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentDate, transactionId, notes } = req.body;

    const originalPayroll = await Payroll.findById(id);
    if (!originalPayroll) return res.status(404).json({ success: false, error: 'Payroll not found' });

    const updateData = {
      paymentStatus,
      ...(paymentDate   && { paymentDate }),
      ...(transactionId && { transactionId }),
      ...(notes         && { notes }),
      ...(paymentStatus === 'Paid' && { paidAt: new Date() })
    };

    const payroll = await Payroll.findByIdAndUpdate(id, updateData, { new: true });

    let emailSent  = false;
    let emailError = null;

    // ✅ SEND NOTIFICATION to employee about status change
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    let employee = payroll.employeeId ? await User.findById(payroll.employeeId) : null;
    if (!employee && payroll.employeeEmail) {
      employee = { _id: payroll.employeeId, email: payroll.employeeEmail, name: payroll.employeeName, role: 'employee' };
    }

    if (employee && employee._id) {
      let title, message, priority;
      if (paymentStatus === 'Paid') {
        title = 'Salary Payment Processed 💰';
        message = `Your salary for ${payroll.month} ${payroll.year} has been paid successfully.`;
        priority = 'high';
      } else if (paymentStatus === 'Failed') {
        title = 'Salary Payment Failed ❌';
        message = `Your salary payment for ${payroll.month} ${payroll.year} has failed. Please contact HR.`;
        priority = 'urgent';
      } else {
        title = 'Payroll Status Updated';
        message = `Your payroll status for ${payroll.month} ${payroll.year} has been updated to ${paymentStatus}`;
        priority = 'medium';
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
        priority: priority
      });
    }

    // Send email if payment is successful
    if (paymentStatus === 'Paid' && originalPayroll.paymentStatus !== 'Paid') {
      try {
        let emp = payroll.employeeId ? await User.findById(payroll.employeeId) : null;
        if (!emp && payroll.employeeEmail) {
          emp = {
            name: payroll.employeeName, email: payroll.employeeEmail,
            employeeId: payroll.employeeCode, department: payroll.employeeDepartment,
            position: payroll.employeePosition
          };
        }

        if (emp?.email) {
          const pdfBuffer   = await generatePayslipPDFBuffer(payroll, emp);
          const emailResult = await sendSalarySlipEmail(emp, payroll, pdfBuffer);
          if (emailResult.success) {
            emailSent = true;
            await Payroll.findByIdAndUpdate(id, { emailSent: true, emailSentAt: new Date() });
          } else {
            emailError = emailResult.error;
          }
        } else {
          emailError = `No email for ${payroll.employeeName}`;
        }
      } catch (err) {
        emailError = err.message;
        console.error('[ADMIN] Email error:', err.message);
      }
    }

    res.json({
      success: true,
      message: `Payroll status updated to ${paymentStatus} with notification`,
      data: payroll,
      emailNotification: emailSent
        ? { sent: true,  message: 'Salary slip email sent to employee' }
        : { sent: false, message: emailError || 'Email not sent' }
    });
  } catch (error) {
    console.error('[ADMIN] updatePayrollStatus error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= PROCESS BULK PAYMENT (WITH NOTIFICATIONS & EMAIL) =======================
const processBulkPayment = async (req, res) => {
  try {
    const { payrollIds, paymentMethod, transactionId, notes } = req.body;

    if (!payrollIds?.length)
      return res.status(400).json({ success: false, error: 'Payroll IDs are required' });

    const results = { success: [], failed: [], emailsSent: [], notificationsSent: [] };
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);

    for (const payrollId of payrollIds) {
      try {
        const payroll = await Payroll.findById(payrollId);
        if (!payroll) { results.failed.push({ payrollId, error: 'Not found' }); continue; }
        if (payroll.paymentStatus === 'Paid') { results.failed.push({ payrollId, error: 'Already paid' }); continue; }

        payroll.paymentStatus = 'Paid';
        payroll.paymentDate   = new Date();
        payroll.paymentMethod = paymentMethod || 'Bank Transfer';
        payroll.transactionId = transactionId || `BULK-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        payroll.notes         = notes || 'Bulk payment processed';
        payroll.paidAt        = new Date();
        await payroll.save();
        results.success.push(payrollId);

        let employee = payroll.employeeId ? await User.findById(payroll.employeeId) : null;
        if (!employee && payroll.employeeEmail) {
          employee = {
            _id: payroll.employeeId,
            name: payroll.employeeName, 
            email: payroll.employeeEmail,
            employeeId: payroll.employeeCode, 
            department: payroll.employeeDepartment,
            position: payroll.employeePosition,
            role: 'employee'
          };
        }

        // Send notification
        if (employee && employee._id) {
          await notificationService.createNotification({
            recipient: {
              userId: employee._id,
              userModel: 'User',
              role: 'employee'
            },
            type: 'payroll_processed',
            title: 'Salary Payment Processed 💰',
            message: `Your salary for ${payroll.month} ${payroll.year} has been paid successfully via bulk payment`,
            data: {
              payrollId: payroll._id,
              month: payroll.month,
              year: payroll.year,
              transactionId: payroll.transactionId
            },
            priority: 'high'
          });
          results.notificationsSent.push({ payrollId, employeeEmail: employee.email });
        }

        // Send email
        if (employee?.email) {
          try {
            const pdfBuffer   = await generatePayslipPDFBuffer(payroll, employee);
            const emailResult = await sendSalarySlipEmail(employee, payroll, pdfBuffer);
            if (emailResult.success) {
              results.emailsSent.push({ payrollId, employeeEmail: employee.email, employeeName: employee.name });
              await Payroll.findByIdAndUpdate(payrollId, { emailSent: true, emailSentAt: new Date() });
            }
          } catch (emailErr) {
            console.error(`Email failed for ${employee.email}:`, emailErr.message);
          }
        }
      } catch (err) {
        results.failed.push({ payrollId, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.success.length} payrolls, Notifications: ${results.notificationsSent.length}, Emails: ${results.emailsSent.length}`,
      data: results
    });
  } catch (error) {
    console.error('[ADMIN] processBulkPayment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ======================= RESEND SALARY SLIP EMAIL - WITH NOTIFICATION =======================
const resendSalarySlipEmail = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ success: false, error: 'Payroll not found' });

    if (payroll.paymentStatus !== 'Paid')
      return res.status(400).json({ success: false, error: 'Can only resend for paid payrolls' });

    let employee = payroll.employeeId ? await User.findById(payroll.employeeId) : null;
    if (!employee && payroll.employeeEmail) {
      employee = {
        name: payroll.employeeName, email: payroll.employeeEmail,
        employeeId: payroll.employeeCode, department: payroll.employeeDepartment,
        position: payroll.employeePosition
      };
    }

    if (!employee?.email)
      return res.status(404).json({ success: false, error: `No email found for ${payroll.employeeName}` });

    const pdfBuffer   = await generatePayslipPDFBuffer(payroll, employee);
    const emailResult = await sendSalarySlipEmail(employee, payroll, pdfBuffer);

    if (emailResult.success) {
      await Payroll.findByIdAndUpdate(req.params.id, {
        emailSent: true, emailSentAt: new Date(),
        emailResendCount: (payroll.emailResendCount || 0) + 1
      });

      // ✅ Send notification
      const io = req.app.get('io');
      const notificationService = new NotificationService(io);
      
      if (employee._id) {
        await notificationService.createNotification({
          recipient: {
            userId: employee._id,
            userModel: 'User',
            role: 'employee'
          },
          type: 'payroll_processed',
          title: 'Payslip Resent 📧',
          message: `Your payslip for ${payroll.month} ${payroll.year} has been resent to your email`,
          data: {
            payrollId: payroll._id,
            month: payroll.month,
            year: payroll.year
          },
          priority: 'medium'
        });
      }

      res.json({ success: true, message: `Salary slip resent to ${employee.email} with notification` });
    } else {
      throw new Error(emailResult.error);
    }
  } catch (error) {
    console.error('[ADMIN] resendSalarySlipEmail error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Keep all remaining functions unchanged
const getPayrollStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = {};
    if (month && month !== 'all') filter.month = month;
    if (year  && year  !== 'all') filter.year  = parseInt(year);

    const payrolls = await Payroll.find(filter);
    const totalAmount = payrolls.reduce((sum, p) =>
      sum + (p.salary || 0) + (p.fuelAllowance || 0) +
      (p.medicalAllowance || 0) + (p.specialAllowance || 0) + (p.otherAllowance || 0), 0);

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
    console.error('[ADMIN] getPayrollStats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getPayrollMonthsYears = async (req, res) => {
  try {
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    const currentYear = new Date().getFullYear();
    let existingYears = await Payroll.distinct('year');
    let years = existingYears.length > 0 ? [...existingYears] : [];
    [currentYear - 1, currentYear, currentYear + 1].forEach(y => {
      if (!years.includes(y)) years.push(y);
    });
    years = [...new Set(years)].sort((a, b) => b - a);
    res.json({ success: true, data: { months, years } });
  } catch (error) {
    const y = new Date().getFullYear();
    res.json({ success: true, data: {
      months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
      years: [y + 1, y, y - 1]
    }});
  }
};

const getEmployeesForPayroll = async (req, res) => {
  try {
    const employees = await User.find(
      { isActive: true, role: { $in: ['employee', 'hr', 'manager'] } },
      '_id name employeeId email department position salary fuelAllowance medicalAllowance specialAllowance otherAllowance profilePicture phone presentAddress bankName bankAccountNumber bankAccountTitle'
    ).sort({ name: 1 });

    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('[ADMIN] getEmployeesForPayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updatePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!payroll) return res.status(404).json({ success: false, error: 'Payroll not found' });
    res.json({ success: true, message: 'Payroll updated successfully', data: payroll });
  } catch (error) {
    console.error('[ADMIN] updatePayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deletePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndDelete(req.params.id);
    if (!payroll) return res.status(404).json({ success: false, error: 'Payroll not found' });
    res.json({ success: true, message: 'Payroll deleted successfully' });
  } catch (error) {
    console.error('[ADMIN] deletePayroll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const generatePayslip = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ success: false, error: 'Payroll not found' });

    const totalSalary =
      (payroll.salary || 0) + (payroll.fuelAllowance || 0) +
      (payroll.medicalAllowance || 0) + (payroll.specialAllowance || 0) +
      (payroll.otherAllowance || 0);

    const html = buildPayslipHTML(payroll, totalSalary);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('[ADMIN] generatePayslip error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const downloadPayslipFile = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ success: false, error: 'Payroll not found' });

    const totalSalary =
      (payroll.salary || 0) + (payroll.fuelAllowance || 0) +
      (payroll.medicalAllowance || 0) + (payroll.specialAllowance || 0) +
      (payroll.otherAllowance || 0);

    const html = buildPayslipHTML(payroll, totalSalary);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition',
      `attachment; filename="payslip_${payroll.employeeCode}_${payroll.month}_${payroll.year}.html"`);
    res.send(html);
  } catch (error) {
    console.error('[ADMIN] downloadPayslipFile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getPayslipTranscript = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ success: false, error: 'Payroll not found' });

    const totalSalary =
      (payroll.salary || 0) + (payroll.fuelAllowance || 0) +
      (payroll.medicalAllowance || 0) + (payroll.specialAllowance || 0) +
      (payroll.otherAllowance || 0);

    res.json({
      success: true,
      data: {
        employeeName:       payroll.employeeName,
        employeeCode:       payroll.employeeCode,
        employeeDepartment: payroll.employeeDepartment,
        month:              payroll.month,
        year:               payroll.year,
        salary:             payroll.salary,
        fuelAllowance:      payroll.fuelAllowance,
        medicalAllowance:   payroll.medicalAllowance,
        specialAllowance:   payroll.specialAllowance,
        otherAllowance:     payroll.otherAllowance,
        totalSalary,
        paymentStatus:      payroll.paymentStatus,
        paymentDate:        payroll.paymentDate,
        bankName:           payroll.bankName,
        bankAccountNumber:  payroll.bankAccountNumber
      }
    });
  } catch (error) {
    console.error('[ADMIN] getPayslipTranscript error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ success: false, error: 'Payroll not found' });
    res.json({ success: true, data: payroll });
  } catch (error) {
    console.error('[ADMIN] getPayrollById error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const exportToExcel = async (req, res) => {
  try {
    const { year, month, status, limit = 10000 } = req.query;
    const filter = {};
    if (year   && year   !== 'all') filter.year          = parseInt(year);
    if (month  && month  !== 'all') filter.month         = month;
    if (status && status !== 'all') filter.paymentStatus = status;

    const payrolls = await Payroll.find(filter).limit(parseInt(limit));
    const exportData = payrolls.map(p => {
      const total = (p.salary || 0) + (p.fuelAllowance || 0) + (p.medicalAllowance || 0) +
                    (p.specialAllowance || 0) + (p.otherAllowance || 0);
      return {
        'Employee ID': p.employeeCode || 'N/A', 'Employee Name': p.employeeName || 'N/A',
        'Employee Email': p.employeeEmail || 'N/A', 'Department': p.employeeDepartment || 'N/A',
        'Month': p.month, 'Year': p.year, 'Basic Salary': p.salary || 0,
        'Fuel Allowance': p.fuelAllowance || 0, 'Medical Allowance': p.medicalAllowance || 0,
        'Special Allowance': p.specialAllowance || 0, 'Other Allowance': p.otherAllowance || 0,
        'Total Salary': total, 'Status': p.paymentStatus || 'Pending',
        'Payment Date': p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '',
        'Payment Method': p.paymentMethod || '', 'Transaction ID': p.transactionId || '',
        'Bank Name': p.bankName || '', 'Account Number': p.bankAccountNumber || ''
      };
    });

    res.json({ success: true, data: exportData, count: exportData.length });
  } catch (error) {
    console.error('[ADMIN] exportToExcel error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const importFromExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    res.json({ success: true, message: 'Import functionality — implement excel parsing', data: { imported: 0, failed: 0 } });
  } catch (error) {
    console.error('[ADMIN] importFromExcel error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  generatePayslipPDFBuffer,
  getAllPayroll,
  generatePayroll,
  bulkGeneratePayroll,
  createManualPayroll,
  getPayrollStats,
  getPayrollMonthsYears,
  getEmployeesForPayroll,
  updatePayroll,
  updatePayrollStatus,
  deletePayroll,
  generatePayslip,
  downloadPayslipFile,
  getPayslipTranscript,
  getPayrollById,
  processBulkPayment,
  exportToExcel,
  importFromExcel,
  resendSalarySlipEmail
};