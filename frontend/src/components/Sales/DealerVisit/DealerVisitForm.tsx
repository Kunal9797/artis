import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  IconButton,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { salesApi } from '../../../services/salesApi';

interface ProductSales {
  liner: number;
  artvio08: number;
  woodrica08: number;
  artis1: number;
}

interface DealerVisitFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

const DealerVisitForm: React.FC<DealerVisitFormProps> = ({ onSubmit, onCancel }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [dealerName, setDealerName] = useState('');
  const [dealerNames, setDealerNames] = useState<string[]>([]);
  const [sales, setSales] = useState<ProductSales>({
    liner: 0,
    artvio08: 0,
    woodrica08: 0,
    artis1: 0,
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddDealer = () => {
    if (dealerName.trim() && !dealerNames.includes(dealerName.trim())) {
      setDealerNames([...dealerNames, dealerName.trim()]);
      setDealerName('');
    }
  };

  const handleSubmit = async () => {
    if (dealerNames.length === 0) {
      alert('Please add at least one dealer');
      return;
    }
    setLoading(true);
    try {
      await salesApi.recordDealerVisit({
        dealerNames,
        sales,
        visitDate: new Date().toISOString(),
        notes,
        location: {
          address: "Manual Entry", // We'll add location later
          lat: 0,
          lng: 0
        }
      });
      onSubmit();
    } catch (error) {
      console.error('Error submitting visit:', error);
      alert('Failed to submit visit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ p: isMobile ? 2 : 3 }}>
      {/* Dealer Names Input */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Dealer Names
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={dealerName}
            onChange={(e) => setDealerName(e.target.value)}
            placeholder="Enter dealer name"
            onKeyPress={(e) => e.key === 'Enter' && handleAddDealer()}
          />
          <Button
            variant="contained"
            onClick={handleAddDealer}
            startIcon={<AddIcon />}
          >
            Add
          </Button>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {dealerNames.map((name, index) => (
            <Chip
              key={index}
              label={name}
              onDelete={() => setDealerNames(dealerNames.filter((_, i) => i !== index))}
              size="small"
            />
          ))}
        </Box>
      </Box>

      {/* Sales Input */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Sales (Sheets)
        </Typography>
        <Stack spacing={2}>
          {Object.entries(sales).map(([product, value]) => (
            <TextField
              key={product}
              label={product.toUpperCase()}
              type="number"
              size="small"
              value={value}
              onChange={(e) => setSales({
                ...sales,
                [product]: parseInt(e.target.value) || 0
              })}
              InputProps={{ inputProps: { min: 0 } }}
            />
          ))}
        </Stack>
      </Box>

      {/* Notes */}
      <TextField
        multiline
        rows={3}
        label="Notes (Optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {/* Actions */}
      <Stack 
        direction="row" 
        spacing={2} 
        justifyContent="flex-end"
        sx={{ mt: 3 }}
      >
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || dealerNames.length === 0}
        >
          Submit Visit
        </Button>
      </Stack>
    </Stack>
  );
};

export default DealerVisitForm; 