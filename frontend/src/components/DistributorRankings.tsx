import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Skeleton,
  Chip
} from '@mui/material';
import {
  SwapVert as SwapIcon,
  LocalShipping as VolumeIcon,
  ShoppingCart as OrdersIcon
} from '@mui/icons-material';
import distributorOrderService from '../services/distributorOrderService';

interface RankingData {
  distributor_name: string;
  location: string;
  state: string;
  total_orders: number;
  total_volume: number;
  avg_order_size: number;
  volume_rank: number;
  frequency_rank: number;
}

const DistributorRankings: React.FC = () => {
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'volume' | 'orders'>('volume');
  const [showTop, setShowTop] = useState(true); // true = top performers, false = bottom performers

  useEffect(() => {
    loadRankings();
  }, [sortBy]);

  const loadRankings = async () => {
    setLoading(true);
    try {
      const response = await distributorOrderService.getDistributorRankings(sortBy);
      if (response.success) {
        setRankings(response.data);
      }
    } catch (error) {
      console.error('Error loading rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayedRankings = showTop
    ? rankings.slice(0, 10)
    : [...rankings].reverse().slice(0, 10);

  const getRankDisplay = (index: number) => {
    if (showTop) {
      if (index === 0) return '🥇';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';
      return `#${index + 1}`;
    } else {
      // For bottom performers, show actual rank from bottom
      const actualRank = rankings.length - index;
      return `#${actualRank}`;
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5">
          Distributor Rankings
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={sortBy}
            exclusive
            onChange={(e, value) => value && setSortBy(value)}
            size="small"
          >
            <ToggleButton value="volume">
              <VolumeIcon sx={{ mr: 1, fontSize: 20 }} /> By Volume
            </ToggleButton>
            <ToggleButton value="orders">
              <OrdersIcon sx={{ mr: 1, fontSize: 20 }} /> By Orders
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant={showTop ? "contained" : "outlined"}
            onClick={() => setShowTop(!showTop)}
            startIcon={<SwapIcon />}
            size="small"
          >
            {showTop ? 'Top 10' : 'Bottom 10'}
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Paper sx={{ p: 3 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 2 }} />
          ))}
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="80">Rank</TableCell>
                <TableCell>Distributor</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>State</TableCell>
                <TableCell align="right">Total Volume</TableCell>
                <TableCell align="right">Total Orders</TableCell>
                <TableCell align="right">Avg Order Size</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedRankings.map((distributor, index) => (
                <TableRow
                  key={distributor.distributor_name}
                  hover
                  sx={{
                    bgcolor: showTop && index < 3 ? 'action.hover' : 'inherit'
                  }}
                >
                  <TableCell>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: showTop && index < 3 ? 'bold' : 'normal',
                        color: !showTop ? 'text.secondary' : 'inherit'
                      }}
                    >
                      {getRankDisplay(index)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight={showTop && index < 3 ? 'medium' : 'normal'}>
                      {distributor.distributor_name}
                    </Typography>
                  </TableCell>
                  <TableCell>{distributor.location}</TableCell>
                  <TableCell>
                    <Chip label={distributor.state || 'N/A'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body1"
                      fontWeight={sortBy === 'volume' ? 'bold' : 'normal'}
                      color={sortBy === 'volume' ? 'primary' : 'inherit'}
                    >
                      {distributor.total_volume.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body1"
                      fontWeight={sortBy === 'orders' ? 'bold' : 'normal'}
                      color={sortBy === 'orders' ? 'primary' : 'inherit'}
                    >
                      {distributor.total_orders}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {Math.round(distributor.avg_order_size).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default DistributorRankings;