"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ShoppingBag, ArrowRight, Sparkles } from "lucide-react";
import DemoSimulatorModal from "@/components/simulator/DemoSimulatorModal";

export default function WelcomePage() {
  const router = useRouter();
  const [role, setRole] = useState<"choose" | "customer_new" | "customer_existing">("choose");
  const [name, setName] = useState("");
  const [shoeSize, setShoeSize] = useState("9");
  const [existingId, setExistingId] = useState("CUS-8F42K1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, shoeSize })
      });
      const data = await res.json();
      if (data.success && data.customer) {
        localStorage.setItem("revivepay_customer", JSON.stringify(data.customer));
        router.push("/store");
      } else {
        setError(data.error || "Failed to create customer");
      }
    } catch (err) {
      setError("Error creating profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLookupCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingId.trim()) {
      setError("Please enter your Customer ID");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/customer?customerId=${encodeURIComponent(existingId.trim())}`);
      const data = await res.json();
      if (data.success && data.customer) {
        localStorage.setItem("revivepay_customer", JSON.stringify(data.customer));
        router.push("/store");
      } else {
        setError(data.error || "Customer ID not found");
      }
    } catch (err) {
      setError("Error verifying customer ID");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#EFF4F8] text-[#191c1e] font-sans flex flex-col items-center justify-center p-6 md:p-12 xl:p-16 relative">
      {/* Top Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#2a2a2a] text-[#D4FF00] flex items-center justify-center font-black shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tight text-[#191c1e]">RevivePay</h1>
            <p className="text-xs text-[#5a413a]">AI Revenue Recovery Platform for Footwear Merchants</p>
          </div>
        </div>

        <span className="px-4 py-1.5 bg-[#D4FF00] text-[#1c1b1b] rounded-full text-xs font-extrabold uppercase tracking-wider shadow-sm">
          Prototype Demo
        </span>
      </header>

      {/* View Selection */}
      <div className="w-full max-w-6xl flex-1 flex flex-col justify-center">
        {role === "choose" && (
          <div>
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-3xl md:text-5xl font-extrabold text-[#191c1e] tracking-tight mb-3">
                Select Your Experience
              </h2>
              <p className="text-sm md:text-base text-[#5a413a]">
                Explore RevivePay as a Merchant monitoring revenue recovery in realtime, or as a Customer shopping the brand storefront.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
              {/* Card 1: Merchant Path */}
              <div className="bg-[#2a2a2a] text-white rounded-3xl p-8 md:p-10 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 shadow-2xl border border-white/10 relative overflow-hidden group min-h-[380px]">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4FF00]/10 rounded-full blur-3xl -mr-12 -mt-12" />
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-[#D4FF00] text-black flex items-center justify-center mb-6 shadow-md">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Merchant Command Center</h3>
                  <p className="text-xs md:text-sm text-white/70 leading-relaxed mb-6">
                    Access live recovery opportunities, AI probability scoring, multi-agent strategy evaluations, guardrails, and real-time revenue analytics.
                  </p>
                </div>

                <Link
                  href="/merchant/overview"
                  className="w-full bg-[#D4FF00] text-[#1c1b1b] font-bold py-4 px-6 rounded-full text-sm hover:bg-[#c5e128] transition-colors flex items-center justify-center gap-2 shadow-xl"
                >
                  <span>Demo Mode — Continue as Merchant</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Card 2: Customer Path */}
              <div className="bg-white text-[#191c1e] rounded-3xl p-8 md:p-10 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 shadow-2xl border border-[#e3beb6]/40 relative min-h-[380px]">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-[#fee2dc] text-[#b32a03] flex items-center justify-center mb-6 shadow-sm">
                    <ShoppingBag className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-[#191c1e] mb-2">Customer Storefront</h3>
                  <p className="text-xs md:text-sm text-[#5a413a] leading-relaxed mb-6">
                    Browse sneakers, select your size, add to cart, and experience the checkout flow with Razorpay Test Mode and AI recovery prompts.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setRole("customer_new")}
                    className="w-full bg-[#b32a03] text-white font-bold py-4 px-6 rounded-full text-sm hover:bg-[#8a1c00] transition-colors flex items-center justify-center gap-2 shadow-xl shadow-[#b32a03]/20"
                  >
                    <span>New Customer (Create Profile)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRole("customer_existing")}
                    className="w-full bg-[#fee2dc] text-[#b32a03] font-bold py-3.5 px-6 rounded-full text-xs hover:bg-[#f8dcd6] transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Existing Customer ID</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Customer Form */}
        {role === "customer_new" && (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 md:p-10 shadow-2xl border border-[#e3beb6]/40 w-full">
            <button
              onClick={() => setRole("choose")}
              className="text-xs text-[#5a413a] hover:text-[#b32a03] font-semibold mb-4 block"
            >
              ← Back to role selection
            </button>
            <h2 className="text-2xl font-bold text-[#191c1e] mb-1">Create Customer Profile</h2>
            <p className="text-xs text-[#5a413a] mb-6">A unique customer ID (CUS-XXXXXX) will be generated for your purchases.</p>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5a413a] uppercase tracking-wider mb-1.5">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#f8f9fc] border border-[#e3beb6] rounded-xl px-4 py-3 text-sm text-[#191c1e] focus:border-[#b32a03] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5a413a] uppercase tracking-wider mb-1.5">
                  Shoe Size (US Men's)
                </label>
                <select
                  value={shoeSize}
                  onChange={(e) => setShoeSize(e.target.value)}
                  className="w-full bg-[#f8f9fc] border border-[#e3beb6] rounded-xl px-4 py-3 text-sm text-[#191c1e] focus:border-[#b32a03] outline-none"
                >
                  {["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12", "13"].map((s) => (
                    <option key={s} value={s}>
                      Size US {s}
                    </option>
                  ))}
                </select>
              </div>

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#b32a03] text-white font-bold py-4 px-6 rounded-full text-sm hover:bg-[#8a1c00] transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <span>{loading ? "Generating ID..." : "Enter Shoe Storefront"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Existing Customer Form */}
        {role === "customer_existing" && (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 md:p-10 shadow-2xl border border-[#e3beb6]/40 w-full">
            <button
              onClick={() => setRole("choose")}
              className="text-xs text-[#5a413a] hover:text-[#b32a03] font-semibold mb-4 block"
            >
              ← Back to role selection
            </button>
            <h2 className="text-2xl font-bold text-[#191c1e] mb-1">Restore Customer Account</h2>
            <p className="text-xs text-[#5a413a] mb-6">Enter your customer ID to restore your profile and order history.</p>

            <form onSubmit={handleLookupCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5a413a] uppercase tracking-wider mb-1.5">
                  Customer ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CUS-8F42K1"
                  value={existingId}
                  onChange={(e) => setExistingId(e.target.value.toUpperCase())}
                  className="w-full bg-[#f8f9fc] border border-[#e3beb6] rounded-xl px-4 py-3 text-sm text-[#191c1e] font-mono uppercase focus:border-[#b32a03] outline-none"
                />
              </div>

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#b32a03] text-white font-bold py-4 px-6 rounded-full text-sm hover:bg-[#8a1c00] transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <span>{loading ? "Restoring..." : "Restore & Enter Store"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      <DemoSimulatorModal />
    </div>
  );
}
