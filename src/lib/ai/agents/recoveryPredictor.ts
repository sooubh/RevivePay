import { callGeminiStructured } from "../gemini";
import { FailureAnalysisResult, RecoveryPredictionResult, Payment, Customer, MerchantPolicy } from "@/lib/types";

export interface RecoveryPredictorInput {
  failureAnalysis: FailureAnalysisResult;
  payment: Payment;
  customer?: Customer | null;
  policy?: MerchantPolicy;
}

export async function runRecoveryPredictor(input: RecoveryPredictorInput): Promise<{
  prediction: RecoveryPredictionResult;
  model: string;
}> {
  const { failureAnalysis, payment, customer } = input;
  const attempts = Math.max(1, payment.attemptNumber || 1);

  // Baseline recovery probability grounded in fintech benchmarks
  let baseProb = 0.65;
  const keyDrivers: string[] = [];

  switch (failureAnalysis.failureCategory) {
    case "network_timeout":
      baseProb = 0.88;
      keyDrivers.push("Network timeout resolves with high conversion on immediate retry or alternate UPI route");
      break;
    case "temporary_technical":
      baseProb = 0.84;
      keyDrivers.push("Transient gateway disruption typically resolves automatically on subsequent attempt");
      break;
    case "card_declined":
      baseProb = 0.82;
      keyDrivers.push("High conversion when prompting alternate payment rail (UPI / Netbanking) on card decline");
      break;
    case "abandonment":
      baseProb = 0.60;
      keyDrivers.push("Personalized 1-click recovery link with prefilled cart captures warm intent");
      break;
    case "user_cancelled":
      baseProb = 0.45;
      keyDrivers.push("User intent hesitation; micro-incentive and instant checkout link recommended");
      break;
    case "insufficient_funds":
      baseProb = 0.40;
      keyDrivers.push("Delayed notification retry provides window for account funding");
      break;
    default:
      baseProb = 0.60;
  }

  // Attempt count degradation (decay probability with each failed retry)
  if (attempts > 1) {
    const attemptDecay = Math.min(0.30, (attempts - 1) * 0.12);
    baseProb = Math.max(0.15, baseProb - attemptDecay);
    keyDrivers.push(`Adjusted for attempt #${attempts} failure history (-${Math.round(attemptDecay * 100)}%)`);
  }

  // Customer Loyalty & LTV Adjustments
  if (customer) {
    if ((customer.successfulPayments || 0) >= 3) {
      baseProb = Math.min(0.96, baseProb + 0.10);
      keyDrivers.push(`High customer lifetime value (₹${(customer.totalSpend || 0).toLocaleString()}) and repeat buyer trust`);
    }
    if (customer.preferredPaymentMethod === "upi" && payment.paymentMethod === "upi") {
      baseProb = Math.min(0.94, baseProb + 0.05);
      keyDrivers.push("Aligned with customer's primary payment preference (UPI)");
    }
    if ((customer.failedPayments || 0) >= 3 && (customer.successfulPayments || 0) === 0) {
      baseProb = Math.max(0.10, baseProb - 0.15);
      keyDrivers.push("Past failure history with zero successful completions");
    }
  }

  // Dynamic confidence estimation based on contextual signal density
  let confidence = 0.85;
  if (customer && customer.customerId !== "GUEST") confidence += 0.06;
  if (payment.failureCode) confidence += 0.04;
  confidence = Math.min(0.98, Number(confidence.toFixed(2)));

  baseProb = Math.max(0.05, Math.min(0.98, Number(baseProb.toFixed(2))));

  const fallback: RecoveryPredictionResult = {
    recoveryProbability: baseProb,
    confidence,
    reasoning: `Estimated recovery probability of ${Math.round(baseProb * 100)}% based on ${failureAnalysis.failureCategory.replace(/_/g, " ")} failure characteristics and transaction signals.`,
    keyDrivers
  };

  const systemPrompt = `You are the Recovery Predictor Agent for RevivePay.
Estimate the probability (0.05 to 0.98) and confidence (0.50 to 0.99) that this failed payment can be successfully recovered.
IMPORTANT RULES:
- Never describe predictions as guarantees. Use terms like "estimated recovery probability".
- Return pure JSON matching:
{
  "recoveryProbability": number (e.g. 0.84),
  "confidence": number (e.g. 0.92),
  "reasoning": string,
  "keyDrivers": string[]
}`;

  const userPrompt = `Analysis Data:
- Failure Category: ${failureAnalysis.failureCategory}
- Root Cause: ${failureAnalysis.rootCause}
- Customer Risk: ${failureAnalysis.customerRiskProfile}
- Payment Method: ${payment.paymentMethod}
- Amount: ₹${payment.amount}
- Attempt Count: ${attempts}
- Customer Successes: ${customer?.successfulPayments || 0}
- Customer Failures: ${customer?.failedPayments || 0}
- Customer Total Spend: ₹${customer?.totalSpend || 0}`;

  const response = await callGeminiStructured<RecoveryPredictionResult>(systemPrompt, userPrompt, fallback);

  // Robust Normalization (handles 0-100 percentage scale or invalid numbers)
  let finalProb = response.result.recoveryProbability;
  if (typeof finalProb === "number" && !isNaN(finalProb)) {
    if (finalProb > 1 && finalProb <= 100) finalProb = finalProb / 100;
    if (finalProb < 0.05 || finalProb > 0.98) finalProb = baseProb;
  } else {
    finalProb = baseProb;
  }

  let finalConf = response.result.confidence;
  if (typeof finalConf === "number" && !isNaN(finalConf)) {
    if (finalConf > 1 && finalConf <= 100) finalConf = finalConf / 100;
    if (finalConf < 0.50 || finalConf > 0.99) finalConf = confidence;
  } else {
    finalConf = confidence;
  }

  return {
    prediction: {
      recoveryProbability: Number(finalProb.toFixed(2)),
      confidence: Number(finalConf.toFixed(2)),
      reasoning: response.result.reasoning && response.result.reasoning.trim().length > 10
        ? response.result.reasoning.trim()
        : fallback.reasoning,
      keyDrivers: Array.isArray(response.result.keyDrivers) && response.result.keyDrivers.length > 0
        ? response.result.keyDrivers
        : fallback.keyDrivers
    },
    model: response.model
  };
}
