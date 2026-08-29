import { db } from "./config";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import { store } from "./store";
import {
  RecoveryOpportunity,
  AuditLog,
  Customer,
  Product,
  Order,
  MerchantPolicy
} from "@/lib/types";

/**
 * Live Firestore Cloud Synchronizer
 * Syncs in-memory / local state with live Google Cloud Firestore (revivepay7).
 */
export const firestoreSync = {
  /**
   * Sync an opportunity to Cloud Firestore
   */
  saveOpportunity: async (opp: RecoveryOpportunity): Promise<void> => {
    if (!db) return;
    try {
      const ref = doc(db, "recovery_opportunities", opp.opportunityId);
      await setDoc(ref, opp, { merge: true });
    } catch (e) {
      console.warn("Firestore sync notice (offline or permission required):", e);
    }
  },

  /**
   * Sync an audit log to Cloud Firestore
   */
  saveAuditLog: async (log: AuditLog): Promise<void> => {
    if (!db) return;
    try {
      const ref = doc(db, "audit_logs", log.auditId);
      await setDoc(ref, log, { merge: true });
    } catch (e) {
      console.warn("Firestore sync notice for audit log:", e);
    }
  },

  /**
   * Sync customer to Cloud Firestore
   */
  saveCustomer: async (customer: Customer): Promise<void> => {
    if (!db) return;
    try {
      const ref = doc(db, "customers", customer.customerId);
      await setDoc(ref, customer, { merge: true });
    } catch (e) {
      console.warn("Firestore sync notice for customer:", e);
    }
  },

  /**
   * Sync order to Cloud Firestore
   */
  saveOrder: async (order: Order): Promise<void> => {
    if (!db) return;
    try {
      const ref = doc(db, "orders", order.orderId);
      await setDoc(ref, order, { merge: true });
    } catch (e) {
      console.warn("Firestore sync notice for order:", e);
    }
  },

  /**
   * Subscribe to live Firestore recovery opportunities
   */
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

  /**
   * Subscribe to live Firestore audit logs
   */
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
