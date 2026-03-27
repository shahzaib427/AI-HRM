import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Grid, Card, CardContent,
  Button, Chip, Avatar, Divider, TextField,
  IconButton, Tooltip, Alert, CircularProgress,
  List, ListItem, ListItemAvatar, ListItemText,
  FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, Badge
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Reply as ReplyIcon,
  Assignment as AssignIcon,
  CheckCircle as ResolveIcon,
  PriorityHigh as PriorityIcon,
  AttachFile as AttachIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Email as EmailIcon,
  Send as SendIcon,
  NoteAdd as NoteIcon,
  Escalator as EscalateIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import axiosInstance from '../../utils/axiosInstance'; // ✅ Use your axiosInstance

// Status colors
const statusColors = {
  'new': 'info',
  'sent': 'info',
  'read': 'primary',
  'in-progress': 'warning',
  'awaiting-approval': 'secondary',
  'resolved': 'success',
  'closed': 'default',
  'deleted': 'error'
};

// Priority colors
const priorityColors = {
  'urgent': 'error',
  'high': 'warning',
  'normal': 'info',
  'low': 'success'
};

const MessageDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('pending');
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [users, setUsers] = useState([]);
  const [noteDialog, setNoteDialog] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch message details
  const fetchMessage = async () => {
    try {
      setLoading(true);
      console.log(`📨 Fetching message ${id}...`);
      
      // ✅ Use axiosInstance
      const response = await axiosInstance.get(`/messages/${id}`);
      
      console.log('📥 Message response:', response.data);
      if (response.data.success) {
        setMessage(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch message');
      }
    } catch (error) {
      console.error('❌ Error fetching message:', error.response?.data || error.message);
      showSnackbar(error.response?.data?.message || 'Failed to load message', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for assignment
  const fetchUsers = async () => {
    try {
      console.log('👥 Fetching users list...');
      
      // ✅ Use axiosInstance
      const response = await axiosInstance.get('/messages/users/list');
      
      console.log(`✅ Found ${response.data.data?.length} users`);
      if (response.data.success) {
        setUsers(response.data.data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error.response?.data || error.message);
      // Fallback to mock users
      setUsers([
        { _id: '1', name: 'HR Manager', role: 'hr', email: 'hr@company.com' },
        { _id: '2', name: 'Admin User', role: 'admin', email: 'admin@company.com' },
        { _id: '3', name: 'Department Head', role: 'manager', email: 'manager@company.com' }
      ]);
    }
  };

  useEffect(() => {
    fetchMessage();
    fetchUsers();
  }, [id]);

  // Handle reply submission
  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      showSnackbar('Please enter a reply message', 'warning');
      return;
    }

    try {
      console.log(`💬 Sending reply to message ${id}...`);
      
      // ✅ Use axiosInstance
      const response = await axiosInstance.post(`/messages/${id}/reply`, {
        message: replyText,
        status: replyStatus
      });

      if (response.data.success) {
        showSnackbar('Reply sent successfully!', 'success');
        setReplyText('');
        setReplyStatus('pending');
        fetchMessage(); // Refresh message
      } else {
        throw new Error(response.data.message || 'Failed to send reply');
      }
    } catch (error) {
      console.error('❌ Error sending reply:', error.response?.data || error.message);
      showSnackbar(error.response?.data?.message || 'Failed to send reply', 'error');
    }
  };

  // Handle assignment
  const handleAssign = async () => {
    if (!assignTo) {
      showSnackbar('Please select a user to assign', 'warning');
      return;
    }

    try {
      console.log(`👤 Assigning message ${id} to user ${assignTo}...`);
      
      const selectedUser = users.find(u => u._id === assignTo);
      
      // ✅ Use axiosInstance with PATCH
      const response = await axiosInstance.patch(`/messages/${id}`, {
        assignedTo: {
          id: assignTo,
          name: selectedUser?.name || 'Unknown',
          role: selectedUser?.role || 'user',
          assignedAt: new Date()
        },
        status: 'in-progress'
      });

      if (response.data.success) {
        showSnackbar('Message assigned successfully!', 'success');
        setAssignDialog(false);
        setAssignTo('');
        fetchMessage();
      } else {
        throw new Error(response.data.message || 'Failed to assign message');
      }
    } catch (error) {
      console.error('❌ Error assigning message:', error.response?.data || error.message);
      showSnackbar(error.response?.data?.message || 'Failed to assign message', 'error');
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    try {
      console.log(`🔄 Changing status to ${newStatus}...`);
      
      // ✅ Use axiosInstance
      const response = await axiosInstance.patch(`/messages/${id}`, {
        status: newStatus,
        ...(newStatus === 'resolved' && { resolvedAt: new Date() }),
        ...(newStatus === 'read' && { readAt: new Date() })
      });

      if (response.data.success) {
        showSnackbar(`Status changed to ${newStatus}`, 'success');
        fetchMessage();
      } else {
        throw new Error(response.data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('❌ Error updating status:', error.response?.data || error.message);
      showSnackbar(error.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  // Add internal note
  const handleAddNote = async () => {
    if (!internalNote.trim()) {
      showSnackbar('Please enter a note', 'warning');
      return;
    }

    try {
      console.log(`📝 Adding internal note...`);
      
      // Get current user
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      
      // ✅ Use axiosInstance
      const response = await axiosInstance.patch(`/messages/${id}`, {
        $push: {
          internalNotes: {
            note: internalNote,
            createdBy: currentUser?._id || 'unknown',
            createdAt: new Date(),
            isPrivate: true
          }
        }
      });

      if (response.data.success) {
        showSnackbar('Note added successfully!', 'success');
        setNoteDialog(false);
        setInternalNote('');
        fetchMessage();
      } else {
        throw new Error(response.data.message || 'Failed to add note');
      }
    } catch (error) {
      console.error('❌ Error adding note:', error.response?.data || error.message);
      showSnackbar(error.response?.data?.message || 'Failed to add note', 'error');
    }
  };

  // Delete message
  const handleDeleteMessage = async () => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      console.log(`🗑️ Deleting message ${id}...`);
      
      // ✅ Use axiosInstance
      const response = await axiosInstance.delete(`/messages/${id}`);

      if (response.data.success) {
        showSnackbar('Message deleted successfully', 'success');
        setTimeout(() => navigate('/hr/messages'), 1000);
      } else {
        throw new Error(response.data.message || 'Failed to delete message');
      }
    } catch (error) {
      console.error('❌ Error deleting message:', error.response?.data || error.message);
      showSnackbar(error.response?.data?.message || 'Failed to delete message', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!message) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Message not found</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/hr/messages')} sx={{ mt: 2 }}>
          Back to Messages
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/hr/messages')} sx={{ mr: 2 }}>
          <BackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {message.subject}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
            <Chip label={`Ref: ${message.referenceNumber || message._id?.substring(0, 8)}`} size="small" />
            <Chip label={message.category} size="small" variant="outlined" />
            <Chip 
              label={message.status} 
              color={statusColors[message.status] || 'default'}
              size="small"
            />
            <Chip 
              label={message.priority} 
              color={priorityColors[message.priority] || 'default'}
              size="small"
              icon={<PriorityIcon />}
            />
            {message.confidential && (
              <Chip label="Confidential" size="small" color="error" variant="outlined" />
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<ReplyIcon />}
            onClick={() => setActiveTab(2)}
          >
            Reply
          </Button>
          <Button
            variant="outlined"
            startIcon={<AssignIcon />}
            onClick={() => setAssignDialog(true)}
          >
            Assign
          </Button>
          <Button
            variant="outlined"
            startIcon={<NoteIcon />}
            onClick={() => setNoteDialog(true)}
          >
            Add Note
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Message Details */}
        <Grid item xs={12} md={8}>
          {/* Original Message */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ width: 48, height: 48, mr: 2, bgcolor: '#1976d2' }}>
                {message.sender?.name?.charAt(0) || 'E'}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {message.sender?.name || 'Unknown Sender'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {message.sender?.employeeId || 'N/A'} • {message.sender?.department || 'N/A'}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {format(new Date(message.sentAt || message.createdAt), 'PPpp')}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
              {message.message}
            </Typography>

            {/* Attachments */}
            {message.attachments?.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  <AttachIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Attachments ({message.attachments.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {message.attachments.map((file, index) => (
                    <Chip
                      key={index}
                      icon={<AttachIcon />}
                      label={`${file.originalname || file.filename} (${file.size ? (file.size / 1024).toFixed(0) : '?'} KB)`}
                      variant="outlined"
                      onClick={() => window.open(`http://localhost:5000/${file.path}`, '_blank')}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>

          {/* Conversation Thread */}
          {message.responses?.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Conversation History ({message.responses.length} replies)
              </Typography>
              <List>
                {message.responses.map((response, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: response.sender?.role === 'hr' ? '#f57c00' : '#388e3c' }}>
                          {response.sender?.name?.charAt(0) || 'U'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {response.sender?.name || 'Unknown'}
                              {response.sender?.role && (
                                <Chip
                                  label={response.sender.role.toUpperCase()}
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(response.respondedAt || response.createdAt), 'PPpp')}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                              sx={{ whiteSpace: 'pre-wrap' }}
                            >
                              {response.message}
                            </Typography>
                            {response.adminComment && (
                              <Box sx={{ mt: 1, p: 1, bgcolor: '#fff3e0', borderRadius: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                  Admin Comment:
                                </Typography>
                                <Typography variant="body2">
                                  {response.adminComment}
                                </Typography>
                              </Box>
                            )}
                            {response.status && response.status !== 'pending' && (
                              <Chip
                                label={`Status: ${response.status}`}
                                size="small"
                                sx={{ mt: 1 }}
                                color={response.status === 'approved' ? 'success' : 'error'}
                              />
                            )}
                          </>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
        </Grid>

        {/* Right Column - Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Sender Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} />
                Sender Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Name"
                    secondary={message.sender?.name || 'Unknown'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Employee ID"
                    secondary={message.sender?.employeeId || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Department"
                    secondary={message.sender?.department || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Email"
                    secondary={message.sender?.email || 'N/A'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Message Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <EmailIcon sx={{ mr: 1 }} />
                Message Details
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Recipient"
                    secondary={message.recipient || 'HR Department'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Category"
                    secondary={message.category || 'general'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Sent"
                    secondary={format(new Date(message.sentAt || message.createdAt), 'PPpp')}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Last Updated"
                    secondary={format(new Date(message.lastUpdated || message.updatedAt || message.createdAt), 'PPpp')}
                  />
                </ListItem>
                {message.readAt && (
                  <ListItem>
                    <ListItemText
                      primary="Read At"
                      secondary={format(new Date(message.readAt), 'PPpp')}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>

          {/* Assignment & Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assignment & Actions
              </Typography>
              
              {/* Assigned To */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Assigned To:
                </Typography>
                {message.assignedTo ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ width: 32, height: 32, mr: 2 }}>
                      {message.assignedTo.name?.charAt(0) || 'U'}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {message.assignedTo.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {message.assignedTo.role}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Alert severity="warning" sx={{ py: 1 }}>
                    Not assigned
                  </Alert>
                )}
              </Box>

              {/* Quick Actions */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Quick Actions:
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      onClick={() => handleStatusChange('in-progress')}
                      disabled={message.status === 'in-progress'}
                    >
                      Start Progress
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="small"
                      color="success"
                      onClick={() => handleStatusChange('resolved')}
                      startIcon={<ResolveIcon />}
                    >
                      Resolve
                    </Button>
                  </Grid>
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={handleDeleteMessage}
                    >
                      Delete Message
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              {/* Status History */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Status Timeline:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Created"
                      secondary={format(new Date(message.createdAt), 'PP')}
                    />
                  </ListItem>
                  {message.readAt && (
                    <ListItem>
                      <ListItemText
                        primary="First Read"
                        secondary={format(new Date(message.readAt), 'PP')}
                      />
                    </ListItem>
                  )}
                  {message.resolvedAt && (
                    <ListItem>
                      <ListItemText
                        primary="Resolved"
                        secondary={format(new Date(message.resolvedAt), 'PP')}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Reply Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          <ReplyIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Send Reply
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Response Status</InputLabel>
            <Select
              value={replyStatus}
              onChange={(e) => setReplyStatus(e.target.value)}
              label="Response Status"
              size="small"
            >
              <MenuItem value="pending">Pending Review</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="escalated">Escalated</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSubmitReply}
            disabled={!replyText.trim()}
          >
            Send Reply
          </Button>
        </Box>
      </Paper>

      {/* Assignment Dialog */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)}>
        <DialogTitle>Assign Message</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, minWidth: 300 }}>
            <InputLabel>Assign To</InputLabel>
            <Select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              label="Assign To"
            >
              <MenuItem value="">Unassign</MenuItem>
              {users.map(user => (
                <MenuItem key={user._id} value={user._id}>
                  {user.name} ({user.role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>Cancel</Button>
          <Button onClick={handleAssign} variant="contained">
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Internal Note Dialog */}
      <Dialog open={noteDialog} onClose={() => setNoteDialog(false)}>
        <DialogTitle>Add Internal Note</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder="Add private note about this message..."
            sx={{ mt: 2, minWidth: 400 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog(false)}>Cancel</Button>
          <Button onClick={handleAddNote} variant="contained">
            Add Note
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      {snackbar.open && (
        <Alert 
          severity={snackbar.severity} 
          onClose={handleCloseSnackbar}
          sx={{ position: 'fixed', bottom: 20, right: 20, minWidth: 300 }}
        >
          {snackbar.message}
        </Alert>
      )}
    </Box>
  );
};

export default MessageDetail;