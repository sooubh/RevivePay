import { NextRequest, NextResponse } from "next/server";
import { dbService } from "@/lib/firebase/db";
import { DispatchedMessage } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { opportunityId, channel = "whatsapp", customNote } = body;

    if (!opportunityId) {
      return NextResponse.json({ error: "Missing opportunityId" }, { status: 400 });
    }

    const opp = await dbService.getRecoveryOpportunityById(opportunityId);
    if (!opp) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const customer = await dbService.getCustomerById(opp.customerId);
    const recipientContact = channel === "email" ? (opp.customerEmail || "customer@example.com") : (customer?.phone || "+91 98765 43210");
    const incentive = opp.incentiveOffer;

    let defaultMsg = `Hi ${opp.customerName || "there"}! We noticed your checkout of ₹${opp.amount.toLocaleString()} was interrupted.`;
    if (incentive && incentive.type !== "none") {
      defaultMsg += ` We've reserved your size for 15 mins and unlocked ${incentive.label}!`;
    } else {
      defaultMsg += ` Your basket and shoe size are reserved for 15 minutes.`;
    }
    if (customNote) {
      defaultMsg += ` ${customNote}`;
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const paymentLink = `${protocol}://${host}/store/payment?oppId=${opp.opportunityId}&orderId=${opp.orderId}`;

    const dispatched: DispatchedMessage = {
      dispatchId: `DSP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      opportunityId: opp.opportunityId,
      channel: channel as "whatsapp" | "sms" | "email",
      recipientName: opp.customerName || "Valued Customer",
      recipientContact,
      messageContent: `${defaultMsg}\n\nComplete in 1-click: ${paymentLink}`,
      incentiveAttached: incentive,
      status: "delivered",
      paymentLink,
      dispatchedAt: new Date().toISOString()
    };

    const saved = await dbService.dispatchMessage(dispatched);

    return NextResponse.json({
      success: true,
      dispatched: saved,
      message: `Recovery message successfully dispatched via ${channel.toUpperCase()}`
    });
  } catch (error: any) {
    console.error("Error in dispatch API:", error);
    return NextResponse.json({ error: error.message || "Failed to dispatch message" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const oppId = searchParams.get("opportunityId") || undefined;
    const messages = await dbService.getDispatchedMessages(oppId);
    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
