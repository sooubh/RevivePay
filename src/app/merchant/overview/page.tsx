"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MerchantNav from "@/components/merchant/MerchantNav";
import DemoSimulatorModal from "@/components/simulator/DemoSimulatorModal";
import { dbService } from "@/lib/firebase/db";
import { RecoveryOpportunity, OverviewMetrics, Order } from "@/lib/types";
import {
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  Truck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Package,
  ShoppingBag,
  ExternalLink
} from "lucide-react";

export default function MerchantOverviewPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [opportunities, setOpportunities] = useState<RecoveryOpportunity[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<"cases" | "orders">("cases");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const unsubMetrics = dbService.subscribeMetrics((data) => {
      setMetrics(data);
    });

    const unsubOpps = dbService.subscribeOpportunities((data) => {
      setOpportunities(data);
    });

    const unsubOrders = dbService.subscribeOrders((data) => {
      setOrders(data);
    });

    return () => {
      unsubMetrics();
      unsubOpps();
      unsubOrders();
    };
  }, []);

  const handleResetDemoSeed = async () => {
    setResetting(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      const res = await fetch("/api/seed", { method: "GET" });
      const data = await res.json();
      if (data.metrics) setMetrics(data.metrics);
      const ordersRes = await fetch("/api/orders");
      const ordersData = await ordersRes.json();
      if (ordersData.orders) setOrders(ordersData.orders);
    } catch (e) {
      console.error("Reset error:", e);
    } finally {
      setResetting(false);
    }
  };

  const returnOpps = opportunities.filter((o) => o.sourceType === "return");
  const ndrOpps = opportunities.filter((o) => o.sourceType === "ndr");
  const recoveredOpps = opportunities.filter((o) => o.status === "recovered");
  const pendingOpps = opportunities.filter((o) => o.status !== "recovered");

  return (
    <div className="bg-[#EFF4F8] text-[#191c1e] font-sans min-h-screen w-full flex flex-col selection:bg-[#D4FF00] selection:text-black">
      <MerchantNav />

      <main className="flex-1 px-4 md:px-10 lg:px-12 py-8 flex flex-col w-full max-w-[1600px] mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">
                Merchant Overview
              </h1>
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4FF00] animate-pulse" />
            </div>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              Autonomous revenue recovery across customer Returns and Failed COD (NDR) • Live Store Orders
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDemoSeed}
              disabled={resetting}
              className="px-4 py-2 rounded-full bg-white hover:bg-gray-50 border border-gray-300 text-xs font-bold text-gray-700 flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
              title="Reset to 2 clean demo cases"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
              <span>{resetting ? "Resetting..." : "Reset Demo Data"}</span>
            </button>

            <Link
              href="/merchant/recovery"
              className="px-5 py-2.5 rounded-full bg-[#2a2a2a] text-[#D4FF00] hover:bg-black text-xs font-extrabold flex items-center gap-2 transition-all shadow-md"
            >
              <span>Open Recovery Queue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Hero KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Card 1: Revenue at Risk */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block mb-1">
                Revenue at Risk
              </span>
              <p className="text-3xl font-black tracking-tight text-gray-900 font-mono">
                ₹{(metrics?.revenueAtRisk ?? 0).toLocaleString()}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>{pendingOpps.length} cases awaiting resolution</span>
            </p>
          </div>

          {/* Card 2: AI Revenue Retained */}
          <div className="bg-[#2a2a2a] text-white rounded-3xl p-6 border border-white/10 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#D4FF00]/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <span className="text-[11px] text-[#D4FF00] uppercase font-extrabold tracking-wider block mb-1">
                AI Revenue Retained
              </span>
              <p className="text-3xl font-black tracking-tight text-[#D4FF00] font-mono">
                ₹{(metrics?.aiRecovered ?? 0).toLocaleString()}
              </p>
            </div>
            <p className="text-xs text-white/70 mt-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#D4FF00]" />
              <span>{recoveredOpps.length} sales retained (100%)</span>
            </p>
          </div>

          {/* Card 3: Active Cases */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block mb-1">
                Active Cases
              </span>
              <p className="text-3xl font-black tracking-tight text-gray-900 font-mono">
                {opportunities.length}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>{pendingOpps.length} pending • {recoveredOpps.length} recovered</span>
            </p>
          </div>

          {/* Card 4: Store Orders */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block mb-1">
                Store Orders
              </span>
              <p className="text-3xl font-black tracking-tight text-gray-900 font-mono">
                {orders.length}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
              <span>{orders.filter(o => o.status === "paid" || o.status === "recovered").length} completed • {orders.filter(o => o.status === "return_requested").length} returns</span>
            </p>
          </div>
        </div>

        {/* Tabbed Section: Recovery Cases vs Store Orders */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("cases")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeTab === "cases"
                    ? "bg-[#2a2a2a] text-[#D4FF00] shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Recovery Cases ({opportunities.length})
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeTab === "orders"
                    ? "bg-[#2a2a2a] text-[#D4FF00] shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Store Orders ({orders.length})
              </button>
            </div>

            <Link
              href="/merchant/recovery"
              className="text-xs font-bold text-[#b32a03] hover:underline flex items-center gap-1"
            >
              <span>Manage Full Recovery Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activeTab === "cases" ? (
            /* Tab 1: Recovery Cases */
            <div className="divide-y divide-gray-100">
              {opportunities.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">No active recovery cases.</div>
              ) : (
                opportunities.map((opp) => (
                  <div
                    key={opp.opportunityId}
                    onClick={() => router.push(`/merchant/recovery?id=${opp.opportunityId}`)}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 px-3 rounded-2xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          opp.sourceType === "return"
                            ? "bg-purple-100 text-purple-900"
                            : "bg-blue-100 text-blue-900"
                        }`}
                      >
                        {opp.sourceType === "return" ? <RefreshCw className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-gray-900">{opp.opportunityId}</span>
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                            {opp.sourceType}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">({opp.orderId})</span>
                        </div>
                        <span className="text-xs text-gray-500">{opp.customerName} • {opp.productName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-gray-900">
                        ₹{opp.amount.toLocaleString()}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          opp.status === "recovered"
                            ? "bg-green-100 text-green-800"
                            : "bg-[#D4FF00]/50 text-gray-900"
                        }`}
                      >
                        {opp.status === "recovered" ? "Retained" : "Action Ready"}
                      </span>
                      {opp.status !== "recovered" && (
                        <Link
                          href={`/merchant/recovery?id=${opp.opportunityId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 bg-[#2a2a2a] text-[#D4FF00] hover:bg-black font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all shadow-sm"
                        >
                          <span>Take Action</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Tab 2: Store Orders (All Orders) */
            <div className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">No orders placed yet. Place an order in the customer storefront to see it appear here!</div>
              ) : (
                orders.map((order) => {
                  const firstItem = order.items && order.items[0];
                  const hasOpp = opportunities.find((o) => o.orderId === order.orderId);

                  return (
                    <div
                      key={order.orderId}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 px-3 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {firstItem?.imageUrl ? (
                          <div className="w-10 h-10 rounded-xl bg-[#fee2dc]/40 border border-[#e3beb6]/40 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                            <img src={firstItem.imageUrl} alt={firstItem.name} className="w-full h-full object-contain mix-blend-multiply" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#fee2dc]/40 flex items-center justify-center">
                            <Package className="w-5 h-5 text-[#b32a03]" />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-gray-900">{order.orderId}</span>
                            <span className="text-xs font-bold text-gray-800">{order.customerName}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{new Date(order.createdAt).toLocaleDateString()}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {firstItem?.name || "Shoe"} {firstItem?.size ? `(Size ${firstItem.size})` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-gray-900">
                          ₹{order.total.toLocaleString()}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            order.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : order.status === "return_requested"
                              ? "bg-amber-100 text-amber-800"
                              : order.status === "recovered"
                              ? "bg-[#D4FF00]/40 text-black"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {order.status === "paid"
                            ? "Paid • Delivered"
                            : order.status === "return_requested"
                            ? "Return Requested"
                            : order.status === "recovered"
                            ? "Exchanged"
                            : "COD Pending"}
                        </span>

                        {/* Action button */}
                        {hasOpp ? (
                          <Link
                            href={`/merchant/recovery?id=${hasOpp.opportunityId}`}
                            className="px-3 py-1.5 bg-[#D4FF00] hover:bg-[#c5e128] text-black font-extrabold rounded-lg text-[11px] flex items-center gap-1 transition-all shadow-sm"
                          >
                            <span>Review Recovery Case</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <Link
                            href={`/store/orders/${order.orderId}`}
                            target="_blank"
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all"
                          >
                            <span>Customer View</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>

      <DemoSimulatorModal />
    </div>
  );
}