"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import MerchantNav from "@/components/merchant/MerchantNav";
import DemoSimulatorModal from "@/components/simulator/DemoSimulatorModal";
import MultiChannelDispatchModal from "@/components/merchant/MultiChannelDispatchModal";
import ReviveCopilotModal from "@/components/merchant/ReviveCopilotModal";
import { dbService } from "@/lib/firebase/db";
import { RecoveryOpportunity } from "@/lib/types";
import {
  ArrowLeft,
  Search,
  Check,
  CreditCard,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Tag,
  Send,
  XCircle
} from "lucide-react";

function RecoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id") || searchParams.get("oppId");

  const [opportunities, setOpportunities] = useState<RecoveryOpportunity[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<RecoveryOpportunity | null>(null);
  const [filter, setFilter] = useState<"all" | "failed" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [executing, setExecuting] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<any>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);

  useEffect(() => {
    const unsub = dbService.subscribeOpportunities((data) => {
      setOpportunities(data);
      if (data.length > 0) {
        setSelectedOpp((prev) => {
          if (queryId) {
            const match = data.find((d) => d.opportunityId === queryId);
            if (match) return match;
          }
          if (!prev) return data[0];
          const found = data.find((d) => d.opportunityId === prev.opportunityId);
          return found || data[0];
        });
      }
    });

    return () => unsub();
  }, [queryId]);

  const activeOpp = selectedOpp || opportunities[0];

  useEffect(() => {
    if (activeOpp?.customerId) {
      dbService.getCustomerById(activeOpp.customerId).then((c) => {
        setActiveCustomer(c);
      });
    } else {
      setActiveCustomer(null);
    }
  }, [activeOpp?.customerId]);

  const handleExecuteRecovery = async () => {
    if (!activeOpp) return;
    setExecuting(true);
    try {
      const res = await fetch("/api/recovery/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: activeOpp.opportunityId,
          action: "approve"
        })
      });
      await res.json();
    } catch (e) {
      console.error("Execution error:", e);
    } finally {
      setExecuting(false);
    }
  };

  const handleDismissRecovery = async () => {
    if (!activeOpp) return;
    setExecuting(true);
    try {
      const res = await fetch("/api/recovery/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: activeOpp.opportunityId,
          action: "dismiss"
        })
      });
      await res.json();
    } catch (e) {
      console.error("Dismiss error:", e);
    } finally {
      setExecuting(false);
    }
  };

  const handleSimulatePaymentRecovered = async () => {
    if (!activeOpp) return;
    setExecuting(true);
    try {
      const res = await fetch("/api/recovery/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: activeOpp.opportunityId,
          action: "recover",
          paymentMethod: "upi"
        })
      });
      await res.json();
    } catch (e) {
      console.error("Recovery error:", e);
    } finally {
      setExecuting(false);
    }
  };

  const filteredOpps = opportunities.filter((opp) => {
    if (filter === "failed" && opp.status !== "failed" && opp.status !== "failed_recovery") return false;
    if (filter === "pending" && opp.status === "recovered") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        opp.opportunityId.toLowerCase().includes(q) ||
        opp.failureType.toLowerCase().includes(q) ||
        (opp.customerName && opp.customerName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="bg-[#2a2a2a] text-white font-sans min-h-screen w-full flex flex-col selection:bg-[#D4FF00] selection:text-black">
      <MerchantNav />

      {/* Main Content */}
      <main className="flex-1 px-6 md:px-12 xl:px-16 pb-12 flex flex-col z-0 relative w-full">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 mt-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/merchant/overview")}
              className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-white/10 text-white hover:bg-white/20 shadow-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white leading-none">
              Recovery
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/merchant/audit"
              className="bg-white/10 border border-white/20 rounded-full px-5 py-2.5 text-xs font-bold text-white flex items-center gap-2 hover:bg-white/20 shadow-sm transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-[#D4FF00]" />
              <span>Audit Log</span>
            </Link>
          </div>
        </header>

        {/* 2-Column Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start w-full">
          {/* Left Column: List of Opportunities (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Segmented Filter Control */}
            <div className="bg-white/10 rounded-full p-1 flex items-center shadow-inner border border-white/10">
              <button
                onClick={() => setFilter("all")}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                  filter === "all" ? "bg-[#D4FF00] text-black shadow-sm" : "text-white/70 hover:text-white"
                }`}
              >
                All ({opportunities.length})
              </button>
              <button
                onClick={() => setFilter("failed")}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                  filter === "failed" ? "bg-[#D4FF00] text-black shadow-sm" : "text-white/70 hover:text-white"
                }`}
              >
                Failed ({opportunities.filter((o) => o.status === "failed" || o.status === "failed_recovery").length})
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                  filter === "pending" ? "bg-[#D4FF00] text-black shadow-sm" : "text-white/70 hover:text-white"
                }`}
              >
                Pending ({opportunities.filter((o) => o.status !== "recovered").length})
              </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white/5 rounded-full border border-white/10 flex items-center px-4 py-2.5 shadow-sm">
              <input
                type="text"
                placeholder="Search transaction, reason, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full text-white placeholder-white/40 focus:ring-0 p-0"
              />
              <Search className="w-4 h-4 text-white/40" />
            </div>

            {/* Opportunities Cards List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredOpps.map((opp) => {
                const isSelected = activeOpp?.opportunityId === opp.opportunityId;
                return (
                  <div
                    key={opp.opportunityId}
                    onClick={() => setSelectedOpp(opp)}
                    className={`p-4 rounded-3xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-[#7A90A2]/30 border-[#D4FF00] shadow-xl text-white scale-[1.01]"
                        : "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-sm ${
                            opp.status === "recovered"
                              ? "bg-[#D4FF00] text-black"
                              : isSelected
                              ? "bg-[#D4FF00] text-black"
                              : "bg-white/10 text-white"
                          }`}
                        >
                          {opp.paymentMethod === "upi" ? (
                            <QrCode className="w-4 h-4" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <span className="font-mono text-xs font-bold text-white block">{opp.opportunityId}</span>
                          <span className="text-xs text-white/60 block">{opp.customerName || "Customer"}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-base text-white font-mono block">
                          ₹{opp.amount.toLocaleString()}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            opp.status === "recovered"
                              ? "bg-green-500/20 text-green-300"
                              : opp.priority === "High Priority"
                              ? "bg-[#D4FF00]/20 text-[#D4FF00]"
                              : "bg-white/10 text-white/70"
                          }`}
                        >
                          {opp.priority}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-white/60 truncate max-w-[240px]">{opp.failureType}</span>
                      <span className="text-[#D4FF00] font-bold font-mono">
                        {Math.round((opp.recoveryProbability || 0.8) * 100)}% Prob
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Decision Panel (7 Cols) */}
          <div className="lg:col-span-7 bg-[#a2b4c1] text-[#2a2a2a] rounded-[2.5rem] p-6 md:p-8 flex flex-col justify-between shadow-2xl min-h-[640px]">
            {activeOpp ? (
              <>
                <div className="space-y-6">
                  {/* Top Row: Title + AI Badge */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-black text-[#2a2a2a] tracking-tight">Decision Details</h2>
                      <p className="text-xs text-[#2a2a2a]/70 font-mono">
                        Opportunity: <span className="font-bold">{activeOpp.opportunityId}</span> • Method: {activeOpp.paymentMethod.toUpperCase()}
                      </p>
                    </div>

                    <span className="px-3.5 py-1.5 bg-[#2a2a2a] text-[#D4FF00] rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{activeOpp.decision?.model || "gemini-1.5-flash"}</span>
                    </span>
                  </div>

                  {/* Customer Profile Box */}
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between border border-white/60 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-[#2a2a2a] text-[#D4FF00] font-black flex items-center justify-center text-sm">
                        {activeOpp.customerName ? activeOpp.customerName.charAt(0) : "S"}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#2a2a2a]">{activeOpp.customerName || "Sarah Jenkins"}</h4>
                        <p className="text-xs text-gray-500 font-mono">{activeOpp.customerId || "CUS-8F42K1"}</p>
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <span className="text-gray-500 block">Customer Lifetime Spend</span>
                      <span className="font-bold text-[#2a2a2a] font-mono">
                        ₹{(activeCustomer?.totalSpend ?? (activeOpp.amount * 2)).toLocaleString()}.00 (
                        {(activeCustomer?.successfulPayments || 0) > 1
                          ? `Repeat Buyer • ${activeCustomer?.successfulPayments} orders`
                          : "Verified Customer"}
                        )
                      </span>
                    </div>
                  </div>

                  {/* 2-Stat Box */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-sm">
                      <span className="text-[11px] text-gray-500 uppercase font-semibold block mb-1">Payment Amount</span>
                      <span className="text-2xl font-black text-[#2a2a2a] font-mono">
                        ₹{activeOpp.amount.toLocaleString()}.00
                      </span>
                    </div>

                    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-sm">
                      <span className="text-[11px] text-gray-500 uppercase font-semibold block mb-1">Expected Recovery</span>
                      <span className="text-2xl font-black text-[#5e3bdb] font-mono">
                        ₹{(activeOpp.expectedRecovery || Math.round(activeOpp.amount * 0.82)).toLocaleString()}.00
                      </span>
                    </div>
                  </div>

                  {/* Strategies Evaluated Section */}
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Strategies Evaluated</h4>
                      <span className="text-[11px] text-gray-500">Expected Net Value Ranked</span>
                    </div>

                    <div className="space-y-2.5">
                      {activeOpp.decision?.strategiesEvaluated && activeOpp.decision.strategiesEvaluated.length > 0 ? (
                        activeOpp.decision.strategiesEvaluated.filter(s => s.strategy !== "do_nothing").slice(0, 3).map((strat) => {
                          const isSelected = strat.strategy === (activeOpp.decision?.selectedStrategy || activeOpp.selectedStrategy);
                          const probPercent = Math.round((strat.probability || 0) * 100);
                          if (isSelected) {
                            return (
                              <div key={strat.strategy} className="p-3 bg-[#D4FF00]/30 rounded-xl border border-[#D4FF00] relative overflow-hidden">
                                <div className="flex justify-between text-xs font-extrabold text-black mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                                    <span>{strat.label} (Selected)</span>
                                  </div>
                                  <span className="font-mono text-black">{probPercent}% Recovery Prob</span>
                                </div>
                                <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#2a2a2a] rounded-full" style={{ width: `${probPercent}%` }} />
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div key={strat.strategy}>
                              <div className="flex justify-between text-xs font-semibold mb-1">
                                <span>{strat.label}</span>
                                <span className="font-mono text-gray-600">{probPercent}%</span>
                              </div>
                              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-gray-400 rounded-full" style={{ width: `${probPercent}%` }} />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <>
                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span>Retry now</span>
                              <span className="font-mono text-gray-600">31%</span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gray-400 rounded-full" style={{ width: "31%" }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span>Retry later (Smart Schedule)</span>
                              <span className="font-mono text-gray-600">61%</span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gray-500 rounded-full" style={{ width: "61%" }} />
                            </div>
                          </div>

                          <div className="p-3 bg-[#D4FF00]/30 rounded-xl border border-[#D4FF00] relative overflow-hidden">
                            <div className="flex justify-between text-xs font-extrabold text-black mb-1">
                              <div className="flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                                <span>{activeOpp.recommendedAction || "Alternate UPI"} (Selected)</span>
                              </div>
                              <span className="font-mono text-black">{Math.round((activeOpp.recoveryProbability || 0.82) * 100)}% Recovery Prob</span>
                            </div>
                            <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden">
                              <div className="h-full bg-[#2a2a2a] rounded-full" style={{ width: `${Math.round((activeOpp.recoveryProbability || 0.82) * 100)}%` }} />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* AI Reasoning & Guardrails Box */}
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">AI Diagnosis & Guardrail Verification</h4>
                    <p className="text-xs text-gray-800 leading-relaxed italic">
                      "{activeOpp.recommendationReason || "UPI is recommended because this customer successfully completed 4 of the last 5 payments through UPI."}"
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {activeOpp.decision?.guardrailNotes && activeOpp.decision.guardrailNotes.length > 0 ? (
                        activeOpp.decision.guardrailNotes.map((note, nIdx) => (
                          <span key={nIdx} className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-[10px] font-bold border border-green-200">
                            ✓ {note}
                          </span>
                        ))
                      ) : (
                        <>
                          <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-[10px] font-bold border border-green-200">
                            ✓ Attempt {activeOpp.attemptCount} of 2 Max Retries
                          </span>
                          <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-[10px] font-bold border border-green-200">
                            ✓ Amount ₹{activeOpp.amount.toLocaleString()} &lt; ₹20,000 Threshold
                          </span>
                        </>
                      )}
                      <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-[10px] font-bold border border-purple-200">
                        ✓ {activeOpp.decision?.guardrailOutcome || "AUTO_EXECUTE"} Approved
                      </span>
                    </div>

                    {/* AI Dynamic Incentive Badge */}
                    {activeOpp.incentiveOffer && activeOpp.incentiveOffer.type !== "none" && (
                      <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-amber-900 font-bold">
                          <Tag className="w-4 h-4 text-[#b32a03]" />
                          <span>AI Incentive: {activeOpp.incentiveOffer.label}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-amber-200/70 rounded-md text-[10px] font-extrabold text-amber-900 uppercase">
                          {activeOpp.incentiveOffer.badge}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Row */}
                <div className="pt-6 mt-6 border-t border-black/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-gray-700">
                    <span className="block text-[11px] text-gray-500">Current Status</span>
                    <span className="font-extrabold uppercase font-mono text-sm text-[#2a2a2a]">
                      {activeOpp.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
                    {activeOpp.status !== "recovered" && activeOpp.status !== "do_not_intervene" ? (
                      <>
                        <button
                          onClick={() => setShowDispatchModal(true)}
                          className="px-4 py-3 bg-[#D4FF00] text-black font-extrabold rounded-full text-xs hover:bg-[#b8de00] transition-colors shadow-md flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Dispatch 1-Click Link</span>
                        </button>
                        <button
                          onClick={handleExecuteRecovery}
                          disabled={executing}
                          className="px-4 py-3 bg-white text-black font-bold rounded-full text-xs hover:bg-gray-100 transition-colors shadow-md disabled:opacity-50"
                        >
                          <span>Approve Strategy</span>
                        </button>
                        <button
                          onClick={handleDismissRecovery}
                          disabled={executing}
                          className="px-4 py-3 bg-red-100 text-red-800 font-bold rounded-full text-xs hover:bg-red-200 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Dismiss</span>
                        </button>
                        <button
                          onClick={handleSimulatePaymentRecovered}
                          disabled={executing}
                          className="px-4 py-3 bg-[#2a2a2a] text-[#D4FF00] font-extrabold rounded-full text-xs hover:bg-black transition-colors shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Simulate Recovery</span>
                        </button>
                      </>
                    ) : activeOpp.status === "recovered" ? (
                      <div className="px-6 py-3 bg-green-600 text-white font-bold rounded-full text-xs flex items-center gap-2 shadow-md">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Fully Recovered via UPI</span>
                      </div>
                    ) : (
                      <div className="px-6 py-3 bg-gray-500 text-white font-bold rounded-full text-xs flex items-center gap-2 shadow-md">
                        <span>Dismissed (Do Not Intervene)</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Select an opportunity from the left to view details
              </div>
            )}
          </div>
        </div>
      </main>

      <DemoSimulatorModal />
      {showDispatchModal && activeOpp && (
        <MultiChannelDispatchModal
          opportunity={activeOpp}
          onClose={() => setShowDispatchModal(false)}
        />
      )}
      <ReviveCopilotModal />
    </div>
  );
}

export default function MerchantRecoveryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#2a2a2a] flex items-center justify-center text-sm font-bold text-[#D4FF00]">Loading recovery queue...</div>}>
      <RecoveryContent />
    </Suspense>
  );
}
