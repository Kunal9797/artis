export const runConnectionTests = async () => {
    const tests = {
      backendHealth: false,
      backendAPI: false,
      inventoryFetch: false
    };
  
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8099';
  
    try {
      const healthCheck = await fetch(`${API_URL}/api/health`);
      const healthData = await healthCheck.json();
      tests.backendHealth = healthData.status === 'ok';
  
      const apiTest = await fetch(`${API_URL}/api/test`);
      const apiData = await apiTest.json();
      tests.backendAPI = apiData.message === 'Backend is working!';
  
      const inventoryTest = await fetch(`${API_URL}/api/inventory`);
      const inventoryData = await inventoryTest.json();
      tests.inventoryFetch = Array.isArray(inventoryData);
    } catch (error) {
      console.error('Connection tests failed:', error);
    }
  
    return tests;
  };