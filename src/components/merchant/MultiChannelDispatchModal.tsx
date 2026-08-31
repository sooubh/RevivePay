"use client";

import React, { useState } from "react";
import { RecoveryOpportunity } from "@/lib/types";
import { X, Send, MessageSquare, Phone, Mail, CheckCircle2, ShieldCheck, Tag, ExternalLink } from "lucide-react";

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

  const incentive = opportunity.incentiveOffer;
  const paymentLink = `http://localhost:3000/store/payment?oppId=${opportunity.opportunityId}&orderId=${opportunity.orderId}`;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#1e1e1e] text-white w-full max-w-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20 flex flex-col space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4FF00] text-black flex items-center justify-center font-black shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Multi-Channel Recovery Dispatch</h3>
              <p className="text-xs text-white/60">Send personalized 1-click payment intent to customer</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-white/80 transition-colors"
          >
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
                className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#D4FF00] text-black border-[#D4FF00] font-bold shadow-md scale-105"
                    : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{c.label}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full ${isSelected ? "bg-black/20 text-black font-extrabold" : "bg-white/10 text-white/60"}`}>
                  {c.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Message Preview Bubble */}
        <div className="bg-[#121b22] p-4 rounded-2xl border border-white/10 space-y-2.5">
          <div className="flex justify-between items-center text-[10px] text-white/50 font-mono">
            <span>PREVIEW: {channel.toUpperCase()} DISPATCH</span>
            <span>To: {opportunity.customerName || "Customer"}</span>
          </div>

          <div className="p-3.5 bg-[#005c4b] text-white text-xs rounded-2xl rounded-tl-sm space-y-2 shadow-sm max-w-md">
            <p className="leading-relaxed">
              Hi <span className="font-bold">{opportunity.customerName || "Sarah"}</span>! We noticed your checkout for{" "}
              <span className="font-bold">₹{opportunity.amount.toLocaleString()}</span> was interrupted due to a gateway timeout.
            </p>

            {incentive && incentive.type !== "none" && (
              <div className="bg-black/20 p-2.5 rounded-xl border border-white/10 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-[#D4FF00]">
                  <Tag className="w-3.5 h-3.5" />
                  <span className="font-bold">{incentive.label} Applied</span>
                </div>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white">15m hold</span>
              </div>
            )}

            <p className="text-[11px] text-white/80">
              Your shoe size & cart are reserved for 15 minutes. Tap below to complete with 1-click UPI:
            </p>

            <div className="pt-1">
              <a
                href={paymentLink}
                target="_blank"
                rel="noreferrer"
                className="bg-white text-[#005c4b] font-extrabold px-4 py-2 rounded-xl text-center flex items-center justify-center gap-1.5 text-xs shadow-md"
              >
                <span>⚡ Pay with UPI (1-Click)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-white/20 text-xs font-semibold text-white/80 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleDispatch}
            disabled={sending || sentSuccess}
            className="bg-[#D4FF00] text-black font-extrabold px-6 py-2.5 rounded-full text-xs hover:bg-[#b8de00] transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
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
                <span>Dispatch {channel.toUpperCase()} Link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
