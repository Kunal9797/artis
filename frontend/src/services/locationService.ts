export const getAddressFromCoordinates = async (latitude: number, longitude: number): Promise<string> => {
  try {
    // Add a small delay to respect rate limiting
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Artis Attendance App' // Required by OSM
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch address');
    }

    const data = await response.json();
    
    // Debug log to see what data we're getting
    console.log('OpenStreetMap Response:', data);
    console.log('Address Details:', data.address);

    if (data.address) {
      const {
        county,          // Bapoli
        state_district,  // Panipat
        state,          // Haryana
        country         // India
      } = data.address;

      // Debug log for each address component
      console.log('Address Components:', {
        county,
        state_district,
        state,
        country
      });

      // Build address from most specific to least specific
      const addressParts = [
        county,
        state_district,
        state,
        country
      ].filter(Boolean); // Remove empty/undefined values

      console.log('Final Address Parts:', addressParts);

      return addressParts.join(', ');
    }
    
    return data.display_name || `${latitude}, ${longitude}`;
  } catch (error) {
    console.error('Error getting address:', error);
    return `${latitude}, ${longitude}`;
  }
}; 