import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import {
  Box, Paper, Typography, Grid, TextField, Button,
  FormControl, InputLabel, Select, MenuItem, Chip,
  Alert, CircularProgress, Autocomplete, Divider,
  FormHelperText, Card, CardContent
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  PriorityHigh as PriorityIcon,
  AttachFile as AttachIcon
} from '@mui/icons-material';

const AdminComposeMessage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    recipientId: '',
    subject: '',
    message: '',
    category: 'general',
    priority: 'normal',
    requireApproval: false,
    isInternal: false
  });

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/messages/users/list');
      setUsers(response.data.data);
      console.log('👥 Loaded users:', response.data.data?.length);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

// AdminComposeMessage.jsx - Update the handleSubmit function
const handleSubmit = async (e) => { 
  e.preventDefault();
  setLoading(true);

  try {
    const recipientId = formData.recipientId || formData.recipient || '';
    
    const messageData = {
      subject: formData.subject?.trim() || '',
      message: formData.message?.trim() || '',
      recipientId: recipientId, // This is the single recipient ID
      recipientType: 'individual', // ✅ Change from 'employee' to 'individual'
      priority: formData.priority || 'normal',
      category: formData.category || 'general'
    };

    console.log('📤 SENDING:', messageData);

    const response = await axiosInstance.post('/messages/send', messageData);

    toast.success('✅ Message sent successfully!');
    
    setFormData({ 
      recipientId: '',
      subject: '', 
      message: '', 
      priority: 'normal', 
      category: 'general',
      requireApproval: false,
      isInternal: false
    });
    
    navigate(-1);
    
  } catch (error) {
    console.error('❌ Error sending message:', error.response?.data || error.message);
    toast.error(error.response?.data?.message || 'Failed to send message');
  } finally {
    setLoading(false);
  }
};

  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const currentUser = getCurrentUser();

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1a237e' }}>
        📨 Compose Message (HR/Admin)
      </Typography>

      <Grid container spacing={3}>
        {/* LEFT: Form */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              {/* ✅ RECIPIENT - Autocomplete */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <Autocomplete
                  options={users}
                  getOptionLabel={(option) => `${option.name} (${option.employeeId}) - ${option.role}`}
                  value={users.find(u => u._id === formData.recipientId) || null}
                  onChange={(e, newValue) => setFormData(prev => ({
                    ...prev,
                    recipientId: newValue?._id || '',
                  }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Recipient *"
                      required
                      helperText="Choose employee to send message to"
                    />
                  )}
                />
              </FormControl>

              {/* ✅ SUBJECT */}
              <TextField
                fullWidth
                label="Subject *"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                required
                sx={{ mb: 3 }}
              />

              {/* ✅ CATEGORY & PRIORITY */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.category}
                      label="Category"
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <MenuItem value="general">General</MenuItem>
                      <MenuItem value="announcement">Announcement</MenuItem>
                      <MenuItem value="policy">Policy</MenuItem>
                      <MenuItem value="warning">Warning</MenuItem>
                      <MenuItem value="appreciation">Appreciation</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={formData.priority}
                      label="Priority"
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="normal">Normal</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* ✅ MESSAGE */}
              <TextField
                fullWidth
                multiline
                rows={8}
                label="Message *"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                required
                sx={{ mb: 3 }}
                placeholder={`Dear Team Member,

Please type your message here...

Best regards,
${currentUser?.name || 'HR Team'}`}
              />

              {/* ✅ BUTTONS */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                  disabled={loading || !formData.recipientId || !formData.subject || !formData.message}
                >
                  {loading ? 'Sending...' : 'Send Message'}
                </Button>
              </Box>
            </form>
          </Paper>
        </Grid>

        {/* RIGHT: Info Panel */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1, color: '#1976d2' }} />
                Sender
              </Typography>
              <Typography variant="body2"><strong>Name:</strong> {currentUser?.name || 'Admin'}</Typography>
              <Typography variant="body2"><strong>Role:</strong> {currentUser?.role?.toUpperCase()}</Typography>
              <Typography variant="body2"><strong>Today:</strong> {new Date().toLocaleDateString()}</Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>💡 Tips</Typography>
              <ul style={{ paddingLeft: '20px', margin: '0' }}>
                <li><Typography variant="body2">Keep messages clear & professional</Typography></li>
                <li><Typography variant="body2">Use high priority for urgent items</Typography></li>
                <li><Typography variant="body2">Announcements reach all selected users</Typography></li>
              </ul>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminComposeMessage;
