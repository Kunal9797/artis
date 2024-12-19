import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Collapse,
  Typography,
  Paper,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { getSKUs } from '../services/api';

interface SKU {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  unit: string;
}

interface CategoryMap {
  [key: string]: SKU[];
}

const SKUCategoryView: React.FC = () => {
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({});
  const [openCategories, setOpenCategories] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSKUs = async () => {
      try {
        const data = await getSKUs();
        
        // Organize SKUs by category
        const grouped = data.reduce((acc: CategoryMap, sku: SKU) => {
          if (!acc[sku.category]) {
            acc[sku.category] = [];
          }
          acc[sku.category].push(sku);
          return acc;
        }, {});
        
        setCategoryMap(grouped);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching SKUs:', error);
        setLoading(false);
      }
    };

    fetchSKUs();
  }, []);

  const handleCategoryClick = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  if (loading) return <Typography>Loading SKUs...</Typography>;

  return (
    <Paper sx={{ width: '100%', mt: 3, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        SKUs by Category
      </Typography>
      <List>
        {Object.entries(categoryMap).map(([category, categorySkus]) => (
          <Box key={category}>
            <ListItemButton onClick={() => handleCategoryClick(category)}>
              <ListItemText primary={category} secondary={`${categorySkus.length} items`} />
              {openCategories[category] ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={openCategories[category]} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {categorySkus.map((sku) => (
                  <ListItem key={sku.id} sx={{ pl: 4 }}>
                    <ListItemText
                      primary={sku.name}
                      secondary={`Code: ${sku.code} | Unit: ${sku.unit}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </Box>
        ))}
      </List>
    </Paper>
  );
};

export default SKUCategoryView; 