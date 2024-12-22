import React from 'react';
import { Link } from 'react-router-dom';
import { MenuItem } from '@mui/material';

const Navbar: React.FC = () => {
  return (
    <div>
      {/* Add to your menu items */}
      <MenuItem component={Link} to="/orders">
        Orders
      </MenuItem>
    </div>
  );
};

export default Navbar; 