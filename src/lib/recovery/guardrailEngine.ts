import {
  GuardrailOutcome,
  MerchantPolicy,
  Payment,
  RecoveryOpportunity,
  RecoveryStrategyType,
  OpportunityStatus
} from "@/lib/types";

export interface GuardrailCheckInput {
  amount: number;
  attemptCount: number;
  recoveryProbability: number;
  recommendedStrategy: RecoveryStrategyType;
  policy: MerchantPolicy;
  opportunity?: RecoveryOpportunity | null;
  existingInterventionsCount?: number;
}

export interface GuardrailCheckResult {
  outcome: GuardrailOutcome;
  allowed: boolean;
  notes: string[];
  finalStrategy: RecoveryStrategyType;
}

/**
 * Deterministic Guardrail Engine (Zero LLM Dependency)
 * Validates AI recommendations against merchant policies and stopping rules.
 */
export class GuardrailEngine {
  public static evaluate(input: GuardrailCheckInput): GuardrailCheckResult {
    const {
      amount,
      attemptCount,
      recoveryProbability,
      recommendedStrategy,
      policy,
      existingInterventionsCount = 0
    } = input;

    const notes: string[] = [];

    // Rule 1: Minimum Recovery Probability Check
    if (recoveryProbability < policy.minimumRecoveryProbability) {
      notes.push(
        `Recovery probability (${Math.round(recoveryProbability * 100)}%) is below minimum threshold (${Math.round(policy.minimumRecoveryProbability * 100)}%).`
      );
      return {
        outcome: "DO_NOT_INTERVENE",
        allowed: false,
        notes,
        finalStrategy: "do_nothing"
      };
    }

    // Rule 2: Maximum Retry Limit Check
    if (attemptCount > policy.maxRetries && (recommendedStrategy === "retry_now" || recommendedStrategy === "delayed_retry")) {
      notes.push(
        `Attempt count (${attemptCount}) exceeds maximum automated retries (${policy.maxRetries}). Direct retries blocked.`
      );
      return {
        outcome: "DO_NOT_INTERVENE",
        allowed: false,
        notes,
        finalStrategy: "do_nothing"
      };
    }

    // Rule 3: Customer Intervention / Contact Limit Check
    if (existingInterventionsCount >= policy.maxCustomerMessages && (recommendedStrategy === "recovery_link" || recommendedStrategy === "customer_notification")) {
      notes.push(
        `Customer contact limit (${policy.maxCustomerMessages}) reached. Further customer messaging suppressed.`
      );
      return {
        outcome: "DO_NOT_INTERVENE",
        allowed: false,
        notes,
        finalStrategy: "do_nothing"
      };
    }

    // Rule 4: High Value / Human Approval Threshold Check
    if (amount >= policy.humanApprovalThreshold) {
      notes.push(
        `Transaction amount (₹${amount.toLocaleString()}) meets or exceeds human approval threshold (₹${policy.humanApprovalThreshold.toLocaleString()}).`
      );
      return {
        outcome: "MERCHANT_APPROVAL",
        allowed: true,
        notes,
        finalStrategy: recommendedStrategy
      };
    }

    // Rule 5: Strategy Auto-Execute Permission Check
    if (policy.autoExecuteStrategies.includes(recommendedStrategy)) {
      notes.push(
        `Strategy "${recommendedStrategy}" is approved for auto-execution within configured limits.`
      );
      notes.push(`Within retry limit (attempt ${attemptCount} <= ${policy.maxRetries}).`);
      notes.push(`Within auto threshold (₹${amount.toLocaleString()} < ₹${policy.humanApprovalThreshold.toLocaleString()}).`);

      return {
        outcome: "AUTO_EXECUTE",
        allowed: true,
        notes,
        finalStrategy: recommendedStrategy
      };
    }

    // Default to Merchant Approval if not explicitly auto-executable
    notes.push(`Strategy "${recommendedStrategy}" requires merchant approval by policy.`);
    return {
      outcome: "MERCHANT_APPROVAL",
      allowed: true,
      notes,
      finalStrategy: recommendedStrategy
    };
  }

  /**
   * Validate recovery opportunity state transition
   */
  public static isValidTransition(current: OpportunityStatus, next: OpportunityStatus): boolean {
    const validTransitions: Record<OpportunityStatus, OpportunityStatus[]> = {
      failed: ["analyzing", "do_not_intervene"],
      analyzing: ["recovery_recommended", "do_not_intervene", "human_escalation"],
      recovery_recommended: ["auto_approved", "merchant_approved", "action_executed", "do_not_intervene", "human_escalation"],
      auto_approved: ["action_executed", "do_not_intervene"],
      merchant_approved: ["action_executed", "do_not_intervene"],
      action_executed: ["awaiting_outcome", "recovered", "failed_recovery"],
      awaiting_outcome: ["recovered", "failed_recovery", "expired"],
      recovered: [],
      do_not_intervene: ["recovery_recommended"], // allow manual reconsideration
      human_escalation: ["merchant_approved", "action_executed", "do_not_intervene"],
      failed_recovery: ["recovery_recommended"], // allow re-attempt within limits
      expired: []
    };

    const allowedNext = validTransitions[current] || [];
    return allowedNext.includes(next);
  }
}
