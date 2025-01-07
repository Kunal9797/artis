import React, { useState } from 'react';
import {
  Card,
  Box,
  Typography,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { InventoryItem } from './InventoryList';
import { useTheme } from '../../context/ThemeContext';

interface MobileInventoryCardProps {
  item: InventoryItem;
  onDetailsClick: (id: string) => void;
  index: number;
}

const MobileInventoryCard: React.FC<MobileInventoryCardProps> = ({ item, onDetailsClick, index }) => {
  const { isDarkMode } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDetailsClick(item.id);
  };

  return (
    <Card
      onClick={() => setExpanded(!expanded)}
      sx={{
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff',
        cursor: 'pointer',
        '&:hover': {
          bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.02)',
        },
      }}
    >
      {/* Primary Info - Always Visible */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        minHeight: 40
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          flexGrow: 1 
        }}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'text.secondary',
              minWidth: '20px',
            }}
          >
            {(index + 1).toString().padStart(2, '0')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {item.artisCodes.map((code, index) => (
              <Chip
                key={index}
                label={code}
                size="small"
                sx={{
                  height: 24,
                  '& .MuiChip-label': { 
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.875rem',
                    fontWeight: 500
                  },
                  bgcolor: isDarkMode ? '#1f6feb20' : '#e3f2fd',
                  color: isDarkMode ? '#90caf9' : '#1976d2'
                }}
              />
            ))}
          </Box>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          mx: 2,
          minWidth: 65
        }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
            CONS
          </Typography>
          <Typography sx={{ 
            fontSize: '0.85rem',
            fontWeight: 500,
            color: isDarkMode ? '#90caf9' : '#1976d2',
          }}>
            {Number(item.avgConsumption).toFixed(1)}
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: '1rem',
            fontWeight: 600,
            color: isDarkMode ? '#90caf9' : '#0d47a1',
            whiteSpace: 'nowrap',
          }}
        >
          {item.currentStock}
          <Typography component="span" sx={{ fontSize: '0.7rem', ml: 0.5, color: 'text.secondary' }}>
            kgs
          </Typography>
        </Typography>
      </Box>

      {/* Expandable Content */}
      <Collapse in={expanded}>
        <Box sx={{ 
          mt: 1, 
          pt: 1, 
          borderTop: 1, 
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {item.supplier}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: isDarkMode ? '#90caf9' : '#1976d2',
                fontWeight: 500
              }}>
                {item.supplierCode}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleDetailsClick}
              sx={{ 
                color: isDarkMode ? '#90caf9' : '#1976d2',
                p: 0.5
              }}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
          {item.category && (
            <Chip
              label={item.category}
              size="small"
              sx={{
                height: 20,
                '& .MuiChip-label': { px: 1, py: 0, fontSize: '0.75rem' },
                bgcolor: isDarkMode ? '#1f6feb20' : '#e3f2fd',
                color: isDarkMode ? '#90caf9' : '#1976d2'
              }}
            />
          )}
        </Box>
      </Collapse>
    </Card>
  );
};

export default MobileInventoryCard; 