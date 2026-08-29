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

  // Default concise business explanation
  let fallbackExplanation = "Higher estimated recovery with lower customer friction.";
  if (selectedStrategy === "alternate_payment") {
    if (customer && customer.preferredPaymentMethod === "upi") {
      fallbackExplanation = `UPI is recommended because this customer successfully completed ${customer.successfulPayments} of prior purchases through UPI.`;
    } else {
      fallbackExplanation = "Higher estimated recovery with lower customer friction.";
    }
  } else if (selectedStrategy === "retry_now") {
    fallbackExplanation = "Instant retry is recommended because gateway error is transient and historically recovers within seconds.";
  } else if (selectedStrategy === "recovery_link") {
    fallbackExplanation = "1-click recovery link is recommended to capture intent before basket abandonment decays.";
  } else if (selectedStrategy === "delayed_retry") {
    fallbackExplanation = "Scheduled retry is recommended to avoid issuer rate-limiting while customer updates authorization.";
  } else if (selectedStrategy === "human_escalation") {
    fallbackExplanation = `High-value order (₹${payment.amount.toLocaleString()}) warrants VIP assistance to maximize conversion.`;
  } else if (selectedStrategy === "do_nothing") {
    fallbackExplanation = "Intervention cost exceeds expected recovery value; recommended to leave transaction uncontacted.";
  }

  const systemPrompt = `You are the Recovery Explainer Agent for RevivePay.
Generate a single concise, factual, executive-level sentence explaining why the selected recovery strategy was chosen for the merchant.
Rules:
- 1 to 2 sentences maximum.
- Be factual, grounded in numbers or customer behavior.
- Do not use flowery marketing language.
Respond with JSON matching:
{
  "explanation": string
}`;

  const userPrompt = `Selected Strategy: \${selectedStrategy}
Failure Category: \${failureAnalysis.failureCategory}
Root Cause: \${failureAnalysis.rootCause}
Estimated Probability: \${prediction.recoveryProbability}
Amount: ₹\${payment.amount}
Customer Prior Successes: \${customer?.successfulPayments || 0}
Customer Preferred Method: \${customer?.preferredPaymentMethod || "none"}`;

  const response = await callGeminiStructured<{ explanation: string }>(
    systemPrompt,
    userPrompt,
    { explanation: fallbackExplanation }
  );

  return {
    explanation: response.result.explanation || fallbackExplanation,
    model: response.model
  };
}
