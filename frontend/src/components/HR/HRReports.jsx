import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import {
  DocumentTextIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowPathIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

// KPI Card Component - Light Theme
const KpiCard = ({ title, value, icon: Icon, color, subtext, change }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all duration-300">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        {change && (
          <p className={`text-xs mt-1 ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
            {change} from last month
          </p>
        )}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

const HRReports = () => {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    totalReports: 0,
    generatedThisMonth: 0,
    automatedReports: 0,
    scheduledReports: 0,
    sharedReports: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportType, setReportType] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);
  const [downloading, setDownloading] = useState(null); // track which report is downloading
  const [newReport, setNewReport] = useState({
    name: '',
    type: 'Payroll',
    dateRange: { start: '', end: '' },
    format: 'PDF'
  });
  const [notification, setNotification] = useState(null);

  // Fetch reports (only shared ones for HR)
  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/reports/shared');
      if (response.data.success) {
        setReports(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get('/reports/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, []);

  // Generate new report
  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.post('/reports/generate', {
        ...newReport,
        visibility: 'shared' // HR reports are automatically shared
      });
      if (response.data.success) {
        showNotification('Report generated successfully!', 'success');
        setShowGenerateModal(false);
        setNewReport({ name: '', type: 'Payroll', dateRange: { start: '', end: '' }, format: 'PDF' });
        fetchReports();
        fetchStats();
      }
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to generate report', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fixed: GET instead of PUT, responseType blob, proper file trigger
  const handleDownload = async (report) => {
    if (downloading === report._id) return; // prevent double-click
    try {
      setDownloading(report._id);
      showNotification(`Preparing ${report.name}...`, 'success');

      const response = await axiosInstance.get(`/reports/${report._id}/download`, {
        responseType: 'blob',
      });

      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const ext = contentType.includes('csv') ? 'csv' : 'pdf';
      const safeFilename = `${report.name.replace(/\s+/g, '_')}.${ext}`;

      const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', safeFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showNotification(`${report.name} downloaded successfully!`, 'success');
      // Refresh to reflect updated downloadCount
      fetchReports();
    } catch (error) {
      console.error('Download error:', error);
      showNotification('Failed to download report', 'error');
    } finally {
      setDownloading(null);
    }
  };

  // ✅ Fixed: proper modal instead of alert()
  const handleView = async (report) => {
    try {
      const response = await axiosInstance.get(`/reports/${report._id}`);
      if (response.data.success) {
        setViewingReport(response.data.data);
        setShowViewModal(true);
      }
    } catch (error) {
      showNotification('Failed to load report details', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getReportTypeColor = (type) => {
    const colors = {
      Payroll: 'bg-blue-100 text-blue-700',
      Attendance: 'bg-green-100 text-green-700',
      Leaves: 'bg-yellow-100 text-yellow-700',
      Recruitment: 'bg-purple-100 text-purple-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const filteredReports = reports.filter(report =>
    reportType === 'all' || report.type === reportType
  );

  if (loading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`rounded-lg shadow-lg p-4 ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              ) : (
                <ExclamationCircleIcon className="w-5 h-5 text-red-600" />
              )}
              <p className="text-sm text-gray-800">{notification.message}</p>
              <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">View and generate shared reports</p>
            </div>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm"
            >
              <DocumentTextIcon className="w-4 h-4" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <KpiCard title="Total Reports" value={stats.totalReports} icon={DocumentTextIcon} color="bg-blue-500" subtext="All generated reports" />
          <KpiCard title="This Month" value={stats.generatedThisMonth} icon={CalendarIcon} color="bg-green-500" subtext="Generated in current month" change="+23%" />
          <KpiCard title="Automated" value={stats.automatedReports} icon={ArrowPathIcon} color="bg-purple-500" subtext="Auto-generated reports" />
          <KpiCard title="Shared Reports" value={stats.sharedReports} icon={UserGroupIcon} color="bg-amber-500" subtext="Available to HR team" />
        </div>

        {/* Info Banner */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-6 h-6 text-indigo-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-indigo-800">HR Reports Access</p>
              <p className="text-xs text-indigo-700">
                You have access to all shared reports. Contact admin if you need specific reports or have report generation requests.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Types</option>
                <option value="Payroll">Payroll</option>
                <option value="Attendance">Attendance</option>
                <option value="Leaves">Leaves</option>
                <option value="Recruitment">Recruitment</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchReports}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-base font-semibold text-gray-900">Available Reports</h2>
            <p className="text-xs text-gray-500 mt-0.5">Shared reports available for HR team</p>
          </div>

          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No reports available</p>
              <p className="text-gray-400 text-sm mt-1">Generate a new report to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Range</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Format</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Downloads</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReports.map((report) => (
                    <tr key={report._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{report.name}</div>
                        <div className="text-xs text-gray-400">Generated {formatDate(report.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${getReportTypeColor(report.type)}`}>
                          {report.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(report.dateRange?.start)} - {formatDate(report.dateRange?.end)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{report.format}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{report.fileSize}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{report.downloadCount || 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(report)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Report"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(report)}
                            disabled={downloading === report._id}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Download"
                          >
                            {downloading === report._id
                              ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                              : <ArrowDownTrayIcon className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* View Report Modal */}
      {showViewModal && viewingReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{viewingReport.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {viewingReport.type} · {formatDate(viewingReport.createdAt)}
                </p>
              </div>
              <button onClick={() => { setShowViewModal(false); setViewingReport(null); }} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Date Range</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(viewingReport.dateRange?.start)} – {formatDate(viewingReport.dateRange?.end)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Generated By</p>
                  <p className="text-sm font-medium text-gray-900">{viewingReport.generatedBy?.name || 'System'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Format</p>
                  <p className="text-sm font-medium text-gray-900">{viewingReport.format}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Downloads</p>
                  <p className="text-sm font-medium text-gray-900">{viewingReport.downloadCount || 0}</p>
                </div>
              </div>

              {/* Summary Data */}
              {Array.isArray(viewingReport.data?.summary) && viewingReport.data.summary.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary</h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(viewingReport.data.summary[0]).map(key => (
                            <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              {key.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {viewingReport.data.summary.map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-4 py-2 text-gray-700">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Extra fields */}
              {Object.entries(viewingReport.data || {})
                .filter(([k]) => !['summary', 'generatedAt'].includes(k))
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))
              }
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => { setShowViewModal(false); setViewingReport(null); }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                Close
              </button>
              <button
                onClick={() => { setShowViewModal(false); handleDownload(viewingReport); }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Generate New Report</h2>
              <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Q1 Payroll Summary"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={newReport.name}
                  onChange={(e) => setNewReport({...newReport, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={newReport.type}
                  onChange={(e) => setNewReport({...newReport, type: e.target.value})}
                >
                  <option value="Payroll">Payroll Report</option>
                  <option value="Attendance">Attendance Report</option>
                  <option value="Leaves">Leave Report</option>
                  <option value="Recruitment">Recruitment Report</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={newReport.dateRange.start}
                    onChange={(e) => setNewReport({...newReport, dateRange: {...newReport.dateRange, start: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={newReport.dateRange.end}
                    onChange={(e) => setNewReport({...newReport, dateRange: {...newReport.dateRange, end: e.target.value}})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={newReport.format}
                  onChange={(e) => setNewReport({...newReport, format: e.target.value})}
                >
                  <option value="PDF">PDF</option>
                  <option value="CSV">CSV</option>
                </select>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-xs text-indigo-700">
                  Reports generated by HR are automatically shared with Admin.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={!newReport.name || !newReport.dateRange.start || !newReport.dateRange.end}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default HRReports;