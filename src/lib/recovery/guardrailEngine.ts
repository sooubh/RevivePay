import {
  GuardrailOutcome,
  MerchantPolicy,
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
  lastAttemptAt?: string | null;
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
      existingInterventionsCount = 0,
      lastAttemptAt
    } = input;

    const notes: string[] = [];

    // Rule 1: Cooldown Check
    if (lastAttemptAt && policy.cooldownMinutes > 0) {
      const elapsedMinutes = (Date.now() - new Date(lastAttemptAt).getTime()) / (1000 * 60);
      if (elapsedMinutes < policy.cooldownMinutes && (recommendedStrategy === "retry_now" || recommendedStrategy === "customer_notification")) {
        notes.push(`Action throttled: ${Math.round(policy.cooldownMinutes - elapsedMinutes)}m remaining in cooldown period.`);
        return {
          outcome: "MERCHANT_APPROVAL",
          allowed: false,
          notes,
          finalStrategy: "delayed_retry"
        };
      }
    }

    // Rule 2: Minimum Recovery Probability Check
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

    // Rule 3: Maximum Retry Limit Check (Graceful Strategy Fallback)
    let evaluatedStrategy = recommendedStrategy;
    if (attemptCount > policy.maxRetries && (recommendedStrategy === "retry_now" || recommendedStrategy === "delayed_retry")) {
      notes.push(`Attempt count (${attemptCount}) exceeds max retries (${policy.maxRetries}). Direct retries blocked; falling back to Alternate Payment.`);
      evaluatedStrategy = "alternate_payment";
    }

    // Rule 4: Customer Contact Limit Check
    if (existingInterventionsCount >= policy.maxCustomerMessages && (evaluatedStrategy === "recovery_link" || evaluatedStrategy === "customer_notification")) {
      notes.push(`Customer contact limit (${policy.maxCustomerMessages}) reached. Suppressing direct outreach.`);
      return {
        outcome: "DO_NOT_INTERVENE",
        allowed: false,
        notes,
        finalStrategy: "do_nothing"
      };
    }

    // Rule 5: Human Approval Threshold Check
    if (amount >= policy.humanApprovalThreshold) {
      notes.push(
        `Transaction amount (₹${amount.toLocaleString()}) meets or exceeds human approval threshold (₹${policy.humanApprovalThreshold.toLocaleString()}).`
      );
      return {
        outcome: "MERCHANT_APPROVAL",
        allowed: true,
        notes,
        finalStrategy: evaluatedStrategy
      };
    }

    // Rule 6: Strategy Auto-Execute Permission Check
    if (policy.autoExecuteStrategies.includes(evaluatedStrategy)) {
      notes.push(`Strategy "${evaluatedStrategy}" is approved for auto-execution within configured limits.`);
      notes.push(`Within retry limit (attempt ${attemptCount} <= ${policy.maxRetries}).`);
      notes.push(`Within auto threshold (₹${amount.toLocaleString()} < ₹${policy.humanApprovalThreshold.toLocaleString()}).`);

      return {
        outcome: "AUTO_EXECUTE",
        allowed: true,
        notes,
        finalStrategy: evaluatedStrategy
      };
    }

    // Default to Merchant Approval if not explicitly auto-executable
    notes.push(`Strategy "${evaluatedStrategy}" requires merchant approval by policy.`);
    return {
      outcome: "MERCHANT_APPROVAL",
      allowed: true,
      notes,
      finalStrategy: evaluatedStrategy
    };
  }

  /**
   * Validate recovery opportunity state transition matrix
   */
  public static isValidTransition(current: OpportunityStatus, next: OpportunityStatus): boolean {
    if (current === next) return true;
    const validTransitions: Record<OpportunityStatus, OpportunityStatus[]> = {
      failed: ["analyzing", "do_not_intervene"],
      analyzing: ["recovery_recommended", "auto_approved", "action_executed", "do_not_intervene", "human_escalation"],
      recovery_recommended: ["auto_approved", "merchant_approved", "action_executed", "recovered", "do_not_intervene", "human_escalation"],
      auto_approved: ["action_executed", "do_not_intervene", "recovered"],
      merchant_approved: ["action_executed", "recovered", "do_not_intervene"],
      action_executed: ["awaiting_outcome", "recovered", "failed_recovery", "do_not_intervene"],
      awaiting_outcome: ["recovered", "failed_recovery", "expired", "do_not_intervene"],
      recovered: [],
      do_not_intervene: ["recovery_recommended", "analyzing"],
      human_escalation: ["merchant_approved", "action_executed", "do_not_intervene", "recovered"],
      failed_recovery: ["recovery_recommended", "analyzing"],
      expired: []
    };

    const allowedNext = validTransitions[current] || [];
    return allowedNext.includes(next);
  }
}
