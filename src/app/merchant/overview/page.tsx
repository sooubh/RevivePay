"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MerchantNav from "@/components/merchant/MerchantNav";
import DemoSimulatorModal from "@/components/simulator/DemoSimulatorModal";
import { dbService } from "@/lib/firebase/db";
import { RecoveryOpportunity, OverviewMetrics } from "@/lib/types";
import {
  ArrowLeft,
  PlusCircle,
  ArrowUpRight,
  Search,
  ChevronDown,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight
} from "lucide-react";

export default function MerchantOverviewPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [opportunities, setOpportunities] = useState<RecoveryOpportunity[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<RecoveryOpportunity | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "action_required">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Realtime subscriptions
    const unsubMetrics = dbService.subscribeMetrics((data) => {
      setMetrics(data);
    });

    const unsubOpps = dbService.subscribeOpportunities((data) => {
      setOpportunities(data);
      if (data.length > 0 && !selectedOpp) {
        setSelectedOpp(data[0]);
      }
    });

    return () => {
      unsubMetrics();
      unsubOpps();
    };
  }, []);

  const filteredOpps = opportunities.filter((opp) => {
    if (filterTab === "pending" && opp.status === "recovered") return false;
    if (filterTab === "action_required" && opp.status !== "recovery_recommended") return false;
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

  const activeFocus = selectedOpp || opportunities[0];

  return (
    <div className="bg-[#EFF4F8] text-[#191c1e] font-sans min-h-screen w-full flex flex-col selection:bg-[#D4FF00] selection:text-black">
      <MerchantNav />

      {/* Main Content */}
      <main className="flex-1 px-6 md:px-12 xl:px-16 pb-12 flex flex-col z-0 relative w-full">
        {/* Page Header */}
        <header className="flex items-center justify-between mb-8 mt-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/welcome")}
              className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-gray-900 leading-none">
              Overview
            </h1>
          </div>

          <button
            onClick={() => router.push("/merchant/audit")}
            className="bg-white border border-gray-300 rounded-full px-5 py-2.5 text-xs font-bold text-gray-800 flex items-center gap-2 hover:bg-gray-50 shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 text-[#5e3bdb]" />
            <span>Review Guardrails</span>
          </button>
        </header>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Large Stats Block */}
          <div className="lg:col-span-8 bg-[#F4F5F7] rounded-3xl p-8 flex flex-col justify-between border border-white/70 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div>
                <p className="text-gray-500 text-xs font-semibold mb-1 uppercase tracking-wider">Revenue at Risk</p>
                <p className="text-3xl md:text-4xl font-medium tracking-tight text-gray-900">
                  <span className="text-xl text-gray-400 mr-1">₹</span>
                  {(metrics?.revenueAtRisk || 24850).toLocaleString()}.00
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-semibold mb-1 uppercase tracking-wider">AI Recovered</p>
                <p className="text-3xl md:text-4xl font-medium tracking-tight text-gray-900">
                  <span className="text-xl text-[#5e3bdb] mr-1">₹</span>
                  {(metrics?.aiRecovered || 11420).toLocaleString()}.00
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-semibold mb-1 uppercase tracking-wider">Recovery Rate</p>
                <p className="text-3xl md:text-4xl font-medium tracking-tight text-gray-900">
                  {metrics?.recoveryRate || 45.9}
                  <span className="text-2xl text-gray-400 ml-1">%</span>
                </p>
              </div>
            </div>

            {/* Monthly Striped Timeline Bar */}
            <div className="mt-8">
              <div className="flex justify-between text-xs text-gray-500 mb-2 font-bold">
                <span>Sep (₹9.2k)</span>
                <span>Oct (₹10.8k)</span>
                <span>Nov (₹12.4k)</span>
                <span>Dec (₹{(((metrics?.aiRecovered || 11420)) / 1000).toFixed(1)}k Live)</span>
              </div>
              <div className="w-full h-3.5 bg-gray-200 rounded-full overflow-hidden flex shadow-inner">
                <div className="h-full bg-[#D4FF00] w-1/4 rounded-full border-r-2 border-white"></div>
                <div className="h-full progress-bar-striped w-1/4 rounded-full border-r-2 border-white"></div>
                <div className="h-full bg-gray-300 w-1/4 border-r-2 border-white"></div>
                <div className="h-full bg-[#D4FF00] w-1/4 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Secondary Stats Block */}
          <div className="lg:col-span-4 bg-[#F4F5F7] rounded-3xl p-8 relative flex flex-col justify-between border border-white/70 shadow-sm">
            <Link
              href="/merchant/analytics"
              className="absolute top-6 right-6 w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <div>
              <p className="text-gray-500 text-xs font-semibold mb-1 uppercase tracking-wider">Incremental Revenue</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl md:text-4xl font-medium tracking-tight text-gray-900">
                  <span className="text-xl text-[#5e3bdb] mr-1">+₹</span>
                  {(metrics?.incrementalRevenue || 6840).toLocaleString()}.00
                </p>
                <span className="px-2.5 py-0.5 bg-white rounded-full text-[10px] font-bold border border-gray-200">
                  Modeled
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <div className="bg-gray-200/70 rounded-xl p-3.5 flex-1">
                <p className="text-[11px] text-gray-500 mb-1 font-mono">#Razorpay</p>
                <p className="text-xs font-bold text-gray-900">Card Retry</p>
              </div>
              <div className="bg-[#D4FF00] rounded-xl p-3.5 flex-1 shadow-sm">
                <p className="text-[11px] text-[#2a2a2a]/70 mb-1 font-mono font-bold">#UPI-Engine</p>
                <p className="text-xs font-extrabold text-[#2a2a2a]">84% Top Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2 font-bold text-xs">
            <span>Active filters</span>
            <span className="w-5 h-5 rounded-full bg-[#2a2a2a] text-white text-[10px] flex items-center justify-center">
              2
            </span>
          </div>

          <div className="flex gap-2">
            <span className="bg-white px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-700 flex items-center gap-1.5 border border-gray-200 shadow-sm">
              E-Commerce Shoes <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </span>
            <span className="bg-white px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-700 flex items-center gap-1.5 border border-gray-200 shadow-sm">
              All Gateways <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </span>
          </div>

          <div className="ml-auto bg-white rounded-full border border-gray-200 flex items-center px-4 py-2 w-full sm:w-64 shadow-sm">
            <input
              className="bg-transparent border-none outline-none text-xs w-full placeholder-gray-400 focus:ring-0 p-0 text-gray-800 font-medium"
              placeholder="Enter recovery ID #..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Main Dark Recovery Section */}
        <div className="bg-[#2a2a2a] rounded-[2.5rem] flex-1 p-6 md:p-10 flex flex-col relative text-white shadow-2xl border border-white/10 w-full">
          {/* Section Tabs Pill */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-white rounded-full p-1 flex items-center shadow-lg border border-gray-200 z-20">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterTab === "all" ? "bg-[#2a2a2a] text-white" : "text-gray-600 hover:text-black"
              }`}
            >
              All ({opportunities.length})
            </button>
            <button
              onClick={() => setFilterTab("pending")}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterTab === "pending" ? "bg-[#2a2a2a] text-white" : "text-gray-600 hover:text-black"
              }`}
            >
              <span>Pending</span>
              <span className="bg-gray-100 px-1.5 py-0.5 rounded-full text-[10px] text-gray-700">
                {opportunities.filter((o) => o.status !== "recovered").length}
              </span>
            </button>
            <button
              onClick={() => setFilterTab("action_required")}
              className={`px-5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                filterTab === "action_required" ? "bg-[#D4FF00] text-[#1c1b1b] shadow-sm" : "text-gray-600 hover:text-black"
              }`}
            >
              <span>Action Required</span>
              <span className="bg-[#2a2a2a] text-[#D4FF00] px-1.5 py-0.5 rounded-full text-[10px]">
                {opportunities.filter((o) => o.status === "recovery_recommended").length}
              </span>
            </button>
          </div>

          {/* Queue Header */}
          <div className="flex justify-between items-center mb-6 mt-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <span>Recovery Queue</span>
              <span className="w-2 h-2 rounded-full bg-[#D4FF00] animate-pulse"></span>
            </h2>
            <Link
              href="/merchant/recovery"
              className="text-xs text-[#D4FF00] hover:underline font-bold flex items-center gap-1"
            >
              <span>Open Detailed Recovery Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 2-Column Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start w-full">
            {/* Left Queue List (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredOpps.length === 0 ? (
                <div className="p-8 text-center text-white/50 text-xs">No recovery opportunities match the current filter.</div>
              ) : (
                filteredOpps.map((opp) => {
                const isSelected = activeFocus?.opportunityId === opp.opportunityId;
                return (
                  <div
                    key={opp.opportunityId}
                    onClick={() => setSelectedOpp(opp)}
                    className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-[#7A90A2]/25 border-[#7A90A2]/60 shadow-lg text-white"
                        : "bg-white/5 border-transparent hover:bg-white/10 text-white/70"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
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
                        <p className="text-sm font-bold text-white">{opp.opportunityId}</p>
                        <p className="text-xs text-white/50">{opp.failureType}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          opp.status === "recovered"
                            ? "bg-green-500/20 text-green-300 border border-green-500/30"
                            : opp.status === "recovery_recommended"
                            ? "bg-[#D4FF00]/20 text-[#D4FF00] border border-[#D4FF00]/40"
                            : "bg-white/10 text-white/70"
                        }`}
                      >
                        {opp.status.replace("_", " ")}
                      </span>
                      <span className="text-sm font-bold text-white font-mono">
                        ₹{opp.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              }))}
            </div>

            {/* Right Focused AI Recommendation Card (7 Cols) */}
            <div className="lg:col-span-7 bg-[#7A90A2]/20 border border-[#7A90A2]/40 rounded-3xl p-6 md:p-8 flex flex-col justify-between min-h-[420px] shadow-xl">
              {activeFocus ? (
                <>
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-xs font-mono text-[#D4FF00] font-bold uppercase tracking-wider block mb-1">
                          Active AI Recommendation
                        </span>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                          <span>{activeFocus.recommendedAction || "Alternate UPI Recovery"}</span>
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-white/60 block">Est. Recovery Value</span>
                        <span className="text-2xl font-black text-[#D4FF00]">
                          ₹{(activeFocus.expectedRecovery || Math.round(activeFocus.amount * 0.82)).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Probability & Key Signal */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                        <span className="text-[11px] text-white/60 uppercase block mb-1">Recovery Probability</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-white">
                            {Math.round((activeFocus.recoveryProbability || 0.82) * 100)}%
                          </span>
                          <span className="text-xs text-[#D4FF00] font-semibold">High Confidence</span>
                        </div>
                      </div>

                      <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                        <span className="text-[11px] text-white/60 uppercase block mb-1">Target Customer</span>
                        <span className="text-sm font-bold text-white block truncate">
                          {activeFocus.customerName || "Sarah Jenkins"}
                        </span>
                        <span className="text-[11px] text-white/60 font-mono">
                          {activeFocus.customerId || "CUS-8F42K1"}
                        </span>
                      </div>
                    </div>

                    {/* Explanation Quote */}
                    <div className="bg-black/30 p-4 rounded-2xl border border-white/10">
                      <p className="text-xs text-white/90 italic leading-relaxed">
                        "{activeFocus.recommendationReason || "Customer historically completes 4 of 5 transactions through UPI with zero friction."}"
                      </p>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                    <div className="text-xs text-white/60">
                      Status: <span className="text-white font-bold uppercase">{activeFocus.status.replace("_", " ")}</span>
                    </div>
                    <button
                      onClick={() => router.push(`/merchant/recovery`)}
                      className="bg-[#D4FF00] text-[#1c1b1b] font-bold px-6 py-3 rounded-full text-xs hover:bg-[#c5e128] transition-all flex items-center gap-2 shadow-lg"
                    >
                      <span>Open Decision Detail</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-white/50 text-sm">
                  No active opportunities in queue
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <DemoSimulatorModal />
    </div>
  );
}
