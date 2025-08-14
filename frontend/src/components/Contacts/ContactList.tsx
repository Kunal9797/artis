import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Pagination,
  IconButton,
  Tooltip,
  Badge,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Snackbar
} from '@mui/material';
import {
  Visibility,
  Refresh,
  Email,
  Phone,
  LocationOn,
  Business,
  CheckCircle,
  RadioButtonUnchecked,
  Close,
  ContentCopy,
  Message
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { contactApi } from '../../services/contactApi';
import { Contact, ContactStatus, ContactFilters } from '../../types/contact';
import { format } from 'date-fns';
import { copyLeadToClipboard } from '../../utils/copyLead';

interface ContactListProps {
  onViewContact?: (id: string) => void;
}

const ContactList: React.FC<ContactListProps> = ({ onViewContact }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newContactsCount, setNewContactsCount] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [filters, setFilters] = useState<ContactFilters>({
    page: 1,
    limit: 20,
    search: ''
  });
  const [syncResult, setSyncResult] = useState<{
    show: boolean;
    success: boolean;
    message: string;
  }>({ show: false, success: false, message: '' });

  useEffect(() => {
    fetchContacts();
    fetchNewContactsCount();
  }, [filters]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await contactApi.getContacts(filters);
      if (response.success) {
        setContacts(response.data.contacts);
        setTotalCount(response.data.total);
        setCurrentPage(response.data.page);
        setTotalPages(response.data.pages);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNewContactsCount = async () => {
    try {
      const response = await contactApi.getNewContactsCount();
      if (response.success) {
        setNewContactsCount(response.count);
      }
    } catch (error) {
      console.error('Error fetching new contacts count:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult({ show: false, success: false, message: '' });
    
    try {
      const response = await contactApi.syncContacts();
      setSyncResult({
        show: true,
        success: response.success,
        message: response.message
      });
      
      if (response.success) {
        fetchContacts();
        fetchNewContactsCount();
      }
    } catch (error) {
      setSyncResult({
        show: true,
        success: false,
        message: 'Failed to sync contacts'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await contactApi.markAllAsRead();
      fetchContacts();
      fetchNewContactsCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setFilters({ ...filters, page: value });
  };

  const handleStatusFilter = (status: ContactStatus | '') => {
    setFilters({ 
      ...filters, 
      status: status === '' ? undefined : status,
      page: 1 
    });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ 
      ...filters, 
      search: event.target.value,
      page: 1 
    });
  };

  const handleViewContact = (id: string) => {
    if (onViewContact) {
      onViewContact(id);
    } else {
      // Fallback
      navigate(`/contact/${id}`);
    }
  };

  const handleCopyLead = async (lead: Contact) => {
    const success = await copyLeadToClipboard(lead);
    if (success) {
      setCopySuccess(true);
    }
  };

  const getStatusColor = (status: ContactStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case ContactStatus.NEW: return 'primary';
      case ContactStatus.CONTACTED: return 'info';
      case ContactStatus.QUALIFIED: return 'warning';
      case ContactStatus.CONVERTED: return 'success';
      case ContactStatus.LOST: return 'error';
      default: return 'default';
    }
  };

  const formatPhoneNumber = (phone: string): string => {
    // Basic formatting for display
    if (phone.length === 10) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Leads
          {newContactsCount > 0 && (
            <Badge badgeContent={newContactsCount} color="error" sx={{ ml: 2 }}>
              <span />
            </Badge>
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {newContactsCount > 0 && (
            <Button
              variant="outlined"
              onClick={handleMarkAllAsRead}
              startIcon={<CheckCircle />}
            >
              Mark All Read
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleSync}
            disabled={syncing}
            startIcon={syncing ? <CircularProgress size={20} /> : <Refresh />}
          >
            Sync Leads
          </Button>
        </Box>
      </Box>

      {syncResult.show && (
        <Alert 
          severity={syncResult.success ? 'success' : 'error'} 
          onClose={() => setSyncResult({ ...syncResult, show: false })}
          sx={{ mb: 2 }}
        >
          {syncResult.message}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Search contacts"
                variant="outlined"
                value={filters.search}
                onChange={handleSearchChange}
                placeholder="Search leads..."
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={(e) => handleStatusFilter(e.target.value as ContactStatus | '')}
                  label="Status Filter"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value={ContactStatus.NEW}>New</MenuItem>
                  <MenuItem value={ContactStatus.CONTACTED}>Contacted</MenuItem>
                  <MenuItem value={ContactStatus.QUALIFIED}>Qualified</MenuItem>
                  <MenuItem value={ContactStatus.CONVERTED}>Converted</MenuItem>
                  <MenuItem value={ContactStatus.LOST}>Lost</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Show</InputLabel>
                <Select
                  value={filters.isNew === undefined ? 'all' : filters.isNew ? 'new' : 'read'}
                  onChange={(e) => setFilters({
                    ...filters,
                    isNew: e.target.value === 'all' ? undefined : e.target.value === 'new',
                    page: 1
                  })}
                  label="Show"
                >
                  <MenuItem value="all">All Contacts</MenuItem>
                  <MenuItem value="new">New Only</MenuItem>
                  <MenuItem value="read">Read Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Typography variant="body2" color="textSecondary">
                Total: {totalCount} leads
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {isMobile ? (
        // Mobile Card View
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {loading ? (
            <Card>
              <CardContent sx={{ display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </CardContent>
            </Card>
          ) : contacts.length === 0 ? (
            <Card>
              <CardContent>
                <Typography variant="body2" color="textSecondary" align="center">
                  No leads found
                </Typography>
              </CardContent>
            </Card>
          ) : (
            contacts.map((contact) => (
              <Card 
                key={contact.id}
                sx={{ 
                  position: 'relative',
                  backgroundColor: contact.isNew ? 'rgba(25, 118, 210, 0.08)' : 'inherit'
                }}
              >
                <CardContent>
                  {contact.isNew && (
                    <Chip 
                      label="NEW" 
                      color="primary" 
                      size="small"
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  )}
                  
                  <Typography variant="h6" sx={{ fontWeight: contact.isNew ? 'bold' : 'normal', mb: 1 }}>
                    {contact.name}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Phone fontSize="small" color="action" />
                    <Typography variant="body2">{contact.phone}</Typography>
                  </Box>
                  
                  {contact.interestedIn && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="textSecondary">Interest:</Typography>
                      <Typography variant="body2">{contact.interestedIn}</Typography>
                    </Box>
                  )}
                  
                  {contact.query && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="textSecondary">Query:</Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {contact.query}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      {format(new Date(contact.submissionTime), 'MMM dd, h:mm a')}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Copy Lead">
                        <IconButton size="small" onClick={() => handleCopyLead(contact)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewContact(contact.id)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      ) : (
        // Desktop Table View
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="30"></TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Interest</TableCell>
                <TableCell>Query</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No contacts found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow 
                  key={contact.id}
                  sx={{ 
                    backgroundColor: contact.isNew ? 'rgba(25, 118, 210, 0.08)' : 'inherit',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                  }}
                >
                  <TableCell>
                    {contact.isNew ? (
                      <RadioButtonUnchecked color="primary" fontSize="small" />
                    ) : (
                      <CheckCircle color="disabled" fontSize="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: contact.isNew ? 'bold' : 'normal' }}>
                      {contact.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone fontSize="small" color="action" />
                      {formatPhoneNumber(contact.phone)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {contact.interestedIn && (
                      <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {contact.interestedIn}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.query && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Message fontSize="small" color="action" />
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            maxWidth: 200, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={contact.query}
                        >
                          {contact.query}
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(contact.submissionTime), 'MMM dd, h:mm a')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={contact.status} 
                      color={getStatusColor(contact.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      <Tooltip title="Copy Lead">
                        <IconButton
                          size="small"
                          onClick={() => handleCopyLead(contact)}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewContact(contact.id)}
                        >
                          <Visibility fontSize="small" />
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
      )}

      {totalPages > 1 && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
      
      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess(false)}
        message="Lead copied to clipboard"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default ContactList;