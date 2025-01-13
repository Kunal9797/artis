import axios from 'axios';

export default async function geocodeAddress(city: string, state: string): Promise<{ lat: number; lng: number }> {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search`, {
        params: {
          q: `${city}, ${state}, India`,
          format: 'json',
          limit: 1
        }
      }
    );

    if (response.data && response.data[0]) {
      return {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon)
      };
    }

    // Fallback coordinates for Indian cities
    const fallbackCoords: { [key: string]: { lat: number; lng: number } } = {
      'ahmedabad': { lat: 23.0225, lng: 72.5714 },
      'ahemdabad': { lat: 23.0225, lng: 72.5714 }, // Common misspelling
      'bangalore': { lat: 12.9716, lng: 77.5946 },
      'bengluru': { lat: 12.9716, lng: 77.5946 }, // Common misspelling
      'bengaluru': { lat: 12.9716, lng: 77.5946 }, // Another spelling
      'delhi': { lat: 28.6139, lng: 77.2090 },
      'mumbai': { lat: 19.0760, lng: 72.8777 },
      'chennai': { lat: 13.0827, lng: 80.2707 },
      'kolkata': { lat: 22.5726, lng: 88.3639 },
      'hyderabad': { lat: 17.3850, lng: 78.4867 },
      'pune': { lat: 18.5204, lng: 73.8567 },
      'surat': { lat: 21.1702, lng: 72.8311 },
      'jaipur': { lat: 26.9124, lng: 75.7873 }
    };

    const cityKey = Object.keys(fallbackCoords).find(
      k => k.toLowerCase() === city.toLowerCase()
    );

    if (cityKey) {
      return fallbackCoords[cityKey];
    }

    throw new Error(`Location not found: ${city}, ${state}`);
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
} 