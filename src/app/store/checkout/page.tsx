"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import DemoSimulatorModal from "@/components/simulator/DemoSimulatorModal";
import { OrderItem } from "@/lib/types";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<{ customerId: string; name: string; email?: string } | null>(null);

  // Form State
  const [email, setEmail] = useState("sarah.j@example.com");
  const [firstName, setFirstName] = useState("Sarah");
  const [lastName, setLastName] = useState("Jenkins");
  const [address, setAddress] = useState("Flat 402, Highline Residency");
  const [apartment, setApartment] = useState("Tower B");
  const [city, setCity] = useState("Mumbai");
  const [zipcode, setZipcode] = useState("400001");
  const [delivery, setDelivery] = useState<"standard" | "express">("standard");

  useEffect(() => {
    const savedCustomer = localStorage.getItem("revivepay_customer");
    if (savedCustomer) {
      try {
        const c = JSON.parse(savedCustomer);
        setCustomer(c);
        if (c.name) {
          const parts = c.name.split(" ");
          setFirstName(parts[0] || "Sarah");
          setLastName(parts.slice(1).join(" ") || "Jenkins");
        }
        if (c.email) setEmail(c.email);
      } catch (e) {}
    }

    const savedCart = localStorage.getItem("revivepay_cart");
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart);
        if (items && items.length > 0) {
          setCart(items);
        } else {
          // Default item if cart is empty
          setCart([
            {
              productId: "PROD-001",
              name: "Aeon Performance Runner",
              brand: "LuxeStep",
              price: 4999,
              size: "9",
              quantity: 1,
              imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAfmxkAm9FxGl0cDWrdx4CipB_VGxi9X58jaQB9jyK7lLuDpEqIgKOTSqd4fKHnLCV8NYJj3RcHfPw3ZJ9sOr7gHPLllmwGEQk6AVXkawwCyexA9qpOe9te5yC3N7dMEramc9XRyUEJUfL4v7d-UW5BnhGfans41N3kwtG5ARGBTDzhBdjjI5Y1CAfnGkSfb8TYfgzAhtx1jbsPIMN0YzVbciNk2xTbkCrKnwK3M-THAxPfdXz-lDj-"
            }
          ]);
        }
      } catch (e) {}
    } else {
      setCart([
        {
          productId: "PROD-001",
          name: "Aeon Performance Runner",
          brand: "LuxeStep",
          price: 4999,
          size: "9",
          quantity: 1,
          imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAfmxkAm9FxGl0cDWrdx4CipB_VGxi9X58jaQB9jyK7lLuDpEqIgKOTSqd4fKHnLCV8NYJj3RcHfPw3ZJ9sOr7gHPLllmwGEQk6AVXkawwCyexA9qpOe9te5yC3N7dMEramc9XRyUEJUfL4v7d-UW5BnhGfans41N3kwtG5ARGBTDzhBdjjI5Y1CAfnGkSfb8TYfgzAhtx1jbsPIMN0YzVbciNk2xTbkCrKnwK3M-THAxPfdXz-lDj-"
        }
      ]);
    }
  }, []);

  const subtotal = cart.reduce((acc, item) => acc + item.price * (item.quantity || 1), 0);
  const shippingFee = delivery === "express" ? 200 : 0;
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const total = subtotal + shippingFee + tax;

  const handleProceedToPayment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          customerId: customer?.customerId || "CUS-8F42K1",
          customerName: `${firstName} ${lastName}`,
          customerEmail: email,
          shippingAddress: {
            firstName,
            lastName,
            address,
            apartment,
            city,
            zipcode,
            country: "India"
          }
        })
      });

      const data = await res.json();
      if (data.success && data.orderId) {
        router.push(`/store/payment?orderId=${data.orderId}&rzpOrder=${data.razorpayOrderId}&amount=${data.amount}`);
      } else {
        alert("Failed to initiate order. Please try again.");
      }
    } catch (e) {
      console.error("Order creation error:", e);
      alert("Error initiating checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#fff8f6] text-[#271814] font-sans min-h-screen flex flex-col relative overflow-x-hidden">
      <StoreHeader cartCount={cart.length} />

      <main className="flex-grow pt-[110px] pb-24 px-6 md:px-16 max-w-[1440px] mx-auto w-full">
        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-10 text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center text-[#b32a03]">
            <span className="w-7 h-7 rounded-full bg-[#b32a03] text-white flex items-center justify-center mr-2 shadow-sm">1</span>
            <span>Information</span>
          </div>
          <div className="h-[2px] w-8 md:w-16 bg-[#b32a03]/30"></div>
          <div className="flex items-center text-[#5a413a] opacity-60">
            <span className="w-7 h-7 rounded-full border border-[#e3beb6] flex items-center justify-center mr-2">2</span>
            <span>Payment</span>
          </div>
          <div className="h-[2px] w-8 md:w-16 bg-[#e3beb6]/40"></div>
          <div className="flex items-center text-[#5a413a] opacity-60">
            <span className="w-7 h-7 rounded-full border border-[#e3beb6] flex items-center justify-center mr-2">3</span>
            <span>Confirmation</span>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          {/* Left Column: Forms */}
          <div className="lg:col-span-7 space-y-6">
            {/* Contact Information */}
            <section className="bg-white p-6 md:p-8 rounded-3xl border border-[#e3beb6]/40 shadow-sm">
              <h2 className="text-xl font-bold text-[#271814] mb-4">Contact Information</h2>
              <div>
                <label className="block text-xs font-bold text-[#5a413a] uppercase mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f8f9fc] border border-[#e3beb6] rounded-xl px-4 py-3 text-sm text-[#271814] focus:border-[#b32a03] outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </section>

            {/* Shipping Address */}
            <section className="bg-white p-6 md:p-8 rounded-3xl border border-[#e3beb6]/40 shadow-sm">
              <h2 className="text-xl font-bold text-[#271814] mb-4">Shipping Address</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5a413a] uppercase mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-[#f8f9fc] border border-[#e3beb6] rounded-xl px-4 py-3 text-sm text-[#271814] focus:border-[#b32a03] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a413a] uppercase mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-[#f8f9fc] border border-[#e3beb6] rounded-xl px-4 py-3 text-sm text-[#271814] focus:border-[#b32a03] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5a413a] uppercase mb-1.5">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#f8f9fc] border border-[#e3beb6] rounded-xl px-4 py-3 text-sm text-[#271814] focus:border-[#b32a03] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5a413a] uppercase mb-1.5">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-[#f8f9fc] border border-[#e3beb6] rounded-xl px-4 py-3 text-sm text-[#271814] focus:border-[#b32a03] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a413a] uppercase mb-1.5">PIN Code</label>
                    <input
                      type="text"
                      value={zipcode}
                      onChange={(e) => setZipcode(e.target.value)}
                      className="w-full bg-[#f8f9fc] border border-[#e3beb6] rounded-xl px-4 py-3 text-sm text-[#271814] focus:border-[#b32a03] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a413a] uppercase mb-1.5">Country</label>
                    <input
                      type="text"
                      disabled
                      value="India"
                      className="w-full bg-[#f8f9fc] border border-[#e3beb6] rounded-xl px-4 py-3 text-sm text-[#271814] opacity-75"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Delivery Method */}
            <section className="bg-white p-6 md:p-8 rounded-3xl border border-[#e3beb6]/40 shadow-sm">
              <h2 className="text-xl font-bold text-[#271814] mb-4">Delivery Method</h2>
              <div className="space-y-3">
                <label
                  onClick={() => setDelivery("standard")}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                    delivery === "standard"
                      ? "border-[#b32a03] bg-[#fee2dc]/40 shadow-sm"
                      : "border-[#e3beb6] bg-white hover:border-[#b32a03]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={delivery === "standard"}
                      onChange={() => setDelivery("standard")}
                      className="text-[#b32a03] focus:ring-[#b32a03]"
                    />
                    <div>
                      <span className="block font-bold text-sm text-[#271814]">Standard Delivery</span>
                      <span className="block text-xs text-[#5a413a]">3–5 Business Days</span>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-[#b32a03]">FREE</span>
                </label>

                <label
                  onClick={() => setDelivery("express")}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                    delivery === "express"
                      ? "border-[#b32a03] bg-[#fee2dc]/40 shadow-sm"
                      : "border-[#e3beb6] bg-white hover:border-[#b32a03]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={delivery === "express"}
                      onChange={() => setDelivery("express")}
                      className="text-[#b32a03] focus:ring-[#b32a03]"
                    />
                    <div>
                      <span className="block font-bold text-sm text-[#271814]">Express Delivery</span>
                      <span className="block text-xs text-[#5a413a]">1–2 Business Days</span>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-[#271814]">₹200.00</span>
                </label>
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary */}
          <aside className="lg:col-span-5 sticky top-28">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e3beb6]/40 shadow-xl space-y-6">
              <h2 className="text-xl font-bold text-[#271814]">Order Summary</h2>

              {/* Items */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 py-2 border-b border-[#e3beb6]/30 last:border-none">
                    <div className="w-16 h-16 rounded-2xl bg-[#fee2dc]/50 border border-[#e3beb6]/40 p-2 shrink-0 flex items-center justify-center overflow-hidden">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-[#271814]">{item.name}</h3>
                      <p className="text-xs text-[#5a413a]">Size US {item.size} • Qty {item.quantity || 1}</p>
                    </div>
                    <span className="text-sm font-extrabold text-[#271814]">
                      ₹{(item.price * (item.quantity || 1)).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pricing Breakdown */}
              <div className="border-t border-[#e3beb6]/40 pt-4 space-y-2.5 text-xs text-[#5a413a]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-[#271814]">₹{subtotal.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-bold text-[#271814]">{shippingFee === 0 ? "FREE" : `₹${shippingFee}.00`}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (5%)</span>
                  <span className="font-bold text-[#271814]">₹{tax.toLocaleString()}.00</span>
                </div>
                <div className="border-t border-[#e3beb6]/40 pt-3 flex justify-between items-center">
                  <span className="text-base font-bold text-[#271814]">Total</span>
                  <span className="text-2xl font-black text-[#b32a03]">₹{total.toLocaleString()}.00</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleProceedToPayment}
                disabled={loading}
                className="w-full bg-[#b32a03] text-white font-bold py-4 px-6 rounded-full text-sm hover:bg-[#8a1c00] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#b32a03]/25 disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{loading ? "Preparing Order..." : `Proceed to Payment (₹${total.toLocaleString()})`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#5a413a] opacity-80 pt-2">
                <ShieldCheck className="w-4 h-4 text-[#b32a03]" />
                <span>256-bit SSL Encrypted • Razorpay Test Mode</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <StoreFooter />
      <DemoSimulatorModal />
    </div>
  );
}
