import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  IconButton,
  Stack,
  Skeleton,
  useTheme,
  Collapse,
  Tooltip,
  Button,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Product } from '../types/product';
import CatalogTags from './CatalogTags';

interface Props {
  products: Product[];
  selectedProducts: string[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onQuickView: (product: Product) => void;
  onSelectionChange: (ids: string[]) => void;
  loading?: boolean;
}

const ProductCardView: React.FC<Props> = ({
  products,
  selectedProducts,
  onEdit,
  onDelete,
  onQuickView,
  onSelectionChange,
  loading = false,
}) => {
  const theme = useTheme();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleCardClick = (productId: string, event: React.MouseEvent) => {
    // If clicking on an action button, don't expand/collapse
    if ((event.target as HTMLElement).closest('.action-button')) {
      return;
    }
    
    // Toggle expand/collapse
    setExpandedCard(expandedCard === productId ? null : productId);
  };

  if (loading) {
    return (
      <Stack spacing={1}>
        {[...Array(10)].map((_, index) => (
          <Card key={index} sx={{ p: 1.5, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton variant="text" width="10%" />
              <Skeleton variant="text" width="20%" />
              <Skeleton variant="text" width="40%" />
              <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 2 }} />
                <Skeleton variant="circular" width={24} height={24} />
              </Box>
            </Box>
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      {products.map((product, index) => {
        const isExpanded = expandedCard === product.id;
        
        return (
          <Card
            key={product.id}
            onClick={(e) => handleCardClick(product.id, e)}
            sx={{
              p: 1.5,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(10px)',
              cursor: 'pointer',
              border: '1px solid',
              borderColor: isExpanded 
                ? theme.palette.primary.main 
                : theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              borderRadius: 3,
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              boxShadow: isExpanded 
                ? `0 0 0 1px ${theme.palette.primary.main}` 
                : 'none',
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderColor: theme.palette.primary.main,
                transform: 'translateY(-1px)',
                boxShadow: theme.shadows[2],
              },
            }}
          >
            {/* Primary Info - Always Visible */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
              minHeight: 36,
            }}>
              {/* Index */}
              <Box
                sx={{
                  minWidth: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: '1px solid',
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'text.secondary',
                    opacity: 0.7,
                  }}
                >
                  {(index + 1).toString().padStart(2, '0')}
                </Typography>
              </Box>

              {/* Artis Codes */}
              <Box sx={{ 
                display: 'flex', 
                gap: 0.5,
                flexShrink: 0,
              }}>
                {product.artisCodes.map((code, idx) => (
                  <Typography
                    key={idx}
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: theme.palette.primary.main,
                      px: 1.5,
                      py: 0.25,
                      borderRadius: 2,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.08)' : 'rgba(25, 118, 210, 0.08)',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.15)' : 'rgba(25, 118, 210, 0.15)',
                      }
                    }}
                  >
                    {code}
                  </Typography>
                ))}
              </Box>

              {/* Product Name */}
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  flexGrow: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                  fontWeight: 500,
                  minWidth: 0,
                  px: 1,
                }}
              >
                {product.name || product.supplierCode}
              </Typography>

              {/* Catalogs and Actions */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 1,
                flexShrink: 0
              }}>
                <CatalogTags catalogs={product.catalogs} size="small" />
                
                {/* Expand Indicator */}
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: theme.palette.action.hover,
                    transition: 'all 0.3s ease',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <ExpandMoreIcon sx={{ fontSize: 18, opacity: 0.7 }} />
                </Box>
              </Box>
            </Box>

            {/* Expandable Content */}
            <Collapse in={isExpanded}>
              <Box sx={{ 
                mt: 2, 
                pt: 2, 
                borderTop: 1, 
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                {/* Info Grid */}
                <Box sx={{ 
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(150px, 1fr))' },
                  gap: 2,
                  mb: 1
                }}>
                  <Box>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: theme.palette.primary.main,
                        fontWeight: 600
                      }}
                    >
                      Supplier
                    </Typography>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mt: 0.5 }}>
                      {product.supplier}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: theme.palette.primary.main,
                        fontWeight: 600
                      }}
                    >
                      Supplier Code
                    </Typography>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mt: 0.5 }}>
                      {product.supplierCode}
                    </Typography>
                  </Box>
                  
                  {product.category && (
                    <Box>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          color: theme.palette.primary.main,
                          fontWeight: 600
                        }}
                      >
                        Category
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mt: 0.5 }}>
                        {product.category}
                      </Typography>
                    </Box>
                  )}
                </Box>
                  
                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickView(product);
                    }}
                    startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                    sx={{ 
                      flex: 1,
                      bgcolor: theme.palette.primary.main,
                      color: 'white',
                      textTransform: 'none',
                      fontSize: '0.813rem',
                      py: 0.75,
                      borderRadius: 2,
                      boxShadow: 'none',
                      '&:hover': {
                        bgcolor: theme.palette.primary.dark,
                        boxShadow: theme.shadows[2]
                      }
                    }}
                  >
                    View Details
                  </Button>
                  
                  <Button
                    size="small"
                    variant="outlined"
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(product);
                    }}
                    startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                    sx={{ 
                      flex: 1,
                      borderColor: theme.palette.divider,
                      color: 'text.primary',
                      textTransform: 'none',
                      fontSize: '0.813rem',
                      py: 0.75,
                      borderRadius: 2,
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        bgcolor: theme.palette.action.hover
                      }
                    }}
                  >
                    Edit
                  </Button>
                </Box>
              </Box>
            </Collapse>
          </Card>
        );
      })}

      {products.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No products found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Try adjusting your filters or add a new product
          </Typography>
        </Box>
      )}
    </Stack>
  );
};

export default ProductCardView;