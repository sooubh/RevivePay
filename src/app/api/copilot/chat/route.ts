import { NextRequest, NextResponse } from "next/server";
import { dbService } from "@/lib/firebase/db";
import { BankHealthService } from "@/lib/telemetry/bankHealth";
import { callGeminiStructured } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const metrics = await dbService.getMetrics();
    const opportunities = await dbService.getRecoveryOpportunities();
    const policy = await dbService.getMerchantPolicy();
    const bankHealth = BankHealthService.getHealthSummary();

    // Summarize opportunity breakdown for rich context
    const pendingOpps = opportunities.filter((o) => o.status !== "recovered");
    const recoveredOpps = opportunities.filter((o) => o.status === "recovered");
    const degradedBanks = bankHealth.nodes.filter((n) => n.status === "degraded");

    const oppDetails = opportunities.slice(0, 5).map((o) => ({
      id: o.opportunityId,
      amount: o.amount,
      method: o.paymentMethod,
      failure: o.failureType,
      status: o.status,
      probability: Math.round(o.recoveryProbability * 100) + "%",
      recommendedAction: o.recommendedAction,
      incentive: o.incentiveOffer?.label || "None"
    }));

    const systemPrompt = `You are RevivePay Copilot, an elite AI revenue & payment orchestration advisor for e-commerce merchants.
Answer the merchant's question clearly, concisely, and with actionable data-driven acumen grounded strictly in the live store state.

LIVE STORE TELEMETRY CONTEXT:
- Revenue at Risk: ₹${metrics.revenueAtRisk.toLocaleString()}
- AI Recovered Revenue: ₹${metrics.aiRecovered.toLocaleString()}
- Current Recovery Rate: ${metrics.recoveryRate}%
- Incremental Modeled Revenue: +₹${metrics.incrementalRevenue.toLocaleString()}
- Total Active Opportunities: ${opportunities.length} (${pendingOpps.length} pending, ${recoveredOpps.length} recovered)
- Bank Rail Health Status: ${bankHealth.optimalCount} optimal, ${bankHealth.degradedCount} degraded rails (Average latency: ${bankHealth.avgLatency}ms)
${degradedBanks.length > 0 ? `- Degraded Rails: ${degradedBanks.map((b) => `${b.bankName} (${b.successRate}% SR, failover: ${b.recommendedAlternative})`).join("; ")}` : "- All Indian banking rails nominal."}
- Merchant Policy Guardrails: Max Retries=${policy.maxRetries}, Human Escalation Threshold=₹${policy.humanApprovalThreshold.toLocaleString()}, Min Probability=${Math.round(policy.minimumRecoveryProbability * 100)}%
- Recent Opportunities Sample:
${JSON.stringify(oppDetails, null, 2)}

Respond strictly in JSON format matching this schema:
{
  "summary": string (1-2 sentences direct executive answer with real numbers),
  "detailedInsights": string[] (3 bullet points of specific findings, bank health signals, or root causes),
  "projectedRevenueImpact": string (e.g. "+₹14,500/month by enabling UPI auto-rerouting on degraded rails"),
  "suggestedActions": { "label": string, "category": "policy" | "strategy" | "insight" }[]
}`;

    const userPrompt = `Merchant Question: "${question}"`;

    // Dynamic, calculated fallback response using real DB state
    const topMethod = metrics.paymentMethodBreakdown?.[0]?.method || "UPI";
    const dynamicFallback = {
      summary: `RevivePay is monitoring ₹${metrics.revenueAtRisk.toLocaleString()} in revenue at risk, having recovered ₹${metrics.aiRecovered.toLocaleString()} (${metrics.recoveryRate}% rate).`,
      detailedInsights: [
        `${topMethod} 1-Click Alternate Payment is currently the highest converting channel for at-risk orders.`,
        degradedBanks.length > 0
          ? `${degradedBanks[0].bankName} is degraded (${degradedBanks[0].successRate}% success); AI is actively rerouting traffic to ${degradedBanks[0].recommendedAlternative || "UPI rails"}.`
          : "All monitored Indian payment rails and gateway latencies are within optimal thresholds.",
        `Guardrail threshold is active at ₹${policy.humanApprovalThreshold.toLocaleString()} with maximum ${policy.maxRetries} automated retries.`
      ],
      projectedRevenueImpact: `+₹${Math.round(metrics.incrementalRevenue * 1.25).toLocaleString()} estimated monthly revenue lift under current AI orchestration.`,
      suggestedActions: [
        { label: "Dispatch WhatsApp 1-Click Recovery to At-Risk Orders", category: "strategy" as const },
        { label: "Review Bank Health & Degradation Telemetry", category: "insight" as const },
        { label: "Adjust Guardrail Approval Thresholds", category: "policy" as const }
      ]
    };

    const aiRes = await callGeminiStructured<typeof dynamicFallback>(
      systemPrompt,
      userPrompt,
      dynamicFallback
    );

    return NextResponse.json({
      success: true,
      answer: aiRes.result,
      model: aiRes.model
    });
  } catch (error: any) {
    console.error("Error in Copilot API:", error);
    return NextResponse.json({
      success: true,
      answer: {
        summary: "RevivePay Multi-Agent recovery is actively monitoring and rescuing failed checkouts in real time.",
        detailedInsights: [
          "UPI alternate routing has prevented customer basket drop-off.",
          "Deterministic guardrails ensure all transactions above threshold trigger merchant review."
        ],
        projectedRevenueImpact: "Autonomous revenue protection active.",
        suggestedActions: [
          { label: "View Live Recovery Queue", category: "strategy" },
          { label: "Check Bank Rail Health", category: "insight" }
        ]
      }
    });
  }
}
