import { dbService } from "@/lib/firebase/db";
import { runFailureAnalyst } from "@/lib/ai/agents/failureAnalyst";
import { runRecoveryPredictor } from "@/lib/ai/agents/recoveryPredictor";
import { runStrategyAgent } from "@/lib/ai/agents/strategyAgent";
import { runRecoveryExplainer } from "@/lib/ai/agents/recoveryExplainer";
import { GuardrailEngine } from "./guardrailEngine";
import {
  Payment,
  Order,
  Customer,
  RecoveryOpportunity,
  RecoveryDecision,
  RecoveryAction,
  RecoveryOutcome,
  OpportunityStatus
} from "@/lib/types";

export interface IngestEventInput {
  payment: Payment;
  order?: Order | null;
  customer?: Customer | null;
  sourceType?: 'razorpay_failure' | 'checkout_abandonment' | 'subscription_failure';
  failureCode?: string;
  failureReason?: string;
}

export class RecoveryOrchestrator {
  /**
   * Process a revenue event through the complete multi-agent AI recovery pipeline.
   */
  public static async processPaymentFailure(input: IngestEventInput): Promise<RecoveryOpportunity> {
    const { payment, order, customer, sourceType = "razorpay_failure", failureCode, failureReason } = input;
    const policy = await dbService.getMerchantPolicy();

    const paymentIdClean = payment.paymentId.replace(/^(pay_|PAY_)/, '').replace(/[^a-zA-Z0-9]/g, '');
    const cleanSuffix = paymentIdClean.length >= 6 
      ? paymentIdClean.slice(-8).toUpperCase()
      : `${paymentIdClean.toUpperCase() || 'TXN'}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const opportunityId = `TXN-${cleanSuffix}`;

    // Track customer failed payment count
    if (payment.customerId) {
      const cust = customer || (await dbService.getCustomerById(payment.customerId));
      if (cust) {
        cust.failedPayments = (cust.failedPayments || 0) + 1;
        cust.lastSeenAt = new Date().toISOString();
        await dbService.createCustomer(cust);
      }
    }

    // 1. Initial State: Create Opportunity in 'analyzing' state
    const priority = payment.amount >= 10000 ? "High Priority" : "Medium Priority";

    let opportunity: RecoveryOpportunity = {
      opportunityId,
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      customerId: payment.customerId,
      customerName: customer?.name || order?.customerName || "Customer",
      customerEmail: customer?.email || order?.customerEmail || "customer@example.com",
      amount: payment.amount,
      currency: payment.currency || "INR",
      sourceType,
      paymentMethod: payment.paymentMethod,
      failureType: failureReason || payment.failureReason || "Payment Failed",
      attemptCount: payment.attemptNumber || 1,
      status: "analyzing",
      priority,
      recoveryProbability: 0.5,
      expectedRecovery: Math.round(payment.amount * 0.5),
      recommendedAction: "Analyzing...",
      recommendationReason: "Running AI diagnosis pipeline...",
      selectedStrategy: "retry_now",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbService.createRecoveryOpportunity(opportunity);

    // Audit Event 1: Payment Failed
    await dbService.addAuditLog({
      opportunityId,
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      actorType: "SYSTEM",
      eventType: "PAYMENT_FAILED",
      message: `Payment failed — ₹${payment.amount.toLocaleString()}.00 (${opportunity.failureType})`,
      metadata: { amount: payment.amount, method: payment.paymentMethod, failureReason }
    });

    try {
      // 2. AGENT 1: Failure Analyst
      const { analysis, model: analystModel } = await runFailureAnalyst({
        payment,
        order,
        customer,
        failureCode,
        failureReason
      });

      await dbService.addAuditLog({
        opportunityId,
        actorType: "AI_AGENT",
        agentName: "FailureAnalyst",
        eventType: "CONTEXT_ANALYZED",
        message: `Context analyzed: ${analysis.rootCause}`,
        metadata: { failureCategory: analysis.failureCategory, risk: analysis.customerRiskProfile, model: analystModel }
      });

      // 3. AGENT 2: Recovery Predictor
      const { prediction, model: predictorModel } = await runRecoveryPredictor({
        failureAnalysis: analysis,
        payment,
        customer,
        policy
      });

      await dbService.addAuditLog({
        opportunityId,
        actorType: "AI_AGENT",
        agentName: "RecoveryPredictor",
        eventType: "RECOVERY_PROBABILITY_ESTIMATED",
        message: `Recovery probability estimated: ${Math.round(prediction.recoveryProbability * 100)}% (Confidence: ${Math.round(prediction.confidence * 100)}%)`,
        metadata: { probability: prediction.recoveryProbability, confidence: prediction.confidence, model: predictorModel }
      });

      // 4. AGENT 3: Strategy Agent
      const strategyResult = await runStrategyAgent({
        failureAnalysis: analysis,
        prediction,
        payment,
        customer,
        policy
      });

      await dbService.addAuditLog({
        opportunityId,
        actorType: "AI_AGENT",
        agentName: "StrategyAgent",
        eventType: "STRATEGIES_EVALUATED",
        message: `Strategies evaluated: ${strategyResult.selectedStrategyLabel} selected (Expected recovery: ₹${strategyResult.expectedRecovery.toLocaleString()}.00)`,
        metadata: {
          selectedStrategy: strategyResult.selectedStrategy,
          evaluatedCount: strategyResult.strategiesEvaluated.length,
          model: strategyResult.model
        }
      });

      // 5. DETERMINISTIC GUARDRAIL ENGINE (Zero LLM)
      const guardrailResult = GuardrailEngine.evaluate({
        amount: payment.amount,
        attemptCount: payment.attemptNumber,
        recoveryProbability: strategyResult.overallProbability,
        recommendedStrategy: strategyResult.selectedStrategy,
        policy,
        opportunity
      });

      await dbService.addAuditLog({
        opportunityId,
        actorType: "GUARDRAIL_ENGINE",
        eventType: "GUARDRAIL_EVALUATED",
        message: `Guardrail verified: Outcome ${guardrailResult.outcome}. ${guardrailResult.notes[0] || ""}`,
        metadata: { outcome: guardrailResult.outcome, notes: guardrailResult.notes }
      });

      // 6. AGENT 4: Recovery Explainer
      const { explanation, model: explainerModel } = await runRecoveryExplainer({
        selectedStrategy: guardrailResult.finalStrategy,
        selectedStrategyLabel: strategyResult.selectedStrategyLabel,
        failureAnalysis: analysis,
        prediction,
        payment,
        customer
      });

      // 7. Assemble Structured Decision
      const decision: RecoveryDecision = {
        decisionId: `DEC-${opportunityId}`,
        opportunityId,
        failureAnalysis: analysis,
        prediction,
        strategiesEvaluated: strategyResult.strategiesEvaluated,
        selectedStrategy: guardrailResult.finalStrategy,
        selectedStrategyLabel: strategyResult.selectedStrategyLabel,
        recoveryProbability: strategyResult.overallProbability,
        expectedRecovery: strategyResult.expectedRecovery,
        recommendationReason: explanation,
        guardrailOutcome: guardrailResult.outcome,
        guardrailNotes: guardrailResult.notes,
        model: analystModel || "gemini-2.5-flash",
        createdAt: new Date().toISOString()
      };

      await dbService.createRecoveryDecision(decision);

      // Determine new status based on guardrail outcome
      let nextStatus: OpportunityStatus = "recovery_recommended";
      if (guardrailResult.outcome === "AUTO_EXECUTE") {
        nextStatus = "action_executed";
      } else if (guardrailResult.outcome === "DO_NOT_INTERVENE") {
        nextStatus = "do_not_intervene";
      } else if (guardrailResult.outcome === "HUMAN_ESCALATION") {
        nextStatus = "human_escalation";
      }

      // Update Opportunity
      const updatedOpp: RecoveryOpportunity = {
        ...opportunity,
        status: nextStatus,
        recoveryProbability: strategyResult.overallProbability,
        expectedRecovery: strategyResult.expectedRecovery,
        recommendedAction: strategyResult.selectedStrategyLabel,
        recommendationReason: explanation,
        selectedStrategy: guardrailResult.finalStrategy,
        decision,
        customerRecoveryUrl: `/store/payment?oppId=${opportunityId}&orderId=${payment.orderId}`,
        updatedAt: new Date().toISOString()
      };

      await dbService.updateRecoveryOpportunity(opportunityId, updatedOpp);

      // 8. If Auto-Executed, trigger Recovery Action Record
      if (guardrailResult.outcome === "AUTO_EXECUTE") {
        const action: RecoveryAction = {
          actionId: `ACT-${opportunityId}`,
          opportunityId,
          type: guardrailResult.finalStrategy,
          status: "executed",
          requestedAt: new Date().toISOString(),
          executedAt: new Date().toISOString(),
          executionReference: `REF-${Date.now()}`
        };
        await dbService.createRecoveryAction(action);

        await dbService.addAuditLog({
          opportunityId,
          actorType: "SYSTEM",
          eventType: "RECOVERY_ACTION_TRIGGERED",
          message: `Action executed: ${strategyResult.selectedStrategyLabel} initiated for customer.`,
          metadata: { strategy: guardrailResult.finalStrategy, actionId: action.actionId }
        });
      }

      return updatedOpp;
    } catch (error) {
      console.error("Error in recovery orchestrator:", error);
      // Fall back safely to safe status
      const fallbackOpp = await dbService.updateRecoveryOpportunity(opportunityId, {
        status: "recovery_recommended",
        recommendedAction: "Alternate UPI Payment",
        recommendationReason: "Higher estimated recovery with lower customer friction.",
        selectedStrategy: "alternate_payment",
        recoveryProbability: 0.82,
        expectedRecovery: Math.round(payment.amount * 0.82)
      });
      return fallbackOpp || opportunity;
    }
  }

  /**
   * Process customer completion / recovery success
   */
  public static async processRecoverySuccess(opportunityId: string, recoveredPaymentMethod: string = "upi"): Promise<RecoveryOpportunity | null> {
    const opp = await dbService.getRecoveryOpportunityById(opportunityId);
    if (!opp) return null;

    // Idempotency guard: If already recovered, return existing opportunity immediately without double-counting stats
    if (opp.status === "recovered") {
      return opp;
    }

    // Update Opportunity Status to recovered
    const updatedOpp = await dbService.updateRecoveryOpportunity(opportunityId, {
      status: "recovered",
      updatedAt: new Date().toISOString()
    });

    // Update Order to recovered / paid
    if (opp.orderId) {
      await dbService.updateOrder(opp.orderId, { status: "recovered" });
    }

    // Create Recovery Outcome
    const outcome: RecoveryOutcome = {
      outcomeId: `OUT-${opportunityId}`,
      opportunityId,
      successful: true,
      originalAmount: opp.amount,
      amountRecovered: opp.amount,
      timeToRecoverySeconds: Math.floor((Date.now() - new Date(opp.createdAt).getTime()) / 1000),
      customerFriction: "low",
      recoveredPaymentMethod: recoveredPaymentMethod as any,
      createdAt: new Date().toISOString()
    };
    await dbService.createRecoveryOutcome(outcome);

    // Update Customer Profile
    if (opp.customerId) {
      const cust = await dbService.getCustomerById(opp.customerId);
      if (cust) {
        cust.successfulPayments += 1;
        cust.totalSpend += opp.amount;
        cust.recoveryHistory.push({
          opportunityId,
          strategy: opp.selectedStrategy,
          recovered: true,
          amount: opp.amount,
          date: new Date().toISOString()
        });
        await dbService.createCustomer(cust);
      }
    }

    // Audit Log: Payment Recovered
    await dbService.addAuditLog({
      opportunityId,
      orderId: opp.orderId,
      actorType: "CUSTOMER",
      eventType: "PAYMENT_RECOVERED",
      message: `Payment recovered — ₹${opp.amount.toLocaleString()}.00 via ${recoveredPaymentMethod.toUpperCase()}`,
      metadata: { amountRecovered: opp.amount, method: recoveredPaymentMethod, timeToRecovery: outcome.timeToRecoverySeconds }
    });

    return updatedOpp || opp;
  }
}
