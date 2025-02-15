import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  SelectChangeEvent,
  Chip,
  Avatar,
  Typography,
  InputAdornment
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { ILead, ILeadFilters } from '../../../types/sales';
import LeadStatusChip from './LeadStatusChip';
import { ROLE_LABELS, ROLE_COLORS } from '../../../types/user';

interface LeadListProps {
  leads: ILead[];
  onEdit: (lead: ILead) => void;
  onDelete: (lead: ILead) => void;
  filters: ILeadFilters;
  onFilterChange: (filters: ILeadFilters) => void;
  totalCount: number;
  page: number;
  onPageChange: (page: number) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

const LEAD_STATUSES = {
  NEW: 'NEW',
  FOLLOWUP: 'FOLLOWUP',
  NEGOTIATION: 'NEGOTIATION',
  CLOSED: 'CLOSED'
} as const;

const LeadList: React.FC<LeadListProps> = ({
  leads,
  onEdit,
  onDelete,
  filters,
  onFilterChange,
  totalCount,
  page,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange
}) => {
  // Create refs at the top of the component
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      onFilterChange({
        ...filters,
        searchTerm: newValue || undefined
      });
    }, 500);
  };

  const handleStatusFilterChange = (event: SelectChangeEvent<string>) => {
    onFilterChange({
      ...filters,
      status: event.target.value || undefined
    });
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    onPageChange(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onRowsPerPageChange(parseInt(event.target.value, 10));
    onPageChange(0);
  };

  const getRoleDisplay = (assignee: any) => {
    if (!assignee) return 'Unassigned';
    
    // Get role from SalesTeam record
    const role = assignee.role;
    if (!role) return 'Unassigned';

    // Convert role to match the format in ROLE_LABELS
    const normalizedRole = role.toUpperCase().replace(' ', '_');
    return ROLE_LABELS[normalizedRole as keyof typeof ROLE_LABELS] || role;
  };

  // Add these console logs
  console.log('All leads:', leads);
  leads.forEach(lead => {
    console.log('Lead assignee:', {
      leadId: lead.id,
      assignee: lead.assignee,
      role: lead.assignee?.role,
      user: lead.assignee?.User
    });
  });

  // Clean up timeout on unmount - moved inside component
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            inputRef={searchInputRef}
            label="Search Leads"
            defaultValue={filters.searchTerm || ''}
            onChange={handleSearchChange}
            placeholder="Search by customer name or phone"
            autoComplete="off"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            onBlur={() => {
              // Restore focus after a short delay if needed
              setTimeout(() => {
                if (document.activeElement !== searchInputRef.current) {
                  searchInputRef.current?.focus();
                }
              }, 0);
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="status-filter-label">Status Filter</InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              value={filters.status || ''}
              onChange={handleStatusFilterChange}
              label="Status Filter"
              sx={{
                minWidth: 120,
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }
              }}
            >
              <MenuItem value="">
                <Typography>All Status</Typography>
              </MenuItem>
              {Object.entries(LEAD_STATUSES).map(([key, value]) => (
                <MenuItem key={key} value={value}>
                  <Typography>
                    {key.charAt(0) + key.slice(1).toLowerCase()}
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>{lead.customerName}</TableCell>
                <TableCell>{lead.phoneNumber}</TableCell>
                <TableCell>{lead.location}</TableCell>
                <TableCell>
                  <LeadStatusChip status={lead.status} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32,
                        bgcolor: (theme) => theme.palette.primary.main,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: 500
                      }}
                    >
                      {lead.assignee?.User?.firstName?.[0] || 'S'}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {lead.assignee?.User ? 
                          `${lead.assignee.User.firstName} ${lead.assignee.User.lastName}` 
                          : 'Unassigned'}
                      </Typography>
                      <Chip
                        label={getRoleDisplay(lead.assignee)}
                        size="small"
                        sx={{ 
                          height: 20,
                          fontSize: '0.75rem',
                          bgcolor: lead.assignee?.role ? 
                            ROLE_COLORS[lead.assignee.role as keyof typeof ROLE_COLORS] 
                            : theme => theme.palette.grey[100],
                          color: lead.assignee?.role ? 'white' : 'inherit',
                          '& .MuiChip-label': {
                            px: 1
                          }
                        }}
                      />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  {new Date(lead.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ '& > button': { ml: 1 } }}>
                    <Tooltip title="Edit Lead">
                      <IconButton
                        size="small"
                        onClick={() => onEdit(lead)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Lead">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDelete(lead)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Box>
  );
};

export default LeadList; 