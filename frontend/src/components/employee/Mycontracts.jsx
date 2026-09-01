import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import {
  FaFileContract, FaEye, FaSignature, FaSearch,
  FaCalendarAlt, FaMoneyBill, FaUserTie, FaCheckCircle,
  FaTimesCircle, FaClock, FaBuilding, FaSpinner, FaTimes,
  FaBan, FaSync, FaIdBadge, FaUserCheck, FaUsers
} from 'react-icons/fa';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

// Badge Component - Matching Payroll style
const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

// KpiCard Component - Matching Payroll style
const KpiCard = ({ title, value, icon, color, subtitle }) => {
  const colors = {
    blue: 'bg-blue-500', green: 'bg-green-500', yellow: 'bg-yellow-500',
    purple: 'bg-purple-500', indigo: 'bg-indigo-500', emerald: 'bg-emerald-500',
    rose: 'bg-rose-500', cyan: 'bg-cyan-500'
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const MyContracts = () => {
  const { currentUser } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [signatureData, setSignatureData] = useState({ name: '', date: '' });
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchMyContracts = async () => {
    setLoading(true);
    setError('');
    try {
      // ✅ Updated: Use axiosInstance with /contracts prefix
      const response = await axiosInstance.get('/contracts/my-contracts');
      setContracts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching my contracts:', error);
      setError(error.response?.data?.error || 'Failed to load contracts');
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyContracts();
  }, []);

  const handleSign = async () => {
    if (!signatureData.name) {
      setError('Please enter your name to sign');
      return;
    }
    setSigning(true);
    setError('');
    try {
      // ✅ Updated: Use axiosInstance with /contracts prefix
      await axiosInstance.patch(`/contracts/${selectedContract._id}/sign`,
        {
          role: 'employee',
          signature: signatureData.name,
          signedDate: signatureData.date || new Date().toISOString()
        }
      );
      setShowSignatureModal(false);
      setSignatureData({ name: '', date: '' });
      fetchMyContracts();
    } catch (error) {
      console.error('Error signing contract:', error);
      setError(error.response?.data?.error || 'Failed to sign contract');
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    } finally {
      setSigning(false);
    }
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

  const needsMySignature = (contract) =>
    !contract.signedByEmployee &&
    ['draft', 'pending'].includes(contract.status);

  const getFilteredContracts = () => {
    return contracts.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        c.contractNumber?.toLowerCase().includes(term) ||
        c.position?.toLowerCase().includes(term) ||
        c.department?.toLowerCase().includes(term)
      );
    });
  };

  const filteredContracts = getFilteredContracts();

  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const pendingSignatures = contracts.filter(c => needsMySignature(c)).length;
  const signedByEmployee = contracts.filter(c => c.signedByEmployee).length;
  const hasPendingAction = contracts.some(c => needsMySignature(c));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your contracts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Matching Payroll style */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaFileContract className="text-indigo-600" /> My Contracts
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Welcome back, {currentUser?.name || currentUser?.firstName || 'Employee'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaUserTie className="w-5 h-5" />
              <span className="text-sm">Contract Portal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            <FaTimesCircle className="text-red-500 flex-shrink-0 w-5 h-5" />
            <span className="text-red-700 flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* KPI Cards - Matching Payroll style */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <KpiCard 
            title="Total Contracts" 
            value={totalContracts} 
            icon={<FaFileContract className="w-6 h-6 text-white" />} 
            color="blue"
            subtitle="All time"
          />
          <KpiCard 
            title="Active Contracts" 
            value={activeContracts} 
            icon={<FaCheckCircle className="w-6 h-6 text-white" />} 
            color="emerald"
            subtitle="Currently active"
          />
          <KpiCard 
            title="Pending Signature" 
            value={pendingSignatures} 
            icon={<FaSignature className="w-6 h-6 text-white" />} 
            color="yellow"
            subtitle={hasPendingAction ? 'Action required' : 'All signed'}
          />
          <KpiCard 
            title="Signed Contracts" 
            value={signedByEmployee} 
            icon={<FaUserCheck className="w-6 h-6 text-white" />} 
            color="purple"
            subtitle={`${totalContracts > 0 ? Math.round((signedByEmployee / totalContracts) * 100) : 0}% signed`}
          />
        </div>

        {/* Contracts List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header with Search and Filters - Matching Payroll style */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <FaUsers className="w-4 h-4 text-indigo-500" /> My Contract History
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">View and sign your employment contracts</p>
              </div>
              <button 
                onClick={fetchMyContracts} 
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <FaSync className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          </div>

          {/* Filters - Matching Payroll style */}
          <div className="p-4 border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search contracts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                />
              </div>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)} 
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>
              <button 
                onClick={() => { setStatusFilter('all'); setSearchTerm(''); }} 
                className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <FaTimes className="w-3 h-3" /> Reset Filters
              </button>
            </div>
          </div>

          {/* Table - Matching Payroll style */}
          <div className="overflow-x-auto">
            {filteredContracts.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <FaFileContract className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No contracts found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contract</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Salary</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Signatures</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredContracts.map((contract) => (
                    <tr key={contract._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-gray-800">{contract.contractNumber}</div>
                        <div className="text-xs text-gray-400">
                          {format(new Date(contract.startDate), 'MMM dd, yyyy')}
                          {contract.endDate && ` - ${format(new Date(contract.endDate), 'MMM dd, yyyy')}`}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-800">{contract.position}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-600 flex items-center gap-1.5">
                          <FaBuilding className="text-indigo-400 w-3.5 h-3.5" />
                          {contract.department}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-indigo-600">
                          {contract.currency} {contract.salary?.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">/ month</div>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(contract.status)}
                        {needsMySignature(contract) && (
                          <span className="ml-1.5 inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Needs your signature" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 text-xs">
                          <span className={`flex items-center gap-1 ${contract.signedByEmployee ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {contract.signedByEmployee ? <FaCheckCircle className="w-3 h-3" /> : <FaClock className="w-3 h-3" />}
                            Employee
                          </span>
                          <span className={`flex items-center gap-1 ${contract.signedByEmployer ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {contract.signedByEmployer ? <FaCheckCircle className="w-3 h-3" /> : <FaClock className="w-3 h-3" />}
                            Employer
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedContract(contract);
                              setShowDetailsModal(true);
                            }}
                            className="flex items-center gap-1 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded-lg transition-colors"
                            title="View Details"
                          >
                            <FaEye className="w-3 h-3" /> View
                          </button>
                          {needsMySignature(contract) && (
                            <button
                              onClick={() => {
                                setSelectedContract(contract);
                                setSignatureData({ name: currentUser?.name || '', date: '' });
                                setShowSignatureModal(true);
                              }}
                              className="flex items-center gap-1 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-medium rounded-lg transition-colors"
                              title="Sign Contract"
                            >
                              <FaSignature className="w-3 h-3" /> Sign
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Help Section - Matching Payroll style */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FaUserTie className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 mb-1">Need Help with Your Contract?</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              For contract queries, amendments, or renewal information, contact our HR team at <span className="text-indigo-600 font-medium">hr@company.com</span>
            </p>
          </div>
        </div>
      </div>

      {/* Details Modal - Matching Payroll style */}
      {showDetailsModal && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetailsModal(false)}>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Contract Details</h3>
                <p className="text-sm text-gray-500">{selectedContract.contractNumber}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <FaTimes className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Position</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedContract.position}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedContract.department}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedContract.status)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Salary</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedContract.currency} {selectedContract.salary?.toLocaleString()} <span className="text-xs font-normal text-gray-400">/ month</span></p>
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
                  <p className="text-xs text-gray-500">Notice Period</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedContract.noticePeriod || 30} days</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Signatures</p>
                  <div className="flex gap-3 mt-1 text-sm">
                    <span className={`flex items-center gap-1 ${selectedContract.signedByEmployee ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {selectedContract.signedByEmployee ? <FaCheckCircle className="w-3.5 h-3.5" /> : <FaClock className="w-3.5 h-3.5" />}
                      Employee
                    </span>
                    <span className={`flex items-center gap-1 ${selectedContract.signedByEmployer ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {selectedContract.signedByEmployer ? <FaCheckCircle className="w-3.5 h-3.5" /> : <FaClock className="w-3.5 h-3.5" />}
                      Employer
                    </span>
                  </div>
                </div>
              </div>
              {selectedContract.terms && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 font-medium mb-2">Terms & Conditions</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedContract.terms}</p>
                </div>
              )}
              {selectedContract.specialConditions && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 font-medium mb-2">Special Conditions</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedContract.specialConditions}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Close
              </button>
              {needsMySignature(selectedContract) && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSignatureData({ name: currentUser?.name || '', date: '' });
                    setShowSignatureModal(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <FaSignature className="w-4 h-4" /> Sign Contract
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal - Matching Payroll style */}
      {showSignatureModal && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowSignatureModal(false)}>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Sign Contract</h3>
                <p className="text-sm text-gray-500">{selectedContract.contractNumber}</p>
              </div>
              <button onClick={() => setShowSignatureModal(false)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <FaTimes className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-indigo-50 text-indigo-700 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
                <FaUserTie className="w-4 h-4" />
                You are signing this contract as the <strong>Employee</strong>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Full Name *</label>
                <input
                  type="text"
                  value={signatureData.name}
                  onChange={(e) => setSignatureData({ ...signatureData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={signatureData.date}
                  onChange={(e) => setSignatureData({ ...signatureData, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              {error && (
                <div className="text-red-600 text-xs flex items-center gap-1.5">
                  <FaTimesCircle className="w-3.5 h-3.5" /> {error}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowSignatureModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSign}
                disabled={signing}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {signing ? (
                  <>
                    <FaSpinner className="animate-spin w-4 h-4" /> Signing...
                  </>
                ) : (
                  <>
                    <FaSignature className="w-4 h-4" /> Sign Contract
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyContracts;