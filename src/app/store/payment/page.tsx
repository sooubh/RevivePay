"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import DemoSimulatorModal from "@/components/simulator/DemoSimulatorModal";
import confetti from "canvas-confetti";
import { dbService } from "@/lib/firebase/db";
import { RecoveryOpportunity } from "@/lib/types";
import {
  CreditCard,
  QrCode,
  Building2,
  Lock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Tag,
  Zap,
  Smartphone,
  Truck
} from "lucide-react";

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId") || "ORD-DEMO-001";
  const rzpOrderParam = searchParams.get("rzpOrder") || "";
  const oppIdParam = searchParams.get("oppId") || "";
  const queryAmount = Number(searchParams.get("amount")) || 4999;
  const nameParam = searchParams.get("name") || "";

  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking" | "cod">("upi");
  const [loading, setLoading] = useState(false);
  const [isRecovered, setIsRecovered] = useState(false);
  const [failureState, setFailureState] = useState<any>(null);
  const [activeOppId, setActiveOppId] = useState<string>(oppIdParam);
  const [customer, setCustomer] = useState<any>(null);
  const [rzpLoaded, setRzpLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [opportunityData, setOpportunityData] = useState<RecoveryOpportunity | null>(null);
  const [countdown, setCountdown] = useState<number>(895);

  // Active countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Dynamically inject Razorpay Standard Web Checkout Script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRzpLoaded(true);
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    // Load Customer info
    const savedCustomer = localStorage.getItem("revivepay_customer");
    if (savedCustomer) {
      try {
        setCustomer(JSON.parse(savedCustomer));
      } catch (e) {}
    } else if (nameParam) {
      setCustomer({ name: decodeURIComponent(nameParam), customerId: "CUS-8F42K1" });
    }

    // Subscribe to recovery opportunity if oppId in URL query
    if (oppIdParam) {
      setActiveOppId(oppIdParam);
      const unsub = dbService.subscribeOpportunityById(oppIdParam, (opp) => {
        if (opp) {
          setOpportunityData(opp);
          setFailureState({
            success: true,
            opportunityId: opp.opportunityId,
            recommendedAction: opp.recommendedAction,
            recoveryProbability: opp.recoveryProbability,
            recommendationReason: opp.recommendationReason,
            selectedStrategy: opp.selectedStrategy,
            amount: opp.amount
          });
          // Auto-hydrate customer if missing in localStorage
          if (opp.customerName || opp.customerEmail || opp.customerId) {
            setCustomer((prev: any) => ({
              ...prev,
              customerId: opp.customerId || prev?.customerId || "CUS-8F42K1",
              name: opp.customerName || prev?.name || "Customer",
              email: opp.customerEmail || prev?.email || "customer@example.com"
            }));
          }
          // Dynamic countdown synchronization based on creation timestamp
          if (opp.createdAt) {
            const elapsedSec = Math.floor((Date.now() - new Date(opp.createdAt).getTime()) / 1000);
            const totalExpiry = opp.incentiveOffer?.expirySeconds || 900;
            setCountdown(Math.max(0, totalExpiry - elapsedSec));
          }
          if (opp.status === "recovered") {
            setIsRecovered(true);
          }
        }
      });
      return () => unsub();
    }
  }, [oppIdParam, nameParam]);

  // Dynamic Net Recovery Amount after margin-safe incentive deductions
  const netRecoveryAmount = useMemo(() => {
    const base = opportunityData?.amount || failureState?.amount || queryAmount;
    if (opportunityData?.incentiveOffer && opportunityData.incentiveOffer.type !== "none") {
      const discount = opportunityData.incentiveOffer.discountAmount || 0;
      return Math.max(1, base - discount);
    }
    return base;
  }, [opportunityData, failureState, queryAmount]);

  // Standard Razorpay Web Checkout
  const handleRazorpayStandardCheckout = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const targetAmount = opportunityData?.amount || failureState?.amount || queryAmount;
      const targetOrderId = opportunityData?.orderId || orderId;

      const createRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: targetAmount,
          currency: "INR",
          receipt: targetOrderId,
          customerId: customer?.customerId || "CUS-8F42K1",
          customerName: customer?.name || "Sarah Jenkins",
          customerEmail: customer?.email || "sarah.j@example.com"
        })
      });

      const orderData = await createRes.json();
      if (!orderData.success || !orderData.order_id) {
        throw new Error(orderData.error || "Failed to create order on server");
      }

      if (typeof window !== "undefined" && (window as any).Razorpay) {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || orderData.key_id || "",
          amount: orderData.amount_paise || targetAmount * 100,
          currency: "INR",
          name: "RevenueOS Footwear",
          description: `Order ${orderData.receipt || targetOrderId}`,
          image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAfmxkAm9FxGl0cDWrdx4CipB_VGxi9X58jaQB9jyK7lLuDpEqIgKOTSqd4fKHnLCV8NYJj3RcHfPw3ZJ9sOr7gHPLllmwGEQk6AVXkawwCyexA9qpOe9te5yC3N7dMEramc9XRyUEJUfL4v7d-UW5BnhGfans41N3kwtG5ARGBTDzhBdjjI5Y1CAfnGkSfb8TYfgzAhtx1jbsPIMN0YzVbciNk2xTbkCrKnwK3M-THAxPfdXz-lDj-",
          order_id: orderData.order_id,
          prefill: {
            name: customer?.name || "Sarah Jenkins",
            email: customer?.email || "sarah.j@example.com",
            contact: customer?.phone || "+919876543210"
          },
          theme: {
            color: "#b32a03"
          },
          handler: async function (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) {
            try {
              const verifyRes = await fetch("/api/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: orderData.orderId || targetOrderId,
                  opportunityId: activeOppId || oppIdParam,
                  amount: targetAmount,
                  customerId: customer?.customerId || "CUS-8F42K1"
                })
              });

              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                setLoading(false);
                setIsRecovered(true);
                localStorage.removeItem("revivepay_cart");
                const currentTargetId = opportunityData?.orderId || orderId;
                try {
                  await fetch("/api/orders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId: currentTargetId, status: "paid" })
                  });
                  const savedOrders = JSON.parse(localStorage.getItem("revivepay_orders") || "[]");
                  const updated = savedOrders.map((o: any) =>
                    o.orderId === currentTargetId ? { ...o, status: "paid", updatedAt: new Date().toISOString() } : o
                  );
                  localStorage.setItem("revivepay_orders", JSON.stringify(updated));
                } catch (e) {}
                try {
                  confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
                } catch (e) {}
              } else {
                setLoading(false);
                setErrorMessage(verifyData.error || "Signature verification failed.");
              }
            } catch (vErr) {
              setLoading(false);
              setErrorMessage("Error verifying payment signature with server.");
            }
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function (resp: any) {
          setLoading(false);
          setErrorMessage(resp?.error?.description || "Payment was not completed. Please try again.");
        });
        rzp.open();
      } else {
        handleSimulatedDirectPayment();
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || "Failed to launch Razorpay checkout.");
    }
  };

  const handleConfirmExchange = async () => {
    if (!activeOppId) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/recovery/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: activeOppId,
          action: "confirm_exchange"
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsRecovered(true);
        localStorage.removeItem("revivepay_cart");
        const currentTargetId = opportunityData?.orderId || orderId;
        try {
          await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: currentTargetId, status: "recovered" })
          });
          const savedOrders = JSON.parse(localStorage.getItem("revivepay_orders") || "[]");
          const updated = savedOrders.map((o: any) =>
            o.orderId === currentTargetId ? { ...o, status: "recovered", updatedAt: new Date().toISOString() } : o
          );
          localStorage.setItem("revivepay_orders", JSON.stringify(updated));
        } catch (e) {}
        try {
          confetti({
            particleCount: 140,
            spread: 80,
            origin: { y: 0.6 }
          });
        } catch (e) {}
      } else {
        setErrorMessage(data.error || "Exchange confirmation failed.");
      }
    } catch (e: any) {
      setErrorMessage(e?.message || "Network error during exchange.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedDirectPayment = () => {
    setLoading(true);
    setTimeout(async () => {
      setLoading(false);
      setIsRecovered(true);
      localStorage.removeItem("revivepay_cart");
      const currentTargetId = opportunityData?.orderId || orderId;
      const orderStatus = paymentMethod === "cod" ? "pending" : "paid";
      try {
        await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: currentTargetId, status: orderStatus })
        });
        const savedOrders = JSON.parse(localStorage.getItem("revivepay_orders") || "[]");
        const updated = savedOrders.map((o: any) =>
          o.orderId === currentTargetId ? { ...o, status: orderStatus, updatedAt: new Date().toISOString() } : o
        );
        localStorage.setItem("revivepay_orders", JSON.stringify(updated));
      } catch (e) {}
      try {
        confetti({ particleCount: 100, spread: 60 });
      } catch (e) {}
    }, 1000);
  };

  return (
    <div className="bg-[#fff8f6] text-[#271814] font-sans min-h-screen w-full flex flex-col relative overflow-x-hidden">
      <StoreHeader />

      <main className="flex-grow pt-[110px] pb-24 px-4 sm:px-6 md:px-12 xl:px-16 w-full max-w-[1440px] mx-auto">
        {/* Responsive Step Indicator */}
        {opportunityData?.sourceType === "return" ? (
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-8 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center text-[#5a413a]">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#fee2dc] text-[#b32a03] flex items-center justify-center mr-1.5 font-black text-xs">1</span>
              <span>Size Return</span>
            </div>
            <div className="h-[2px] w-6 sm:w-12 bg-[#b32a03]"></div>
            <div className="flex items-center text-[#b32a03]">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#b32a03] text-white flex items-center justify-center mr-1.5 shadow-sm font-black text-xs">2</span>
              <span>{isRecovered ? "Confirmed" : "Exchange Offer"}</span>
            </div>
          </div>
        ) : opportunityData?.sourceType === "ndr" ? (
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-8 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center text-[#5a413a]">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#fee2dc] text-[#b32a03] flex items-center justify-center mr-1.5 font-black text-xs">1</span>
              <span>Delivery Paused</span>
            </div>
            <div className="h-[2px] w-6 sm:w-12 bg-[#b32a03]"></div>
            <div className="flex items-center text-[#b32a03]">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#b32a03] text-white flex items-center justify-center mr-1.5 shadow-sm font-black text-xs">2</span>
              <span>{isRecovered ? "Delivery Resumed" : "Pay Online"}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-8 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center text-[#5a413a]">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#fee2dc] text-[#b32a03] flex items-center justify-center mr-1.5 font-black text-xs">1</span>
              <span>Info</span>
            </div>
            <div className="h-[2px] w-4 sm:w-8 md:w-16 bg-[#b32a03]"></div>
            <div className="flex items-center text-[#b32a03]">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#b32a03] text-white flex items-center justify-center mr-1.5 shadow-sm font-black text-xs">2</span>
              <span>Payment</span>
            </div>
            <div className="h-[2px] w-4 sm:w-8 md:w-16 bg-[#e3beb6]/40"></div>
            <div className="flex items-center text-[#5a413a] opacity-60">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-[#e3beb6] flex items-center justify-center mr-1.5 font-black text-xs">3</span>
              <span>Confirm</span>
            </div>
          </div>
        )}

        {/* State A: Success Confirmation */}
        {isRecovered ? (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-2xl border border-[#e3beb6]/40 text-center space-y-6 animate-scale">
            <div className="w-20 h-20 rounded-full bg-[#D4FF00] text-black flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3.5 py-1 bg-[#D4FF00]/30 text-black border border-[#D4FF00] text-xs font-extrabold rounded-full uppercase tracking-wider">
                {opportunityData?.sourceType === "return"
                  ? "Size Exchange Confirmed"
                  : opportunityData?.sourceType === "ndr"
                  ? "COD Converted to Prepaid"
                  : "Payment Captured & Recovered"}
              </span>
              <h1 className="text-3xl font-extrabold text-[#271814] mt-3">
                {opportunityData?.sourceType === "return"
                  ? "Exchange Dispatched!"
                  : opportunityData?.sourceType === "ndr"
                  ? "Delivery Resumed!"
                  : "Order Confirmed!"}
              </h1>
              <p className="text-sm text-[#5a413a] mt-2">
                Thank you, <span className="font-bold text-[#271814]">{customer?.name || "Customer"}</span>!{" "}
                {opportunityData?.sourceType === "return" ? (
                  <>
                    Your replacement for{" "}
                    <span className="font-bold text-[#271814]">{opportunityData?.productName || "Aeon Performance Runner"}</span> in{" "}
                    <span className="font-extrabold text-black">Size {opportunityData?.replacementSize || "10"}</span> is confirmed. Free doorstep pickup & exchange is on the way!
                  </>
                ) : opportunityData?.sourceType === "ndr" ? (
                  <>
                    Your payment of{" "}
                    <span className="font-extrabold text-[#b32a03]">₹{(opportunityData?.amount || queryAmount).toLocaleString()}.00</span> via Razorpay was successfully captured. Your courier delivery is unpaused and out for doorstep delivery!
                  </>
                ) : (
                  <>
                    Your payment of{" "}
                    <span className="font-extrabold text-[#b32a03]">₹{netRecoveryAmount.toLocaleString()}.00</span> was successfully processed.
                  </>
                )}
              </p>
            </div>

            <div className="p-4 bg-[#f8f9fc] rounded-2xl border border-[#e3beb6]/30 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-[#5a413a]">Order Number</span>
                <span className="font-mono font-bold text-[#271814]">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5a413a]">
                  {opportunityData?.sourceType === "return"
                    ? "Exchange Action"
                    : opportunityData?.sourceType === "ndr"
                    ? "Delivery Status"
                    : "Payment Rail"}
                </span>
                <span className="font-bold text-[#271814]">
                  {opportunityData?.sourceType === "return"
                    ? `Size ${opportunityData?.replacementSize || "10"} Doorstep Replacement`
                    : opportunityData?.sourceType === "ndr"
                    ? "Delivery Active (Prepaid Confirmed)"
                    : "UPI Instant Intent Rail"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5a413a]">
                  {opportunityData?.sourceType === "return" || opportunityData?.sourceType === "ndr" ? "Revenue Retained" : "Status"}
                </span>
                <span className="text-green-600 font-bold">
                  {opportunityData?.sourceType === "return" || opportunityData?.sourceType === "ndr"
                    ? `₹${(opportunityData?.amount || queryAmount).toLocaleString()}.00 (100% Retained)`
                    : "Captured & Verified"}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/store/orders/${orderId}`}
                  className="flex-1 bg-[#b32a03] text-white font-bold py-3.5 px-6 rounded-full text-sm hover:bg-[#8a1c00] transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  <span>View Order Details</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/store/orders"
                  className="flex-1 bg-[#fee2dc] text-[#b32a03] font-bold py-3.5 px-6 rounded-full text-sm hover:bg-[#f8dcd6] transition-colors flex items-center justify-center gap-2"
                >
                  <span>My Orders</span>
                </Link>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/merchant/recovery"
                  className="flex-1 bg-[#2a2a2a] text-[#D4FF00] font-bold py-3 px-6 rounded-full text-xs hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  <span>View Merchant Realtime Update</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/store"
                  className="flex-1 bg-[#f8f9fc] text-[#271814] border border-[#e3beb6] font-bold py-3 px-6 rounded-full text-xs hover:bg-white transition-colors flex items-center justify-center gap-2"
                >
                  <span>Continue Shopping</span>
                </Link>
              </div>
            </div>
          </div>
        ) : failureState ? (
          /* State B: Customer High-Converting Recovery Experience */
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 md:p-12 shadow-2xl border-2 border-[#D4FF00] text-center space-y-6 animate-scale">
            {opportunityData?.sourceType === "return" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-[#D4FF00] text-black flex items-center justify-center mx-auto shadow-sm">
                  <RefreshCw className="w-8 h-8" />
                </div>

                <div>
                  <span className="px-3.5 py-1 bg-[#D4FF00]/30 text-black border border-[#D4FF00] text-[11px] font-extrabold rounded-full uppercase tracking-wider">
                    Instant Size Exchange
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-[#271814] mt-3">
                    Your size doesn’t fit? Exchange for Size {opportunityData.replacementSize || "10"}
                  </h2>
                  <p className="text-sm text-[#5a413a] mt-2">
                    We reserved <span className="font-bold text-[#271814]">{opportunityData.productName || "Aeon Performance Runner"}</span> in{" "}
                    <span className="font-extrabold text-black">Size {opportunityData.replacementSize || "10"}</span> for you. Free doorstep exchange with zero hassle.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-left">
                    {errorMessage}
                  </div>
                )}

                {/* Sizing Comparison Card */}
                <div className="p-4 bg-[#f8f9fc] rounded-2xl border border-gray-200 grid grid-cols-2 gap-4 text-xs text-left">
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Current Size</span>
                    <p className="font-bold text-[#271814] text-sm mt-0.5">Size {opportunityData.currentSize || "9"}</p>
                    <span className="text-[10px] text-red-600 font-semibold block mt-1">Reported Too Tight</span>
                  </div>
                  <div className="p-3 bg-[#D4FF00]/20 border border-[#D4FF00] rounded-xl shadow-xs">
                    <span className="text-[10px] text-black uppercase font-extrabold block">Replacement</span>
                    <p className="font-black text-black text-sm mt-0.5">Size {opportunityData.replacementSize || "10"}</p>
                    <span className="text-[10px] text-green-700 font-bold block mt-1">✓ In Stock (8 units)</span>
                  </div>
                </div>

                {/* Single Confirmation Button */}
                <button
                  onClick={handleConfirmExchange}
                  disabled={loading}
                  className="w-full bg-[#2a2a2a] hover:bg-black text-[#D4FF00] font-extrabold py-4 px-6 rounded-full text-base transition-all flex items-center justify-center gap-2 shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-[#D4FF00]" />
                  )}
                  <span>Confirm Exchange (Size {opportunityData.replacementSize || "10"})</span>
                  <ArrowRight className="w-5 h-5 text-[#D4FF00]" />
                </button>

                <p className="text-[11px] text-gray-500">
                  Preserves original order value (₹{queryAmount.toLocaleString()}.00) • Zero extra cost • Free doorstep exchange
                </p>
              </>
            ) : opportunityData?.sourceType === "ndr" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-[#D4FF00] text-black flex items-center justify-center mx-auto shadow-sm">
                  <Truck className="w-8 h-8" />
                </div>

                <div>
                  <span className="px-3.5 py-1 bg-[#D4FF00]/30 text-black border border-[#D4FF00] text-[11px] font-extrabold rounded-full uppercase tracking-wider">
                    Cash On Delivery (COD) Paused
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-[#271814] mt-3">
                    Cash not handy? Pay online to receive your delivery
                  </h2>
                  <p className="text-sm text-[#5a413a] mt-2">
                    Delivery for order <span className="font-mono font-bold text-[#271814]">{orderId}</span> was paused because cash was unavailable on attempt 1. Pay securely online via Razorpay now to resume doorstep delivery with zero cash collection hassle.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-left">
                    {errorMessage}
                  </div>
                )}

                {/* Order Summary Card */}
                <div className="p-4 bg-[#f8f9fc] rounded-2xl border border-gray-200 text-xs text-left space-y-2.5">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-500 font-medium">Order Item</span>
                    <span className="font-bold text-[#271814]">{opportunityData.productName || "Aeon Performance Runner"}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-500 font-medium">Delivery Partner</span>
                    <span className="font-mono text-[#271814]">BlueDart Express (Attempt 1 Paused)</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-500 font-medium">Original Payment Method</span>
                    <span className="font-bold text-amber-800">Cash on Delivery (COD)</span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="font-bold text-[#271814] text-sm">Total Payable Amount</span>
                    <span className="font-mono font-black text-xl text-[#271814]">
                      ₹{(opportunityData.amount || 3499).toLocaleString()}.00
                    </span>
                  </div>
                </div>

                {/* Single Primary CTA Button */}
                <button
                  onClick={handleRazorpayStandardCheckout}
                  disabled={loading}
                  className="w-full bg-[#2a2a2a] hover:bg-black text-[#D4FF00] font-extrabold py-4 px-6 rounded-full text-base transition-all flex items-center justify-center gap-2 shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-[#D4FF00]" />
                  )}
                  <span>Pay ₹{(opportunityData.amount || 3499).toLocaleString()} via Razorpay</span>
                  <ArrowRight className="w-5 h-5 text-[#D4FF00]" />
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span>Secured by Razorpay • Instant confirmation • Courier unpaused immediately</span>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-[#D4FF00] text-black flex items-center justify-center mx-auto shadow-sm">
                  <CreditCard className="w-8 h-8" />
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-[#271814]">Complete Your Payment</h2>
                  <p className="text-sm text-[#5a413a] mt-2">
                    Pay securely online to finalize order <span className="font-mono font-bold text-[#271814]">{orderId}</span>.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-left">
                    {errorMessage}
                  </div>
                )}

                <button
                  onClick={handleRazorpayStandardCheckout}
                  disabled={loading}
                  className="w-full bg-[#2a2a2a] hover:bg-black text-[#D4FF00] font-extrabold py-4 px-6 rounded-full text-base transition-all flex items-center justify-center gap-2 shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5 text-[#D4FF00]" />}
                  <span>Pay ₹{netRecoveryAmount.toLocaleString()} via Razorpay</span>
                  <ArrowRight className="w-5 h-5 text-[#D4FF00]" />
                </button>
              </>
            )}
          </div>
        ) : (
          /* State C: Payment Selection & Test Gateway */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Payment Options */}
            <div className="lg:col-span-7 space-y-6">
              <section className="bg-white p-6 md:p-8 rounded-3xl border border-[#e3beb6]/40 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-[#271814] mb-2">Select Payment Method</h2>

                {/* Option 1: UPI */}
                <label
                  onClick={() => setPaymentMethod("upi")}
                  className={`flex items-start p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "upi"
                      ? "border-[#b32a03] bg-[#fee2dc]/30 shadow-sm"
                      : "border-[#e3beb6] hover:border-[#b32a03]"
                  }`}
                >
                  <input
                    type="radio"
                    checked={paymentMethod === "upi"}
                    onChange={() => setPaymentMethod("upi")}
                    className="mt-1 mr-3 text-[#b32a03] focus:ring-[#b32a03]"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-[#271814]">UPI / Mobile Wallets</span>
                      <QrCode className="w-4 h-4 text-[#5a413a]" />
                    </div>
                    <p className="text-xs text-[#5a413a] mt-0.5">Google Pay, PhonePe, Paytm, BHIM</p>
                  </div>
                </label>

                {/* Option 2: Card */}
                <label
                  onClick={() => setPaymentMethod("card")}
                  className={`flex items-start p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "card"
                      ? "border-[#b32a03] bg-[#fee2dc]/30 shadow-sm"
                      : "border-[#e3beb6] hover:border-[#b32a03]"
                  }`}
                >
                  <input
                    type="radio"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                    className="mt-1 mr-3 text-[#b32a03] focus:ring-[#b32a03]"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-[#271814]">Credit / Debit Card</span>
                      <CreditCard className="w-4 h-4 text-[#5a413a]" />
                    </div>
                    <p className="text-xs text-[#5a413a] mt-0.5">Visa, Mastercard, RuPay, Amex</p>
                  </div>
                </label>

                {/* Option 3: Netbanking */}
                <label
                  onClick={() => setPaymentMethod("netbanking")}
                  className={`flex items-start p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "netbanking"
                      ? "border-[#b32a03] bg-[#fee2dc]/30 shadow-sm"
                      : "border-[#e3beb6] hover:border-[#b32a03]"
                  }`}
                >
                  <input
                    type="radio"
                    checked={paymentMethod === "netbanking"}
                    onChange={() => setPaymentMethod("netbanking")}
                    className="mt-1 mr-3 text-[#b32a03] focus:ring-[#b32a03]"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-[#271814]">Netbanking</span>
                      <Building2 className="w-4 h-4 text-[#5a413a]" />
                    </div>
                    <p className="text-xs text-[#5a413a] mt-0.5">All major Indian banks supported</p>
                  </div>
                </label>

                {/* Option 4: COD */}
                <label
                  onClick={() => setPaymentMethod("cod")}
                  className={`flex items-start p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "cod"
                      ? "border-[#b32a03] bg-[#fee2dc]/30 shadow-sm"
                      : "border-[#e3beb6] hover:border-[#b32a03]"
                  }`}
                >
                  <input
                    type="radio"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="mt-1 mr-3 text-[#b32a03] focus:ring-[#b32a03]"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-[#271814]">Cash on Delivery (COD)</span>
                      <Truck className="w-4 h-4 text-[#5a413a]" />
                    </div>
                    <p className="text-xs text-[#5a413a] mt-0.5">Pay via cash or UPI QR at doorstep upon delivery</p>
                  </div>
                </label>
              </section>
            </div>

            {/* Right: Summary & Real Razorpay Checkout Pay */}
            <aside className="lg:col-span-5 sticky top-28">
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e3beb6]/40 shadow-xl space-y-6">
                <h3 className="text-xl font-bold text-[#271814]">Order Total</h3>

                <div className="space-y-3 text-xs text-[#5a413a]">
                  <div className="flex justify-between">
                    <span>Order Reference</span>
                    <span className="font-mono font-bold text-[#271814]">{orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount</span>
                    <span className="font-bold text-[#271814]">₹{queryAmount.toLocaleString()}.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%)</span>
                    <span className="font-bold text-[#271814]">Included</span>
                  </div>
                  <div className="border-t border-[#e3beb6]/40 pt-3 flex justify-between items-center">
                    <span className="text-base font-bold text-[#271814]">Amount Due</span>
                    <span className="text-2xl font-black text-[#b32a03]">₹{queryAmount.toLocaleString()}.00</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                    {errorMessage}
                  </div>
                )}

                <button
                  onClick={paymentMethod === "cod" ? handleSimulatedDirectPayment : handleRazorpayStandardCheckout}
                  disabled={loading}
                  className="w-full bg-[#b32a03] text-white font-bold py-4 px-6 rounded-full text-sm hover:bg-[#8a1c00] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#b32a03]/25 disabled:opacity-50"
                >
                  {paymentMethod === "cod" ? (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>{loading ? "Placing Order..." : `Place Order with COD (₹${queryAmount.toLocaleString()})`}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>{loading ? "Launching Gateway..." : `Pay ₹${queryAmount.toLocaleString()} with Razorpay`}</span>
                    </>
                  )}
                </button>

                <div className="flex flex-col items-center gap-2 text-[11px] text-[#5a413a] opacity-80 pt-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#b32a03]" />
                    <span>Razorpay Standard Web Checkout</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      <StoreFooter />
      <DemoSimulatorModal />
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fff8f6] flex items-center justify-center text-sm font-bold text-[#b32a03]">Loading payment recovery...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
