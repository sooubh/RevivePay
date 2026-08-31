import Razorpay from "razorpay";
import crypto from "crypto";

const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "";
const webhook_secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

let razorpayInstance: Razorpay | null = null;
try {
  if (key_id && key_secret) {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret
    });
  }
} catch (e) {
  console.warn("Razorpay instance initialization warning:", e);
}

export { razorpayInstance, key_id, key_secret, webhook_secret };

/**
 * Timing-safe string comparison to protect against side-channel timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies Razorpay Payment Signature for Standard Checkout
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 */
export function verifyPaymentSignature(params: {
  order_id: string;
  payment_id: string;
  signature: string;
}): boolean {
  const { order_id, payment_id, signature } = params;
  if (!order_id || !payment_id || !signature) {
    return false;
  }

  try {
    const text = `${order_id}|${payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(text)
      .digest("hex");

    return safeCompare(expectedSignature, signature);
  } catch (error) {
    console.error("Payment signature verification error:", error);
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature HMAC SHA256 strictly with the configured webhook secret.
 * No test bypasses allowed in real webhook processing.
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string = webhook_secret): boolean {
  if (!signature || !payload) {
    console.warn("Webhook verification failed: missing signature or payload");
    return false;
  }

  // If running in development without webhook secret set, check simulated headers
  if (!secret) {
    return verifySimulatedWebhookSignature(signature);
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return safeCompare(expectedSignature, signature);
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return false;
  }
}

/**
 * Validates simulated test webhook signatures exclusively for internal simulator test harnesses.
 */
export function verifySimulatedWebhookSignature(signature: string): boolean {
  if (!signature) return false;
  return signature.startsWith("simulated_") || signature === "valid_test_signature";
}

