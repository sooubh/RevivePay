import { store } from "./store";
import {
  Customer,
  Product,
  Order,
  Payment,
  RecoveryOpportunity,
  RecoveryDecision,
  RecoveryAction,
  RecoveryOutcome,
  AuditLog,
  MerchantPolicy,
  OverviewMetrics
} from "@/lib/types";

// Unified Data Access Layer
export const dbService = {
  // Products
  getProducts: async (): Promise<Product[]> => {
    return store.getProducts();
  },

  getProductById: async (id: string): Promise<Product | null> => {
    return store.getProductById(id) || null;
  },

  // Customers
  getCustomerById: async (id: string): Promise<Customer | null> => {
    return store.getCustomer(id) || null;
  },

  createCustomer: async (customer: Customer): Promise<Customer> => {
    return store.setCustomer(customer);
  },

  // Orders
  createOrder: async (order: Order): Promise<Order> => {
    return store.createOrder(order);
  },

  getOrderById: async (id: string): Promise<Order | null> => {
    return store.getOrder(id) || null;
  },

  updateOrder: async (id: string, updates: Partial<Order>): Promise<Order | null> => {
    return store.updateOrder(id, updates) || null;
  },

  // Payments
  createPayment: async (payment: Payment): Promise<Payment> => {
    return store.createPayment(payment);
  },

  getPaymentById: async (id: string): Promise<Payment | null> => {
    return store.getPayment(id) || null;
  },

  updatePayment: async (id: string, updates: Partial<Payment>): Promise<Payment | null> => {
    return store.updatePayment(id, updates) || null;
  },

  // Recovery Opportunities
  getRecoveryOpportunities: async (): Promise<RecoveryOpportunity[]> => {
    return store.getRecoveryOpportunities();
  },

  getRecoveryOpportunityById: async (id: string): Promise<RecoveryOpportunity | null> => {
    return store.getRecoveryOpportunity(id) || null;
  },

  createRecoveryOpportunity: async (opp: RecoveryOpportunity): Promise<RecoveryOpportunity> => {
    return store.setRecoveryOpportunity(opp);
  },

  updateRecoveryOpportunity: async (id: string, updates: Partial<RecoveryOpportunity>): Promise<RecoveryOpportunity | null> => {
    return store.updateRecoveryOpportunity(id, updates) || null;
  },

  // Decisions & Actions
  createRecoveryDecision: async (decision: RecoveryDecision): Promise<RecoveryDecision> => {
    return store.setRecoveryDecision(decision);
  },

  getRecoveryDecisionById: async (id: string): Promise<RecoveryDecision | null> => {
    return store.getRecoveryDecision(id) || null;
  },

  createRecoveryAction: async (action: RecoveryAction): Promise<RecoveryAction> => {
    return store.setRecoveryAction(action);
  },

  createRecoveryOutcome: async (outcome: RecoveryOutcome): Promise<RecoveryOutcome> => {
    return store.setRecoveryOutcome(outcome);
  },

  // Audit Logs
  addAuditLog: async (log: Omit<AuditLog, "auditId" | "createdAt">): Promise<AuditLog> => {
    return store.addAuditLog(log);
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    return store.getAuditLogs();
  },

  // Policy
  getMerchantPolicy: async (): Promise<MerchantPolicy> => {
    return store.getMerchantPolicy();
  },

  updateMerchantPolicy: async (updates: Partial<MerchantPolicy>): Promise<MerchantPolicy> => {
    return store.updateMerchantPolicy(updates);
  },

  // Metrics
  getOverviewMetrics: async (): Promise<OverviewMetrics> => {
    return store.getOverviewMetrics();
  },

  // Realtime Subscriptions
  subscribeOpportunities: (cb: (data: RecoveryOpportunity[]) => void) => {
    return store.subscribeOpportunities(cb);
  },

  subscribeOpportunityById: (id: string, cb: (data: RecoveryOpportunity | null) => void) => {
    return store.subscribeOpportunityById(id, cb);
  },

  subscribeAuditLogs: (cb: (data: AuditLog[]) => void) => {
    return store.subscribeAuditLogs(cb);
  },

  subscribeMetrics: (cb: (data: OverviewMetrics) => void) => {
    return store.subscribeMetrics(cb);
  }
};
