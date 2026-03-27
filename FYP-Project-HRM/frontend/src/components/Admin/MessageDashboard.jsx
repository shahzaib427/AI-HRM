import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Paper, Typography, Grid, Card, CardContent, 
  Button, Chip, IconButton, Tooltip, Avatar, Badge,
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, TablePagination, TextField, MenuItem, Select,
  FormControl, InputLabel, Checkbox, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, LinearProgress,
  Tabs, Tab, CircularProgress, Snackbar
} from '@mui/material';
import {
  Email as EmailIcon,
  Reply as ReplyIcon,
  Visibility as ViewIcon,
  Assignment as AssignIcon,
  CheckCircle as ResolveIcon,
  PriorityHigh as PriorityIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  ChatBubble as ChatIcon,
  PersonAdd as PersonAddIcon,
  Assessment as StatsIcon,
  Archive as ArchiveIcon,
  Send as SendIcon,
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { format, subDays } from 'date-fns';
import debounce from 'lodash/debounce';

const MessageDashboard = () => {
  const navigate = useNavigate();
  
  // State
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    assignedToMe: false,
    search: '',
    timeRange: 'today'
  });
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 20,
    total: 0
  });
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [bulkActionDialog, setBulkActionDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkActionData, setBulkActionData] = useState({
    assignee: '',
    newStatus: '',
    newPriority: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: '',
    ids: [],
    permanent: false
  });

  // Constants
  const statusColors = {
    'new': 'info',
    'in-progress': 'warning',
    'awaiting-approval': 'secondary',
    'resolved': 'success',
    'closed': 'default',
    'escalated': 'error',
    'sent': 'info',
    'read': 'primary',
    'deleted': 'error'
  };

  const priorityColors = {
    'urgent': 'error',
    'high': 'warning',
    'normal': 'info',
    'low': 'success'
  };

  const categoryIcons = {
    'leave': '🏖️',
    'payroll': '💰',
    'benefits': '🏥',
    'technical': '💻',
    'complaint': '⚠️',
    'suggestion': '💡',
    'general': '📧',
    'document': '📄',
    'policy': '📋',
    'other': '📝',
    'announcement': '📢',
    'training': '🎓',
    'appreciation': '⭐',
    'survey': '📊',
    'warning': '🚨',
    'compliance': '⚖️'
  };

  const timeRanges = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  // Utils
  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const currentUser = getCurrentUser();

  // API Functions
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page + 1,
        limit: pagination.limit,
        excludeDeleted: true,
        ...filters
      };

      if (filters.timeRange && filters.timeRange !== 'today') {
        const now = new Date();
        let startDate;
        switch (filters.timeRange) {
          case 'yesterday': startDate = subDays(now, 1); break;
          case 'week': startDate = subDays(now, 7); break;
          case 'month': startDate = subDays(now, 30); break;
          default: startDate = now;
        }
        params.startDate = startDate.toISOString();
      }

      const response = await axiosInstance.get('/messages', { params });
      
      const filteredMessages = (response.data.data || []).filter(msg => msg.status !== 'deleted');
      setMessages(filteredMessages);
      setPagination(prev => ({
        ...prev,
        total: response.data.total || filteredMessages.length || 0
      }));
      
      if (response.data.stats) setStats(response.data.stats);
      else calculateLocalStats(filteredMessages);
    } catch (error) {
      console.error('Error fetching messages:', error.response?.data || error.message);
      showSnackbar(error.response?.data?.message || 'Failed to load messages', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get('/messages/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      calculateLocalStats(messages);
    }
  };

  const calculateLocalStats = (messageList = messages) => {
    const activeMessages = messageList.filter(msg => msg.status !== 'deleted');
    const total = activeMessages.length;
    const newMessages = activeMessages.filter(m => m.status === 'new' || m.status === 'sent').length;
    const urgent = activeMessages.filter(m => m.priority === 'urgent').length;
    const resolved = activeMessages.filter(m => m.status === 'resolved' || m.status === 'closed').length;
    const inProgress = activeMessages.filter(m => m.status === 'in-progress').length;
    const assignedToMe = currentUser ? 
      activeMessages.filter(m => m.assignedTo?.id === currentUser._id || m.assignedTo?._id === currentUser._id).length : 0;

    setStats({
      totals: { total, new: newMessages, urgent, resolved, inProgress },
      performance: { assignedToMe }
    });
  };

  // Effects
  useEffect(() => {
    fetchMessages();
    fetchStats();
  }, [pagination.page]);

  useEffect(() => {
    const tabFilters = {
      0: { status: '', priority: '', assignedToMe: false },
      1: { status: 'new' },
      2: { status: 'in-progress' },
      3: { priority: 'urgent' },
      4: { assignedToMe: true },
      5: { status: 'resolved' }
    };
    
    if (tabValue !== 0) {
      setFilters(prev => ({ ...prev, ...tabFilters[tabValue] }));
    } else {
      setFilters(prev => ({
        ...prev,
        status: '',
        priority: '',
        assignedToMe: false
      }));
    }
  }, [tabValue]);

  // Event Handlers
  const debouncedSearch = useCallback(
    debounce((value) => handleFilterChange('search', value), 500),
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

  const handleRefresh = () => {
    setRefreshing(true);
    setPagination(prev => ({ ...prev, page: 0 }));
    fetchMessages();
    fetchStats();
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedMessages.length === 0) {
      showSnackbar('Please select messages first', 'warning');
      return;
    }

    // Handle delete actions
    if (bulkAction === 'delete' || bulkAction === 'permanent-delete') {
      setDeleteConfirmDialog({
        open: true,
        title: bulkAction === 'permanent-delete' ? 'Permanently Delete Messages' : 'Delete Messages',
        message: `Are you sure you want to ${bulkAction === 'permanent-delete' ? 'permanently delete' : 'delete'} ${selectedMessages.length} selected message(s)?`,
        action: 'bulk',
        ids: selectedMessages,
        permanent: bulkAction === 'permanent-delete'
      });
      setBulkActionDialog(false);
      return;
    }

    // Handle other bulk actions
    try {
      let endpoint = '';
      let data = { messageIds: selectedMessages };
      
      switch(bulkAction) {
        case 'mark-as-read':
          endpoint = '/messages/bulk-read';
          data.status = 'read';
          break;
        case 'mark-as-unread':
          endpoint = '/messages/bulk-unread';
          data.status = 'new';
          break;
        case 'assign':
          endpoint = '/messages/bulk-assign';
          data.assignedTo = bulkActionData.assignee;
          break;
        case 'change-status':
          endpoint = '/messages/bulk-status';
          data.status = bulkActionData.newStatus;
          break;
        case 'change-priority':
          endpoint = '/messages/bulk-priority';
          data.priority = bulkActionData.newPriority;
          break;
        case 'archive':
          endpoint = '/messages/bulk-archive';
          break;
        default:
          throw new Error('Invalid bulk action');
      }

      await axiosInstance.post(endpoint, data);
      showSnackbar(`Bulk action '${bulkAction}' applied successfully`, 'success');
      fetchMessages();
      fetchStats();
      setSelectedMessages([]);
      setBulkActionDialog(false);
      setBulkAction('');
      setBulkActionData({ assignee: '', newStatus: '', newPriority: '' });
    } catch (error) {
      console.error('Error performing bulk action:', error.response?.data || error.message);
      showSnackbar(error.response?.data?.message || 'Failed to perform bulk action', 'error');
    }
  };

  const handleDeleteMessage = (messageId, e) => {
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
      
      if (action === 'individual') {
        await axiosInstance.delete(`/messages/${ids[0]}`);
        showSnackbar('Message deleted successfully', 'success');
      } else if (action === 'bulk') {
        await axiosInstance.post('/messages/bulk-delete', { messageIds: ids });
        showSnackbar(`${ids.length} message(s) deleted successfully`, 'success');
      }
      
      // Update UI
      setMessages(prev => prev.filter(msg => !ids.includes(msg._id)));
      setSelectedMessages(prev => prev.filter(id => !ids.includes(id)));
      fetchStats();
      
      setDeleteConfirmDialog({ open: false, title: '', message: '', action: '', ids: [], permanent: false });
    } catch (error) {
      console.error('Delete error:', error.response?.data || error.message);
      showSnackbar(error.response?.data?.message || 'Failed to delete message(s)', 'error');
      fetchMessages();
    }
  };

  // Navigation
  const handleViewMessage = (id) => navigate(`/admin/messages/${id}`);
  const handleReply = (id) => navigate(`/admin/messages/${id}/reply`);
  const handleCompose = () => navigate('/admin/messages/compose');
  const handleAnalytics = () => navigate('/admin/messages/stats');

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
  };

  const handleRowsPerPageChange = (event) => {
    setPagination(prev => ({ 
      ...prev, 
      limit: parseInt(event.target.value, 10),
      page: 0 
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: '', priority: '', category: '', assignedToMe: false, search: '', timeRange: 'today'
    });
    setTabValue(0);
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e' }}>
            📨 Admin Message Center
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage all employee messages, replies, and communications
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<StatsIcon />} onClick={handleAnalytics}>
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
          <Tab label="New" icon={<Badge color="error" badgeContent=" "><EmailIcon /></Badge>} iconPosition="start" />
          <Tab label="In Progress" icon={<AssignIcon />} iconPosition="start" />
          <Tab label="Urgent" icon={<PriorityIcon />} iconPosition="start" />
          <Tab label="Assigned to Me" icon={<PersonAddIcon />} iconPosition="start" />
          <Tab label="Resolved" icon={<CheckCircleIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Stats Cards */}
      {stats ? (
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
                  <Typography variant="h6">In Progress</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#e65100' }}>
                  {stats?.totals?.inProgress || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Actively being handled
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
                <Typography variant="body2" color="text.secondary">
                  Successfully closed
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
                <Typography variant="body2" color="text.secondary">
                  Your assigned tickets
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Paper sx={{ p: 3, mb: 4 }}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography>Loading stats...</Typography>
        </Paper>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              placeholder="Search messages..."
              value={filters.search}
              onChange={handleSearchChange}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} label="Status">
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="sent">Sent</MenuItem>
                <MenuItem value="read">Read</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="awaiting-approval">Awaiting Approval</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
                <MenuItem value="deleted" disabled>Deleted (Hidden)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)} label="Priority">
                <MenuItem value="">All Priority</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select value={filters.category} onChange={(e) => handleFilterChange('category', e.target.value)} label="Category">
                <MenuItem value="">All Categories</MenuItem>
                <MenuItem value="leave">Leave Request</MenuItem>
                <MenuItem value="payroll">Payroll</MenuItem>
                <MenuItem value="benefits">Benefits</MenuItem>
                <MenuItem value="technical">Technical</MenuItem>
                <MenuItem value="complaint">Complaint</MenuItem>
                <MenuItem value="announcement">Announcement</MenuItem>
                <MenuItem value="policy">Policy</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select value={filters.timeRange} onChange={(e) => handleFilterChange('timeRange', e.target.value)} label="Time Range">
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
                <IconButton onClick={handleRefresh} disabled={refreshing} sx={{ ml: 1 }}>
                  {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button size="small" onClick={handleClearFilters}>Clear Filters</Button>
        </Box>
      </Paper>

      {/* Bulk Actions Bar */}
      {selectedMessages.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {selectedMessages.length} message(s) selected
          </Typography>
          <Box>
            <Button variant="outlined" size="small" onClick={() => setBulkActionDialog(true)} sx={{ mr: 1 }}>
              Bulk Actions
            </Button>
            <Button variant="contained" color="error" size="small" onClick={handleBulkDelete} startIcon={<DeleteIcon />} sx={{ mr: 1 }}>
              Delete Selected
            </Button>
            <Button variant="text" size="small" onClick={() => setSelectedMessages([])}>
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
              <TableCell>Ref #</TableCell>
              <TableCell>Subject & Sender</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Assigned To</TableCell>
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
                    {loading ? 'Loading messages...' : 'No messages found'}
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
                <TableRow 
                  key={message._id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    bgcolor: selectedMessages.includes(message._id) ? '#e3f2fd' : 'inherit',
                    '&:hover': { bgcolor: '#f5f5f5' }
                  }}
                  onClick={() => handleViewMessage(message._id)}
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
                      <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: '#1976d2' }}>
                        {message.sender?.name?.charAt(0) || 'E'}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {message.subject || 'No Subject'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          From: {message.sender?.name || 'Unknown'} ({message.sender?.employeeId || 'N/A'})
                        </Typography>
                        {message.responses?.length > 0 && (
                          <Chip label={`${message.responses.length} replies`} size="small" sx={{ ml: 1, mt: 0.5 }} />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<span>{categoryIcons[message.category] || '📧'}</span>}
                      label={message.category || 'general'}
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
                      icon={<PriorityIcon />}
                    />
                  </TableCell>
                  <TableCell>
                    {message.assignedTo ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem' }}>
                          {message.assignedTo.name?.charAt(0)}
                        </Avatar>
                        <Typography variant="body2">
                          {message.assignedTo.name}
                        </Typography>
                      </Box>
                    ) : (
                      <Chip label="Unassigned" size="small" color="warning" variant="outlined" />
                    )}
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
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="View">
                        <IconButton size="small" onClick={() => handleViewMessage(message._id)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reply">
                        <IconButton size="small" onClick={() => handleReply(message._id)}>
                          <ReplyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={(e) => handleDeleteMessage(message._id, e)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={pagination.total}
          rowsPerPage={pagination.limit}
          page={pagination.page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </TableContainer>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionDialog} onClose={() => setBulkActionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Actions</DialogTitle>
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
              <MenuItem value="assign">Assign to...</MenuItem>
              <MenuItem value="change-status">Change Status</MenuItem>
              <MenuItem value="change-priority">Change Priority</MenuItem>
              <MenuItem value="archive">Archive</MenuItem>
              <MenuItem value="delete">Delete</MenuItem>
              {currentUser?.role === 'admin' && (
                <MenuItem value="permanent-delete">Permanent Delete</MenuItem>
              )}
            </Select>
          </FormControl>
          
          {/* Show additional inputs based on selected action */}
          {bulkAction === 'assign' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Assign To</InputLabel>
              <Select 
                value={bulkActionData.assignee} 
                onChange={(e) => setBulkActionData(prev => ({ ...prev, assignee: e.target.value }))}
                label="Assign To"
              >
                <MenuItem value="user1">John Doe</MenuItem>
                <MenuItem value="user2">Jane Smith</MenuItem>
              </Select>
            </FormControl>
          )}
          
          {bulkAction === 'change-status' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>New Status</InputLabel>
              <Select 
                value={bulkActionData.newStatus} 
                onChange={(e) => setBulkActionData(prev => ({ ...prev, newStatus: e.target.value }))}
                label="New Status"
              >
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          )}
          
          {bulkAction === 'change-priority' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>New Priority</InputLabel>
              <Select 
                value={bulkActionData.newPriority} 
                onChange={(e) => setBulkActionData(prev => ({ ...prev, newPriority: e.target.value }))}
                label="New Priority"
              >
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setBulkActionDialog(false);
            setBulkAction('');
            setBulkActionData({ assignee: '', newStatus: '', newPriority: '' });
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleBulkAction} 
            variant="contained" 
            disabled={!bulkAction || 
              (bulkAction === 'assign' && !bulkActionData.assignee) ||
              (bulkAction === 'change-status' && !bulkActionData.newStatus) ||
              (bulkAction === 'change-priority' && !bulkActionData.newPriority)}
          >
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

export default MessageDashboard;