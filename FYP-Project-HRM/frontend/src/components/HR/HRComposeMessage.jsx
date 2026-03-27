// HRComposeMessage.jsx - Enhanced with "Send to All" feature
import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Grid,
  FormControl, InputLabel, Select, MenuItem, Chip,
  FormControlLabel, Checkbox, IconButton, InputAdornment,
  CircularProgress, Alert, Snackbar, Avatar,
  Card, CardContent, Autocomplete, RadioGroup,
  Radio, FormLabel, ToggleButton, ToggleButtonGroup,
  List, ListItem, ListItemText, ListItemAvatar,
  Divider, Collapse
} from '@mui/material';
import {
  Send as SendIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
  PriorityHigh as PriorityIcon,
  Category as CategoryIcon,
  Lock as LockIcon,
  People as PeopleIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';

const HRComposeMessage = ({ onSuccess }) => {
  const navigate = useNavigate();
  
  // Form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]); // For multiple selection
  const [recipientType, setRecipientType] = useState('individual'); // individual, multiple, all, department
  const [priority, setPriority] = useState('normal');
  const [category, setCategory] = useState('general');
  const [confidential, setConfidential] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

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

  // Priority options
  const priorities = [
    { value: 'low', label: 'Low', color: 'success' },
    { value: 'normal', label: 'Normal', color: 'info' },
    { value: 'high', label: 'High', color: 'warning' },
    { value: 'urgent', label: 'Urgent', color: 'error' }
  ];

  // Fetch users for recipient selection
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await axiosInstance.get('/messages/employee/users/list');
        
        if (response.data.success) {
          const allUsers = response.data.data || [];
          console.log('👥 Loaded users:', allUsers.length);
          setUsers(allUsers);
          
          // Extract unique departments
          const deptSet = new Set();
          allUsers.forEach(user => {
            if (user.department) deptSet.add(user.department);
          });
          setDepartments(Array.from(deptSet).sort());
        }
      } catch (error) {
        console.error('❌ Error fetching users:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load users',
          severity: 'error'
        });
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    try {
      setLoading(true);
      
      // Validate form
      if (!subject.trim()) {
        throw new Error('Subject is required');
      }
      
      if (!message.trim()) {
        throw new Error('Message content is required');
      }
      
      // Validate based on recipient type
      let recipientData = {};
      
      switch (recipientType) {
        case 'individual':
          if (!selectedUser) throw new Error('Please select a recipient');
          recipientData = {
            recipientId: selectedUser._id,
            recipientType: 'individual',
            recipientName: selectedUser.name
          };
          break;
          
        case 'multiple':
          if (selectedUsers.length === 0) throw new Error('Please select at least one recipient');
          recipientData = {
            recipientIds: selectedUsers.map(user => user._id),
            recipientType: 'multiple',
            recipientCount: selectedUsers.length
          };
          break;
          
        case 'department':
          if (!selectedDepartment) throw new Error('Please select a department');
          const deptUsers = users.filter(user => user.department === selectedDepartment);
          recipientData = {
            department: selectedDepartment,
            recipientIds: deptUsers.map(user => user._id),
            recipientType: 'department',
            recipientCount: deptUsers.length
          };
          break;
          
        case 'all':
          // Filter out HR/Admin if needed, or send to all
          const allEmployees = users.filter(user => !['hr', 'admin'].includes(user.role));
          recipientData = {
            recipientIds: allEmployees.map(user => user._id),
            recipientType: 'all',
            recipientCount: allEmployees.length,
            broadcast: true
          };
          break;
          
        default:
          throw new Error('Invalid recipient type');
      }
      
      // Construct the form data
      const formData = {
        subject: subject.trim(),
        message: message.trim(),
        priority: priority,
        category: category,
        confidential: confidential,
        ...recipientData
      };
      
      console.log('📤 Sending message data:', formData);
      
      // Make the API call - NOTE: You'll need to update your backend to handle multiple recipients
      const response = await axiosInstance.post('/messages/send', formData);
      
      console.log('✅ Message sent successfully:', response.data);
      
      // Show success message
      setSnackbar({
        open: true,
        message: `Message sent to ${getRecipientCountText(recipientData)} successfully!`,
        severity: 'success'
      });
      
      // Reset form
      resetForm();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      } else {
        // Navigate back after a delay
        setTimeout(() => {
          navigate('/hr/messages');
        }, 1500);
      }
      
    } catch (error) {
      console.error('❌ Send message error:', error);
      
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.message || 'Failed to send message',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get recipient count text
  const getRecipientCountText = (recipientData) => {
    switch (recipientData.recipientType) {
      case 'individual':
        return '1 recipient';
      case 'multiple':
        return `${recipientData.recipientCount} recipients`;
      case 'department':
        return `${recipientData.recipientCount} people in ${recipientData.department}`;
      case 'all':
        return `all ${recipientData.recipientCount} employees`;
      default:
        return 'recipients';
    }
  };

  // Reset form
  const resetForm = () => {
    setSubject('');
    setMessage('');
    setSelectedUser(null);
    setSelectedUsers([]);
    setRecipientType('individual');
    setPriority('normal');
    setCategory('general');
    setConfidential(false);
    setSelectedDepartment('');
  };

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Handle user selection for multiple mode
  const handleMultipleUserSelect = (event, value) => {
    setSelectedUsers(value);
  };

  // Handle recipient type change
  const handleRecipientTypeChange = (event) => {
    const newType = event.target.value;
    setRecipientType(newType);
    
    // Clear selections when changing type
    if (newType !== 'multiple') setSelectedUsers([]);
    if (newType !== 'individual') setSelectedUser(null);
    if (newType !== 'department') setSelectedDepartment('');
  };

  // Get recipient summary text
  const getRecipientSummary = () => {
    switch (recipientType) {
      case 'individual':
        return selectedUser ? `${selectedUser.name} (${selectedUser.employeeId})` : 'No recipient selected';
      case 'multiple':
        return selectedUsers.length > 0 
          ? `${selectedUsers.length} selected` 
          : 'No recipients selected';
      case 'department':
        return selectedDepartment 
          ? `${selectedDepartment} department` 
          : 'No department selected';
      case 'all':
        const employeeCount = users.filter(u => !['hr', 'admin'].includes(u.role)).length;
        return `All ${employeeCount} employees`;
      default:
        return 'Select recipients';
    }
  };

  // Render recipient selection based on type
  const renderRecipientSelector = () => {
    switch (recipientType) {
      case 'individual':
        return (
          <Autocomplete
            options={users}
            getOptionLabel={(option) => 
              `${option.name} (${option.employeeId || 'ID'}) - ${option.department || 'No Dept'}`
            }
            value={selectedUser}
            onChange={(event, value) => setSelectedUser(value)}
            loading={loadingUsers}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Recipient *"
                required
                placeholder="Search by name, employee ID, or department"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <>
                      {loadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  )
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <ListItemAvatar>
                  <Avatar 
                    sx={{ 
                      bgcolor: option.role === 'hr' ? '#1976d2' : 
                              option.role === 'admin' ? '#d32f2f' : '#4caf50'
                    }}
                  >
                    {option.name?.charAt(0) || 'U'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {option.name}
                      {option.role === 'hr' && (
                        <Chip label="HR" size="small" sx={{ ml: 1 }} />
                      )}
                      {option.role === 'admin' && (
                        <Chip label="Admin" size="small" color="error" sx={{ ml: 1 }} />
                      )}
                    </Box>
                  }
                  secondary={`${option.employeeId} • ${option.department || 'No Department'}`}
                />
              </Box>
            )}
          />
        );

      case 'multiple':
        return (
          <Autocomplete
            multiple
            options={users}
            getOptionLabel={(option) => 
              `${option.name} (${option.employeeId || 'ID'})`
            }
            value={selectedUsers}
            onChange={handleMultipleUserSelect}
            loading={loadingUsers}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Recipients *"
                placeholder="Search and select multiple recipients"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <PeopleIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <>
                      {loadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  )
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <ListItemAvatar>
                  <Avatar 
                    sx={{ 
                      bgcolor: option.role === 'hr' ? '#1976d2' : 
                              option.role === 'admin' ? '#d32f2f' : '#4caf50'
                    }}
                  >
                    {option.name?.charAt(0) || 'U'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={option.name}
                  secondary={`${option.employeeId} • ${option.department || 'No Department'}`}
                />
              </Box>
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  avatar={<Avatar>{option.name?.charAt(0)}</Avatar>}
                  label={option.name}
                  size="small"
                  {...getTagProps({ index })}
                  key={option._id}
                />
              ))
            }
          />
        );

      case 'department':
        return (
          <FormControl fullWidth>
            <InputLabel>Select Department *</InputLabel>
            <Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              label="Select Department *"
              startAdornment={
                <InputAdornment position="start">
                  <GroupIcon color="action" />
                </InputAdornment>
              }
            >
              <MenuItem value="">
                <em>Select a department</em>
              </MenuItem>
              {departments.map((dept) => {
                const deptCount = users.filter(u => u.department === dept).length;
                return (
                  <MenuItem key={dept} value={dept}>
                    {dept} ({deptCount} {deptCount === 1 ? 'person' : 'people'})
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        );

      case 'all':
        const employeeCount = users.filter(u => !['hr', 'admin'].includes(u.role)).length;
        return (
          <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Send to All Employees
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              This message will be sent to all {employeeCount} employees in the system.
              HR and Admin personnel will not receive this broadcast.
            </Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>
              <WarningIcon fontSize="small" />
              <Typography variant="body2">
                Use this option carefully. This will send to {employeeCount} recipients.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <SendIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Compose HR Message
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          {/* Recipient Type Selection */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Select Recipient Type</FormLabel>
                <RadioGroup
                  row
                  value={recipientType}
                  onChange={handleRecipientTypeChange}
                  sx={{ mt: 1 }}
                >
                  <FormControlLabel 
                    value="individual" 
                    control={<Radio />} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
                        Individual
                      </Box>
                    } 
                  />
                  <FormControlLabel 
                    value="multiple" 
                    control={<Radio />} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PeopleIcon sx={{ mr: 1, fontSize: 20 }} />
                        Multiple
                      </Box>
                    } 
                  />
                  <FormControlLabel 
                    value="department" 
                    control={<Radio />} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <GroupIcon sx={{ mr: 1, fontSize: 20 }} />
                        Department
                      </Box>
                    } 
                  />
                  <FormControlLabel 
                    value="all" 
                    control={<Radio />} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PeopleIcon sx={{ mr: 1, fontSize: 20 }} />
                        All Employees
                      </Box>
                    } 
                  />
                </RadioGroup>
              </FormControl>
              
              {/* Recipient Summary */}
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  📬 Recipients: {getRecipientSummary()}
                </Typography>
              </Box>
            </Grid>

            {/* Recipient Selector */}
            <Grid item xs={12}>
              {renderRecipientSelector()}
            </Grid>

            {/* Subject */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subject *"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder="Enter message subject"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CategoryIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Category and Priority */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  label="Category"
                  startAdornment={
                    <InputAdornment position="start">
                      <span style={{ marginRight: 8 }}>
                        {hrCategories[category]?.icon || '📧'}
                      </span>
                    </InputAdornment>
                  }
                >
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

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  label="Priority"
                  startAdornment={
                    <InputAdornment position="start">
                      <PriorityIcon 
                        color={ 
                          priority === 'urgent' ? 'error' : 
                          priority === 'high' ? 'warning' : 
                          priority === 'normal' ? 'info' : 'success'
                        } 
                      />
                    </InputAdornment>
                  }
                >
                  {priorities.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Chip 
                        label={option.label} 
                        size="small" 
                        color={option.color}
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Message Content */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Message *"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                multiline
                rows={8}
                placeholder="Type your message here..."
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    alignItems: 'flex-start'
                  }
                }}
              />
            </Grid>

            {/* Advanced Options */}
            <Grid item xs={12}>
              <Button
                startIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setShowAdvanced(!showAdvanced)}
                size="small"
                sx={{ mb: 1 }}
              >
                Advanced Options
              </Button>
              
              <Collapse in={showAdvanced}>
                <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={confidential}
                        onChange={(e) => setConfidential(e.target.checked)}
                        icon={<LockIcon color="disabled" />}
                        checkedIcon={<LockIcon color="primary" />}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2">Mark as Confidential</Typography>
                        <Chip 
                          label="HR Eyes Only" 
                          size="small" 
                          color="warning" 
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    }
                  />
                </Box>
              </Collapse>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={resetForm}
                  disabled={loading}
                >
                  Clear
                </Button>
                <Button
                  variant="contained"
                  type="submit"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  disabled={loading}
                  sx={{
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                    minWidth: 120
                  }}
                >
                  {loading ? 'Sending...' : 'Send Message'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>

        {/* Tips Card */}
        <Card sx={{ mt: 4, bgcolor: '#f5f5f5' }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              💡 Tips for effective HR communication:
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              • <strong>Individual:</strong> For personalized messages, feedback, or sensitive matters<br />
              • <strong>Multiple:</strong> For team announcements or project updates<br />
              • <strong>Department:</strong> For department-wide communications<br />
              • <strong>All Employees:</strong> For company-wide announcements, policy changes, or celebrations<br />
              • Use appropriate categories for better tracking and filtering<br />
              • Mark urgent messages with high priority<br />
              • Keep confidential information marked as such<br />
              • Proofread before sending broadcast messages
            </Typography>
          </CardContent>
        </Card>
      </Paper>

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

export default HRComposeMessage;