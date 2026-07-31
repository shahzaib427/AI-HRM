// backend/controllers/payslipController.js (or wherever downloadPayslip is located)
const PDFDocument = require('pdfkit');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const NotificationService = require('../services/notificationService');

// Download payslip with notification
exports.downloadPayslip = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee');

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    // Get employee details
    const employee = await Employee.findById(payroll.employeeId);
    
    // Create PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip_${payroll.employee.fullName}_${payroll.month}_${payroll.year}.pdf`);

    doc.pipe(res);

    // PDF Content
    doc.fontSize(20).text('Employee Payslip', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Employee: ${payroll.employee.fullName || payroll.employee.name}`);
    doc.text(`Employee ID: ${payroll.employee.employeeId || payroll.employee._id}`);
    doc.text(`Department: ${payroll.employee.department || 'N/A'}`);
    doc.text(`Month: ${payroll.month} ${payroll.year}`);
    doc.moveDown();
    
    doc.text(`Basic Salary: $${payroll.basicSalary?.toLocaleString() || 0}`);
    doc.text(`Allowances: $${payroll.allowances?.toLocaleString() || 0}`);
    doc.text(`Deductions: $${payroll.deductions?.toLocaleString() || 0}`);
    doc.text(`Net Salary: $${payroll.netSalary?.toLocaleString() || 0}`);
    doc.moveDown();
    
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    
    doc.end();

    // ✅ SEND NOTIFICATION when payslip is downloaded
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    await notificationService.createNotification({
      recipient: {
        userId: payroll.employeeId,
        userModel: 'Employee',
        role: 'employee'
      },
      type: 'payroll_processed',
      title: 'Payslip Downloaded 📄',
      message: `Your payslip for ${payroll.month} ${payroll.year} has been downloaded`,
      data: {
        payrollId: payroll._id,
        month: payroll.month,
        year: payroll.year,
        amount: payroll.netSalary
      },
      priority: 'medium'
    });

    console.log(`✅ Payslip downloaded and notification sent to employee ${payroll.employeeId}`);
    
  } catch (error) {
    console.error('❌ Error generating payslip:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

// Generate and send payslip via email with notification
exports.generateAndSendPayslip = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;
    
    // Find or create payroll record
    let payroll = await Payroll.findOne({ employeeId, month, year });
    
    if (!payroll) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payslip not found for this period' 
      });
    }
    
    const employee = await Employee.findById(employeeId);
    
    // Create PDF (similar to above)
    const doc = new PDFDocument();
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfData = Buffer.concat(buffers);
      
      // Here you would send email with attachment
      // await sendEmailWithAttachment(employee.email, pdfData);
      
      // ✅ SEND NOTIFICATION
      const io = req.app.get('io');
      const notificationService = new NotificationService(io);
      
      await notificationService.createNotification({
        recipient: {
          userId: employeeId,
          userModel: 'Employee',
          role: 'employee'
        },
        type: 'payroll_processed',
        title: 'Payslip Generated 💰',
        message: `Your payslip for ${month} ${year} has been generated and sent to your email`,
        data: {
          payrollId: payroll._id,
          month: month,
          year: year,
          amount: payroll.netSalary
        },
        priority: 'high'
      });
      
      res.json({ 
        success: true, 
        message: 'Payslip generated and sent with notification' 
      });
    });
    
    // PDF Content
    doc.fontSize(20).text('Employee Payslip', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Employee: ${employee.fullName || employee.name}`);
    doc.text(`Employee ID: ${employee.employeeId || employee._id}`);
    doc.text(`Department: ${employee.department || 'N/A'}`);
    doc.text(`Month: ${month} ${year}`);
    doc.moveDown();
    doc.text(`Basic Salary: $${payroll.basicSalary?.toLocaleString() || 0}`);
    doc.text(`Allowances: $${payroll.allowances?.toLocaleString() || 0}`);
    doc.text(`Deductions: $${payroll.deductions?.toLocaleString() || 0}`);
    doc.text(`Net Salary: $${payroll.netSalary?.toLocaleString() || 0}`);
    doc.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all payslips for an employee
exports.getEmployeePayslips = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const payrolls = await Payroll.find({ employeeId })
      .sort({ year: -1, month: -1 });
    
    res.json({ success: true, data: payrolls });
  } catch (error) {
    console.error('❌ Error fetching payslips:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};