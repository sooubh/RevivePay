"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, ShoppingBag, CheckCircle2, AlertCircle, X } from "lucide-react";
import { dbService } from "@/lib/firebase/db";
import { AuditLog } from "@/lib/types";

export default function MerchantNav() {
  const pathname = usePathname();
  const [activeNotification, setActiveNotification] = useState<AuditLog | null>(null);
  const isInitialMount = useRef(true);

  const navItems = [
    { name: "Overview", href: "/merchant/overview" },
    { name: "Recovery", href: "/merchant/recovery" },
    { name: "Analytics", href: "/merchant/analytics" },
    { name: "Audit", href: "/merchant/audit" }
  ];

  useEffect(() => {
    const unsub = dbService.subscribeAuditLogs((logs) => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      if (logs.length > 0) {
        const latest = logs[0];
        if (latest.eventType === "PAYMENT_RECOVERED" || latest.eventType === "PAYMENT_FAILED" || latest.eventType === "RECOVERY_ACTION_TRIGGERED") {
          setActiveNotification(latest);
          const t = setTimeout(() => setActiveNotification(null), 5000);
          return () => clearTimeout(t);
        }
      }
    });

    return () => unsub();
  }, []);

  return (
    <>
      <nav className="w-full px-6 md:px-12 xl:px-16 pt-8 pb-6 flex items-center justify-between z-10 relative">
        {/* Brand */}
        <Link href="/merchant/overview" className="flex items-center gap-2.5 text-[#191c1e] hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined text-2xl text-black">star</span>
          <span className="font-extrabold text-2xl tracking-tight">RevenueOS</span>
        </Link>

        {/* Center Nav Pill */}
        <div className="bg-[#2a2a2a] text-white rounded-full flex items-center p-1.5 gap-1 text-sm font-medium shadow-xl">
          <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ml-1 mr-1 text-[#D4FF00]">
            <LayoutDashboard className="w-4 h-4" />
          </span>

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return isActive ? (
              <Link
                key={item.name}
                href={item.href}
                className="px-6 py-2.5 bg-[#D4FF00] text-[#1c1b1b] rounded-full font-bold flex items-center gap-2 shadow-sm transition-all text-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#1c1b1b]"></span>
                <span>{item.name}</span>
              </Link>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                className="px-4 py-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white text-xs font-semibold"
              >
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          <Link
            href="/store"
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white rounded-full border border-gray-300 text-xs font-bold text-[#191c1e] hover:bg-gray-50 transition-colors shadow-sm"
            title="Open Customer Storefront"
          >
            <ShoppingBag className="w-4 h-4 text-[#b32a03]" />
            <span>Customer Store</span>
          </Link>

          <button className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-white text-gray-700 hover:bg-gray-50 shadow-sm relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#D4FF00] animate-pulse" />
          </button>

          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-300 shrink-0 bg-white shadow-sm">
            <img
              alt="Merchant Profile"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCP1BHrcpb9ibRKO2rL4gx1VFTCw7cBkVKRuYnhd3uzD3cZWMTxkQdeHwfBjMwjLpL_TNpsMyKUjDbr5mOsPaG8gMv4UAUel9jS5yXdJfif-gSqAYjc5GmvFIjaL7lQN6_GtRgN5xLG9Ndl2aq3Zmg4jDbGAQwxMAuirCJAy-RZBsbhk5zlRjx-2vEbL__IuruuTFU38ND5flNE8fdBBnXaDrZrn4_HHMQiITzj0R-X_x75ajyXjP9I"
            />
          </div>
        </div>
      </nav>

      {/* Floating Realtime Event Toast */}
      {activeNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#2a2a2a] text-white p-4 rounded-2xl shadow-2xl border border-white/20 flex items-start gap-3 animate-fade-in">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              activeNotification.eventType === "PAYMENT_RECOVERED"
                ? "bg-[#D4FF00] text-black"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {activeNotification.eventType === "PAYMENT_RECOVERED" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4FF00]">
                {activeNotification.eventType.replace("_", " ")}
              </span>
              <button
                onClick={() => setActiveNotification(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-white/90 leading-snug">{activeNotification.message}</p>
          </div>
        </div>
      )}
    </>
  );
}

