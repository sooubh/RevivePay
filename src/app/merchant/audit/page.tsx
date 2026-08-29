"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MerchantNav from "@/components/merchant/MerchantNav";
import DemoSimulatorModal from "@/components/simulator/DemoSimulatorModal";
import { dbService } from "@/lib/firebase/db";
import { AuditLog, MerchantPolicy } from "@/lib/types";
import {
  ArrowLeft,
  Download,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Sliders,
  Filter,
  Search,
  Save,
  Check
} from "lucide-react";

export default function MerchantAuditPage() {
  const router = useRouter();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [policy, setPolicy] = useState<MerchantPolicy | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Policy form state
  const [maxRetries, setMaxRetries] = useState(2);
  const [humanThreshold, setHumanThreshold] = useState(20000);
  const [minProbability, setMinProbability] = useState(20);

  useEffect(() => {
    const unsubLogs = dbService.subscribeAuditLogs((logs) => {
      setAuditLogs(logs);
    });

    dbService.getMerchantPolicy().then((p) => {
      setPolicy(p);
      setMaxRetries(p.maxRetries);
      setHumanThreshold(p.humanApprovalThreshold);
      setMinProbability(Math.round(p.minimumRecoveryProbability * 100));
    });

    return () => unsubLogs();
  }, []);

  const handleSavePolicy = async () => {
    setSavingPolicy(true);
    try {
      const updated = await dbService.updateMerchantPolicy({
        maxRetries,
        humanApprovalThreshold: humanThreshold,
        minimumRecoveryProbability: minProbability / 100
      });
      setPolicy(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (e) {
      console.error("Error updating policy:", e);
    } finally {
      setSavingPolicy(false);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (filterType !== "ALL" && log.actorType !== filterType && log.eventType !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        (log.opportunityId && log.opportunityId.toLowerCase().includes(q)) ||
        (log.agentName && log.agentName.toLowerCase().includes(q))
      );
    }
    return true;
  });

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
              <div>
                <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-gray-900 leading-none">
                  Audit
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Every AI decision, recovery action, and guardrail check is recorded with immutable timestamps.
                </p>
              </div>
            </div>

            <button
              onClick={() => alert("Audit log export downloaded in JSON format.")}
              className="bg-white border border-gray-300 rounded-full px-5 py-2.5 text-xs font-bold text-gray-800 flex items-center gap-2 hover:bg-gray-50 shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-[#5e3bdb]" />
              <span>Export Audit Trail</span>
            </button>
          </header>

          {/* 2-Column Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start">
            {/* Left Column: Chronological Event Timeline (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 md:p-8 border border-white/80 shadow-sm space-y-6">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {["ALL", "AI_AGENT", "GUARDRAIL_ENGINE", "SYSTEM", "CUSTOMER"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilterType(f)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                        filterType === f
                          ? "bg-[#2a2a2a] text-[#D4FF00]"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {f.replace("_", " ")}
                    </button>
                  ))}
                </div>

                <div className="bg-gray-100 rounded-full px-3.5 py-1.5 flex items-center w-48 text-xs">
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-gray-800 text-xs focus:ring-0 p-0"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>

              {/* Timeline Stream */}
              <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
                {filteredLogs.map((log) => {
                  let badgeColor = "bg-gray-100 text-gray-800";
                  if (log.actorType === "AI_AGENT") badgeColor = "bg-[#D4FF00]/40 text-black";
                  else if (log.actorType === "GUARDRAIL_ENGINE") badgeColor = "bg-purple-100 text-purple-900";
                  else if (log.actorType === "CUSTOMER") badgeColor = "bg-green-100 text-green-900";

                  return (
                    <div
                      key={log.auditId}
                      className="p-4 rounded-2xl border border-gray-100 bg-[#f8f9fc] hover:bg-white transition-colors space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                            {log.agentName || log.actorType}
                          </span>
                          <span className="font-mono text-xs font-bold text-gray-800">
                            {log.eventType}
                          </span>
                          {log.opportunityId && (
                            <span className="text-[11px] font-mono text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                              {log.opportunityId}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-mono text-gray-400">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <p className="text-xs text-gray-800 leading-relaxed font-medium">
                        {log.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Active Guardrails & Stopping Rules (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Active Guardrails Card */}
              <div className="bg-[#2a2a2a] text-white rounded-3xl p-8 shadow-xl border border-white/10 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#D4FF00]" />
                      <span>Guardrail Engine</span>
                    </h3>
                    <p className="text-xs text-white/60">Deterministic stopping rules enforce safety before execution</p>
                  </div>
                  <span className="px-3 py-1 bg-[#D4FF00] text-black text-[10px] font-extrabold rounded-full uppercase">
                    Active
                  </span>
                </div>

                {/* Rules List */}
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white block">Maximum Retries</span>
                      <span className="text-white/50 text-[11px]">Stops repeated automated attempts</span>
                    </div>
                    <span className="font-mono font-bold text-[#D4FF00]">{maxRetries} Retries</span>
                  </div>

                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white block">Human Approval Threshold</span>
                      <span className="text-white/50 text-[11px]">Orders above this require manual sign-off</span>
                    </div>
                    <span className="font-mono font-bold text-[#D4FF00]">₹{humanThreshold.toLocaleString()}</span>
                  </div>

                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white block">Minimum Recovery Probability</span>
                      <span className="text-white/50 text-[11px]">Suppresses low-value intervention</span>
                    </div>
                    <span className="font-mono font-bold text-[#D4FF00]">{minProbability}%</span>
                  </div>

                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white block">Customer Message Cap</span>
                      <span className="text-white/50 text-[11px]">Prevents customer contact fatigue</span>
                    </div>
                    <span className="font-mono font-bold text-[#D4FF00]">1 per incident</span>
                  </div>
                </div>
              </div>

              {/* Policy Editor Form */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-white/80 shadow-sm space-y-4">
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#5e3bdb]" />
                  <span>Configure Guardrail Thresholds</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                      Max Retries (1–5)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={maxRetries}
                      onChange={(e) => setMaxRetries(Number(e.target.value))}
                      className="w-full bg-[#f8f9fc] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 font-mono focus:border-[#5e3bdb] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                      Human Escalation Threshold (₹)
                    </label>
                    <input
                      type="number"
                      step={5000}
                      value={humanThreshold}
                      onChange={(e) => setHumanThreshold(Number(e.target.value))}
                      className="w-full bg-[#f8f9fc] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 font-mono focus:border-[#5e3bdb] outline-none"
                    />
                  </div>

                  <button
                    onClick={handleSavePolicy}
                    disabled={savingPolicy}
                    className="w-full bg-[#2a2a2a] text-[#D4FF00] font-bold py-3 px-4 rounded-xl text-xs hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                  >
                    {savedSuccess ? <Check className="w-4 h-4 text-[#D4FF00]" /> : <Save className="w-4 h-4" />}
                    <span>{savedSuccess ? "Guardrails Saved!" : "Save Policy"}</span>
                  </button>
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
