import { NextRequest, NextResponse } from "next/server";
import { verifyPaymentSignature, key_id } from "@/lib/razorpay/client";
import { dbService } from "@/lib/firebase/db";
import { RecoveryOrchestrator } from "@/lib/recovery/orchestrator";
import { Payment } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
      opportunityId,
      customerId = "CUS-8F42K1",
      amount
    } = body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      orderId?: string;
      opportunityId?: string;
      customerId?: string;
      amount?: number;
    };

    // 1. Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: "Missing required payment verification fields" },
        { status: 400 }
      );
    }

    // 2. Verify HMAC SHA256 signature
    const isValid = verifyPaymentSignature({
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      signature: razorpay_signature
    });

    if (!isValid) {
      console.error(`[Razorpay] Invalid payment signature for payment ${razorpay_payment_id}`);
      return NextResponse.json(
        { success: false, error: "Signature verification failed. Payment cannot be verified." },
        { status: 400 }
      );
    }

    console.log(`[Razorpay] Payment ${razorpay_payment_id} verified successfully for order ${razorpay_order_id}`);

    // 3. Update Order state in database
    if (orderId) {
      await dbService.updateOrder(orderId, { status: "paid" });
    }

    // 4. Create verified payment record
    const paymentRecord: Payment = {
      paymentId: razorpay_payment_id,
      orderId: orderId || razorpay_order_id,
      customerId,
      amount: amount || 4999,
      currency: "INR",
      paymentMethod: "card",
      status: "captured",
      attemptNumber: 1,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await dbService.createPayment(paymentRecord);

    // 5. If this payment recovers an existing opportunity, process recovery success
    if (opportunityId) {
      await RecoveryOrchestrator.processRecoverySuccess(opportunityId, "card");
    } else {
      // Check if matching pending opportunity exists
      const opps = await dbService.getRecoveryOpportunities();
      const match = opps.find(o => o.orderId === (orderId || razorpay_order_id) && o.status !== "recovered");
      if (match) {
        await RecoveryOrchestrator.processRecoverySuccess(match.opportunityId, "card");
      }
    }

    return NextResponse.json({
      success: true,
      verified: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      message: "Payment signature verified and payment captured successfully."
    });
  } catch (error) {
    console.error("Error in verify-payment route:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during payment verification" },
      { status: 500 }
    );
  }
}
