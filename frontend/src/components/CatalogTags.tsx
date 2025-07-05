import React from 'react';
import { Chip, Stack } from '@mui/material';

const catalogConfig: { [key: string]: { bg: string; color: string; border?: string } } = {
  'Artis': { 
    bg: '#FFD700', // Gold
    color: '#000000'
  },
  'Woodrica': { 
    bg: '#4caf50', // Green
    color: '#ffffff'
  },
  'Artvio': { 
    bg: '#f44336', // Red
    color: '#ffffff'
  },
  'Liner': { 
    bg: '#ff9800', // Orange
    color: '#ffffff'
  }
};

interface Props {
  catalogs?: string[] | null;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
}

const CatalogTags: React.FC<Props> = ({ catalogs, size = 'small', variant = 'filled' }) => {
  // Ensure we always have an array
  const catalogArray = Array.isArray(catalogs) ? catalogs : [];

  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
      {catalogArray.map((catalog) => {
        const config = catalogConfig[catalog] || { bg: '#9e9e9e', color: '#ffffff' };
        
        return (
          <Chip
            key={catalog}
            label={catalog}
            size={size}
            sx={{
              backgroundColor: variant === 'filled' ? config.bg : 'transparent',
              color: variant === 'filled' ? config.color : config.bg,
              border: variant === 'outlined' ? `1px solid ${config.bg}` : 'none',
              fontSize: size === 'small' ? '0.7rem' : '0.8rem',
              height: size === 'small' ? '18px' : '22px',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: variant === 'filled' 
                  ? config.bg 
                  : `${config.bg}20`,
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease'
            }}
          />
        );
      })}
    </Stack>
  );
};

export default CatalogTags; 