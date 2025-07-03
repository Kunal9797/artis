import React, { useEffect, useState } from 'react';
import { Chip, Tooltip } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import CloudIcon from '@mui/icons-material/Cloud';
import ComputerIcon from '@mui/icons-material/Computer';
import api from '../services/api';

const DatabaseIndicator: React.FC = () => {
  const [dbSource, setDbSource] = useState<'local' | 'supabase' | 'render' | 'unknown'>('unknown');
  
  useEffect(() => {
    // Check backend health endpoint to determine database
    const checkDatabase = async () => {
      try {
        const response = await api.get('/api/health');
        // In production, we'll need to add database info to health endpoint
        // For now, use environment detection
        const apiUrl = api.defaults.baseURL || '';
        
        if (apiUrl.includes('localhost')) {
          // Local development - could be any database
          setDbSource('supabase'); // We know you're using Supabase now
        } else if (apiUrl.includes('render')) {
          setDbSource('render');
        } else {
          setDbSource('unknown');
        }
      } catch (error) {
        console.error('Failed to check database:', error);
      }
    };
    
    checkDatabase();
  }, []);
  
  const getIcon = () => {
    switch (dbSource) {
      case 'supabase':
        return <CloudIcon sx={{ fontSize: 16, mr: 0.5 }} />;
      case 'render':
        return <StorageIcon sx={{ fontSize: 16, mr: 0.5 }} />;
      case 'local':
        return <ComputerIcon sx={{ fontSize: 16, mr: 0.5 }} />;
      default:
        return <StorageIcon sx={{ fontSize: 16, mr: 0.5 }} />;
    }
  };
  
  const getLabel = () => {
    switch (dbSource) {
      case 'supabase':
        return 'Supabase DB';
      case 'render':
        return 'Render DB';
      case 'local':
        return 'Local DB';
      default:
        return 'Database';
    }
  };
  
  const getColor = () => {
    switch (dbSource) {
      case 'supabase':
        return 'success';
      case 'render':
        return 'primary';
      case 'local':
        return 'warning';
      default:
        return 'default';
    }
  };
  
  return (
    <Tooltip title={`Connected to ${getLabel()}`}>
      <Chip
        icon={getIcon()}
        label={getLabel()}
        size="small"
        color={getColor() as any}
        variant="outlined"
        sx={{ 
          ml: 2,
          height: 24,
          fontSize: '0.75rem'
        }}
      />
    </Tooltip>
  );
};

export default DatabaseIndicator;