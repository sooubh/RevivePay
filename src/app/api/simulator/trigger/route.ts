import { NextRequest, NextResponse } from "next/server";
import { dbService } from "@/lib/firebase/db";
import { RecoveryOrchestrator } from "@/lib/recovery/orchestrator";
import { Payment } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      scenario = "return_size_issue",
      customAmount,
      opportunityId,
      customerId = "CUS-8F42K1"
    } = body as {
      scenario: string;
      customAmount?: number;
      opportunityId?: string;
      customerId?: string;
    };

    const customer = await dbService.getCustomerById(customerId);

    // Scenario: Recovery Success
    if (scenario === "recovery_success") {
      let targetId = opportunityId;
      if (!targetId) {
        const opps = await dbService.getRecoveryOpportunities();
        const pendingOpp = opps.find(o => o.status !== "recovered");
        targetId = pendingOpp ? pendingOpp.opportunityId : "TXN-RETURN-001";
      }

      const recovered = await RecoveryOrchestrator.processRecoverySuccess(targetId, "upi");
      return NextResponse.json({
        success: true,
        scenario,
        message: `Successfully recovered opportunity ${targetId}`,
        opportunity: recovered
      });
    }

    let amount = customAmount || 4999;
    let paymentMethod: any = "upi";
    let failureReason = "Return: Size 9 is too tight (Customer requested Size 10)";
    let failureCode = "RETURN_SIZE_MISMATCH";
    let sourceType: any = "return";

    // Hackathon Scope: Return & NDR Scenarios
    switch (scenario) {
      case "ndr_cash_unavailable":
        amount = customAmount || 3499;
        paymentMethod = "cod";
        failureReason = "Customer could not pay cash at delivery (COD cash unavailable)";
        failureCode = "NDR_CASH_UNAVAILABLE";
        sourceType = "ndr";
        break;

      case "return_size_issue":
      default:
        amount = customAmount || 4999;
        paymentMethod = "upi";
        failureReason = "Return: Size 9 is too tight (Customer requested Size 10)";
        failureCode = "RETURN_SIZE_MISMATCH";
        sourceType = "return";
        break;
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

    // Process through the complete AI recovery pipeline
    const opportunity = await RecoveryOrchestrator.processPaymentFailure({
      payment: paymentRecord,
      customer,
      sourceType,
      failureCode,
      failureReason,
      returnDetails: sourceType === "return" ? {
        productName: "Aeon Performance Runner",
        productId: "PROD-001",
        returnReason: "Size 9 is too tight / fit issue",
        currentSize: "9",
        replacementSize: "10",
        replacementInStock: true
      } : undefined,
      ndrDetails: sourceType === "ndr" ? {
        ndrReason: "Customer could not pay cash at delivery (COD)",
        codAmount: amount,
        deliveryAttempts: 1,
        deliveryStatus: "delivery_paused_pending_payment",
        courierName: "BlueDart Express"
      } : undefined
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
