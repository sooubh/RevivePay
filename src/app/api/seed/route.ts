import { NextResponse } from "next/server";
import { store } from "@/lib/firebase/store";

export async function POST() {
  store.initDefaultSeed();
  return NextResponse.json({ success: true, message: "Database reset to initial demo seed" });
}

export async function GET() {
  const metrics = store.getOverviewMetrics();
  const opportunities = store.getRecoveryOpportunities();
  const auditLogs = store.getAuditLogs();
  return NextResponse.json({
    success: true,
    metrics,
    opportunitiesCount: opportunities.length,
    auditLogsCount: auditLogs.length
  });
}
