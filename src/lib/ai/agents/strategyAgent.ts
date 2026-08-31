import { callGeminiStructured } from "../gemini";
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

  // Build candidate strategy evaluations with expected value scoring
  const candidates: StrategyEvaluation[] = [];

  // Strategy 1: Retry Now
  let retryNowProb = 0.31;
  if (category === "temporary_technical") retryNowProb = 0.84;
  else if (category === "card_declined") retryNowProb = 0.31;
  else if (category === "abandonment") retryNowProb = 0.15;
  candidates.push({
    strategy: "retry_now",
    label: "Retry now",
    probability: retryNowProb,
    expectedRecovery: Math.round(retryNowProb * amount),
    friction: "low",
    interventionCost: 0,
    score: Math.round(retryNowProb * amount),
    reasoning: category === "temporary_technical"
      ? "Immediate retry recommended for transient gateway errors"
      : "Low probability of success for non-technical declines"
  });

  // Strategy 2: Delayed Retry
  let delayedProb = 0.61;
  if (category === "insufficient_funds") delayedProb = 0.68;
  else if (category === "temporary_technical") delayedProb = 0.72;
  candidates.push({
    strategy: "delayed_retry",
    label: "Retry later",
    probability: delayedProb,
    expectedRecovery: Math.round(delayedProb * amount),
    friction: "low",
    interventionCost: 0,
    score: Math.round(delayedProb * amount * 0.95), // slight discount for delay
    reasoning: "Delayed retry provides window for account balance or limit reset"
  });

  // Strategy 3: Alternate Payment Method (UPI)
  let alternateProb = 0.82;
  if (customer && customer.preferredPaymentMethod === "upi") alternateProb = 0.86;
  if (category === "card_declined") alternateProb = 0.82;
  candidates.push({
    strategy: "alternate_payment",
    label: "Alternate UPI",
    probability: alternateProb,
    expectedRecovery: Math.round(alternateProb * amount),
    friction: "low",
    interventionCost: 0,
    score: Math.round(alternateProb * amount),
    reasoning: "Higher estimated recovery with lower customer friction"
  });

  // Strategy 4: Recovery Link
  let linkProb = 0.58;
  if (category === "abandonment") linkProb = 0.76;
  candidates.push({
    strategy: "recovery_link",
    label: "Recovery Link",
    probability: linkProb,
    expectedRecovery: Math.round(linkProb * amount),
    friction: "medium",
    interventionCost: 5,
    score: Math.round(linkProb * amount - 5),
    reasoning: "Convenient 1-click checkout recovery link sent to customer"
  });

  // Strategy 5: Human Escalation (for high value)
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
      ? "High transaction value warrants personal assistance"
      : "Intervention friction disproportionate for standard transaction"
  });

  // Strategy 6: Do Nothing (low probability or low value)
  candidates.push({
    strategy: "do_nothing",
    label: "Do Not Intervene",
    probability: 0.0,
    expectedRecovery: 0,
    friction: "low",
    interventionCost: 0,
    score: 0,
    reasoning: "Leave transaction alone to prevent unnecessary customer friction"
  });

  // Select optimal candidate
  // Filter out human_escalation unless amount >= humanApprovalThreshold
  const viable = candidates.filter(c => {
    if (c.strategy === "human_escalation" && amount < policy.humanApprovalThreshold) return false;
    if (c.strategy === "do_nothing") return false;
    return true;
  });

  viable.sort((a, b) => b.score - a.score);
  const best = viable[0] || candidates[0];

  const fallback: {
    selectedStrategy: RecoveryStrategyType;
    selectedStrategyLabel: string;
    reasoning: string;
  } = {
    selectedStrategy: best.strategy,
    selectedStrategyLabel: best.label,
    reasoning: best.reasoning
  };

  const systemPrompt = `You are the Strategy Agent for RevivePay.
Evaluate candidate recovery strategies based on expected recovery value (Probability × Amount), friction, and customer profile.
Select the optimal strategy.
Respond with strict JSON matching:
{
  "selectedStrategy": "retry_now" | "delayed_retry" | "alternate_payment" | "recovery_link" | "customer_notification" | "human_escalation" | "do_nothing",
  "selectedStrategyLabel": string,
  "reasoning": string
}`;

  const userPrompt = `Evaluation Input:
- Amount: ₹${amount}
- Failure Category: ${category}
- Root Cause: ${failureAnalysis.rootCause}
- Recovery Probability: ${prediction.recoveryProbability}
- Customer Preferred Method: ${customer?.preferredPaymentMethod || "unknown"}
- Candidate Strategies: ${JSON.stringify(candidates.map(c => ({ strategy: c.strategy, label: c.label, prob: c.probability, expected: c.expectedRecovery })))}`;

  const response = await callGeminiStructured<{
    selectedStrategy: RecoveryStrategyType;
    selectedStrategyLabel: string;
    reasoning: string;
  }>(systemPrompt, userPrompt, fallback);

  const selectedStrategy = response.result.selectedStrategy || best.strategy;
  const selectedEval = candidates.find(c => c.strategy === selectedStrategy) || best;

  return {
    strategiesEvaluated: candidates,
    selectedStrategy: selectedEval.strategy,
    selectedStrategyLabel: selectedEval.label,
    expectedRecovery: selectedEval.expectedRecovery,
    overallProbability: selectedEval.probability,
    reasoning: response.result.reasoning || selectedEval.reasoning,
    model: response.model
  };
}
