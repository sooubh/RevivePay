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
    const targetOrderId = orderId || razorpay_order_id;
    if (targetOrderId) {
      await dbService.updateOrder(targetOrderId, { status: "paid", razorpayOrderId: razorpay_order_id });
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
    let isRecovery = false;
    if (opportunityId) {
      isRecovery = true;
      await RecoveryOrchestrator.processRecoverySuccess(opportunityId, "card");
    } else {
      // Check if matching pending opportunity exists
      const opps = await dbService.getRecoveryOpportunities();
      const match = opps.find(o => o.orderId === (orderId || razorpay_order_id) && o.status !== "recovered");
      if (match) {
        isRecovery = true;
        await RecoveryOrchestrator.processRecoverySuccess(match.opportunityId, "card");
      }
    }

    // 6. If normal first-time successful checkout, record PAYMENT_SUCCEEDED audit log
    if (!isRecovery) {
      await dbService.addAuditLog({
        orderId: targetOrderId,
        paymentId: razorpay_payment_id,
        actorType: "CUSTOMER",
        eventType: "PAYMENT_SUCCEEDED",
        message: `Payment successful — ₹${(amount || 4999).toLocaleString()}.00 captured via Razorpay Standard Checkout`,
        metadata: { amount: amount || 4999, razorpayPaymentId: razorpay_payment_id, razorpayOrderId: razorpay_order_id }
      });

      if (customerId) {
        const cust = await dbService.getCustomerById(customerId);
        if (cust) {
          cust.successfulPayments = (cust.successfulPayments || 0) + 1;
          cust.totalSpend = (cust.totalSpend || 0) + (amount || 4999);
          cust.lastSeenAt = new Date().toISOString();
          await dbService.createCustomer(cust);
        }
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
