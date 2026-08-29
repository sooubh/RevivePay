import { callGeminiStructured } from "../gemini";
import { FailureAnalysisResult, Payment, Customer, Order } from "@/lib/types";

export interface FailureAnalystInput {
  payment: Payment;
  order?: Order | null;
  customer?: Customer | null;
  failureCode?: string;
  failureReason?: string;
}

export async function runFailureAnalyst(input: FailureAnalystInput): Promise<{
  analysis: FailureAnalysisResult;
  model: string;
}> {
  const { payment, customer, failureCode, failureReason } = input;
  const reasonText = (failureReason || payment.failureReason || "Payment failed or was interrupted").toLowerCase();
  const codeText = (failureCode || payment.failureCode || "").toLowerCase();

  // Deterministic domain baseline
  let defaultCategory: FailureAnalysisResult["failureCategory"] = "temporary_technical";
  let defaultRootCause = "Transient payment network error.";
  let isRecoverable = true;
  let riskProfile: FailureAnalysisResult["customerRiskProfile"] = "low";
  let suggestedFocus = "Prompt retry or alternate payment method.";

  if (reasonText.includes("card") || reasonText.includes("decline") || codeText.includes("card")) {
    defaultCategory = "card_declined";
    defaultRootCause = "Card issuer declined transaction due to temporary fraud check or bank limit.";
    suggestedFocus = "Prompt alternate payment via UPI or Netbanking.";
  } else if (reasonText.includes("abandon") || reasonText.includes("closed") || reasonText.includes("checkout")) {
    defaultCategory = "abandonment";
    defaultRootCause = "Customer exited checkout before completing authorization.";
    suggestedFocus = "Provide 1-click recovery link with prefilled cart.";
  } else if (reasonText.includes("funds") || reasonText.includes("insufficient") || reasonText.includes("balance")) {
    defaultCategory = "insufficient_funds";
    defaultRootCause = "Insufficient account balance or credit limit.";
    suggestedFocus = "Delayed retry or alternate account.";
  } else if (reasonText.includes("upi") || reasonText.includes("vpa") || reasonText.includes("timeout")) {
    defaultCategory = "temporary_technical";
    defaultRootCause = "NPCI / PSP gateway timeout during collect request.";
    suggestedFocus = "Immediate retry with same UPI VPA or QR code.";
  }

  if (customer) {
    if (customer.failedPayments > 3 && customer.successfulPayments === 0) {
      riskProfile = "high";
    } else if (customer.failedPayments > 2) {
      riskProfile = "medium";
    } else {
      riskProfile = "low";
    }
  }

  const fallback: FailureAnalysisResult = {
    failureCategory: defaultCategory,
    isRecoverable,
    rootCause: defaultRootCause,
    customerRiskProfile: riskProfile,
    suggestedFocus
  };

  const systemPrompt = `You are the Failure Analyst Agent for RevivePay, an AI revenue recovery platform for e-commerce merchants.
Analyze the payment failure context, failure codes, and customer history.
Determine the root cause, whether it is recoverable, the customer risk profile, and the suggested intervention focus.
Respond with strict JSON matching:
{
  "failureCategory": "temporary_technical" | "insufficient_funds" | "card_declined" | "abandonment" | "user_cancelled" | "network_timeout",
  "isRecoverable": boolean,
  "rootCause": string,
  "customerRiskProfile": "low" | "medium" | "high",
  "suggestedFocus": string
}`;

  const userPrompt = `Payment Context:
- Amount: ₹\${payment.amount}
- Method: \${payment.paymentMethod}
- Failure Code: \${failureCode || payment.failureCode || "N/A"}
- Failure Reason: \${failureReason || payment.failureReason || "N/A"}
- Attempt Count: \${payment.attemptNumber}
- Customer ID: \${customer?.customerId || "GUEST"}
- Customer Lifetime Spend: ₹\${customer?.totalSpend || 0}
- Prior Successes: \${customer?.successfulPayments || 0}
- Prior Failures: \${customer?.failedPayments || 0}`;

  const response = await callGeminiStructured<FailureAnalysisResult>(systemPrompt, userPrompt, fallback);
  return { analysis: response.result, model: response.model };
}
