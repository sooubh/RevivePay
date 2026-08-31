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

  // Calculate baseline deterministic recovery probability
  let baseProb = 0.65;
  const keyDrivers: string[] = [];

  switch (failureAnalysis.failureCategory) {
    case "temporary_technical":
      baseProb = 0.84;
      keyDrivers.push("Transient gateway timeout typically resolves on next attempt");
      break;
    case "card_declined":
      baseProb = 0.82;
      keyDrivers.push("High alternate payment (UPI) conversion on card decline");
      break;
    case "abandonment":
      baseProb = 0.58;
      keyDrivers.push("Direct recovery link with prefilled cart converts reliably");
      break;
    case "insufficient_funds":
      baseProb = 0.42;
      keyDrivers.push("Delayed retry after notification provides time to fund account");
      break;
    case "user_cancelled":
      baseProb = 0.35;
      keyDrivers.push("User intent hesitation; low friction recovery link recommended");
      break;
    default:
      baseProb = 0.60;
  }

  // Adjust for customer loyalty / past payment records
  if (customer) {
    if (customer.successfulPayments >= 3) {
      baseProb = Math.min(0.95, baseProb + 0.10);
      keyDrivers.push(`High customer lifetime value (₹${customer.totalSpend}) and repeat purchases`);
    }
    if (customer.preferredPaymentMethod === "upi" && payment.paymentMethod === "upi") {
      baseProb = Math.min(0.92, baseProb + 0.05);
      keyDrivers.push("Consistent prior UPI payment history");
    }
  }

  // Bound probability strictly
  baseProb = Math.max(0.10, Math.min(0.96, Number(baseProb.toFixed(2))));
  const confidence = 0.91;

  const fallback: RecoveryPredictionResult = {
    recoveryProbability: baseProb,
    confidence,
    reasoning: `Estimated recovery probability of ${Math.round(baseProb * 100)}% based on ${failureAnalysis.failureCategory.replace('_', ' ')} failure characteristics and customer payment patterns.`,
    keyDrivers
  };

  const systemPrompt = `You are the Recovery Predictor Agent for RevivePay.
Your job is to estimate the probability that this payment can be recovered through appropriate intervention.
IMPORTANT RULES:
- Never describe predictions as guarantees. Use terms like "estimated recovery probability".
- Base estimates on failure category, transaction amount, and customer signals.
- Return structured JSON matching:
{
  "recoveryProbability": number (0.05 to 0.98),
  "confidence": number (0.50 to 0.99),
  "reasoning": string,
  "keyDrivers": string[]
}`;

  const userPrompt = `Analysis Data:
- Failure Category: ${failureAnalysis.failureCategory}
- Root Cause: ${failureAnalysis.rootCause}
- Customer Risk: ${failureAnalysis.customerRiskProfile}
- Payment Method: ${payment.paymentMethod}
- Amount: ₹${payment.amount}
- Attempt Count: ${payment.attemptNumber}
- Customer Successes: ${customer?.successfulPayments || 0}
- Customer Failures: ${customer?.failedPayments || 0}`;

  const response = await callGeminiStructured<RecoveryPredictionResult>(systemPrompt, userPrompt, fallback);

  // Validate probability bounds strictly
  let finalProb = response.result.recoveryProbability;
  if (typeof finalProb !== "number" || isNaN(finalProb) || finalProb < 0 || finalProb > 1) {
    finalProb = baseProb;
  }
  let finalConf = response.result.confidence;
  if (typeof finalConf !== "number" || isNaN(finalConf) || finalConf < 0 || finalConf > 1) {
    finalConf = confidence;
  }

  return {
    prediction: {
      recoveryProbability: Number(finalProb.toFixed(2)),
      confidence: Number(finalConf.toFixed(2)),
      reasoning: response.result.reasoning || fallback.reasoning,
      keyDrivers: Array.isArray(response.result.keyDrivers) && response.result.keyDrivers.length > 0
        ? response.result.keyDrivers
        : fallback.keyDrivers
    },
    model: response.model
  };
}
