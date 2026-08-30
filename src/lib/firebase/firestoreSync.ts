import { db } from "./config";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit
} from "firebase/firestore";
import {
  RecoveryOpportunity,
  RecoveryDecision,
  RecoveryAction,
  RecoveryOutcome,
  AuditLog,
  Customer,
  Product,
  Order,
  Payment,
  MerchantPolicy
} from "@/lib/types";

/**
 * Live Firestore Cloud Synchronizer
 * Syncs in-memory / local state with live Google Cloud Firestore.
 */
export const firestoreSync = {
  // PRODUCTS
  saveProduct: async (product: Product): Promise<void> => {
    if (!db) return;
    try {
      const ref = doc(db, "products", product.productId);
      await setDoc(ref, product, { merge: true });
    } catch (e) {
      console.warn("Firestore sync notice for product:", e);
    }
  },

  saveProducts: async (products: Product[]): Promise<void> => {
    if (!db) return;
    const firestore = db;
    try {
      await Promise.all(
        products.map((p) => {
          const ref = doc(firestore, "products", p.productId);
          return setDoc(ref, p, { merge: true });
        })
      );
    } catch (e) {
      console.warn("Firestore sync notice for products:", e);
    }
  },

  getProduct: async (id: string): Promise<Product | null> => {
    if (!db) return null;
    try {
      const ref = doc(db, "products", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as Product;
      }
    } catch (e) {
      console.warn("Firestore read notice for product:", e);
    }
    return null;
  },

  getProducts: async (): Promise<Product[]> => {
    if (!db) return [];
    try {
      const colRef = collection(db, "products");
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const list: Product[] = [];
        snap.forEach((d) => list.push(d.data() as Product));
        return list;
      }
    } catch (e) {
      console.warn("Firestore read notice for products:", e);
    }
    return [];
  },

  // CUSTOMERS
  saveCustomer: async (customer: Customer): Promise<void> => {
    if (!db) return;
    try {
      const ref = doc(db, "customers", customer.customerId);
      await setDoc(ref, customer, { merge: true });
    } catch (e) {
      console.warn("Firestore sync notice for customer:", e);
    }
  },

  getCustomer: async (id: string): Promise<Customer | null> => {
    if (!db) return null;
    try {
      const ref = doc(db, "customers", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as Customer;
      }
    } catch (e) {
      console.warn("Firestore read notice for customer:", e);
    }
    return null;
  },

  // ORDERS
  saveOrder: async (order: Order): Promise<void> => {
    if (!db) return;
    try {
      const ref = doc(db, "orders", order.orderId);
      await setDoc(ref, order, { merge: true });
    } catch (e) {
      console.warn("Firestore sync notice for order:", e);
    }
  },

  getOrder: async (id: string): Promise<Order | null> => {
    if (!db) return null;
    try {
      const ref = doc(db, "orders", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as Order;
      }
      // Check razorpayOrderId query if direct ID not found
      const colRef = collection(db, "orders");
      const q = query(colRef, where("razorpayOrderId", "==", id), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        return qSnap.docs[0].data() as Order;
      }
    } catch (e) {
      console.warn("Firestore read notice for order:", e);
    }
    return null;
  },

  // PAYMENTS
  savePayment: async (payment: Payment): Promise<void> => {
    if (!db) return;
    try {
      const ref = doc(db, "payments", payment.paymentId);
      await setDoc(ref, payment, { merge: true });
    } catch (e) {
      console.warn("Firestore sync notice for payment:", e);
    }
  },

  getPayment: async (id: string): Promise<Payment | null> => {
    if (!db) return null;
    try {
      const ref = doc(db, "payments", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as Payment;
      }
      // Check razorpayPaymentId query
      const colRef = collection(db, "payments");
      const q = query(colRef, where("razorpayPaymentId", "==", id), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        return qSnap.docs[0].data() as Payment;
      }
    } catch (e) {
      console.warn("Firestore read notice for payment:", e);
    }
    return null;
  },

  // RECOVERY OPPORTUNITIES
  saveOpportunity: async (opp: RecoveryOpportunity): Promise<void> => {
    if (!db) return;
    try {
      const ref = doc(db, "recovery_opportunities", opp.opportunityId);
      await setDoc(ref, opp, { merge: true });
    } catch (e) {
      console.warn("Firestore sync notice for opportunity:", e);
    }
  },

  getOpportunity: async (id: string): Promise<RecoveryOpportunity | null> => {
    if (!db) return null;
    try {
      const ref = doc(db, "recovery_opportunities", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as RecoveryOpportunity;
      }
    } catch (e) {
      console.warn("Firestore read notice for opportunity:", e);
    }
    return null;
  },

  getOpportunityByPaymentId: async (paymentId: string): Promise<RecoveryOpportunity | null> => {
    if (!db) return null;
    try {
      const colRef = collection(db, "recovery_opportunities");
      const q = query(colRef, where("paymentId", "==", paymentId), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        return qSnap.docs[0].data() as RecoveryOpportunity;
      }
    } catch (e) {
      console.warn("Firestore read notice for opportunity by paymentId:", e);
    }
    return null;
  },

  getOpportunities: async (): Promise<RecoveryOpportunity[]> => {
    if (!db) return [];
    try {
      const colRef = collection(db, "recovery_opportunities");
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const list: RecoveryOpportunity[] = [];
        snap.forEach((d) => list.push(d.data() as RecoveryOpportunity));
        return list;
      }
    } catch (e) {
      console.warn("Firestore read notice for opportunities:", e);
    }
    return [];
  },

  // RECOVERY DECISIONS
  saveDecision: async (decision: RecoveryDecision): Promise<void> => {
    if (!db) return;
    try {
      const ref = doc(db, "recovery_decisions", decision.decisionId);
      await setDoc(ref, decision, { merge: true });
    } catch (e) {
      console.warn("Firestore sync notice for decision:", e);
    }
  },

  getDecision: async (id: string): Promise<RecoveryDecision | null> => {
    if (!db) return null;
    try {
      const ref = doc(db, "recovery_decisions", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as RecoveryDecision;
      }
    } catch (e) {
      console.warn("Firestore read notice for decision:", e);
    }
    return null;
  },

  // RECOVERY ACTIONS
  saveAction: async (action: RecoveryAction): Promise<void> => {
    if (!db) return;
    try {
      const ref = doc(db, "recovery_actions", action.actionId);
      await setDoc(ref, action, { merge: true });
    } catch (e) {
      console.warn("Firestore sync notice for action:", e);
    }
  },

  getAction: async (id: string): Promise<RecoveryAction | null> => {
    if (!db) return null;
    try {
      const ref = doc(db, "recovery_actions", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as RecoveryAction;
      }
    } catch (e) {
      console.warn("Firestore read notice for action:", e);
    }
    return null;
  },

  // RECOVERY OUTCOMES
  saveOutcome: async (outcome: RecoveryOutcome): Promise<void> => {
    if (!db) return;
    try {
      const ref = doc(db, "recovery_outcomes", outcome.outcomeId);
      await setDoc(ref, outcome, { merge: true });
    } catch (e) {
      console.warn("Firestore sync notice for outcome:", e);
    }
  },

  getOutcome: async (id: string): Promise<RecoveryOutcome | null> => {
    if (!db) return null;
    try {
      const ref = doc(db, "recovery_outcomes", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as RecoveryOutcome;
      }
    } catch (e) {
      console.warn("Firestore read notice for outcome:", e);
    }
    return null;
  },

  // AUDIT LOGS
  saveAuditLog: async (log: AuditLog): Promise<void> => {
    if (!db) return;
    try {
      const ref = doc(db, "audit_logs", log.auditId);
      await setDoc(ref, log, { merge: true });
    } catch (e) {
      console.warn("Firestore sync notice for audit log:", e);
    }
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    if (!db) return [];
    try {
      const colRef = collection(db, "audit_logs");
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const list: AuditLog[] = [];
        snap.forEach((d) => list.push(d.data() as AuditLog));
        return list;
      }
    } catch (e) {
      console.warn("Firestore read notice for audit logs:", e);
    }
    return [];
  },

  // MERCHANT POLICY
  saveMerchantPolicy: async (policy: MerchantPolicy): Promise<void> => {
    if (!db) return;
    try {
      const ref = doc(db, "merchant_policies", policy.merchantId || "MERCH-001");
      await setDoc(ref, policy, { merge: true });
    } catch (e) {
      console.warn("Firestore sync notice for merchant policy:", e);
    }
  },

  getMerchantPolicy: async (merchantId: string = "MERCH-001"): Promise<MerchantPolicy | null> => {
    if (!db) return null;
    try {
      const ref = doc(db, "merchant_policies", merchantId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as MerchantPolicy;
      }
    } catch (e) {
      console.warn("Firestore read notice for merchant policy:", e);
    }
    return null;
  },

  // REALTIME SUBSCRIPTIONS
  subscribeOpportunities: (callback: (opps: RecoveryOpportunity[]) => void): (() => void) => {
    if (!db) return () => {};
    try {
      const colRef = collection(db, "recovery_opportunities");
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: RecoveryOpportunity[] = [];
            snapshot.forEach((doc) => {
              list.push(doc.data() as RecoveryOpportunity);
            });
            callback(list);
          }
        },
        (err) => {
          console.warn("Firestore listener fallback to local store:", err);
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  subscribeOpportunityById: (id: string, callback: (opp: RecoveryOpportunity | null) => void): (() => void) => {
    if (!db) return () => {};
    try {
      const docRef = doc(db, "recovery_opportunities", id);
      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            callback(snapshot.data() as RecoveryOpportunity);
          }
        },
        (err) => {
          console.warn("Firestore single opportunity listener fallback:", err);
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  subscribeAuditLogs: (callback: (logs: AuditLog[]) => void): (() => void) => {
    if (!db) return () => {};
    try {
      const colRef = collection(db, "audit_logs");
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: AuditLog[] = [];
            snapshot.forEach((doc) => {
              list.push(doc.data() as AuditLog);
            });
            callback(list);
          }
        },
        (err) => {
          console.warn("Firestore audit listener fallback to local store:", err);
        }
      );
    } catch (e) {
      return () => {};
    }
  }
};
