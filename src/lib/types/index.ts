export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet';

export type PaymentStatus = 'pending' | 'captured' | 'failed' | 'refunded';

export type OpportunityStatus =
  | 'failed'
  | 'analyzing'
  | 'recovery_recommended'
  | 'auto_approved'
  | 'merchant_approved'
  | 'action_executed'
  | 'awaiting_outcome'
  | 'recovered'
  | 'do_not_intervene'
  | 'human_escalation'
  | 'failed_recovery'
  | 'expired';

export type RecoveryStrategyType =
  | 'retry_now'
  | 'delayed_retry'
  | 'alternate_payment'
  | 'recovery_link'
  | 'customer_notification'
  | 'human_escalation'
  | 'do_nothing';

export type GuardrailOutcome =
  | 'AUTO_EXECUTE'
  | 'MERCHANT_APPROVAL'
  | 'CUSTOMER_ACTION'
  | 'DO_NOT_INTERVENE'
  | 'HUMAN_ESCALATION';

export interface Merchant {
  merchantId: string;
  name: string;
  storeName: string;
  razorpayConnected: boolean;
  createdAt: string;
  settings: {
    currency: string;
    autoRecoveryEnabled: boolean;
  };
}

export interface Customer {
  customerId: string; // Format: CUS-XXXXXX
  name: string;
  email?: string;
  phone?: string;
  shoeSize: string;
  totalSpend: number;
  successfulPayments: number;
  failedPayments: number;
  preferredPaymentMethod: PaymentMethod;
  recoveryHistory: {
    opportunityId: string;
    strategy: RecoveryStrategyType;
    recovered: boolean;
    amount: number;
    date: string;
  }[];
  createdAt: string;
  lastSeenAt: string;
}

export interface Product {
  productId: string;
  name: string;
  brand: string;
  price: number; // in INR (e.g. 4999)
  originalPrice?: number;
  imageUrl: string;
  thumbnails?: string[];
  sizes: string[];
  category: 'Running' | 'Lifestyle' | 'Basketball' | 'Training';
  badge?: 'New' | 'Hot' | '-35%' | 'Trending';
  rating: number;
  reviewCount: number;
  description: string;
  colors?: { name: string; hex: string }[];
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  brand: string;
  price: number;
  size: string;
  color?: string;
  quantity: number;
  imageUrl: string;
}

export interface Order {
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'failed' | 'recovered' | 'cancelled';
  razorpayOrderId?: string;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address: string;
    apartment?: string;
    city: string;
    state?: string;
    zipcode: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  paymentId: string;
  orderId: string;
  customerId: string;
  amount: number; // In INR
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  failureCode?: string;
  failureReason?: string;
  attemptNumber: number;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyEvaluation {
  strategy: RecoveryStrategyType;
  label: string;
  probability: number; // 0.00 to 1.00
  expectedRecovery: number; // probability * amount
  friction: 'low' | 'medium' | 'high';
  interventionCost: number;
  score: number;
  reasoning: string;
}

export interface FailureAnalysisResult {
  failureCategory: 'temporary_technical' | 'insufficient_funds' | 'card_declined' | 'abandonment' | 'user_cancelled' | 'network_timeout';
  isRecoverable: boolean;
  rootCause: string;
  customerRiskProfile: 'low' | 'medium' | 'high';
  suggestedFocus: string;
}

export interface RecoveryPredictionResult {
  recoveryProbability: number; // e.g. 0.84
  confidence: number; // e.g. 0.91
  reasoning: string;
  keyDrivers: string[];
}

/**
 * RecoveryDecision represents the AI multi-agent diagnostic & evaluation output.
 * Architecture Note: Intentionally embedded within `RecoveryOpportunity.decision` in Firestore
 * (1:1 atomic coupling; avoids redundant network reads and prevents orphaned records).
 */
export interface RecoveryDecision {
  decisionId: string;
  opportunityId: string;
  failureAnalysis: FailureAnalysisResult;
  prediction: RecoveryPredictionResult;
  strategiesEvaluated: StrategyEvaluation[];
  selectedStrategy: RecoveryStrategyType;
  selectedStrategyLabel: string;
  recoveryProbability: number;
  expectedRecovery: number;
  recommendationReason: string;
  guardrailOutcome: GuardrailOutcome;
  guardrailNotes: string[];
  model: string;
  createdAt: string;
}

export interface RecoveryOpportunity {
  opportunityId: string;
  paymentId: string;
  orderId: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  amount: number;
  currency: string;
  sourceType: 'razorpay_failure' | 'checkout_abandonment' | 'subscription_failure';
  paymentMethod: PaymentMethod;
  failureType: string;
  attemptCount: number;
  status: OpportunityStatus;
  priority: 'High Priority' | 'Medium Priority' | 'Low Priority';
  recoveryProbability: number; // 0.00 - 1.00
  expectedRecovery: number;
  recommendedAction: string;
  recommendationReason: string;
  selectedStrategy: RecoveryStrategyType;
  decision?: RecoveryDecision;
  customerRecoveryUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryAction {
  actionId: string;
  opportunityId: string;
  type: RecoveryStrategyType;
  status: 'pending' | 'approved' | 'executed' | 'failed' | 'cancelled';
  requestedAt: string;
  executedAt?: string;
  executionReference?: string;
  recoveryLink?: string;
  error?: string;
}

export interface RecoveryOutcome {
  outcomeId: string;
  opportunityId: string;
  actionId?: string;
  paymentId?: string;
  successful: boolean;
  originalAmount: number;
  amountRecovered: number;
  timeToRecoverySeconds?: number;
  customerFriction: 'low' | 'medium' | 'high';
  recoveredPaymentMethod?: PaymentMethod;
  createdAt: string;
}

export interface AuditLog {
  auditId: string;
  opportunityId?: string;
  paymentId?: string;
  orderId?: string;
  actorType: 'SYSTEM' | 'AI_AGENT' | 'GUARDRAIL_ENGINE' | 'MERCHANT' | 'CUSTOMER';
  agentName?: 'FailureAnalyst' | 'RecoveryPredictor' | 'StrategyAgent' | 'RecoveryExplainer' | 'RecoveryOrchestrator';
  eventType:
    | 'PAYMENT_SUCCEEDED'
    | 'PAYMENT_FAILED'
    | 'CONTEXT_ANALYZED'
    | 'RECOVERY_PROBABILITY_ESTIMATED'
    | 'STRATEGIES_EVALUATED'
    | 'GUARDRAIL_EVALUATED'
    | 'RECOVERY_ACTION_TRIGGERED'
    | 'CUSTOMER_RECOVERY_STARTED'
    | 'PAYMENT_RECOVERED'
    | 'RECOVERY_ABORTED'
    | 'MANUAL_APPROVAL_GRANTED';
  message: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface MerchantPolicy {
  merchantId: string;
  maxRetries: number; // default 2
  maxCustomerMessages: number; // default 1
  humanApprovalThreshold: number; // default ?20,000
  minimumRecoveryProbability: number; // default 0.20 (20%)
  cooldownMinutes: number; // default 15
  autoExecuteStrategies: RecoveryStrategyType[];
  updatedAt: string;
}

export interface OverviewMetrics {
  revenueAtRisk: number;
  aiRecovered: number;
  recoveryRate: number;
  incrementalRevenue: number;
  activeOpportunitiesCount: number;
  pendingActionCount: number;
  totalTransactions: number;
  monthlyTrend: {
    month: string;
    atRisk: number;
    recovered: number;
  }[];
  paymentMethodBreakdown: {
    method: string;
    recovered: number;
    count: number;
  }[];
}
