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
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
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

async function runInnovationTests() {
  console.log('=== STARTING REVIVEPAY INNOVATION & ADVANCED AI VERIFICATION ===\n');

  // Test 1: Simulate Payment Failure to generate Opportunity with Dynamic Incentive
  console.log('[TEST 1] Triggering Payment Failure Simulation...');
  const simRes = await request('http://localhost:3000/api/simulator/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    scenario: 'card_decline',
    customAmount: 14500
  });

  if (simRes.status === 200 && simRes.data.opportunityId) {
    console.log(' [PASS] Opportunity Generated:', simRes.data.opportunityId);
    console.log('        Recommended Action:', simRes.data.recommendedAction);
    console.log('        Incentive Attached:', simRes.data.incentiveOffer?.label || 'Preserved Full Margin');
    console.log('        Incentive Badge:', simRes.data.incentiveOffer?.badge || 'N/A');
  } else {
    throw new Error('Simulation trigger failed: ' + JSON.stringify(simRes.data));
  }

  // Test 2: Multi-Channel WhatsApp / SMS Recovery Dispatcher
  console.log('\n[TEST 2] Testing 1-Click WhatsApp Recovery Dispatch API...');
  const dispatchRes = await request('http://localhost:3000/api/recovery/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    opportunityId: simRes.data.opportunityId,
    channel: 'whatsapp',
    customNote: 'Shoe size reserved.'
  });

  if (dispatchRes.status === 200 && dispatchRes.data.success) {
    console.log(' [PASS] 1-Click WhatsApp Link Dispatched Successfully!');
    console.log('        Dispatch ID:', dispatchRes.data.dispatched.dispatchId);
    console.log('        Recipient:', dispatchRes.data.dispatched.recipientContact);
    console.log('        Message Snippet:\n' + dispatchRes.data.dispatched.messageContent.split('\n')[0]);
  } else {
    throw new Error('Dispatch API failed: ' + JSON.stringify(dispatchRes.data));
  }

  // Test 3: RevivePay AI Copilot Natural Language Query
  console.log('\n[TEST 3] Testing AI Copilot (/api/copilot/chat)...');
  const copilotRes = await request('http://localhost:3000/api/copilot/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    question: 'Why are card declines the highest failure category and what is the recovery projection?'
  });

  if (copilotRes.status === 200 && copilotRes.data.success && copilotRes.data.answer) {
    console.log(' [PASS] AI Copilot Query Succeeded!');
    console.log('        Executive Summary:', copilotRes.data.answer.summary);
    console.log('        Projected Lift:', copilotRes.data.answer.projectedRevenueImpact);
    console.log('        Key Insight:', copilotRes.data.answer.detailedInsights?.[0]);
  } else {
    throw new Error('Copilot API failed: ' + JSON.stringify(copilotRes.data));
  }

  console.log('\n=== ALL INNOVATION & CUTTING-EDGE AI SUITES PASSED (100%)! ===');
}

runInnovationTests().catch((e) => {
  console.error('Innovation test failed:', e);
  process.exit(1);
});
