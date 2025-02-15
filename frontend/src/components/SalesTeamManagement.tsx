import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Assessment as AssessmentIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { salesApi } from '../services/salesApi';
import { ISalesTeamMember } from '../types/sales';
import { ROLE_LABELS, ROLE_COLORS } from '../types/user';
import SalesTeamMemberDetails from './SalesTeamMemberDetails';
import SalesTeamTargetDialog from './SalesTeamTargetDialog';

const SalesTeamManagement: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<ISalesTeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<ISalesTeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterRole, setFilterRole] = useState('all');
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [selectedForTarget, setSelectedForTarget] = useState<ISalesTeamMember | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<ISalesTeamMember | null>(null);
  const [editTerritory, setEditTerritory] = useState('');

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const formatTeamMember = (member: any): ISalesTeamMember => {
    console.log('Raw member data:', member);
    return {
      id: member.id,
      name: member.name || 'Unknown',
      userId: member.userId,
      role: member.role,
      area: member.territory || '',
      territory: member.territory || '',
      status: 'online' as const,
      reportingTo: member.reportingTo,
      targetQuarter: member.targetQuarter || 1,
      targetYear: member.targetYear || new Date().getFullYear(),
      targetAmount: member.targetAmount || 0,
      performance: {
        currentSales: 0,
        targetAchievement: 0,
        visitsCompleted: 0,
        avgDealSize: 0
      },
      attendance: {
        present: 0,
        absent: 0,
        total: 0
      },
      activities: []
    };
  };

  const fetchTeamMembers = async () => {
    try {
      console.log('Fetching team members...');
      const response = await salesApi.getAllSalesTeam();
      console.log('Raw team data:', response.data);
      
      if (response.data.length > 0) {
        console.log('Sample member data structure:', JSON.stringify(response.data[0], null, 2));
      }
      
      const formattedMembers = response.data.map(formatTeamMember);
      console.log('Formatted members:', formattedMembers);
      setTeamMembers(formattedMembers);
      setError('');
    } catch (err: any) {
      setError('Failed to load team members');
      console.error('Error fetching team members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (member: ISalesTeamMember) => {
    setSelectedMember(member);
  };

  const handleCloseDetails = () => {
    setSelectedMember(null);
  };

  const getPerformanceColor = (achievement: number) => {
    if (achievement >= 100) return 'success';
    if (achievement >= 70) return 'warning';
    return 'error';
  };

  const getFilteredMembers = () => {
    // First filter out any non-sales roles
    let filteredList = teamMembers.filter(member => 
      ['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(member.role)
    );
    
    // Then apply tab filtering
    switch (tabValue) {
      case 1: // Sales Executives
        filteredList = filteredList.filter(member => member.role === 'SALES_EXECUTIVE');
        break;
      case 2: // Zonal Heads
        filteredList = filteredList.filter(member => member.role === 'ZONAL_HEAD');
        break;
      case 3: // Country Heads
        filteredList = filteredList.filter(member => member.role === 'COUNTRY_HEAD');
        break;
      // case 0 is "All Members" so no filtering needed
    }

    // Then apply search and role filters
    return filteredList.filter(member => {
      const matchesSearch = 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.territory.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = filterRole === 'all' || member.role === filterRole;
      
      return matchesSearch && matchesRole;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'performance':
          return b.performance.targetAchievement - a.performance.targetAchievement;
        case 'visits':
          return b.performance.visitsCompleted - a.performance.visitsCompleted;
        case 'territory':
          return a.territory.localeCompare(b.territory);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  };

  const handleSetTarget = async (member: ISalesTeamMember) => {
    setSelectedForTarget(member);
    setTargetDialogOpen(true);
  };

  const handleEditClick = (member: ISalesTeamMember) => {
    setSelectedForEdit(member);
    setEditTerritory(member.territory || '');
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedForEdit) return;

    try {
      await salesApi.updateTeamMember(selectedForEdit.id, {
        territory: editTerritory
      });
      await fetchTeamMembers();
      setEditDialogOpen(false);
      setSelectedForEdit(null);
      setEditTerritory('');
    } catch (err) {
      console.error('Failed to update territory:', err);
      setError('Failed to update territory');
    }
  };

  const handleCreateSalesTeamMember = async (userId: string) => {
    try {
      await salesApi.createSalesTeamMember({
        userId,
        territory: '',
        targetQuarter: new Date().getMonth() < 3 ? 1 : 
                      new Date().getMonth() < 6 ? 2 : 
                      new Date().getMonth() < 9 ? 3 : 4,
        targetYear: new Date().getFullYear(),
        targetAmount: 0,
        reportingTo: null
      });
      await fetchTeamMembers();
    } catch (err) {
      console.error('Failed to create sales team member:', err);
      setError('Failed to create sales team member');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Sales Team Management
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search by name or territory"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1 }}
        />
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            label="Sort By"
          >
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="performance">Performance</MenuItem>
            <MenuItem value="visits">Visits</MenuItem>
            <MenuItem value="territory">Territory</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Role</InputLabel>
          <Select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            label="Role"
          >
            <MenuItem value="all">All Roles</MenuItem>
            <MenuItem value="SALES_EXECUTIVE">Sales Executive</MenuItem>
            <MenuItem value="ZONAL_HEAD">Zonal Head</MenuItem>
            <MenuItem value="COUNTRY_HEAD">Country Head</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Tabs
        value={tabValue}
        onChange={(_, newValue) => setTabValue(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="All Members" />
        <Tab label="Sales Executives" />
        <Tab label="Zonal Heads" />
        <Tab label="Country Heads" />
      </Tabs>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Territory</TableCell>
              <TableCell>Target Amount (Sheets)</TableCell>
              <TableCell>Target Achievement</TableCell>
              <TableCell>Visits</TableCell>
              <TableCell>Attendance</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getFilteredMembers().map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.name}</TableCell>
                <TableCell>
                  <Chip
                    label={ROLE_LABELS[member.role as keyof typeof ROLE_LABELS]}
                    sx={{
                      bgcolor: ROLE_COLORS[member.role as keyof typeof ROLE_COLORS],
                      color: 'white'
                    }}
                  />
                </TableCell>
                <TableCell>{member.territory}</TableCell>
                <TableCell>
                  {member.targetAmount ? 
                    Math.round(member.targetAmount).toLocaleString() : 
                    '—'
                  }
                </TableCell>
                <TableCell>
                  <Chip
                    label={`${member.performance?.targetAchievement || 0}%`}
                    color={getPerformanceColor(member.performance?.targetAchievement || 0)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{member.performance?.visitsCompleted || 0}</TableCell>
                <TableCell>
                  {`${member.attendance?.present || 0}/${member.attendance?.total || 0}`}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View Details">
                    <IconButton onClick={() => handleViewDetails(member)}>
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Set Target">
                    <IconButton onClick={() => handleSetTarget(member)}>
                      <AssessmentIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleEditClick(member)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedMember && (
        <SalesTeamMemberDetails
          member={selectedMember}
          onClose={handleCloseDetails}
        />
      )}

      {selectedForTarget && (
        <SalesTeamTargetDialog
          open={targetDialogOpen}
          onClose={() => {
            setTargetDialogOpen(false);
            setSelectedForTarget(null);
          }}
          member={selectedForTarget}
          onUpdate={fetchTeamMembers}
        />
      )}

      {editDialogOpen && selectedForEdit && (
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
          <DialogTitle>Edit Territory</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Territory"
              fullWidth
              value={editTerritory}
              onChange={(e) => setEditTerritory(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default SalesTeamManagement; 