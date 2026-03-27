import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Typography,
  CircularProgress,
  Grid,
  Chip,
  IconButton,
  Avatar,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider,
  Tooltip,
  InputAdornment,
  Container,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Badge,
  Snackbar,
  LinearProgress
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  PriorityHigh as PriorityHighIcon,
  Category as CategoryIcon,
  Subject as SubjectIcon,
  Message as MessageIcon,
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  DoneAll as DoneAllIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Visibility as VisibilityIcon,
  FormatQuote as FormatQuoteIcon,
  InsertEmoticon as InsertEmoticonIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatListBulleted as FormatListBulletedIcon,
  FormatListNumbered as FormatListNumberedIcon,
  InsertLink as InsertLinkIcon,
  Mic as MicIcon,
  History as HistoryIcon,
  Help as HelpIcon,
  Security as SecurityIcon,
  LocalOffer as TagIcon,
  Drafts as DraftsIcon,
  SmartToy as SmartToyIcon,
  Translate as TranslateIcon,
  AutoFixHigh as AutoFixHighIcon,
  Psychology as PsychologyIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  MoreVert as MoreVertIcon,
  FileCopy as FileCopyIcon,
  DriveFileRenameOutline as TemplateIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ComposeMessage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Main States
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [hrUsers, setHrUsers] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastSentMessage, setLastSentMessage] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('compose');
  const [characterCount, setCharacterCount] = useState(0);
  const [saveAsDraftDialog, setSaveAsDraftDialog] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    recipientType: 'hr',
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
    tags: []
  });

  // API URL
  const API_URL = 'http://localhost:5000';

  // Categories
  const categories = [
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
    { value: 'feedback', label: 'Feedback' }
  ];

  // Priority levels
  const priorities = [
    { value: 'low', label: 'Low Priority', color: 'success' },
    { value: 'normal', label: 'Normal', color: 'info' },
    { value: 'high', label: 'High Priority', color: 'warning' },
    { value: 'urgent', label: 'Urgent', color: 'error' }
  ];

  // Sample templates
  const defaultTemplates = [
    {
      id: 1,
      name: 'Leave Request',
      subject: 'Leave Request - [Your Name]',
      message: 'Dear HR,\n\nI would like to request leave from [Start Date] to [End Date].\n\nType: [Vacation/Sick Leave/Personal]\nReason: [Your Reason]\n\nThank you,\n[Your Name]',
      category: 'leave',
      usageCount: 156,
      lastUsed: '2024-01-15'
    },
    {
      id: 2,
      name: 'Technical Support',
      subject: 'Technical Issue: [Brief Description]',
      message: 'Dear IT Support,\n\nI am experiencing an issue with [Software/Hardware].\n\nDetails: [Describe the issue]\nError Message: [If applicable]\nSteps to reproduce: [If applicable]\n\nThank you for your assistance.',
      category: 'technical',
      usageCount: 89,
      lastUsed: '2024-01-20'
    },
    {
      id: 3,
      name: 'Document Submission',
      subject: 'Document Submission: [Document Name]',
      message: 'Dear HR,\n\nPlease find attached the requested document: [Document Name].\n\nDocument Details: [Additional information]\nDue Date: [If applicable]\n\nIf you need any additional information, please let me know.\n\nBest regards,\n[Your Name]',
      category: 'document',
      usageCount: 203,
      lastUsed: '2024-01-18'
    }
  ];

  // Enhanced user fetching with multiple fallbacks
  const fetchCurrentUser = useCallback(async () => {
    setUserLoading(true);
    try {
      console.log('Fetching user...');
      
      let userData = null;
      const storedUser = localStorage.getItem('currentUser');
      
      if (storedUser) {
        userData = JSON.parse(storedUser);
        console.log('User loaded from localStorage:', userData.name);
      }
      
      const token = localStorage.getItem('token');
      if (token && (!userData || !userData._id)) {
        try {
          console.log('Trying API endpoints for user data...');
          
          const endpoints = [
            `${API_URL}/api/auth/me`,
            `${API_URL}/api/users/me`,
            `${API_URL}/api/employee/profile`,
            `${API_URL}/api/profile`
          ];
          
          for (const endpoint of endpoints) {
            try {
              const response = await axios.get(endpoint, {
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                timeout: 2000
              });
              
              if (response.data) {
                userData = response.data.user || response.data.data || response.data;
                console.log(`User fetched from ${endpoint}:`, userData.name || 'Unknown');
                localStorage.setItem('currentUser', JSON.stringify(userData));
                break;
              }
            } catch (e) {
              console.log(`${endpoint} failed:`, e.message);
            }
          }
        } catch (apiError) {
          console.log('API endpoints not available, using fallback');
        }
      }
      
      if (!userData) {
        console.log('Creating fallback user');
        userData = {
          _id: `user-${Date.now()}`,
          name: 'Employee',
          email: 'employee@company.com',
          role: 'employee',
          department: 'General Department',
          employeeId: `EMP${String(Date.now()).slice(-6)}`,
          avatar: `https://ui-avatars.com/api/?name=Employee&background=1976d2&color=fff&bold=true`,
          position: 'Employee',
          joinDate: new Date().toISOString().split('T')[0]
        };
        
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('userFallback', 'true');
      }
      
      const formattedUser = {
        _id: userData._id || userData.id || `user-${Date.now()}`,
        name: userData.name || userData.fullName || userData.username || 'Employee',
        email: userData.email || 'employee@company.com',
        role: userData.role || 'employee',
        department: userData.department || 'General Department',
        employeeId: userData.employeeId || userData.employeeNumber || `EMP${String(Date.now()).slice(-6)}`,
        position: userData.position || userData.jobTitle || 'Employee',
        avatar: userData.avatar || userData.profilePicture || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'Employee')}&background=1976d2&color=fff&bold=true`,
        joinDate: userData.joinDate || userData.hireDate || new Date().toISOString().split('T')[0],
        phone: userData.phone || userData.phoneNumber || 'N/A',
        location: userData.location || userData.officeLocation || 'Main Office'
      };
      
      console.log('Final user object:', formattedUser);
      setUser(formattedUser);
      localStorage.setItem('currentUser', JSON.stringify(formattedUser));
      
    } catch (error) {
      console.error('Error in fetchCurrentUser:', error);
      
      const fallbackUser = {
        _id: 'fallback-user',
        name: 'Employee',
        email: 'employee@company.com',
        role: 'employee',
        department: 'General Department',
        employeeId: 'EMP001',
        avatar: 'https://ui-avatars.com/api/?name=Employee&background=1976d2&color=fff',
        position: 'Employee',
        joinDate: '2024-01-01'
      };
      
      setUser(fallbackUser);
      localStorage.setItem('currentUser', JSON.stringify(fallbackUser));
    } finally {
      setUserLoading(false);
    }
  }, [API_URL]);

  // Fetch HR users
  const fetchHrUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token available for HR users fetch');
        const mockHrUsers = [
          {
            _id: 'hr-001',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@company.com',
            role: 'hr',
            department: 'Human Resources',
            employeeId: 'HR001',
            avatar: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=1976d2&color=fff'
          },
          {
            _id: 'hr-002',
            name: 'Michael Chen',
            email: 'michael.chen@company.com',
            role: 'hr',
            department: 'HR Operations',
            employeeId: 'HR002',
            avatar: 'https://ui-avatars.com/api/?name=Michael+Chen&background=1976d2&color=fff'
          }
        ];
        setHrUsers(mockHrUsers);
        return;
      }

      const response = await axios.get(
        `${API_URL}/api/messages/employee/users/list`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
      
      if (response.data.success && response.data.data) {
        setHrUsers(response.data.data);
      } else {
        const mockHrUsers = [
          {
            _id: 'hr-001',
            name: 'HR Department',
            email: 'hr@company.com',
            role: 'hr',
            department: 'Human Resources',
            employeeId: 'HR001'
          }
        ];
        setHrUsers(mockHrUsers);
      }
    } catch (error) {
      console.error('Error fetching HR users:', error);
      const mockHrUsers = [
        {
          _id: 'hr-default',
          name: 'HR Support',
          email: 'hr-support@company.com',
          role: 'hr',
          department: 'Human Resources',
          employeeId: 'HR001',
          avatar: 'https://ui-avatars.com/api/?name=HR+Support&background=1976d2&color=fff'
        }
      ];
      setHrUsers(mockHrUsers);
    }
  };

  // Load drafts from localStorage
  const loadDrafts = () => {
    try {
      const savedDrafts = localStorage.getItem('messageDrafts');
      if (savedDrafts) {
        const parsedDrafts = JSON.parse(savedDrafts);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentDrafts = parsedDrafts.filter(draft => 
          new Date(draft.updatedAt) > thirtyDaysAgo
        );
        
        setDrafts(recentDrafts);
        localStorage.setItem('messageDrafts', JSON.stringify(recentDrafts));
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
      setDrafts([]);
    }
  };

  // Load templates
  const loadTemplates = () => {
    try {
      const savedTemplates = localStorage.getItem('messageTemplates');
      if (savedTemplates) {
        setTemplates(JSON.parse(savedTemplates));
      } else {
        setTemplates(defaultTemplates);
        localStorage.setItem('messageTemplates', JSON.stringify(defaultTemplates));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates(defaultTemplates);
    }
  };

  // Save draft
  const saveDraft = () => {
    try {
      if (!formData.subject.trim() && !formData.message.trim()) {
        toast.warning('No content to save as draft');
        return;
      }

      const newDraft = {
        id: Date.now(),
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wordCount: formData.message.split(/\s+/).length,
        attachmentCount: formData.attachments.length
      };

      const updatedDrafts = [newDraft, ...drafts.slice(0, 19)];
      setDrafts(updatedDrafts);
      localStorage.setItem('messageDrafts', JSON.stringify(updatedDrafts));
      
      toast.success('Draft saved successfully!');
    } catch (error) {
      toast.error('Failed to save draft');
      console.error('Save draft error:', error);
    }
  };

  // Load draft
  const loadDraft = (draft) => {
    setFormData({
      ...draft,
      attachments: draft.attachments || []
    });
    setActiveStep(0);
    setActiveTab('compose');
    toast.success('Draft loaded successfully');
  };

  // Delete draft
  const deleteDraft = (id) => {
    const updatedDrafts = drafts.filter(draft => draft.id !== id);
    setDrafts(updatedDrafts);
    localStorage.setItem('messageDrafts', JSON.stringify(updatedDrafts));
    toast.success('Draft deleted');
  };

  // Apply template
  const applyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      subject: template.subject,
      message: template.message,
      category: template.category
    }));
    setShowTemplates(false);
    toast.success(`"${template.name}" template applied`);
    
    const updatedTemplates = templates.map(t => 
      t.id === template.id 
        ? { ...t, usageCount: (t.usageCount || 0) + 1, lastUsed: new Date().toISOString() }
        : t
    );
    setTemplates(updatedTemplates);
    localStorage.setItem('messageTemplates', JSON.stringify(updatedTemplates));
  };

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    if (name === 'recipientType') {
      setFormData(prev => ({
        ...prev,
        recipientType: value,
        recipient: '',
        recipientId: ''
      }));
      return;
    }
    
    if (name === 'recipient') {
      const selectedOption = getRecipientOptions().find(opt => opt.value === value);
      setFormData(prev => ({
        ...prev,
        recipient: selectedOption ? selectedOption.label : '',
        recipientId: value
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error(`Some files exceed 10MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }
    
    const newAttachments = files.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2),
      type: file.type.split('/')[1]?.toUpperCase() || 'FILE',
      uploadedAt: new Date().toISOString(),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments]
    }));
    
    toast.success(`${files.length} file(s) added`);
  };

  // Remove attachment
  const removeAttachment = (id) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(item => {
        if (item.id === id && item.preview) {
          URL.revokeObjectURL(item.preview);
        }
        return item.id !== id;
      })
    }));
  };

  // Validate form
  const validateForm = () => {
    if (!formData.subject.trim()) return 'Subject is required';
    if (!formData.message.trim()) return 'Message is required';
    if (formData.message.length < 10) return 'Message is too short (minimum 10 characters)';
    if (!formData.recipientId) return 'Please select a recipient';
    if (!formData.category) return 'Please select a category';
    return null;
  };

  // Handle submit
// Handle submit
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const validationError = validateForm();
  if (validationError) {
    toast.error(validationError);
    setError(validationError);
    return;
  }

  setLoading(true);
  setError('');

  try {
    // ✅ REMOVE sender object - backend will get it from token
    const messageData = {
      recipientId: formData.recipientId,
      subject: formData.subject,
      message: formData.message,
      category: formData.category || 'general',
      priority: formData.priority || 'normal'
    };

    console.log('📤 SENDING:', messageData);

    const endpoint = `${API_URL}/api/messages/employee/send`;
    const token = localStorage.getItem('token');

    const response = await axios.post(endpoint, messageData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Success handling
    console.log('✅ SUCCESS:', response.data);
    toast.success('Message sent successfully!');
    
    // Reset form on success
    if (response.data.success) {
      setFormData({
        recipientType: 'hr',
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
        tags: []
      });
      
      // Show success dialog
      setLastSentMessage({
        recipient: formData.recipient,
        subject: formData.subject,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        reference: response.data.data?.id || `MSG-${Date.now()}`
      });
      setShowSuccessDialog(true);
      setSuccess(true);
    }
    
  } catch (err) {
    // Error handling
    console.error('❌ ERROR:', err.response?.data || err.message);
    const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to send message';
    setError(errorMessage);
    toast.error(errorMessage);
  } finally {
    setLoading(false);
  }
};


  // Get recipient options
  const getRecipientOptions = () => {
    return hrUsers.map(hr => ({
      value: hr._id,
      label: hr.name,
      subtext: `${hr.department} • ${hr.role.toUpperCase()}`,
      email: hr.email,
      avatar: hr.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(hr.name)}&background=1976d2&color=fff`
    }));
  };

  // Steps
  const steps = ['Recipient', 'Category', 'Content', 'Review'];
  
  const getStepContent = (step) => {
    switch (step) {
      case 0: return 'Select who you want to message';
      case 1: return 'Categorize and prioritize your message';
      case 2: return 'Write your message with details';
      case 3: return 'Review all details before sending';
      default: return 'Unknown step';
    }
  };

  // Handle step navigation
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

  const handlePrevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  // Success Dialog Component
  const SuccessDialog = () => (
    <Dialog 
      open={showSuccessDialog} 
      onClose={() => setShowSuccessDialog(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
        <Box sx={{ 
          p: 3, 
          background: theme.palette.primary.main,
          borderRadius: '8px 8px 0 0',
          color: 'white',
        }}>
          <Avatar sx={{ 
            width: 80, 
            height: 80, 
            mx: 'auto', 
            mb: 2,
            bgcolor: 'white',
            color: theme.palette.primary.main,
          }}>
            <DoneAllIcon fontSize="large" />
          </Avatar>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Message Sent!
          </Typography>
          <Typography variant="body1">
            Your message has been delivered securely
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ py: 3, px: 3 }}>
        <Card sx={{ mb: 3, border: `1px solid ${theme.palette.divider}` }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Recipient
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {lastSentMessage?.recipient || 'Recipient'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Subject
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {lastSentMessage?.subject || 'No subject'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Sent On
                </Typography>
                <Typography variant="body2">
                  {lastSentMessage?.date} at {lastSentMessage?.time}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Reference
                </Typography>
                <Typography variant="body2" fontFamily="monospace" fontWeight="bold">
                  {lastSentMessage?.reference || 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
        >
          <Typography variant="body2">
            Your message has been successfully sent and logged.
          </Typography>
        </Alert>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          variant="outlined"
          onClick={() => {
            setShowSuccessDialog(false);
            navigate('/employee/messages');
          }}
          startIcon={<HistoryIcon />}
        >
          View Messages
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            setShowSuccessDialog(false);
            setFormData({
              recipientType: 'hr',
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
              tags: []
            });
            setActiveStep(0);
          }}
          startIcon={<SendIcon />}
        >
          Send Another
        </Button>
      </DialogActions>
    </Dialog>
  );

  // UseEffects
  useEffect(() => {
    console.log('ComposeMessage component mounted');
    fetchCurrentUser();
    fetchHrUsers();
    loadDrafts();
    loadTemplates();
    
    return () => {
      formData.attachments.forEach(item => {
        if (item.preview) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, []);

  useEffect(() => {
    setCharacterCount(formData.message.length);
    
    if ((formData.subject || formData.message) && !loading) {
      const autoSaveTimer = setTimeout(() => {
        if (formData.subject || formData.message) {
          saveDraft();
        }
      }, 30000);
      
      return () => clearTimeout(autoSaveTimer);
    }
  }, [formData.subject, formData.message]);

  // If still loading user
  if (userLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 3
      }}>
        <CircularProgress />
        <Typography variant="h6">
          Loading your profile...
        </Typography>
      </Box>
    );
  }

  // Current recipient options
  const currentRecipientOptions = getRecipientOptions();

  return (
    <Box sx={{ 
      minHeight: '100vh',
      py: 4,
      backgroundColor: '#f5f5f5'
    }}>
      <Container maxWidth="lg">
        {/* Success Dialog */}
        <SuccessDialog />
        
        {/* Save Draft Dialog */}
        <Dialog
          open={saveAsDraftDialog}
          onClose={() => setSaveAsDraftDialog(false)}
          maxWidth="sm"
        >
          <DialogTitle>
            <DraftsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Save as Draft
          </DialogTitle>
          <DialogContent>
            <Typography>Save this message as a draft? You can continue editing it later.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveAsDraftDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                saveDraft();
                setSaveAsDraftDialog(false);
              }}
            >
              Save Draft
            </Button>
          </DialogActions>
        </Dialog>

        {/* Main Paper */}
        <Paper elevation={2} sx={{ 
          borderRadius: 2,
          overflow: 'hidden',
          background: 'white',
        }}>
          {/* Header */}
          <Box sx={{ 
            p: 3, 
            backgroundColor: theme.palette.primary.main,
            color: 'white',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar sx={{ 
                width: 60, 
                height: 60, 
                bgcolor: 'white',
                color: theme.palette.primary.main,
              }}>
                <SendIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Compose New Message
                </Typography>
                <Typography variant="body1">
                  Send secure messages to HR and administration
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab 
                value="compose" 
                label="Compose" 
                icon={<SendIcon />} 
                iconPosition="start"
              />
              <Tab 
                value="templates" 
                label="Templates" 
                icon={<TemplateIcon />} 
                iconPosition="start"
              />
              <Tab 
                value="drafts" 
                label={
                  <Badge badgeContent={drafts.length} color="primary" showZero>
                    Drafts
                  </Badge>
                } 
                icon={<DraftsIcon />} 
                iconPosition="start"
              />
              <Tab 
                value="ai" 
                label="AI Assistant" 
                icon={<SmartToyIcon />} 
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Main Content */}
          <Box sx={{ p: 3 }}>
            {activeTab === 'compose' && (
              <>
                {/* Stepper */}
                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>

                <Typography variant="h6" color="primary" sx={{ mb: 3 }}>
                  {getStepContent(activeStep)}
                </Typography>

                {/* Error Message */}
                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ mb: 3 }}
                    onClose={() => setError('')}
                  >
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Recipient Selection - Step 0 */}
                  {activeStep === 0 && (
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                              Select Recipient
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                  <InputLabel>Recipient Type</InputLabel>
                                  <Select
                                    name="recipientType"
                                    value={formData.recipientType}
                                    onChange={handleChange}
                                    label="Recipient Type"
                                    required
                                  >
                                    <MenuItem value="hr">
                                      HR Department
                                    </MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                  <InputLabel>Select Recipient</InputLabel>
                                  <Select
                                    name="recipientId"
                                    value={formData.recipientId}
                                    onChange={handleChange}
                                    label="Select Recipient"
                                    required
                                    disabled={currentRecipientOptions.length === 0}
                                  >
                                    {currentRecipientOptions.map(option => (
                                      <MenuItem key={option.value} value={option.value}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                          <Avatar src={option.avatar} sx={{ width: 32, height: 32 }}>
                                            <PersonIcon />
                                          </Avatar>
                                          <Box>
                                            <Typography>{option.label}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              {option.subtext}
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  )}

                  {/* Category & Priority - Step 1 */}
                  {activeStep === 1 && (
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                              Category
                            </Typography>
                            <FormControl fullWidth>
                              <Select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                              >
                                {categories.map(cat => (
                                  <MenuItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                              Priority Level
                            </Typography>
                            <FormControl fullWidth>
                              <Select
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                              >
                                {priorities.map(pri => (
                                  <MenuItem key={pri.value} value={pri.value}>
                                    {pri.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Subject */}
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Message Subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          placeholder="Brief and descriptive subject line"
                          sx={{ mb: 2 }}
                        />
                      </Grid>

                      {/* Options */}
                      <Grid item xs={12}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                              Message Options
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6} md={3}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={formData.confidential}
                                      onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        confidential: e.target.checked
                                      }))}
                                    />
                                  }
                                  label="Confidential"
                                />
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={formData.readReceipt}
                                      onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        readReceipt: e.target.checked
                                      }))}
                                    />
                                  }
                                  label="Read Receipt"
                                />
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={formData.urgent}
                                      onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        urgent: e.target.checked
                                      }))}
                                    />
                                  }
                                  label="Urgent"
                                />
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={formData.followUp}
                                      onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        followUp: e.target.checked
                                      }))}
                                    />
                                  }
                                  label="Follow-up"
                                />
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  )}

                  {/* Message Content - Step 2 */}
                  {activeStep === 2 && (
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                              Your Message
                            </Typography>
                            <TextField
                              fullWidth
                              name="message"
                              value={formData.message}
                              onChange={handleChange}
                              required
                              multiline
                              rows={8}
                              placeholder="Start typing your message here..."
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  fontSize: '1rem',
                                },
                              }}
                            />
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" color={characterCount < 10 ? 'error' : 'text.secondary'}>
                                {characterCount} characters • {formData.message.split(/\s+/).filter(w => w.length > 0).length} words
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* File Attachments */}
                      <Grid item xs={12}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                              Attachments
                            </Typography>
                            
                            <input
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt,.ppt,.pptx"
                              style={{ display: 'none' }}
                              id="file-upload"
                              multiple
                              type="file"
                              onChange={handleFileUpload}
                            />
                            <label htmlFor="file-upload">
                              <Button
                                component="span"
                                startIcon={<AttachFileIcon />}
                                variant="outlined"
                                sx={{ mb: 2 }}
                              >
                                Select Files
                              </Button>
                            </label>

                            {formData.attachments.length > 0 && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                  Attached Files ({formData.attachments.length})
                                </Typography>
                                <Grid container spacing={1}>
                                  {formData.attachments.map((item) => (
                                    <Grid item xs={12} key={item.id}>
                                      <Box sx={{ 
                                        p: 1.5, 
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                      }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                          <AttachFileIcon color="action" />
                                          <Box>
                                            <Typography variant="body2">
                                              {item.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              {item.size} MB • {item.type}
                                            </Typography>
                                          </Box>
                                        </Box>
                                        <IconButton
                                          size="small"
                                          onClick={() => removeAttachment(item.id)}
                                        >
                                          <DeleteIcon />
                                        </IconButton>
                                      </Box>
                                    </Grid>
                                  ))}
                                </Grid>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  )}

                  {/* Review - Step 3 */}
                  {activeStep === 3 && (
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" sx={{ mb: 3 }}>
                              Message Preview
                            </Typography>
                            
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">
                                  Recipient
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                  {formData.recipient || 'Not selected'}
                                </Typography>
                              </Grid>
                              
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">
                                  Sender
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                  {user?.name || 'Employee'}
                                </Typography>
                              </Grid>
                              
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">
                                  Category
                                </Typography>
                                <Typography variant="body1">
                                  {formData.category}
                                </Typography>
                              </Grid>
                              
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">
                                  Priority
                                </Typography>
                                <Chip 
                                  label={formData.priority}
                                  color={priorities.find(p => p.value === formData.priority)?.color || 'default'}
                                  size="small"
                                />
                              </Grid>
                            </Grid>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Typography variant="caption" color="text.secondary">
                              Subject
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 3 }}>
                              {formData.subject}
                            </Typography>
                            
                            <Typography variant="caption" color="text.secondary">
                              Message
                            </Typography>
                            <Box sx={{ 
                              p: 2, 
                              bgcolor: 'grey.50', 
                              borderRadius: 1,
                              border: '1px solid #e0e0e0'
                            }}>
                              <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                                {formData.message}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  )}

                  {/* Navigation Buttons */}
                  <Grid container spacing={2} sx={{ mt: 4 }}>
                    <Grid item xs={6}>
                      {activeStep > 0 ? (
                        <Button
                          variant="outlined"
                          onClick={handlePrevStep}
                          startIcon={<RemoveIcon />}
                        >
                          Back
                        </Button>
                      ) : (
                        <Button
                          variant="outlined"
                          onClick={() => navigate(-1)}
                        >
                          Cancel
                        </Button>
                      )}
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      {activeStep < 3 ? (
                        <Button
                          variant="contained"
                          onClick={handleNextStep}
                          startIcon={<AddIcon />}
                        >
                          Continue
                        </Button>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            onClick={() => setSaveAsDraftDialog(true)}
                            startIcon={<DraftsIcon />}
                          >
                            Save Draft
                          </Button>
                          <Button
                            variant="contained"
                            type="submit"
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                          >
                            {loading ? 'Sending...' : 'Send Message'}
                          </Button>
                        </Box>
                      )}
                    </Grid>
                  </Grid>
                </form>
              </>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <Box>
                <Typography variant="h5" sx={{ mb: 3 }}>
                  Message Templates
                </Typography>
                
                <Grid container spacing={3}>
                  {templates.map(template => (
                    <Grid item xs={12} md={6} lg={4} key={template.id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="h6" fontWeight="bold">
                              {template.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Used {template.usageCount || 0} times
                            </Typography>
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            <strong>Subject:</strong> {template.subject}
                          </Typography>
                          
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                              {template.message.substring(0, 150)}...
                            </Typography>
                          </Box>
                          
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={() => applyTemplate(template)}
                            startIcon={<FileCopyIcon />}
                          >
                            Use Template
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Drafts Tab */}
            {activeTab === 'drafts' && (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5">
                    Saved Drafts ({drafts.length})
                  </Typography>
                </Box>
                
                {drafts.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <DraftsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No Drafts Found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                      Your saved message drafts will appear here.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => setActiveTab('compose')}
                      startIcon={<SendIcon />}
                    >
                      Compose New Message
                    </Button>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {drafts.map(draft => (
                      <Grid item xs={12} key={draft.id}>
                        <Card>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box>
                                <Typography variant="h6" fontWeight="bold">
                                  {draft.subject || 'Untitled Draft'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  To: {draft.recipient || 'No recipient'} • 
                                  Updated: {new Date(draft.updatedAt).toLocaleDateString()}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => loadDraft(draft)}
                                >
                                  Edit
                                </Button>
                                <IconButton
                                  size="small"
                                  onClick={() => deleteDraft(draft.id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* AI Assistant Tab */}
            {activeTab === 'ai' && (
              <Box>
                <Typography variant="h5" sx={{ mb: 3 }}>
                  AI Writing Assistant
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          Smart Suggestions
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          Get AI-powered suggestions to improve your message.
                        </Typography>
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<AutoFixHighIcon />}
                        >
                          Generate Suggestions
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          Tone Analysis
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          Analyze the tone of your message.
                        </Typography>
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<PsychologyIcon />}
                        >
                          Analyze Tone
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>

          {/* Footer */}
          <Box sx={{ 
            p: 2, 
            bgcolor: 'grey.50',
            borderTop: 1,
            borderColor: 'divider',
            textAlign: 'center'
          }}>
            <Typography variant="caption" color="text.secondary">
              All messages are securely stored and encrypted.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ComposeMessage;