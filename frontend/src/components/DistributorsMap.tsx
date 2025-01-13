import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, FormGroup, FormControlLabel, Checkbox, Button, Typography, List, ListItem, ListItemText, TextField, Chip, IconButton } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, GeoJSON, ZoomControl } from "react-leaflet";
import 'leaflet/dist/leaflet.css';
import { Distributor } from '../types/distributor';
import { distributorApi } from '../services/distributorApi';
import { useTheme } from '../context/ThemeContext';
import { icon } from 'leaflet';
import geocodeAddress from '../services/geocodingService';
import L from 'leaflet';
import { indiaGeoJson } from '../data/indiaGeoJson';
import UploadIcon from '@mui/icons-material/Upload';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { coordinatesCache } from '../data/coordinatesCache';
import PhoneIcon from '@mui/icons-material/Phone';
import CloseIcon from '@mui/icons-material/Close';
import { statesGeoJson } from '../data/statesGeoJsonData';
import { Feature, Polygon, FeatureCollection } from 'geojson';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import { Layer, LatLngBounds, LatLngExpression } from 'leaflet';
import { GeoJSON as GeoJSONType } from 'geojson';


// India's boundaries (slightly adjusted for better view)
const INDIA_BOUNDS = {
  north: 37.5,  // Increased to show complete northern border
  south: 6.0,   // Decreased to show complete southern tip
  west: 68.0,   // Adjusted for complete western border
  east: 98.0    // Adjusted for complete eastern border
};

const getCatalogColor = (catalogs: string[]) => {
  const hasArtis = catalogs.includes('Artis');
  const hasArtvio = catalogs.includes('Artvio');
  const hasWoodrica = catalogs.includes('Woodrica');
  
  if (hasArtis && hasArtvio && hasWoodrica) return '#9b59b6';
  if (hasArtis && hasArtvio) return '#e74c3c';
  if (hasArtis && hasWoodrica) return '#3498db';
  if (hasArtvio && hasWoodrica) return '#2ecc71';
  if (hasArtis) return '#f1c40f';
  if (hasArtvio) return '#1abc9c';
  if (hasWoodrica) return '#e67e22';
  return '#95a5a6';
};

const customIcon = (isSelected: boolean, distributor: Distributor) => L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="
      width: ${isSelected ? '48px' : '36px'};
      height: ${isSelected ? '48px' : '36px'};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    ">
      <svg 
        viewBox="0 0 24 24" 
        style="
          width: ${isSelected ? '36px' : '28px'};
          height: ${isSelected ? '36px' : '28px'};
          transition: all 0.3s ease;
        "
      >
        <path 
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
          fill="${isSelected ? getCatalogColor(distributor.catalogs) : '#2c3e50'}"
          stroke="white"
          stroke-width="1"
        />
      </svg>
    </div>
  `,
  iconSize: [isSelected ? 48 : 36, isSelected ? 48 : 36],
  iconAnchor: [isSelected ? 24 : 18, isSelected ? 48 : 36],
  popupAnchor: [0, isSelected ? -48 : -36],
});

const isValidGeoJSON = (data: any) => {
  console.log('Validating GeoJSON:', data);
  if (!data) {
    console.error('GeoJSON is null or undefined');
    return false;
  }
  if (!data.type) {
    console.error('GeoJSON missing type property');
    return false;
  }
  if (!data.features && data.type === 'FeatureCollection') {
    console.error('FeatureCollection missing features array');
    return false;
  }
  return true;
};

// Helper function to calculate centroid of polygon
const getPolygonCenter = (coordinates: number[][][]): LatLngExpression => {
  let lat = 0, lng = 0, count = 0;
  coordinates[0].forEach(point => {
    lat += point[1];
    lng += point[0];
    count++;
  });
  return [lat / count, lng / count];
};

const StateLabels: React.FC<{ mapRef: React.RefObject<L.Map> }> = ({ mapRef }) => {
  useEffect(() => {
    if (!mapRef.current) return;

    const labelGroup = L.layerGroup().addTo(mapRef.current);

    // Add labels for each state
    statesGeoJson.features.forEach(feature => {
      if (feature.properties?.name && feature.geometry.type === 'Polygon') {
        const coordinates = feature.geometry.coordinates[0];
        
        // Calculate center
        let lat = 0, lng = 0;
        coordinates.forEach(point => {
          lat += point[1];
          lng += point[0];
        });
        const center: [number, number] = [
          lat / coordinates.length,
          lng / coordinates.length
        ];

        // Create and add label
        const label = L.divIcon({
          className: 'state-label',
          html: `<div>${feature.properties.name}</div>`,
          iconSize: [100, 20],
          iconAnchor: [50, 10]
        });

        L.marker(center, {
          icon: label,
          interactive: false,
          zIndexOffset: -1000
        }).addTo(labelGroup);
      }
    });

    // Cleanup
    return () => {
      if (mapRef.current) {
        labelGroup.remove();
      }
    };
  }, [mapRef.current]);

  return null;
};

// Single component for both popup and mobile panel
const DistributorInfo: React.FC<{ 
  distributors: Distributor[],
  isMobile?: boolean,
  onClose?: () => void 
}> = ({ distributors, isMobile = false, onClose }) => {
  const { isDarkMode } = useTheme();
  const location = `${distributors[0].city}, ${distributors[0].state}`;
  
  const content = (
    <Box sx={{ width: '100%' }}>
      {/* Location Header */}
      <Typography 
        variant="h6" 
        sx={{ 
          fontWeight: 600,
          mb: 2,
          fontSize: isMobile ? '1.2rem' : '1rem'
        }}
      >
        {location}
      </Typography>

      {/* Distributors List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {distributors.map(dist => (
          <Box key={dist.id}>
            {/* Name and Catalogs in same row */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.5,
              gap: 1
            }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 500,
                  flex: '0 0 auto'
                }}
              >
                {dist.name}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                gap: 0.5, 
                flexWrap: 'wrap',
                flex: '1 1 auto',
                justifyContent: 'flex-end'
              }}>
                {dist.catalogs.map(catalog => (
                  <Chip
                    key={catalog}
                    label={catalog}
                    size="small"
                    sx={{
                      height: '20px',
                      fontSize: '0.7rem',
                      bgcolor: getCatalogColor([catalog]),
                      color: '#fff'
                    }}
                  />
                ))}
              </Box>
            </Box>
            
            {/* Phone Number */}
            {dist.phoneNumber && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'text.secondary'
              }}>
                <PhoneIcon sx={{ fontSize: '0.9rem' }} />
                <Typography variant="body2">
                  {dist.phoneNumber}
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );

  // Mobile panel
  if (isMobile) {
    return (
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: isDarkMode ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          p: 3,
          pb: 4,
          zIndex: 1000,
        }}
      >
        {onClose && (
          <IconButton
            onClick={onClose}
            sx={{ 
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'text.secondary'
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
        {content}
      </Box>
    );
  }

  // Desktop popup
  return (
    <Popup>
      <Box sx={{ minWidth: 250, maxWidth: 300 }}>
        {content}
      </Box>
    </Popup>
  );
};

const DistributorsMap: React.FC = () => {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([]);
  const [locations, setLocations] = useState<Map<string, { lat: number; lng: number }>>(new Map());
  const { isDarkMode } = useTheme();
  const [filteredDistributors, setFilteredDistributors] = useState<Distributor[]>([]);
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [selectedDistributors, setSelectedDistributors] = useState<Distributor[] | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Distributor[] | null>(null);
  const isMobile = window.innerWidth <= 768;
  
  const mapStyle = {
    tiles: {
      url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
      attribution: '©OpenStreetMap, ©CartoDB'
    },
    adminBoundaries: {
      url: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
      attribution: '©OpenStreetMap, ©CartoDB'
    },
    outsideIndia: {
      color: '#000000',
      fillColor: isDarkMode ? '#1a1a1a' : '#4a4a4a',
      fillOpacity: 0.8,
      weight: 0,
      interactive: false
    },
    geoJson: {
      fillColor: 'transparent',
      weight: 2.5,
      opacity: 1,
      color: '#f1c40f',
      fillOpacity: 0
    },
    stateLines: {
      fillColor: 'transparent',
      weight: 1,
      opacity: 0.4,
      color: '#2c3e50',
      fillOpacity: 0,
      dashArray: '2'
    }
  };

  const styles = `
    .custom-div-icon {
      background: none;
      border: none;
      transition: all 0.3s ease;
    }
    .custom-div-icon svg {
      filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
      transition: all 0.3s ease;
    }
    .state-label {
      background: none;
      border: none;
      color: ${isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(44,62,80,0.3)'};
      font-size: 12px;
      font-weight: 500;
      text-align: center;
      text-transform: uppercase;
      pointer-events: none;
      white-space: nowrap;
      text-shadow: ${isDarkMode ? '1px 1px 1px rgba(0,0,0,0.5)' : '1px 1px 1px rgba(255,255,255,0.5)'};
    }
  `;

  useEffect(() => {
    const fetchDistributors = async () => {
      try {
        const data = await distributorApi.getAllDistributors();
        setDistributors(data);
        setFilteredDistributors(data);
        const catalogs = Array.from(new Set(data.flatMap(d => d.catalogs)));
        setSelectedCatalogs(catalogs);
      } catch (error) {
        console.error('Error fetching distributors:', error);
      }
    };
    fetchDistributors();
  }, []);

  useEffect(() => {
    // Initialize all locations at once instead of one by one
    const initializeLocations = () => {
      const newLocations = new Map();
      
      distributors.forEach(distributor => {
        const key = `${distributor.city}-${distributor.state}`;
        
        // First check if coordinates exist in distributor object
        if (distributor.coordinates) {
          newLocations.set(key, distributor.coordinates);
          return;
        }
        
        // Then check cache
        if (coordinatesCache[key]) {
          newLocations.set(key, coordinatesCache[key]);
          return;
        }
        
        // Log missing coordinates for debugging
        console.warn(`Missing coordinates for: ${key}`);
      });
      
      setLocations(newLocations);
    };

    if (distributors.length > 0) {
      initializeLocations();
    }
  }, [distributors]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      await distributorApi.importDistributors(file);
      // Refresh the distributors list
      const newDistributors = await distributorApi.getAllDistributors();
      setDistributors(newDistributors);
      setFilteredDistributors(newDistributors);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // Create the world polygon with proper typing
  const worldPolygon: FeatureCollection = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-180, -90],
          [-180, 90],
          [180, 90],
          [180, -90],
          [-180, -90]
        ]]
      }
    }]
  };

  // Create a mask using India's boundary
  const maskStyle = {
    fillColor: isDarkMode ? '#1a1a1a' : '#2c3e50',
    fillOpacity: 0.6,
    weight: 0,
    interactive: false
  };

  const handleCatalogToggle = (catalog: string) => {
    setSelectedCatalogs(prev => {
      if (prev.includes(catalog)) {
        return prev.filter(c => c !== catalog);
      } else {
        return [...prev, catalog];
      }
    });
  };

  useEffect(() => {
    const filtered = distributors.filter(distributor => {
      const matchesSearch = searchQuery === '' || 
        distributor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        distributor.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        distributor.state.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCatalogs = distributor.catalogs.some(catalog => 
        selectedCatalogs.includes(catalog)
      );

      return matchesSearch && matchesCatalogs;
    });
    
    setFilteredDistributors(filtered);
  }, [distributors, searchQuery, selectedCatalogs]);

  const handleClearAll = () => {
    setSelectedCatalogs([]);
    setDistributors([]);
    setFilteredDistributors([]);
    setLocations(new Map());
    setSearchQuery('');
  };

  const handleDeleteAll = async () => {
    try {
      await distributorApi.deleteAllDistributors();
      setSelectedCatalogs([]);
      setDistributors([]);
      setFilteredDistributors([]);
      setLocations(new Map());
      setSearchQuery('');
      setSelectedDistributor(null);
      setSelectedMarkerId(null);
    } catch (error) {
      console.error('Error deleting all distributors:', error);
      // Optionally show an error message to the user
    }
  };

  const MobileSearchResults = () => {
    if (!showMobileDropdown || !searchQuery || filteredDistributors.length === 0) return null;
    
    return (
      <Paper
        sx={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          mt: 1,
          maxHeight: '40vh',
          overflow: 'auto',
          zIndex: 1001,
          bgcolor: isDarkMode ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: 1,
          boxShadow: 3
        }}
      >
        {filteredDistributors.map((distributor) => (
          <Box
            key={distributor.id}
            onClick={() => {
              setSelectedDistributor(distributor);
              setSelectedMarkerId(distributor.id);
              setShowMobileDropdown(false);
              // Get location and center map on selected distributor
              const location = locations.get(`${distributor.city}-${distributor.state}`);
              if (location && mapRef.current) {
                mapRef.current.setView([location.lat, location.lng], 7);
              }
            }}
            sx={{
              p: 1.5,
              borderBottom: '1px solid',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              '&:last-child': { borderBottom: 'none' },
              cursor: 'pointer',
              '&:hover': {
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
              }
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {distributor.name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {distributor.city}, {distributor.state}
            </Typography>
          </Box>
        ))}
      </Paper>
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMobileDropdown) {
        setShowMobileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileDropdown]);

  const DistributorPopup: React.FC<{ distributor: Distributor }> = ({ distributor }) => (
    <Box sx={{ 
      minWidth: { xs: '200px', md: '250px' },
      maxWidth: { xs: '280px', md: '320px' },
      p: 1,
      '& .leaflet-popup-content-wrapper': {
        padding: 0,
        overflow: 'hidden',
        borderRadius: 2
      }
    }}>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}>
        {/* Header */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 0.5
        }}>
          <Typography variant="subtitle1" sx={{ 
            fontWeight: 600,
            fontSize: { xs: '0.9rem', md: '1rem' }
          }}>
            {distributor.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {distributor.catalogs.map(catalog => (
              <Chip
                key={catalog}
                label={catalog}
                size="small"
                sx={{
                  height: '20px',
                  fontSize: '0.7rem',
                  bgcolor: getCatalogColor([catalog]),
                  color: '#fff'
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Location & Contact */}
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          fontSize: { xs: '0.8rem', md: '0.9rem' }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOnIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
            <Typography variant="body2">
              {distributor.city}, {distributor.state}
            </Typography>
          </Box>
          {distributor.phoneNumber && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PhoneIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
              <Typography variant="body2">
                {distributor.phoneNumber}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );

  // Simple InfoPanel that works for both single and multiple distributors
  const InfoPanel: React.FC<{ 
    distributors: Distributor[], 
    onClose: () => void,
    onSelect?: (distributor: Distributor) => void 
  }> = ({ distributors, onClose, onSelect }) => {
    const isSingleDistributor = distributors.length === 1;
    const distributor = distributors[0]; // For location info

    return (
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: isDarkMode ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          borderTop: '1px solid',
          borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          p: 3,
          pb: 4,
          zIndex: 1000,
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{ 
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'text.secondary',
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Location header */}
        <Box sx={{ mb: 2, mt: 1 }}>
          <Typography variant="h6">
            {distributor.city}, {distributor.state}
          </Typography>
        </Box>

        {/* Distributor list */}
        <List sx={{ pt: 0 }}>
          {distributors.map(dist => (
            <ListItem 
              key={dist.id}
              sx={{ 
                p: 2,
                mb: 1,
                borderRadius: 1,
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  {dist.name}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                  {dist.catalogs.map(catalog => (
                    <Chip
                      key={catalog}
                      label={catalog}
                      size="small"
                      sx={{
                        bgcolor: getCatalogColor([catalog]),
                        color: '#fff'
                      }}
                    />
                  ))}
                </Box>

                {dist.phoneNumber && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <PhoneIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {dist.phoneNumber}
                    </Typography>
                  </Box>
                )}
              </Box>
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };

  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Desktop Sidebar */}
      <Paper sx={{
        width: { xs: 0, md: '300px' },
        height: '100%',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        zIndex: 1000,
        bgcolor: isDarkMode ? '#1a1a1a' : '#ffffff',
        borderRadius: 0,
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          height: '100%',
          display: 'flex', 
          flexDirection: 'column',
          p: 2,
          gap: 2 
        }}>
          {/* Catalogs Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: isDarkMode ? '#fff' : '#2c3e50' }}>
              Catalogs Distribution:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {['Woodrica', 'Artvio', 'Artis'].map(catalog => (
                <Chip
                  key={catalog}
                  label={`${catalog} (${distributors.filter(d => d.catalogs.includes(catalog)).length})`}
                  size="small"
                  variant={selectedCatalogs.includes(catalog) ? "filled" : "outlined"}
                  onClick={() => handleCatalogToggle(catalog)}
                  sx={{
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                    bgcolor: selectedCatalogs.includes(catalog) 
                      ? (isDarkMode ? '#2c3e50' : '#34495e')
                      : 'transparent',
                    color: selectedCatalogs.includes(catalog)
                      ? '#fff'
                      : (isDarkMode ? '#fff' : '#2c3e50'),
                    '&:hover': {
                      bgcolor: selectedCatalogs.includes(catalog)
                        ? (isDarkMode ? '#34495e' : '#2c3e50')
                        : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
                    },
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Search and List Section */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <TextField
              placeholder="Search distributors..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 1 }}
            />
            
            <Box sx={{ 
              flex: 1,
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'transparent',
              }
            }}>
              {filteredDistributors.map(distributor => (
                <Box
                  key={distributor.id}
                  onClick={() => setSelectedDistributor(distributor)}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                    }
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {distributor.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {distributor.city}, {distributor.state}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Bottom Actions */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            borderTop: 1,
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            pt: 2,
            mt: 'auto'
          }}>
            <Button
              variant="contained"
              size="small"
              component="label"
              startIcon={<CloudUploadIcon />}
              sx={{ 
                flex: 1,
                bgcolor: isDarkMode ? '#2c3e50' : '#34495e',
                '&:hover': {
                  bgcolor: isDarkMode ? '#34495e' : '#2c3e50'
                }
              }}
            >
              Import
              <input type="file" hidden onChange={handleFileUpload} />
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleDeleteAll}
              sx={{ 
                flex: 1,
                borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                color: isDarkMode ? '#e74c3c' : '#c0392b',
                '&:hover': {
                  borderColor: '#e74c3c',
                  backgroundColor: 'rgba(231, 76, 60, 0.1)'
                }
              }}
            >
              Delete All
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Mobile Top Bar - Only visible on mobile */}
      <Box sx={{
        display: { xs: 'flex', md: 'none' },
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        p: 1.5,
        bgcolor: isDarkMode ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
      }}>
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          width: '100%'
        }}>
          {/* Modern Search Bar */}
          <TextField
            size="small"
            placeholder="Search distributors..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowMobileDropdown(true);
            }}
            onFocus={() => setShowMobileDropdown(true)}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                borderRadius: '20px',
                height: '32px',
                '& fieldset': {
                  borderColor: 'transparent',
                  transition: 'border-color 0.2s',
                },
                '&:hover fieldset': {
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: isDarkMode ? '#3498db' : '#2980b9',
                },
              },
              '& .MuiInputBase-input': {
                padding: '4px 14px',
                fontSize: '0.875rem',
              }
            }}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ 
                  fontSize: '1.2rem', 
                  color: 'text.secondary',
                  ml: 0.5,
                  mr: -0.5 
                }} />
              ),
            }}
          />

          {/* Inline Filter Buttons */}
          <Box sx={{ 
            display: 'flex', 
            gap: 0.5,
            height: '32px',
          }}>
            {['Woodrica', 'Artvio', 'Artis'].map(catalog => (
              <Chip
                key={catalog}
                label={catalog}
                size="small"
                variant={selectedCatalogs.includes(catalog) ? "filled" : "outlined"}
                onClick={() => handleCatalogToggle(catalog)}
                sx={{
                  height: '32px',
                  minWidth: 'fit-content',
                  fontSize: '0.75rem',
                  borderRadius: '16px',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                  bgcolor: selectedCatalogs.includes(catalog) 
                    ? getCatalogColor([catalog])
                    : 'transparent',
                  color: selectedCatalogs.includes(catalog)
                    ? '#fff'
                    : (isDarkMode ? '#fff' : '#2c3e50'),
                  '&:hover': {
                    bgcolor: selectedCatalogs.includes(catalog)
                      ? getCatalogColor([catalog])
                      : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
                  },
                  transition: 'all 0.2s ease',
                  '& .MuiChip-label': {
                    padding: '0 8px'
                  }
                }}
              />
            ))}
          </Box>
        </Box>
        <MobileSearchResults />
      </Box>

      {/* Map Container */}
      <Box sx={{ flex: 1, position: 'relative', height: '100%' }}>
        <MapContainer
          ref={mapRef}
          center={[23.5937, 78.9629]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          maxBounds={[
            [INDIA_BOUNDS.south - 1, INDIA_BOUNDS.west - 1],
            [INDIA_BOUNDS.north + 1, INDIA_BOUNDS.east + 1]
          ]}
          minZoom={4}
          maxZoom={8}
          zoomSnap={0.5}
          zoomDelta={0.5}
          zoomControl={false}
        >
          <TileLayer {...mapStyle.tiles} />
          
          {/* Dark background for non-India areas */}
          {isValidGeoJSON(worldPolygon) && (
            <GeoJSON 
              key="world-mask"
              data={worldPolygon}
              style={maskStyle}
            />
          )}
          
          {/* White fill for India to create the mask */}
          {isValidGeoJSON(indiaGeoJson) && (
            <GeoJSON 
              key="india-mask"
              data={indiaGeoJson}
              style={{
                fillColor: 'white',
                fillOpacity: 1,
                weight: 0,
                opacity: 0
              }}
            />
          )}
          
          {/* India border */}
          {isValidGeoJSON(indiaGeoJson) && (
            <GeoJSON 
              key="india-border"
              data={indiaGeoJson}
              style={{
                fillColor: 'transparent',
                fillOpacity: 0,
                weight: 3.5,
                color: '#f1c40f',
                opacity: 1
              }}
            />
          )}
          
          {/* State boundaries */}
          {statesGeoJson && isValidGeoJSON(statesGeoJson) && (
            <GeoJSON
              key="state-boundaries"
              data={statesGeoJson as GeoJSONType}
              style={mapStyle.stateLines}
            />
          )}
          <StateLabels mapRef={mapRef} />
          
          <TileLayer {...mapStyle.adminBoundaries} />
          
          {Array.from(locations.entries()).map(([locationKey, location]) => {
            const locationDistributors = filteredDistributors.filter(
              d => `${d.city}-${d.state}` === locationKey
            );

            if (locationDistributors.length === 0) return null;

            return (
              <Marker
                key={locationKey}
                position={[location.lat, location.lng]}
                icon={customIcon(locationDistributors.some(d => d.id === selectedMarkerId), locationDistributors[0])}
                eventHandlers={{
                  click: () => {
                    if (isMobile) {
                      setSelectedLocation(locationDistributors);
                    } else {
                      setSelectedMarkerId(locationDistributors[0].id);
                    }
                  }
                }}
              >
                {!isMobile && selectedMarkerId === locationDistributors[0].id && (
                  <Popup>
                    <Box sx={{ minWidth: 250, maxWidth: 300 }}>
                      <Box sx={{ width: '100%' }}>
                        {/* Location Header */}
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 600,
                            mb: 2,
                            fontSize: '1rem'
                          }}
                        >
                          {`${locationDistributors[0].city}, ${locationDistributors[0].state}`}
                        </Typography>

                        {/* Distributors List */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {locationDistributors.map(dist => (
                            <Box key={dist.id}>
                              {/* Name and Catalogs in same row */}
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 0.5,
                                gap: 1
                              }}>
                                <Typography 
                                  variant="subtitle1" 
                                  sx={{ 
                                    fontWeight: 500,
                                    flex: '0 0 auto'
                                  }}
                                >
                                  {dist.name}
                                </Typography>
                                <Box sx={{ 
                                  display: 'flex', 
                                  gap: 0.5, 
                                  flexWrap: 'wrap',
                                  flex: '1 1 auto',
                                  justifyContent: 'flex-end'
                                }}>
                                  {dist.catalogs.map(catalog => (
                                    <Chip
                                      key={catalog}
                                      label={catalog}
                                      size="small"
                                      sx={{
                                        height: '20px',
                                        fontSize: '0.7rem',
                                        bgcolor: getCatalogColor([catalog]),
                                        color: '#fff'
                                      }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                              
                              {/* Phone Number */}
                              {dist.phoneNumber && (
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 1,
                                  color: 'text.secondary'
                                }}>
                                  <PhoneIcon sx={{ fontSize: '0.9rem' }} />
                                  <Typography variant="body2">
                                    {dist.phoneNumber}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  </Popup>
                )}
              </Marker>
            );
          })}
          
          <ZoomControl position="bottomright" />
        </MapContainer>
      </Box>

      {isMobile && selectedLocation && (
        <DistributorInfo 
          distributors={selectedLocation} 
          isMobile={true}
          onClose={() => {
            setSelectedLocation(null);
            setSelectedMarkerId(null);
          }}
        />
      )}
    </Box>
  );
};

export default DistributorsMap; 