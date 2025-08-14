import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  IconButton,
  Tooltip,
  Snackbar,
  Avatar,
  Skeleton,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import {
  PersonAdd,
  ArrowForward,
  Phone,
  ContentCopy,
  Business,
  CheckCircle,
  FiberManualRecord,
  Message,
  Sync,
  LocationOn
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { contactApi } from '../../services/contactApi';
import { Contact } from '../../types/contact';
import { copyLeadToClipboard } from '../../utils/copyLead';

interface NewContactsWidgetProps {
  setCurrentPage?: (page: string) => void;
}

const NewContactsWidget: React.FC<NewContactsWidgetProps> = ({ setCurrentPage }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const [newContacts, setNewContacts] = useState<Contact[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchNewContacts();
  }, []);

  // Auto-sync every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!syncing) {
        setSyncing(true);
        try {
          const response = await contactApi.syncContacts();
          if (response.success && response.added > 0) {
            // Only show message and refresh if new contacts were added
            setSyncMessage(`${response.added} new lead${response.added > 1 ? 's' : ''} added`);
            await fetchNewContacts();
            setTimeout(() => setSyncMessage(null), 3000);
          }
        } catch (error) {
          console.error('Auto-sync error:', error);
        } finally {
          setSyncing(false);
        }
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [syncing]);

  const fetchNewContacts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [contactsResponse, countResponse] = await Promise.all([
        contactApi.getLatestContacts(3),
        contactApi.getNewContactsCount()
      ]);
      
      if (contactsResponse.success) {
        setNewContacts(contactsResponse.data);
      }
      
      if (countResponse.success) {
        setNewCount(countResponse.count);
      }
    } catch (error) {
      console.error('Error fetching new contacts:', error);
      setError('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = () => {
    if (setCurrentPage) {
      setCurrentPage('contacts');
    } else {
      window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'contacts' }));
    }
  };

  const handleViewContact = (id: string) => {
    if (setCurrentPage) {
      setCurrentPage('contacts');
      setTimeout(() => {
        navigate(`dashboard/contacts/${id}`);
      }, 100);
    } else {
      window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: 'contacts' }));
      setTimeout(() => {
        navigate(`contacts/${id}`);
      }, 100);
    }
  };

  const handleCopyLead = async (e: React.MouseEvent, lead: Contact) => {
    e.stopPropagation();
    const success = await copyLeadToClipboard(lead);
    if (success) {
      setCopySuccess(true);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, contactId: string) => {
    e.stopPropagation();
    setMarkingAsRead(contactId);
    
    try {
      await contactApi.markAsRead(contactId);
      // Refresh the contacts list
      await fetchNewContacts();
    } catch (error) {
      console.error('Error marking as read:', error);
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    
    try {
      const response = await contactApi.syncContacts();
      if (response.success) {
        setSyncMessage(`Synced ${response.added || 0} new leads`);
        // Refresh the list to show new contacts
        await fetchNewContacts();
      }
    } catch (error) {
      console.error('Error syncing contacts:', error);
      setSyncMessage('Sync failed');
    } finally {
      setSyncing(false);
      // Clear message after 3 seconds
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  const formatSubmissionDate = (date: string): string => {
    const submissionDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if it's today
    if (submissionDate.toDateString() === today.toDateString()) {
      return `Today ${format(submissionDate, 'h:mm a')}`;
    }
    
    // Check if it's yesterday
    if (submissionDate.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${format(submissionDate, 'h:mm a')}`;
    }
    
    // Otherwise show date
    return format(submissionDate, 'MMM dd, h:mm a');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Define colors based on theme
  const cardBg = isDarkMode 
    ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  
  const leadCardBg = isDarkMode 
    ? alpha(theme.palette.background.paper, 0.95)
    : 'rgba(255,255,255,0.95)';

  if (loading) {
    return (
      <Card 
        elevation={isDarkMode ? 1 : 0}
        sx={{ 
          background: cardBg,
          color: 'white',
          borderRadius: 2,
          border: isDarkMode ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none'
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonAdd sx={{ fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                New Leads
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Skeleton variant="rectangular" height={70} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.1)' }} />
            <Skeleton variant="rectangular" height={70} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.1)' }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card 
        elevation={isDarkMode ? 1 : 0}
        sx={{ 
          background: cardBg,
          color: 'white',
          borderRadius: 2,
          border: isDarkMode ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none'
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Typography color="inherit">{error}</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        elevation={isDarkMode ? 1 : 0}
        sx={{ 
          background: cardBg,
          color: 'white',
          borderRadius: 2,
          overflow: 'visible',
          position: 'relative',
          border: isDarkMode ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none'
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonAdd sx={{ fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                New Leads
              </Typography>
              {newCount > 0 && (
                <Chip
                  label={newCount}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    bgcolor: '#ff4757',
                    color: 'white',
                    '& .MuiChip-label': {
                      px: 1
                    }
                  }}
                />
              )}
              <Tooltip title="Sync from Google Sheets">
                <IconButton 
                  size="small"
                  onClick={handleSync}
                  disabled={syncing}
                  sx={{ 
                    ml: 1,
                    p: 0.5,
                    color: 'white',
                    '&:hover': { 
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <Sync sx={{ 
                    fontSize: 18,
                    animation: syncing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }} />
                </IconButton>
              </Tooltip>
            </Box>
            
            {newCount > 0 && (
              <Tooltip title="View All Leads">
                <IconButton
                  size="small"
                  onClick={handleViewAll}
                  sx={{
                    color: 'white',
                    p: 0.5,
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 1,
                    '&:hover': {
                      borderColor: 'white',
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <ArrowForward sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {newContacts.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center',
              py: 3,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 1.5
            }}>
              <PersonAdd sx={{ fontSize: 36, opacity: 0.7, mb: 1 }} />
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                No new leads yet
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Form submissions will appear here
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {newContacts.map((contact) => (
                <Box
                  key={contact.id}
                  sx={{
                    background: leadCardBg,
                    borderRadius: 2,
                    p: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: isDarkMode ? 'text.primary' : 'text.primary',
                    border: isDarkMode ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none',
                    position: 'relative',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: theme.shadows[6],
                      '& .action-buttons': {
                        opacity: 1
                      }
                    }
                  }}
                  onClick={() => handleViewContact(contact.id)}
                >
                  {/* Header Section */}
                  <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: isDarkMode ? 'primary.dark' : 'primary.main',
                        width: 42,
                        height: 42,
                        fontSize: '1rem',
                        fontWeight: 600,
                        flexShrink: 0
                      }}
                    >
                      {getInitials(contact.name)}
                    </Avatar>
                    
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: 600,
                              color: isDarkMode ? 'text.primary' : 'text.primary',
                              fontSize: '0.95rem',
                              lineHeight: 1.2
                            }}
                          >
                            {contact.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                            <FiberManualRecord sx={{ fontSize: 6, color: '#10b981' }} />
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                              {formatSubmissionDate(contact.submissionTime)}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Action Buttons */}
                        <Box 
                          className="action-buttons"
                          sx={{ 
                            display: 'flex',
                            gap: 0.75,
                            opacity: 0.7,
                            transition: 'opacity 0.2s ease',
                            flexShrink: 0
                          }}
                        >
                          <Tooltip title="Copy Lead">
                            <IconButton 
                              onClick={(e) => handleCopyLead(e, contact)}
                              sx={{ 
                                p: 0.75,
                                bgcolor: alpha(theme.palette.background.paper, 0.9),
                                color: 'text.secondary',
                                border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                                '&:hover': { 
                                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                                  color: 'primary.main',
                                  borderColor: alpha(theme.palette.primary.main, 0.3)
                                }
                              }}
                            >
                              <ContentCopy sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Mark as Read">
                            <IconButton 
                              onClick={(e) => handleMarkAsRead(e, contact.id)}
                              disabled={markingAsRead === contact.id}
                              sx={{ 
                                p: 0.75,
                                bgcolor: alpha(theme.palette.background.paper, 0.9),
                                color: 'text.secondary',
                                border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                                '&:hover': { 
                                  bgcolor: alpha(theme.palette.success.main, 0.15),
                                  color: 'success.main',
                                  borderColor: alpha(theme.palette.success.main, 0.3)
                                }
                              }}
                            >
                              <CheckCircle sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  
                  {/* Separator Line */}
                  <Box sx={{ 
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`, 
                    mb: 1.25,
                    mx: -0.5
                  }} />
                  
                  {/* Content Section - Full Width */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {/* Phone and Interest */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Phone sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {contact.phone}
                      </Typography>
                      {contact.interestedIn && (
                        <>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mx: 0.5 }}>•</Typography>
                          <Business sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                            {contact.interestedIn.toLowerCase().includes('interior designer') || 
                             contact.interestedIn.toLowerCase().includes('architect') 
                              ? 'Architect' 
                              : contact.interestedIn}
                          </Typography>
                        </>
                      )}
                    </Box>
                    
                    {/* Address */}
                    {contact.address && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
                          {contact.address}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  {/* Query - Full width */}
                  {contact.query && (
                    <Box 
                      sx={{ 
                        mt: 1,
                        mx: -0.5,
                        p: 1.25,
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                        borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                        borderRadius: '0 4px 4px 0'
                      }}
                    >
                      <Typography 
                        sx={{ 
                          color: 'text.secondary',
                          fontSize: '0.8rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.4,
                          fontStyle: 'italic'
                        }}
                      >
                        {contact.query}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {newCount > 3 && (
            <Box sx={{ 
              mt: 1.5, 
              pt: 1.5, 
              borderTop: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                +{newCount - 3} more leads
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
      
      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess(false)}
        message="Lead copied to clipboard"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            bgcolor: 'success.main'
          }
        }}
      />
      
      <Snackbar
        open={!!syncMessage}
        autoHideDuration={3000}
        onClose={() => setSyncMessage(null)}
        message={syncMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            bgcolor: syncMessage?.includes('failed') ? 'error.main' : 'info.main'
          }
        }}
      />
    </>
  );
};

export default NewContactsWidget;