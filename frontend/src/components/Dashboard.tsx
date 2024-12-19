import React, { useState } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Container,
  ToggleButton,
  ToggleButtonGroup 
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SKUManagement from './SKUManagement';
import SKUCategoryView from './SKUCategoryView';

interface DashboardProps {
  children?: React.ReactNode;
}

const Dashboard: React.FC<DashboardProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'category'>('table');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: 'table' | 'category',
  ) => {
    if (newView !== null) {
      setViewMode(newView);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Artis Dashboard
          </Typography>
          <Typography sx={{ mr: 2 }}>
            Welcome, {user?.username}
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewChange}
            aria-label="view mode"
          >
            <ToggleButton value="table" aria-label="table view">
              Table View
            </ToggleButton>
            <ToggleButton value="category" aria-label="category view">
              Category View
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {viewMode === 'table' ? <SKUManagement /> : <SKUCategoryView />}
        {children}
      </Container>
    </Box>
  );
};

export default Dashboard; 