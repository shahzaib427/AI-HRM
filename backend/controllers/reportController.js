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

// ─────────────────────────────────────────────────────────────────────────
// Helper: build the list of {year, monthVariants[]} buckets that fall
// inside a given dateRange. Payroll.month is stored as a STRING (not a
// Date), and we don't know for certain which string format your payroll
// creation code uses, so we generate every common representation for each
// calendar month in range and match with $in. Payroll.year is a real
// Number field, so that part is matched exactly.
// ─────────────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const buildPayrollMonthBuckets = (start, end) => {
  const buckets = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= last) {
    const y = cursor.getFullYear();
    const mIndex = cursor.getMonth(); // 0-based
    const mNum = mIndex + 1;

    const variants = [
      String(mNum),                                    // "8"
      String(mNum).padStart(2, '0'),                    // "08"
      MONTH_NAMES[mIndex],                               // "August"
      MONTH_SHORT[mIndex],                                // "Aug"
      `${y}-${String(mNum).padStart(2, '0')}`,            // "2026-08"
      `${MONTH_NAMES[mIndex]} ${y}`,                       // "August 2026"
    ];

    buckets.push({ year: y, month: { $in: variants } });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
};

// Only these types have real aggregation logic wired up below. Keep this
// in sync with the Report model's `type` enum and the frontend dropdowns.
const SUPPORTED_REPORT_TYPES = ['Payroll', 'Attendance', 'Leaves', 'Recruitment'];

// ─────────────────────────────────────────────────────────────────────────
// Shared report-data builder. Called by BOTH generateReport (to store an
// initial snapshot) and downloadReport (to recompute fresh numbers at
// download time), so a report never goes stale just because new records
// were added after it was first generated.
// ─────────────────────────────────────────────────────────────────────────
// Normalizes a dateRange {start, end} to local midnight → local 23:59:59.999.
// This matters because Attendance stores `date` normalized to LOCAL midnight
// (see Attendance's pre-save setter), while `new Date(dateRange.start)` on a
// plain "YYYY-MM-DD" string parses as UTC midnight. On a server not running
// in UTC, those two "midnights" can be hours apart, silently excluding
// same-day records from $gte/$lte matches. Normalizing both ends to local
// day boundaries keeps report matching consistent with how records are saved.
const normalizeDateRange = (dateRange) => {
  const start = new Date(dateRange.start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateRange.end);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const buildReportData = async (type, dateRange) => {
  const { start, end } = normalizeDateRange(dateRange);

  switch (type) {
    case 'Payroll': {
      const monthBuckets = buildPayrollMonthBuckets(start, end);

      // Pull individual payroll records, populating the linked User so we
      // get the authoritative employee code (e.g. "EMP123456") and name
      // even if the snapshot fields on the Payroll doc itself were left
      // blank at creation time.
      const payrollRecords = await Payroll.find({ $or: monthBuckets })
        .populate('employeeId', 'employeeId name email department')
        .sort({ employeeDepartment: 1, employeeName: 1 })
        .lean();

      const summary = payrollRecords.map((r) => {
        const user = r.employeeId; // populated User doc, or null if employee was deleted
        const totalSalary =
          (r.salary || 0) +
          (r.fuelAllowance || 0) +
          (r.medicalAllowance || 0) +
          (r.specialAllowance || 0) +
          (r.otherAllowance || 0);

        return {
          employee_id: user?.employeeId || r.employeeCode || '—',
          employee_name: user?.name || r.employeeName || '—',
          department: user?.department || r.employeeDepartment || '—',
          total_salary: totalSalary,
          payment_status: r.paymentStatus || 'Pending'
        };
      });

      return {
        summary,
        totalPayroll: summary.reduce((sum, d) => sum + d.total_salary, 0),
        totalEmployees: summary.length,
        generatedAt: new Date()
      };
    }

    case 'Attendance': {
      const attendanceRecords = await Attendance.find({ date: { $gte: start, $lte: end } })
        .populate('employee', 'employeeId name department')
        .sort({ date: -1 })
        .lean();

      const formatTime = (d) =>
        d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';

      const summary = attendanceRecords.map((r) => {
        const user = r.employee; // populated User doc, or null if employee was deleted
        // Mirrors the actualCheckIn/actualCheckOut virtuals on the model,
        // recreated here manually since .lean() docs don't include virtuals.
        const actualCheckIn = r.approvedCheckIn || r.requestedCheckIn || r.checkIn;
        const actualCheckOut = r.approvedCheckOut || r.requestedCheckOut || r.checkOut;

        return {
          employee_id: user?.employeeId || '—',
          employee_name: user?.name || r.employeeName || '—',
          department: user?.department || r.employeeDepartment || '—',
          date: r.date ? new Date(r.date).toDateString() : '—',
          check_in: formatTime(actualCheckIn),
          check_out: formatTime(actualCheckOut),
          status: r.status || '—'
        };
      });

      return {
        summary,
        totalRecords: summary.length,
        generatedAt: new Date()
      };
    }

    case 'Leaves': {
      const leaveRecords = await Leave.find({ startDate: { $gte: start, $lte: end } })
        .populate('employee', 'employeeId name department')
        .sort({ startDate: -1 })
        .lean();

      const summary = leaveRecords.map((r) => {
        const user = r.employee; // populated User doc, or null if employee was deleted
        return {
          employee_id: user?.employeeId || '—',
          employee_name: user?.name || '—',
          department: user?.department || '—',
          leave_type: r.type || '—',
          start_date: r.startDate ? new Date(r.startDate).toDateString() : '—',
          end_date: r.endDate ? new Date(r.endDate).toDateString() : '—',
          days: r.days ?? 0,
          status: r.status || '—'
        };
      });

      return {
        summary,
        totalLeaves: summary.reduce((sum, d) => sum + (d.days || 0), 0),
        totalRequests: summary.length,
        generatedAt: new Date()
      };
    }

    case 'Recruitment': {
      const candidates = await Candidate.find({ createdAt: { $gte: start, $lte: end } })
        .populate('jobId', 'title department')
        .sort({ createdAt: -1 })
        .lean();

      const summary = candidates.map((c) => ({
        candidate_name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || '—',
        email: c.email || '—',
        job_title: c.jobId?.title || '—',
        status: c.status || '—',
        applied_on: c.createdAt ? new Date(c.createdAt).toDateString() : '—'
      }));

      const openJobs = await Job.countDocuments({ status: 'Open' });

      return {
        summary,
        openJobs,
        totalApplications: summary.length,
        generatedAt: new Date()
      };
    }

    default:
      // Should not normally be reached — generateReport validates `type`
      // against SUPPORTED_REPORT_TYPES before calling this function.
      return { message: 'Report generated', generatedAt: new Date() };
  }
};

// Rough file-size estimate for display purposes only (not exact bytes)
const estimateFileSize = (type) => {
  const ranges = {
    Payroll: [1, 6],
    Attendance: [1, 4],
    Leaves: [1, 3],
    Recruitment: [2, 6]
  };
  const [min, max] = ranges[type] || [1, 2];
  return `${(Math.random() * (max - min) + min).toFixed(1)} MB`;
};

// @desc    Generate a new report
// @route   POST /api/reports/generate
// @access  Private (Admin & HR)
const generateReport = asyncHandler(async (req, res) => {
  const { name, type, dateRange, format, filters } = req.body;
  const userRole = req.user.role;

  if (!SUPPORTED_REPORT_TYPES.includes(type)) {
    res.status(400);
    throw new Error(`Report type "${type}" is not supported. Choose one of: ${SUPPORTED_REPORT_TYPES.join(', ')}`);
  }

  const reportData = await buildReportData(type, dateRange);
  const fileSize = estimateFileSize(type);

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

// @desc    Download report as PDF or CSV (recomputes live data on every download)
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

  // ── Recompute fresh data at download time instead of trusting the
  // frozen snapshot saved when the report was first generated ──
  const liveData = await buildReportData(report.type, report.dateRange);
  report.data = liveData;
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
    const headerFontSize = 8;
    const cellFontSize = 8.5;
    const cellPadding = 8; // top+bottom padding added to measured text height

    const formatHeader = (key) => key.replace(/_/g, ' ').toUpperCase();
    const formatCell = (val) => (typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '—'));

    // Draws the header band at the given y and returns its measured height —
    // measured from the tallest wrapped column label, so a two-word header
    // like "EMPLOYEE ID" that wraps to two lines never spills into the row
    // beneath it (that overlap was the original bug).
    const drawHeader = (y) => {
      doc.fontSize(headerFontSize).font('Helvetica-Bold');
      let headerHeight = 14;
      keys.forEach((key) => {
        const h = doc.heightOfString(formatHeader(key), { width: colWidth - 8 });
        if (h > headerHeight) headerHeight = h;
      });
      headerHeight += cellPadding;

      doc.rect(startX, y, 495, headerHeight).fill('#1e3a5f');
      doc.fillColor('#ffffff').fontSize(headerFontSize).font('Helvetica-Bold');
      keys.forEach((key, i) => {
        doc.text(formatHeader(key), startX + i * colWidth + 4, y + 4, { width: colWidth - 8 });
      });
      return headerHeight;
    };

    let headerHeight = drawHeader(doc.y);
    doc.y += headerHeight;

    doc.font('Helvetica').fontSize(cellFontSize).fillColor('#000000');

    rows.forEach((row, rowIndex) => {
      // Measure this row's tallest wrapped cell before drawing anything
      doc.fontSize(cellFontSize).font('Helvetica');
      let rowHeight = 14;
      keys.forEach((key) => {
        const h = doc.heightOfString(formatCell(row[key]), { width: colWidth - 8 });
        if (h > rowHeight) rowHeight = h;
      });
      rowHeight += cellPadding;

      // Page-break guard, now accounting for this row's actual measured height
      if (doc.y + rowHeight > 730) {
        doc.addPage();
        const newHeaderHeight = drawHeader(doc.y);
        doc.y += newHeaderHeight;
        doc.font('Helvetica').fontSize(cellFontSize).fillColor('#000000');
      }

      const rowY = doc.y;

      if (rowIndex % 2 === 0) {
        doc.rect(startX, rowY, 495, rowHeight).fill('#f5f7fa');
      }

      doc.fillColor('#333333');
      keys.forEach((key, i) => {
        doc.text(formatCell(row[key]), startX + i * colWidth + 4, rowY + 4, { width: colWidth - 8 });
      });

      doc.y = rowY + rowHeight;
    });

    doc.moveDown(0.5);
  };

  if (Array.isArray(report.data?.summary) && report.data.summary.length > 0) {
    drawTable(report.data.summary);
  } else if (report.data?.notice) {
    doc.fontSize(10).font('Helvetica').fillColor('#c0392b').text(report.data.notice);
    doc.moveDown();
  }

  // — Additional top-level fields —
  const skip = new Set(['summary', 'generatedAt', 'notice']);
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