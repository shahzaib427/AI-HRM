import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Send as SendIcon, AttachFile as AttachFileIcon, Delete as DeleteIcon,
  Person as PersonIcon, DoneAll as DoneAllIcon, History as HistoryIcon,
  Drafts as DraftsIcon, SmartToy as SmartToyIcon, AutoFixHigh as AutoFixHighIcon,
  Psychology as PsychologyIcon, FileCopy as FileCopyIcon,
  DriveFileRenameOutline as TemplateIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { FaEnvelope, FaUsers, FaClock, FaCheckCircle, FaUserPlus, FaChartLine } from 'react-icons/fa';

// ─── UI Primitives ────────────────────────────────────────────────────────────

const Badge = ({ children, variant = 'default' }) => {
  const v = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    danger:  'bg-red-50 text-red-700',
    info:    'bg-gray-100 text-gray-700',
    low:     'bg-green-50 text-green-700',
    normal:  'bg-gray-100 text-gray-700',
    high:    'bg-yellow-50 text-yellow-700',
    urgent:  'bg-red-50 text-red-700',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v[variant] || v.default}`}>{children}</span>;
};

const AvatarInitials = ({ name = 'U' }) => {
  return <div className={`w-9 h-9 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0`}>{name.charAt(0).toUpperCase()}</div>;
};

// KPI Card Component
const KpiCard = ({ icon: Icon, label, value, sub, iconBg }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

const StepDot = ({ label, index, active, completed }) => (
  <div className="flex items-center gap-2">
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${completed ? 'bg-gray-900 text-white' : active ? 'bg-gray-100 text-gray-900 ring-2 ring-gray-900' : 'bg-gray-100 text-gray-400'}`}>
      {completed ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : index + 1}
    </div>
    <span className={`text-sm hidden sm:block ${active ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{label}</span>
  </div>
);

const FormLabel = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const inputCls = (err) => `w-full text-sm border ${err ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-gray-200 focus:border-gray-400'} rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 bg-white text-gray-800 placeholder-gray-400 transition-colors`;

// ─── Static data ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'leave', label: 'Leave Request' },
  { value: 'payroll', label: 'Payroll Issue' },
  { value: 'benefits', label: 'Benefits Question' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'appreciation', label: 'Appreciation' },
  { value: 'document', label: 'Document Submission' },
  { value: 'meeting', label: 'Meeting Request' },
  { value: 'training', label: 'Training Request' },
  { value: 'feedback', label: 'Feedback' },
];

const PRIORITIES = [
  { value: 'low',    label: 'Low',    variant: 'low' },
  { value: 'normal', label: 'Normal', variant: 'normal' },
  { value: 'high',   label: 'High',   variant: 'high' },
  { value: 'urgent', label: 'Urgent', variant: 'urgent' },
];

const DEFAULT_TEMPLATES = [
  { id: 1, name: 'Leave Request', subject: 'Leave Request - [Your Name]',
    message: 'Dear HR,\n\nI would like to request leave from [Start Date] to [End Date].\n\nType: [Vacation/Sick Leave/Personal]\nReason: [Your Reason]\n\nThank you,\n[Your Name]',
    category: 'leave', usageCount: 156, lastUsed: '2024-01-15' },
  { id: 2, name: 'Technical Support', subject: 'Technical Issue: [Brief Description]',
    message: 'Dear IT Support,\n\nI am experiencing an issue with [Software/Hardware].\n\nDetails: [Describe the issue]\nError Message: [If applicable]\n\nThank you for your assistance.',
    category: 'technical', usageCount: 89, lastUsed: '2024-01-20' },
  { id: 3, name: 'Document Submission', subject: 'Document Submission: [Document Name]',
    message: 'Dear HR,\n\nPlease find attached the requested document: [Document Name].\n\nDocument Details: [Additional information]\n\nBest regards,\n[Your Name]',
    category: 'document', usageCount: 203, lastUsed: '2024-01-18' },
];

const STEPS = ['Recipient', 'Details', 'Message', 'Review'];
const API_URL = 'http://localhost:5000';

// ─── Success Dialog ───────────────────────────────────────────────────────────

const SuccessDialog = ({ open, message, onViewMessages, onSendAnother }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <DoneAllIcon className="text-green-600" style={{ fontSize: 28 }} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Message Sent!</h3>
        <p className="text-gray-500 text-sm mb-5">Your message has been delivered securely.</p>

        {message && (
          <div className="bg-gray-50 rounded-lg p-4 mb-5 text-left text-sm space-y-2">
            {[['Recipient', message.recipient], ['Subject', message.subject], ['Sent on', `${message.date} at ${message.time}`], ['Reference', message.reference]].map(([k, v]) => v && (
              <div key={k} className="flex justify-between gap-3">
                <span className="text-gray-400">{k}</span>
                <span className="font-medium text-gray-700 text-right truncate max-w-[200px]">{v}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onViewMessages} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <HistoryIcon style={{ fontSize: 16 }} /> View Messages
          </button>
          <button onClick={onSendAnother} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors">
            <SendIcon style={{ fontSize: 16 }} /> Send Another
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const EMPTY_FORM = {
  recipientType: 'individual',
  recipient: '',
  recipientId: '',
  subject: '',
  message: '',
  category: 'general',
  priority: 'normal',
  attachments: [],
  templateId: '',
  ccRecipients: [],
  bccRecipients: [],
  confidential: false,
  readReceipt: false,
  urgent: false,
  followUp: false,
  tags: [],
};

const AdminComposeMessage = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastSentMessage, setLastSentMessage] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activeTab, setActiveTab] = useState('compose');
  const [characterCount, setCharacterCount] = useState(0);
  const [saveAsDraftConfirm, setSaveAsDraftConfirm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [stats, setStats] = useState({
    totalEmployees: 0,
    draftsCount: 0,
    templatesCount: 0,
    recentMessages: 0
  });

  // Fetch current user
  const fetchCurrentUser = useCallback(async () => {
    setUserLoading(true);
    try {
      let userData = null;
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) userData = JSON.parse(storedUser);

      const token = localStorage.getItem('token');
      if (token && (!userData || !userData._id)) {
        const endpoints = [`${API_URL}/api/auth/me`, `${API_URL}/api/users/me`, `${API_URL}/api/employee/profile`, `${API_URL}/api/profile`];
        for (const endpoint of endpoints) {
          try {
            const response = await axios.get(endpoint, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 2000 });
            if (response.data) {
              userData = response.data.user || response.data.data || response.data;
              localStorage.setItem('currentUser', JSON.stringify(userData));
              break;
            }
          } catch { /* try next */ }
        }
      }

      if (!userData) {
        userData = {
          _id: `user-${Date.now()}`,
          name: 'Admin',
          email: 'admin@company.com',
          role: 'admin',
          department: 'Administration',
          employeeId: `ADMIN${String(Date.now()).slice(-6)}`,
          position: 'Administrator',
          joinDate: new Date().toISOString().split('T')[0]
        };
        localStorage.setItem('currentUser', JSON.stringify(userData));
      }

      const formattedUser = {
        _id: userData._id || userData.id || `user-${Date.now()}`,
        name: userData.name || userData.fullName || 'Admin',
        email: userData.email || 'admin@company.com',
        role: userData.role || 'admin',
        department: userData.department || 'Administration',
        employeeId: userData.employeeId || `ADMIN${String(Date.now()).slice(-6)}`,
        position: userData.position || userData.jobTitle || 'Administrator',
        avatar: userData.avatar || userData.profilePicture || null,
        joinDate: userData.joinDate || new Date().toISOString().split('T')[0],
        phone: userData.phone || 'N/A',
        location: userData.location || 'Head Office',
      };

      setUser(formattedUser);
      localStorage.setItem('currentUser', JSON.stringify(formattedUser));
    } catch {
      const fallback = {
        _id: 'fallback-user',
        name: 'Admin',
        email: 'admin@company.com',
        role: 'admin',
        department: 'Administration',
        employeeId: 'ADMIN001',
        position: 'Administrator',
        joinDate: '2024-01-01'
      };
      setUser(fallback);
      localStorage.setItem('currentUser', JSON.stringify(fallback));
    } finally {
      setUserLoading(false);
    }
  }, []);

  // Fetch all users (employees)
  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        const mockUsers = [
          { _id: 'emp-001', name: 'John Doe', email: 'john.doe@company.com', role: 'employee', department: 'IT', employeeId: 'EMP001' },
          { _id: 'emp-002', name: 'Jane Smith', email: 'jane.smith@company.com', role: 'employee', department: 'HR', employeeId: 'EMP002' },
          { _id: 'emp-003', name: 'Mike Johnson', email: 'mike.johnson@company.com', role: 'employee', department: 'Finance', employeeId: 'EMP003' },
        ];
        setAllUsers(mockUsers);
        setStats(prev => ({ ...prev, totalEmployees: mockUsers.length }));
        return;
      }
      const response = await axios.get(`${API_URL}/api/messages/users/list`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });
      if (response.data.success && response.data.data) {
        setAllUsers(response.data.data);
        setStats(prev => ({ ...prev, totalEmployees: response.data.data.length }));
      } else {
        setAllUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setAllUsers([]);
    }
  };

  const loadDrafts = () => {
    try {
      const saved = localStorage.getItem('adminMessageDrafts');
      if (saved) {
        const parsed = JSON.parse(saved);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const recent = parsed.filter(d => new Date(d.updatedAt) > cutoff);
        setDrafts(recent);
        setStats(prev => ({ ...prev, draftsCount: recent.length }));
        localStorage.setItem('adminMessageDrafts', JSON.stringify(recent));
      }
    } catch {
      setDrafts([]);
    }
  };

  const loadTemplates = () => {
    try {
      const saved = localStorage.getItem('adminMessageTemplates');
      const templatesData = saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
      setTemplates(templatesData);
      setStats(prev => ({ ...prev, templatesCount: templatesData.length }));
      if (!saved) localStorage.setItem('adminMessageTemplates', JSON.stringify(DEFAULT_TEMPLATES));
    } catch {
      setTemplates(DEFAULT_TEMPLATES);
      setStats(prev => ({ ...prev, templatesCount: DEFAULT_TEMPLATES.length }));
    }
  };

  const saveDraft = () => {
    try {
      if (!formData.subject.trim() && !formData.message.trim()) {
        toast.warning('No content to save');
        return;
      }
      const newDraft = {
        id: Date.now(),
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const updated = [newDraft, ...drafts.slice(0, 19)];
      setDrafts(updated);
      setStats(prev => ({ ...prev, draftsCount: updated.length }));
      localStorage.setItem('adminMessageDrafts', JSON.stringify(updated));
      toast.success('Draft saved');
    } catch {
      toast.error('Failed to save draft');
    }
  };

  const loadDraft = (draft) => {
    setFormData({ ...draft, attachments: draft.attachments || [] });
    setActiveStep(0);
    setActiveTab('compose');
    toast.success('Draft loaded');
  };

  const deleteDraft = (id) => {
    const updated = drafts.filter(d => d.id !== id);
    setDrafts(updated);
    setStats(prev => ({ ...prev, draftsCount: updated.length }));
    localStorage.setItem('adminMessageDrafts', JSON.stringify(updated));
    toast.success('Draft deleted');
  };

  const applyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      subject: template.subject,
      message: template.message,
      category: template.category
    }));
    setActiveTab('compose');
    toast.success(`"${template.name}" applied`);
    const updated = templates.map(t =>
      t.id === template.id
        ? { ...t, usageCount: (t.usageCount || 0) + 1, lastUsed: new Date().toISOString() }
        : t
    );
    setTemplates(updated);
    localStorage.setItem('adminMessageTemplates', JSON.stringify(updated));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }
    if (name === 'recipientType') {
      setFormData(prev => ({ ...prev, recipientType: value, recipient: '', recipientId: '' }));
      return;
    }
    if (name === 'recipientId') {
      const opt = getRecipientOptions().find(o => o.value === value);
      setFormData(prev => ({ ...prev, recipient: opt?.label || '', recipientId: value }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const oversized = files.filter(f => f.size > 10 * 1024 * 1024);
    if (oversized.length) {
      toast.error(`Files exceed 10MB: ${oversized.map(f => f.name).join(', ')}`);
      return;
    }
    const attachments = files.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2),
      type: file.type.split('/')[1]?.toUpperCase() || 'FILE',
      uploadedAt: new Date().toISOString(),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...attachments] }));
    toast.success(`${files.length} file(s) added`);
  };

  const removeAttachment = (id) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(item => {
        if (item.id === id && item.preview) URL.revokeObjectURL(item.preview);
        return item.id !== id;
      })
    }));
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.subject.trim()) errs.subject = 'Subject is required';
    if (!formData.message.trim()) errs.message = 'Message is required';
    if (formData.message.length < 10) errs.message = 'Message too short (min 10 characters)';
    if (!formData.recipientId) errs.recipientId = 'Please select a recipient';
    if (!formData.category) errs.category = 'Please select a category';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0 ? null : 'Please fix the errors above';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      toast.error(err);
      setError(err);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const messageData = {
        recipientId: formData.recipientId,
        subject: formData.subject,
        message: formData.message,
        category: formData.category || 'general',
        priority: formData.priority || 'normal',
        recipientType: 'individual'
      };

      const response = await axios.post(`${API_URL}/api/messages/send`, messageData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      });

      toast.success('Message sent!');
      if (response.data.success) {
        setLastSentMessage({
          recipient: formData.recipient,
          subject: formData.subject,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          reference: response.data.data?.id || `MSG-${Date.now()}`
        });
        setShowSuccessDialog(true);
        setFormData(EMPTY_FORM);
        setStats(prev => ({ ...prev, recentMessages: prev.recentMessages + 1 }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to send message';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const getRecipientOptions = () => allUsers.map(user => ({
    value: user._id,
    label: user.name,
    subtext: `${user.department || 'N/A'} · ${user.role?.toUpperCase() || 'EMPLOYEE'}`,
    email: user.email,
  }));

  const handleNextStep = () => {
    if (activeStep === 0 && !formData.recipientId) {
      toast.error('Please select a recipient');
      return;
    }
    if (activeStep === 1 && !formData.category) {
      toast.error('Please select a category');
      return;
    }
    setActiveStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => setActiveStep(prev => Math.max(prev - 1, 0));

  useEffect(() => {
    fetchCurrentUser();
    fetchAllUsers();
    loadDrafts();
    loadTemplates();
    return () => formData.attachments.forEach(item => {
      if (item.preview) URL.revokeObjectURL(item.preview);
    });
  }, []);

  useEffect(() => {
    setCharacterCount(formData.message.length);
  }, [formData.message]);

  useEffect(() => {
    if ((formData.subject || formData.message) && !loading) {
      const timer = setTimeout(() => {
        if (formData.subject || formData.message) saveDraft();
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [formData.subject, formData.message]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Loading your profile…</p>
        </div>
      </div>
    );
  }

  const recipientOptions = getRecipientOptions();

  const TABS = [
    { id: 'compose',   icon: SendIcon,      label: 'Compose' },
    { id: 'templates', icon: TemplateIcon,  label: 'Templates' },
    { id: 'drafts',    icon: DraftsIcon,    label: `Drafts${drafts.length ? ` (${drafts.length})` : ''}` },
    { id: 'ai',        icon: SmartToyIcon,  label: 'AI Assistant' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <SendIcon className="text-gray-600 text-sm" />
                Admin Compose Message
              </h1>
              <p className="text-sm text-gray-500 mt-1">Send secure messages to employees</p>
            </div>
            {user && (
              <div className="flex items-center gap-2">
                <AvatarInitials name={user.name} />
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-700">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.employeeId}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={FaUsers} label="Total Employees" value={stats.totalEmployees} sub="Available recipients" iconBg="bg-indigo-500" />
          <KpiCard icon={DraftsIcon} label="Saved Drafts" value={stats.draftsCount} sub="Continue later" iconBg="bg-amber-500" />
          <KpiCard icon={TemplateIcon} label="Templates" value={stats.templatesCount} sub="Ready to use" iconBg="bg-emerald-500" />
          <KpiCard icon={FaCheckCircle} label="Messages Sent" value={stats.recentMessages} sub="This session" iconBg="bg-purple-500" />
        </div>

        {/* Tab Bar */}
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <tab.icon style={{ fontSize: 15 }} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Compose Tab */}
          {activeTab === 'compose' && (
            <div className="p-5">
              {/* Step Progress */}
              <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-1">
                {STEPS.map((label, i) => (
                  <React.Fragment key={label}>
                    <StepDot label={label} index={i} active={i === activeStep} completed={i < activeStep} />
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-px min-w-[20px] ${i < activeStep ? 'bg-gray-900' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Error Banner */}
              {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4 text-sm">
                  <span className="text-red-600 flex-1">{error}</span>
                  <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Step 0: Recipient */}
                {activeStep === 0 && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Select who to message</p>
                    <div>
                      <FormLabel required>Select Employee</FormLabel>
                      <select
                        name="recipientId"
                        value={formData.recipientId}
                        onChange={handleChange}
                        className={inputCls(fieldErrors.recipientId)}
                        disabled={recipientOptions.length === 0}
                      >
                        <option value="">Choose an employee…</option>
                        {recipientOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} — {opt.subtext}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.recipientId && <p className="text-xs text-red-500 mt-1">{fieldErrors.recipientId}</p>}
                    </div>

                    {/* Employee Cards */}
                    {recipientOptions.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {recipientOptions.slice(0, 6).map(opt => (
                          <button
                            type="button"
                            key={opt.value}
                            onClick={() => setFormData(prev => ({ ...prev, recipient: opt.label, recipientId: opt.value }))}
                            className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${formData.recipientId === opt.value ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                          >
                            <AvatarInitials name={opt.label} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{opt.label}</p>
                              <p className="text-xs text-gray-400 truncate">{opt.subtext}</p>
                            </div>
                            {formData.recipientId === opt.value && (
                              <div className="ml-auto w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 1: Details */}
                {activeStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Categorize your message</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <FormLabel required>Category</FormLabel>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className={inputCls(fieldErrors.category)}
                        >
                          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <FormLabel>Priority</FormLabel>
                        <div className="flex gap-2 flex-wrap">
                          {PRIORITIES.map(p => (
                            <button
                              type="button"
                              key={p.value}
                              onClick={() => setFormData(prev => ({ ...prev, priority: p.value }))}
                              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${formData.priority === p.value ? 'border-gray-900 bg-gray-50 text-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <FormLabel required>Subject</FormLabel>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Brief, descriptive subject line"
                        className={inputCls(fieldErrors.subject)}
                      />
                      {fieldErrors.subject && <p className="text-xs text-red-500 mt-1">{fieldErrors.subject}</p>}
                    </div>

                    {/* Options */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">Message options</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[['confidential', 'Confidential'], ['readReceipt', 'Read Receipt'], ['urgent', 'Urgent'], ['followUp', 'Follow-up']].map(([field, label]) => (
                          <label
                            key={field}
                            className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${formData[field] ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}
                          >
                            <input
                              type="checkbox"
                              name={field}
                              checked={formData[field]}
                              onChange={handleChange}
                              className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                            />
                            <span className="text-xs font-medium text-gray-700">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Message */}
                {activeStep === 2 && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Write your message</p>
                    <div>
                      <FormLabel required>Message body</FormLabel>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        rows={9}
                        placeholder={`Dear Employee,\n\nPlease type your message here...\n\nBest regards,\n${user?.name || 'Admin Team'}`}
                        className={`${inputCls(fieldErrors.message)} resize-none`}
                      />
                      <div className="flex justify-between mt-1.5">
                        {fieldErrors.message
                          ? <p className="text-xs text-red-500">{fieldErrors.message}</p>
                          : <span className="text-xs text-gray-400">{formData.message.split(/\s+/).filter(w => w.length > 0).length} words</span>
                        }
                        <span className={`text-xs ${characterCount < 10 ? 'text-red-400' : 'text-gray-400'}`}>{characterCount} chars</span>
                      </div>
                    </div>

                    {/* Attachments */}
                    <div>
                      <FormLabel>Attachments</FormLabel>
                      <label htmlFor="file-upload" className="flex items-center gap-2 w-fit px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                        <AttachFileIcon style={{ fontSize: 16 }} />
                        Add files
                      </label>
                      <input
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt,.ppt,.pptx"
                        style={{ display: 'none' }}
                        id="file-upload"
                        multiple
                        type="file"
                        onChange={handleFileUpload}
                      />

                      {formData.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {formData.attachments.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <div className="flex items-center gap-2 min-w-0">
                                <AttachFileIcon className="text-gray-400 flex-shrink-0" style={{ fontSize: 15 }} />
                                <div className="min-w-0">
                                  <p className="text-sm text-gray-800 truncate">{item.name}</p>
                                  <p className="text-xs text-gray-400">{item.size} MB · {item.type}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAttachment(item.id)}
                                className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors flex-shrink-0"
                              >
                                <DeleteIcon style={{ fontSize: 15 }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Review */}
                {activeStep === 3 && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Review before sending</p>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-100">
                      {[['To', formData.recipient || '—'], ['From', user?.name || 'Admin'], ['Subject', formData.subject], ['Category', formData.category], ['Priority', formData.priority]].map(([k, v]) => (
                        <div key={k} className="flex items-center gap-4 px-4 py-3">
                          <span className="text-xs text-gray-400 w-20 flex-shrink-0">{k}</span>
                          <span className="text-sm text-gray-800 font-medium">
                            {k === 'Priority' ? <Badge variant={v}>{v}</Badge> : v}
                          </span>
                        </div>
                      ))}
                    </div>

                    {formData.subject && (
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Message preview</p>
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{formData.message}</p>
                        </div>
                      </div>
                    )}

                    {(formData.confidential || formData.urgent || formData.readReceipt || formData.followUp) && (
                      <div className="flex flex-wrap gap-2">
                        {formData.confidential && <Badge variant="warning">Confidential</Badge>}
                        {formData.urgent && <Badge variant="danger">Urgent</Badge>}
                        {formData.readReceipt && <Badge variant="info">Read Receipt</Badge>}
                        {formData.followUp && <Badge>Follow-up</Badge>}
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={activeStep > 0 ? handlePrevStep : () => navigate(-1)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {activeStep > 0 ? '← Back' : 'Cancel'}
                  </button>

                  <div className="flex items-center gap-2">
                    {activeStep === 3 && (
                      <button
                        type="button"
                        onClick={() => setSaveAsDraftConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <DraftsIcon style={{ fontSize: 15 }} /> Save draft
                      </button>
                    )}
                    {activeStep < 3 ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Continue →
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SendIcon style={{ fontSize: 15 }} />}
                        {loading ? 'Sending…' : 'Send Message'}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="p-5">
              <p className="text-sm font-semibold text-gray-800 mb-4">Message Templates</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map(template => (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{template.name}</p>
                        <p className="text-xs text-gray-400">Used {template.usageCount || 0} times</p>
                      </div>
                      <Badge>{template.category}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mb-1 font-medium">Subject</p>
                    <p className="text-xs text-gray-700 mb-3 truncate">{template.subject}</p>
                    <p className="text-xs text-gray-500 line-clamp-3 mb-3">{template.message.substring(0, 120)}…</p>
                    <button
                      onClick={() => applyTemplate(template)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <FileCopyIcon style={{ fontSize: 13 }} /> Use Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drafts Tab */}
          {activeTab === 'drafts' && (
            <div className="p-5">
              <p className="text-sm font-semibold text-gray-800 mb-4">Saved Drafts ({drafts.length})</p>
              {drafts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <DraftsIcon className="text-gray-400" style={{ fontSize: 22 }} />
                  </div>
                  <p className="text-gray-600 text-sm font-medium">No drafts yet</p>
                  <p className="text-gray-400 text-xs mt-1 mb-4">Your saved drafts will appear here</p>
                  <button onClick={() => setActiveTab('compose')} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
                    Compose Message
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts.map(draft => (
                    <div key={draft.id} className="flex items-start justify-between border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{draft.subject || 'Untitled Draft'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          To: {draft.recipient || 'No recipient'} · {new Date(draft.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                        <button onClick={() => loadDraft(draft)} className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => deleteDraft(draft.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <DeleteIcon style={{ fontSize: 15 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Tab */}
          {activeTab === 'ai' && (
            <div className="p-5">
              <p className="text-sm font-semibold text-gray-800 mb-4">AI Writing Assistant</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: AutoFixHighIcon, title: 'Smart Suggestions', sub: 'AI-powered improvements for clarity and tone.', btn: 'Generate Suggestions' },
                  { icon: PsychologyIcon, title: 'Tone Analysis', sub: 'Analyze if your message sounds professional.', btn: 'Analyze Tone' },
                ].map(card => (
                  <div key={card.title} className="border border-gray-200 rounded-lg p-4">
                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                      <card.icon className="text-gray-600" style={{ fontSize: 18 }} />
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mb-1">{card.title}</p>
                    <p className="text-xs text-gray-500 mb-4">{card.sub}</p>
                    <button className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors">
                      {card.btn}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">All messages are securely stored and encrypted.</p>
          </div>
        </div>
      </div>

      {/* Save Draft Confirm */}
      {saveAsDraftConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSaveAsDraftConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Save as draft?</h3>
            <p className="text-sm text-gray-500 mb-5">You can continue editing this message later.</p>
            <div className="flex gap-3">
              <button onClick={() => setSaveAsDraftConfirm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => { saveDraft(); setSaveAsDraftConfirm(false); }} className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors">
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessDialog
        open={showSuccessDialog}
        message={lastSentMessage}
        onViewMessages={() => { setShowSuccessDialog(false); navigate('/admin/messages'); }}
        onSendAnother={() => { setShowSuccessDialog(false); setFormData(EMPTY_FORM); setActiveStep(0); }}
      />
    </div>
  );
};

export default AdminComposeMessage;