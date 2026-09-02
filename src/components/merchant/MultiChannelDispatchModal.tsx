"use client";

import React, { useState, useEffect } from "react";
import { RecoveryOpportunity } from "@/lib/types";
import { X, Send, MessageSquare, Phone, Mail, CheckCircle2, Tag, ExternalLink, Copy, Check } from "lucide-react";

interface Props {
  opportunity: RecoveryOpportunity;
  onClose: () => void;
  onDispatched?: () => void;
}

export default function MultiChannelDispatchModal({ opportunity, onClose, onDispatched }: Props) {
  const [channel, setChannel] = useState<"whatsapp" | "sms" | "email">("whatsapp");
  const [customNote, setCustomNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("http://localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const incentive = opportunity.incentiveOffer;
  const paymentLink = `${origin}/store/payment?oppId=${opportunity.opportunityId}&orderId=${opportunity.orderId}&amount=${opportunity.amount}&name=${encodeURIComponent(opportunity.customerName || "Customer")}`;
  
  // Clean phone number for WhatsApp / SMS intents (strip spaces, symbols)
  const rawPhone = opportunity.customerEmail ? "+91 98765 43210" : "+91 98765 43210";
  const cleanPhone = rawPhone.replace(/[^0-9]/g, "");

  // Dynamic Message Construction
  let baseMsg = `Hi ${opportunity.customerName || "there"}! We noticed your checkout of ₹${opportunity.amount.toLocaleString()} was interrupted.`;
  if (incentive && incentive.type !== "none") {
    baseMsg += ` We've reserved your size for 15 mins and unlocked ${incentive.label}!`;
  } else {
    baseMsg += ` Your basket and shoe size are reserved for 15 minutes.`;
  }
  if (customNote.trim()) {
    baseMsg += ` ${customNote.trim()}`;
  }
  const fullMessage = `${baseMsg}\n\nComplete in 1-click: ${paymentLink}`;

  // External Intent URLs
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMessage)}`;
  const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(fullMessage)}`;
  const emailSubject = `Complete your order (₹${opportunity.amount.toLocaleString()}) - Cart Reserved`;
  const emailBody = `Hi ${opportunity.customerName || "Customer"},\n\n${baseMsg}\n\nClick here to securely complete your payment:\n${paymentLink}\n\nBest regards,\nRevivePay Footwear Store`;
  const mailtoUrl = `mailto:${opportunity.customerEmail || "customer@example.com"}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  const handleDispatch = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/recovery/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: opportunity.opportunityId,
          channel,
          customNote
        })
      });
      const data = await res.json();
      if (data.success) {
        setSentSuccess(true);
        if (onDispatched) onDispatched();
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (e) {
      console.error("Dispatch error:", e);
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#1e1e1e] text-white w-full max-w-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20 flex flex-col space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4FF00] text-black flex items-center justify-center font-black shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Multi-Channel Recovery Dispatch</h3>
              <p className="text-xs text-white/60">Generate real 1-click payment intents across WhatsApp, SMS & Email</p>
            </div>
          </div>

          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-white/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Channel Selector */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, badge: "88% Open Rate" },
            { id: "sms", label: "SMS Intent", icon: Phone, badge: "Instant" },
            { id: "email", label: "Email Link", icon: Mail, badge: "Standard" }
          ].map((c) => {
            const Icon = c.icon;
            const isSelected = channel === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setChannel(c.id as any)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                  isSelected
                    ? "bg-[#D4FF00] text-black border-[#D4FF00] font-bold shadow-md scale-105"
                    : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs">{c.label}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full ${isSelected ? "bg-black/20 text-black font-extrabold" : "bg-white/10 text-white/60"}`}>
                  {c.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Channel Previews */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] text-white/50 font-mono">
            <span>PREVIEW: {channel.toUpperCase()} DISPATCH</span>
            <span>Recipient: {opportunity.customerName || "Customer"}</span>
          </div>

          {channel === "whatsapp" && (
            <div className="bg-[#121b22] p-4 rounded-2xl border border-white/10 space-y-2.5">
              <div className="p-3.5 bg-[#005c4b] text-white text-xs rounded-2xl rounded-tl-sm space-y-2 shadow-sm max-w-md">
                <p className="leading-relaxed">{baseMsg}</p>
                {incentive && incentive.type !== "none" && (
                  <div className="bg-black/20 p-2 rounded-xl border border-white/10 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#D4FF00]">⚡ {incentive.label} Applied</span>
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">15m hold</span>
                  </div>
                )}
                <div className="pt-1">
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="bg-white text-[#005c4b] font-extrabold px-3 py-2 rounded-xl text-center flex items-center justify-center gap-1.5 text-xs shadow-md hover:bg-gray-100">
                    <span>⚡ Complete with 1-Click UPI</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {channel === "sms" && (
            <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/10 space-y-2">
              <div className="p-3.5 bg-[#2563eb] text-white text-xs rounded-2xl rounded-tl-sm space-y-2 shadow-sm max-w-md">
                <p className="leading-relaxed">{fullMessage}</p>
              </div>
              <div className="flex justify-between text-[10px] text-white/40 font-mono">
                <span>Segments: 1 SMS</span>
                <span>Carrier: Twilio / Gupshup</span>
              </div>
            </div>
          )}

          {channel === "email" && (
            <div className="bg-[#1e293b] p-4 rounded-2xl border border-white/10 space-y-2 text-xs">
              <div className="bg-white/5 p-2 rounded-lg border border-white/10 space-y-1">
                <div><span className="text-white/40">Subject:</span> <span className="font-bold">{emailSubject}</span></div>
                <div><span className="text-white/40">To:</span> <span>{opportunity.customerEmail || "sarah.j@example.com"}</span></div>
              </div>
              <div className="p-3 bg-white text-gray-900 rounded-xl space-y-2 text-xs">
                <p className="leading-relaxed">{baseMsg}</p>
                <div className="pt-2">
                  <a href={paymentLink} target="_blank" rel="noreferrer" className="inline-block bg-[#D4FF00] text-black font-extrabold px-4 py-2 rounded-lg text-xs">
                    Complete Checkout Now →
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Custom Note Input */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-white/70 uppercase">
            Add Custom Personalized Note (Optional)
          </label>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="e.g. 'Use code SAVE5 for an extra 5% off!'"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-[#D4FF00] outline-none"
          />
        </div>

        {/* Action Buttons & Real Intents */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
          <button
            onClick={handleCopyLink}
            className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white/80 flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#D4FF00]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Link Copied!" : "Copy Link"}</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Real Launch Intent Button */}
            <a
              href={channel === "whatsapp" ? whatsappUrl : channel === "sms" ? smsUrl : mailtoUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-full border border-[#D4FF00]/40 text-[#D4FF00] hover:bg-[#D4FF00]/10 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Launch {channel === "whatsapp" ? "WhatsApp" : channel === "sms" ? "SMS" : "Mail"}</span>
            </a>

            {/* In-App Dispatch */}
            <button
              onClick={handleDispatch}
              disabled={sending || sentSuccess}
              className="bg-[#D4FF00] text-black font-extrabold px-5 py-2.5 rounded-full text-xs hover:bg-[#b8de00] transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {sentSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-black stroke-[3]" />
                  <span>Dispatched!</span>
                </>
              ) : sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Log & Dispatch</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
