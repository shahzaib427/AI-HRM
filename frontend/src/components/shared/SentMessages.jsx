import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Avatar,
  TablePagination, TextField, InputAdornment, CircularProgress
} from '@mui/material';
import { Search as SearchIcon, Email as EmailIcon } from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

const SentMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    total: 0
  });

  const fetchSentMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const user = JSON.parse(localStorage.getItem('user'));
      
      const response = await axios.get('/api/messages/sent', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: pagination.page + 1,
          limit: pagination.limit,
          search
        }
      });
      
      setMessages(response.data.data);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || response.data.count || 0
      }));
    } catch (error) {
      console.error('Error fetching sent messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentMessages();
  }, [pagination.page, search]);

  const statusColors = {
    'sent': 'info',
    'delivered': 'success',
    'read': 'primary',
    'pending': 'warning'
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1a237e' }}>
        📤 Sent Messages
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search sent messages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell>To</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sent Date</TableCell>
              <TableCell>Category</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <EmailIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No sent messages found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              messages.map((message) => (
                <TableRow key={message._id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: '#1976d2' }}>
                        {message.recipient?.charAt(0) || 'R'}
                      </Avatar>
                      <Typography variant="body2">
                        {message.recipient}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {message.subject}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ref: {message.referenceNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={message.status}
                      color={statusColors[message.status] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(message.sentAt), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(message.sentAt), 'hh:mm a')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={message.category}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={pagination.total}
          rowsPerPage={pagination.limit}
          page={pagination.page}
          onPageChange={(e, newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
          onRowsPerPageChange={(e) => setPagination(prev => ({ 
            ...prev, 
            limit: parseInt(e.target.value, 10),
            page: 0
          }))}
        />
      </TableContainer>
    </Box>
  );
};

export default SentMessages;