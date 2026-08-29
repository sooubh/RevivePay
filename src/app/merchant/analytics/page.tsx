"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MerchantNav from "@/components/merchant/MerchantNav";
import DemoSimulatorModal from "@/components/simulator/DemoSimulatorModal";
import { dbService } from "@/lib/firebase/db";
import { OverviewMetrics } from "@/lib/types";
import {
  ArrowLeft,
  Download,
  TrendingUp,
  Sparkles,
  PieChart,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck
} from "lucide-react";

export default function MerchantAnalyticsPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);

  useEffect(() => {
    const unsub = dbService.subscribeMetrics((data) => {
      setMetrics(data);
    });
    return () => unsub();
  }, []);

  const atRisk = metrics?.revenueAtRisk || 24850;
  const recovered = metrics?.aiRecovered || 11420;
  const rate = metrics?.recoveryRate || 45.9;
  const incremental = metrics?.incrementalRevenue || 6840;

  return (
    <div className="bg-[#E5E5E5] text-[#191c1e] font-sans min-h-screen py-8 px-4 flex justify-center selection:bg-[#D4FF00] selection:text-black">
      <div className="bg-[#EFF4F8] w-full max-w-[1440px] min-h-[920px] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-white/60">
        <MerchantNav />

        {/* Main Content */}
        <main className="flex-1 px-6 md:px-12 pb-12 flex flex-col z-0 relative">
          {/* Header */}
          <header className="flex items-center justify-between mb-8 mt-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/merchant/overview")}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-gray-900 leading-none">
                Analytics
              </h1>
            </div>

            <button
              onClick={() => alert("Recovery performance report downloaded.")}
              className="bg-white border border-gray-300 rounded-full px-5 py-2.5 text-xs font-bold text-gray-800 flex items-center gap-2 hover:bg-gray-50 shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-[#5e3bdb]" />
              <span>Export Report</span>
            </button>
          </header>

          {/* 4 Core Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-[#F4F5F7] rounded-3xl p-6 border border-white/70 shadow-sm flex flex-col justify-between">
              <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Revenue at Risk</span>
              <p className="text-3xl font-medium tracking-tight text-gray-900 mt-2">
                <span className="text-lg text-gray-400 mr-1">₹</span>
                {atRisk.toLocaleString()}.00
              </p>
              <span className="text-[11px] text-gray-500 mt-2">Identified across failed checkouts</span>
            </div>

            <div className="bg-[#F4F5F7] rounded-3xl p-6 border border-white/70 shadow-sm flex flex-col justify-between">
              <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">AI Recovered</span>
              <p className="text-3xl font-medium tracking-tight text-gray-900 mt-2">
                <span className="text-lg text-[#5e3bdb] mr-1">₹</span>
                {recovered.toLocaleString()}.00
              </p>
              <span className="text-[11px] text-[#5e3bdb] font-bold mt-2">⚡ +18.4% vs unassisted retries</span>
            </div>

            <div className="bg-[#F4F5F7] rounded-3xl p-6 border border-white/70 shadow-sm flex flex-col justify-between">
              <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Recovery Rate</span>
              <p className="text-3xl font-medium tracking-tight text-gray-900 mt-2">
                {rate}
                <span className="text-xl text-gray-400 ml-1">%</span>
              </p>
              <span className="text-[11px] text-gray-500 mt-2">Target benchmark: 40.0%</span>
            </div>

            <div className="bg-[#F4F5F7] rounded-3xl p-6 border border-white/70 shadow-sm flex flex-col justify-between">
              <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Incremental Revenue</span>
              <p className="text-3xl font-medium tracking-tight text-gray-900 mt-2">
                <span className="text-lg text-[#5e3bdb] mr-1">+₹</span>
                {incremental.toLocaleString()}.00
              </p>
              <span className="text-[11px] text-gray-500 mt-2">Net modeled merchant uplift</span>
            </div>
          </div>

          {/* 2-Column Split Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start">
            {/* Left Column: Trend Chart & Channels (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Monthly Recovery Trend */}
              <div className="bg-white rounded-3xl p-8 border border-white/80 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Recovery Trend (Last 4 Months)</h3>
                    <p className="text-xs text-gray-500">Volume comparison between Revenue at Risk vs AI Recovered</p>
                  </div>
                  <span className="px-3 py-1 bg-[#D4FF00]/30 text-black text-xs font-bold rounded-full border border-[#D4FF00]">
                    Dec Live Sync
                  </span>
                </div>

                {/* Bars */}
                <div className="grid grid-cols-4 gap-6 pt-4 text-center">
                  {[
                    { month: "Sep", risk: 18000, rec: 9200 },
                    { month: "Oct", risk: 22400, rec: 10800 },
                    { month: "Nov", risk: 26100, rec: 12400 },
                    { month: "Dec", risk: atRisk, rec: recovered }
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className="w-full h-40 bg-gray-100 rounded-2xl p-2 flex flex-col justify-end gap-1.5 relative overflow-hidden">
                        <div
                          className="w-full bg-gray-300 rounded-lg transition-all"
                          style={{ height: `${Math.min(100, (item.risk / 30000) * 100)}%` }}
                          title={`At Risk: ₹${item.risk.toLocaleString()}`}
                        />
                        <div
                          className="w-full bg-[#D4FF00] rounded-lg shadow-sm transition-all"
                          style={{ height: `${Math.min(100, (item.rec / 30000) * 100)}%` }}
                          title={`Recovered: ₹${item.rec.toLocaleString()}`}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-800">{item.month}</span>
                      <span className="text-[10px] text-gray-500 font-mono">₹{(item.rec / 1000).toFixed(1)}k rec</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center gap-6 text-xs font-semibold text-gray-600 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gray-300" />
                    <span>Revenue at Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#D4FF00]" />
                    <span>AI Recovered</span>
                  </div>
                </div>
              </div>

              {/* Best Performing Channels */}
              <div className="bg-white rounded-3xl p-8 border border-white/80 shadow-sm space-y-4">
                <h3 className="font-bold text-lg text-gray-900">Best Performing Recovery Methods</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>UPI 1-Click Alternate Payment</span>
                      <span className="text-[#5e3bdb]">65% of Total Recoveries (₹7,423)</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#5e3bdb] rounded-full" style={{ width: "65%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Instant Gateway Retry</span>
                      <span className="text-gray-700">25% of Total Recoveries (₹2,855)</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-800 rounded-full" style={{ width: "25%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Smart Scheduled Retry (Delayed)</span>
                      <span className="text-gray-700">10% of Total Recoveries (₹1,142)</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-400 rounded-full" style={{ width: "10%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: AI Insights & Leakage (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* AI Key Insight Card */}
              <div className="bg-[#2a2a2a] text-white rounded-3xl p-8 shadow-xl border border-white/10 space-y-4 relative overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-[#D4FF00] text-black flex items-center justify-center font-bold shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white">AI Strategy Insight</h3>
                <p className="text-xs text-white/80 leading-relaxed">
                  "UPI currently has the highest recovery probability (84%) for failed footwear purchases in the ₹1,000–₹5,000 segment. Automated routing prevented customer churn on 18 transactions this month without merchant intervention."
                </p>

                <div className="pt-3 border-t border-white/10 text-xs flex justify-between items-center text-white/60">
                  <span>Engine: Multi-Agent v2.4</span>
                  <span className="text-[#D4FF00] font-bold">Optimal Policy Active</span>
                </div>
              </div>

              {/* Revenue Leakage Summary */}
              <div className="bg-white rounded-3xl p-8 border border-white/80 shadow-sm space-y-4">
                <h3 className="font-bold text-base text-gray-900">Revenue Leakage Breakdown</h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-red-50 rounded-2xl border border-red-100 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-red-900 block">Card Issuer Fraud & Limit Checks</span>
                      <span className="text-red-700 text-[11px]">Primary decline cause for orders &gt; ₹10k</span>
                    </div>
                    <span className="font-mono font-bold text-red-900 text-sm">48%</span>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-amber-900 block">NPCI / Gateway Network Timeouts</span>
                      <span className="text-amber-700 text-[11px]">Transient UPI failures</span>
                    </div>
                    <span className="font-mono font-bold text-amber-900 text-sm">32%</span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-gray-900 block">Checkout Drop-Off & Abandonment</span>
                      <span className="text-gray-600 text-[11px]">Exited payment window</span>
                    </div>
                    <span className="font-mono font-bold text-gray-900 text-sm">20%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <DemoSimulatorModal />
    </div>
  );
}
