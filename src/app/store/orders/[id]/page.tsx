"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import DemoSimulatorModal from "@/components/simulator/DemoSimulatorModal";
import { Order } from "@/lib/types";
import { ArrowLeft, Package, CheckCircle2, RefreshCw, AlertCircle, Truck, ArrowRight, ExternalLink } from "lucide-react";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [returnFiling, setReturnFiling] = useState(false);
  const [returnFiled, setReturnFiled] = useState(false);
  const [returnResult, setReturnResult] = useState<any>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) return;
      // 1. Try local storage first
      const savedOrders = localStorage.getItem("revivepay_orders");
      if (savedOrders) {
        try {
          const orders: Order[] = JSON.parse(savedOrders);
          const found = orders.find((o) => o.orderId === orderId);
          if (found) {
            setOrder(found);
            if (found.status === "return_requested") {
              setReturnFiled(true);
            }
          }
        } catch (e) {}
      }

      // 2. Fetch from API to get fresh server data
      try {
        const res = await fetch(`/api/orders?id=${encodeURIComponent(orderId)}`);
        const data = await res.json();
        if (data.success && data.order) {
          setOrder(data.order);
          if (data.order.status === "return_requested") {
            setReturnFiled(true);
          }
        }
      } catch (e) {} finally {
        setLoading(false);
      }
    }

    loadOrder();

    const savedCart = localStorage.getItem("revivepay_cart");
    if (savedCart) {
      try {
        setCartCount(JSON.parse(savedCart).length);
      } catch (e) {}
    }
  }, [orderId]);

  const handleReturnItem = async () => {
    if (!order) return;
    setReturnFiling(true);
    try {
      const customer = JSON.parse(localStorage.getItem("revivepay_customer") || "{}");
      const res = await fetch("/api/simulator/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: "return_size_issue",
          customAmount: order.total,
          customerId: customer?.customerId || order.customerId || "CUS-8F42K1"
        })
      });
      const data = await res.json();
      setReturnResult(data);
      setReturnFiled(true);

      // Update order status to return_requested
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, status: "return_requested" })
      });

      setOrder((prev) => (prev ? { ...prev, status: "return_requested" } : null));

      try {
        const savedOrders = JSON.parse(localStorage.getItem("revivepay_orders") || "[]");
        const updated = savedOrders.map((o: any) =>
          o.orderId === order.orderId ? { ...o, status: "return_requested" } : o
        );
        localStorage.setItem("revivepay_orders", JSON.stringify(updated));
      } catch (e) {}
    } catch (e) {
      console.error("Return filing error:", e);
    } finally {
      setReturnFiling(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#fff8f6] text-[#271814] font-sans min-h-screen flex flex-col">
        <StoreHeader cartCount={cartCount} />
        <main className="flex-grow pt-[110px] pb-24 px-6 md:px-16 max-w-[900px] mx-auto w-full flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-[#b32a03] mx-auto mb-3" />
            <p className="text-sm font-bold text-[#5a413a]">Loading order details...</p>
          </div>
        </main>
        <StoreFooter />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-[#fff8f6] text-[#271814] font-sans min-h-screen flex flex-col">
        <StoreHeader cartCount={cartCount} />
        <main className="flex-grow pt-[110px] pb-24 px-6 md:px-16 max-w-[900px] mx-auto w-full flex items-center justify-center">
          <div className="text-center bg-white p-10 rounded-3xl border border-[#e3beb6]/40 shadow-sm max-w-md">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
            <p className="text-sm text-[#5a413a] mb-5 font-mono">{orderId}</p>
            <Link href="/store/orders" className="inline-block px-5 py-2.5 rounded-full bg-[#b32a03] text-white font-bold text-xs hover:bg-[#8a1c00] transition-colors">
              Back to My Orders
            </Link>
          </div>
        </main>
        <StoreFooter />
      </div>
    );
  }

  const item = order.items && order.items[0];

  return (
    <div className="bg-[#fff8f6] text-[#271814] font-sans min-h-screen flex flex-col relative overflow-x-hidden">
      <StoreHeader cartCount={cartCount} />

      <main className="flex-grow pt-[110px] pb-24 px-4 sm:px-6 md:px-16 max-w-[900px] mx-auto w-full">
        {/* Back navigation */}
        <button
          onClick={() => router.push("/store/orders")}
          className="flex items-center gap-2 text-sm text-[#5a413a] hover:text-[#b32a03] font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Orders</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#271814] tracking-tight">
              Order Details
            </h1>
            <p className="text-xs text-[#5a413a] font-mono mt-0.5">{order.orderId}</p>
          </div>

          <div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                order.status === "paid"
                  ? "bg-green-100 text-green-800"
                  : order.status === "return_requested"
                  ? "bg-amber-100 text-amber-800"
                  : order.status === "recovered"
                  ? "bg-[#D4FF00]/50 text-gray-900"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {order.status === "paid"
                ? "Delivered • Paid"
                : order.status === "return_requested"
                ? "Return Filed"
                : order.status === "recovered"
                ? "Exchange Confirmed"
                : "COD Delivery Paused"}
            </span>
          </div>
        </div>

        {/* Order Items Card */}
        <div className="bg-white rounded-3xl border border-[#e3beb6]/40 shadow-sm p-6 md:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-5 pb-6 border-b border-gray-100">
            {item?.imageUrl ? (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#fee2dc]/40 border border-[#e3beb6]/40 p-3 shrink-0 flex items-center justify-center overflow-hidden">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-[#fee2dc]/40 flex items-center justify-center">
                <Package className="w-8 h-8 text-[#b32a03]" />
              </div>
            )}

            <div className="flex-1">
              <span className="text-[10px] font-extrabold uppercase text-[#b32a03] tracking-wider">{item?.brand || "Brand"}</span>
              <h2 className="text-xl font-bold text-[#271814]">{item?.name || "Footwear"}</h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                <div>
                  <span className="text-[11px] text-[#5a413a] uppercase font-bold tracking-wider block">Quantity</span>
                  <span className="font-bold text-[#271814]">{item?.quantity || 1}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#5a413a] uppercase font-bold tracking-wider block">Shoe Size</span>
                  <span className="font-bold text-[#271814]">US {item?.size || "9"}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#5a413a] uppercase font-bold tracking-wider block">Unit Price</span>
                  <span className="font-bold text-[#b32a03]">₹{(item?.price || order.total).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#5a413a] uppercase font-bold tracking-wider block">Order Placed</span>
                  <span className="font-bold text-[#271814]">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing breakdown */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1.5 text-[#5a413a]">
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#271814] block mb-1">Customer & Delivery</span>
              <p className="text-[#271814] font-medium">{order.customerName}</p>
              <p>{order.customerEmail}</p>
              {order.shippingAddress && (
                <p className="text-[11px]">{order.shippingAddress.address}, {order.shippingAddress.city} {order.shippingAddress.zipcode}</p>
              )}
            </div>

            <div className="space-y-2 border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100">
              <div className="flex justify-between text-[#5a413a]">
                <span>Subtotal</span>
                <span>₹{(order.subtotal || order.total).toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between text-[#5a413a]">
                <span>Shipping</span>
                <span>{order.shipping === 0 ? "FREE" : `₹${order.shipping}.00`}</span>
              </div>
              <div className="flex justify-between text-[#5a413a]">
                <span>GST (5%)</span>
                <span>Included</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                <span className="font-bold text-[#271814] text-sm">Total Paid</span>
                <span className="font-mono font-black text-lg text-[#b32a03]">₹{order.total.toLocaleString()}.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Return / Refund or NDR Recovery Section */}
        {order.status === "pending" ? (
          <div className="bg-white rounded-3xl border border-blue-200 shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#271814]">COD Delivery Paused (Cash Unavailable)</h3>
                <p className="text-xs text-[#5a413a]">
                  Cash could not be collected at delivery attempt 1. Pay ₹{order.total.toLocaleString()} online via Razorpay to instantly unpause delivery.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/store/payment?oppId=TXN-NDR-001&orderId=${order.orderId}&type=ndr`}
                className="flex-1 bg-[#2a2a2a] text-[#D4FF00] hover:bg-black font-extrabold py-3.5 px-6 rounded-full text-xs transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <span>Pay ₹{order.total.toLocaleString()} via Razorpay Online</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : !returnFiled && order.status !== "recovered" ? (
          <div className="bg-white rounded-3xl border border-[#e3beb6]/40 shadow-sm p-6 md:p-8">
            <h3 className="text-lg font-bold text-[#271814] mb-1">Need help with this order?</h3>
            <p className="text-xs text-[#5a413a] mb-5">
              Shoe doesn't fit or size issue? Request a free instant size exchange or refund.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleReturnItem}
                disabled={returnFiling}
                className="flex-1 bg-[#b32a03] text-white font-bold py-3.5 px-6 rounded-full text-sm hover:bg-[#8a1c00] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#b32a03]/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${returnFiling ? "animate-spin" : ""}`} />
                <span>{returnFiling ? "Filing return..." : "Return or Exchange Item (Size Issue)"}</span>
              </button>

              <button
                onClick={handleReturnItem}
                disabled={returnFiling}
                className="flex-1 bg-[#fee2dc] text-[#b32a03] font-bold py-3.5 px-6 rounded-full text-sm hover:bg-[#f8dcd6] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{returnFiling ? "Processing..." : "Request Refund"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border-2 border-[#D4FF00] shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#D4FF00] flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#271814]">
                  {order.status === "recovered" ? "Size 10 Exchange Dispatched" : "Return Filed — Resolution Available"}
                </h3>
                <p className="text-xs text-[#5a413a]">
                  {order.status === "recovered"
                    ? "Your replacement shoe (Size 10) is confirmed and out for delivery."
                    : "Size 10 is reserved in stock for you. Accept the 1-click exchange offer to avoid waiting for a refund."}
                </p>
              </div>
            </div>

            <div className="bg-[#f8f9fc] rounded-2xl p-4 border border-gray-100 mb-5 space-y-1.5 text-xs">
              <p className="text-[#5a413a]">
                Case ID: <span className="font-mono font-bold text-[#271814]">{returnResult?.opportunityId || "TXN-RETURN-001"}</span>
              </p>
              <p className="text-[#5a413a]">
                Recommended Resolution: <span className="font-bold text-[#b32a03]">Size 10 Exchange (In Stock • 100% Value Preserved)</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/store/payment?oppId=${returnResult?.opportunityId || "TXN-RETURN-001"}&orderId=${order.orderId}&type=return`}
                className="flex-1 bg-[#D4FF00] hover:bg-[#c5e128] text-black font-extrabold py-3 px-6 rounded-full text-xs transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <span>Accept Size 10 Exchange Offer</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/merchant/recovery?id=${returnResult?.opportunityId || "TXN-RETURN-001"}`}
                className="flex-1 bg-[#2a2a2a] text-white hover:bg-black font-bold py-3 px-6 rounded-full text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>View in Merchant Recovery Queue</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#D4FF00]" />
              </Link>
            </div>
          </div>
        )}
      </main>

      <StoreFooter />
      <DemoSimulatorModal />
    </div>
  );
}