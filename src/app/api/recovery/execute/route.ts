import { NextRequest, NextResponse } from "next/server";
import { dbService } from "@/lib/firebase/db";
import { RecoveryOrchestrator } from "@/lib/recovery/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { opportunityId, action, paymentMethod = "upi" } = body as {
      opportunityId: string;
      action: "approve" | "recover" | "dismiss";
      paymentMethod?: string;
    };

    if (!opportunityId) {
      return NextResponse.json({ error: "Opportunity ID is required" }, { status: 400 });
    }

    const opp = await dbService.getRecoveryOpportunityById(opportunityId);
    if (!opp) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    if (action === "recover") {
      const recovered = await RecoveryOrchestrator.processRecoverySuccess(opportunityId, paymentMethod);
      return NextResponse.json({ success: true, opportunity: recovered });
    }

    if (action === "approve") {
      const updated = await dbService.updateRecoveryOpportunity(opportunityId, {
        status: "merchant_approved",
        updatedAt: new Date().toISOString()
      });

      await dbService.addAuditLog({
        opportunityId,
        actorType: "MERCHANT",
        eventType: "MANUAL_APPROVAL_GRANTED",
        message: `Manual approval granted by merchant for ${opp.recommendedAction}.`,
        metadata: { amount: opp.amount }
      });

      return NextResponse.json({ success: true, opportunity: updated });
    }

    if (action === "dismiss") {
      const updated = await dbService.updateRecoveryOpportunity(opportunityId, {
        status: "do_not_intervene",
        updatedAt: new Date().toISOString()
      });

      await dbService.addAuditLog({
        opportunityId,
        actorType: "MERCHANT",
        eventType: "RECOVERY_ABORTED",
        message: `Recovery dismissed by merchant. Status set to DO_NOT_INTERVENE.`,
        metadata: { amount: opp.amount }
      });

      return NextResponse.json({ success: true, opportunity: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error executing recovery action:", error);
    return NextResponse.json({ error: "Failed to execute recovery action" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const opportunityId = searchParams.get("opportunityId") || searchParams.get("id");
    if (!opportunityId) {
      return NextResponse.json({ error: "Opportunity ID is required" }, { status: 400 });
    }

    const opp = await dbService.getRecoveryOpportunityById(opportunityId);
    if (!opp) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, opportunity: opp });
  } catch (error) {
    console.error("Error fetching opportunity:", error);
    return NextResponse.json({ error: "Failed to fetch opportunity" }, { status: 500 });
  }
}
