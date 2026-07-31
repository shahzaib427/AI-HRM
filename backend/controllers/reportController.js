const asyncHandler = require('express-async-handler');
const Report = require('../models/Report');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');
const Leave = require('../models/Leave');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const PDFDocument = require('pdfkit');

// Built-in CSV serialiser — no extra package needed
const toCSV = (rows) => {
  if (!rows || rows.length === 0) return '';
  const escape = (v) => {
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(','))
  ];
  return lines.join('\r\n');
};

// @desc    Generate a new report
// @route   POST /api/reports/generate
// @access  Private (Admin & HR)
const generateReport = asyncHandler(async (req, res) => {
  const { name, type, dateRange, format, filters } = req.body;
  const userRole = req.user.role;

  let reportData = {};
  let fileSize = '0 KB';

  switch (type) {
    case 'Payroll':
      const payrollData = await Payroll.aggregate([
        { $match: { month: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } } },
        { $group: { _id: '$department', totalSalary: { $sum: '$netSalary' }, employeeCount: { $sum: 1 } } }
      ]);
      reportData = {
        summary: payrollData,
        totalPayroll: payrollData.reduce((sum, d) => sum + d.totalSalary, 0),
        generatedAt: new Date()
      };
      fileSize = `${Math.floor(Math.random() * 5) + 1}.2 MB`;
      break;

    case 'Attendance':
      const attendanceData = await Attendance.aggregate([
        { $match: { date: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      reportData = {
        summary: attendanceData,
        totalRecords: attendanceData.reduce((sum, d) => sum + d.count, 0),
        generatedAt: new Date()
      };
      fileSize = `${Math.floor(Math.random() * 3) + 1}.1 MB`;
      break;

    case 'Leaves':
      const leaveData = await Leave.aggregate([
        { $match: { startDate: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } } },
        { $group: { _id: '$type', totalDays: { $sum: '$totalDays' }, count: { $sum: 1 } } }
      ]);
      reportData = {
        summary: leaveData,
        totalLeaves: leaveData.reduce((sum, d) => sum + d.totalDays, 0), // ✅ Fixed: was `totalDays` (undefined)
        generatedAt: new Date()
      };
      fileSize = `${Math.floor(Math.random() * 2) + 1}.8 MB`;
      break;

    case 'Recruitment':
      const recruitmentData = await Candidate.aggregate([
        { $match: { createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      const jobsData = await Job.countDocuments({ status: 'Open' });
      reportData = {
        candidates: recruitmentData,
        openJobs: jobsData,
        totalApplications: recruitmentData.reduce((sum, d) => sum + d.count, 0),
        generatedAt: new Date()
      };
      fileSize = `${Math.floor(Math.random() * 4) + 2}.5 MB`;
      break;

    case 'Performance':
      reportData = {
        averageRating: 4.2,
        totalReviews: 45,
        topPerformers: 12,
        generatedAt: new Date()
      };
      fileSize = `${Math.floor(Math.random() * 3) + 1}.3 MB`;
      break;

    default:
      reportData = { message: 'Report generated', generatedAt: new Date() };
      fileSize = `${Math.floor(Math.random() * 2) + 1}.0 MB`;
  }

  let visibility = 'private';
  if (userRole === 'admin') {
    visibility = req.body.visibility || 'private';
  } else if (userRole === 'hr') {
    visibility = 'shared';
  }

  const report = await Report.create({
    name,
    type,
    dateRange: {
      start: new Date(dateRange.start),
      end: new Date(dateRange.end)
    },
    format: format || 'PDF',
    fileSize,
    status: 'Generated',
    visibility,
    generatedBy: req.user._id,
    generatedByRole: userRole,
    data: reportData,
    downloadCount: 0
  });

  res.status(201).json({
    success: true,
    message: 'Report generated successfully',
    data: report
  });
});

// @desc    Get all reports (Admin only)
// @route   GET /api/reports/all
// @access  Private (Admin only)
const getAllReports = asyncHandler(async (req, res) => {
  const { type, status, visibility, search } = req.query;
  let query = {};

  if (type && type !== 'all') query.type = type;
  if (status && status !== 'all') query.status = status;
  if (visibility && visibility !== 'all') query.visibility = visibility;
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const reports = await Report.find(query)
    .populate('generatedBy', 'name email')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);

  const total = await Report.countDocuments(query);

  res.json({
    success: true,
    count: reports.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
    data: reports
  });
});

// @desc    Get shared reports (HR can view)
// @route   GET /api/reports/shared
// @access  Private (Admin & HR)
const getSharedReports = asyncHandler(async (req, res) => {
  const query = { visibility: 'shared' };

  const reports = await Report.find(query)
    .populate('generatedBy', 'name email')
    .sort('-createdAt');

  res.json({
    success: true,
    count: reports.length,
    data: reports
  });
});

// @desc    Get report by ID
// @route   GET /api/reports/:id
// @access  Private (Admin & HR)
const getReportById = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id)
    .populate('generatedBy', 'name email role');

  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }

  if (req.user.role === 'hr' && report.visibility !== 'shared') {
    res.status(403);
    throw new Error('You do not have permission to view this report');
  }

  report.viewCount = (report.viewCount || 0) + 1;
  await report.save();

  res.json({
    success: true,
    data: report
  });
});

// @desc    Download report as PDF or CSV
// @route   GET /api/reports/:id/download
// @access  Private (Admin & HR)
const downloadReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id)
    .populate('generatedBy', 'name email');

  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }

  // HR can only download shared reports
  if (req.user.role === 'hr' && report.visibility !== 'shared') {
    res.status(403);
    throw new Error('Access denied: report is not shared');
  }

  // Increment download count
  report.downloadCount = (report.downloadCount || 0) + 1;
  await report.save();

  const safeFilename = report.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `${safeFilename}_${Date.now()}`;

  // ── CSV ──────────────────────────────────────────────────────────────────
  if (report.format === 'CSV') {
    try {
      const rows = Array.isArray(report.data?.summary) && report.data.summary.length > 0
        ? report.data.summary
        : [report.data];

      const flatRows = rows.map(row =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : v])
        )
      );

      const csv = toCSV(flatRows);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    } catch (err) {
      res.status(500);
      throw new Error('Failed to generate CSV: ' + err.message);
    }
  }

  // ── PDF (default) ─────────────────────────────────────────────────────────
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);

  // — Cover header —
  doc
    .rect(0, 0, doc.page.width, 110)
    .fill('#1e3a5f');

  doc
    .fillColor('#ffffff')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text(report.name, 50, 30, { align: 'center' });

  doc
    .fontSize(11)
    .font('Helvetica')
    .text(`Type: ${report.type}  |  Format: ${report.format}  |  Status: ${report.status}`, 50, 62, { align: 'center' });

  doc
    .text(
      `Period: ${new Date(report.dateRange.start).toDateString()} – ${new Date(report.dateRange.end).toDateString()}`,
      50, 82,
      { align: 'center' }
    );

  doc.fillColor('#000000').moveDown(5);

  // — Meta info —
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#555555')
    .text(`Generated by: ${report.generatedBy?.name || 'System'} (${report.generatedByRole || ''})`, { align: 'right' })
    .text(`Generated on: ${new Date(report.createdAt).toDateString()}`, { align: 'right' })
    .text(`Downloads: ${report.downloadCount}`, { align: 'right' });

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke('#cccccc');
  doc.moveDown();

  // — Summary section —
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#1e3a5f')
    .text('Report Summary');

  doc.moveDown(0.5);

  const drawTable = (rows) => {
    if (!rows || rows.length === 0) return;
    const keys = Object.keys(rows[0]);
    const colWidth = Math.floor(495 / keys.length);
    const startX = 50;

    // Header row background
    doc.rect(startX, doc.y, 495, 20).fill('#1e3a5f');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    keys.forEach((key, i) => {
      doc.text(
        key.replace(/_/g, ' ').toUpperCase(),
        startX + i * colWidth + 4,
        doc.y - 16,
        { width: colWidth - 8, continued: i < keys.length - 1 }
      );
    });
    doc.moveDown(0.6);

    // Data rows
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    rows.forEach((row, rowIndex) => {
      if (doc.y > 720) doc.addPage(); // page break guard
      const rowY = doc.y;

      // Alternating row background
      if (rowIndex % 2 === 0) {
        doc.rect(startX, rowY, 495, 18).fill('#f5f7fa');
      }

      doc.fillColor('#333333');
      keys.forEach((key, i) => {
        const val = row[key] ?? '—';
        doc.text(
          typeof val === 'object' ? JSON.stringify(val) : String(val),
          startX + i * colWidth + 4,
          rowY + 4,
          { width: colWidth - 8, continued: i < keys.length - 1 }
        );
      });
      doc.moveDown(0.5);
    });
  };

  if (Array.isArray(report.data?.summary) && report.data.summary.length > 0) {
    drawTable(report.data.summary);
  }

  // — Additional top-level fields —
  const skip = new Set(['summary', 'generatedAt']);
  const extras = Object.entries(report.data || {}).filter(([k]) => !skip.has(k));

  if (extras.length > 0) {
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown();
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1e3a5f').text('Additional Data');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#333333');

    extras.forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      const displayVal = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(displayVal);
      doc.moveDown(0.3);
    });
  }

  // — Footer —
  const pageCount = doc.bufferedPageRange?.()?.count || 1;
  doc
    .fontSize(8)
    .fillColor('#999999')
    .text(
      `Confidential – Generated by HR Management System  |  Page 1 of ${pageCount}`,
      50,
      doc.page.height - 40,
      { align: 'center', width: 495 }
    );

  doc.end();
});

// @desc    Update report visibility (Admin only)
// @route   PUT /api/reports/:id/visibility
// @access  Private (Admin only)
const updateReportVisibility = asyncHandler(async (req, res) => {
  const { visibility } = req.body;

  if (!['private', 'shared'].includes(visibility)) {
    res.status(400);
    throw new Error('Invalid visibility value');
  }

  const report = await Report.findById(req.params.id);
  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }

  report.visibility = visibility;
  await report.save();

  res.json({
    success: true,
    message: `Report visibility updated to ${visibility}`,
    data: report
  });
});

// @desc    Delete report (Admin only)
// @route   DELETE /api/reports/:id
// @access  Private (Admin only)
const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }

  await report.deleteOne();

  res.json({
    success: true,
    message: 'Report deleted successfully'
  });
});

// @desc    Get report statistics
// @route   GET /api/reports/stats
// @access  Private (Admin & HR)
const getReportStats = asyncHandler(async (req, res) => {
  let query = {};

  if (req.user.role === 'hr') {
    query.visibility = 'shared';
  }

  const totalReports = await Report.countDocuments(query);
  const generatedThisMonth = await Report.countDocuments({
    ...query,
    createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
  });
  const automatedReports = await Report.countDocuments({ ...query, status: 'Automated' });
  const scheduledReports = await Report.countDocuments({ ...query, status: 'Scheduled' });
  const sharedReports = await Report.countDocuments({ visibility: 'shared' });

  const typeDistribution = await Report.aggregate([
    { $match: query },
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);

  const recentReports = await Report.find(query)
    .sort('-createdAt')
    .limit(5)
    .select('name type createdAt downloadCount');

  res.json({
    success: true,
    data: {
      totalReports,
      generatedThisMonth,
      automatedReports,
      scheduledReports,
      sharedReports,
      typeDistribution,
      recentReports
    }
  });
});

module.exports = {
  generateReport,
  getAllReports,
  getReportById,
  downloadReport,
  updateReportVisibility,
  deleteReport,
  getReportStats,
  getSharedReports
};