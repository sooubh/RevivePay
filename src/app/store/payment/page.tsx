"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import DemoSimulatorModal from "@/components/simulator/DemoSimulatorModal";
import confetti from "canvas-confetti";
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
  Sparkles
} from "lucide-react";

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId") || "ORD-DEMO-001";
  const rzpOrder = searchParams.get("rzpOrder") || "";
  const oppIdParam = searchParams.get("oppId") || "";
  const queryAmount = Number(searchParams.get("amount")) || 4999;

  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [loading, setLoading] = useState(false);
  const [isRecovered, setIsRecovered] = useState(false);
  const [failureState, setFailureState] = useState<any>(null);
  const [activeOppId, setActiveOppId] = useState<string>(oppIdParam);
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    const savedCustomer = localStorage.getItem("revivepay_customer");
    if (savedCustomer) {
      try {
        setCustomer(JSON.parse(savedCustomer));
      } catch (e) {}
    }
  }, []);

  const handleTriggerFailure = async () => {
    setLoading(true);
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

  const handleCustomerRecovery = async () => {
    setLoading(true);
    try {
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
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {}
      }
    } catch (e) {
      console.error("Recovery action error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSuccess = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setIsRecovered(true);
      localStorage.removeItem("revivepay_cart");
      try {
        confetti({ particleCount: 100, spread: 60 });
      } catch (e) {}
    }, 1200);
  };

  return (
    <div className="bg-[#fff8f6] text-[#271814] font-sans min-h-screen flex flex-col relative overflow-x-hidden">
      <StoreHeader />

      <main className="flex-grow pt-[110px] pb-24 px-6 md:px-16 max-w-[1200px] mx-auto w-full">
        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-10 text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center text-[#5a413a]">
            <span className="w-7 h-7 rounded-full bg-[#fee2dc] text-[#b32a03] flex items-center justify-center mr-2">1</span>
            <span>Information</span>
          </div>
          <div className="h-[2px] w-8 md:w-16 bg-[#b32a03]"></div>
          <div className="flex items-center text-[#b32a03]">
            <span className="w-7 h-7 rounded-full bg-[#b32a03] text-white flex items-center justify-center mr-2 shadow-sm">2</span>
            <span>Payment</span>
          </div>
          <div className="h-[2px] w-8 md:w-16 bg-[#e3beb6]/40"></div>
          <div className="flex items-center text-[#5a413a] opacity-60">
            <span className="w-7 h-7 rounded-full border border-[#e3beb6] flex items-center justify-center mr-2">3</span>
            <span>Confirmation</span>
          </div>
        </div>

        {isRecovered ? (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-10 shadow-2xl border border-[#e3beb6]/40 text-center space-y-6 animate-scale">
            <div className="w-20 h-20 rounded-full bg-[#D4FF00] text-black flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3.5 py-1 bg-[#fee2dc] text-[#b32a03] text-xs font-bold rounded-full uppercase tracking-wider">
                Payment Recovered & Captured
              </span>
              <h1 className="text-3xl font-extrabold text-[#271814] mt-3">Order Confirmed!</h1>
              <p className="text-sm text-[#5a413a] mt-2">
                Thank you, {customer?.name || "Sarah"}! Your payment of{" "}
                <span className="font-extrabold text-[#b32a03]">₹{queryAmount.toLocaleString()}.00</span> was successfully processed via UPI.
              </p>
            </div>

            <div className="p-4 bg-[#f8f9fc] rounded-2xl border border-[#e3beb6]/30 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-[#5a413a]">Order Number</span>
                <span className="font-mono font-bold text-[#271814]">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5a413a]">Payment Method</span>
                <span className="font-bold text-[#271814]">UPI (1-Click Recovery)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5a413a]">Status</span>
                <span className="text-green-600 font-bold">Paid & Active</span>
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
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 md:p-10 shadow-2xl border-2 border-[#ffdad6] text-center space-y-6 animate-scale">
            <div className="w-16 h-16 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-[#271814]">We couldn't complete your payment.</h2>
              <p className="text-sm text-[#5a413a] mt-2">
                Try another payment method to complete your order for{" "}
                <span className="font-bold text-[#271814]">₹{queryAmount.toLocaleString()}.00</span>.
              </p>
            </div>

            <div className="bg-[#fee2dc]/40 p-6 rounded-2xl border border-[#b32a03]/20 space-y-4">
              <div className="flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#e3beb6] flex items-center justify-center text-[#b32a03]">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#271814]">Pay with UPI (Recommended)</h4>
                    <p className="text-xs text-[#5a413a]">Instant authorization via Google Pay / PhonePe</p>
                  </div>
                </div>
                <span className="text-xs font-black text-[#b32a03] uppercase">Fastest</span>
              </div>

              <button
                onClick={handleCustomerRecovery}
                disabled={loading}
                className="w-full bg-[#b32a03] text-white font-bold py-4 px-6 rounded-full text-base hover:bg-[#8a1c00] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#b32a03]/25 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                <span>Pay ₹{queryAmount.toLocaleString()} with UPI</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-[#5a413a]">
              <ShieldCheck className="w-4 h-4 text-[#b32a03]" />
              <span>Your basket and shoe size are reserved for 15 minutes.</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              <section className="bg-white p-6 md:p-8 rounded-3xl border border-[#e3beb6]/40 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-[#271814] mb-2">Select Payment Method</h2>

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

              <section className="bg-[#2a2a2a] text-white p-6 rounded-3xl shadow-xl border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-[#D4FF00]">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Golden Demo Flow</span>
                </div>
                <h3 className="font-bold text-base text-white">Simulate Payment Failure & AI Recovery</h3>
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

                <button
                  onClick={handleDirectSuccess}
                  disabled={loading}
                  className="w-full bg-[#b32a03] text-white font-bold py-4 px-6 rounded-full text-sm hover:bg-[#8a1c00] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#b32a03]/25 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{loading ? "Processing..." : `Complete Purchase (₹${queryAmount.toLocaleString()})`}</span>
                </button>

                <div className="flex flex-col items-center gap-2 text-[11px] text-[#5a413a] opacity-80 pt-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#b32a03]" />
                    <span>Razorpay Secured 256-Bit Encryption</span>
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
    <Suspense fallback={<div className="min-h-screen bg-[#fff8f6] flex items-center justify-center text-sm font-bold text-[#b32a03]">Loading payment...</div>}>
      <PaymentContent />
    </Suspense>
  );
}

