"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import DemoSimulatorModal from "@/components/simulator/DemoSimulatorModal";
import { Product, OrderItem } from "@/lib/types";
import { Star, ShoppingCart, Heart, ChevronRight, Check, Shield, Truck, RotateCcw, ArrowRight } from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string || "PROD-001";

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("9");
  const [selectedColor, setSelectedColor] = useState<string>("Crimson / Cloud");
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    // Load customer preferred size if available
    const savedCustomer = localStorage.getItem("revivepay_customer");
    if (savedCustomer) {
      try {
        const c = JSON.parse(savedCustomer);
        if (c.shoeSize) setSelectedSize(c.shoeSize);
      } catch (e) {}
    }

    // Default catalog
    const catalog: Record<string, Product> = {
      "PROD-001": {
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
      "PROD-002": {
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
      "PROD-003": {
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
      }
    };

    const current = catalog[productId] || catalog["PROD-001"];
    setProduct(current);
    setSelectedImage(current.imageUrl);

    const savedCart = localStorage.getItem("revivepay_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {}
    }
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    const item: OrderItem = {
      productId: product.productId,
      name: product.name,
      brand: product.brand,
      price: product.price,
      size: selectedSize,
      color: selectedColor,
      quantity: 1,
      imageUrl: product.imageUrl
    };

    const newCart = [...cart, item];
    setCart(newCart);
    localStorage.setItem("revivepay_cart", JSON.stringify(newCart));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    const item: OrderItem = {
      productId: product.productId,
      name: product.name,
      brand: product.brand,
      price: product.price,
      size: selectedSize,
      color: selectedColor,
      quantity: 1,
      imageUrl: product.imageUrl
    };
    const newCart = [item];
    setCart(newCart);
    localStorage.setItem("revivepay_cart", JSON.stringify(newCart));
    router.push("/store/checkout");
  };

  if (!product) return null;

  return (
    <div className="bg-[#fff8f6] text-[#271814] font-sans min-h-screen flex flex-col relative overflow-x-hidden">
      <StoreHeader cartCount={cart.length} />

      <main className="flex-grow pt-[110px] pb-24 px-6 md:px-16 max-w-[1440px] mx-auto w-full">
        {/* Breadcrumbs */}
        <nav className="flex text-xs font-semibold text-[#5a413a] mb-8 items-center gap-2">
          <Link href="/store" className="hover:text-[#b32a03] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="hover:text-[#b32a03] cursor-pointer">{product.category}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#b32a03] font-bold">{product.name}</span>
        </nav>

        {/* Product Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Column: Imagery */}
          <div className="flex flex-col gap-5 sticky top-28">
            <div className="relative bg-[#fee2dc]/50 border border-[#e3beb6]/40 rounded-3xl overflow-hidden aspect-[4/3] flex items-center justify-center p-8 shadow-sm">
              <img
                src={selectedImage || product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain mix-blend-multiply drop-shadow-xl transform hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-5 left-5 flex gap-2">
                <span className="bg-[#b32a03] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                  {product.badge || "NEW"}
                </span>
                <span className="bg-white/80 backdrop-blur-md text-[#271814] text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-sm">
                  {product.category}
                </span>
              </div>
            </div>

            {/* Thumbnails */}
            {product.thumbnails && product.thumbnails.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product.thumbnails.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(t)}
                    className={`w-20 h-20 rounded-2xl bg-white border-2 p-1 overflow-hidden transition-all ${
                      selectedImage === t ? "border-[#b32a03] scale-105 shadow-md" : "border-[#e3beb6] opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={t} alt="Thumbnail" className="w-full h-full object-contain mix-blend-multiply" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Information & Actions */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex justify-between items-start">
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#271814] tracking-tight mb-2">
                  {product.name}
                </h1>
                <button className="p-2.5 rounded-full hover:bg-[#fee2dc] transition-colors text-[#5a413a] hover:text-[#b32a03]">
                  <Heart className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <p className="text-2xl font-black text-[#b32a03]">₹{product.price.toLocaleString()}.00</p>
                {product.originalPrice && (
                  <p className="text-sm text-[#8e7069] line-through">₹{product.originalPrice.toLocaleString()}.00</p>
                )}
                <div className="flex items-center gap-1 bg-[#fee2dc] px-2.5 py-1 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-[#b32a03] text-[#b32a03]" />
                  <span className="text-xs font-bold text-[#271814]">{product.rating}</span>
                  <span className="text-[11px] text-[#5a413a]">({product.reviewCount} reviews)</span>
                </div>
              </div>
            </div>

            <hr className="border-[#e3beb6]/40" />

            <p className="text-sm text-[#5a413a] leading-relaxed">
              {product.description}
            </p>

            {/* Color Selection */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <h3 className="text-xs font-bold text-[#271814] uppercase tracking-wider">Color</h3>
                <span className="text-xs font-medium text-[#5a413a]">{selectedColor}</span>
              </div>
              <div className="flex gap-3">
                {[
                  { name: "Crimson / Cloud", hex: "#ff5f38" },
                  { name: "Midnight Black", hex: "#1e293b" },
                  { name: "Glacier White", hex: "#e2e8f0" }
                ].map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c.name)}
                    className={`w-9 h-9 rounded-full transition-all shadow-sm ${
                      selectedColor === c.name ? "ring-2 ring-offset-2 ring-[#b32a03] scale-110" : "border border-gray-300"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <h3 className="text-xs font-bold text-[#271814] uppercase tracking-wider">
                  Select Size (US Men's)
                </h3>
                <span className="text-xs text-[#b32a03] font-semibold">Size Guide</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                      selectedSize === s
                        ? "bg-[#b32a03] text-white border-[#b32a03] shadow-md scale-105"
                        : "bg-white border-[#e3beb6] text-[#271814] hover:border-[#b32a03] hover:text-[#b32a03]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-white text-[#b32a03] border-2 border-[#b32a03] py-3.5 px-6 rounded-full font-bold text-sm hover:bg-[#b32a03]/5 transition-all flex justify-center items-center gap-2 shadow-sm"
              >
                {added ? <Check className="w-4 h-4 text-green-600" /> : <ShoppingCart className="w-4 h-4" />}
                <span>{added ? "Added to Cart!" : "Add to Cart"}</span>
              </button>

              <button
                onClick={handleBuyNow}
                className="flex-1 bg-[#b32a03] text-white py-3.5 px-6 rounded-full font-bold text-sm hover:bg-[#8a1c00] transition-all flex justify-center items-center gap-2 shadow-lg shadow-[#b32a03]/20"
              >
                <span>Buy Now (₹{product.price.toLocaleString()})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#e3beb6]/40 text-center">
              <div className="flex flex-col items-center gap-1 p-2">
                <Truck className="w-4 h-4 text-[#b32a03]" />
                <span className="text-[11px] font-bold text-[#271814]">Free Express Delivery</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2">
                <RotateCcw className="w-4 h-4 text-[#b32a03]" />
                <span className="text-[11px] font-bold text-[#271814]">30-Day Returns</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2">
                <Shield className="w-4 h-4 text-[#b32a03]" />
                <span className="text-[11px] font-bold text-[#271814]">Razorpay Protected</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <StoreFooter />
      <DemoSimulatorModal />
    </div>
  );
}
