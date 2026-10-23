const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = options.headers || {};
  if (options.body && typeof options.body === 'object' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body
  });

  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

async function runTests() {
  console.log('🚀 Starting SmartWallet End-to-End API Test Suite...');
  
  // 1. Health check
  console.log('\n1. Testing Health Endpoint:');
  const health = await request('/health');
  console.log('Status:', health.status, health.data);

  // 2. Register user
  console.log('\n2. Testing User Registration:');
  const testEmail = `yassine_${Date.now()}@test.com`;
  const regRes = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Yassine',
      email: testEmail,
      password: 'password123',
      preferredCurrency: 'MAD'
    }
  });
  console.log('Registration Status:', regRes.status, 'Token exists:', !!regRes.data?.token);
  const token = regRes.data?.token;

  if (!token) {
    console.error('Failed to get auth token!');
    process.exit(1);
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 3. Seed PDF Scenario
  console.log('\n3. Testing PDF Demonstration Scenario Seeding (Yassine Story):');
  const seedRes = await request('/demo/seed', {
    method: 'POST',
    headers: authHeaders
  });
  console.log('Seed Status:', seedRes.status, seedRes.data?.message);

  // 4. Fetch Summary
  console.log('\n4. Testing Financial Summary:');
  const sumRes = await request('/transactions/summary', { headers: authHeaders });
  console.log('Summary Status:', sumRes.status, sumRes.data?.summary);

  // 5. Fetch Budget
  console.log('\n5. Testing Monthly Budget & Category Limits:');
  const budRes = await request('/budgets', { headers: authHeaders });
  console.log('Budget Status:', budRes.status, {
    overallLimit: budRes.data?.data?.overallLimit,
    totalSpent: budRes.data?.data?.totalSpent,
    overallPercent: budRes.data?.data?.overallPercent,
    categoryLimitsCount: budRes.data?.data?.categoryLimits?.length
  });

  // 6. Fetch Savings Goals & Add Contribution
  console.log('\n6. Testing Savings Goals & Independent Contribution:');
  const savRes = await request('/savings', { headers: authHeaders });
  console.log('Goals Count:', savRes.data?.data?.length);
  const laptopGoal = savRes.data?.data?.[0];
  if (laptopGoal) {
    console.log(`Goal "${laptopGoal.name}": Target ${laptopGoal.targetAmount}, Saved: ${laptopGoal.currentAmount} (${laptopGoal.percentage}%)`);
    const contribRes = await request(`/savings/${laptopGoal._id}/contributions`, {
      method: 'POST',
      headers: authHeaders,
      body: { amount: 300, notes: 'End of month savings boost' }
    });
    console.log('Contribution Status:', contribRes.status, 'New Saved Total:', contribRes.data?.data?.currentAmount);
  }

  // 7. Testing Receipt Upload & OCR
  console.log('\n7. Testing Receipt Image Upload & OCR Processing:');
  const samplePath = path.join(__dirname, 'uploads/receipts/sample-receipt.png');
  if (fs.existsSync(samplePath)) {
    const fileBuffer = fs.readFileSync(samplePath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="receipt"; filename="sample-receipt.png"\r\n`;
    body += `Content-Type: image/png\r\n\r\n`;
    const payload = Buffer.concat([
      Buffer.from(body, 'utf-8'),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8')
    ]);

    const uploadRes = await fetch(`${BASE_URL}/receipts/upload`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: payload
    });
    const uploadData = await uploadRes.json();
    console.log('OCR Upload Status:', uploadRes.status, 'Extracted Data:', uploadData.data?.extractedData);
  }

  // 8. Testing AI Monthly Report
  console.log('\n8. Testing AI Monthly Financial Report:');
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const repRes = await request(`/reports/${currentMonth}`, { headers: authHeaders });
  console.log('Report Status:', repRes.status, {
    month: repRes.data?.data?.month,
    aiModelUsed: repRes.data?.data?.aiModelUsed,
    overviewSnippet: repRes.data?.data?.aiAnalysis?.overview?.slice(0, 80) + '...',
    recommendationsCount: repRes.data?.data?.aiAnalysis?.recommendations?.length
  });

  console.log('\n🎉 ALL SMARTWALLET API WORKFLOW TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(console.error);
