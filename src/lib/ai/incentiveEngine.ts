import { IncentiveOffer, RecoveryPredictionResult, FailureAnalysisResult, Payment, Customer } from "@/lib/types";

export interface IncentiveInput {
  payment: Payment;
  prediction: RecoveryPredictionResult;
  failureAnalysis: FailureAnalysisResult;
  customer?: Customer | null;
}

/**
 * AI Dynamic Micro-Incentive Engine
 * Formulates the margin-optimal minimum incentive needed to tip a customer into recovery conversion.
 */
export class IncentiveEngine {
  public static evaluateIncentive(input: IncentiveInput): IncentiveOffer {
    const { payment, prediction, failureAnalysis, customer } = input;
    const prob = prediction.recoveryProbability;
    const amount = payment.amount;

    // High confidence / organic high probability -> Preserve full margin
    if (prob >= 0.78 && failureAnalysis.failureCategory === "network_timeout") {
      return {
        type: "none",
        discountAmount: 0,
        label: "Standard 1-Click Recovery",
        badge: "Zero Friction",
        expirySeconds: 900,
        reasoning: "High organic intent detected; no discount required to achieve recovery."
      };
    }

    // High value payment with hesitation or issuer friction (₹10,000+)
    if (amount >= 10000 && prob < 0.75) {
      return {
        type: "instant_upi_cashback",
        discountAmount: 500,
        label: "₹500 Instant UPI Cashback",
        badge: "VIP Privilege",
        expirySeconds: 900,
        reasoning: `High basket value (₹${amount.toLocaleString()}) warrants a ₹500 cash reward to prevent churn.`
      };
    }

    // Abandonment or price sensitivity (₹4,000 - ₹10,000)
    if (
      failureAnalysis.failureCategory === "abandonment" ||
      failureAnalysis.failureCategory === "insufficient_funds" ||
      prob < 0.65
    ) {
      const discount = Math.min(300, Math.round(amount * 0.05));
      return {
        type: "surge_discount",
        discountAmount: discount,
        label: `Instant ₹${discount} Surge Saver`,
        badge: "Limited Surge",
        expirySeconds: 900,
        reasoning: `AI attached a 5% margin-safe surge discount (₹${discount}) to overcome price hesitation.`
      };
    }

    // Repeat buyer or general footwear recovery
    if (customer && customer.successfulPayments >= 1) {
      return {
        type: "free_express_shipping",
        discountAmount: 199,
        label: "Complimentary Express Delivery",
        badge: "Loyalty Perk",
        expirySeconds: 900,
        reasoning: "Repeat customer rewarded with Free Express Shipping (₹199 value)."
      };
    }

    // Default micro-incentive
    return {
      type: "free_express_shipping",
      discountAmount: 199,
      label: "Free Priority Delivery",
      badge: "Reserved Hold",
      expirySeconds: 900,
      reasoning: "Express delivery incentive applied to guarantee 15-minute basket hold."
    };
  }
}
