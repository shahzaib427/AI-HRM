const PDFDocument = require('pdfkit');
const Payroll = require('../models/Payroll');

exports.downloadPayslip = async (req, res) => {
  const payroll = await Payroll.findById(req.params.id)
    .populate('employee');

  if (!payroll) return res.status(404).send('Not found');

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=payslip.pdf');

  doc.pipe(res);

  doc.fontSize(20).text('Employee Payslip', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text(`Employee: ${payroll.employee.fullName}`);
  doc.text(`Department: ${payroll.employee.department}`);
  doc.text(`Month: ${payroll.month} ${payroll.year}`);
  doc.moveDown();

  doc.text(`Basic Salary: ${payroll.basicSalary}`);
  doc.text(`Allowances: ${payroll.allowances}`);
  doc.text(`Deductions: ${payroll.deductions}`);
  doc.text(`Net Salary: ${payroll.netSalary}`);

  doc.end();
};
