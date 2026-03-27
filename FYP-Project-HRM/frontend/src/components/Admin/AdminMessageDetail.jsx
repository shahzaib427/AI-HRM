import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';                    // ✅ ADD LINE 1
import axiosInstance from '../../utils/axiosInstance';     
import {
  Box, Paper, Typography, Grid, Card, CardContent,
  Button, Chip, Avatar, Divider, TextField,
  IconButton, Tooltip, Alert, CircularProgress,
  List, ListItem, ListItemAvatar, ListItemText,
  FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, Badge, Accordion, AccordionSummary, AccordionDetails,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, AlertTitle
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
  Escalator as EscalateIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  VerifiedUser as VerifiedIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
  SupervisorAccount as SupervisorIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  Timeline as TimelineIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow, isBefore } from 'date-fns';
import axios from 'axios';

const AdminMessageDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('pending');
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [users, setUsers] = useState([]);
  const [noteDialog, setNoteDialog] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [auditLog, setAuditLog] = useState([]);
  const [escalateDialog, setEscalateDialog] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [statusHistory, setStatusHistory] = useState([]);

  // Admin-specific status colors
  const statusColors = {
    'new': 'info',
    'in-progress': 'warning',
    'review': 'secondary',
    'escalated': 'error',
    'resolved': 'success',
    'closed': 'default',
    'pending-approval': 'secondary',
    'awaiting-documents': 'warning',
    'under-investigation': 'warning',
    'action-required': 'error'
  };

  // Priority colors
  const priorityColors = {
    'urgent': 'error',
    'high': 'warning',
    'normal': 'info',
    'low': 'success'
  };

  // Admin message categories
  const adminCategories = {
    'system': { label: 'System Issue', icon: '🖥️', color: '#2196F3' },
    'security': { label: 'Security Concern', icon: '🔒', color: '#F44336' },
    'policy': { label: 'Policy Violation', icon: '📋', color: '#FF9800' },
    'compliance': { label: 'Compliance Issue', icon: '⚖️', color: '#4CAF50' },
    'resource': { label: 'Resource Request', icon: '🔄', color: '#9C27B0' },
    'budget': { label: 'Budget/Finance', icon: '💰', color: '#795548' },
    'infrastructure': { label: 'Infrastructure', icon: '🏢', color: '#607D8B' },
    'vendor': { label: 'Vendor/External', icon: '🤝', color: '#3F51B5' },
    'audit': { label: 'Audit Trail', icon: '📊', color: '#000000' },
    'executive': { label: 'Executive Request', icon: '👔', color: '#1976D2' },
    'general': { label: 'General Admin', icon: '📧', color: '#9E9E9E' }
  };

  // Fetch message details
const fetchMessage = async () => {
  try {
    setLoading(true);
    const response = await axiosInstance.get(`/messages/${id}`);
    setMessage(response.data.data);
    console.log('✅ Message loaded:', response.data.data);
  } catch (error) {
    console.error('Error fetching message:', error);
    toast.error(error.response?.data?.message || 'Failed to load message');
  } finally {
    setLoading(false);
  }
};


  // Fetch users for assignment
const fetchUsers = async () => {
  try {
    const response = await axiosInstance.get('/messages/users/list', {
      params: { role: 'admin' }
    });
    if (response.data.success) {
      setUsers(response.data.data || []);
    }
  } catch (err) {
    console.error('Error fetching users:', err);
  }
};


  // Check SLA status
  const checkSLA = () => {
    if (!message?.slaDeadline) return null;
    
    const now = new Date();
    const deadline = new Date(message.slaDeadline);
    const hoursRemaining = Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursRemaining < 24) {
      return { status: 'critical', label: `${Math.round(hoursRemaining)}h remaining`, color: 'error' };
    } else if (hoursRemaining < 72) {
      return { status: 'warning', label: `${Math.round(hoursRemaining / 24)} days remaining`, color: 'warning' };
    } else {
      return { status: 'ok', label: 'On track', color: 'success' };
    }
  };

  useEffect(() => {
    fetchMessage();
    fetchUsers();
    
    // Refresh message every 30 seconds if it's not resolved
    const interval = setInterval(() => {
      if (message && !['resolved', 'closed'].includes(message.status)) {
        fetchMessage();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [id]);

  // Handle reply submission
  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      setError('Please enter a reply message');
      return;
    }

    setSendingReply(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await axiosInstance.post(`/messages/${id}/reply`,{
        message: replyText,
        status: replyStatus,
        adminComment: replyStatus !== 'pending' ? `Status changed to: ${replyStatus}` : undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setReplyText('');
        setReplyStatus('pending');
        fetchMessage(); // Refresh message
      } else {
        setError(response.data.message || 'Failed to send reply');
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      setError(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  // Handle assignment
  const handleAssign = async () => {
    if (!assignTo) {
      setError('Please select a user to assign');
      return;
    }

    setAssigning(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await axiosInstance.put(`/messages/${id}`,{
        assignedTo: assignTo
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAssignDialog(false);
        setAssignTo('');
        fetchMessage();
      } else {
        setError(response.data.message || 'Failed to assign message');
      }
    } catch (err) {
      console.error('Error assigning message:', err);
      setError(err.response?.data?.message || 'Failed to assign message');
    } finally {
      setAssigning(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axiosInstance.put(`/messages/${id}`,{
        status: newStatus,
        adminComment: `Status changed to: ${newStatus}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        fetchMessage();
      } else {
        setError(response.data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Add internal note
  const handleAddNote = async () => {
    if (!internalNote.trim()) {
      setError('Please enter a note');
      return;
    }

    setSavingNote(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await axiosInstance.put(`/messages/${id}`,{
        addNote: internalNote
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setNoteDialog(false);
        setInternalNote('');
        fetchMessage();
      } else {
        setError(response.data.message || 'Failed to add note');
      }
    } catch (err) {
      console.error('Error adding note:', err);
      setError(err.response?.data?.message || 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  // Handle escalation
  const handleEscalate = async () => {
    if (!escalationReason.trim()) {
      setError('Please provide a reason for escalation');
      return;
    }

    setEscalating(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(`/messages/${id}/escalate`, {
        reason: escalationReason,
        escalateTo: assignTo // Or specific user ID
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setEscalateDialog(false);
        setEscalationReason('');
        setAssignTo('');
        fetchMessage();
      } else {
        setError(response.data.message || 'Failed to escalate');
      }
    } catch (err) {
      console.error('Error escalating:', err);
      setError(err.response?.data?.message || 'Failed to escalate');
    } finally {
      setEscalating(false);
    }
  };

  // Download attachment
  const handleDownloadAttachment = async (attachment) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`/messages/${id}/attachments/${attachment.filename}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.originalname);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading attachment:', err);
      setError('Failed to download attachment');
    }
  };

  // Get current admin user
  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const currentUser = getCurrentUser();
  const slaStatus = checkSLA();

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Loading message details...
        </Typography>
      </Box>
    );
  }

  if (error && !message) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => navigate(-1)}
              startIcon={<BackIcon />}
            >
              Go Back
            </Button>
          }
        >
          <AlertTitle>Error Loading Message</AlertTitle>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!message) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Message not found or you don't have permission to view it.
        </Alert>
        <Button 
          startIcon={<BackIcon />} 
          onClick={() => navigate(-1)} 
          sx={{ mt: 2 }}
        >
          Back to Messages
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with SLA Warning */}
      {slaStatus?.status === 'critical' && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          icon={<PriorityIcon />}
        >
          <AlertTitle>⚠️ SLA Deadline Approaching</AlertTitle>
          {slaStatus.label} - Please take immediate action
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <BackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {message.subject}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`Ref: ${message.referenceNumber}`} 
              size="small" 
              icon={<VerifiedIcon />}
              sx={{ fontFamily: 'monospace' }}
            />
            <Chip 
              label={adminCategories[message.category]?.label || message.category} 
              size="small" 
              variant="outlined"
              sx={{ 
                borderColor: adminCategories[message.category]?.color,
                color: adminCategories[message.category]?.color
              }}
            />
            <Chip 
              label={message.status} 
              color={statusColors[message.status] || 'default'}
              size="small"
              sx={{ textTransform: 'capitalize' }}
            />
            <Chip 
              label={message.priority} 
              color={priorityColors[message.priority]}
              size="small"
              icon={<PriorityIcon />}
            />
            {slaStatus && (
              <Chip 
                label={slaStatus.label} 
                color={slaStatus.color}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<ReplyIcon />}
            onClick={() => document.getElementById('reply-section').scrollIntoView()}
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
        {/* Left Column - Message Details & Conversation */}
        <Grid item xs={12} md={8}>
          {/* Original Message Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ width: 56, height: 56, mr: 2, bgcolor: '#1976d2' }}>
                    {message.sender?.name?.charAt(0) || 'S'}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {message.sender?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {message.sender?.employeeId} • {message.sender?.department}
                      {message.sender?.position && ` • ${message.sender.position}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(message.sentAt), 'PPpp')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">
                    To: {message.recipient}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Type: {message.recipientType}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Message Content */}
              <Typography 
                variant="body1" 
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  fontSize: '0.95rem'
                }}
              >
                {message.message}
              </Typography>

              {/* Attachments */}
              {message.attachments?.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <AttachIcon sx={{ mr: 1 }} />
                    Attachments ({message.attachments.length})
                  </Typography>
                  <Grid container spacing={1}>
                    {message.attachments.map((file, index) => (
                      <Grid item xs={12} sm={6} key={index}>
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p: 1.5, 
                            display: 'flex', 
                            alignItems: 'center',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                          onClick={() => handleDownloadAttachment(file)}
                        >
                          <AttachIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {file.originalname}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </Typography>
                          </Box>
                          <DownloadIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Conversation Thread */}
          {message.responses?.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <HistoryIcon sx={{ mr: 1 }} />
                  Conversation History ({message.responses.length} responses)
                </Typography>
                <List sx={{ bgcolor: 'background.paper' }}>
                  {message.responses.map((response, index) => (
                    <React.Fragment key={response._id || index}>
                      <ListItem alignItems="flex-start" sx={{ py: 2 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ 
                            bgcolor: response.sender.role === 'admin' ? '#1976D2' : 
                                    response.sender.role === 'hr' ? '#7B1FA2' : '#4CAF50'
                          }}>
                            {response.sender.name?.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {response.sender.name}
                                </Typography>
                                <Chip
                                  label={response.sender.role.toUpperCase()}
                                  size="small"
                                  sx={{ ml: 0, mt: 0.5 }}
                                  color={response.sender.role === 'admin' ? 'primary' : 'secondary'}
                                />
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(response.respondedAt), 'PPpp')}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.primary"
                                sx={{ 
                                  whiteSpace: 'pre-wrap',
                                  display: 'block',
                                  mt: 1
                                }}
                              >
                                {response.message}
                              </Typography>
                              
                              {response.adminComment && (
                                <Paper 
                                  variant="outlined" 
                                  sx={{ 
                                    p: 1.5, 
                                    mt: 1.5, 
                                    bgcolor: 'warning.50',
                                    borderColor: 'warning.200'
                                  }}
                                >
                                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.800' }}>
                                    Admin Comment:
                                  </Typography>
                                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    {response.adminComment}
                                  </Typography>
                                </Paper>
                              )}
                              
                              {response.status && response.status !== 'pending' && (
                                <Chip
                                  label={`Status: ${response.status}`}
                                  size="small"
                                  sx={{ mt: 1 }}
                                  color={response.status === 'approved' ? 'success' : 'error'}
                                />
                              )}
                              
                              {response.attachments?.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Attachments: {response.attachments.map(a => a.originalname).join(', ')}
                                  </Typography>
                                </Box>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                      {index < message.responses.length - 1 && (
                        <Divider variant="inset" component="li" />
                      )}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Reply Section */}
          <Card id="reply-section">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <ReplyIcon sx={{ mr: 1 }} />
                Send Reply
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={6}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
                sx={{ mb: 2 }}
                disabled={sendingReply}
              />
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Response Status</InputLabel>
                    <Select
                      value={replyStatus}
                      onChange={(e) => setReplyStatus(e.target.value)}
                      label="Response Status"
                      disabled={sendingReply}
                    >
                      <MenuItem value="pending">Pending Review</MenuItem>
                      <MenuItem value="acknowledged">Acknowledged</MenuItem>
                      <MenuItem value="in-progress">In Progress</MenuItem>
                      <MenuItem value="approved">Approved</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                      <MenuItem value="escalated">Escalated</MenuItem>
                      <MenuItem value="resolved">Resolved</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      onClick={() => setEscalateDialog(true)}
                      startIcon={<EscalateIcon />}
                      disabled={sendingReply}
                    >
                      Escalate
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={sendingReply ? <CircularProgress size={20} /> : <SendIcon />}
                      onClick={handleSubmitReply}
                      disabled={!replyText.trim() || sendingReply}
                      sx={{ minWidth: 120 }}
                    >
                      {sendingReply ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Sender Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} />
                Sender Information
              </Typography>
              
              <List dense disablePadding>
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemText
                    primary="Name"
                    secondary={
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {message.sender?.name || 'N/A'}
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemText
                    primary="Employee ID"
                    secondary={message.sender?.employeeId || 'N/A'}
                  />
                </ListItem>
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemText
                    primary="Department"
                    secondary={message.sender?.department || 'N/A'}
                  />
                </ListItem>
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemText
                    primary="Position"
                    secondary={message.sender?.position || 'N/A'}
                  />
                </ListItem>
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemText
                    primary="Email"
                    secondary={message.sender?.email || 'N/A'}
                  />
                </ListItem>
                {message.sender?.phone && (
                  <ListItem disablePadding sx={{ py: 0.5 }}>
                    <ListItemText
                      primary="Phone"
                      secondary={message.sender.phone}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>

          {/* Message Metadata */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <EmailIcon sx={{ mr: 1 }} />
                Message Details
              </Typography>
              
              <List dense disablePadding>
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemText
                    primary="Reference"
                    secondary={
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                        {message.referenceNumber}
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemText
                    primary="Sent"
                    secondary={format(new Date(message.sentAt), 'PPpp')}
                  />
                </ListItem>
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemText
                    primary="Last Updated"
                    secondary={format(new Date(message.lastUpdated || message.sentAt), 'PPpp')}
                  />
                </ListItem>
                {message.readAt && (
                  <ListItem disablePadding sx={{ py: 0.5 }}>
                    <ListItemText
                      primary="First Read"
                      secondary={format(new Date(message.readAt), 'PPpp')}
                    />
                  </ListItem>
                )}
                {message.resolvedAt && (
                  <ListItem disablePadding sx={{ py: 0.5 }}>
                    <ListItemText
                      primary="Resolved"
                      secondary={format(new Date(message.resolvedAt), 'PPpp')}
                    />
                  </ListItem>
                )}
                {message.slaDeadline && (
                  <ListItem disablePadding sx={{ py: 0.5 }}>
                    <ListItemText
                      primary="SLA Deadline"
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {format(new Date(message.slaDeadline), 'PPpp')}
                          {slaStatus && (
                            <Chip 
                              label={slaStatus.label} 
                              size="small" 
                              color={slaStatus.color}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>

          {/* Assignment & Quick Actions */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assignment & Actions
              </Typography>
              
              {/* Current Assignment */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <AssignmentIcon sx={{ mr: 1, fontSize: 16 }} />
                  Assigned To:
                </Typography>
                {message.assignedTo ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, mr: 2, fontSize: '0.875rem' }}>
                      {message.assignedTo.name?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {message.assignedTo.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {message.assignedTo.role} • {message.assignedTo.assignedAt && 
                          format(new Date(message.assignedTo.assignedAt), 'MMM dd')
                        }
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Alert severity="warning" sx={{ py: 1 }}>
                    Not assigned
                  </Alert>
                )}
              </Box>

              {/* Quick Status Actions */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Quick Status Update:
                </Typography>
                <Grid container spacing={1}>
                  {['in-progress', 'review', 'resolved', 'closed'].map((status) => (
                    <Grid item xs={6} key={status}>
                      <Button
                        fullWidth
                        variant={message.status === status ? "contained" : "outlined"}
                        size="small"
                        onClick={() => handleStatusChange(status)}
                        disabled={message.status === status}
                        sx={{ 
                          textTransform: 'capitalize',
                          ...(message.status === status && {
                            bgcolor: `${statusColors[status]}.main`,
                            '&:hover': { bgcolor: `${statusColors[status]}.dark` }
                          })
                        }}
                      >
                        {status}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* Escalation Info */}
              {message.escalatedTo && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'error.50', borderRadius: 1, border: '1px solid', borderColor: 'error.100' }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: 'error.800', display: 'flex', alignItems: 'center' }}>
                    <EscalateIcon sx={{ mr: 1, fontSize: 16 }} />
                    Escalated To:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {message.escalatedTo.name}
                  </Typography>
                  <Typography variant="caption" color="error.600" sx={{ display: 'block', mt: 0.5 }}>
                    Reason: {message.escalatedTo.reason}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {message.escalatedTo.escalatedAt && 
                      format(new Date(message.escalatedTo.escalatedAt), 'PPpp')
                    }
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Internal Notes */}
          {message.internalNotes?.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <NoteIcon sx={{ mr: 1 }} />
                  Internal Notes ({message.internalNotes.length})
                </Typography>
                
                <List dense disablePadding>
                  {message.internalNotes.map((note, index) => (
                    <React.Fragment key={index}>
                      <ListItem disablePadding sx={{ py: 1 }}>
                        <ListItemText
                          primary={
                            <Typography variant="body2">
                              {note.note}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {note.createdBy?.name} • {format(new Date(note.createdAt), 'PPpp')}
                              {note.isPrivate && ' • 🔒 Private'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < message.internalNotes.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Dialogs */}
      {/* Assignment Dialog */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Message</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Assign To User</InputLabel>
            <Select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              label="Assign To User"
              disabled={assigning}
            >
              {users.map(user => (
                <MenuItem key={user._id} value={user._id}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ width: 24, height: 24, mr: 2, fontSize: '0.75rem' }}>
                      {user.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">{user.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.role} • {user.department}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Assigning will transfer responsibility for this message.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)} disabled={assigning}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            variant="contained" 
            disabled={!assignTo || assigning}
          >
            {assigning ? <CircularProgress size={20} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Internal Note Dialog */}
      <Dialog open={noteDialog} onClose={() => setNoteDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Internal Note</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={6}
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder="Add a private note about this message..."
            sx={{ mt: 2 }}
            disabled={savingNote}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            This note will only be visible to administrators.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog(false)} disabled={savingNote}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddNote} 
            variant="contained" 
            disabled={!internalNote.trim() || savingNote}
          >
            {savingNote ? <CircularProgress size={20} /> : 'Add Note'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Escalation Dialog */}
      <Dialog open={escalateDialog} onClose={() => setEscalateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Escalate Message</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Escalate To</InputLabel>
            <Select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              label="Escalate To"
              disabled={escalating}
            >
              {users
                .filter(user => user.role === 'admin' || user.role === 'executive')
                .map(user => (
                  <MenuItem key={user._id} value={user._id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ width: 24, height: 24, mr: 2, fontSize: '0.75rem' }}>
                        {user.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">{user.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.role} • {user.department}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))
              }
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={escalationReason}
            onChange={(e) => setEscalationReason(e.target.value)}
            placeholder="Reason for escalation..."
            disabled={escalating}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Escalation will notify higher-level administrators and may change message priority.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEscalateDialog(false)} disabled={escalating}>
            Cancel
          </Button>
          <Button 
            onClick={handleEscalate} 
            variant="contained" 
            color="error"
            disabled={!assignTo || !escalationReason.trim() || escalating}
          >
            {escalating ? <CircularProgress size={20} /> : 'Escalate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminMessageDetail;