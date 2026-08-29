import React from "react";
import Link from "next/link";

export default function StoreFooter() {
  return (
    <footer className="w-full bg-white border-t border-[#e3beb6]/40 mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center w-full px-6 md:px-16 py-12 max-w-[1440px] mx-auto gap-8">
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="text-xl font-extrabold text-[#271814]">
            RevenueOS Store
          </span>
          <p className="text-xs text-[#5a413a]">
            Powered by RevivePay AI Revenue Recovery Layer.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-xs font-medium text-[#5a413a]">
          <Link className="hover:text-[#b32a03] transition-colors" href="/store">
            Shoes Catalog
          </Link>
          <Link className="hover:text-[#b32a03] transition-colors" href="/welcome">
            Role Selection
          </Link>
          <Link className="hover:text-[#b32a03] transition-colors" href="/merchant/overview">
            Merchant Command Center
          </Link>
        </div>
      </div>
    </footer>
  );
}
