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
  ShieldCheckIcon,
  UserGroupIcon,
  LockClosedIcon,
  GlobeAltIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

// Light KPI Card
const KpiCard = ({ title, value, icon: Icon, color, subtext }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all duration-300">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

const AdminReports = () => {
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
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [notification, setNotification] = useState(null);
  const itemsPerPage = 8;

  // New report form
  const [newReport, setNewReport] = useState({
    name: '',
    type: 'Payroll',
    dateRange: { start: '', end: '' },
    format: 'PDF',
    visibility: 'private'
  });

  // Fetch all reports (Admin only)
  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/reports/all');
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
      const response = await axiosInstance.post('/reports/generate', newReport);
      
      if (response.data.success) {
        showNotification('Report generated successfully!', 'success');
        setShowGenerateModal(false);
        setNewReport({ name: '', type: 'Payroll', dateRange: { start: '', end: '' }, format: 'PDF', visibility: 'private' });
        fetchReports();
        fetchStats();
      }
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to generate report', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update report visibility
  const handleUpdateVisibility = async () => {
    if (!selectedReport) return;
    
    try {
      const newVisibility = selectedReport.visibility === 'private' ? 'shared' : 'private';
      const response = await axiosInstance.put(`/reports/${selectedReport._id}/visibility`, {
        visibility: newVisibility
      });
      
      if (response.data.success) {
        showNotification(`Report visibility updated to ${newVisibility}`, 'success');
        setShowVisibilityModal(false);
        setSelectedReport(null);
        fetchReports();
      }
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to update visibility', 'error');
    }
  };

  // Delete report
  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    
    try {
      const response = await axiosInstance.delete(`/reports/${reportId}`);
      if (response.data.success) {
        showNotification('Report deleted successfully', 'success');
        fetchReports();
        fetchStats();
      }
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to delete report', 'error');
    }
  };

  // Download report
  const handleDownload = async (report) => {
    try {
      await axiosInstance.put(`/reports/${report._id}/download`);
      showNotification(`Downloading ${report.name}...`, 'success');
      
      const blob = new Blob([JSON.stringify(report.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.name.replace(/\s/g, '_')}.${report.format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      showNotification('Failed to download report', 'error');
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
      Recruitment: 'bg-purple-100 text-purple-700',
      Performance: 'bg-indigo-100 text-indigo-700',
      Training: 'bg-cyan-100 text-cyan-700',
      Finance: 'bg-pink-100 text-pink-700',
      System: 'bg-gray-100 text-gray-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesType = reportType === 'all' || report.type === reportType;
    const matchesVisibility = visibilityFilter === 'all' || report.visibility === visibilityFilter;
    const matchesSearch = !searchTerm || report.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesVisibility && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
              <p className="text-sm text-gray-500 mt-1">Manage and generate comprehensive HR reports</p>
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
        {/* Stats Cards - Light Theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-6">
          <KpiCard 
            title="Total Reports" 
            value={stats.totalReports} 
            icon={DocumentTextIcon}
            color="bg-blue-500"
            subtext="All time reports"
          />
          <KpiCard 
            title="This Month" 
            value={stats.generatedThisMonth} 
            icon={CalendarIcon}
            color="bg-green-500"
            subtext="Generated in current month"
          />
          <KpiCard 
            title="Automated" 
            value={stats.automatedReports} 
            icon={ArrowPathIcon}
            color="bg-purple-500"
            subtext="Auto-generated reports"
          />
          <KpiCard 
            title="Scheduled" 
            value={stats.scheduledReports} 
            icon={ChartBarIcon}
            color="bg-amber-500"
            subtext="Pending generation"
          />
          <KpiCard 
            title="Shared Reports" 
            value={stats.sharedReports} 
            icon={UserGroupIcon}
            color="bg-indigo-500"
            subtext="Available to HR team"
          />
        </div>

        {/* Admin Controls Banner */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="w-6 h-6 text-indigo-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-indigo-800">Admin Controls</p>
              <p className="text-xs text-indigo-700">
                You have full control over report visibility. Set reports as "Shared" to make them accessible to HR team members.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search reports..."
                className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
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
                <option value="Performance">Performance</option>
                <option value="Training">Training</option>
                <option value="Finance">Finance</option>
                <option value="System">System</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Visibility</label>
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All</option>
                <option value="private">Private (Admin only)</option>
                <option value="shared">Shared (HR + Admin)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={fetchReports}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
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
            <h2 className="text-base font-semibold text-gray-900">All Reports</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage report visibility and access</p>
          </div>

          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No reports found</p>
              <p className="text-gray-400 text-sm mt-1">Generate a new report to get started</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Range</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visibility</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generated By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Downloads</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedReports.map((report) => (
                      <tr key={report._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{report.name}</div>
                          <div className="text-xs text-gray-400">
                            {formatDate(report.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${getReportTypeColor(report.type)}`}>
                            {report.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(report.dateRange?.start)} - {formatDate(report.dateRange?.end)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {report.visibility === 'shared' ? (
                              <>
                                <GlobeAltIcon className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-green-700">Shared</span>
                              </>
                            ) : (
                              <>
                                <LockClosedIcon className="w-4 h-4 text-red-600" />
                                <span className="text-sm text-red-700">Private</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {report.generatedBy?.name || 'System'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{report.downloadCount || 0}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDownload(report)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Download"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedReport(report);
                                setShowVisibilityModal(true);
                              }}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Change Visibility"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteReport(report._id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredReports.length)} of {filteredReports.length} reports
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      
                      return (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? 'bg-indigo-600 text-white'
                              : 'border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
                  <option value="Performance">Performance Report</option>
                  <option value="Training">Training Report</option>
                  <option value="Finance">Finance Report</option>
                  <option value="System">System Report</option>
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
                  <option value="Excel">Excel</option>
                  <option value="CSV">CSV</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={newReport.visibility}
                  onChange={(e) => setNewReport({...newReport, visibility: e.target.value})}
                >
                  <option value="private">Private (Admin only)</option>
                  <option value="shared">Shared (HR + Admin)</option>
                </select>
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

      {/* Visibility Modal */}
      {showVisibilityModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Change Report Visibility</h2>
              <button onClick={() => { setShowVisibilityModal(false); setSelectedReport(null); }} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">Report: <strong>{selectedReport.name}</strong></p>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={selectedReport.visibility === 'private'}
                    onChange={() => setSelectedReport({...selectedReport, visibility: 'private'})}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <LockClosedIcon className="w-4 h-4 text-red-600" />
                      <span className="font-medium">Private</span>
                    </div>
                    <p className="text-xs text-gray-500">Only Admin can view this report</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="visibility"
                    value="shared"
                    checked={selectedReport.visibility === 'shared'}
                    onChange={() => setSelectedReport({...selectedReport, visibility: 'shared'})}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <GlobeAltIcon className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Shared</span>
                    </div>
                    <p className="text-xs text-gray-500">Both Admin and HR can view this report</p>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => { setShowVisibilityModal(false); setSelectedReport(null); }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateVisibility}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Update Visibility
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

export default AdminReports;