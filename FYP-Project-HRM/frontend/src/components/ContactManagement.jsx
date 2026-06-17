import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaEnvelope, FaPhone, FaBuilding, FaUser, FaClock, 
  FaEye, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle,
  FaSpinner, FaTimes, FaSearch, FaFilter, FaReply,
  FaUserCheck, FaChartLine, FaCalendarAlt, FaStar,
  FaFlag, FaComments, FaAddressCard
} from 'react-icons/fa';
import { format } from 'date-fns';

// Badge Component
const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

// KPI Card Component
const KpiCard = ({ icon: Icon, label, value, sub, iconBg }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="text-white text-sm" />
      </div>
    </div>
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    'pending': { variant: 'warning', icon: <FaClock className="mr-1 text-xs" />, text: 'Pending' },
    'contacted': { variant: 'info', icon: <FaPhone className="mr-1 text-xs" />, text: 'Contacted' },
    'resolved': { variant: 'success', icon: <FaCheckCircle className="mr-1 text-xs" />, text: 'Resolved' },
    'spam': { variant: 'danger', icon: <FaFlag className="mr-1 text-xs" />, text: 'Spam' }
  };
  const config = statusConfig[status] || statusConfig.pending;
  return <Badge variant={config.variant}>{config.icon} {config.text}</Badge>;
};

const ContactManagement = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    contacted: 0,
    resolved: 0,
    todaySubmissions: 0
  });
  const [noteText, setNoteText] = useState('');
  const [statusUpdate, setStatusUpdate] = useState('');
  
  // Get user role from localStorage
  const userRole = localStorage.getItem('userRole') || 'hr';
  const isAdmin = userRole === 'admin';

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Fetch contact submissions
  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/contact`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          search: searchTerm, 
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page: currentPage,
          limit: 10
        }
      });
      setSubmissions(response.data.data);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/contact/stats/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    fetchStats();
  }, [searchTerm, statusFilter, currentPage]);

  // Update submission status
  const handleStatusUpdate = async () => {
    if (!statusUpdate) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/contact/${selectedSubmission._id}/status`, 
        { status: statusUpdate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Status updated successfully');
      setShowDetailsModal(false);
      fetchSubmissions();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  // Add note to submission
  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/contact/${selectedSubmission._id}/notes`,
        { text: noteText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Note added successfully');
      setShowNoteModal(false);
      setNoteText('');
      fetchSubmissions();
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note');
    }
  };

  // Delete submission (Admin only)
  const handleDelete = async (id) => {
    if (!isAdmin) {
      alert('Only admins can delete submissions');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this submission?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/contact/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Submission deleted successfully');
      fetchSubmissions();
      fetchStats();
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Failed to delete submission');
    }
  };

  // Mark as contacted
  const handleMarkContacted = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/contact/${id}/status`,
        { status: 'contacted' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchSubmissions();
      fetchStats();
    } catch (error) {
      console.error('Error marking as contacted:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaEnvelope className="text-indigo-600" /> Contact Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage and respond to contact form submissions</p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaComments className="w-5 h-5" />
              <span className="text-sm">Customer Inquiries</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          <KpiCard icon={FaEnvelope} label="Total Submissions" value={stats.total} iconBg="bg-indigo-500" />
          <KpiCard icon={FaClock} label="Pending" value={stats.pending} iconBg="bg-amber-500" />
          <KpiCard icon={FaPhone} label="Contacted" value={stats.contacted} iconBg="bg-blue-500" />
          <KpiCard icon={FaCheckCircle} label="Resolved" value={stats.resolved} iconBg="bg-emerald-500" />
          <KpiCard icon={FaCalendarAlt} label="Today" value={stats.todaySubmissions} iconBg="bg-purple-500" />
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
              />
            </div>
            <div className="w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="contacted">Contacted</option>
                <option value="resolved">Resolved</option>
                <option value="spam">Spam</option>
              </select>
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FaFilter className="text-xs" /> Reset Filters
            </button>
          </div>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FaEnvelope className="text-gray-400 text-2xl" />
            </div>
            <p className="text-gray-500 font-medium mb-2">No submissions found</p>
            <p className="text-gray-400 text-sm">No contact form submissions match your criteria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div key={submission._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="text-base font-semibold text-gray-900">{submission.fullName}</h3>
                      <StatusBadge status={submission.status} />
                      {!submission.isRead && (
                        <Badge variant="info">
                          <FaStar className="mr-1 text-xs" /> New
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaEnvelope className="text-indigo-400 w-4 h-4" />
                        <span className="truncate">{submission.email}</span>
                      </div>
                      {submission.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <FaPhone className="text-indigo-400 w-4 h-4" />
                          <span>{submission.phone}</span>
                        </div>
                      )}
                      {submission.companyName && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <FaBuilding className="text-indigo-400 w-4 h-4" />
                          <span>{submission.companyName}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      Received: {format(new Date(submission.createdAt), 'MMM dd, yyyy h:mm a')}
                    </div>
                    {submission.message && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 line-clamp-2">{submission.message}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedSubmission(submission);
                        setShowDetailsModal(true);
                      }}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <FaEye className="w-4 h-4" />
                    </button>
                    {submission.status === 'pending' && (
                      <button
                        onClick={() => handleMarkContacted(submission._id)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Mark as Contacted"
                      >
                        <FaPhone className="w-4 h-4" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(submission._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Contact Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Customer Info */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <FaUser className="text-indigo-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedSubmission.fullName}</h3>
                    <p className="text-sm text-gray-500">Customer</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedSubmission.email}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedSubmission.phone || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Company</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedSubmission.companyName || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Submitted</p>
                  <p className="text-sm font-semibold text-gray-900">{format(new Date(selectedSubmission.createdAt), 'PPP')}</p>
                </div>
              </div>

              {/* Message */}
              {selectedSubmission.message && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 font-medium mb-2">Message</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedSubmission.message}</p>
                </div>
              )}

              {/* Status Update (Admin & HR) */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 font-medium mb-2">Update Status</p>
                <div className="flex gap-3 flex-wrap">
                  {['pending', 'contacted', 'resolved', 'spam'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusUpdate(status);
                        handleStatusUpdate();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedSubmission.status === status
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500 font-medium">Internal Notes</p>
                  <button
                    onClick={() => setShowNoteModal(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    + Add Note
                  </button>
                </div>
                {selectedSubmission.notes?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSubmission.notes.map((note, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-2 text-xs">
                        <p className="text-gray-700">{note.text}</p>
                        <p className="text-gray-400 mt-1">
                          {note.addedBy?.name || 'System'} • {format(new Date(note.addedAt), 'MMM dd, h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No notes yet</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Close
                </button>
                <a
                  href={`mailto:${selectedSubmission.email}`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
                >
                  <FaReply className="text-xs" /> Reply via Email
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Internal Note</h2>
            </div>
            <div className="p-6">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter your note here..."
              />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddNote} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactManagement;