import { store } from "./store";
import { firestoreSync } from "./firestoreSync";
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
  OverviewMetrics,
  DispatchedMessage
} from "@/lib/types";

// Unified Data Access Layer (Local Store + Live Cloud Firestore)
export const dbService = {
  // Products
  getProducts: async (): Promise<Product[]> => {
    const local = store.getProducts();
    if (local && local.length > 0) {
      return local;
    }
    const remote = await firestoreSync.getProducts();
    if (remote && remote.length > 0) {
      remote.forEach(p => store.setProduct(p));
      return store.getProducts();
    }
    // If remote is empty, seed defaults to Firestore asynchronously
    const defaults = store.getProducts();
    if (defaults.length > 0) {
      firestoreSync.saveProducts(defaults).catch(() => {});
    }
    return defaults;
  },

  getProductById: async (id: string): Promise<Product | null> => {
    const local = store.getProductById(id);
    if (local) return local;
    const remote = await firestoreSync.getProduct(id);
    if (remote) {
      store.setProduct(remote);
      return remote;
    }
    return null;
  },

  // Customers
  getCustomerById: async (id: string): Promise<Customer | null> => {
    const local = store.getCustomer(id);
    if (local) return local;
    const remote = await firestoreSync.getCustomer(id);
    if (remote) {
      store.setCustomer(remote);
      return remote;
    }
    return null;
  },

  createCustomer: async (customer: Customer): Promise<Customer> => {
    const res = store.setCustomer(customer);
    firestoreSync.saveCustomer(customer).catch(() => {});
    return res;
  },

  // Orders
  createOrder: async (order: Order): Promise<Order> => {
    const res = store.createOrder(order);
    firestoreSync.saveOrder(order).catch(() => {});
    return res;
  },

  getOrderById: async (id: string): Promise<Order | null> => {
    const local = store.getOrder(id);
    if (local) return local;
    const remote = await firestoreSync.getOrder(id);
    if (remote) {
      store.createOrder(remote);
      return remote;
    }
    return null;
  },

  updateOrder: async (id: string, updates: Partial<Order>): Promise<Order | null> => {
    const res = store.updateOrder(id, updates) || null;
    if (res) {
      firestoreSync.saveOrder(res).catch(() => {});
      return res;
    }
    // If not in local memory on cold start, fetch from Firestore, update, and persist
    const remote = await firestoreSync.getOrder(id);
    if (remote) {
      const updated = { ...remote, ...updates, updatedAt: new Date().toISOString() };
      store.createOrder(updated);
      firestoreSync.saveOrder(updated).catch(() => {});
      return updated;
    }
    return null;
  },

  // Payments
  createPayment: async (payment: Payment): Promise<Payment> => {
    const res = store.createPayment(payment);
    firestoreSync.savePayment(res).catch(() => {});
    return res;
  },

  getPaymentById: async (id: string): Promise<Payment | null> => {
    const local = store.getPayment(id);
    if (local) return local;
    const remote = await firestoreSync.getPayment(id);
    if (remote) {
      store.createPayment(remote);
      return remote;
    }
    return null;
  },

  updatePayment: async (id: string, updates: Partial<Payment>): Promise<Payment | null> => {
    const res = store.updatePayment(id, updates) || null;
    if (res) {
      firestoreSync.savePayment(res).catch(() => {});
      return res;
    }
    const remote = await firestoreSync.getPayment(id);
    if (remote) {
      const updated = { ...remote, ...updates, updatedAt: new Date().toISOString() };
      store.createPayment(updated);
      firestoreSync.savePayment(updated).catch(() => {});
      return updated;
    }
    return null;
  },

  // Recovery Opportunities
  getRecoveryOpportunities: async (): Promise<RecoveryOpportunity[]> => {
    const remote = await firestoreSync.getOpportunities();
    if (remote && remote.length > 0) {
      remote.forEach(o => store.setRecoveryOpportunity(o));
      return store.getRecoveryOpportunities();
    }
    return store.getRecoveryOpportunities();
  },

  getRecoveryOpportunityById: async (id: string): Promise<RecoveryOpportunity | null> => {
    const local = store.getRecoveryOpportunity(id);
    if (local) return local;
    const remote = await firestoreSync.getOpportunity(id);
    if (remote) {
      store.setRecoveryOpportunity(remote);
      return remote;
    }
    return null;
  },

  getRecoveryOpportunityByPaymentId: async (paymentId: string): Promise<RecoveryOpportunity | null> => {
    // Check in-memory store
    const localOpps = store.getRecoveryOpportunities();
    const local = localOpps.find(o => o.paymentId === paymentId);
    if (local) return local;
    // Check Firestore
    const remote = await firestoreSync.getOpportunityByPaymentId(paymentId);
    if (remote) {
      store.setRecoveryOpportunity(remote);
      return remote;
    }
    return null;
  },

  createRecoveryOpportunity: async (opp: RecoveryOpportunity): Promise<RecoveryOpportunity> => {
    const res = store.setRecoveryOpportunity(opp);
    firestoreSync.saveOpportunity(opp).catch(() => {});
    return res;
  },

  updateRecoveryOpportunity: async (id: string, updates: Partial<RecoveryOpportunity>): Promise<RecoveryOpportunity | null> => {
    const res = store.updateRecoveryOpportunity(id, updates) || null;
    if (res) {
      firestoreSync.saveOpportunity(res).catch(() => {});
      return res;
    }
    const remote = await firestoreSync.getOpportunity(id);
    if (remote) {
      const updated = { ...remote, ...updates, updatedAt: new Date().toISOString() };
      store.setRecoveryOpportunity(updated);
      firestoreSync.saveOpportunity(updated).catch(() => {});
      return updated;
    }
    return null;
  },

  // Decisions & Actions
  createRecoveryDecision: async (decision: RecoveryDecision): Promise<RecoveryDecision> => {
    const res = store.setRecoveryDecision(decision);
    firestoreSync.saveDecision(decision).catch(() => {});
    return res;
  },

  getRecoveryDecisionById: async (id: string): Promise<RecoveryDecision | null> => {
    const local = store.getRecoveryDecision(id);
    if (local) return local;
    const remote = await firestoreSync.getDecision(id);
    if (remote) {
      store.setRecoveryDecision(remote);
      return remote;
    }
    return null;
  },

  createRecoveryAction: async (action: RecoveryAction): Promise<RecoveryAction> => {
    const res = store.setRecoveryAction(action);
    firestoreSync.saveAction(action).catch(() => {});
    return res;
  },

  getActionById: async (id: string): Promise<RecoveryAction | null> => {
    const remote = await firestoreSync.getAction(id);
    if (remote) return remote;
    return null;
  },

  createRecoveryOutcome: async (outcome: RecoveryOutcome): Promise<RecoveryOutcome> => {
    const res = store.setRecoveryOutcome(outcome);
    firestoreSync.saveOutcome(outcome).catch(() => {});
    return res;
  },

  getOutcomeById: async (id: string): Promise<RecoveryOutcome | null> => {
    const remote = await firestoreSync.getOutcome(id);
    if (remote) return remote;
    return null;
  },

  // Audit Logs
  addAuditLog: async (log: Omit<AuditLog, "auditId" | "createdAt">): Promise<AuditLog> => {
    const res = store.addAuditLog(log);
    firestoreSync.saveAuditLog(res).catch(() => {});
    return res;
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const remote = await firestoreSync.getAuditLogs();
    if (remote && remote.length > 0) {
      return remote;
    }
    return store.getAuditLogs();
  },

  // Policy
  getMerchantPolicy: async (): Promise<MerchantPolicy> => {
    const remote = await firestoreSync.getMerchantPolicy();
    if (remote) {
      store.updateMerchantPolicy(remote);
      return remote;
    }
    return store.getMerchantPolicy();
  },

  updateMerchantPolicy: async (updates: Partial<MerchantPolicy>): Promise<MerchantPolicy> => {
    const res = store.updateMerchantPolicy(updates);
    firestoreSync.saveMerchantPolicy(res).catch(() => {});
    return res;
  },

  // Metrics
  getOverviewMetrics: async (): Promise<OverviewMetrics> => {
    return store.getOverviewMetrics();
  },

  // Realtime Subscriptions
  subscribeOpportunities: (cb: (data: RecoveryOpportunity[]) => void) => {
    // Subscribe local memory store for instant responsiveness
    const unsubLocal = store.subscribeOpportunities(cb);
    // Also attach Firestore live listener if available
    const unsubRemote = firestoreSync.subscribeOpportunities((remoteList) => {
      if (remoteList.length > 0) {
        cb(remoteList);
      }
    });

    return () => {
      unsubLocal();
      unsubRemote();
    };
  },

  subscribeOpportunityById: (id: string, cb: (data: RecoveryOpportunity | null) => void) => {
    const unsubLocal = store.subscribeOpportunityById(id, cb);
    const unsubRemote = firestoreSync.subscribeOpportunityById(id, (remoteOpp) => {
      if (remoteOpp) cb(remoteOpp);
    });
    return () => {
      unsubLocal();
      unsubRemote();
    };
  },

  subscribeAuditLogs: (cb: (data: AuditLog[]) => void) => {
    const unsubLocal = store.subscribeAuditLogs(cb);
    const unsubRemote = firestoreSync.subscribeAuditLogs((remoteLogs) => {
      if (remoteLogs.length > 0) {
        cb(remoteLogs);
      }
    });

    return () => {
      unsubLocal();
      unsubRemote();
    };
  },

  getMetrics: async (): Promise<OverviewMetrics> => {
    return store.getOverviewMetrics();
  },

  subscribeMetrics: (cb: (data: OverviewMetrics) => void) => {
    return store.subscribeMetrics(cb);
  },

  // Multi-Channel Dispatch
  dispatchMessage: async (msg: DispatchedMessage): Promise<DispatchedMessage> => {
    const saved = store.addDispatchedMessage(msg);
    await dbService.addAuditLog({
      opportunityId: msg.opportunityId,
      actorType: "AI_AGENT",
      agentName: "RecoveryOrchestrator",
      eventType: "MESSAGE_DISPATCHED",
      message: `1-Click Recovery link dispatched via ${msg.channel.toUpperCase()} to ${msg.recipientName} (${msg.recipientContact})`,
      metadata: { channel: msg.channel, dispatchId: msg.dispatchId, incentive: msg.incentiveAttached }
    });
    return saved;
  },

  getDispatchedMessages: async (oppId?: string): Promise<DispatchedMessage[]> => {
    return store.getDispatchedMessages(oppId);
  }
};
