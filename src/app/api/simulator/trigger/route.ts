import { NextRequest, NextResponse } from "next/server";
import { dbService } from "@/lib/firebase/db";
import { RecoveryOrchestrator } from "@/lib/recovery/orchestrator";
import { Payment } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenario, customAmount, opportunityId, customerId = "CUS-8F42K1" } = body as {
      scenario: 'upi_failure' | 'card_decline' | 'checkout_abandonment' | 'subscription_failure' | 'recovery_success';
      customAmount?: number;
      opportunityId?: string;
      customerId?: string;
    };

    const customer = await dbService.getCustomerById(customerId);

    // Scenario 1: Recovery Success
    if (scenario === "recovery_success") {
      let targetId = opportunityId;
      if (!targetId) {
        const opps = await dbService.getRecoveryOpportunities();
        const pendingOpp = opps.find(o => o.status !== "recovered");
        targetId = pendingOpp ? pendingOpp.opportunityId : "TXN-8921-X";
      }

      const recovered = await RecoveryOrchestrator.processRecoverySuccess(targetId, "upi");
      return NextResponse.json({
        success: true,
        scenario,
        message: `Successfully recovered opportunity ${targetId}`,
        opportunity: recovered
      });
    }

    // Prepare simulated failure payment record
    let amount = customAmount || 4999;
    let paymentMethod: any = "upi";
    let failureReason = "NPCI / PSP gateway timeout during collect request";
    let failureCode = "GATEWAY_TIMEOUT";
    let sourceType: any = "razorpay_failure";

    if (scenario === "card_decline") {
      amount = customAmount || 12500;
      paymentMethod = "card";
      failureReason = "Card issuer declined transaction (risk limit check)";
      failureCode = "ISSUER_DECLINE";
      sourceType = "razorpay_failure";
    } else if (scenario === "checkout_abandonment") {
      amount = customAmount || 8200;
      paymentMethod = "card";
      failureReason = "Customer abandoned checkout before authorization";
      failureCode = "CHECKOUT_ABANDONED";
      sourceType = "checkout_abandonment";
    } else if (scenario === "subscription_failure") {
      amount = customAmount || 18000;
      paymentMethod = "card";
      failureReason = "Recurring mandate charge failed: insufficient funds";
      failureCode = "MANDATE_CHARGE_FAILED";
      sourceType = "subscription_failure";
    }

    const simPaymentId = `pay_sim_${Date.now().toString().slice(-6)}`;
    const simOrderId = `ORD-SIM-${Date.now().toString().slice(-4)}`;

    const paymentRecord: Payment = {
      paymentId: simPaymentId,
      orderId: simOrderId,
      customerId,
      amount,
      currency: "INR",
      paymentMethod,
      status: "failed",
      failureCode,
      failureReason,
      attemptNumber: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbService.createPayment(paymentRecord);

    // Ingest into the EXACT SAME multi-agent recovery pipeline as real webhooks
    const opportunity = await RecoveryOrchestrator.processPaymentFailure({
      payment: paymentRecord,
      customer,
      sourceType,
      failureCode,
      failureReason
    });

    return NextResponse.json({
      success: true,
      scenario,
      opportunityId: opportunity.opportunityId,
      amount: opportunity.amount,
      status: opportunity.status,
      recoveryProbability: opportunity.recoveryProbability,
      recommendedAction: opportunity.recommendedAction,
      recommendationReason: opportunity.recommendationReason,
      decision: opportunity.decision
    });
  } catch (error) {
    console.error("Error in simulator trigger endpoint:", error);
    return NextResponse.json({ error: "Failed to process simulation scenario" }, { status: 500 });
  }
}
