// HRMessageDashboard.jsx - UPDATED WITH INLINE MESSAGE VIEWING
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Paper, Typography, Grid, Card, CardContent, 
  Button, Chip, IconButton, Tooltip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, TablePagination, TextField, MenuItem, Select,
  FormControl, InputLabel, Checkbox, Dialog, DialogTitle,
  DialogContent, DialogActions, LinearProgress,
  Tabs, Tab, Fab, Alert, Snackbar,
  Collapse, Divider, List, ListItem, ListItemAvatar, ListItemText,
  CircularProgress
} from '@mui/material';
import {
  Email as EmailIcon, 
  Reply as ReplyIcon, 
  Visibility as ViewIcon,
  VisibilityOff as ViewOffIcon,
  Assignment as AssignIcon, 
  PriorityHigh as PriorityIcon,
  Refresh as RefreshIcon, 
  Search as SearchIcon, 
  ChatBubble as ChatIcon,
  PersonAdd as PersonAddIcon, 
  Send as SendIcon, 
  MoreVert as MoreIcon,
  Add as AddIcon, 
  AccessTime as TimeIcon, 
  Error as ErrorIcon, 
  Archive as ArchiveIcon,
  Assessment as StatsIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import debounce from 'lodash/debounce';
import axiosInstance from '../../utils/axiosInstance';

const HRMessageDashboard = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    status: '', priority: '', category: '', department: '',
    assignedToMe: false, search: '', timeRange: 'today'
  });
  const [pagination, setPagination] = useState({ page: 0, limit: 15, total: 0 });
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [bulkActionDialog, setBulkActionDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [currentUser, setCurrentUser] = useState(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: '',
    ids: [],
    permanent: false
  });
  
  // NEW: Inline view state
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const [messageDetails, setMessageDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const departments = ['All Departments', 'Engineering', 'Marketing', 'Sales', 'Operations', 'Finance', 'Human Resources'];

  // Status & Priority colors
  const statusColors = {
    'new': 'info', 'sent': 'info', 'reviewing': 'secondary', 'in-progress': 'warning',
    'awaiting-approval': 'secondary', 'pending-approval': 'secondary',
    'approved': 'success', 'rejected': 'error', 'closed': 'default', 'resolved': 'success', 'read': 'primary'
  };
  
  const priorityColors = { 'urgent': 'error', 'high': 'warning', 'normal': 'info', 'low': 'success' };

  // HR categories
  const hrCategories = {
    'general': { label: 'General', icon: '📧', color: '#9E9E9E' },
    'announcement': { label: 'Announcement', icon: '📢', color: '#2196F3' },
    'policy': { label: 'Policy Update', icon: '📋', color: '#795548' },
    'training': { label: 'Training', icon: '🎓', color: '#3F51B5' },
    'benefits': { label: 'Benefits', icon: '🏥', color: '#2196F3' },
    'compliance': { label: 'Compliance', icon: '⚖️', color: '#607D8B' },
    'appreciation': { label: 'Appreciation', icon: '⭐', color: '#FFD700' },
    'warning': { label: 'Warning', icon: '⚠️', color: '#F44336' },
    'survey': { label: 'Survey', icon: '📊', color: '#4CAF50' },
    'leave': { label: 'Leave Request', icon: '🏖️', color: '#4CAF50' },
    'payroll': { label: 'Payroll Query', icon: '💰', color: '#FF9800' }
  };

  const timeRanges = [
    { value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }
  ];

  // Get current user
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('excludeDeleted', 'true');
      params.append('page', (pagination.page + 1).toString());
      params.append('limit', pagination.limit.toString());
      
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);
      if (filters.department && filters.department !== 'All Departments') {
        params.append('department', filters.department);
      }
      if (filters.search) params.append('search', filters.search);
      if (filters.assignedToMe) params.append('assignedToMe', 'true');
      if (filters.timeRange && filters.timeRange !== 'today') {
        const now = new Date();
        let startDate;
        switch (filters.timeRange) {
          case 'yesterday':
            startDate = subDays(now, 1);
            break;
          case 'week':
            startDate = subDays(now, 7);
            break;
          case 'month':
            startDate = subDays(now, 30);
            break;
          default:
            startDate = now;
        }
        params.append('startDate', startDate.toISOString());
      }

      const response = await axiosInstance.get(`/messages?${params.toString()}`); 
      
      if (response.data.success) {
        const filteredMessages = (response.data.data || []).filter(
          msg => msg.status !== 'deleted'
        );
        
        setMessages(filteredMessages);
        setPagination(prev => ({
          ...prev,
          total: response.data.count || filteredMessages.length || 0
        }));
      } else {
        throw new Error(response.data.message || 'Failed to fetch messages');
      }
    } catch (error) {
      console.error('❌ Error fetching HR messages:', error);
      setMessages([]);
      showSnackbar(error.response?.data?.message || 'Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch message details for inline view
  const fetchMessageDetails = async (messageId) => {
    try {
      setLoadingDetails(true);
      const response = await axiosInstance.get(`/messages/${messageId}`);
      
      if (response.data.success) {
        setMessageDetails(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to load message details');
      }
    } catch (error) {
      console.error('❌ Error fetching message details:', error);
      showSnackbar(error.response?.data?.message || 'Failed to load message details', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle eye icon click - toggle inline view
  const handleViewMessage = async (messageId, e) => {
    if (e) e.stopPropagation();
    
    if (expandedMessageId === messageId) {
      // If already expanded, collapse it
      setExpandedMessageId(null);
      setMessageDetails(null);
    } else {
      // Expand and fetch details
      setExpandedMessageId(messageId);
      await fetchMessageDetails(messageId);
    }
  };

  // Handle reply submission
  const handleReplySubmit = async () => {
    if (!replyText.trim()) {
      showSnackbar('Please enter a reply message', 'warning');
      return;
    }

    try {
      setSendingReply(true);
      
      const response = await axiosInstance.post(`/messages/${expandedMessageId}/reply`, {
        message: replyText.trim()
      });
      
      if (response.data.success) {
        // Refresh message details to show the new reply
        await fetchMessageDetails(expandedMessageId);
        setReplyText('');
        
        // Also refresh the message in the list
        const updatedMessages = messages.map(msg => {
          if (msg._id === expandedMessageId) {
            return {
              ...msg,
              status: 'read',
              responses: [...(msg.responses || []), response.data.data.responses[response.data.data.responses.length - 1]]
            };
          }
          return msg;
        });
        setMessages(updatedMessages);
        
        showSnackbar('Reply sent successfully!', 'success');
      } else {
        throw new Error(response.data.message || 'Failed to send reply');
      }
    } catch (error) {
      console.error('❌ Reply error:', error);
      showSnackbar(error.response?.data?.message || 'Failed to send reply', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  // Fetch stats
  const fetchHRStats = async () => {
    try {
      const response = await axiosInstance.get('/messages/stats/'); 
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        calculateLocalStats();
      }
    } catch (error) {
      console.error('❌ Error fetching HR stats:', error);
      calculateLocalStats();
    }
  };

  const calculateLocalStats = () => {
    const activeMessages = messages.filter(msg => msg.status !== 'deleted');
    const total = activeMessages.length;
    const newMessages = activeMessages.filter(m => m.status === 'new' || m.status === 'sent').length;
    const urgent = activeMessages.filter(m => m.priority === 'urgent').length;
    const resolved = activeMessages.filter(m => m.status === 'resolved' || m.status === 'closed').length;
    const assignedToMe = currentUser ? 
      activeMessages.filter(m => m.assignedTo?.id === currentUser._id).length : 0;

    setStats({
      totals: { total, new: newMessages, urgent, resolved },
      performance: { assignedToMe }
    });
  };

  useEffect(() => {
    fetchMessages();
    fetchHRStats();
  }, [pagination.page, filters, currentUser]);

  // Handle tab changes
  useEffect(() => {
    const tabFilters = {
      0: { status: '', priority: '', assignedToMe: false },
      1: { status: 'pending-approval' },
      2: { priority: 'urgent' },
      3: { assignedToMe: true },
      4: { status: 'closed' }
    };
    
    if (tabValue !== 0) {
      setFilters(prev => ({
        ...prev,
        ...tabFilters[tabValue]
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        status: '',
        priority: '',
        assignedToMe: false
      }));
    }
  }, [tabValue]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value) => {
      handleFilterChange('search', value);
    }, 500),
    []
  );

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    if (name !== 'search') {
      setPagination(prev => ({ ...prev, page: 0 }));
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setFilters(prev => ({ ...prev, search: value }));
    debouncedSearch(value);
  };

  const handleSelectMessage = (id) => {
    setSelectedMessages(prev =>
      prev.includes(id) ? prev.filter(msgId => msgId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedMessages.length === messages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(messages.map(msg => msg._id));
    }
  };

  const handleBulkAction = async () => {
    if (selectedMessages.length === 0) {
      showSnackbar('Please select messages first', 'warning');
      return;
    }

    if (bulkAction === 'permanent-delete') {
      setDeleteConfirmDialog({
        open: true,
        title: 'Permanently Delete Messages',
        message: `Are you sure you want to permanently delete ${selectedMessages.length} message(s)?`,
        action: 'bulk',
        ids: selectedMessages,
        permanent: true
      });
      setBulkActionDialog(false);
      return;
    }

    if (bulkAction === 'delete') {
      setDeleteConfirmDialog({
        open: true,
        title: 'Delete Messages',
        message: `Are you sure you want to delete ${selectedMessages.length} selected message(s)?`,
        action: 'bulk',
        ids: selectedMessages,
        permanent: false
      });
      setBulkActionDialog(false);
      return;
    }

    try {
     const response = await axiosInstance.post('/messages/bulk-delete', {
  action: bulkAction,
  messageIds: selectedMessages  // ✅ Matches controller expectation
});

      if (response.data.success) {
        showSnackbar(response.data.message || 'Bulk action completed successfully', 'success');
        fetchMessages();
        fetchHRStats();
        setSelectedMessages([]);
        setBulkActionDialog(false);
        setBulkAction('');
      } else {
        throw new Error(response.data.message || 'Failed to perform bulk action');
      }
    } catch (error) {
      console.error('❌ Bulk action error:', error);
      showSnackbar(error.response?.data?.message || 'Failed to perform bulk action', 'error');
    }
  };

  const handleDeleteMessage = async (messageId, e) => {
    e.stopPropagation();
    
    setDeleteConfirmDialog({
      open: true,
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message?',
      action: 'individual',
      ids: [messageId],
      permanent: false
    });
  };

  const handleBulkDelete = () => {
    if (selectedMessages.length === 0) {
      showSnackbar('Please select messages first', 'warning');
      return;
    }
    
    setDeleteConfirmDialog({
      open: true,
      title: 'Delete Messages',
      message: `Are you sure you want to delete ${selectedMessages.length} selected message(s)?`,
      action: 'bulk',
      ids: selectedMessages,
      permanent: false
    });
  };

  const confirmDelete = async () => {
    try {
      const { action, ids, permanent } = deleteConfirmDialog;
      
      // Remove from UI immediately
      setMessages(prev => prev.filter(msg => !ids.includes(msg._id)));
      setSelectedMessages(prev => prev.filter(id => !ids.includes(id)));
      
      // Close expanded view if deleting that message
      if (ids.includes(expandedMessageId)) {
        setExpandedMessageId(null);
        setMessageDetails(null);
      }
      
      if (action === 'individual') {
        const url = `/messages/${ids[0]}${permanent ? '?permanent=true' : ''}`; 
        const response = permanent ? 
          await axiosInstance.delete(url) : 
          await axiosInstance.delete(url);
        
        if (response.data.success) {
          showSnackbar(
            `Message ${permanent ? 'permanently ' : ''}deleted successfully`, 
            'success'
          );
          fetchHRStats();
        }
      } else if (action === 'bulk') {
     const response = await axiosInstance.post('/messages/bulk-delete', {
  action: 'delete',
  messageIds: ids  // ✅ Matches controller expectation
});
        
        if (response.data.success) {
          showSnackbar(
            `${ids.length} message(s) ${permanent ? 'permanently ' : ''}deleted successfully`, 
            'success'
          );
          fetchHRStats();
        }
      }
      
      setDeleteConfirmDialog({
        open: false,
        title: '',
        message: '',
        action: '',
        ids: [],
        permanent: false
      });
      
    } catch (error) {
      console.error('❌ Delete error:', error);
      showSnackbar(error.response?.data?.message || 'Failed to delete message(s)', 'error');
      fetchMessages();
    }
  };

  const handleCompose = () => navigate('/hr/messages/compose');
  const handleAnalytics = () => navigate('/hr/messages/stats');

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    // Collapse expanded view when changing pages
    setExpandedMessageId(null);
    setMessageDetails(null);
  };

  const handleRowsPerPageChange = (event) => {
    setPagination(prev => ({ 
      ...prev, 
      limit: parseInt(event.target.value, 10), 
      page: 0 
    }));
    // Collapse expanded view when changing rows per page
    setExpandedMessageId(null);
    setMessageDetails(null);
  };

  const handleClearFilters = () => {
    setFilters({
      status: '', priority: '', category: '', department: '',
      assignedToMe: false, search: '', timeRange: 'today'
    });
    setTabValue(0);
    setPagination(prev => ({ ...prev, page: 0 }));
    // Collapse expanded view when clearing filters
    setExpandedMessageId(null);
    setMessageDetails(null);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  // Render expanded message view
  const renderExpandedMessage = () => {
    if (!expandedMessageId || !messageDetails) return null;

    const message = messageDetails;

    return (
      <TableRow>
        <TableCell colSpan={9} sx={{ p: 0, borderTop: '2px solid #1976d2' }}>
          <Collapse in={expandedMessageId === message._id} timeout="auto" unmountOnExit>
            <Box sx={{ p: 3, bgcolor: '#f9f9f9' }}>
              {loadingDetails ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {/* Message Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {message.subject}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        <Chip
                          icon={<span>{hrCategories[message.category]?.icon || '📧'}</span>}
                          label={hrCategories[message.category]?.label || message.category}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={message.priority || 'normal'}
                          color={priorityColors[message.priority] || 'default'}
                          size="small"
                        />
                        {message.confidential && (
                          <Chip
                            icon={<LockIcon fontSize="small" />}
                            label="Confidential"
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                        <Chip
                          label={message.status || 'unknown'}
                          size="small"
                          variant="outlined"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </Box>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={() => setExpandedMessageId(null)}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      <ViewOffIcon />
                    </IconButton>
                  </Box>

                  <Grid container spacing={3}>
                    {/* Sender Info */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ mr: 2, bgcolor: '#1976d2' }}>
                              {message.sender?.name?.charAt(0) || 'S'}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {message.sender?.name || 'Unknown Sender'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {message.sender?.employeeId && `${message.sender.employeeId} • `}
                                {message.sender?.email || 'No email'}
                              </Typography>
                              {message.sender?.department && (
                                <Typography variant="body2" color="text.secondary">
                                  {message.sender.department}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            Sent: {formatDate(message.sentAt || message.createdAt)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Recipient Info */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ mr: 2, bgcolor: '#4caf50' }}>
                              <PersonIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {message.recipient || 'Unknown Recipient'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Recipient Type: {message.recipientType || 'N/A'}
                              </Typography>
                              {message.recipientDepartment && (
                                <Typography variant="body2" color="text.secondary">
                                  Department: {message.recipientDepartment}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Message Content */}
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            Message
                          </Typography>
                          <Paper variant="outlined" sx={{ p: 3, bgcolor: '#f5f5f5' }}>
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                              {message.message}
                            </Typography>
                          </Paper>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Reply Form */}
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            Reply to Message
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            rows={4}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your reply here..."
                            sx={{ mb: 2 }}
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button onClick={() => setReplyText('')} disabled={sendingReply}>
                              Clear
                            </Button>
                            <Button
                              variant="contained"
                              startIcon={sendingReply ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                              onClick={handleReplySubmit}
                              disabled={sendingReply || !replyText.trim()}
                            >
                              {sendingReply ? 'Sending...' : 'Send Reply'}
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Responses/Replies */}
                    {message.responses && message.responses.length > 0 && (
                      <Grid item xs={12}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                              Responses ({message.responses.length})
                            </Typography>
                            <List>
                              {message.responses.map((response, index) => (
                                <React.Fragment key={index}>
                                  {index > 0 && <Divider sx={{ my: 2 }} />}
                                  <ListItem alignItems="flex-start">
                                    <ListItemAvatar>
                                      <Avatar sx={{ bgcolor: '#1976d2' }}>
                                        {response.sender?.name?.charAt(0) || 'R'}
                                      </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                      primary={
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <Box>
                                            <Typography variant="subtitle1" component="span">
                                              {response.sender?.name || 'Unknown'}
                                            </Typography>
                                            {response.sender?.role && (
                                              <Chip
                                                label={response.sender.role}
                                                size="small"
                                                sx={{ ml: 1 }}
                                              />
                                            )}
                                          </Box>
                                          <Typography variant="caption" color="text.secondary">
                                            {formatDate(response.respondedAt)}
                                          </Typography>
                                        </Box>
                                      }
                                      secondary={
                                        <Typography
                                          variant="body2"
                                          color="text.primary"
                                          sx={{ mt: 1, whiteSpace: 'pre-wrap' }}
                                        >
                                          {response.message}
                                        </Typography>
                                      }
                                    />
                                  </ListItem>
                                </React.Fragment>
                              ))}
                            </List>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                  </Grid>
                </>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e' }}>
            👥 HR Message Center
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage employee communications, requests, and HR queries
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<StatsIcon />}
            onClick={handleAnalytics}
          >
            Analytics
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleCompose}
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)'
            }}
          >
            Compose Message
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable" 
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="All Messages" icon={<EmailIcon />} iconPosition="start" />
          <Tab label="Pending Approval" icon={<TimeIcon />} iconPosition="start" />
          <Tab label="Urgent" icon={<PriorityIcon />} iconPosition="start" />
          <Tab label="Assigned to Me" icon={<PersonAddIcon />} iconPosition="start" />
          <Tab label="Closed" icon={<ArchiveIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#e3f2fd', height: '100%', borderLeft: '4px solid #1976d2' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <EmailIcon sx={{ color: '#1976d2', mr: 1 }} />
                  <Typography variant="h6">Total Messages</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#0d47a1' }}>
                  {stats?.totals?.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats?.totals?.new || 0} new • {stats?.totals?.urgent || 0} urgent
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fff3e0', height: '100%', borderLeft: '4px solid #f57c00' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ChatIcon sx={{ color: '#f57c00', mr: 1 }} />
                  <Typography variant="h6">Pending Approval</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#e65100' }}>
                  {messages.filter(m => m.status === 'pending-approval' || m.status === 'awaiting-approval').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#e8f5e9', height: '100%', borderLeft: '4px solid #388e3c' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircleIcon sx={{ color: '#388e3c', mr: 1 }} />
                  <Typography variant="h6">Resolved</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#1b5e20' }}>
                  {stats?.totals?.resolved || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#f3e5f5', height: '100%', borderLeft: '4px solid #7b1fa2' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PersonAddIcon sx={{ color: '#7b1fa2', mr: 1 }} />
                  <Typography variant="h6">Assigned to Me</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#4a148c' }}>
                  {stats?.performance?.assignedToMe || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              placeholder="Search employee messages..."
              value={filters.search}
              onChange={handleSearchChange}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select 
                value={filters.status} 
                onChange={(e) => handleFilterChange('status', e.target.value)} 
                label="Status"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="sent">Sent</MenuItem>
                <MenuItem value="read">Read</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="pending-approval">Pending Approval</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
                <MenuItem value="deleted" disabled>Deleted (Hidden)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select 
                value={filters.category} 
                onChange={(e) => handleFilterChange('category', e.target.value)} 
                label="Category"
              >
                <MenuItem value="">All Categories</MenuItem>
                {Object.entries(hrCategories).map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: 8 }}>{value.icon}</span>
                      {value.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select 
                value={filters.department} 
                onChange={(e) => handleFilterChange('department', e.target.value)} 
                label="Department"
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select 
                value={filters.timeRange} 
                onChange={(e) => handleFilterChange('timeRange', e.target.value)} 
                label="Time Range"
              >
                {timeRanges.map(range => (
                  <MenuItem key={range.value} value={range.value}>{range.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Tooltip title="Show only messages assigned to me">
                <Chip
                  label="My Cases"
                  color={filters.assignedToMe ? "primary" : "default"}
                  onClick={() => handleFilterChange('assignedToMe', !filters.assignedToMe)}
                  variant={filters.assignedToMe ? "filled" : "outlined"}
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
              <Tooltip title="Refresh">
                <IconButton onClick={fetchMessages} sx={{ ml: 1 }}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button size="small" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </Box>
      </Paper>

      {/* Bulk Actions Bar */}
      {selectedMessages.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {selectedMessages.length} case(s) selected
          </Typography>
          <Box>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => setBulkActionDialog(true)} 
              sx={{ mr: 1 }}
            >
              Bulk Actions
            </Button>
            <Button 
              variant="contained" 
              color="error" 
              size="small" 
              onClick={handleBulkDelete}
              startIcon={<DeleteIcon />}
              sx={{ mr: 1 }}
            >
              Delete Selected
            </Button>
            <Button 
              variant="text" 
              size="small" 
              onClick={() => setSelectedMessages([])}
            >
              Clear Selection
            </Button>
          </Box>
        </Paper>
      )}

      {/* Messages Table */}
      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedMessages.length > 0 && selectedMessages.length < messages.length}
                  checked={messages.length > 0 && selectedMessages.length === messages.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>Employee & Subject</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <EmailIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    {loading ? 'Loading messages...' : 'No HR messages found'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Try adjusting your filters or check back later
                  </Typography>
                  <Button variant="outlined" onClick={handleCompose}>
                    Compose New Message
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              messages.map((message) => (
                <React.Fragment key={message._id}>
                  {/* Regular Table Row */}
                  <TableRow 
                    hover 
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedMessages.includes(message._id)} 
                        onChange={() => handleSelectMessage(message._id)} 
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace', color: '#1976d2' }}>
                        {message.referenceNumber || message._id?.substring(0, 8) || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            mr: 2, 
                            bgcolor: hrCategories[message.category]?.color || '#1976d2',
                            fontSize: '0.875rem'
                          }}
                        >
                          {message.sender?.name?.charAt(0) || 'E'}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {message.subject || 'No Subject'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {message.sender?.name || 'Unknown'} ({message.sender?.employeeId || 'N/A'})
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={message.sender?.department || message.recipientDepartment || 'N/A'} 
                        size="small" 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<span>{hrCategories[message.category]?.icon || '📧'}</span>}
                        label={hrCategories[message.category]?.label || message.category}
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={message.status || 'unknown'} 
                        color={statusColors[message.status] || 'default'} 
                        size="small" 
                        sx={{ textTransform: 'capitalize' }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={message.priority || 'normal'} 
                        color={priorityColors[message.priority] || 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {message.sentAt ? format(new Date(message.sentAt), 'MMM dd') : 
                         message.createdAt ? format(new Date(message.createdAt), 'MMM dd') : 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {message.sentAt ? format(new Date(message.sentAt), 'hh:mm a') : 
                         message.createdAt ? format(new Date(message.createdAt), 'hh:mm a') : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title={expandedMessageId === message._id ? "Hide Details" : "View Details"}>
                          <IconButton 
                            size="small" 
                            onClick={(e) => handleViewMessage(message._id, e)}
                            color={expandedMessageId === message._id ? "primary" : "default"}
                          >
                            {expandedMessageId === message._id ? <ViewOffIcon fontSize="small" /> : <ViewIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={(e) => handleDeleteMessage(message._id, e)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Message Details Row */}
                  {expandedMessageId === message._id && renderExpandedMessage()}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 15, 25, 50]}
          component="div"
          count={pagination.total}
          rowsPerPage={pagination.limit}
          page={pagination.page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </TableContainer>

      {/* FAB */}
      <Fab 
        color="primary" 
        sx={{ position: 'fixed', bottom: 24, right: 24, bgcolor: '#7b1fa2' }} 
        onClick={handleCompose}
      >
        <AddIcon />
      </Fab>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionDialog} onClose={() => setBulkActionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Actions for HR Cases</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Action</InputLabel>
            <Select 
              value={bulkAction} 
              onChange={(e) => setBulkAction(e.target.value)} 
              label="Select Action"
            >
              <MenuItem value="mark-as-read">Mark as Read</MenuItem>
              <MenuItem value="mark-as-unread">Mark as Unread</MenuItem>
              <MenuItem value="change-priority">Change Priority</MenuItem>
              <MenuItem value="archive">Archive</MenuItem>
              <MenuItem value="delete">Delete</MenuItem>
              {currentUser?.role === 'hr' || currentUser?.role === 'admin' ? (
                <MenuItem value="permanent-delete">Permanent Delete</MenuItem>
              ) : null}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkActionDialog(false)}>Cancel</Button>
          <Button onClick={handleBulkAction} variant="contained" disabled={!bulkAction}>
            Apply Action
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmDialog.open} 
        onClose={() => setDeleteConfirmDialog({...deleteConfirmDialog, open: false})}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>
          {deleteConfirmDialog.permanent ? '⚠️ Permanent Delete' : '🗑️ Delete Messages'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {deleteConfirmDialog.message}
          </Typography>
          {deleteConfirmDialog.permanent ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              <strong>WARNING:</strong> This will permanently delete {deleteConfirmDialog.ids.length} message(s) from the database. This action cannot be undone.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Messages will be moved to trash. They can be restored by an administrator.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialog({...deleteConfirmDialog, open: false})}>
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete} 
            variant="contained" 
            color={deleteConfirmDialog.permanent ? "error" : "warning"}
            startIcon={<DeleteIcon />}
          >
            {deleteConfirmDialog.permanent ? 'Permanently Delete' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HRMessageDashboard;