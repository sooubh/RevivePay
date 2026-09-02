import { callGeminiStructured } from "../gemini";
import { FailureAnalysisResult, Payment, Customer, Order } from "@/lib/types";

export interface FailureAnalystInput {
  payment: Payment;
  order?: Order | null;
  customer?: Customer | null;
  failureCode?: string;
  failureReason?: string;
}

const VALID_CATEGORIES: FailureAnalysisResult["failureCategory"][] = [
  "temporary_technical",
  "insufficient_funds",
  "card_declined",
  "abandonment",
  "user_cancelled",
  "network_timeout"
];

export async function runFailureAnalyst(input: FailureAnalystInput): Promise<{
  analysis: FailureAnalysisResult;
  model: string;
}> {
  const { payment, customer, failureCode, failureReason } = input;
  const reasonText = (failureReason || payment.failureReason || "Payment failed or was interrupted").toLowerCase();
  const codeText = (failureCode || payment.failureCode || "").toLowerCase();

  // Deterministic domain baseline with rich payment gateway ontology
  let defaultCategory: FailureAnalysisResult["failureCategory"] = "temporary_technical";
  let defaultRootCause = "Transient payment network or gateway communication error.";
  let isRecoverable = true;
  let riskProfile: FailureAnalysisResult["customerRiskProfile"] = "low";
  let suggestedFocus = "Prompt immediate 1-click retry or alternate payment method.";

  if (
    codeText.includes("timeout") ||
    reasonText.includes("timeout") ||
    codeText.includes("timed_out") ||
    reasonText.includes("collect request expired") ||
    codeText.includes("gateway_timeout") ||
    codeText.includes("u69")
  ) {
    defaultCategory = "network_timeout";
    defaultRootCause = "NPCI / PSP gateway network timeout during payment authorization.";
    suggestedFocus = "Immediate 1-click retry or auto-switch to alternate UPI rail.";
  } else if (
    reasonText.includes("card") ||
    reasonText.includes("decline") ||
    codeText.includes("card") ||
    codeText.includes("issuer") ||
    codeText.includes("authentication_failed") ||
    codeText.includes("do_not_honor")
  ) {
    defaultCategory = "card_declined";
    defaultRootCause = "Card issuer declined transaction due to temporary fraud check or bank transaction limit.";
    suggestedFocus = "Prompt seamless 1-click alternate payment via UPI or Netbanking.";
  } else if (
    reasonText.includes("cancel") ||
    codeText.includes("cancel") ||
    codeText.includes("user_dropped") ||
    reasonText.includes("user closed") ||
    reasonText.includes("dismissed")
  ) {
    defaultCategory = "user_cancelled";
    defaultRootCause = "Customer dismissed checkout modal or canceled payment authorization.";
    suggestedFocus = "Send 1-click personalized recovery link with reserved basket hold.";
  } else if (
    reasonText.includes("abandon") ||
    codeText.includes("abandon") ||
    reasonText.includes("checkout") ||
    codeText.includes("cart")
  ) {
    defaultCategory = "abandonment";
    defaultRootCause = "Customer exited checkout before completing payment verification.";
    suggestedFocus = "Provide 1-click recovery link with prefilled cart and limited-time reserve.";
  } else if (
    reasonText.includes("funds") ||
    reasonText.includes("insufficient") ||
    reasonText.includes("balance") ||
    codeText.includes("insufficient_funds") ||
    codeText.includes("limit_exceeded") ||
    codeText.includes("z9")
  ) {
    defaultCategory = "insufficient_funds";
    defaultRootCause = "Insufficient account balance or transaction credit limit.";
    suggestedFocus = "Schedule delayed retry notification or offer alternate payment method.";
  } else if (
    reasonText.includes("upi") ||
    reasonText.includes("vpa") ||
    codeText.includes("gateway_error") ||
    codeText.includes("server_error") ||
    codeText.includes("bank_technical_failure") ||
    codeText.includes("u30")
  ) {
    defaultCategory = "temporary_technical";
    defaultRootCause = "Bank PSP gateway experienced temporary downtime during processing.";
    suggestedFocus = "Immediate retry with same UPI VPA or QR code.";
  }

  // Advanced Customer Risk Profiling (Ratio + Spend based)
  if (customer) {
    const totalTransactions = (customer.successfulPayments || 0) + (customer.failedPayments || 0);
    const failureRate = totalTransactions > 0 ? (customer.failedPayments || 0) / totalTransactions : 0;

    if ((customer.failedPayments || 0) >= 3 && (customer.successfulPayments || 0) === 0) {
      riskProfile = "high";
    } else if (failureRate > 0.6 && (customer.totalSpend || 0) < 3000) {
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

  const systemPrompt = `You are the Failure Analyst Agent for RevivePay, an autonomous payment recovery system for e-commerce merchants.
Analyze the payment failure context, failure codes, customer risk profile, and transaction data.
Diagnose the exact root cause, determine if it is recoverable, assess risk, and suggest the ideal focus.
Respond strictly in JSON format matching:
{
  "failureCategory": "temporary_technical" | "insufficient_funds" | "card_declined" | "abandonment" | "user_cancelled" | "network_timeout",
  "isRecoverable": boolean,
  "rootCause": string (specific, factual explanation),
  "customerRiskProfile": "low" | "medium" | "high",
  "suggestedFocus": string
}`;

  const userPrompt = `Payment Context:
- Amount: ₹${payment.amount}
- Payment Method: ${payment.paymentMethod}
- Failure Code: ${failureCode || payment.failureCode || "N/A"}
- Failure Reason: ${failureReason || payment.failureReason || "N/A"}
- Attempt Count: ${payment.attemptNumber || 1}
- Customer ID: ${customer?.customerId || "GUEST"}
- Customer Lifetime Spend: ₹${customer?.totalSpend || 0}
- Prior Successes: ${customer?.successfulPayments || 0}
- Prior Failures: ${customer?.failedPayments || 0}`;

  const response = await callGeminiStructured<FailureAnalysisResult>(systemPrompt, userPrompt, fallback);

  // Strict schema validation and normalization
  const rawResult = response.result;
  const cleanCategory = VALID_CATEGORIES.includes(rawResult.failureCategory)
    ? rawResult.failureCategory
    : defaultCategory;
  const cleanRisk: FailureAnalysisResult["customerRiskProfile"] =
    rawResult.customerRiskProfile === "high" || rawResult.customerRiskProfile === "medium" || rawResult.customerRiskProfile === "low"
      ? rawResult.customerRiskProfile
      : riskProfile;

  return {
    analysis: {
      failureCategory: cleanCategory,
      isRecoverable: typeof rawResult.isRecoverable === "boolean" ? rawResult.isRecoverable : isRecoverable,
      rootCause: rawResult.rootCause && rawResult.rootCause.trim().length > 5 ? rawResult.rootCause.trim() : defaultRootCause,
      customerRiskProfile: cleanRisk,
      suggestedFocus: rawResult.suggestedFocus && rawResult.suggestedFocus.trim().length > 5 ? rawResult.suggestedFocus.trim() : suggestedFocus
    },
    model: response.model
  };
}
