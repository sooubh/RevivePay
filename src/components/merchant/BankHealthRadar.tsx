"use client";

import React, { useState, useEffect } from "react";
import { BankHealthService } from "@/lib/telemetry/bankHealth";
import { BankHealthNode } from "@/lib/types";
import { Activity, ShieldCheck, AlertTriangle, RefreshCw, Zap, ArrowUpRight } from "lucide-react";

export default function BankHealthRadar() {
  const [nodes, setNodes] = useState<BankHealthNode[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setNodes(BankHealthService.getNodes());
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setNodes(BankHealthService.getNodes());
      setRefreshing(false);
    }, 600);
  };

  const optimalCount = nodes.filter((n) => n.status === "optimal").length;
  const degradedCount = nodes.filter((n) => n.status === "degraded").length;

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-white/80 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#2a2a2a] text-[#D4FF00] flex items-center justify-center font-bold shadow-md">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-gray-900">Bank & PSP Health Radar</h3>
              <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-[10px] font-extrabold rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                Live Telemetry
              </span>
            </div>
            <p className="text-xs text-gray-500">
              AI monitors network health across Indian banking rails to proactively route retries away from degraded nodes.
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#5e3bdb]" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Grid of Nodes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {nodes.map((node) => {
          const isOptimal = node.status === "optimal";
          return (
            <div
              key={node.code}
              className={`p-4 rounded-2xl border transition-all ${
                isOptimal
                  ? "bg-gray-50/70 border-gray-200/80 hover:border-gray-300"
                  : "bg-amber-50/80 border-amber-200 shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOptimal ? "bg-green-500 shadow-sm shadow-green-400" : "bg-amber-500 animate-ping"
                      }`}
                    />
                    <h4 className="font-bold text-xs text-gray-900">{node.bankName}</h4>
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 block uppercase mt-0.5">
                    {node.rail} Rail • {node.code}
                  </span>
                </div>

                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                    isOptimal ? "bg-white text-gray-800 border border-gray-200" : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}
                >
                  {node.successRate}%
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-200/60">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#5e3bdb]" />
                  <span>{node.latencyMs}ms latency</span>
                </span>
                <span
                  className={`font-semibold capitalize ${
                    isOptimal ? "text-green-700" : "text-amber-800"
                  }`}
                >
                  {isOptimal ? "Optimal" : "Degraded (Auto-Reroute)"}
                </span>
              </div>

              {!isOptimal && node.recommendedAlternative && (
                <div className="mt-2 text-[10px] bg-white p-2 rounded-xl border border-amber-200 text-amber-900 font-medium flex items-center justify-between">
                  <span>Failover: {node.recommendedAlternative}</span>
                  <ArrowUpRight className="w-3 h-3 text-amber-700" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Summary Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-100 font-medium">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>{optimalCount} Rails Operating Nominally</span>
          </span>
          {degradedCount > 0 && (
            <span className="flex items-center gap-1.5 text-amber-700 font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{degradedCount} Rail Degraded (Traffic Rerouted)</span>
            </span>
          )}
        </div>
        <span className="text-gray-400 font-mono text-[11px]">Orchestrator Failover: Sub-500ms Active</span>
      </div>
    </div>
  );
}
