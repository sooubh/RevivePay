"use client";

import React, { useState } from "react";
import { Sparkles, X, Send, TrendingUp, ShieldCheck, ArrowRight, Bot, Lightbulb, CheckCircle2, Zap } from "lucide-react";

interface CopilotResponse {
  summary: string;
  detailedInsights: string[];
  projectedRevenueImpact: string;
  suggestedActions: { label: string; category: string }[];
}

export default function ReviveCopilotModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<CopilotResponse | null>(null);

  const samplePrompts = [
    "Why are card declines the highest failure category?",
    "How much incremental revenue was recovered via UPI?",
    "What happens if I increase approval threshold to ₹30,000?",
    "Summarize today's recovery performance and bank health status"
  ];

  const handleAsk = async (queryToAsk?: string) => {
    const q = queryToAsk || inputQuery;
    if (!q.trim() || loading) return;

    setLoading(true);
    setInputQuery(q);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q })
      });
      const data = await res.json();
      if (data.answer) {
        setResponse(data.answer);
      }
    } catch (e) {
      console.error("Copilot query failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Copilot Launcher Pill */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#2a2a2a] text-[#D4FF00] hover:bg-black px-4 py-3 rounded-full font-extrabold text-xs shadow-2xl flex items-center gap-2.5 border border-[#D4FF00]/40 transition-all hover:scale-105"
        >
          <span className="w-6 h-6 rounded-full bg-[#D4FF00] text-black flex items-center justify-center font-black">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <span>Ask Revive Copilot</span>
          <span className="px-1.5 py-0.5 bg-white/10 text-[9px] rounded-md text-white font-mono">Gemini AI</span>
        </button>
      </div>

      {/* Copilot Modal / Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#1e1e1e] text-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D4FF00] text-black flex items-center justify-center font-black shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">RevivePay AI Copilot</h3>
                  <p className="text-xs text-white/60">Executive natural language assistant for revenue optimization</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-white/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Response / Prompts Area */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6">
              {/* If no response yet, show greeting & sample prompts */}
              {!response && !loading && (
                <div className="space-y-4 text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 text-[#D4FF00] flex items-center justify-center mx-auto">
                    <Lightbulb className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-white">How can I assist your revenue recovery today?</h4>
                    <p className="text-xs text-white/60 mt-1 max-w-md mx-auto">
                      Ask anything about payment failures, bank health, dynamic incentives, or model policy adjustments.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 text-left">
                    {samplePrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAsk(prompt)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-xs text-white/80 hover:text-white transition-all text-left flex items-center justify-between group"
                      >
                        <span className="line-clamp-2">{prompt}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#D4FF00] opacity-0 group-hover:opacity-100 shrink-0 ml-2 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#D4FF00] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-white/70 font-medium animate-pulse">
                    Synthesizing multi-agent database telemetry & predictive model...
                  </p>
                </div>
              )}

              {/* Structured AI Response */}
              {response && !loading && (
                <div className="space-y-5 animate-fade-in">
                  {/* Summary Card */}
                  <div className="p-4 bg-white/5 rounded-2xl border border-[#D4FF00]/30 space-y-2">
                    <span className="text-[11px] font-mono text-[#D4FF00] uppercase tracking-wider font-bold block">
                      Executive Summary
                    </span>
                    <p className="text-sm font-medium text-white leading-relaxed">{response.summary}</p>
                  </div>

                  {/* Detailed Insights */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/60">Key Operational Drivers</span>
                    <div className="space-y-2">
                      {response.detailedInsights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-white/80 p-2.5 bg-white/5 rounded-xl border border-white/5">
                          <CheckCircle2 className="w-4 h-4 text-[#D4FF00] shrink-0 mt-0.5" />
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Projected Impact */}
                  <div className="p-3.5 bg-[#D4FF00]/10 rounded-2xl border border-[#D4FF00]/40 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <TrendingUp className="w-4 h-4 text-[#D4FF00]" />
                      <span className="font-bold text-white">Projected Recovery Lift:</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-[#D4FF00]">
                      {response.projectedRevenueImpact}
                    </span>
                  </div>

                  {/* Render Recommended Actions */}
                  {response.suggestedActions && response.suggestedActions.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                        Recommended Strategic Actions
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {response.suggestedActions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAsk(action.label)}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-left flex items-center justify-between group transition-all"
                          >
                            <div>
                              <span className="text-xs font-bold text-white block">{action.label}</span>
                              <span className="text-[10px] font-mono text-[#D4FF00] uppercase font-bold">{action.category}</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-[#D4FF00] opacity-0 group-hover:opacity-100 shrink-0 ml-2 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sample prompt quick chips for follow-up */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {samplePrompts.slice(0, 2).map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAsk(p)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-[11px] text-white/80 transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="pt-4 border-t border-white/10 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAsk();
                }}
                className="flex items-center gap-2 bg-white/10 rounded-full p-1.5 border border-white/20"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask Revive Copilot about payment trends, failure causes, or policy tweaks..."
                  className="flex-1 bg-transparent px-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !inputQuery.trim()}
                  className="w-9 h-9 rounded-full bg-[#D4FF00] text-black font-bold flex items-center justify-center hover:bg-[#b8de00] transition-colors disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
