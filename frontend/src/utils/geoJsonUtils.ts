import { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { statesGeoJson } from '../data/statesGeoJsonData';

export const createIndiaBoundary = (): Feature<Polygon> => {
  // Extract all coordinates from state features
  const allCoordinates = statesGeoJson.features.map(feature => {
    if (feature.geometry.type === 'Polygon') {
      return feature.geometry.coordinates[0]; // Get the outer ring of each state
    }
    return [];
  });

  // Combine all coordinates into a single array
  const mergedCoordinates = allCoordinates.reduce((acc, curr) => [...acc, ...curr], []);

  // Create a new Feature representing India
  return {
    type: 'Feature',
    properties: { name: 'India' },
    geometry: {
      type: 'Polygon',
      coordinates: [mergedCoordinates]
    }
  };
}; 