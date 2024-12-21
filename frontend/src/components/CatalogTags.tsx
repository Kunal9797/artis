import React from 'react';
import { Chip, Stack } from '@mui/material';

const catalogColors: { [key: string]: string } = {
  'Artis': '#2196f3',    // blue
  'Woodrica': '#4caf50', // green
  'Artvio': '#f44336',   // red
  'Liner': '#ff9800'     // orange
};

interface Props {
  catalogs?: string[];
}

const CatalogTags: React.FC<Props> = ({ catalogs = [] }) => {
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
      {catalogs.map((catalog) => (
        <Chip
          key={catalog}
          label={catalog}
          size="small"
          sx={{
            backgroundColor: catalogColors[catalog] || '#9e9e9e',
            color: 'white',
            fontSize: '0.75rem',
            height: '20px'
          }}
        />
      ))}
    </Stack>
  );
};

export default CatalogTags; 