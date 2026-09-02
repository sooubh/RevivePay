import { BankHealthNode } from "@/lib/types";

export interface RailMetricEvent {
  rail: 'UPI' | 'CARD' | 'NETBANKING' | 'MANDATE';
  bankCode: string;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
}

export class BankHealthService {
  private static nodes: Map<string, BankHealthNode> = new Map([
    [
      "UPI_NPCI",
      {
        bankName: "NPCI UPI Core Switch",
        code: "UPI_NPCI",
        rail: "UPI",
        successRate: 98.4,
        latencyMs: 340,
        status: "optimal",
        lastUpdated: new Date().toISOString()
      }
    ],
    [
      "UPI_PHONEPE_GPAY",
      {
        bankName: "UPI Intent (PhonePe / GPay)",
        code: "UPI_PHONEPE_GPAY",
        rail: "UPI",
        successRate: 99.2,
        latencyMs: 290,
        status: "optimal",
        lastUpdated: new Date().toISOString()
      }
    ],
    [
      "HDFC",
      {
        bankName: "HDFC Bank",
        code: "HDFC",
        rail: "CARD",
        successRate: 96.8,
        latencyMs: 620,
        status: "optimal",
        lastUpdated: new Date().toISOString()
      }
    ],
    [
      "SBIN",
      {
        bankName: "State Bank of India (SBI)",
        code: "SBIN",
        rail: "NETBANKING",
        successRate: 74.2,
        latencyMs: 1840,
        status: "degraded",
        recommendedAlternative: "NPCI UPI (PhonePe / GPay)",
        lastUpdated: new Date().toISOString()
      }
    ],
    [
      "ICIC",
      {
        bankName: "ICICI Bank",
        code: "ICIC",
        rail: "UPI",
        successRate: 97.9,
        latencyMs: 410,
        status: "optimal",
        lastUpdated: new Date().toISOString()
      }
    ],
    [
      "UTIB",
      {
        bankName: "Axis Bank",
        code: "UTIB",
        rail: "CARD",
        successRate: 93.1,
        latencyMs: 890,
        status: "optimal",
        lastUpdated: new Date().toISOString()
      }
    ],
    [
      "KKBK",
      {
        bankName: "Kotak Mahindra Bank",
        code: "KKBK",
        rail: "NETBANKING",
        successRate: 95.4,
        latencyMs: 680,
        status: "optimal",
        lastUpdated: new Date().toISOString()
      }
    ],
    [
      "RUPAY_RAIL",
      {
        bankName: "NPCI RuPay & Credit on UPI",
        code: "RUPAY_RAIL",
        rail: "UPI",
        successRate: 98.9,
        latencyMs: 310,
        status: "optimal",
        lastUpdated: new Date().toISOString()
      }
    ],
    [
      "ENACH_MANDATE",
      {
        bankName: "eNACH / NPCI AutoPay Mandate",
        code: "ENACH_MANDATE",
        rail: "NETBANKING",
        successRate: 88.5,
        latencyMs: 1420,
        status: "optimal",
        lastUpdated: new Date().toISOString()
      }
    ],
    [
      "RZP_ORCH",
      {
        bankName: "Razorpay Smart Routing Switch",
        code: "RZP_ORCH",
        rail: "CARD",
        successRate: 99.1,
        latencyMs: 280,
        status: "optimal",
        lastUpdated: new Date().toISOString()
      }
    ]
  ]);

  public static getNodes(): BankHealthNode[] {
    return Array.from(this.nodes.values());
  }

  public static getNode(code: string): BankHealthNode | undefined {
    return this.nodes.get(code.toUpperCase());
  }

  public static updateNodeHealth(code: string, updates: Partial<BankHealthNode>): BankHealthNode | null {
    const existing = this.nodes.get(code.toUpperCase());
    if (!existing) return null;

    const updated: BankHealthNode = {
      ...existing,
      ...updates,
      lastUpdated: new Date().toISOString()
    };

    // Auto calculate status from success rate and latency
    if (updated.successRate < 80 || updated.latencyMs > 1500) {
      updated.status = "degraded";
    } else if (updated.successRate < 60 || updated.latencyMs > 3000) {
      updated.status = "maintenance";
    } else {
      updated.status = "optimal";
    }

    this.nodes.set(code.toUpperCase(), updated);
    return updated;
  }

  /**
   * Dynamically simulates bank latency spikes and core banking downtime.
   */
  public static simulateBankLatencySpike(code: string, latencyMs: number = 2400, successRate: number = 62.5): BankHealthNode | null {
    const node = this.nodes.get(code.toUpperCase());
    if (!node) return null;

    return this.updateNodeHealth(code, {
      latencyMs,
      successRate,
      status: "degraded",
      recommendedAlternative: node.rail === "NETBANKING" ? "NPCI UPI (PhonePe / GPay)" : "Razorpay Smart Routing Switch"
    });
  }

  /**
   * Ingest real-time telemetry metrics and adjust Exponential Moving Average (EMA).
   */
  public static recordMetric(event: RailMetricEvent): void {
    const node = this.nodes.get(event.bankCode.toUpperCase());
    if (!node) return;

    const alpha = 0.15; // Smoothing factor
    const newSuccessSample = event.success ? 100 : 0;
    const updatedSuccessRate = Number((node.successRate * (1 - alpha) + newSuccessSample * alpha).toFixed(1));
    const updatedLatency = Math.round(node.latencyMs * (1 - alpha) + event.latencyMs * alpha);

    this.updateNodeHealth(event.bankCode, {
      successRate: updatedSuccessRate,
      latencyMs: updatedLatency
    });
  }

  public static getHealthSummary() {
    const nodesList = this.getNodes();
    const optimalCount = nodesList.filter((n) => n.status === "optimal").length;
    const degradedCount = nodesList.filter((n) => n.status !== "optimal").length;
    const avgLatency = Math.round(nodesList.reduce((acc, n) => acc + n.latencyMs, 0) / nodesList.length);
    const overallSuccessRate = Number(
      (nodesList.reduce((acc, n) => acc + n.successRate, 0) / nodesList.length).toFixed(1)
    );

    return {
      overallSuccessRate,
      avgLatency,
      optimalCount,
      degradedCount,
      totalMonitored: nodesList.length,
      nodes: nodesList
    };
  }

  /**
   * Determines intelligent rail failover based on current live telemetry.
   */
  public static resolveOptimalFailover(failingBankOrRail: string): {
    recommendedRail: 'UPI' | 'CARD' | 'NETBANKING';
    recommendedTarget: string;
    reason: string;
    expectedSuccessRate: number;
  } {
    const failingNode = Array.from(this.nodes.values()).find(
      (n) => n.code.toLowerCase() === failingBankOrRail.toLowerCase() || n.bankName.toLowerCase().includes(failingBankOrRail.toLowerCase())
    );

    // If Netbanking or SBI is failing, route to UPI Intent (PhonePe/GPay) or UPI NPCI
    if (!failingNode || failingNode.rail === "NETBANKING" || failingBankOrRail.toUpperCase().includes("SBIN")) {
      const upiNode = this.nodes.get("UPI_PHONEPE_GPAY") || this.nodes.get("UPI_NPCI");
      return {
        recommendedRail: "UPI",
        recommendedTarget: upiNode?.bankName || "NPCI UPI (PhonePe / GPay)",
        reason: "SBI Netbanking latency >1800ms; rerouting to sub-300ms UPI Intent rail",
        expectedSuccessRate: upiNode?.successRate || 99.2
      };
    }

    // If UPI Collect fails with timeout, failover to UPI Intent or RuPay on UPI
    if (failingNode.rail === "UPI") {
      const cardNode = this.nodes.get("RZP_ORCH") || this.nodes.get("HDFC");
      return {
        recommendedRail: "CARD",
        recommendedTarget: cardNode?.bankName || "Razorpay Smart Routing Switch",
        reason: "NPCI Collect request timed out; routing to 1-Click Card / Tokenized checkout",
        expectedSuccessRate: cardNode?.successRate || 98.5
      };
    }

    // Default to UPI Intent
    const defaultNode = this.nodes.get("UPI_PHONEPE_GPAY") || this.nodes.get("UPI_NPCI")!;
    return {
      recommendedRail: "UPI",
      recommendedTarget: defaultNode?.bankName || "NPCI UPI Core Switch",
      reason: "Optimal telemetry node with highest success rate across Indian rails",
      expectedSuccessRate: defaultNode?.successRate || 98.4
    };
  }
}
