"use client";

import React, { useState } from "react";
import { Zap, RefreshCw, CheckCircle, AlertTriangle, Play, X, ShieldAlert } from "lucide-react";

export default function DemoSimulatorModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scenario, setScenario] = useState<string>("return_size_issue");
  const [amount, setAmount] = useState<number>(4999);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleScenarioChange = (sc: string) => {
    setScenario(sc);
    if (sc === "return_size_issue") setAmount(4999);
    else if (sc === "ndr_cash_unavailable") setAmount(3499);
  };

  const handleTrigger = async () => {
    setLoading(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/simulator/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          customAmount: amount,
          customerId: "CUS-8F42K1"
        })
      });
      const data = await res.json();
      setLastResult(data);
    } catch (e) {
      console.error("Simulation error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSeed = async () => {
    setLoading(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      setLastResult({ message: "Database reset to initial demo state." });
    } catch (e) {
      console.error("Reset error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Dock */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2a2a2a] text-[#D4FF00] hover:bg-black font-bold text-xs rounded-full shadow-2xl border border-[#D4FF00]/40 transition-all hover:scale-105 active:scale-95"
        >
          <Zap className="w-4 h-4 text-[#D4FF00] animate-bounce" />
          <span>Demo Simulator</span>
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1c1c1c] text-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-white/10 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#D4FF00] text-black flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Revenue Recovery Simulator</h3>
                <p className="text-xs text-white/60">Injects test scenarios into the real revenue-recovery pipeline</p>
              </div>
            </div>

            {/* Scenario Selection */}
            <div className="space-y-2 mb-6">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider block">
                Select Scenario
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    id: "return_size_issue",
                    label: "Return: Size Issue → Size Exchange (₹4,999)",
                    desc: "Customer reported Size 9 too small on Aeon Runner. AI evaluates Size 10 Exchange to retain 100% revenue."
                  },
                  {
                    id: "ndr_cash_unavailable",
                    label: "NDR: COD Cash Unavailable → Pay Online (₹3,499)",
                    desc: "Customer lacks cash on delivery attempt 1. AI converts COD to Razorpay prepaid so delivery proceeds immediately."
                  }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleScenarioChange(item.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      scenario === item.id
                        ? "bg-[#D4FF00]/10 border-[#D4FF00] text-white"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-xs text-white">{item.label}</span>
                      {scenario === item.id && <span className="w-2 h-2 rounded-full bg-[#D4FF00]" />}
                    </div>
                    <p className="text-[11px] text-white/50 mt-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Override */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-white/70 block mb-2">
                Transaction Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm text-white font-mono focus:border-[#D4FF00] focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleTrigger}
                disabled={loading}
                className="flex-1 bg-[#D4FF00] text-black font-bold py-3 px-4 rounded-xl text-sm hover:bg-[#c5e128] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                <span>Inject Event</span>
              </button>

              <button
                onClick={handleResetSeed}
                disabled={loading}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                title="Reset Database to Default"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Seed</span>
              </button>
            </div>

            {/* Feedback / Outcome */}
            {lastResult && (
              <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-[#D4FF00] font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Simulation Dispatched</span>
                </div>
                {lastResult.opportunityId && (
                  <p className="text-white/80">Opportunity ID: <span className="font-mono text-white">{lastResult.opportunityId}</span></p>
                )}
                {lastResult.recommendedAction && (
                  <p className="text-white/80">AI Strategy: <span className="text-[#D4FF00]">{lastResult.recommendedAction}</span> ({Math.round((lastResult.recoveryProbability || 0) * 100)}% est. probability)</p>
                )}
                {lastResult.message && <p className="text-white/80">{lastResult.message}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
