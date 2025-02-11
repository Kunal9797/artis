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
  MenuItem
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { salesApi } from '../services/salesApi';
import { ISalesTeamMember } from '../types/sales';
import { ROLE_LABELS, ROLE_COLORS } from '../types/user';
import SalesTeamMemberDetails from './SalesTeamMemberDetails';

const SalesTeamManagement: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<ISalesTeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<ISalesTeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const formatTeamMember = (member: any): ISalesTeamMember => {
    return {
      id: member.id,
      name: `${member.User?.firstName} ${member.User?.lastName}`,
      userId: member.userId,
      role: member.role,
      area: member.territory || '',
      territory: member.territory,
      status: 'online' as const,
      reportingTo: member.reportingTo,
      targetQuarter: member.targetQuarter,
      targetYear: member.targetYear,
      targetAmount: member.targetAmount,
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
      const response = await salesApi.getAllSalesTeam();
      const formattedMembers = response.data.map(formatTeamMember);
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
    return teamMembers.filter(member => {
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
                  <Tooltip title="Edit">
                    <IconButton>
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
    </Box>
  );
};

export default SalesTeamManagement; 