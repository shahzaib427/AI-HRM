import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import axiosInstance from '../../utils/axiosInstance';
import { 
  FaUser, FaEnvelope, FaPaperPlane, FaTrash, FaEye, FaReply, 
  FaDownload, FaInbox, FaStar, FaExclamationTriangle, FaCheckCircle,
  FaPlus
} from 'react-icons/fa';

// ─── Reusable UI Primitives ───────────────────────────────────────────────────

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default:  'bg-gray-100 text-gray-600',
    primary:  'bg-indigo-50 text-indigo-700',
    success:  'bg-emerald-50 text-emerald-700',
    warning:  'bg-amber-50 text-amber-700',
    danger:   'bg-red-50 text-red-700',
    info:     'bg-sky-50 text-sky-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const Avatar = ({ name = 'U', size = 'md' }) => {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' };
  const colors = ['bg-indigo-100 text-indigo-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700'];
  const color = colors[Math.abs(name.charCodeAt(0) % colors.length)];
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

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

const EmptyState = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
      <Icon className="text-gray-400" style={{ fontSize: 28 }} />
    </div>
    <p className="text-gray-800 font-medium mb-1">{title}</p>
    <p className="text-gray-400 text-sm mb-5">{subtitle}</p>
    {action}
  </div>
);

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

const ConfirmDialog = ({ open, onClose, onConfirm, loading, count = 1 }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
          <FaTrash className="text-red-500 text-xl" />
        </div>
        <h3 className="text-gray-900 font-semibold text-lg mb-1">Delete {count > 1 ? `${count} messages` : 'message'}?</h3>
        <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Message View Drawer ──────────────────────────────────────────────────────

const MessageDrawer = ({ message, open, onClose, onReply }) => {
  if (!open || !message) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full flex flex-col shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-gray-900 font-semibold text-base truncate">{message.subject || 'No Subject'}</h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={message.status === 'read' ? 'default' : 'primary'}>{message.status || 'sent'}</Badge>
              {(message.priority === 'high' || message.priority === 'urgent') && (
                <Badge variant="danger">High Priority</Badge>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            ✕
          </button>
        </div>

        {/* Sender strip */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b border-gray-100">
          <Avatar name={message.sender?.name || 'U'} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{message.sender?.name || 'Unknown'}</p>
            <p className="text-xs text-gray-500">{message.sender?.role?.toUpperCase() || 'Employee'}</p>
          </div>
          {message.createdAt && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              {format(new Date(message.createdAt), 'MMM dd, yyyy · h:mm a')}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => { onReply(message._id); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <FaReply className="text-xs" />
            Reply
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const EmployeeMessages = () => {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, messageId: null });
  const [pagination, setPagination] = useState({ page: 0, rowsPerPage: 10 });
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/messages/employee/messages');
      if (response.data.success) {
        setMessages(response.data.data || []);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Fetch error:', error.response?.status);
      toast.warning('Messages unavailable');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMessages(); }, []);

  const handleViewMessage = (messageId) => {
    const message = messages.find(msg => msg._id === messageId);
    if (message) { setSelectedMessage(message); setViewDialog(true); }
  };

  const handleCloseView = () => { setViewDialog(false); setSelectedMessage(null); };

  const handleReplyMessage = (messageId) => {
    const message = messages.find(msg => msg._id === messageId);
    if (message) {
      localStorage.setItem('replyMessage', JSON.stringify({
        id: message._id,
        subject: `Re: ${message.subject}`,
        recipientId: message.sender?.id || message.sender?._id,
        recipientName: message.sender?.name,
      }));
      navigate('/employee/messages/compose');
    }
  };

  const handleDelete = async (messageId) => {
    try {
      setLoading(true);
      const response = await axiosInstance.delete(`/messages/employee/message/${messageId}`);
      if (response.data.success) {
        toast.success('Message deleted');
        await fetchMessages();
      } else {
        toast.error('Delete failed');
      }
    } catch (error) {
      console.error('❌ Delete error:', error.response?.data);
      toast.error('Delete failed');
    } finally {
      setDeleteDialog({ open: false, messageId: null });
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMessages.length === 0) return;
    try {
      setLoading(true);
      let successCount = 0;
      for (const messageId of selectedMessages) {
        try {
          await axiosInstance.delete(`/messages/employee/message/${messageId}`);
          successCount++;
        } catch (error) {
          console.warn('Bulk delete error:', error);
        }
      }
      await fetchMessages();
      setSelectedMessages([]);
      setBulkDeleteOpen(false);
      toast.success(`Deleted ${successCount}/${selectedMessages.length}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    setSelectedMessages(
      selectedMessages.length === messages.length ? [] : messages.map(msg => msg._id)
    );
  };

  const handleSelectMessage = (id) => {
    setSelectedMessages(prev =>
      prev.includes(id) ? prev.filter(msgId => msgId !== id) : [...prev, id]
    );
  };

  const handleCompose = () => navigate('/employee/messages/compose');

  const getCurrentUserId = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) { const user = JSON.parse(userStr); return user._id || user.id; }
      const userFromStorage = localStorage.getItem('currentUser');
      if (userFromStorage) { const user = JSON.parse(userFromStorage); return user._id; }
      return null;
    } catch { return null; }
  };

  const getFilteredMessages = () => {
    const currentUserId = getCurrentUserId();
    switch (tabValue) {
      case 1: return messages.filter(msg => String(msg.sender?.id) === currentUserId);
      case 2: return messages.filter(msg => String(msg.recipientId) === currentUserId);
      case 3: return messages.filter(msg => ['high', 'urgent'].includes(msg.priority));
      default: return messages;
    }
  };

  const filteredMessages = getFilteredMessages();
  const paginatedMessages = filteredMessages.slice(
    pagination.page * pagination.rowsPerPage,
    (pagination.page + 1) * pagination.rowsPerPage
  );

  const totalPages = Math.ceil(filteredMessages.length / pagination.rowsPerPage);
  const unreadCount = messages.filter(m => m.status !== 'read').length;
  const sentCount = messages.filter(m => String(m.sender?.id) === getCurrentUserId()).length;
  const receivedCount = messages.filter(m => String(m.recipientId) === getCurrentUserId()).length;

  const isSent = (msg) => {
    const uid = getCurrentUserId();
    return uid && String(msg.sender?.id) === uid;
  };

  if (loading && messages.length === 0) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Loading messages…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaEnvelope className="text-indigo-600" /> Messages
              </h1>
              <p className="text-sm text-gray-500 mt-1">Communicate with team members and administrators</p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaEnvelope className="w-5 h-5" />
              <span className="text-sm">Message Portal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <KpiCard icon={FaEnvelope} label="Total Messages" value={messages.length} sub={`${unreadCount} unread`} iconBg="bg-indigo-500" />
          <KpiCard icon={FaPaperPlane} label="Sent" value={sentCount} sub="Messages you've sent" iconBg="bg-emerald-500" />
          <KpiCard icon={FaInbox} label="Received" value={receivedCount} sub="Messages in your inbox" iconBg="bg-violet-500" />
          <KpiCard icon={FaStar} label="Important" value={filteredMessages.filter(m => m.priority === 'high' || m.priority === 'urgent').length} sub="Priority messages" iconBg="bg-amber-500" />
        </div>

        {/* Compose Button - Moved to top right of content area */}
        <div className="flex justify-end">
          <button
            onClick={handleCompose}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <FaPlus className="text-xs" />
            Compose Message
          </button>
        </div>

        {/* Bulk Action Bar */}
        {selectedMessages.length > 0 && (
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 animate-fade-in">
            <span className="text-indigo-700 text-sm font-medium">{selectedMessages.length} selected</span>
            <div className="flex gap-2">
              <button onClick={() => setBulkDeleteOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors">
                <FaTrash className="text-xs" /> Delete
              </button>
              <button onClick={() => setSelectedMessages([])} className="px-3 py-1.5 border border-indigo-300 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors">
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-100">
            {loading && <div className="h-0.5 bg-indigo-500 animate-pulse w-full" />}
            <div className="flex items-center justify-between px-4">
              <div className="flex gap-1">
                {[
                  { id: 0, label: 'All', icon: FaEnvelope },
                  { id: 1, label: 'Sent', icon: FaPaperPlane },
                  { id: 2, label: 'Received', icon: FaInbox },
                  { id: 3, label: 'Important', icon: FaStar },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setTabValue(tab.id); setPagination(p => ({ ...p, page: 0 })); }}
                    className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all ${
                      tabValue === tab.id
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon style={{ fontSize: 14 }} />
                    {tab.label}
                    {tab.id === 0 && messages.length > 0 && (
                      <span className="ml-1.5 bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded-full">{messages.length}</span>
                    )}
                  </button>
                ))}
              </div>
              <button onClick={fetchMessages} disabled={loading} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors disabled:opacity-50">
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Table */}
          {paginatedMessages.length === 0 ? (
            <EmptyState
              icon={FaEnvelope}
              title={loading ? 'Loading messages…' : 'No messages here'}
              subtitle={loading ? 'Please wait' : 'Start a conversation by composing a message.'}
              action={!loading && (
                <button onClick={handleCompose} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                  <FaPaperPlane className="text-xs" /> Compose message
                </button>
              )}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="pl-4 pr-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedMessages.length === filteredMessages.length && filteredMessages.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Type</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Date</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-28 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedMessages.map((message) => (
                    <tr
                      key={message._id}
                      className={`group hover:bg-gray-50 transition-colors cursor-pointer ${selectedMessages.includes(message._id) ? 'bg-indigo-50/40' : ''} ${message.status !== 'read' ? 'bg-indigo-50/20' : ''}`}
                      onClick={() => handleViewMessage(message._id)}
                    >
                      <td className="pl-4 pr-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedMessages.includes(message._id)}
                          onChange={() => handleSelectMessage(message._id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                       </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className={`text-sm ${message.status !== 'read' ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'} truncate max-w-xs`}>
                              {message.subject || 'No Subject'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                              {message.message?.substring(0, 60)}…
                            </p>
                          </div>
                        </div>
                       </td>
                      <td className="px-3 py-3.5">
                        <Badge variant={isSent(message) ? 'primary' : 'success'}>
                          {isSent(message) ? 'Sent' : 'Received'}
                        </Badge>
                       </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={message.sender?.name || 'U'} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm text-gray-800 font-medium truncate max-w-[120px]">
                              {message.sender?.name || 'Unknown'}
                            </p>
                          </div>
                        </div>
                       </td>
                      <td className="px-3 py-3.5">
                        <Badge variant={message.status === 'read' ? 'default' : 'info'}>
                          {message.status === 'read' ? 'Read' : 'Unread'}
                        </Badge>
                       </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs text-gray-400">
                          {message.createdAt ? format(new Date(message.createdAt), 'MMM dd') : '—'}
                        </span>
                       </td>
                      <td className="px-3 py-3.5 pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => handleViewMessage(message._id)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <FaEye className="text-xs" />
                          </button>
                          <button
                            onClick={() => handleReplyMessage(message._id)}
                            className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                            title="Reply"
                          >
                            <FaReply className="text-xs" />
                          </button>
                          <button
                            onClick={() => setDeleteDialog({ open: true, messageId: message._id })}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                       </td>
                     </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredMessages.length > pagination.rowsPerPage && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                {pagination.page * pagination.rowsPerPage + 1}–{Math.min((pagination.page + 1) * pagination.rowsPerPage, filteredMessages.length)} of {filteredMessages.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: Math.max(0, p.page - 1) }))}
                  disabled={pagination.page === 0}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-600">{pagination.page + 1} / {totalPages}</span>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: Math.min(totalPages - 1, p.page + 1) }))}
                  disabled={pagination.page >= totalPages - 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, messageId: null })}
        onConfirm={() => handleDelete(deleteDialog.messageId)}
        loading={loading}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        loading={loading}
        count={selectedMessages.length}
      />

      <MessageDrawer
        message={selectedMessage}
        open={viewDialog}
        onClose={handleCloseView}
        onReply={handleReplyMessage}
      />

      {/* CSS animations */}
      <style>{`
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EmployeeMessages;