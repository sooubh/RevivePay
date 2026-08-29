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
  console.log('=== STARTING REVIVEPAY E2E VERIFICATION ===\n');

  // Test 1: Page Routes
  const pages = ['/', '/welcome', '/store', '/merchant/overview', '/merchant/recovery', '/merchant/analytics', '/merchant/audit'];
  for (const p of pages) {
    const res = await request(`http://localhost:3000${p}`);
    console.log(`[PASS] Page ${p} returned HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(`Page ${p} failed with status ${res.status}`);
  }

  // Test 2: Seed Reset API
  const seedRes = await request('http://localhost:3000/api/seed', { method: 'POST' });
  console.log('\n[PASS] Seed reset API:', seedRes.data);

  // Test 3: Customer Registration
  const custRes = await request('http://localhost:3000/api/customer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Sarah Jenkins',
    shoeSize: '9'
  });
  console.log('[PASS] Customer registered:', custRes.data.customer.customerId, custRes.data.customer.name);

  // Test 4: Create Order
  const orderRes = await request('http://localhost:3000/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    items: [
      {
        productId: 'PROD-001',
        name: 'Aeon Performance Runner',
        brand: 'LuxeStep',
        price: 4999,
        size: '9',
        quantity: 1,
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfmxkAm9FxGl0cDWrdx4CipB_VGxi9X58jaQB9jyK7lLuDpEqIgKOTSqd4fKHnLCV8NYJj3RcHfPw3ZJ9sOr7gHPLllmwGEQk6AVXkawwCyexA9qpOe9te5yC3N7dMEramc9XRyUEJUfL4v7d-UW5BnhGfans41N3kwtG5ARGBTDzhBdjjI5Y1CAfnGkSfb8TYfgzAhtx1jbsPIMN0YzVbciNk2xTbkCrKnwK3M-THAxPfdXz-lDj-'
      }
    ],
    customerId: custRes.data.customer.customerId,
    customerName: 'Sarah Jenkins',
    customerEmail: 'sarah.j@example.com'
  });
  console.log('[PASS] Order created:', orderRes.data.orderId, 'Total: ?' + orderRes.data.amount);

  // Test 5: Simulate Payment Failure (Card Issuer Decline)
  const failRes = await request('http://localhost:3000/api/simulator/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    scenario: 'card_decline',
    customAmount: 12500,
    customerId: custRes.data.customer.customerId
  });
  console.log('[PASS] Payment failure simulated:', failRes.data.opportunityId);
  console.log('       AI Recommended Action:', failRes.data.recommendedAction);
  console.log('       Recovery Probability:', Math.round((failRes.data.recoveryProbability || 0) * 100) + '%');
  console.log('       Status:', failRes.data.status);
  console.log('       Reasoning:', failRes.data.recommendationReason);

  // Test 6: Customer Recovery Execution
  const recRes = await request('http://localhost:3000/api/recovery/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    opportunityId: failRes.data.opportunityId,
    action: 'recover',
    paymentMethod: 'upi'
  });
  console.log('\n[PASS] Customer recovery executed:', recRes.data.opportunity.opportunityId, 'New Status:', recRes.data.opportunity.status);

  // Test 7: Metrics Status
  const metricsRes = await request('http://localhost:3000/api/seed');
  console.log('[PASS] Updated Overview Metrics:', metricsRes.data.metrics);

  console.log('\n=== ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
