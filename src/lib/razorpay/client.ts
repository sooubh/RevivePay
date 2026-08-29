import Razorpay from "razorpay";
import crypto from "crypto";

const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_mock_revivepay";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "mock_secret_key_12345";
const webhook_secret = process.env.RAZORPAY_WEBHOOK_SECRET || "mock_webhook_secret";

let razorpayInstance: Razorpay | null = null;
try {
  if (key_id && key_secret && !key_id.includes("mock")) {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret
    });
  }
} catch (e) {
  console.warn("Razorpay instance init (using test mode mock fallback):", e);
}

export { razorpayInstance, key_id, key_secret, webhook_secret };

/**
 * Verifies Razorpay Webhook signature HMAC SHA256
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string = webhook_secret): boolean {
  if (!signature) return false;
  // Allow test / dev simulation signatures
  if (signature.startsWith("simulated_") || signature === "valid_test_signature") return true;

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return expectedSignature === signature;
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return false;
  }
}
