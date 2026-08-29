"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Bell, LayoutDashboard, ShoppingBag, Sliders } from "lucide-react";

export default function MerchantNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/merchant/overview" },
    { name: "Recovery", href: "/merchant/recovery" },
    { name: "Analytics", href: "/merchant/analytics" },
    { name: "Audit", href: "/merchant/audit" }
  ];

  return (
    <nav className="w-full px-6 md:px-12 pt-8 pb-4 flex items-center justify-between z-10 relative">
      {/* Brand */}
      <Link href="/merchant/overview" className="flex items-center gap-2 text-[#191c1e] hover:opacity-80 transition-opacity">
        <span className="material-symbols-outlined text-2xl text-black">star</span>
        <span className="font-extrabold text-xl tracking-tight">RevenueOS</span>
      </Link>

      {/* Center Nav Pill */}
      <div className="bg-[#2a2a2a] text-white rounded-full flex items-center p-1.5 gap-1 text-sm font-medium shadow-lg">
        <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ml-1 mr-1 text-[#D4FF00]">
          <LayoutDashboard className="w-4 h-4" />
        </span>

        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return isActive ? (
            <Link
              key={item.name}
              href={item.href}
              className="px-5 py-2 bg-[#D4FF00] text-[#1c1b1b] rounded-full font-bold flex items-center gap-2 shadow-sm transition-all text-xs"
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
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-white rounded-full border border-gray-300 text-xs font-bold text-[#191c1e] hover:bg-gray-50 transition-colors shadow-sm"
          title="Open Customer Store"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-[#b32a03]" />
          <span>Customer Store</span>
        </Link>

        <button className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-white text-gray-700 hover:bg-gray-50 shadow-sm relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#D4FF00]" />
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
  );
}
