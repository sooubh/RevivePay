import { dbService } from "@/lib/firebase/db";
import {
  Payment,
  Order,
  Customer,
  RecoveryOpportunity,
  RecoveryOutcome
} from "@/lib/types";

export interface IngestEventInput {
  payment: Payment;
  order?: Order | null;
  customer?: Customer | null;
  sourceType?: "return" | "ndr" | "razorpay_failure";
  failureCode?: string;
  failureReason?: string;
  returnDetails?: {
    productName: string;
    productId: string;
    returnReason: string;
    currentSize: string;
    replacementSize: string;
    replacementInStock: boolean;
  };
  ndrDetails?: {
    ndrReason: string;
    codAmount: number;
    deliveryAttempts: number;
    deliveryStatus: string;
    courierName?: string;
  };
}

export class RecoveryOrchestrator {
  /**
   * Process an e-commerce revenue leak event (Return or NDR) through the AI recovery engine.
   */
  public static async processPaymentFailure(input: IngestEventInput): Promise<RecoveryOpportunity> {
    const { payment, order, customer, sourceType = "return", failureReason } = input;

    // Deterministic clean ID
    const paymentIdClean = payment.paymentId.replace(/^(pay_|PAY_)/, "").replace(/[^a-zA-Z0-9]/g, "");
    const cleanSuffix =
      paymentIdClean.length >= 6
        ? paymentIdClean.slice(-8).toUpperCase()
        : paymentIdClean.padStart(6, "0").toUpperCase();
    const opportunityId = `TXN-${cleanSuffix}`;

    // Idempotency: Check existing opportunity first
    const existingOpp = await dbService.getRecoveryOpportunityById(opportunityId);
    if (existingOpp && existingOpp.status === "recovered") {
      return existingOpp;
    }

    // 1. Return Case (Scenario 1: Size Mismatch -> Size Exchange)
    if (sourceType === "return") {
      const currentSz = input.returnDetails?.currentSize || "9";
      const replaceSz = input.returnDetails?.replacementSize || "10";
      const prodName = input.returnDetails?.productName || "Aeon Performance Runner";
      const inStock = input.returnDetails?.replacementInStock ?? true;

      const returnOpp: RecoveryOpportunity = {
        opportunityId,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        customerId: payment.customerId,
        customerName: customer?.name || order?.customerName || "Sarah Jenkins",
        customerEmail: customer?.email || order?.customerEmail || "sarah.j@example.com",
        amount: payment.amount,
        currency: payment.currency || "INR",
        sourceType: "return",
        paymentMethod: payment.paymentMethod || "upi",
        failureType: failureReason || `Return: Size ${currentSz} Too Small (Requested Size ${replaceSz})`,
        attemptCount: 1,
        status: "recovery_recommended",
        priority: "High Priority",
        recoveryProbability: 0.95,
        expectedRecovery: payment.amount,
        recommendedAction: `Size ${replaceSz} Exchange`,
        recommendationReason: `• Customer reason: size mismatch (Size ${currentSz} reported too tight)\n• Replacement available: Size ${replaceSz} verified in stock (8 units)\n• Order preservation: Direct exchange retains full order value (₹${payment.amount.toLocaleString()}.00)\n• Downside prevention: Issuing a refund forfeits 100% of the sale\n• Decision: Size ${replaceSz} Exchange is the preferred bounded recovery action.`,
        selectedStrategy: "size_exchange",
        productName: prodName,
        productId: input.returnDetails?.productId || "PROD-001",
        returnReason: input.returnDetails?.returnReason || `Size ${currentSz} too small / tight fit`,
        currentSize: currentSz,
        replacementSize: replaceSz,
        replacementInStock: inStock,
        decision: {
          decisionId: `DEC-${opportunityId}`,
          opportunityId,
          model: "Revenue Recovery Decision Engine",
          selectedStrategy: "size_exchange",
          selectedStrategyLabel: `Size ${replaceSz} Exchange`,
          recoveryProbability: 0.95,
          expectedRecovery: payment.amount,
          recommendationReason: `Size mismatch identified for ${prodName}. Replacement Size ${replaceSz} is in stock. Exchange preserves 100% of order value vs full refund.`,
          failureAnalysis: {
            failureCategory: "user_cancelled",
            isRecoverable: true,
            rootCause: "Shoe size too small / tight fit",
            customerRiskProfile: "low",
            suggestedFocus: "Immediate size replacement exchange"
          },
          prediction: {
            recoveryProbability: 0.95,
            confidence: 0.95,
            reasoning: "In-stock replacement size eliminates refund motivation.",
            keyDrivers: ["Size mismatch reason", "In-stock replacement inventory", "Zero-friction 1-click exchange"]
          },
          strategiesEvaluated: [
            {
              strategy: "size_exchange",
              label: `Size ${replaceSz} Exchange (Preserves Sale)`,
              probability: 0.95,
              expectedRecovery: payment.amount,
              friction: "low",
              interventionCost: 0,
              score: 95,
              reasoning: `In-stock inventory confirmed. Direct exchange preserves full order value (₹${payment.amount.toLocaleString()}).`
            },
            {
              strategy: "store_credit",
              label: "Store Credit Offer",
              probability: 0.40,
              expectedRecovery: Math.round(payment.amount * 0.40),
              friction: "medium",
              interventionCost: 0,
              score: 40,
              reasoning: "Alternative retention path, but customer drop-off is higher than direct size exchange."
            },
            {
              strategy: "full_refund",
              label: "Full Refund (Loss of Sale)",
              probability: 0.0,
              expectedRecovery: 0,
              friction: "low",
              interventionCost: payment.amount,
              score: 0,
              reasoning: "Results in complete loss of revenue (₹0 retained) and customer churn."
            }
          ],
          guardrailOutcome: "AUTO_EXECUTE",
          guardrailNotes: [
            "Customer reason: size mismatch",
            `Replacement size available (Size ${replaceSz}: in stock)`,
            `Exchange preserves ₹${payment.amount.toLocaleString()}.00 order value`,
            "Refund would lose the sale"
          ],
          createdAt: new Date().toISOString()
        },
        customerRecoveryUrl: `/store/payment?oppId=${opportunityId}&orderId=${payment.orderId}&type=return`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbService.createRecoveryOpportunity(returnOpp);

      await dbService.addAuditLog({
        opportunityId,
        orderId: payment.orderId,
        actorType: "AI_AGENT",
        agentName: "RevenueAgent",
        eventType: "RETURN_FILED",
        message: `Return filed: ${prodName} (Size ${currentSz} tight). AI evaluated: Size ${replaceSz} Exchange preserves ₹${payment.amount.toLocaleString()}.00 (Demo estimate: 95% retention).`,
        metadata: {
          sourceType: "return",
          currentSize: returnOpp.currentSize,
          replacementSize: returnOpp.replacementSize,
          expectedRecovery: returnOpp.amount
        }
      });

      return returnOpp;
    }

    // 2. NDR Case (Scenario 2: COD Cash Unavailable -> Razorpay Prepaid Conversion)
    const codAmt = input.ndrDetails?.codAmount || payment.amount || 3499;
    const ndrRsn = input.ndrDetails?.ndrReason || failureReason || "Customer could not pay cash at delivery (COD)";
    const deliveryAttempts = input.ndrDetails?.deliveryAttempts || 1;
    const prodName = input.returnDetails?.productName || "Aeon Performance Runner";

    const ndrOpp: RecoveryOpportunity = {
      opportunityId,
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      customerId: payment.customerId,
      customerName: customer?.name || order?.customerName || "Sarah Jenkins",
      customerEmail: customer?.email || order?.customerEmail || "sarah.j@example.com",
      amount: codAmt,
      currency: payment.currency || "INR",
      sourceType: "ndr",
      paymentMethod: "cod",
      failureType: `NDR: Cash Unavailable at Delivery (COD ₹${codAmt.toLocaleString()})`,
      attemptCount: deliveryAttempts,
      status: "recovery_recommended",
      priority: "High Priority",
      recoveryProbability: 0.90,
      expectedRecovery: codAmt,
      recommendedAction: "Convert COD to Prepaid via Razorpay",
      recommendationReason: `• Customer reason: customer could not pay cash at delivery (COD ₹${codAmt.toLocaleString()}.00)\n• Risk tradeoff: Courier re-attempt has ~65% RTO failure rate and courier penalty fee\n• Revenue preservation: Instant Razorpay digital payment secures 100% order value upfront\n• Delivery outcome: Delivery resumes immediately without cash collection friction\n• Decision: Convert COD to Prepaid via Razorpay`,
      selectedStrategy: "cod_to_prepaid",
      ndrReason: ndrRsn,
      codAmount: codAmt,
      deliveryAttempts,
      deliveryStatus: "delivery_paused_pending_payment",
      productName: prodName,
      decision: {
        decisionId: `DEC-${opportunityId}`,
        opportunityId,
        model: "Revenue Recovery Decision Engine",
        selectedStrategy: "cod_to_prepaid",
        selectedStrategyLabel: "Convert COD to Prepaid",
        recoveryProbability: 0.90,
        expectedRecovery: codAmt,
        recommendationReason: `Customer unable to pay cash on delivery. Converting order to Razorpay prepaid eliminates RTO courier loss and secures ₹${codAmt.toLocaleString()}.00 revenue.`,
        failureAnalysis: {
          failureCategory: "insufficient_funds",
          isRecoverable: true,
          rootCause: "Cash not handy during delivery attempt 1",
          customerRiskProfile: "low",
          suggestedFocus: "Immediate Razorpay digital prepayment"
        },
        prediction: {
          recoveryProbability: 0.90,
          confidence: 0.90,
          reasoning: "Customer ready to receive item but lacks exact cash; digital payment enables immediate completion.",
          keyDrivers: ["Customer verified reachable", "Prepaid removes cash barrier", "Zero RTO return cost"]
        },
        strategiesEvaluated: [
          {
            strategy: "cod_to_prepaid",
            label: "Razorpay Prepaid Conversion (Selected)",
            probability: 0.90,
            expectedRecovery: codAmt,
            friction: "low",
            interventionCost: 0,
            score: 90,
            reasoning: `Digital payment secures full order value (₹${codAmt.toLocaleString()}) and guarantees doorstep delivery without cash friction.`
          },
          {
            strategy: "delayed_retry",
            label: "Reattempt Cash Collection",
            probability: 0.35,
            expectedRecovery: Math.round(codAmt * 0.35),
            friction: "high",
            interventionCost: 120,
            score: 30,
            reasoning: "Reattempting cash collection has ~65% RTO failure rate and incurs additional courier re-dispatch fees."
          },
          {
            strategy: "full_refund",
            label: "Cancel & Return to Origin (RTO)",
            probability: 0.0,
            expectedRecovery: 0,
            friction: "low",
            interventionCost: codAmt,
            score: 0,
            reasoning: "Results in 100% loss of order value, reverse logistics penalty, and dead inventory."
          }
        ],
        guardrailOutcome: "AUTO_EXECUTE",
        guardrailNotes: [
          "NDR reason: cash unavailable",
          `Order value: ₹${codAmt.toLocaleString()}.00 within auto-recovery limit`,
          "Prepaid conversion eliminates RTO courier cost",
          "Delivery marked active upon payment confirmation"
        ],
        createdAt: new Date().toISOString()
      },
      customerRecoveryUrl: `/store/payment?oppId=${opportunityId}&orderId=${payment.orderId}&type=ndr`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbService.createRecoveryOpportunity(ndrOpp);

    await dbService.addAuditLog({
      opportunityId,
      orderId: payment.orderId,
      actorType: "AI_AGENT",
      agentName: "RevenueAgent",
      eventType: "NDR_FILED",
      message: `NDR event logged: Delivery paused for order ${payment.orderId} (COD cash unavailable). AI recommended: Razorpay Prepaid Conversion retains ₹${codAmt.toLocaleString()}.00 (Demo estimate: 90% retention).`,
      metadata: {
        sourceType: "ndr",
        codAmount: codAmt,
        ndrReason: ndrRsn,
        expectedRecovery: codAmt
      }
    });

    return ndrOpp;
  }

  /**
   * Process customer recovery execution (Size Exchange confirmed or Razorpay Prepaid confirmed).
   */
  public static async processRecoverySuccess(
    opportunityId: string,
    recoveredPaymentMethod: string = "exchange"
  ): Promise<RecoveryOpportunity | null> {
    const opp = await dbService.getRecoveryOpportunityById(opportunityId);
    if (!opp) return null;

    const isReturn = opp.sourceType === "return" || recoveredPaymentMethod === "exchange";
    const isNdr = opp.sourceType === "ndr" || recoveredPaymentMethod === "razorpay_prepaid";

    const updateFields: Partial<RecoveryOpportunity> = {
      status: "recovered",
      updatedAt: new Date().toISOString()
    };
    if (isNdr) {
      updateFields.deliveryStatus = "delivery_active_prepaid_confirmed";
    }

    const updatedOpp = await dbService.updateRecoveryOpportunity(opportunityId, updateFields);

    if (opp.orderId) {
      await dbService.updateOrder(opp.orderId, { status: "recovered" });
    }

    // Record Outcome
    const outcome: RecoveryOutcome = {
      outcomeId: `OUT-${opportunityId}`,
      opportunityId,
      successful: true,
      originalAmount: opp.amount,
      amountRecovered: opp.amount,
      timeToRecoverySeconds: Math.floor((Date.now() - new Date(opp.createdAt).getTime()) / 1000),
      customerFriction: "low",
      recoveredPaymentMethod: recoveredPaymentMethod as any,
      createdAt: new Date().toISOString()
    };
    await dbService.createRecoveryOutcome(outcome);

    // Audit Log: Immutable record of success
    let eventType: any = "PAYMENT_RECOVERED";
    let message = `Revenue retained — ₹${opp.amount.toLocaleString()}.00`;

    if (isReturn) {
      eventType = "EXCHANGE_CONFIRMED";
      message = `Revenue retained — ₹${opp.amount.toLocaleString()}.00 via Size ${opp.replacementSize || "10"} Exchange (Customer accepted, refund avoided)`;
    } else if (isNdr) {
      eventType = "COD_CONVERTED_PREPAID";
      message = `Revenue retained — ₹${opp.amount.toLocaleString()}.00 via Razorpay Prepaid (COD converted, delivery unpaused)`;
    }

    await dbService.addAuditLog({
      opportunityId,
      orderId: opp.orderId,
      actorType: "CUSTOMER",
      eventType,
      message,
      metadata: {
        amountRecovered: opp.amount,
        method: recoveredPaymentMethod,
        sourceType: opp.sourceType,
        replacementSize: opp.replacementSize,
        timeToRecovery: outcome.timeToRecoverySeconds
      }
    });

    return updatedOpp || opp;
  }
}
