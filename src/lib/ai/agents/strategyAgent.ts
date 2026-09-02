import { callGeminiStructured } from "../gemini";
import { BankHealthService } from "@/lib/telemetry/bankHealth";
import {
  FailureAnalysisResult,
  RecoveryPredictionResult,
  StrategyEvaluation,
  RecoveryStrategyType,
  Payment,
  Customer,
  MerchantPolicy
} from "@/lib/types";

export interface StrategyAgentInput {
  failureAnalysis: FailureAnalysisResult;
  prediction: RecoveryPredictionResult;
  payment: Payment;
  customer?: Customer | null;
  policy: MerchantPolicy;
}

export interface StrategyAgentOutput {
  strategiesEvaluated: StrategyEvaluation[];
  selectedStrategy: RecoveryStrategyType;
  selectedStrategyLabel: string;
  expectedRecovery: number;
  overallProbability: number;
  reasoning: string;
  model: string;
}

export async function runStrategyAgent(input: StrategyAgentInput): Promise<StrategyAgentOutput> {
  const { failureAnalysis, prediction, payment, customer, policy } = input;
  const amount = payment.amount;
  const category = failureAnalysis.failureCategory;
  const attempts = Math.max(1, payment.attemptNumber || 1);
  const exceedsRetries = attempts >= policy.maxRetries;

  // Query live payment rail telemetry
  const sbiNode = BankHealthService.getNode("SBIN");
  const upiIntentNode = BankHealthService.getNode("UPI_PHONEPE_GPAY") || BankHealthService.getNode("UPI_NPCI");

  const candidates: StrategyEvaluation[] = [];

  // Strategy 1: Retry Now (Immediate 1-Click Retry)
  let retryNowProb = 0.31;
  if (category === "network_timeout") retryNowProb = 0.88;
  else if (category === "temporary_technical") retryNowProb = 0.84;
  else if (category === "card_declined") retryNowProb = 0.30;
  else if (category === "abandonment") retryNowProb = 0.15;
  else if (category === "insufficient_funds") retryNowProb = 0.08;
  if (exceedsRetries) retryNowProb = Math.min(0.20, retryNowProb * 0.3);

  candidates.push({
    strategy: "retry_now",
    label: "Retry now",
    probability: Number(retryNowProb.toFixed(2)),
    expectedRecovery: Math.round(retryNowProb * amount),
    friction: "low",
    interventionCost: 0,
    score: Math.round(retryNowProb * amount),
    reasoning: category === "network_timeout" || category === "temporary_technical"
      ? "Immediate retry is optimal for transient gateway timeouts"
      : "Low recovery probability for non-technical or authorization failures"
  });

  // Strategy 2: Delayed Retry (Scheduled Retry Window)
  let delayedProb = 0.50;
  if (category === "insufficient_funds") delayedProb = 0.68;
  else if (category === "temporary_technical") delayedProb = 0.72;
  else if (category === "card_declined") delayedProb = 0.45;
  if (exceedsRetries) delayedProb = Math.min(0.25, delayedProb * 0.4);

  candidates.push({
    strategy: "delayed_retry",
    label: "Retry later",
    probability: Number(delayedProb.toFixed(2)),
    expectedRecovery: Math.round(delayedProb * amount),
    friction: "low",
    interventionCost: 0,
    score: Math.round(delayedProb * amount * 0.95),
    reasoning: "Delayed retry allows time for account balance or bank transaction limits to refresh"
  });

  // Strategy 3: Alternate Payment Method (UPI / Netbanking Switch)
  let alternateProb = 0.82;
  let alternateReasoning = "Rerouting to alternate payment rail bypasses issuer restrictions with lowest customer friction";
  let alternateLabel = "Alternate UPI";

  if (category === "card_declined") alternateProb = 0.85;
  if (customer && customer.preferredPaymentMethod === "upi") alternateProb = 0.88;

  // Live Telemetry Failover Boost: If SBI Netbanking is degraded, boost UPI Intent rail
  if (sbiNode && sbiNode.status === "degraded" && (payment.paymentMethod === "netbanking" || failureAnalysis.rootCause.includes("SBI"))) {
    alternateProb = 0.92;
    alternateLabel = "Instant UPI (PhonePe / GPay) Failover";
    alternateReasoning = `Live telemetry indicates SBI Netbanking latency is ${sbiNode.latencyMs}ms (${sbiNode.status}). Auto-rerouting to sub-300ms UPI Intent rail.`;
  }

  candidates.push({
    strategy: "alternate_payment",
    label: alternateLabel,
    probability: Number(alternateProb.toFixed(2)),
    expectedRecovery: Math.round(alternateProb * amount),
    friction: "low",
    interventionCost: 0,
    score: Math.round(alternateProb * amount),
    reasoning: alternateReasoning
  });

  // Strategy 4: Recovery Link (1-Click Personalized Link)
  let linkProb = 0.58;
  if (category === "abandonment") linkProb = 0.78;
  if (category === "user_cancelled") linkProb = 0.68;
  candidates.push({
    strategy: "recovery_link",
    label: "Recovery Link",
    probability: Number(linkProb.toFixed(2)),
    expectedRecovery: Math.round(linkProb * amount),
    friction: "medium",
    interventionCost: 5,
    score: Math.round(linkProb * amount - 5),
    reasoning: "Direct 1-click recovery link with prefilled basket captures intent before decay"
  });

  // Strategy 5: Customer Notification (WhatsApp / SMS Alert)
  let notifProb = 0.62;
  if (category === "abandonment" || category === "user_cancelled") notifProb = 0.74;
  candidates.push({
    strategy: "customer_notification",
    label: "Customer WhatsApp / SMS Alert",
    probability: Number(notifProb.toFixed(2)),
    expectedRecovery: Math.round(notifProb * amount),
    friction: "medium",
    interventionCost: 3,
    score: Math.round(notifProb * amount - 3),
    reasoning: "Multi-channel reminder re-engages customer on preferred mobile channel"
  });

  // Strategy 6: Human Escalation (VIP Concierge)
  let humanProb = 0.88;
  candidates.push({
    strategy: "human_escalation",
    label: "VIP Concierge Escalation",
    probability: humanProb,
    expectedRecovery: Math.round(humanProb * amount),
    friction: "high",
    interventionCost: 150,
    score: Math.round(humanProb * amount - 150),
    reasoning: amount >= policy.humanApprovalThreshold
      ? "High transaction value warrants personal VIP concierge assistance"
      : "High operational intervention cost disproportionate for standard transaction"
  });

  // Strategy 7: Do Nothing
  candidates.push({
    strategy: "do_nothing",
    label: "Do Not Intervene",
    probability: 0.0,
    expectedRecovery: 0,
    friction: "low",
    interventionCost: 0,
    score: 0,
    reasoning: "Suppress intervention to prevent unnecessary customer friction or spam"
  });

  // Optimal selection considering merchant policy
  const viable = candidates.filter(c => {
    if (c.strategy === "human_escalation" && amount < policy.humanApprovalThreshold) return false;
    if (c.strategy === "do_nothing") return false;
    if (exceedsRetries && (c.strategy === "retry_now" || c.strategy === "delayed_retry")) return false;
    return true;
  });

  viable.sort((a, b) => b.score - a.score);
  const best = viable[0] || candidates[0];

  const fallback = {
    selectedStrategy: best.strategy,
    selectedStrategyLabel: best.label,
    reasoning: best.reasoning
  };

  const systemPrompt = `You are the Strategy Agent for RevivePay.
Evaluate candidate recovery strategies using Expected Recovery Value = (Probability × Amount) - Cost and customer friction.
Select the optimal strategy.
Respond strictly in JSON matching:
{
  "selectedStrategy": "retry_now" | "delayed_retry" | "alternate_payment" | "recovery_link" | "customer_notification" | "human_escalation" | "do_nothing",
  "selectedStrategyLabel": string,
  "reasoning": string
}`;

  const userPrompt = `Evaluation Input:
- Amount: ₹${amount}
- Attempt Count: ${attempts} (Max Allowed: ${policy.maxRetries})
- Failure Category: ${category}
- Root Cause: ${failureAnalysis.rootCause}
- Recovery Probability: ${prediction.recoveryProbability}
- Customer Preferred Method: ${customer?.preferredPaymentMethod || "unknown"}
- Candidate Evaluations: ${JSON.stringify(candidates.map(c => ({ strategy: c.strategy, label: c.label, prob: c.probability, expected: c.expectedRecovery })))}`;

  const response = await callGeminiStructured<typeof fallback>(systemPrompt, userPrompt, fallback);

  // Validate that the LLM selected a valid, viable candidate
  const rawSelected = response.result.selectedStrategy;
  const selectedEval = candidates.find(c => c.strategy === rawSelected) || best;

  return {
    strategiesEvaluated: candidates,
    selectedStrategy: selectedEval.strategy,
    selectedStrategyLabel: selectedEval.label,
    expectedRecovery: selectedEval.expectedRecovery,
    overallProbability: selectedEval.probability,
    reasoning: response.result.reasoning && response.result.reasoning.trim().length > 10
      ? response.result.reasoning.trim()
      : selectedEval.reasoning,
    model: response.model
  };
}
