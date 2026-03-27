import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, IconButton, Button, Chip, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip,
  Checkbox, Card, Badge, Tab, Tabs, CircularProgress
} from '@mui/material';
import {
  Delete as DeleteIcon, Visibility as ViewIcon, Reply as ReplyIcon,
  Refresh as RefreshIcon, Send as SendIcon, Email as EmailIcon, Close as CloseIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import axiosInstance from '../../utils/axiosInstance';

const EmployeeMessages = () => {
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, messageId: null });
  const [pagination, setPagination] = useState({ page: 0, rowsPerPage: 10 });
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  
  // ✅ NEW: Inline view modal state
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // ✅ ALWAYS fetch messages - NO auth barriers
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching messages...');
      
      const response = await axiosInstance.get('/messages/employee/messages');

      console.log('📨 Messages response:', response.data);
      
      if (response.data.success) {
        setMessages(response.data.data || []);
        toast.info(`Loaded ${response.data.data?.length || 0} messages`);
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

  // ✅ LOAD MESSAGES IMMEDIATELY
 useEffect(() => {
  fetchMessages();
}, []);

  // ✅ INLINE VIEW - NO NAVIGATION!
  const handleViewMessage = (messageId) => {
    const message = messages.find(msg => msg._id === messageId);
    if (message) {
      setSelectedMessage(message);
      setViewDialog(true);
      console.log('👁️ Viewing inline:', message.subject);
    }
  };

  // ✅ CLOSE VIEW MODAL
  const handleCloseView = () => {
    setViewDialog(false);
    setSelectedMessage(null);
  };

  // ✅ NEW: Reply to message
  const handleReplyMessage = (messageId) => {
    const message = messages.find(msg => msg._id === messageId);
    if (message) {
      localStorage.setItem('replyMessage', JSON.stringify({
        id: message._id,
        subject: `Re: ${message.subject}`,
        recipientId: message.sender?.id || message.sender?._id,
        recipientName: message.sender?.name
      }));
      navigate('/employee/messages/compose');
    }
  };

const handleDelete = async (messageId) => {
  try {
    setLoading(true);
    
    // ✅ DELETE CALL - NOT GET!
    const response = await axiosInstance.delete(`/messages/employee/message/${messageId}`);
    
    if (response.data.success) {
      toast.success('✅ Message deleted');
      await fetchMessages();  // Refresh list
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
  if (selectedMessages.length === 0 || !window.confirm(`Delete ${selectedMessages.length} messages?`)) return;
  
  try {
    setLoading(true);
    let successCount = 0;
    for (const messageId of selectedMessages) {
      try {
        // ✅ FIXED: Added /api prefix
        await axiosInstance.delete(`/messages/employee/message/${messageId}`);

        successCount++;
      } catch (error) {
        console.warn('Bulk delete error:', error);
      }
    }
    await fetchMessages();
    setSelectedMessages([]);
    toast.success(`✅ Deleted ${successCount}/${selectedMessages.length}`);
  } finally {
    setLoading(false);
  }
};


  const handleSelectAll = () => {
    if (selectedMessages.length === messages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(messages.map(msg => msg._id));
    }
  };

  const handleSelectMessage = (id) => {
    setSelectedMessages(prev => 
      prev.includes(id) ? prev.filter(msgId => msgId !== id) : [...prev, id]
    );
  };

  const handleCompose = () => navigate('/employee/messages/compose');
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPagination(prev => ({ ...prev, page: 0 }));
  };

// ✅ ADD THIS HELPER FUNCTION (near top of component, after state)
const getCurrentUserId = () => {
  try {
    // Check localStorage first (from your login)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user._id || user.id;
    }
    // Fallback: from ComposeMessage pattern
    const userFromStorage = localStorage.getItem('currentUser');
    if (userFromStorage) {
      const user = JSON.parse(userFromStorage);
      return user._id;
    }
    return null;
  } catch (error) {
    console.warn('User ID not found in localStorage');
    return null;
  }
};

// ✅ REPLACE your entire getFilteredMessages function
const getFilteredMessages = () => {
  const currentUserId = getCurrentUserId();
  console.log('🔍 Current User ID:', currentUserId); // Debug log
  
  let filtered = [...messages];
  
  switch (tabValue) {
    case 0: 
      return filtered; // All messages (sent + received)
      
    case 1: // Sent tab - messages YOU sent
      return filtered.filter(msg => {
        const isSentByMe = String(msg.sender?.id) === currentUserId;
        console.log(`Sent check: ${msg.subject} -> ${isSentByMe}`);
        return isSentByMe;
      });
      
    case 2: // Received tab - messages sent TO YOU
      return filtered.filter(msg => {
        const isReceivedByMe = String(msg.recipientId) === currentUserId;
        console.log(`Received check: ${msg.subject} -> ${isReceivedByMe}`);
        return isReceivedByMe;
      });
      
    case 3: // Important
      return filtered.filter(msg => ['high', 'urgent'].includes(msg.priority));
      
    default:
      return filtered;
  }
};


  const filteredMessages = getFilteredMessages();
  const paginatedMessages = filteredMessages.slice(
    pagination.page * pagination.rowsPerPage,
    (pagination.page + 1) * pagination.rowsPerPage
  );

  const theme = {
    primary: '#2563eb', secondary: '#64748b', success: '#10b981',
    warning: '#f59e0b', error: '#ef4444', bg: '#f8fafc', surface: '#ffffff',
    surfaceAlt: '#f1f5f9', text: '#0f172a', textSecondary: '#475569'
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: theme.bg }}>
      <Paper sx={{ mb: 4, p: 4, borderRadius: 3, boxShadow: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: theme.text }}>
              My Messages ({messages.length})
            </Typography>
            <Typography variant="h6" sx={{ color: theme.textSecondary }}>
              Manage your communications
            </Typography>
          </Box>
          <Badge badgeContent={messages.length} color="primary">
            <EmailIcon sx={{ fontSize: 40, color: theme.secondary }} />
          </Badge>
        </Box>
      </Paper>

      <Paper sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab label={`All (${messages.length})`} />
          <Tab label="Sent" />
          <Tab label="Received" />
          <Tab label="Important" />
        </Tabs>
      </Paper>

      {selectedMessages.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: theme.primary, color: 'white', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight={700}>{selectedMessages.length} selected</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                color="error" 
                startIcon={<DeleteIcon />} 
                onClick={handleBulkDelete}
                disabled={loading}
              >
                Delete Selected
              </Button>
              <Button variant="outlined" onClick={() => setSelectedMessages([])}>
                Clear
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      <Card sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}>
        {loading && <LinearProgress />}
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead sx={{ bgcolor: theme.surfaceAlt }}>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedMessages.length > 0 && selectedMessages.length < filteredMessages.length}
                    checked={selectedMessages.length === filteredMessages.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedMessages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <EmailIcon sx={{ fontSize: 64, color: theme.secondary, mb: 2 }} />
                    <Typography variant="h6" color={theme.textSecondary}>
                      {loading ? 'Loading messages...' : 'No messages yet'}
                    </Typography>
                    {!loading && (
                      <Button variant="contained" startIcon={<SendIcon />} onClick={handleCompose} sx={{ mt: 2 }}>
                        Send First Message
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMessages.map((message) => (
                  <TableRow key={message._id} hover selected={selectedMessages.includes(message._id)}>
                    <TableCell padding="checkbox">
                      <Checkbox 
                        checked={selectedMessages.includes(message._id)} 
                        onChange={() => handleSelectMessage(message._id)} 
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>{message.subject || 'No Subject'}</Typography>
                      <Typography variant="body2" color={theme.textSecondary}>
                        {message.message?.substring(0, 50)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={message.sender?.role === 'employee' ? 'Sent' : 'Received'} 
                        color={message.sender?.role === 'employee' ? 'primary' : 'secondary'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {message.sender?.name?.charAt(0) || 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {message.sender?.name || message.recipient || 'Unknown'}
                          </Typography>
                          <Typography variant="caption">{message.category || 'General'}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={message.status || 'sent'} color="info" size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={theme.textSecondary}>
                        {message.createdAt ? format(new Date(message.createdAt), 'MMM dd') : 'Unknown'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {/* ✅ INLINE VIEW 👁️ */}
                        <Tooltip title="View Message">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewMessage(message._id);
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        {/* ✅ Reply 💬 */}
                        <Tooltip title="Reply">
                          <IconButton 
                            size="small" 
                            color="secondary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReplyMessage(message._id);
                            }}
                          >
                            <ReplyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        {/* ✅ Delete 🗑️ */}
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteDialog({ open: true, messageId: message._id });
                            }}
                          >
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
        </TableContainer>
      </Card>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredMessages.length}
        rowsPerPage={pagination.rowsPerPage}
        page={pagination.page}
        onPageChange={(e, newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
        onRowsPerPageChange={(e) => setPagination({ page: 0, rowsPerPage: parseInt(e.target.value, 10) })}
        sx={{ mt: 3 }}
      />

      {/* ✅ DELETE CONFIRM DIALOG */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false })}>
        <DialogTitle>Delete Message</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this message?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
          <Button color="error" onClick={() => handleDelete(deleteDialog.messageId)} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ INLINE MESSAGE VIEW DIALOG - NO NAVIGATION! */}
      <Dialog open={viewDialog} onClose={handleCloseView} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>
              📨 {selectedMessage?.subject || 'Message'}
            </Typography>
            <IconButton onClick={handleCloseView} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedMessage ? (
            <Box>
              {/* Sender Info */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, pt: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Avatar sx={{ width: 48, height: 48 }}>
                  {selectedMessage.sender?.name?.charAt(0) || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedMessage.sender?.name || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedMessage.sender?.role?.toUpperCase() || 'SENDER'} • {selectedMessage.category || 'General'}
                  </Typography>
                  <Chip 
                    label={selectedMessage.status || 'sent'} 
                    size="small" 
                    color="info" 
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Box>

              {/* Message Content */}
              <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {selectedMessage.message}
              </Typography>

              {/* Message Details */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip label={`Priority: ${selectedMessage.priority || 'normal'}`} size="small" />
                {selectedMessage.createdAt && (
                  <Chip 
                    label={format(new Date(selectedMessage.createdAt), 'MMM dd, yyyy hh:mm a')} 
                    size="small" 
                    variant="outlined"
                  />
                )}
                {selectedMessage.confidential && (
                  <Chip label="Confidential" color="warning" size="small" />
                )}
              </Box>
            </Box>
          ) : (
            <CircularProgress />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseView}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<ReplyIcon />} 
            onClick={() => handleReplyMessage(selectedMessage?._id)}
          >
            Reply
          </Button>
        </DialogActions>
      </Dialog>

      <Tooltip title="Compose New Message">
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={handleCompose}
          sx={{
            position: 'fixed', bottom: 24, right: 24,
            borderRadius: '50%', width: 56, height: 56, minWidth: 0, boxShadow: 3
          }}
        />
      </Tooltip>
    </Box>
  );
};

export default EmployeeMessages;
