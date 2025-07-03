const axios = require('axios');

const API_BASE = 'http://127.0.0.1:8099/api';
let authToken = '';

// Login function
async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    authToken = response.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

// Test clearing all data
async function testClearAllData() {
  console.log('\n🗑️  Testing Clear All Data...\n');

  try {
    // Get initial state
    console.log('📊 Initial State:');
    const initialOps = await axios.get(`${API_BASE}/inventory/operations`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`  - Bulk Operations: ${initialOps.data.length}`);

    const inventory = await axios.get(`${API_BASE}/inventory`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const productsWithTransactions = inventory.data.filter(p => p.currentStock !== '0.00');
    console.log(`  - Products with stock: ${productsWithTransactions.length}`);

    // Clear all inventory transactions
    console.log('\n🧹 Clearing all inventory transactions...');
    await axios.delete(`${API_BASE}/inventory/clear`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ All inventory transactions cleared');

    // Clear all bulk operations
    console.log('\n🧹 Clearing all bulk operations history...');
    await axios.delete(`${API_BASE}/inventory/operations`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ All bulk operations cleared');

    // Verify final state
    console.log('\n📊 Final State:');
    const finalOps = await axios.get(`${API_BASE}/inventory/operations`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`  - Bulk Operations: ${finalOps.data.length}`);

    const finalInventory = await axios.get(`${API_BASE}/inventory`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const finalProductsWithStock = finalInventory.data.filter(p => p.currentStock !== '0.00');
    console.log(`  - Products with stock: ${finalProductsWithStock.length}`);

    // Check a specific product
    if (finalInventory.data.length > 0) {
      const sampleProduct = finalInventory.data[0];
      const details = await axios.get(`${API_BASE}/inventory/details/${sampleProduct.id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log(`\n  Sample Product (${sampleProduct.artisCodes[0]}):`);
      console.log(`    - Current Stock: ${details.data.product.currentStock}`);
      console.log(`    - Avg Consumption: ${sampleProduct.avgConsumption}`);
      console.log(`    - Transactions: ${details.data.transactions.length}`);
    }

    console.log('\n✅ Clear all data test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Main function
async function main() {
  if (!await login()) {
    throw new Error('Cannot proceed without authentication');
  }

  await testClearAllData();
}

// Run the test
main().catch(console.error);