"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingBag, User, Heart, Menu, Globe } from "lucide-react";

export default function StoreHeader({ cartCount = 0 }: { cartCount?: number }) {
  const [customer, setCustomer] = useState<{ customerId: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("revivepay_customer");
    if (saved) {
      try {
        setCustomer(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  return (
    <header className="fixed z-50 w-full top-0 bg-[#fff8f6]/95 backdrop-blur-xl border-b border-[#e3beb6]/30">
      <nav className="flex justify-between items-center w-full px-6 md:px-12 xl:px-16 py-4 mx-auto">
        {/* Left: Search & Role switch */}
        <div className="flex items-center gap-4">
          <button className="md:hidden text-[#5a413a] flex items-center justify-center p-2 rounded-full hover:bg-[#fee2dc] transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden md:flex items-center bg-white rounded-full px-4 py-2 border border-[#e3beb6] focus-within:border-[#b32a03] transition-colors shadow-sm">
            <Search className="w-4 h-4 text-[#8e7069] mr-2" />
            <input
              className="bg-transparent border-none outline-none focus:ring-0 text-sm text-[#271814] w-48 placeholder:text-[#8e7069]/60"
              placeholder="Search sneakers..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Center: Brand & Links */}
        <div className="flex flex-col items-center gap-1">
          <Link href="/store" className="text-2xl font-extrabold text-[#271814] tracking-tight hover:opacity-90 transition-opacity">
            RevenueOS Store
          </Link>
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#5a413a]">
            <Link href="/store" className="text-[#b32a03] border-b-2 border-[#b32a03] pb-0.5 font-bold">
              New
            </Link>
            <Link href="/store" className="hover:text-[#b32a03] transition-colors">
              Trending
            </Link>
            <Link href="/store" className="hover:text-[#b32a03] transition-colors">
              Best Sellers
            </Link>
          </div>
        </div>

        {/* Right: Customer Profile & Cart */}
        <div className="flex items-center gap-3 text-[#5a413a]">
          {customer ? (
            <Link
              href="/welcome"
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-[#fee2dc] text-[#b32a03] rounded-full text-xs font-bold hover:bg-[#f8dcd6] transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>{customer.customerId}</span>
            </Link>
          ) : (
            <Link
              href="/welcome"
              className="p-2 rounded-full hover:bg-[#fee2dc] hover:text-[#b32a03] transition-colors"
              title="Customer Login"
            >
              <User className="w-5 h-5" />
            </Link>
          )}

          <Link href="/merchant/overview" className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 bg-[#2a2a2a] text-[#D4FF00] rounded-full text-xs font-bold hover:bg-black transition-colors shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#D4FF00] animate-pulse"></span>
            Merchant View
          </Link>

          <Link href="/store/orders" className="p-2 rounded-full hover:bg-[#fee2dc] hover:text-[#b32a03] transition-colors text-xs font-bold" title="My Orders">
            Orders
          </Link>

          <Link href="/store/checkout" className="p-2 rounded-full hover:bg-[#fee2dc] hover:text-[#b32a03] transition-colors relative">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#b32a03] text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-md animate-scale">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </nav>
    </header>
  );
}
