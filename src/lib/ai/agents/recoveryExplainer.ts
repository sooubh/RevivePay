import { callGeminiStructured } from "../gemini";
import {
  FailureAnalysisResult,
  RecoveryPredictionResult,
  RecoveryStrategyType,
  Payment,
  Customer
} from "@/lib/types";

export interface RecoveryExplainerInput {
  selectedStrategy: RecoveryStrategyType;
  selectedStrategyLabel: string;
  failureAnalysis: FailureAnalysisResult;
  prediction: RecoveryPredictionResult;
  payment: Payment;
  customer?: Customer | null;
}

export async function runRecoveryExplainer(input: RecoveryExplainerInput): Promise<{
  explanation: string;
  model: string;
}> {
  const { selectedStrategy, failureAnalysis, prediction, payment, customer } = input;

  // Grounded factual fallback explanations
  let fallbackExplanation = "Higher estimated recovery with lower customer friction.";
  if (selectedStrategy === "alternate_payment") {
    if (customer && customer.preferredPaymentMethod === "upi") {
      fallbackExplanation = `UPI is recommended because this customer successfully completed ${customer.successfulPayments} prior purchases through UPI.`;
    } else {
      fallbackExplanation = "Switching to UPI or Netbanking eliminates card issuer limits and reduces customer friction.";
    }
  } else if (selectedStrategy === "retry_now") {
    fallbackExplanation = "Instant retry is recommended because the gateway error is transient and typically succeeds immediately.";
  } else if (selectedStrategy === "recovery_link") {
    fallbackExplanation = "1-click recovery link is recommended to capture active intent before basket reservation expires.";
  } else if (selectedStrategy === "customer_notification") {
    fallbackExplanation = "Direct mobile notification is recommended to re-engage the customer on their preferred channel.";
  } else if (selectedStrategy === "delayed_retry") {
    fallbackExplanation = "Scheduled retry is recommended to allow time for bank balance or transaction limits to refresh.";
  } else if (selectedStrategy === "human_escalation") {
    fallbackExplanation = `High-value transaction (₹${payment.amount.toLocaleString()}) warrants VIP concierge assistance to maximize conversion.`;
  } else if (selectedStrategy === "do_nothing") {
    fallbackExplanation = "Intervention cost exceeds expected recovery value; recommended to leave transaction uncontacted.";
  }

  const systemPrompt = `You are the Recovery Explainer Agent for RevivePay.
Generate a single concise, factual, executive-level sentence explaining why the selected recovery strategy was chosen for the merchant.
Rules:
- 1 to 2 sentences maximum.
- Be factual, citing specific payment methods, order amounts, or customer signals.
- Avoid flowery marketing adjectives.
Respond strictly with JSON:
{
  "explanation": string
}`;

  const userPrompt = `Selected Strategy: ${selectedStrategy}
Failure Category: ${failureAnalysis.failureCategory}
Root Cause: ${failureAnalysis.rootCause}
Estimated Probability: ${prediction.recoveryProbability}
Amount: ₹${payment.amount}
Customer Prior Successes: ${customer?.successfulPayments || 0}
Customer Preferred Method: ${customer?.preferredPaymentMethod || "none"}`;

  const response = await callGeminiStructured<{ explanation: string }>(
    systemPrompt,
    userPrompt,
    { explanation: fallbackExplanation }
  );

  let explanation = response.result.explanation || fallbackExplanation;
  // Clean string (strip enclosing quotes if present)
  explanation = explanation.trim().replace(/^["']|["']$/g, "").trim();

  return {
    explanation,
    model: response.model
  };
}
