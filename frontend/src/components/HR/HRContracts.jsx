import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaFileContract, FaPlus, FaEdit, FaTrash, FaEye, 
  FaDownload, FaSignature, FaSync, FaSearch,
  FaCalendarAlt, FaMoneyBill, FaUserTie, FaCheckCircle,
  FaTimesCircle, FaClock, FaBuilding, FaSpinner, FaTimes,
  FaBriefcase, FaBan, FaPrint, FaChevronLeft, FaChevronRight,
  FaEnvelope, FaPhone, FaUsers, FaChartLine
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

const HRContracts = () => {
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    pending: 0
  });
  const [signatureData, setSignatureData] = useState({
    role: 'employer',
    name: '',
    date: ''
  });
  const [terminateData, setTerminateData] = useState({
    reason: '',
    effectiveDate: '',
    notes: ''
  });
  const [renewData, setRenewData] = useState({
    newEndDate: '',
    newSalary: '',
    reason: ''
  });
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    position: '',
    department: '',
    contractType: 'permanent',
    startDate: '',
    endDate: '',
    salary: '',
    currency: 'PKR',
    benefits: [],
    noticePeriod: 30,
    terms: '',
    specialConditions: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Fetch contracts
  const fetchContracts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/contracts`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          search: searchTerm, 
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page: currentPage,
          limit: 10
        }
      });
      setContracts(response.data.data);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees for dropdown
  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100, isActive: true }
      });
      setEmployees(response.data.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/contracts/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchContracts();
    fetchEmployees();
    fetchStats();
  }, [searchTerm, statusFilter, currentPage]);

  // Handle employee selection
  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find(emp => emp._id === employeeId);
    if (employee) {
      setFormData({
        ...formData,
        employeeId,
        employeeName: employee.name,
        position: employee.position,
        department: employee.department
      });
    }
  };

  // Create/Update contract
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const contractData = {
        ...formData,
        salary: parseFloat(formData.salary)
      };
      
      if (editingId) {
        await axios.put(`${API_URL}/contracts/${editingId}`, contractData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Contract updated successfully');
      } else {
        await axios.post(`${API_URL}/contracts`, contractData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Contract created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchContracts();
      fetchStats();
    } catch (error) {
      console.error('Error saving contract:', error);
      alert(error.response?.data?.error || 'Failed to save contract');
    } finally {
      setLoading(false);
    }
  };

  // Delete contract
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contract?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/contracts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Contract deleted successfully');
      fetchContracts();
      fetchStats();
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('Failed to delete contract');
    }
  };

  // Sign contract
  const handleSign = async () => {
    if (!signatureData.name) {
      alert('Please enter your name to sign');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/contracts/${selectedContract._id}/sign`, 
        { 
          role: signatureData.role,
          signature: signatureData.name,
          signedDate: signatureData.date || new Date().toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Contract signed successfully');
      setShowSignatureModal(false);
      fetchContracts();
      fetchStats();
    } catch (error) {
      console.error('Error signing contract:', error);
      alert('Failed to sign contract');
    }
  };

  // Terminate contract
  const handleTerminate = async () => {
    if (!terminateData.reason) {
      alert('Please provide a reason for termination');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/contracts/${selectedContract._id}/terminate`, terminateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Contract terminated successfully');
      setShowTerminateModal(false);
      fetchContracts();
      fetchStats();
    } catch (error) {
      console.error('Error terminating contract:', error);
      alert('Failed to terminate contract');
    }
  };

  // Renew contract
  const handleRenew = async () => {
    if (!renewData.newEndDate) {
      alert('Please enter new end date');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/contracts/${selectedContract._id}/renew`, renewData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Contract renewed successfully');
      setShowRenewModal(false);
      fetchContracts();
      fetchStats();
    } catch (error) {
      console.error('Error renewing contract:', error);
      alert('Failed to renew contract');
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      employeeName: '',
      position: '',
      department: '',
      contractType: 'permanent',
      startDate: '',
      endDate: '',
      salary: '',
      currency: 'PKR',
      benefits: [],
      noticePeriod: 30,
      terms: '',
      specialConditions: ''
    });
    setEditingId(null);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'draft': { variant: 'default', icon: <FaFileContract className="mr-1 text-xs" />, text: 'Draft' },
      'pending': { variant: 'warning', icon: <FaClock className="mr-1 text-xs" />, text: 'Pending' },
      'active': { variant: 'success', icon: <FaCheckCircle className="mr-1 text-xs" />, text: 'Active' },
      'expired': { variant: 'danger', icon: <FaTimesCircle className="mr-1 text-xs" />, text: 'Expired' },
      'terminated': { variant: 'danger', icon: <FaBan className="mr-1 text-xs" />, text: 'Terminated' },
      'renewed': { variant: 'info', icon: <FaSync className="mr-1 text-xs" />, text: 'Renewed' }
    };
    const badge = badges[status] || badges.draft;
    return <Badge variant={badge.variant}>{badge.icon} {badge.text}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaFileContract className="text-indigo-600" /> Employment Contracts
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage employee contracts and agreements</p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaFileContract className="w-5 h-5" />
              <span className="text-sm">Contracts Portal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <KpiCard icon={FaFileContract} label="Total Contracts" value={stats.total} iconBg="bg-indigo-500" />
          <KpiCard icon={FaCheckCircle} label="Active" value={stats.active} iconBg="bg-emerald-500" />
          <KpiCard icon={FaClock} label="Pending" value={stats.pending} iconBg="bg-amber-500" />
          <KpiCard icon={FaTimesCircle} label="Expired" value={stats.expired} iconBg="bg-red-500" />
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by employee or contract number..."
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
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FaPlus className="text-xs" /> New Contract
            </button>
          </div>
        </div>

        {/* Contracts List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading contracts...</p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FaFileContract className="text-gray-400 text-2xl" />
            </div>
            <p className="text-gray-500 font-medium mb-2">No contracts found</p>
            <p className="text-gray-400 text-sm">Click "New Contract" to create your first contract</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div key={contract._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="text-base font-semibold text-gray-900">{contract.employeeName}</h3>
                      {getStatusBadge(contract.status)}
                      <span className="text-xs text-gray-400 font-mono">{contract.contractNumber}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaUserTie className="text-indigo-400 w-4 h-4" />
                        <span>{contract.position}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaBuilding className="text-indigo-400 w-4 h-4" />
                        <span>{contract.department}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaCalendarAlt className="text-indigo-400 w-4 h-4" />
                        <span>Start: {format(new Date(contract.startDate), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FaMoneyBill className="text-emerald-500 w-4 h-4" />
                        <span>{contract.currency} {contract.salary?.toLocaleString()}</span>
                      </div>
                    </div>
                    {contract.endDate && (
                      <div className="mt-2 text-xs text-gray-400">
                        End date: {format(new Date(contract.endDate), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedContract(contract);
                        setShowDetailsModal(true);
                      }}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <FaEye className="w-4 h-4" />
                    </button>
                    {(contract.status === 'draft' || contract.status === 'pending') && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowSignatureModal(true);
                          }}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Sign"
                        >
                          <FaSignature className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(contract._id);
                            setFormData(contract);
                            setShowModal(true);
                          }}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {contract.status === 'active' && (
                      <button
                        onClick={() => {
                          setSelectedContract(contract);
                          setShowRenewModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Renew"
                      >
                        <FaSync className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(contract._id)}
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

      {/* Add/Edit Contract Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Contract' : 'New Contract'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee *</label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name} - {emp.position}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                  <select
                    value={formData.contractType}
                    onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="permanent">Permanent</option>
                    <option value="contractual">Contractual</option>
                    <option value="probationary">Probationary</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  rows="4"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter contract terms..."
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

      {/* Details Modal */}
      {showDetailsModal && selectedContract && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Contract Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Contract Number</p>
                  <p className="text-sm font-semibold text-gray-900 font-mono">{selectedContract.contractNumber}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedContract.status)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Employee</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedContract.employeeName}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Position</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedContract.position}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Start Date</p>
                  <p className="text-sm font-semibold text-gray-900">{format(new Date(selectedContract.startDate), 'PPP')}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">End Date</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedContract.endDate ? format(new Date(selectedContract.endDate), 'PPP') : 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Salary</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedContract.currency} {selectedContract.salary?.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedContract.department}</p>
                </div>
              </div>
              {selectedContract.terms && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 font-medium mb-2">Terms & Conditions</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedContract.terms}</p>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Close
                </button>
                {selectedContract.status === 'pending' && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowSignatureModal(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    <FaSignature className="inline mr-1 text-xs" /> Sign Contract
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && selectedContract && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Sign Contract</h2>
              <p className="text-xs text-gray-500 mt-0.5">{selectedContract.contractNumber}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                <input
                  type="text"
                  value={signatureData.name}
                  onChange={(e) => setSignatureData({ ...signatureData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={signatureData.date}
                  onChange={(e) => setSignatureData({ ...signatureData, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => setShowSignatureModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSign} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                  Sign Contract
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {showRenewModal && selectedContract && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Renew Contract</h2>
              <p className="text-xs text-gray-500 mt-0.5">{selectedContract.employeeName}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New End Date *</label>
                <input
                  type="date"
                  value={renewData.newEndDate}
                  onChange={(e) => setRenewData({ ...renewData, newEndDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Salary (Optional)</label>
                <input
                  type="number"
                  value={renewData.newSalary}
                  onChange={(e) => setRenewData({ ...renewData, newSalary: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Leave empty to keep current"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Renewal</label>
                <textarea
                  value={renewData.reason}
                  onChange={(e) => setRenewData({ ...renewData, reason: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter reason for renewal..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => setShowRenewModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleRenew} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                  Renew Contract
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRContracts;