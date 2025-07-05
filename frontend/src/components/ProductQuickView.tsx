import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Divider,
  IconButton,
  Chip,
  Grid,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';
import CategoryIcon from '@mui/icons-material/Category';
import CodeIcon from '@mui/icons-material/Code';
import InventoryIcon from '@mui/icons-material/Inventory';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Product } from '../types/product';
import CatalogTags from './CatalogTags';

interface Props {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}

const ProductQuickView: React.FC<Props> = ({ product, open, onClose, onEdit }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!product) return null;

  const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | React.ReactNode }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <Box sx={{ 
        color: 'text.secondary', 
        mt: 0.5,
        display: 'flex',
        alignItems: 'center'
      }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body1" sx={{ mt: 0.5 }}>
          {value || '-'}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="div">
            Product Details
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{
              color: 'text.secondary',
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Header Section */}
          <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
              {product.artisCodes.join(' / ')}
            </Typography>
            <Typography variant="h6" color="text.primary">
              {product.name || 'Unnamed Product'}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <CatalogTags catalogs={product.catalogs} size="medium" />
            </Box>
          </Box>

          <Divider />

          {/* Product Information */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <InfoRow
                  icon={<CategoryIcon />}
                  label="Category"
                  value={product.category}
                />
                <InfoRow
                  icon={<BusinessIcon />}
                  label="Supplier"
                  value={
                    <Stack spacing={0.5}>
                      <Typography variant="body1">{product.supplier}</Typography>
                      <Chip 
                        label={product.supplierCode} 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          fontFamily: 'monospace',
                          width: 'fit-content'
                        }}
                      />
                    </Stack>
                  }
                />
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <InfoRow
                  icon={<CodeIcon />}
                  label="All Artis Codes"
                  value={
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {product.artisCodes.map((code) => (
                        <Chip
                          key={code}
                          label={code}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  }
                />
                {product.gsm && (
                  <InfoRow
                    icon={<span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>GSM</span>}
                    label="GSM Value"
                    value={product.gsm}
                  />
                )}
              </Stack>
            </Grid>
          </Grid>

          {/* Inventory Information (if available) */}
          {(product.currentStock !== undefined || product.avgConsumption !== undefined) && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Inventory Information
                </Typography>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  {product.currentStock !== undefined && (
                    <Grid item xs={6}>
                      <InfoRow
                        icon={<InventoryIcon />}
                        label="Current Stock"
                        value={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body1">
                              {product.currentStock} kg
                            </Typography>
                            <Chip
                              label={product.currentStock > 0 ? 'In Stock' : 'Out of Stock'}
                              size="small"
                              color={product.currentStock > 0 ? 'success' : 'error'}
                              variant="filled"
                            />
                          </Stack>
                        }
                      />
                    </Grid>
                  )}
                  {product.avgConsumption !== undefined && (
                    <Grid item xs={6}>
                      <InfoRow
                        icon={<TrendingUpIcon />}
                        label="Average Consumption"
                        value={`${product.avgConsumption} kg/month`}
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>
            </>
          )}

          {/* Additional Information */}
          {product.thickness && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Additional Details
                </Typography>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <InfoRow
                    icon={<span style={{ fontWeight: 'bold' }}>T</span>}
                    label="Thickness"
                    value={product.thickness}
                  />
                  {product.texture && (
                    <InfoRow
                      icon={<span style={{ fontWeight: 'bold' }}>TX</span>}
                      label="Texture"
                      value={product.texture}
                    />
                  )}
                </Stack>
              </Box>
            </>
          )}

          {/* Timestamps */}
          {product.lastUpdated && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Last updated: {new Date(product.lastUpdated).toLocaleString()}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>
          Close
        </Button>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={onEdit}
        >
          Edit Product
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductQuickView;