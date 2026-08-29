import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay/client";
import { dbService } from "@/lib/firebase/db";
import { RecoveryOrchestrator } from "@/lib/recovery/orchestrator";
import { Payment } from "@/lib/types";

// Idempotency tracking set for processed webhook IDs
const processedEvents = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const eventId = payload.id || `evt_${Date.now()}`;

    // Idempotency check: Ignore duplicate events
    if (processedEvents.has(eventId)) {
      console.log(`[Webhook] Duplicate event ignored: ${eventId}`);
      return NextResponse.json({ status: "ignored_duplicate" });
    }
    processedEvents.add(eventId);

    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    if (!paymentEntity && !orderEntity) {
      return NextResponse.json({ status: "no_payment_or_order_payload" });
    }

    const razorpayPaymentId = paymentEntity?.id || `pay_${Date.now()}`;
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
    const amount = paymentEntity ? Math.round(paymentEntity.amount / 100) : Math.round((orderEntity?.amount || 0) / 100);
    const currency = paymentEntity?.currency || "INR";
    const method = (paymentEntity?.method || "card") as any;

    console.log(`[Webhook] Processing event: ${event} for payment ${razorpayPaymentId} (₹${amount})`);

    // Handle Payment Failed Event
    if (event === "payment.failed") {
      const failureReason = paymentEntity?.error_description || "Card issuer or bank declined payment";
      const failureCode = paymentEntity?.error_code || "BAD_REQUEST_ERROR";

      let order = null;
      if (razorpayOrderId) {
        order = (await dbService.getOrderById(razorpayOrderId)) || null;
      }

      const customerId = paymentEntity?.notes?.customerId || order?.customerId || "CUS-8F42K1";
      const customer = await dbService.getCustomerById(customerId);

      const paymentRecord: Payment = {
        paymentId: razorpayPaymentId,
        orderId: order?.orderId || razorpayOrderId || `ORD-${Date.now()}`,
        customerId,
        amount,
        currency,
        paymentMethod: method,
        status: "failed",
        failureCode,
        failureReason,
        attemptNumber: 1,
        razorpayPaymentId,
        razorpayOrderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbService.createPayment(paymentRecord);

      // Trigger Multi-Agent Recovery Pipeline
      const opportunity = await RecoveryOrchestrator.processPaymentFailure({
        payment: paymentRecord,
        order,
        customer,
        sourceType: "razorpay_failure",
        failureCode,
        failureReason
      });

      return NextResponse.json({
        success: true,
        event,
        opportunityId: opportunity.opportunityId,
        status: opportunity.status,
        recommendedAction: opportunity.recommendedAction,
        recoveryProbability: opportunity.recoveryProbability
      });
    }

    // Handle Payment Captured / Success Event
    if (event === "payment.captured" || event === "order.paid") {
      // Check if this payment recovers an existing opportunity
      const opps = await dbService.getRecoveryOpportunities();
      const matchingOpp = opps.find(
        o => (o.orderId && o.orderId === razorpayOrderId) || o.paymentId === razorpayPaymentId || (o.amount === amount && o.status !== "recovered")
      );

      if (matchingOpp) {
        await RecoveryOrchestrator.processRecoverySuccess(matchingOpp.opportunityId, method);
      }

      return NextResponse.json({ success: true, event, status: "payment_captured" });
    }

    return NextResponse.json({ success: true, event, status: "processed" });
  } catch (error) {
    console.error("Error handling Razorpay webhook:", error);
    return NextResponse.json({ error: "Internal server error processing webhook" }, { status: 500 });
  }
}
