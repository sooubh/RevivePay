import { NextResponse } from "next/server";
import { store } from "@/lib/firebase/store";
import { firestoreSync } from "@/lib/firebase/firestoreSync";

export async function POST() {
  store.initDefaultSeed();
  // Also sync default products, demo opportunities, and default policy to Firestore
  const products = store.getProducts();
  const opps = store.getRecoveryOpportunities();
  const orders = store.getOrders();
  const policy = store.getMerchantPolicy();

  firestoreSync.saveProducts(products).catch(() => {});
  opps.forEach(o => firestoreSync.saveOpportunity(o).catch(() => {}));
  orders.forEach(o => firestoreSync.saveOrder(o).catch(() => {}));
  firestoreSync.saveMerchantPolicy(policy).catch(() => {});

  return NextResponse.json({ success: true, message: "Database reset to initial demo seed and synced with Firestore" });
}

export async function GET() {
  const metrics = store.getOverviewMetrics();
  const opportunities = store.getRecoveryOpportunities();
  const auditLogs = store.getAuditLogs();
  return NextResponse.json({
    success: true,
    metrics,
    opportunitiesCount: opportunities.length,
    opportunities: opportunities.map(o => ({ id: o.opportunityId, type: o.sourceType, action: o.recommendedAction })),
    auditLogsCount: auditLogs.length
  });
}
