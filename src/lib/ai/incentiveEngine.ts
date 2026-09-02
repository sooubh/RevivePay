import { IncentiveOffer, RecoveryPredictionResult, FailureAnalysisResult, Payment, Customer } from "@/lib/types";

export interface IncentiveInput {
  payment: Payment;
  prediction: RecoveryPredictionResult;
  failureAnalysis: FailureAnalysisResult;
  customer?: Customer | null;
}

/**
 * AI Dynamic Micro-Incentive Engine
 * Calculates the margin-optimal minimum incentive needed to tip a customer into recovery conversion.
 */
export class IncentiveEngine {
  public static evaluateIncentive(input: IncentiveInput): IncentiveOffer {
    const { payment, prediction, failureAnalysis, customer } = input;
    const prob = prediction.recoveryProbability;
    const amount = Math.max(0, payment.amount || 0);
    const category = failureAnalysis.failureCategory;

    // Rule 1: High organic probability / Technical gateway timeouts -> Preserve 100% merchant margin
    if (prob >= 0.75 && (category === "network_timeout" || category === "temporary_technical")) {
      return {
        type: "none",
        discountAmount: 0,
        label: "Standard 1-Click Recovery",
        badge: "Zero Friction",
        expirySeconds: 900,
        reasoning: "High organic intent detected; no discount required to achieve recovery."
      };
    }

    // Rule 2: High value transaction with card limit friction (₹10,000+)
    if (amount >= 10000 && prob < 0.78) {
      const cashback = Math.min(500, Math.round(amount * 0.04));
      return {
        type: "instant_upi_cashback",
        discountAmount: cashback,
        label: `₹${cashback} Instant UPI Cashback`,
        badge: "VIP Privilege",
        expirySeconds: 900,
        reasoning: `High basket value (₹${amount.toLocaleString()}) warrants a ₹${cashback} instant cashback incentive to secure recovery.`
      };
    }

    // Rule 3: Abandonment or user cancellation with price hesitation
    if (category === "abandonment" || category === "user_cancelled" || category === "insufficient_funds" || prob < 0.65) {
      if (amount >= 3000) {
        const discount = Math.min(350, Math.max(100, Math.round(amount * 0.05)));
        return {
          type: "surge_discount",
          discountAmount: discount,
          label: `Instant ₹${discount} Surge Saver`,
          badge: "Limited Surge",
          expirySeconds: 900,
          reasoning: `AI attached a 5% margin-safe surge discount (₹${discount}) to overcome price hesitation.`
        };
      } else {
        return {
          type: "free_express_shipping",
          discountAmount: 199,
          label: "Free Priority Delivery",
          badge: "Reserved Hold",
          expirySeconds: 900,
          reasoning: "Complimentary priority shipping (₹199 value) offered to secure small basket checkout."
        };
      }
    }

    // Rule 4: Loyal repeat buyer
    if (customer && (customer.successfulPayments || 0) >= 1) {
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
