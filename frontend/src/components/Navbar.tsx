import React from 'react';
import { Link } from 'react-router-dom';
import { MenuItem } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { isAdmin } = useAuth();

  return (
    <div>
      {/* Add to your menu items */}
      <MenuItem component={Link} to="/orders">
        Orders
      </MenuItem>
      <MenuItem component={Link} to="/inventory">
        Inventory
      </MenuItem>
      {isAdmin() && (
        <MenuItem component={Link} to="/users">
          User Management
        </MenuItem>
      )}
    </div>
  );
};

export default Navbar; 