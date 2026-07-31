import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaUserPlus, FaCheckCircle, FaClock, FaTimesCircle, 
  FaEnvelope, FaPhone, FaCalendarAlt, FaSearch,
  FaPlus, FaTrash, FaEdit, FaEye, FaSpinner, FaTimes,
  FaBriefcase, FaBuilding, FaPaperPlane, FaTasks,
  FaCheck, FaStar, FaUpload, FaFileAlt, FaUsers,
  FaChartLine, FaChevronDown, FaChevronUp
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

const HROnboarding = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0
  });
  const [taskForm, setTaskForm] = useState({
    name: '',
    dueDate: '',
    description: ''
  });
  const [formData, setFormData] = useState({
    candidateName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    joiningDate: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const departments = [
    'General', 'IT', 'Human Resources', 'Finance', 'Marketing', 'Sales',
    'Operations', 'Customer Service', 'Research & Development', 'Administration'
  ];

  // Fetch candidates
  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/onboarding`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          search: searchTerm, 
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page: currentPage,
          limit: 10
        }
      });
      setCandidates(response.data.data);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error('Error fetching candidates:', error);
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
      const response = await axios.get(`${API_URL}/onboarding/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchStats();
  }, [searchTerm, statusFilter, currentPage]);

  // Create/Update candidate
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (editingId) {
        await axios.put(`${API_URL}/onboarding/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Candidate updated successfully');
      } else {
        await axios.post(`${API_URL}/onboarding`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Candidate added successfully');
      }
      setShowModal(false);
      resetForm();
      fetchCandidates();
      fetchStats();
    } catch (error) {
      console.error('Error saving candidate:', error);
      alert(error.response?.data?.error || 'Failed to save candidate');
    } finally {
      setLoading(false);
    }
  };

  // Delete candidate
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/onboarding/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Candidate deleted successfully');
      fetchCandidates();
      fetchStats();
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert('Failed to delete candidate');
    }
  };

  // Send offer letter
  const sendOfferLetter = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/onboarding/${id}/send-offer`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Offer letter sent successfully');
      fetchCandidates();
    } catch (error) {
      console.error('Error sending offer:', error);
      alert('Failed to send offer letter');
    }
  };

  // Add task
  const handleAddTask = async () => {
    if (!taskForm.name) {
      alert('Please enter task name');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/onboarding/${selectedCandidate._id}/tasks`, taskForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Task added successfully');
      setShowTaskModal(false);
      setTaskForm({ name: '', dueDate: '', description: '' });
      fetchCandidates();
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Failed to add task');
    }
  };

  // Toggle task completion
  const toggleTaskCompletion = async (candidateId, taskId, completed) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/onboarding/${candidateId}/tasks/${taskId}`, 
        { completed: !completed },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCandidates();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  };

  const resetForm = () => {
    setFormData({
      candidateName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      joiningDate: ''
    });
    setEditingId(null);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { variant: 'warning', icon: <FaClock className="mr-1 text-xs" />, text: 'Pending' },
      'in-progress': { variant: 'info', icon: <FaSpinner className="mr-1 text-xs animate-spin" />, text: 'In Progress' },
      'completed': { variant: 'success', icon: <FaCheckCircle className="mr-1 text-xs" />, text: 'Completed' },
      'rejected': { variant: 'danger', icon: <FaTimesCircle className="mr-1 text-xs" />, text: 'Rejected' }
    };
    const badge = badges[status] || badges.pending;
    return <Badge variant={badge.variant}>{badge.icon} {badge.text}</Badge>;
  };

  const displayedTasks = showAllTasks 
    ? selectedCandidate?.tasks 
    : selectedCandidate?.tasks?.slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaUserPlus className="text-indigo-600" /> Employee Onboarding
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage new employee onboarding process</p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaUserPlus className="w-5 h-5" />
              <span className="text-sm">Onboarding Portal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <KpiCard icon={FaUsers} label="Total Candidates" value={stats.total} iconBg="bg-indigo-500" />
          <KpiCard icon={FaClock} label="Pending" value={stats.pending} iconBg="bg-amber-500" />
          <KpiCard icon={FaTasks} label="In Progress" value={stats.inProgress} iconBg="bg-blue-500" />
          <KpiCard icon={FaCheckCircle} label="Completed" value={stats.completed} iconBg="bg-emerald-500" />
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email or position..."
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
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FaPlus className="text-xs" /> New Onboarding
            </button>
          </div>
        </div>

        {/* Candidates List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading candidates...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FaUserPlus className="text-gray-400 text-2xl" />
            </div>
            <p className="text-gray-500 font-medium mb-2">No onboarding candidates found</p>
            <p className="text-gray-400 text-sm">Click "New Onboarding" to add your first candidate</p>
          </div>
        ) : (
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <div key={candidate._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="text-base font-semibold text-gray-900">{candidate.candidateName}</h3>
                      {getStatusBadge(candidate.status)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaEnvelope className="text-indigo-400 w-4 h-4" />
                        <span>{candidate.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaPhone className="text-indigo-400 w-4 h-4" />
                        <span>{candidate.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaBriefcase className="text-indigo-400 w-4 h-4" />
                        <span>{candidate.position}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaBuilding className="text-indigo-400 w-4 h-4" />
                        <span>{candidate.department}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaCalendarAlt className="text-indigo-400 w-4 h-4" />
                        <span>Joining: {format(new Date(candidate.joiningDate), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Onboarding Progress</span>
                        <span className="font-medium text-indigo-600">{Math.round(candidate.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 rounded-full h-2 transition-all duration-500"
                          style={{ width: `${candidate.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedCandidate(candidate);
                        setShowDetailsModal(true);
                      }}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <FaEye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => sendOfferLetter(candidate._id)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Send Offer"
                    >
                      <FaPaperPlane className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCandidate(candidate);
                        setShowTaskModal(true);
                      }}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Add Task"
                    >
                      <FaTasks className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(candidate._id);
                        setFormData(candidate);
                        setShowModal(true);
                      }}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <FaEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(candidate._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Candidate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Candidate' : 'New Candidate'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.candidateName}
                  onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
                <input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {loading ? <FaSpinner className="animate-spin inline mr-1" /> : null}
                  {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showTaskModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Task</h2>
              <p className="text-xs text-gray-500 mt-0.5">For {selectedCandidate.candidateName}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Name *</label>
                <input
                  type="text"
                  value={taskForm.name}
                  onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Document Verification"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Task details..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddTask} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                  Add Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Candidate Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedCandidate.candidateName}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedCandidate.email}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedCandidate.phone}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Position</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedCandidate.position}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedCandidate.department}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Joining Date</p>
                  <p className="text-sm font-semibold text-gray-900">{format(new Date(selectedCandidate.joiningDate), 'PPP')}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedCandidate.status)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Progress</p>
                  <p className="text-lg font-semibold text-indigo-600">{Math.round(selectedCandidate.progress)}%</p>
                </div>
              </div>

              {/* Tasks */}
              {selectedCandidate.tasks && selectedCandidate.tasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaTasks className="text-indigo-600" /> Onboarding Tasks
                  </h3>
                  <div className="space-y-2">
                    {displayedTasks.map(task => (
                      <div key={task._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTaskCompletion(selectedCandidate._id, task._id, task.completed)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {task.name}
                          </p>
                          {task.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                          )}
                          {task.dueDate && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <FaCalendarAlt className="w-3 h-3" /> Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                            </p>
                          )}
                        </div>
                        {task.completed && (
                          <FaCheckCircle className="text-emerald-500 w-4 h-4" />
                        )}
                      </div>
                    ))}
                  </div>
                  {selectedCandidate.tasks.length > 4 && (
                    <button
                      onClick={() => setShowAllTasks(!showAllTasks)}
                      className="w-full mt-3 py-2 text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      {showAllTasks ? (
                        <>Show Less <FaChevronUp className="text-xs" /></>
                      ) : (
                        <>Show All ({selectedCandidate.tasks.length}) <FaChevronDown className="text-xs" /></>
                      )}
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Close
                </button>
                <button
                  onClick={() => sendOfferLetter(selectedCandidate._id)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <FaPaperPlane className="text-xs" /> Send Offer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HROnboarding;