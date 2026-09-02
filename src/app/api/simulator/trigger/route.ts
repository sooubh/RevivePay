import { NextRequest, NextResponse } from "next/server";
import { dbService } from "@/lib/firebase/db";
import { RecoveryOrchestrator } from "@/lib/recovery/orchestrator";
import { BankHealthService } from "@/lib/telemetry/bankHealth";
import { Payment } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      scenario = "upi_failure",
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

    let amount = customAmount || 4999;
    let paymentMethod: any = "upi";
    let failureReason = "NPCI / PSP gateway timeout during collect request (U69)";
    let failureCode = "GATEWAY_TIMEOUT";
    let sourceType: any = "razorpay_failure";

    // Indian Payment Rail Scenario Matrix
    switch (scenario) {
      case "sbi_netbanking_downtime":
        amount = customAmount || 6800;
        paymentMethod = "netbanking";
        failureReason = "SBI Netbanking Core Banking System (CBS) latency spike (>1840ms) & timeout";
        failureCode = "BANK_CBS_TIMEOUT";
        sourceType = "razorpay_failure";
        // Dynamically degrade SBI Node in Telemetry
        BankHealthService.simulateBankLatencySpike("SBIN", 2400, 68.2);
        break;

      case "npci_psp_timeout":
      case "upi_failure":
        amount = customAmount || 4999;
        paymentMethod = "upi";
        failureReason = "NPCI / PSP collect request timed out after 90s (Code: U69)";
        failureCode = "NPCI_COLLECT_TIMEOUT";
        sourceType = "razorpay_failure";
        BankHealthService.recordMetric({ rail: "UPI", bankCode: "UPI_NPCI", latencyMs: 950, success: false });
        break;

      case "card_decline":
        amount = customAmount || 12500;
        paymentMethod = "card";
        failureReason = "Card issuer declined transaction (RBI domestic e-commerce limit / fraud check)";
        failureCode = "ISSUER_DECLINE";
        sourceType = "razorpay_failure";
        BankHealthService.recordMetric({ rail: "CARD", bankCode: "HDFC", latencyMs: 1100, success: false });
        break;

      case "otp_acs_timeout":
        amount = customAmount || 7499;
        paymentMethod = "card";
        failureReason = "3D Secure / ACS Bank OTP verification page timed out";
        failureCode = "ACS_OTP_TIMEOUT";
        sourceType = "razorpay_failure";
        break;

      case "checkout_abandonment":
        amount = customAmount || 8200;
        paymentMethod = "card";
        failureReason = "Customer abandoned checkout before completing authorization";
        failureCode = "CHECKOUT_ABANDONED";
        sourceType = "checkout_abandonment";
        break;

      case "subscription_failure":
      case "rbi_mandate_failure":
        amount = customAmount || 18000;
        paymentMethod = "netbanking";
        failureReason = "RBI E-Mandate cap (>₹15,000) triggered AFA/OTP requirement without customer authorization";
        failureCode = "MANDATE_AFA_REQUIRED";
        sourceType = "subscription_failure";
        BankHealthService.recordMetric({ rail: "NETBANKING", bankCode: "ENACH_MANDATE", latencyMs: 1800, success: false });
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
      decision: opportunity.decision,
      bankHealthTelemetry: BankHealthService.getHealthSummary()
    });
  } catch (error) {
    console.error("Error in simulator trigger endpoint:", error);
    return NextResponse.json({ error: "Failed to process simulation scenario" }, { status: 500 });
  }
}
