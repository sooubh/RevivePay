"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import DemoSimulatorModal from "@/components/simulator/DemoSimulatorModal";
import { Product, OrderItem } from "@/lib/types";
import { Star, ShoppingCart, ArrowRight, Check } from "lucide-react";

export default function StorePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories");
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  useEffect(() => {
    // Load products
    const defaultProducts: Product[] = [
      {
        productId: "PROD-001",
        name: "Aeon Performance Runner",
        brand: "LuxeStep",
        price: 4999,
        originalPrice: 6499,
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAfmxkAm9FxGl0cDWrdx4CipB_VGxi9X58jaQB9jyK7lLuDpEqIgKOTSqd4fKHnLCV8NYJj3RcHfPw3ZJ9sOr7gHPLllmwGEQk6AVXkawwCyexA9qpOe9te5yC3N7dMEramc9XRyUEJUfL4v7d-UW5BnhGfans41N3kwtG5ARGBTDzhBdjjI5Y1CAfnGkSfb8TYfgzAhtx1jbsPIMN0YzVbciNk2xTbkCrKnwK3M-THAxPfdXz-lDj-",
        thumbnails: [
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAfmxkAm9FxGl0cDWrdx4CipB_VGxi9X58jaQB9jyK7lLuDpEqIgKOTSqd4fKHnLCV8NYJj3RcHfPw3ZJ9sOr7gHPLllmwGEQk6AVXkawwCyexA9qpOe9te5yC3N7dMEramc9XRyUEJUfL4v7d-UW5BnhGfans41N3kwtG5ARGBTDzhBdjjI5Y1CAfnGkSfb8TYfgzAhtx1jbsPIMN0YzVbciNk2xTbkCrKnwK3M-THAxPfdXz-lDj-",
          "https://lh3.googleusercontent.com/aida-public/AB6AXuCY8l2hYzsJ34eQP0EkYiNXBwrz7_pNv6BLhGSR5-sM_id6GQ7pJLCRR5oXTbg1_jueuX4_Kn8nhQ58QzjEXwfMdafiOM-pO9MkXekzWsuYtbyvnmfCwORuRHDpSTa1uoX_rsfAl-gzG_g2pIKykMXTPwIIQTMqltCM9zGkL1BSjO3BmnatSD3dIqI9pDSef6FkEJlawRMYa9WNGpyABpAOfZ7QOYdzMFstn3R7DhAQrUlvNomKClUM",
          "https://lh3.googleusercontent.com/aida-public/AB6AXuDYl-8gPUJnC0X7N0nWyXGAVmBWGBFLbQHmT_T_wzp878qWriZvTZxs3QFSMsAuA1wwZcRRwpRC0YPmGwEzNFcM-xHsDXhtYJWPRcoumI6VUtFHYWdtUhm8ThcBo3uTjlmo82IrWU9qbtsRl8oSpzAml2IH5wl1JKqbSovrPyQtQ-vjwM7BICyz-Pv7v69lc_TuoGXP60bT-nWsakF9CZOM4f8hAGvTfg-FtssrRaCqJ-7-UxgKDDWL"
        ],
        sizes: ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12", "13"],
        category: "Running",
        badge: "New",
        rating: 4.8,
        reviewCount: 124,
        description: "Luxury meets ultimate sitting comfort. Explore the new generation of athletic footwear designed for unparalleled performance and street-ready style.",
        stockStatus: "in_stock",
        createdAt: new Date().toISOString()
      },
      {
        productId: "PROD-002",
        name: "Nike Air Max Pulse",
        brand: "Nike",
        price: 7999,
        originalPrice: 9999,
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCsh6ioprseMzD5n66SbeYiCqWiKJpRLZ8F89quMLTx--LSIGaQw4ONOspnuHzDJYxTO1LBMS9wfGQWktocIqfzFuAIJvDtcDg5aVCwn65SOsL7fvFy6oXcvJCzfvjrrGz7enPjJeqocYbGTeC8yEKHiXPVufxzaNYlhRJ7edB8H4iA2NKS0-yS-xRo4c2J-YsHdH9KefqFhSON9MoaPWQ83CApMm_8HyvO5n6DRMqQ5JfMBMZOd6ta",
        sizes: ["7", "8", "8.5", "9", "9.5", "10", "11"],
        category: "Lifestyle",
        badge: "New",
        rating: 4.5,
        reviewCount: 89,
        description: "Pristine athletic shoe with mint green and bright blue gradient accents. Engineered for all-day cushioning and sleek streetwear appeal.",
        stockStatus: "in_stock",
        createdAt: new Date().toISOString()
      },
      {
        productId: "PROD-003",
        name: "Air Jordan Retro High",
        brand: "Jordan",
        price: 12500,
        originalPrice: 15000,
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCY8l2hYzsJ34eQP0EkYiNXBwrz7_pNv6BLhGSR5-sM_id6GQ7pJLCRR5oXTbg1_jueuX4_Kn8nhQ58QzjEXwfMdafiOM-pO9MkXekzWsuYtbyvnmfCwORuRHDpSTa1uoX_rsfAl-gzG_g2pIKykMXTPwIIQTMqltCM9zGkL1BSjO3BmnatSD3dIqI9pDSef6FkEJlawRMYa9WNGpyABpAOfZ7QOYdzMFstn3R7DhAQrUlvNomKClUM",
        sizes: ["8", "8.5", "9", "9.5", "10", "10.5", "11", "12"],
        category: "Basketball",
        badge: "Hot",
        rating: 4.9,
        reviewCount: 230,
        description: "A premium lifestyle and court silhouette featuring subtle grey and soft lavender accents with iconic heritage details.",
        stockStatus: "in_stock",
        createdAt: new Date().toISOString()
      },
      {
        productId: "PROD-004",
        name: "Nike Metro Court",
        brand: "Nike",
        price: 3499,
        originalPrice: 4500,
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBQA0H8kzAlA8mZ6A9RrDDM_A8J7CWxmNXgC0v_KubV9B1jYe6hZPOpWdIwG34imN40ZQrH5HY3DYtecl9GirvX8RYmxdC0u-LvjS5AJNHpRXW16ktZz6Dgssx82Av9qSXQzToIb1g2-EAGDMM2IcWvDf6zDj1L3xbZUB3AVKhHZs99TEdHIPCkxc-EF6I29SghP53K9kLTxTa8CdwRrglKUjVnaJKrVrbSJZPEhWBPCU2cU-VYxNVB",
        sizes: ["7", "8", "9", "10", "11"],
        category: "Lifestyle",
        badge: "Hot",
        rating: 4.2,
        reviewCount: 56,
        description: "Lightweight running and walking sneaker with breathable mesh and peach foam sole cushioning.",
        stockStatus: "in_stock",
        createdAt: new Date().toISOString()
      },
      {
        productId: "PROD-005",
        name: "Air Spain Dynamic Retro",
        brand: "LuxeStep",
        price: 5499,
        originalPrice: 6999,
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDYl-8gPUJnC0X7N0nWyXGAVmBWGBFLbQHmT_T_wzp878qWriZvTZxs3QFSMsAuA1wwZcRRwpRC0YPmGwEzNFcM-xHsDXhtYJWPRcoumI6VUtFHYWdtUhm8ThcBo3uTjlmo82IrWU9qbtsRl8oSpzAml2IH5wl1JKqbSovrPyQtQ-vjwM7BICyz-Pv7v69lc_TuoGXP60bT-nWsakF9CZOM4f8hAGvTfg-FtssrRaCqJ-7-UxgKDDWL",
        sizes: ["7", "8", "8.5", "9", "10", "11"],
        category: "Lifestyle",
        badge: "-35%",
        rating: 4.6,
        reviewCount: 78,
        description: "Vibrant retro-inspired silhouette featuring sky blue, sunset yellow, and athletic red color blocking.",
        stockStatus: "in_stock",
        createdAt: new Date().toISOString()
      }
    ];

    setProducts(defaultProducts);

    const savedCart = localStorage.getItem("revivepay_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {}
    }
  }, []);

  const heroImages = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAfmxkAm9FxGl0cDWrdx4CipB_VGxi9X58jaQB9jyK7lLuDpEqIgKOTSqd4fKHnLCV8NYJj3RcHfPw3ZJ9sOr7gHPLllmwGEQk6AVXkawwCyexA9qpOe9te5yC3N7dMEramc9XRyUEJUfL4v7d-UW5BnhGfans41N3kwtG5ARGBTDzhBdjjI5Y1CAfnGkSfb8TYfgzAhtx1jbsPIMN0YzVbciNk2xTbkCrKnwK3M-THAxPfdXz-lDj-",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCY8l2hYzsJ34eQP0EkYiNXBwrz7_pNv6BLhGSR5-sM_id6GQ7pJLCRR5oXTbg1_jueuX4_Kn8nhQ58QzjEXwfMdafiOM-pO9MkXekzWsuYtbyvnmfCwORuRHDpSTa1uoX_rsfAl-gzG_g2pIKykMXTPwIIQTMqltCM9zGkL1BSjO3BmnatSD3dIqI9pDSef6FkEJlawRMYa9WNGpyABpAOfZ7QOYdzMFstn3R7DhAQrUlvNomKClUM",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDYl-8gPUJnC0X7N0nWyXGAVmBWGBFLbQHmT_T_wzp878qWriZvTZxs3QFSMsAuA1wwZcRRwpRC0YPmGwEzNFcM-xHsDXhtYJWPRcoumI6VUtFHYWdtUhm8ThcBo3uTjlmo82IrWU9qbtsRl8oSpzAml2IH5wl1JKqbSovrPyQtQ-vjwM7BICyz-Pv7v69lc_TuoGXP60bT-nWsakF9CZOM4f8hAGvTfg-FtssrRaCqJ-7-UxgKDDWL"
  ];

  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const item: OrderItem = {
      productId: product.productId,
      name: product.name,
      brand: product.brand,
      price: product.price,
      size: "9",
      quantity: 1,
      imageUrl: product.imageUrl
    };

    const newCart = [...cart, item];
    setCart(newCart);
    localStorage.setItem("revivepay_cart", JSON.stringify(newCart));

    setAddedProductId(product.productId);
    setTimeout(() => setAddedProductId(null), 1800);
  };

  const filtered = selectedCategory === "All Categories"
    ? products
    : products.filter(p => p.category === selectedCategory);

  return (
    <div className="bg-[#fff8f6] text-[#271814] font-sans min-h-screen flex flex-col relative overflow-x-hidden">
      <StoreHeader cartCount={cart.length} />

      <main className="flex-grow pt-[110px] pb-24 px-6 md:px-16 max-w-[1440px] mx-auto w-full flex flex-col gap-16">
        {/* Hero Section */}
        <section className="w-full bg-[#ffe9e4] rounded-3xl overflow-hidden relative min-h-[480px] flex flex-col md:flex-row items-center p-8 md:p-14 shadow-sm border border-[#e3beb6]/40">
          {/* Left Content */}
          <div className="w-full md:w-1/2 z-10 flex flex-col items-start gap-5 relative">
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#271814] max-w-lg leading-tight tracking-tight">
              Are you ready to <br /><span className="text-[#b32a03]">lead the way</span>
            </h1>
            <p className="text-sm md:text-base text-[#5a413a] max-w-md leading-relaxed">
              Luxury meets ultimate sitting comfort. Explore the new generation of athletic footwear designed for unparalleled performance and street-ready style.
            </p>
            <Link
              href="/store/product/PROD-001"
              className="bg-[#b32a03] text-white px-8 py-3.5 rounded-full font-bold text-sm hover:scale-105 transition-transform duration-300 flex items-center gap-2 mt-2 shadow-lg shadow-[#b32a03]/20"
            >
              <span>Discover Aeon Runner</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Thumbnails switcher */}
            <div className="flex gap-3 mt-6">
              {heroImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setHeroImageIndex(i)}
                  className={`w-14 h-14 rounded-xl p-1 overflow-hidden transition-all ${
                    heroImageIndex === i
                      ? "border-2 border-[#b32a03] bg-white scale-105"
                      : "border border-[#e3beb6] bg-white/60 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="Hero thumbnail" className="w-full h-full object-contain mix-blend-multiply" />
                </button>
              ))}
            </div>
          </div>

          {/* Right Floating Shoe */}
          <div className="w-full md:w-1/2 flex justify-center md:justify-end items-center relative z-0 mt-8 md:mt-0">
            <img
              src={heroImages[heroImageIndex]}
              alt="Featured Sneaker"
              className="w-full max-h-[380px] md:max-h-[460px] object-contain drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
            />
          </div>
        </section>

        {/* Category Nav Tabs */}
        <section className="flex justify-center w-full">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide max-w-fit">
            {["All Categories", "Running", "Lifestyle", "Basketball"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-[#b32a03] text-white shadow-md"
                    : "bg-white border border-[#e3beb6] text-[#5a413a] hover:text-[#b32a03] hover:border-[#b32a03]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Product Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
          {filtered.map((product) => (
            <div
              key={product.productId}
              onClick={() => router.push(`/store/product/${product.productId}`)}
              className="group flex flex-col gap-3 cursor-pointer relative bg-white p-4 rounded-2xl border border-[#e3beb6]/40 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5"
            >
              <div className="bg-[#f8dcd6]/40 rounded-xl aspect-[4/5] relative overflow-hidden flex items-center justify-center p-6 transition-colors group-hover:bg-[#f8dcd6]/70">
                {product.badge && (
                  <span className="absolute top-3 left-3 bg-[#b32a03] text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full z-10 shadow-sm">
                    {product.badge}
                  </span>
                )}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-auto object-contain z-0 transform group-hover:scale-110 transition-transform duration-500 drop-shadow-xl mix-blend-multiply"
                />

                {/* Quick Add Action Button */}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                  <button
                    onClick={(e) => handleQuickAdd(product, e)}
                    className="bg-white text-[#271814] p-3 rounded-full shadow-lg hover:bg-[#b32a03] hover:text-white transition-all scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 duration-300"
                    title="Add to Cart"
                  >
                    {addedProductId === product.productId ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <ShoppingCart className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="flex flex-col gap-1 px-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-base font-bold text-[#271814] group-hover:text-[#b32a03] transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center text-xs font-bold text-[#5a413a]">
                    <Star className="w-3.5 h-3.5 fill-[#b32a03] text-[#b32a03] mr-0.5" />
                    <span>{product.rating}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-extrabold text-[#b32a03]">₹{product.price.toLocaleString()}</span>
                  {product.originalPrice && (
                    <span className="text-xs text-[#8e7069] line-through">₹{product.originalPrice.toLocaleString()}</span>
                  )}
                </div>

                {/* Swatches */}
                <div className="flex gap-1.5 mt-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f38]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2a2a2a]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#bad237]" />
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>

      <StoreFooter />
      <DemoSimulatorModal />
    </div>
  );
}
