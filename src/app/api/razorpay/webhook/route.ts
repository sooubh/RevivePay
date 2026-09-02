import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay/client";
import { dbService } from "@/lib/firebase/db";
import { RecoveryOrchestrator } from "@/lib/recovery/orchestrator";
import { BankHealthService } from "@/lib/telemetry/bankHealth";
import { ErrorNormalizer } from "@/lib/telemetry/errorNormalizer";
import { Payment } from "@/lib/types";

// Idempotency tracking set for processed webhook IDs in instance runtime
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
    const bankCode = paymentEntity?.bank || (method === "upi" ? "UPI_NPCI" : "HDFC");

    console.log(`[Webhook] Processing event: ${event} for payment ${razorpayPaymentId} (₹${amount}) via ${method}`);

    // Handle Payment Failed Event
    if (event === "payment.failed") {
      // Idempotency: Check if a RecoveryOpportunity already exists for this payment
      const existingOpp = await dbService.getRecoveryOpportunityByPaymentId(razorpayPaymentId);
      if (existingOpp) {
        console.log(`[Webhook] Duplicate event for already processed payment ${razorpayPaymentId}: ${existingOpp.opportunityId}`);
        return NextResponse.json({
          success: true,
          event,
          duplicate: true,
          opportunityId: existingOpp.opportunityId,
          status: existingOpp.status,
          recommendedAction: existingOpp.recommendedAction,
          recoveryProbability: existingOpp.recoveryProbability
        });
      }

      // Granular Error Normalization across gateways & switches
      const normalizedError = ErrorNormalizer.normalizeRazorpay({
        code: paymentEntity?.error_code,
        description: paymentEntity?.error_description,
        source: paymentEntity?.error_source,
        step: paymentEntity?.error_step,
        reason: paymentEntity?.error_reason,
        bank: bankCode,
        paymentMethod: method
      });

      // Update Live Telemetry in BankHealthService
      BankHealthService.recordMetric({
        rail: method === "upi" ? "UPI" : method === "netbanking" ? "NETBANKING" : "CARD",
        bankCode: bankCode || "RZP_ORCH",
        latencyMs: 1200,
        success: false,
        errorCode: normalizedError.rawCode
      });

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
        failureCode: normalizedError.rawCode,
        failureReason: normalizedError.rootCause,
        attemptNumber: 1,
        razorpayPaymentId,
        razorpayOrderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (razorpayOrderId) {
        await dbService.updateOrder(razorpayOrderId, { status: "failed" });
      }

      await dbService.createPayment(paymentRecord);

      // Trigger Multi-Agent AI Recovery Pipeline
      const opportunity = await RecoveryOrchestrator.processPaymentFailure({
        payment: paymentRecord,
        order,
        customer,
        sourceType: "razorpay_failure",
        failureCode: normalizedError.rawCode,
        failureReason: normalizedError.rootCause
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
      // Record Positive Telemetry
      BankHealthService.recordMetric({
        rail: method === "upi" ? "UPI" : method === "netbanking" ? "NETBANKING" : "CARD",
        bankCode: bankCode || "RZP_ORCH",
        latencyMs: 380,
        success: true
      });

      if (razorpayOrderId) {
        await dbService.updateOrder(razorpayOrderId, { status: "paid" });
      }

      const paymentRecord: Payment = {
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId || `ORD-${Date.now()}`,
        customerId: paymentEntity?.notes?.customerId || "CUS-8F42K1",
        amount,
        currency,
        paymentMethod: method,
        status: "captured",
        attemptNumber: 1,
        razorpayPaymentId,
        razorpayOrderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await dbService.createPayment(paymentRecord);

      // Match strictly by order ID or payment ID (eliminating loose amount matching)
      const opps = await dbService.getRecoveryOpportunities();
      const matchingOpp = opps.find(
        o => (razorpayOrderId && o.orderId === razorpayOrderId) || 
             (razorpayPaymentId && o.paymentId === razorpayPaymentId)
      );

      if (matchingOpp && matchingOpp.status !== "recovered") {
        await RecoveryOrchestrator.processRecoverySuccess(matchingOpp.opportunityId, method);
      } else {
        await dbService.addAuditLog({
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          actorType: "CUSTOMER",
          eventType: "PAYMENT_SUCCEEDED",
          message: `Payment successful — ₹${amount.toLocaleString()}.00 captured via Razorpay Webhook`,
          metadata: { amount, razorpayPaymentId, razorpayOrderId, method }
        });
      }

      return NextResponse.json({ success: true, event, status: "payment_captured" });
    }

    return NextResponse.json({ success: true, event, status: "processed" });
  } catch (error) {
    console.error("Error handling Razorpay webhook:", error);
    return NextResponse.json({ error: "Internal server error processing webhook" }, { status: 500 });
  }
}
