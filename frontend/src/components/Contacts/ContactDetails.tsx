import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import {
  ArrowBack,
  Phone,
  Email,
  LocationOn,
  Business,
  AccessTime,
  Edit,
  Save,
  Cancel,
  ContentCopy
} from '@mui/icons-material';
import { format } from 'date-fns';
import { contactApi } from '../../services/contactApi';
import { Contact, ContactStatus } from '../../types/contact';
import { copyLeadToClipboard } from '../../utils/copyLead';
import { Snackbar } from '@mui/material';

interface ContactDetailsProps {
  contactId?: string;
  onBack?: () => void;
}

const ContactDetails: React.FC<ContactDetailsProps> = ({ contactId, onBack }) => {
  const { id: routeId } = useParams<{ id: string }>();
  const id = contactId || routeId;
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const [editData, setEditData] = useState({
    status: ContactStatus.NEW,
    notes: ''
  });

  useEffect(() => {
    if (id) {
      fetchContact();
    }
  }, [id]);

  const fetchContact = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const response = await contactApi.getContact(id);
      if (response.success) {
        setContact(response.data);
        setEditData({
          status: response.data.status,
          notes: response.data.notes || ''
        });
      }
    } catch (error) {
      console.error('Error fetching contact:', error);
      setError('Failed to load contact details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!contact) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const response = await contactApi.updateContact(contact.id, editData);
      if (response.success) {
        setContact(response.data);
        setEditing(false);
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      setError('Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (contact) {
      setEditData({
        status: contact.status,
        notes: contact.notes || ''
      });
    }
    setEditing(false);
  };

  const handleCopyLead = async () => {
    if (!contact) return;
    const success = await copyLeadToClipboard(contact);
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !contact) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => onBack ? onBack() : navigate('../')} startIcon={<ArrowBack />} sx={{ mt: 2 }}>
          Back to Leads
        </Button>
      </Box>
    );
  }

  if (!contact) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Lead not found</Alert>
        <Button onClick={() => onBack ? onBack() : navigate('../')} startIcon={<ArrowBack />} sx={{ mt: 2 }}>
          Back to Leads
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => onBack ? onBack() : navigate('../')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Lead Details
          </Typography>
        </Box>
        
        {!editing ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={handleCopyLead}
            >
              Copy Lead
            </Button>
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 3 }}>
                {contact.name}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Phone color="action" />
                    <Box>
                      <Typography variant="caption" color="textSecondary">Phone</Typography>
                      <Typography>{contact.phone}</Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <AccessTime color="action" />
                    <Box>
                      <Typography variant="caption" color="textSecondary">Submitted</Typography>
                      <Typography>
                        {format(new Date(contact.submissionTime), 'MMM dd, yyyy h:mm a')}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {contact.address && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                      <LocationOn color="action" />
                      <Box>
                        <Typography variant="caption" color="textSecondary">Address</Typography>
                        <Typography>{contact.address}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}

                {contact.interestedIn && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                      <Business color="action" />
                      <Box>
                        <Typography variant="caption" color="textSecondary">Interested In</Typography>
                        <Typography>{contact.interestedIn}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}

                {contact.query && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                      Query/Message
                    </Typography>
                    <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {contact.query}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Status & Notes</Typography>
              
              {editing ? (
                <>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value as ContactStatus })}
                      label="Status"
                    >
                      <MenuItem value={ContactStatus.NEW}>New</MenuItem>
                      <MenuItem value={ContactStatus.CONTACTED}>Contacted</MenuItem>
                      <MenuItem value={ContactStatus.QUALIFIED}>Qualified</MenuItem>
                      <MenuItem value={ContactStatus.CONVERTED}>Converted</MenuItem>
                      <MenuItem value={ContactStatus.LOST}>Lost</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Notes"
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    placeholder="Add notes about this contact..."
                  />
                </>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip 
                        label={contact.status} 
                        color={getStatusColor(contact.status)}
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box>
                    <Typography variant="caption" color="textSecondary">Notes</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                      {contact.notes || 'No notes added yet'}
                    </Typography>
                  </Box>
                </>
              )}

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="caption" color="textSecondary">Source</Typography>
                <Typography variant="body2">{contact.source.toUpperCase()}</Typography>
              </Box>

              {contact.salesTeam && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="caption" color="textSecondary">Assigned Team</Typography>
                    <Typography variant="body2">{contact.salesTeam.territory}</Typography>
                  </Box>
                </>
              )}

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="caption" color="textSecondary">Last Updated</Typography>
                <Typography variant="body2">
                  {format(new Date(contact.updatedAt), 'MMM dd, yyyy h:mm a')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
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

export default ContactDetails;