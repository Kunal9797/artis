import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Stack,
  Divider,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Message as MessageIcon,
  CheckCircle as CheckCircleIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  MoreVert as MoreVertIcon,
  ArrowForward as ArrowForwardIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Chat as ChatIcon,
  DeleteOutline as DeleteOutlineIcon
} from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import leadApi from '../../../services/leadApi';
import { ILead } from '../../../types/sales';

// Define valid lead statuses and their progression
const LEAD_STATUS = {
  NEW: {
    color: 'info', // blue
    label: 'New'
  },
  FOLLOWUP: {
    color: 'warning', // orange
    label: 'Follow Up'
  },
  NEGOTIATION: {
    color: 'secondary', // purple
    label: 'Negotiation'
  },
  CLOSED: {
    color: 'success', // green
    label: 'Closed'
  }
} as const;

type LeadStatus = keyof typeof LEAD_STATUS;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

interface NotesButtonProps {
  lead: ILead;
  onUpdate: (updatedLead: ILead) => void;
}

const NotesButton: React.FC<NotesButtonProps> = ({ lead, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  const handleAddNote = async () => {
    if (!note.trim()) return;
    
    try {
      setLoading(true);
      const response = await leadApi.addNote(lead.id, note);
      onUpdate(response.data);
      setNote('');
      setError(null);
    } catch (err) {
      setError('Failed to add note');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (index: number) => {
    try {
      setDeleteLoading(index);
      
      // Create a new array without the note we want to delete
      const updatedNotes = lead.notesHistory?.filter((_, idx) => 
        idx !== index  // We don't need to reverse the index since we're using filter
      ) || [];
      
      const response = await leadApi.updateLead(lead.id, {
        notesHistory: updatedNotes
      });
      
      onUpdate(response.data);
    } catch (err) {
      setError('Failed to delete note');
      console.error(err);
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <>
      <Tooltip title={lead.notesHistory?.length ? "View/Add Notes" : "Add Note"}>
        <IconButton 
          size="small" 
          onClick={() => setOpen(true)}
          color={lead.notesHistory?.length ? "primary" : "default"}
          sx={{ position: 'relative' }}
        >
          <ChatIcon fontSize="small" />
          {lead.notesHistory?.length > 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: -6,
                right: -6,
                backgroundColor: 'primary.main',
                color: 'white',
                borderRadius: '50%',
                width: 16,
                height: 16,
                fontSize: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {lead.notesHistory.length}
            </Box>
          )}
        </IconButton>
      </Tooltip>

      <Dialog 
        open={open} 
        onClose={() => {
          setOpen(false);
          setNote('');
          setError(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Notes
            <IconButton 
              size="small" 
              onClick={() => setOpen(false)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              multiline
              rows={2}
              fullWidth
              placeholder="Add a note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
              size="small"
              sx={{ mb: 1 }}
            />
            {error && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {error}
              </Alert>
            )}
            <Button
              variant="contained"
              size="small"
              onClick={handleAddNote}
              disabled={!note.trim() || loading}
              sx={{ float: 'right' }}
            >
              {loading ? <CircularProgress size={20} /> : 'Add'}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />
          
          <Stack spacing={1.5}>
            {lead.notesHistory?.length ? (
              [...(lead.notesHistory || [])]  // Create a new array to avoid mutating the original
                .reverse()  // Reverse for display only
                .map((note, index) => (
                  <Box 
                    key={`note-${index}-${note.timestamp}`}  // Better unique key
                    sx={{ 
                      p: 1.5,
                      bgcolor: 'background.default',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      position: 'relative'
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', pr: 4 }}>
                      {note.note}
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mt: 1 
                    }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(note.timestamp)}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteNote(lead.notesHistory!.length - 1 - index)}  // Calculate correct index
                        disabled={deleteLoading === index}
                        sx={{ 
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          opacity: 0.6,
                          '&:hover': { opacity: 1 }
                        }}
                      >
                        {deleteLoading === index ? (
                          <CircularProgress size={16} />
                        ) : (
                          <DeleteOutlineIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Box>
                  </Box>
                ))
            ) : (
              <Typography color="text.secondary" align="center" variant="body2">
                No notes yet
              </Typography>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};

const LeadList: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const navigate = useNavigate();

  const { user } = useAuth();
  const [leads, setLeads] = useState<ILead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<ILead | null>(null);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedLeadForStatus, setSelectedLeadForStatus] = useState<ILead | null>(null);

  useEffect(() => {
    if (location.pathname.includes('/leads')) {
      navigate(location.pathname, { 
        replace: true, 
        state: { currentPage: 'leads' }
      });
    }
  }, [location, navigate]);

  useEffect(() => {
    console.log('LeadList - useEffect mounted');
    const fetchLeads = async () => {
      try {
        setLoading(true);
        // Only fetch leads if user has a sales role
        if (user && ['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(user.role)) {
          const response = await leadApi.getLeads({ assignedTo: user.id });
          setLeads(response.data);
        }
      } catch (err) {
        setError('Failed to fetch leads');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();

    return () => {
      console.log('LeadList - useEffect cleanup');
    };
  }, [user]);

  const handleStatusUpdate = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await leadApi.updateLead(leadId, { status: newStatus });
      // Refresh leads after update
      if (user) {
        const response = await leadApi.getLeads({ assignedTo: user.id });
        setLeads(response.data);
      }
    } catch (err) {
      setError('Failed to update lead status');
      console.error(err);
    }
  };

  const getStatusColor = (status: LeadStatus) => {
    return LEAD_STATUS[status].color;
  };

  const handleStatusClick = (event: React.MouseEvent<HTMLElement>, lead: ILead) => {
    event.stopPropagation();
    setStatusMenuAnchor(event.currentTarget);
    setSelectedLeadForStatus(lead);
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (selectedLeadForStatus) {
      await handleStatusUpdate(selectedLeadForStatus.id, newStatus);
      setStatusMenuAnchor(null);
      setSelectedLeadForStatus(null);
    }
  };

  const StatusMenu: React.FC<{ lead: ILead }> = ({ lead }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      setAnchorEl(event.currentTarget);
    };
    
    const handleClose = () => {
      setAnchorEl(null);
    };

    const handleStatusChange = async (newStatus: LeadStatus) => {
      try {
        await handleStatusUpdate(lead.id, newStatus);
        handleClose();
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    };

    return (
      <>
        <Chip
          label={lead.status}
          color={LEAD_STATUS[lead.status as LeadStatus].color}
          onClick={handleClick}
          sx={{ 
            cursor: 'pointer',
            '&:hover': {
              transform: 'scale(1.05)',
              transition: 'transform 0.2s'
            }
          }}
        />
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          {Object.entries(LEAD_STATUS).map(([status, { color, label }]) => (
            <MenuItem
              key={status}
              onClick={() => handleStatusChange(status as LeadStatus)}
              selected={lead.status === status}
            >
              <Chip 
                label={label}
                size="small"
                color={color}
              />
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  };

  const handleLeadUpdate = (updatedLead: ILead) => {
    setLeads(leads.map(lead => 
      lead.id === updatedLead.id ? updatedLead : lead
    ));
  };

  const MobileLeadCard: React.FC<{ lead: ILead }> = ({ lead }) => (
    <Card sx={{ mb: 1.5, borderRadius: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            <Typography 
              variant="subtitle1" 
              component="div" 
              sx={{ fontWeight: 500 }}
            >
              {lead.customerName}
            </Typography>
            <StatusMenu lead={lead} />
          </Box>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1,
            fontSize: '0.875rem'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2">{lead.phoneNumber}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2">{lead.location}</Typography>
            </Box>
          </Box>

          <Box sx={{ 
            bgcolor: 'background.default', 
            p: 1.5, 
            borderRadius: 1,
            mt: 1
          }}>
            <Typography variant="body2">
              {lead.enquiryDetails || "No details"}
            </Typography>
          </Box>

          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 1 
          }}>
            <Typography variant="caption" color="text.secondary">
              <CalendarIcon sx={{ fontSize: 14, mr: 0.5 }} />
              {formatDate(lead.createdAt)}
            </Typography>
            <NotesButton lead={lead} onUpdate={handleLeadUpdate} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  const TableActions: React.FC<{ lead: ILead }> = ({ lead }) => (
    <TableCell>
      <NotesButton lead={lead} onUpdate={handleLeadUpdate} />
    </TableCell>
  );

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '50vh'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3 },
      backgroundColor: theme.palette.background.default,
      minHeight: '100vh'
    }}>
      <Typography 
        variant={isMobile ? "h5" : "h4"} 
        sx={{ 
          mb: 3,
          color: theme.palette.text.primary,
          fontWeight: 600
        }}
      >
        Lead Management
      </Typography>

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            borderRadius: 2
          }}
        >
          {error}
        </Alert>
      )}

      {isMobile ? (
        // Mobile view - Cards
        <Box>
          {leads.map((lead) => (
            <MobileLeadCard key={lead.id} lead={lead} />
          ))}
        </Box>
      ) : (
        // Desktop view - Table
        <TableContainer 
          component={Paper} 
          sx={{ 
            borderRadius: 2,
            boxShadow: 2
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Enquiry</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.map((lead) => (
                <TableRow 
                  key={lead.id}
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: theme.palette.action.hover 
                    }
                  }}
                >
                  <TableCell>{lead.customerName}</TableCell>
                  <TableCell>{lead.phoneNumber}</TableCell>
                  <TableCell>{lead.location}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StatusMenu lead={lead} />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={lead.enquiryDetails || "No enquiry details"}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {lead.enquiryDetails || "No details"}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {formatDate(lead.createdAt)}
                  </TableCell>
                  <TableCell>
                    <NotesButton lead={lead} onUpdate={handleLeadUpdate} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default LeadList; 