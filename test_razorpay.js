const http = require("http");
const crypto = require("crypto");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json"
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testRazorpayIntegration() {
  console.log("=== STARTING RAZORPAY STANDARD CHECKOUT INTEGRATION TESTS ===");

  // Test 1: Create Order
  console.log("\n[TEST 1] Creating Razorpay Order via /api/create-order...");
  const orderRes = await makeRequest("POST", "/api/create-order", {
    amount: 4999,
    currency: "INR",
    receipt: "ORD_TEST_001",
    customerName: "Sarah Jenkins",
    customerEmail: "sarah.j@example.com"
  });

  if (orderRes.status === 200 && orderRes.data.success && orderRes.data.order_id) {
    console.log(" [PASS] Order Created Successfully!");
    console.log(`        Order ID: ${orderRes.data.order_id}`);
    console.log(`        Amount: ${orderRes.data.amount} INR (${orderRes.data.amount_paise} paise)`);
    console.log(`        Key ID: ${orderRes.data.key_id}`);
  } else {
    console.error(" [FAIL] Create order failed:", orderRes);
    process.exit(1);
  }

  // Test 2: Invalid Amount Validation (< 100 paise)
  console.log("\n[TEST 2] Testing Minimum Amount Validation (< 100 paise)...");
  const invalidRes = await makeRequest("POST", "/api/create-order", {
    amount: 0.5,
    currency: "INR"
  });
  if (invalidRes.status === 400 && !invalidRes.data.success) {
    console.log(" [PASS] Validation correctly rejected amount < 100 paise (HTTP 400).");
  } else {
    console.error(" [FAIL] Expected 400 for amount < 100 paise:", invalidRes);
    process.exit(1);
  }

  // Test 3: Valid HMAC-SHA256 Signature Verification
  console.log("\n[TEST 3] Testing Payment Signature Verification (Valid Signature)...");
  const testOrderId = orderRes.data.order_id;
  const testPaymentId = "pay_test_" + Date.now();
  const validSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest("hex");

  const verifyValidRes = await makeRequest("POST", "/api/verify-payment", {
    razorpay_order_id: testOrderId,
    razorpay_payment_id: testPaymentId,
    razorpay_signature: validSignature,
    orderId: "ORD_TEST_001",
    amount: 4999
  });

  if (verifyValidRes.status === 200 && verifyValidRes.data.verified) {
    console.log(" [PASS] Payment Signature Verified and Payment Captured Successfully!");
    console.log(`        Payment ID: ${verifyValidRes.data.paymentId}`);
  } else {
    console.error(" [FAIL] Valid signature verification failed:", verifyValidRes);
    process.exit(1);
  }

  // Test 4: Invalid Signature Rejection
  console.log("\n[TEST 4] Testing Tampered Signature Rejection...");
  const verifyInvalidRes = await makeRequest("POST", "/api/verify-payment", {
    razorpay_order_id: testOrderId,
    razorpay_payment_id: testPaymentId,
    razorpay_signature: "tampered_fake_signature_abc123"
  });

  if (verifyInvalidRes.status === 400 && !verifyInvalidRes.data.success) {
    console.log(" [PASS] Tampered Signature Rejected with HTTP 400 as expected.");
  } else {
    console.error(" [FAIL] Expected 400 for tampered signature:", verifyInvalidRes);
    process.exit(1);
  }

  console.log("\n=== ALL RAZORPAY STANDARD CHECKOUT TESTS PASSED WITH 100% SUCCESS! ===");
}

testRazorpayIntegration().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
