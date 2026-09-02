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
  Smartphone
} from "lucide-react";

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId") || "ORD-DEMO-001";
  const rzpOrderParam = searchParams.get("rzpOrder") || "";
  const oppIdParam = searchParams.get("oppId") || "";
  const queryAmount = Number(searchParams.get("amount")) || 4999;
  const nameParam = searchParams.get("name") || "";

  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [loading, setLoading] = useState(false);
  const [isRecovered, setIsRecovered] = useState(false);
  const [failureState, setFailureState] = useState<any>(null);
  const [activeOppId, setActiveOppId] = useState<string>(oppIdParam);
  const [customer, setCustomer] = useState<any>(null);
  const [rzpLoaded, setRzpLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [opportunityData, setOpportunityData] = useState<RecoveryOpportunity | null>(null);
  const [countdown, setCountdown] = useState<number>(895);
  const [showQrModal, setShowQrModal] = useState(false);

  // Active countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
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

    // Dynamically inject Razorpay Standard Web Checkout Script
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

  // Real NPCI UPI Intent URI for Mobile App Choosers
  const upiIntentUri = useMemo(() => {
    const payeeVpa = "revivepay@icici";
    const payeeName = "RevenueOS Footwear";
    const txnNote = `Order ${orderId}`;
    const amountStr = netRecoveryAmount.toFixed(2);
    const refId = activeOppId || orderId;
    return `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(txnNote)}&tr=${encodeURIComponent(refId)}`;
  }, [netRecoveryAmount, orderId, activeOppId]);

  // Standard Razorpay Web Checkout
  const handleRazorpayStandardCheckout = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const createRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: queryAmount,
          currency: "INR",
          receipt: orderId,
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
          amount: orderData.amount_paise || queryAmount * 100,
          currency: "INR",
          name: "RevenueOS Footwear",
          description: `Order ${orderData.receipt || orderId}`,
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
                  orderId: orderData.orderId,
                  amount: queryAmount,
                  customerId: customer?.customerId || "CUS-8F42K1"
                })
              });

              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                setLoading(false);
                setIsRecovered(true);
                localStorage.removeItem("revivepay_cart");
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
          handleTriggerFailure();
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

  // Trigger Demo Payment Failure (Golden Path Pipeline)
  const handleTriggerFailure = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/simulator/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: paymentMethod === "card" ? "card_decline" : "upi_failure",
          customAmount: queryAmount,
          customerId: customer?.customerId || "CUS-8F42K1"
        })
      });

      const data = await res.json();
      if (data.success) {
        setFailureState(data);
        setActiveOppId(data.opportunityId);
      }
    } catch (e) {
      console.error("Failure simulation error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Customer 1-Click Recovery Action (with deep-link intent trigger)
  const handleCustomerRecovery = async (appScheme?: string) => {
    setLoading(true);
    setErrorMessage("");

    try {
      // If native mobile app selected, open deep link
      if (typeof window !== "undefined" && appScheme) {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
          let customIntent = upiIntentUri;
          if (appScheme === "phonepe") {
            customIntent = `phonepe://pay?pa=revivepay@icici&pn=RevenueOS&am=${netRecoveryAmount.toFixed(2)}&cu=INR&tr=${activeOppId}`;
          } else if (appScheme === "gpay") {
            customIntent = `tez://upi/pay?pa=revivepay@icici&pn=RevenueOS&am=${netRecoveryAmount.toFixed(2)}&cu=INR&tr=${activeOppId}`;
          } else if (appScheme === "paytm") {
            customIntent = `paytmmp://pay?pa=revivepay@icici&pn=RevenueOS&am=${netRecoveryAmount.toFixed(2)}&cu=INR&tr=${activeOppId}`;
          }
          window.location.href = customIntent;
        }
      }

      // Execute recovery settlement in RevivePay backend
      const res = await fetch("/api/recovery/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: activeOppId || "TXN-8921-X",
          action: "recover",
          paymentMethod: "upi"
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsRecovered(true);
        localStorage.removeItem("revivepay_cart");
        try {
          confetti({
            particleCount: 140,
            spread: 80,
            origin: { y: 0.6 }
          });
        } catch (e) {}
      } else {
        setErrorMessage(data.error || "Payment recovery could not be confirmed.");
      }
    } catch (e: any) {
      setErrorMessage(e?.message || "Network error during recovery.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedDirectPayment = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setIsRecovered(true);
      localStorage.removeItem("revivepay_cart");
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

        {/* State A: Success Confirmation */}
        {isRecovered ? (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-2xl border border-[#e3beb6]/40 text-center space-y-6 animate-scale">
            <div className="w-20 h-20 rounded-full bg-[#D4FF00] text-black flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3.5 py-1 bg-[#fee2dc] text-[#b32a03] text-xs font-bold rounded-full uppercase tracking-wider">
                Payment Captured & Recovered
              </span>
              <h1 className="text-3xl font-extrabold text-[#271814] mt-3">Order Confirmed!</h1>
              <p className="text-sm text-[#5a413a] mt-2">
                Thank you, <span className="font-bold text-[#271814]">{customer?.name || "Customer"}</span>! Your payment of{" "}
                <span className="font-extrabold text-[#b32a03]">₹{netRecoveryAmount.toLocaleString()}.00</span> was successfully processed.
              </p>
            </div>

            <div className="p-4 bg-[#f8f9fc] rounded-2xl border border-[#e3beb6]/30 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-[#5a413a]">Order Number</span>
                <span className="font-mono font-bold text-[#271814]">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5a413a]">Payment Rail</span>
                <span className="font-bold text-[#271814]">UPI Instant Intent Rail</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5a413a]">Status</span>
                <span className="text-green-600 font-bold">Captured & Verified</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/merchant/overview"
                className="flex-1 bg-[#2a2a2a] text-[#D4FF00] font-bold py-3.5 px-6 rounded-full text-sm hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <span>View Merchant Realtime Update</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/store"
                className="flex-1 bg-[#f8f9fc] text-[#271814] border border-[#e3beb6] font-bold py-3.5 px-6 rounded-full text-sm hover:bg-white transition-colors flex items-center justify-center gap-2"
              >
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>
        ) : failureState ? (
          /* State B: Customer High-Converting Recovery Experience */
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 md:p-12 shadow-2xl border-2 border-[#ffdad6] text-center space-y-6 animate-scale">
            <div className="w-16 h-16 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#271814]">We couldn't complete your payment.</h2>
              <p className="text-sm text-[#5a413a] mt-2">
                Complete your order now with 1-click payment for{" "}
                <span className="font-bold text-[#271814]">
                  ₹{netRecoveryAmount.toLocaleString()}.00
                </span>.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-left">
                {errorMessage}
              </div>
            )}

            <div className="bg-[#fee2dc]/40 p-5 sm:p-6 rounded-2xl border border-[#b32a03]/20 space-y-4">
              <div className="flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#e3beb6] flex items-center justify-center text-[#b32a03]">
                    {opportunityData?.selectedStrategy === "retry_now" ? (
                      <RefreshCw className="w-5 h-5" />
                    ) : (
                      <QrCode className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#271814]">
                      {opportunityData?.selectedStrategy === "retry_now"
                        ? "Instant Payment Retry (Recommended)"
                        : "Pay with UPI (Recommended)"}
                    </h4>
                    <p className="text-xs text-[#5a413a]">
                      {opportunityData?.recommendationReason ||
                        "Instant 1-click authorization via PhonePe / GPay / Paytm"}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-[#b32a03] uppercase">Fastest</span>
              </div>

              {/* Dynamic AI Incentive Offer */}
              {opportunityData?.incentiveOffer && opportunityData.incentiveOffer.type !== "none" && (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-300 text-left space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs">
                      <Tag className="w-4 h-4 text-emerald-700" />
                      <span>{opportunityData.incentiveOffer.label} Unlocked!</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-extrabold rounded-md uppercase">
                      {opportunityData.incentiveOffer.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    {opportunityData.incentiveOffer.reasoning}
                  </p>
                </div>
              )}

              {/* 1-Tap Mobile UPI App Choosers */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => handleCustomerRecovery("phonepe")}
                  disabled={loading}
                  className="p-2.5 bg-white border border-[#e3beb6] rounded-xl hover:border-[#b32a03] transition-all flex flex-col items-center gap-1 shadow-xs"
                >
                  <span className="w-6 h-6 rounded-full bg-[#5f259f] text-white flex items-center justify-center font-bold text-[10px]">Pe</span>
                  <span className="text-[11px] font-bold text-[#271814]">PhonePe</span>
                </button>
                <button
                  onClick={() => handleCustomerRecovery("gpay")}
                  disabled={loading}
                  className="p-2.5 bg-white border border-[#e3beb6] rounded-xl hover:border-[#b32a03] transition-all flex flex-col items-center gap-1 shadow-xs"
                >
                  <span className="w-6 h-6 rounded-full bg-[#4285F4] text-white flex items-center justify-center font-bold text-[10px]">G</span>
                  <span className="text-[11px] font-bold text-[#271814]">Google Pay</span>
                </button>
                <button
                  onClick={() => handleCustomerRecovery("paytm")}
                  disabled={loading}
                  className="p-2.5 bg-white border border-[#e3beb6] rounded-xl hover:border-[#b32a03] transition-all flex flex-col items-center gap-1 shadow-xs"
                >
                  <span className="w-6 h-6 rounded-full bg-[#002e6e] text-white flex items-center justify-center font-bold text-[10px]">P</span>
                  <span className="text-[11px] font-bold text-[#271814]">Paytm</span>
                </button>
              </div>

              {/* Main Recovery CTA Button */}
              <button
                onClick={() => handleCustomerRecovery()}
                disabled={loading}
                className="w-full bg-[#b32a03] text-white font-bold py-4 px-6 rounded-full text-base hover:bg-[#8a1c00] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#b32a03]/25 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <QrCode className="w-5 h-5" />
                )}
                <span>
                  Pay ₹{netRecoveryAmount.toLocaleString()} with 1-Click UPI
                </span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Hold Timer */}
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#b32a03]" />
                <span>Shoe size & cart reserved:</span>
              </div>
              <span className="font-mono font-bold text-[#b32a03] bg-white px-2.5 py-0.5 rounded-md border border-amber-200 shadow-xs">
                {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")} remaining
              </span>
            </div>
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
              </section>

              {/* Demo Golden Path Trigger Card */}
              <section className="bg-[#2a2a2a] text-white p-6 md:p-8 rounded-3xl shadow-xl border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-[#D4FF00]">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Golden Demo Flow</span>
                </div>
                <h3 className="font-bold text-lg text-white">Simulate Payment Failure & AI Recovery</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  Triggers real backend failure ingestion, runs Gemini Failure Analyst & Recovery Predictor, verifies Guardrails, updates Merchant Command Center in realtime, and presents customer recovery.
                </p>

                <button
                  onClick={handleTriggerFailure}
                  disabled={loading}
                  className="w-full bg-[#D4FF00] text-black font-bold py-3.5 px-6 rounded-full text-sm hover:bg-[#c5e128] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                  <span>Trigger Demo Payment Failure (Golden Path)</span>
                </button>
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
                  onClick={handleRazorpayStandardCheckout}
                  disabled={loading}
                  className="w-full bg-[#b32a03] text-white font-bold py-4 px-6 rounded-full text-sm hover:bg-[#8a1c00] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#b32a03]/25 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{loading ? "Launching Gateway..." : `Pay ₹${queryAmount.toLocaleString()} with Razorpay`}</span>
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
