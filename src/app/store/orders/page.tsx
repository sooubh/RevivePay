"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import DemoSimulatorModal from "@/components/simulator/DemoSimulatorModal";
import { Order } from "@/lib/types";
import { Package, ChevronRight, ShoppingBag, RefreshCw, ArrowRight, Truck, CheckCircle2, AlertCircle } from "lucide-react";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        const serverOrders: Order[] = data.success && Array.isArray(data.orders) ? data.orders : [];

        const savedOrders: Order[] = JSON.parse(localStorage.getItem("revivepay_orders") || "[]");

        const orderMap = new Map<string, Order>();
        serverOrders.forEach((o) => orderMap.set(o.orderId, o));
        savedOrders.forEach((o) => {
          const existing = orderMap.get(o.orderId);
          orderMap.set(o.orderId, { ...existing, ...o });
        });

        const merged = Array.from(orderMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setOrders(merged);
        localStorage.setItem("revivepay_orders", JSON.stringify(merged));
      } catch (e) {
        const savedOrders = localStorage.getItem("revivepay_orders");
        if (savedOrders) {
          try {
            setOrders(JSON.parse(savedOrders));
          } catch (err) {}
        }
      } finally {
        setLoading(false);
      }
    }

    loadOrders();

    const savedCart = localStorage.getItem("revivepay_cart");
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart);
        setCartCount(items.length);
      } catch (e) {}
    }
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-green-100 text-green-800">Delivered • Paid</span>;
      case "return_requested":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Return Requested</span>;
      case "recovered":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#D4FF00]/40 text-black flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-700" /> Exchange Dispatched</span>;
      case "pending":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 flex items-center gap-1"><Truck className="w-3 h-3" /> COD Delivery Paused</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="bg-[#fff8f6] text-[#271814] font-sans min-h-screen flex flex-col relative overflow-x-hidden">
      <StoreHeader cartCount={cartCount} />

      <main className="flex-grow pt-[110px] pb-24 px-4 sm:px-6 md:px-16 max-w-[960px] mx-auto w-full">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#271814] tracking-tight">
              My Orders
            </h1>
            <p className="text-sm text-[#5a413a] mt-1">
              View your order history, delivery status, and request returns or exchanges
            </p>
          </div>
          <Link
            href="/store"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#b32a03] hover:underline"
          >
            <span>Continue Shopping</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl border border-[#e3beb6]/40 p-12 text-center text-sm font-bold text-[#5a413a]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#b32a03]" />
            Loading your orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#e3beb6]/40 shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#fee2dc] flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-7 h-7 text-[#b32a03]" />
            </div>
            <h3 className="text-lg font-bold text-[#271814] mb-2">No orders yet</h3>
            <p className="text-sm text-[#5a413a] mb-6">
              Browse our collection and place your first order.
            </p>
            <Link
              href="/store"
              className="inline-flex items-center gap-2 bg-[#b32a03] text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-[#8a1c00] transition-colors shadow-lg"
            >
              <span>Shop Now</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const firstItem = order.items && order.items[0];
              return (
                <div
                  key={order.orderId}
                  className="bg-white rounded-2xl border border-[#e3beb6]/40 shadow-sm p-5 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {firstItem?.imageUrl ? (
                        <div className="w-20 h-20 rounded-xl bg-[#fee2dc]/40 border border-[#e3beb6]/40 p-2 shrink-0 flex items-center justify-center overflow-hidden">
                          <img
                            src={firstItem.imageUrl}
                            alt={firstItem.name}
                            className="w-full h-full object-contain mix-blend-multiply"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-[#fee2dc]/40 flex items-center justify-center">
                          <Package className="w-7 h-7 text-[#b32a03]" />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-[#271814]">
                            {firstItem?.name || "Footwear Order"}
                          </h3>
                        </div>
                        <p className="text-xs text-[#5a413a] mt-0.5">
                          Size: <strong className="text-[#271814]">US {firstItem?.size || "9"}</strong> • Qty: {firstItem?.quantity || 1}
                        </p>
                        <p className="text-[11px] font-mono text-[#5a413a]/80 mt-1">
                          {order.orderId} • {new Date(order.createdAt).toLocaleDateString()}
                        </p>

                        <div className="mt-2.5">
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                      <span className="text-xl font-black text-[#271814]">
                        ₹{order.total.toLocaleString()}
                      </span>

                      <div className="flex items-center gap-2 mt-2">
                        {order.status === "paid" && (
                          <Link
                            href={`/store/orders/${order.orderId}`}
                            className="px-3 py-1.5 rounded-full bg-[#fee2dc] hover:bg-[#fbd3cb] text-[#b32a03] text-xs font-bold transition-colors"
                          >
                            Return / Exchange
                          </Link>
                        )}
                        {order.status === "pending" && (
                          <Link
                            href={`/store/payment?oppId=TXN-NDR-001&orderId=${order.orderId}&type=ndr`}
                            className="px-3 py-1.5 rounded-full bg-[#2a2a2a] hover:bg-black text-[#D4FF00] text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <span>Pay Online</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                        {order.status === "return_requested" && (
                          <Link
                            href={`/store/payment?oppId=TXN-RETURN-001&orderId=${order.orderId}&type=return`}
                            className="px-3 py-1.5 rounded-full bg-[#D4FF00] hover:bg-[#c5e128] text-black text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <span>View Exchange Offer</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                        <Link
                          href={`/store/orders/${order.orderId}`}
                          className="px-3.5 py-1.5 rounded-full bg-[#b32a03] hover:bg-[#8a1c00] text-white text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <StoreFooter />
      <DemoSimulatorModal />
    </div>
  );
}
