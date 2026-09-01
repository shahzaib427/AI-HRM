import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import {
  FaUserPlus, FaCheckCircle, FaClock, FaTimesCircle,
  FaEnvelope, FaPhone, FaCalendarAlt, FaBriefcase,
  FaBuilding, FaTasks, FaSpinner, FaChevronDown, FaChevronUp,
  FaUserCheck, FaChartLine, FaClipboardList, FaRocket
} from 'react-icons/fa';
import { format } from 'date-fns';

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
    rose: 'bg-rose-500', cyan: 'bg-cyan-500', orange: 'bg-orange-500'
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

const MyOnboarding = () => {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [togglingTaskId, setTogglingTaskId] = useState(null);
  const [error, setError] = useState('');

  const fetchMyOnboarding = async () => {
    setLoading(true);
    setError('');
    try {
      // ✅ Updated: Use axiosInstance with /onboarding prefix
      const response = await axiosInstance.get('/onboarding/my-onboarding');
      setCandidate(response.data.data);
    } catch (error) {
      console.error('Error fetching my onboarding record:', error);
      setError(error.response?.data?.error || 'Failed to load onboarding data');
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
    fetchMyOnboarding();
  }, []);

  const toggleTaskCompletion = async (taskId, completed) => {
    setTogglingTaskId(taskId);
    setError('');
    try {
      // ✅ Updated: Use axiosInstance with /onboarding prefix
      await axiosInstance.patch(`/onboarding/my-onboarding/tasks/${taskId}`,
        { completed: !completed }
      );
      fetchMyOnboarding();
    } catch (error) {
      console.error('Error updating task:', error);
      setError(error.response?.data?.error || 'Failed to update task');
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    } finally {
      setTogglingTaskId(null);
    }
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

  const getTaskStatusIcon = (completed, isToggling) => {
    if (isToggling) {
      return <FaSpinner className="animate-spin text-indigo-400 w-4 h-4" />;
    }
    if (completed) {
      return <FaCheckCircle className="text-emerald-500 w-4 h-4" />;
    }
    return <FaClock className="text-gray-400 w-4 h-4" />;
  };

  const completedTasks = candidate?.tasks?.filter(t => t.completed).length || 0;
  const totalTasks = candidate?.tasks?.length || 0;
  const progress = candidate?.progress || 0;

  const displayedTasks = showAllTasks
    ? candidate?.tasks
    : candidate?.tasks?.slice(0, 4);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your onboarding record...</p>
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
                <FaUserPlus className="text-indigo-600" /> My Onboarding
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Welcome to your onboarding journey, {candidate?.candidateName || 'Employee'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaRocket className="w-5 h-5" />
              <span className="text-sm">Onboarding Portal</span>
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

        {!candidate ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FaUserPlus className="text-gray-400 text-2xl" />
            </div>
            <p className="text-gray-500 font-medium mb-2">No onboarding record found</p>
            <p className="text-gray-400 text-sm">Your HR team hasn't set up an onboarding checklist for you yet</p>
          </div>
        ) : (
          <>
            {/* KPI Cards - Matching Payroll style */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <KpiCard 
                title="Progress" 
                value={`${Math.round(progress)}%`} 
                icon={<FaChartLine className="w-6 h-6 text-white" />} 
                color="blue"
                subtitle={`${completedTasks} of ${totalTasks} tasks done`}
              />
              <KpiCard 
                title="Status" 
                value={candidate.status?.replace('-', ' ') || 'Pending'} 
                icon={<FaUserCheck className="w-6 h-6 text-white" />} 
                color={candidate.status === 'completed' ? 'emerald' : candidate.status === 'rejected' ? 'rose' : 'yellow'}
                subtitle="Current onboarding state"
              />
              <KpiCard 
                title="Tasks" 
                value={totalTasks} 
                icon={<FaTasks className="w-6 h-6 text-white" />} 
                color="purple"
                subtitle={`${completedTasks} completed`}
              />
              <KpiCard 
                title="Joining Date" 
                value={format(new Date(candidate.joiningDate), 'MMM dd')} 
                icon={<FaCalendarAlt className="w-6 h-6 text-white" />} 
                color="orange"
                subtitle={format(new Date(candidate.joiningDate), 'yyyy')}
              />
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <FaUserPlus className="w-4 h-4 text-indigo-500" /> Candidate Profile
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Your onboarding information</p>
                  </div>
                  <div>{getStatusBadge(candidate.status)}</div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaEnvelope className="text-indigo-600 w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-800">{candidate.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaPhone className="text-green-600 w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-800">{candidate.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaBriefcase className="text-purple-600 w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Position</p>
                      <p className="text-sm font-medium text-gray-800">{candidate.position}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaBuilding className="text-blue-600 w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Department</p>
                      <p className="text-sm font-medium text-gray-800">{candidate.department}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaCalendarAlt className="text-amber-600 w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Joining Date</p>
                      <p className="text-sm font-medium text-gray-800">{format(new Date(candidate.joiningDate), 'MMMM dd, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaClock className="text-emerald-600 w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Days Until Joining</p>
                      <p className="text-sm font-medium text-gray-800">
                        {Math.max(0, Math.ceil((new Date(candidate.joiningDate) - new Date()) / (1000 * 60 * 60 * 24)))} days
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks Section - Matching Payroll style */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <FaClipboardList className="w-4 h-4 text-indigo-500" /> Onboarding Tasks
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {completedTasks} of {totalTasks} tasks completed
                    </p>
                  </div>
                  {totalTasks > 4 && (
                    <button
                      onClick={() => setShowAllTasks(!showAllTasks)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded-lg transition-colors"
                    >
                      {showAllTasks ? (
                        <>Show Less <FaChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>Show All ({totalTasks}) <FaChevronDown className="w-3 h-3" /></>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="p-4">
                {candidate.tasks && candidate.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {displayedTasks.map(task => (
                      <div 
                        key={task._id} 
                        className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                          task.completed ? 'bg-green-50/50 border border-green-100' : 'bg-gray-50 border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            disabled={togglingTaskId === task._id}
                            onChange={() => toggleTaskCompletion(task._id, task.completed)}
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {task.name}
                              </p>
                              {task.completed && (
                                <Badge variant="success">Done</Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className={`text-xs mt-0.5 ${task.completed ? 'text-gray-400' : 'text-gray-500'}`}>
                                {task.description}
                              </p>
                            )}
                            {task.dueDate && (
                              <p className={`text-xs mt-1 flex items-center gap-1.5 ${task.completed ? 'text-gray-400' : 'text-gray-400'}`}>
                                <FaCalendarAlt className="w-3 h-3" /> 
                                Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {getTaskStatusIcon(task.completed, togglingTaskId === task._id)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FaClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No tasks have been assigned yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Help Section - Matching Payroll style */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FaRocket className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 mb-1">Need Help with Your Onboarding?</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  For onboarding assistance, document submission, or general queries, contact our HR team at <span className="text-indigo-600 font-medium">hr@company.com</span>
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyOnboarding;