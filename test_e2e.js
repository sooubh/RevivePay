const http = require('http');

function request(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: body.startsWith('{') || body.startsWith('[') ? JSON.parse(body) : body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== REVIVEPAY E2E: RETURN & NDR RECOVERY FLOWS ===\n');

  // Test 1: Core Page Routes
  const pages = ['/', '/welcome', '/store', '/store/product/PROD-001', '/merchant/overview', '/merchant/recovery'];
  for (const p of pages) {
    const res = await request(`http://localhost:3000${p}`);
    console.log(`[PASS] Page ${p} returned HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(`Page ${p} failed with status ${res.status}`);
  }

  // Test 2: Seed Reset API
  const seedRes = await request('http://localhost:3000/api/seed', { method: 'POST' });
  console.log('\n[PASS] Seed reset:', seedRes.data);

  // Test 3: Customer Registration
  const custRes = await request('http://localhost:3000/api/customer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { name: 'Sarah Jenkins', shoeSize: '9' });
  console.log('[PASS] Customer registered:', custRes.data.customer.customerId);
  const customerId = custRes.data.customer.customerId;

  // Test 4: Create Order
  const orderRes = await request('http://localhost:3000/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    items: [{
      productId: 'PROD-001',
      name: 'Aeon Performance Runner',
      brand: 'LuxeStep',
      price: 4999,
      size: '9',
      quantity: 1,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfmxkAm9FxGl0cDWrdx4CipB_VGxi9X58jaQB9jyK7lLuDpEqIgKOTSqd4fKHnLCV8NYJj3RcHfPw3ZJ9sOr7gHPLllmwGEQk6AVXkawwCyexA9qpOe9te5yC3N7dMEramc9XRyUEJUfL4v7d-UW5BnhGfans41N3kwtG5ARGBTDzhBdjjI5Y1CAfnGkSfb8TYfgzAhtx1jbsPIMN0YzVbciNk2xTbkCrKnwK3M-THAxPfdXz-lDj-'
    }],
    customerId,
    customerName: 'Sarah Jenkins',
    customerEmail: 'sarah.j@example.com'
  });
  console.log('[PASS] Order created:', orderRes.data.orderId, 'Total: ₹' + orderRes.data.amount);

  // ============================
  // FLOW 1: RETURN RECOVERY
  // ============================
  console.log('\n--- FLOW 1: POST-PURCHASE RETURN RECOVERY ---');

  // Test 5: Trigger Return Scenario
  const returnRes = await request('http://localhost:3000/api/simulator/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    scenario: 'return_size_issue',
    customAmount: 4999,
    customerId
  });
  console.log('[PASS] Return case created:', returnRes.data.opportunityId);
  console.log('       Recommended:', returnRes.data.recommendedAction);
  console.log('       Probability:', Math.round((returnRes.data.recoveryProbability || 0) * 100) + '%');

  if (returnRes.data.status !== 'recovery_recommended') {
    throw new Error('Return case should have status recovery_recommended, got: ' + returnRes.data.status);
  }

  // Test 6: Execute Size Exchange (Customer confirms)
  const exchangeRes = await request('http://localhost:3000/api/recovery/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    opportunityId: returnRes.data.opportunityId,
    action: 'confirm_exchange',
    paymentMethod: 'exchange'
  });
  console.log('[PASS] Exchange confirmed:', exchangeRes.data.opportunity.opportunityId, 'Status:', exchangeRes.data.opportunity.status);

  if (exchangeRes.data.opportunity.status !== 'recovered') {
    throw new Error('Exchange should result in recovered status, got: ' + exchangeRes.data.opportunity.status);
  }

  // ============================
  // FLOW 2: NDR / COD RECOVERY
  // ============================
  console.log('\n--- FLOW 2: COD PAYMENT FAILURE / NDR RECOVERY ---');

  // Test 7: Trigger NDR Scenario
  const ndrRes = await request('http://localhost:3000/api/simulator/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    scenario: 'ndr_cash_unavailable',
    customAmount: 3499,
    customerId
  });
  console.log('[PASS] NDR case created:', ndrRes.data.opportunityId);
  console.log('       Recommended:', ndrRes.data.recommendedAction);
  console.log('       Probability:', Math.round((ndrRes.data.recoveryProbability || 0) * 100) + '%');

  if (ndrRes.data.status !== 'recovery_recommended') {
    throw new Error('NDR case should have status recovery_recommended, got: ' + ndrRes.data.status);
  }

  // Test 8: Execute Prepaid Conversion (Customer pays via Razorpay)
  const prepaidRes = await request('http://localhost:3000/api/recovery/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    opportunityId: ndrRes.data.opportunityId,
    action: 'recover',
    paymentMethod: 'razorpay_prepaid'
  });
  console.log('[PASS] Prepaid conversion confirmed:', prepaidRes.data.opportunity.opportunityId, 'Status:', prepaidRes.data.opportunity.status);

  if (prepaidRes.data.opportunity.status !== 'recovered') {
    throw new Error('NDR prepaid should result in recovered status, got: ' + prepaidRes.data.opportunity.status);
  }

  // ============================
  // METRICS VERIFICATION
  // ============================
  console.log('\n--- METRICS VERIFICATION ---');

  const metricsRes = await request('http://localhost:3000/api/seed');
  console.log('[PASS] Overview Metrics:');
  console.log('       Revenue at Risk: ₹' + metricsRes.data.metrics?.revenueAtRisk);
  console.log('       AI Recovered: ₹' + metricsRes.data.metrics?.aiRecovered);
  console.log('       Recovery Rate: ' + metricsRes.data.metrics?.recoveryRate + '%');
  console.log('       Active Cases:', metricsRes.data.opportunitiesCount);
  console.log('       Audit Logs:', metricsRes.data.auditLogsCount);

  // Both flows recovered, so aiRecovered should be > 0
  if ((metricsRes.data.metrics?.aiRecovered || 0) <= 0) {
    throw new Error('AI Recovered should be > 0 after both successful recoveries');
  }

  console.log('\n=== ALL RETURN & NDR E2E TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
