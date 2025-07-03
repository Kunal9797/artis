const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://127.0.0.1:8099/api';
let authToken = '';

// Test data
const testTransactions = {
  in: {
    type: 'IN',
    quantity: 100,
    notes: 'Test purchase order'
  },
  out: {
    type: 'OUT', 
    quantity: 25,
    notes: 'Test consumption',
    includeInAvg: true
  },
  correction: {
    type: 'CORRECTION',
    quantity: -10,
    notes: 'Test inventory correction'
  }
};

// Helper function to create test Excel file
function createTestExcel() {
  const XLSX = require('xlsx');
  
  // Create consumption data
  const consumptionData = [
    ['SNO', 'DESIGN CODE', '30/09/24', '31/10/24', '30/11/24', '31/12/24'],
    ['', '', '', '', '', ''],
    [1, '508', 38, 18, 21, 45],
    [2, '529', 25, 30, 35, 20],
    [3, '575', 15, 20, 25, 30]
  ];

  // Create purchase order data
  const purchaseData = [
    ['Artis Code', 'Date', 'Amount (Kgs)', 'Notes'],
    ['508', '12/15/24', 200, 'December purchase'],
    ['529', '12/20/24', 150, 'December purchase'],
    ['575', '12/25/24', 100, 'December purchase']
  ];

  // Create corrections data
  const correctionsData = [
    ['Artis Code', 'Date (MM/DD/YY)', 'Correction Amount', 'Reason'],
    ['508', '12/28/24', -5, 'Damage during handling'],
    ['529', '12/28/24', 10, 'Found uncounted stock'],
    ['575', '12/28/24', -8, 'Quality rejection']
  ];

  // Create workbooks
  const wb1 = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet(consumptionData);
  XLSX.utils.book_append_sheet(wb1, ws1, 'Consumption');
  XLSX.writeFile(wb1, 'test_consumption.xlsx');

  const wb2 = XLSX.utils.book_new();
  const ws2 = XLSX.utils.aoa_to_sheet(purchaseData);
  XLSX.utils.book_append_sheet(wb2, ws2, 'Purchase Orders');
  XLSX.writeFile(wb2, 'test_purchase.xlsx');

  const wb3 = XLSX.utils.book_new();
  const ws3 = XLSX.utils.aoa_to_sheet(correctionsData);
  XLSX.utils.book_append_sheet(wb3, ws3, 'Corrections');
  XLSX.writeFile(wb3, 'test_corrections.xlsx');

  console.log('✅ Test Excel files created');
}

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

// Get a sample product ID
async function getSampleProductId() {
  try {
    const response = await axios.get(`${API_BASE}/inventory`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data && response.data.length > 0) {
      return response.data[0].id;
    }
    throw new Error('No products found');
  } catch (error) {
    console.error('❌ Failed to get product:', error.message);
    throw error;
  }
}

// Test individual transactions
async function testIndividualTransactions() {
  console.log('\n📝 Testing Individual Transactions...');
  
  try {
    const productId = await getSampleProductId();
    console.log(`Using product ID: ${productId}`);

    // Test IN transaction
    console.log('  - Creating IN transaction...');
    await axios.post(`${API_BASE}/inventory/transaction`, {
      productId,
      ...testTransactions.in,
      date: new Date()
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('  ✅ IN transaction created');

    // Test OUT transaction
    console.log('  - Creating OUT transaction...');
    await axios.post(`${API_BASE}/inventory/transaction`, {
      productId,
      ...testTransactions.out,
      date: new Date()
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('  ✅ OUT transaction created');

    // Test CORRECTION transaction
    console.log('  - Creating CORRECTION transaction...');
    await axios.post(`${API_BASE}/inventory/transaction`, {
      productId,
      ...testTransactions.correction,
      date: new Date()
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('  ✅ CORRECTION transaction created');

    // Check transactions
    const txResponse = await axios.get(`${API_BASE}/inventory/transactions/${productId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`  ✅ Product now has ${txResponse.data.transactions.length} transactions`);
    console.log(`  ✅ Current stock: ${txResponse.data.currentStock}`);

  } catch (error) {
    console.error('❌ Transaction test failed:', error.response?.data || error.message);
  }
}

// Test bulk uploads
async function testBulkUploads() {
  console.log('\n📤 Testing Bulk Uploads...');

  // Test consumption upload
  try {
    console.log('  - Testing consumption bulk upload...');
    const form1 = new FormData();
    form1.append('file', fs.createReadStream('test_consumption.xlsx'));
    
    const response1 = await axios.post(`${API_BASE}/inventory/bulk`, form1, {
      headers: {
        ...form1.getHeaders(),
        Authorization: `Bearer ${authToken}`
      }
    });
    console.log(`  ✅ Consumption upload: ${response1.data.summary.processed} processed, ${response1.data.summary.skipped} skipped`);
  } catch (error) {
    console.error('  ❌ Consumption upload failed:', error.response?.data || error.message);
  }

  // Test purchase order upload
  try {
    console.log('  - Testing purchase order bulk upload...');
    const form2 = new FormData();
    form2.append('file', fs.createReadStream('test_purchase.xlsx'));
    
    const response2 = await axios.post(`${API_BASE}/inventory/purchase`, form2, {
      headers: {
        ...form2.getHeaders(),
        Authorization: `Bearer ${authToken}`
      }
    });
    console.log(`  ✅ Purchase upload: ${response2.data.processed.length} processed, ${response2.data.skipped.length} skipped`);
  } catch (error) {
    console.error('  ❌ Purchase upload failed:', error.response?.data || error.message);
  }

  // Test corrections upload
  try {
    console.log('  - Testing corrections bulk upload...');
    const form3 = new FormData();
    form3.append('file', fs.createReadStream('test_corrections.xlsx'));
    
    const response3 = await axios.post(`${API_BASE}/inventory/corrections`, form3, {
      headers: {
        ...form3.getHeaders(),
        Authorization: `Bearer ${authToken}`
      }
    });
    console.log(`  ✅ Corrections upload: ${response3.data.processed.length} processed, ${response3.data.skipped.length} skipped`);
  } catch (error) {
    console.error('  ❌ Corrections upload failed:', error.response?.data || error.message);
  }
}

// Test operations management
async function testOperationsManagement() {
  console.log('\n🗂️  Testing Operations Management...');

  try {
    // Get operations list
    console.log('  - Getting operations history...');
    const opsResponse = await axios.get(`${API_BASE}/inventory/operations`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`  ✅ Found ${opsResponse.data.length} operations`);

    if (opsResponse.data.length > 0) {
      // Delete one operation
      const operationId = opsResponse.data[0].id;
      console.log(`  - Deleting operation ${operationId}...`);
      
      await axios.delete(`${API_BASE}/inventory/operations/${operationId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('  ✅ Operation deleted');

      // Get updated count
      const updatedOps = await axios.get(`${API_BASE}/inventory/operations`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log(`  ✅ Now have ${updatedOps.data.length} operations`);
    }
  } catch (error) {
    console.error('❌ Operations management test failed:', error.response?.data || error.message);
  }
}

// Test clearing all data
async function testClearOperations() {
  console.log('\n🗑️  Testing Clear Operations...');

  try {
    // Clear all transactions
    console.log('  - Clearing all inventory transactions...');
    await axios.delete(`${API_BASE}/inventory/clear`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('  ✅ All inventory transactions cleared');

    // Clear all bulk operations
    console.log('  - Clearing all bulk operations history...');
    await axios.delete(`${API_BASE}/inventory/operations`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('  ✅ All bulk operations cleared');

    // Verify
    const opsResponse = await axios.get(`${API_BASE}/inventory/operations`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`  ✅ Verified: ${opsResponse.data.length} operations remaining`);

  } catch (error) {
    console.error('❌ Clear operations test failed:', error.response?.data || error.message);
  }
}

// Check final state
async function checkFinalState() {
  console.log('\n📊 Final State Check...');
  
  try {
    // Check a product
    const productId = await getSampleProductId();
    const details = await axios.get(`${API_BASE}/inventory/details/${productId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('  Product details:');
    console.log(`    - Current Stock: ${details.data.product.currentStock}`);
    console.log(`    - Transactions: ${details.data.transactions.length}`);
    
    // Check operations
    const ops = await axios.get(`${API_BASE}/inventory/operations`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`    - Bulk Operations: ${ops.data.length}`);
    
  } catch (error) {
    console.error('❌ Final state check failed:', error.response?.data || error.message);
  }
}

// Clean up test files
function cleanup() {
  console.log('\n🧹 Cleaning up test files...');
  ['test_consumption.xlsx', 'test_purchase.xlsx', 'test_corrections.xlsx'].forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
  console.log('✅ Cleanup complete');
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Operations Test\n');
  console.log('================================\n');

  try {
    // Create test files
    createTestExcel();

    // Login
    if (!await login()) {
      throw new Error('Cannot proceed without authentication');
    }

    // Run tests in sequence
    await testIndividualTransactions();
    await testBulkUploads();
    await testOperationsManagement();
    
    // Optional: uncomment to test clearing all data
    // await testClearOperations();
    
    await checkFinalState();
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  } finally {
    cleanup();
  }
}

// Run the tests
runAllTests();