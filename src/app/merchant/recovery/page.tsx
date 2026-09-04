"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import MerchantNav from "@/components/merchant/MerchantNav";
import DemoSimulatorModal from "@/components/simulator/DemoSimulatorModal";
import { dbService } from "@/lib/firebase/db";
import { RecoveryOpportunity, OverviewMetrics } from "@/lib/types";
import {
  ArrowLeft,
  ArrowUpRight,
  Search,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Truck,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  XCircle,
  ExternalLink
} from "lucide-react";

function RecoveryTableContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id") || searchParams.get("oppId");

  const [opportunities, setOpportunities] = useState<RecoveryOpportunity[]>([]);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "recovered" | "return" | "ndr">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const unsubOpps = dbService.subscribeOpportunities((data) => {
      setOpportunities(data);
      if (queryId && !expandedId) {
        setExpandedId(queryId);
      }
    });

    const unsubMetrics = dbService.subscribeMetrics((data) => {
      setMetrics(data);
    });

    return () => {
      unsubOpps();
      unsubMetrics();
    };
  }, [queryId]);

  // Handle 1-click inline test simulation for demo
  const handleQuickExecute = async (opp: RecoveryOpportunity) => {
    setExecutingId(opp.opportunityId);
    try {
      const action = opp.sourceType === "return" ? "confirm_exchange" : "recover";
      const paymentMethod = opp.sourceType === "ndr" ? "razorpay_prepaid" : "exchange";
      const res = await fetch("/api/recovery/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: opp.opportunityId,
          action,
          paymentMethod
        })
      });
      await res.json();
    } catch (e) {
      console.error("Execution error:", e);
    } finally {
      setExecutingId(null);
    }
  };

  const handleDismiss = async (oppId: string) => {
    setExecutingId(oppId);
    try {
      const res = await fetch("/api/recovery/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: oppId,
          action: "dismiss"
        })
      });
      await res.json();
    } catch (e) {
      console.error("Dismiss error:", e);
    } finally {
      setExecutingId(null);
    }
  };

  const handleResetDemoSeed = async () => {
    setResetting(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      const res = await fetch("/api/seed", { method: "GET" });
      const data = await res.json();
      if (data.metrics) setMetrics(data.metrics);
      setExpandedId(null);
    } catch (e) {
      console.error("Reset error:", e);
    } finally {
      setResetting(false);
    }
  };

  // Filter opportunities
  const filteredOpps = opportunities.filter((opp) => {
    if (filterTab === "pending" && opp.status === "recovered") return false;
    if (filterTab === "recovered" && opp.status !== "recovered") return false;
    if (filterTab === "return" && opp.sourceType !== "return") return false;
    if (filterTab === "ndr" && opp.sourceType !== "ndr") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        opp.opportunityId.toLowerCase().includes(q) ||
        (opp.customerName && opp.customerName.toLowerCase().includes(q)) ||
        (opp.orderId && opp.orderId.toLowerCase().includes(q)) ||
        (opp.productName && opp.productName.toLowerCase().includes(q)) ||
        (opp.failureType && opp.failureType.toLowerCase().includes(q)) ||
        (opp.recommendedAction && opp.recommendedAction.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingCount = opportunities.filter((o) => o.status !== "recovered").length;
  const recoveredCount = opportunities.filter((o) => o.status === "recovered").length;
  const returnsCount = opportunities.filter((o) => o.sourceType === "return").length;
  const ndrsCount = opportunities.filter((o) => o.sourceType === "ndr").length;

  return (
    <div className="bg-[#22252a] text-white font-sans min-h-screen w-full flex flex-col selection:bg-[#D4FF00] selection:text-black">
      <MerchantNav />

      <main className="flex-1 px-4 md:px-10 lg:px-12 py-8 flex flex-col w-full max-w-[1600px] mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/store")}
              className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-white/5 text-white hover:bg-white/15 transition-all shadow-sm"
              title="Go to Customer Store"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                  Recovery Queue
                </h1>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4FF00] animate-pulse" />
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                Real-time AI interventions for customer Returns and Non-Delivery Reports (NDRs)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDemoSeed}
              disabled={resetting}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center gap-2 transition-all disabled:opacity-50"
              title="Reset to 2 clean demo cases"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
              <span>{resetting ? "Resetting..." : "Reset Demo Data"}</span>
            </button>
          </div>
        </div>

        {/* Live KPI Metric Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
            <span className="text-[11px] text-white/50 uppercase font-bold tracking-wider block mb-1">
              Active Cases
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black font-mono text-white">
                {opportunities.length}
              </span>
              <span className="text-xs text-white/50">
                ({returnsCount} Return • {ndrsCount} NDR)
              </span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
            <span className="text-[11px] text-white/50 uppercase font-bold tracking-wider block mb-1">
              Revenue at Risk
            </span>
            <span className="text-2xl md:text-3xl font-black font-mono text-white">
              ₹{(metrics?.revenueAtRisk ?? 0).toLocaleString()}
            </span>
          </div>

          <div className="bg-white/5 rounded-2xl p-5 border border-[#D4FF00]/30 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4FF00]/10 rounded-full blur-xl pointer-events-none" />
            <span className="text-[11px] text-[#D4FF00] uppercase font-bold tracking-wider block mb-1">
              AI Revenue Retained
            </span>
            <span className="text-2xl md:text-3xl font-black font-mono text-[#D4FF00]">
              ₹{(metrics?.aiRecovered ?? 0).toLocaleString()}
            </span>
          </div>

          <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
            <span className="text-[11px] text-white/50 uppercase font-bold tracking-wider block mb-1">
              Recovery Rate
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black font-mono text-white">
                {metrics?.recoveryRate ?? 0}%
              </span>
              <span className="text-xs text-green-400 font-bold">
                {recoveredCount} of {opportunities.length} saved
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterTab === "all" ? "bg-[#D4FF00] text-black shadow-sm" : "text-white/70 hover:text-white"
              }`}
            >
              All ({opportunities.length})
            </button>
            <button
              onClick={() => setFilterTab("pending")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterTab === "pending" ? "bg-[#D4FF00] text-black shadow-sm" : "text-white/70 hover:text-white"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilterTab("recovered")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterTab === "recovered" ? "bg-[#D4FF00] text-black shadow-sm" : "text-white/70 hover:text-white"
              }`}
            >
              Recovered ({recoveredCount})
            </button>
            <button
              onClick={() => setFilterTab("return")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                filterTab === "return" ? "bg-[#D4FF00] text-black shadow-sm" : "text-white/60 hover:text-white"
              }`}
            >
              Returns ({returnsCount})
            </button>
            <button
              onClick={() => setFilterTab("ndr")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                filterTab === "ndr" ? "bg-[#D4FF00] text-black shadow-sm" : "text-white/60 hover:text-white"
              }`}
            >
              NDRs ({ndrsCount})
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search case, customer, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 pl-10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D4FF00] transition-colors"
            />
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          </div>
        </div>

        {/* Structured List / Table */}
        <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-[11px] uppercase tracking-wider text-white/50 font-bold">
                  <th className="py-4 px-5">Case & Type</th>
                  <th className="py-4 px-5">Customer & Order</th>
                  <th className="py-4 px-5">Issue / Root Cause</th>
                  <th className="py-4 px-5">AI Recommendation</th>
                  <th className="py-4 px-5">Revenue Impact</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredOpps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-white/50 text-xs">
                      No recovery cases found matching the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredOpps.map((opp) => {
                    const isExpanded = expandedId === opp.opportunityId;
                    const isRecovered = opp.status === "recovered";
                    const isReturn = opp.sourceType === "return";
                    const isNdr = opp.sourceType === "ndr";
                    const isExecuting = executingId === opp.opportunityId;

                    return (
                      <React.Fragment key={opp.opportunityId}>
                        <tr
                          className={`transition-colors hover:bg-white/5 ${
                            isExpanded ? "bg-white/[0.07]" : ""
                          }`}
                        >
                          {/* Col 1: Case & Type */}
                          <td className="py-4 px-5 align-top">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white text-xs">
                                {opp.opportunityId}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              {isReturn ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-[#D4FF00] text-black">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  RETURN
                                </span>
                              ) : isNdr ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-400 text-black">
                                  <Truck className="w-2.5 h-2.5" />
                                  NDR
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-white/20 text-white">
                                  PAYMENT
                                </span>
                              )}
                              <span className="text-[10px] text-white/40">Today</span>
                            </div>
                          </td>

                          {/* Col 2: Customer & Order */}
                          <td className="py-4 px-5 align-top">
                            <span className="font-bold text-white block">
                              {opp.customerName || "Customer"}
                            </span>
                            <span className="text-[11px] text-white/50 block font-mono">
                              {opp.orderId || "ORD-001"}
                            </span>
                            <span className="text-[11px] text-white/70 block mt-0.5 font-medium truncate max-w-[180px]">
                              {opp.productName || "Aeon Performance Runner"}
                            </span>
                          </td>

                          {/* Col 3: Issue / Root Cause */}
                          <td className="py-4 px-5 align-top">
                            {isReturn ? (
                              <div>
                                <div className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                  <span>Size Mismatch</span>
                                </div>
                                <span className="text-[11px] text-white/60 block mt-0.5">
                                  Customer has Size {opp.currentSize || "9"} (Too tight)
                                </span>
                              </div>
                            ) : isNdr ? (
                              <div>
                                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>Cash Unavailable</span>
                                </div>
                                <span className="text-[11px] text-white/60 block mt-0.5">
                                  COD attempt 1 paused at doorstep
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-xs font-bold text-white block">Payment Failure</span>
                                <span className="text-[11px] text-white/60 block">{opp.failureType}</span>
                              </div>
                            )}
                          </td>

                          {/* Col 4: AI Recommendation & Logic */}
                          <td className="py-4 px-5 align-top max-w-[280px]">
                            {isReturn ? (
                              <div>
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#D4FF00]/20 text-[#D4FF00] font-extrabold text-xs border border-[#D4FF00]/30">
                                  <CheckCircle2 className="w-3 h-3 text-[#D4FF00]" />
                                  <span>Size {opp.replacementSize || "10"} Exchange</span>
                                </div>
                                <p className="text-[11px] text-white/70 mt-1 leading-snug">
                                  Size {opp.replacementSize || "10"} verified in stock. Direct exchange preserves 100% order value vs refund loss.
                                </p>
                                <span className="text-[10px] text-white/40 block mt-0.5 font-mono">
                                  Demo Estimate: 95% retention
                                </span>
                              </div>
                            ) : isNdr ? (
                              <div>
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#D4FF00]/20 text-[#D4FF00] font-extrabold text-xs border border-[#D4FF00]/30">
                                  <CheckCircle2 className="w-3 h-3 text-[#D4FF00]" />
                                  <span>Convert COD to Razorpay</span>
                                </div>
                                <p className="text-[11px] text-white/70 mt-1 leading-snug">
                                  Eliminates 65% courier RTO risk and secures ₹{opp.amount.toLocaleString()} upfront without cash friction.
                                </p>
                                <span className="text-[10px] text-white/40 block mt-0.5 font-mono">
                                  Demo Estimate: 90% retention
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-white">{opp.recommendedAction}</span>
                                <p className="text-[11px] text-white/60 mt-1">{opp.recommendationReason}</p>
                              </div>
                            )}
                          </td>

                          {/* Col 5: Revenue Impact */}
                          <td className="py-4 px-5 align-top">
                            <span className="text-[11px] text-white/50 block">At Risk</span>
                            <span className="font-bold font-mono text-white text-sm block">
                              ₹{opp.amount.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-[#D4FF00] font-bold block mt-1">
                              {isRecovered ? "✓ 100% Retained" : "₹" + (opp.expectedRecovery || opp.amount).toLocaleString() + " Retainable"}
                            </span>
                          </td>

                          {/* Col 6: Status */}
                          <td className="py-4 px-5 align-top">
                            {isRecovered ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-green-500/20 text-green-300 border border-green-500/40">
                                <Check className="w-3 h-3" />
                                RETAINED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#D4FF00]/20 text-[#D4FF00] border border-[#D4FF00]/40">
                                <Clock className="w-3 h-3" />
                                ACTION READY
                              </span>
                            )}
                          </td>

                          {/* Col 7: Actions */}
                          <td className="py-4 px-5 align-top text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              {!isRecovered ? (
                                isReturn ? (
                                  <div className="flex items-center gap-1.5">
                                    <Link
                                      href={`/store/payment?oppId=${opp.opportunityId}&orderId=${opp.orderId}&type=return`}
                                      target="_blank"
                                      className="px-3 py-1.5 bg-[#D4FF00] hover:bg-[#b8de00] text-black font-black rounded-xl text-xs flex items-center gap-1 shadow-md transition-all whitespace-nowrap"
                                      title="Open the customer exchange screen"
                                    >
                                      <span>Customer Exchange</span>
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                    </Link>
                                    <button
                                      onClick={() => handleQuickExecute(opp)}
                                      disabled={isExecuting}
                                      className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all disabled:opacity-50"
                                      title="Quick 1-click test confirmation"
                                    >
                                      {isExecuting ? "..." : "Simulate"}
                                    </button>
                                  </div>
                                ) : isNdr ? (
                                  <div className="flex items-center gap-1.5">
                                    <Link
                                      href={`/store/payment?oppId=${opp.opportunityId}&orderId=${opp.orderId}&type=ndr`}
                                      target="_blank"
                                      className="px-3 py-1.5 bg-[#D4FF00] hover:bg-[#b8de00] text-black font-black rounded-xl text-xs flex items-center gap-1 shadow-md transition-all whitespace-nowrap"
                                      title="Open the customer prepaid payment link"
                                    >
                                      <span>Customer Prepaid</span>
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                    </Link>
                                    <button
                                      onClick={() => handleQuickExecute(opp)}
                                      disabled={isExecuting}
                                      className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all disabled:opacity-50"
                                      title="Quick 1-click test confirmation"
                                    >
                                      {isExecuting ? "..." : "Simulate"}
                                    </button>
                                  </div>
                                ) : null
                              ) : (
                                <span className="px-3 py-1.5 bg-green-500/10 text-green-300 font-bold rounded-xl text-xs flex items-center gap-1 border border-green-500/30">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                  <span>Recovered</span>
                                </span>
                              )}

                              {/* Expand Drawer Button */}
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : opp.opportunityId)}
                                className="text-[11px] text-white/50 hover:text-white flex items-center gap-1 font-medium transition-colors mt-0.5"
                              >
                                <span>{isExpanded ? "Hide Details" : "Inspect Decision"}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* In-Line Expanded Inspection Drawer */}
                        {isExpanded && (
                          <tr className="bg-black/30 border-b border-white/10">
                            <td colSpan={7} className="p-6">
                              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-4">
                                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                                  <Sparkles className="w-4 h-4 text-[#D4FF00]" />
                                  <h4 className="font-extrabold text-white text-sm">Case Details</h4>
                                </div>
                                
                                <div className="space-y-3 text-xs">
                                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                    <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider block mb-2">What Happened</span>
                                    <p className="text-white/90 text-sm font-medium">{opp.failureType}</p>
                                  </div>
                                  
                                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                    <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider block mb-2">Why Revenue Is At Risk</span>
                                    <p className="text-white/90">
                                      {isReturn 
                                        ? `Returning ${opp.productName} (Size ${opp.currentSize}) would result in a full ₹${opp.amount.toLocaleString()} refund and lost sale.`
                                        : `COD payment of ₹${opp.amount.toLocaleString()} could not be collected. Without recovery, this order returns to origin.`
                                      }
                                    </p>
                                  </div>
                                  
                                  <div className="bg-black/30 rounded-xl p-4 border border-[#D4FF00]/20">
                                    <span className="text-[10px] text-[#D4FF00] uppercase font-bold tracking-wider block mb-2">Recommended Action</span>
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-[#D4FF00]" />
                                      <span className="text-[#D4FF00] font-bold text-sm">{opp.recommendedAction}</span>
                                    </div>
                                    <p className="text-white/70 mt-1">
                                      {isReturn
                                        ? `Size ${opp.replacementSize} is in stock. Exchange preserves 100% order value.`
                                        : `Razorpay digital payment secures full order value and resumes delivery immediately.`
                                      }
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
                                  <span className="text-xs text-white/60">
                                    Status: <strong className="text-white uppercase">{opp.status}</strong>
                                  </span>

                                  {!isRecovered ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {/* Primary: Send recovery link to customer */}
                                      <Link
                                        href={isReturn
                                          ? `/store/payment?oppId=${opp.opportunityId}&orderId=${opp.orderId}&type=return`
                                          : `/store/payment?oppId=${opp.opportunityId}&orderId=${opp.orderId}&type=ndr`
                                        }
                                        target="_blank"
                                        className="px-4 py-2 bg-[#D4FF00] hover:bg-[#c5e128] text-black font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>{isReturn ? "Send Exchange Offer to Customer" : "Send Payment Link to Customer"}</span>
                                      </Link>

                                      {/* Secondary: Approve recommendation */}
                                      <button
                                        onClick={async () => {
                                          setExecutingId(opp.opportunityId);
                                          try {
                                            await fetch("/api/recovery/execute", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ opportunityId: opp.opportunityId, action: "approve" })
                                            });
                                          } catch (e) {} finally { setExecutingId(null); }
                                        }}
                                        disabled={isExecuting}
                                        className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-green-500/30 transition-all disabled:opacity-50"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>{isExecuting ? "..." : "Approve"}</span>
                                      </button>

                                      {/* Demo: Quick simulate recovery */}
                                      <button
                                        onClick={() => handleQuickExecute(opp)}
                                        disabled={isExecuting}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 border border-white/20 transition-all disabled:opacity-50"
                                        title="Simulate customer completing recovery"
                                      >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isExecuting ? "animate-spin" : ""}`} />
                                        <span>{isExecuting ? "Simulating..." : "Simulate Recovery"}</span>
                                      </button>

                                      {/* Dismiss */}
                                      <button
                                        onClick={() => handleDismiss(opp.opportunityId)}
                                        disabled={isExecuting}
                                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300/80 hover:text-red-300 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-red-500/20 transition-all disabled:opacity-50"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>Dismiss</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500/20 text-green-300 font-bold rounded-xl text-xs border border-green-500/30">
                                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                                      Revenue Retained — ₹{opp.amount.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <DemoSimulatorModal />
    </div>
  );
}

export default function MerchantRecoveryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#22252a] flex items-center justify-center text-sm font-bold text-[#D4FF00]">
          Loading recovery queue...
        </div>
      }
    >
      <RecoveryTableContent />
    </Suspense>
  );
}
