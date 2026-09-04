import { NextRequest, NextResponse } from "next/server";
import { razorpayInstance, key_id } from "@/lib/razorpay/client";
import { dbService } from "@/lib/firebase/db";
import { Order, OrderItem } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      amount,
      currency = "INR",
      receipt,
      items,
      customerId,
      customerName,
      customerEmail,
      shippingAddress
    } = body as {
      amount?: number; // In INR or paise
      currency?: string;
      receipt?: string;
      items?: OrderItem[];
      customerId?: string;
      customerName?: string;
      customerEmail?: string;
      shippingAddress?: any;
    };

    // Calculate total amount
    let totalInr = amount || 0;
    if (items && items.length > 0) {
      let subtotal = 0;
      for (const item of items) {
        const product = await dbService.getProductById(item.productId);
        const price = product ? product.price : item.price;
        subtotal += price * (item.quantity || 1);
      }
      const tax = Math.round(subtotal * 0.05);
      totalInr = subtotal + tax;
    } else if (totalInr > 0) {
      // If amount is passed in paise (> 10000), convert to INR
      if (totalInr > 50000 && !items) {
        totalInr = Math.round(totalInr / 100);
      }
    } else {
      totalInr = 4999;
    }

    const amountPaise = totalInr * 100;

    // Minimum amount validation: 100 paise (₹1.00)
    if (amountPaise < 100) {
      return NextResponse.json(
        { success: false, error: "Order amount must be at least 100 paise (₹1.00)" },
        { status: 400 }
      );
    }

    const orderId = receipt || `ORD-${Date.now().toString().slice(-6)}`;
    let razorpayOrderId = `order_${Date.now()}`;

    // Call real Razorpay API if instance is configured
    if (razorpayInstance) {
      const rzpOrder = await razorpayInstance.orders.create({
        amount: amountPaise,
        currency,
        receipt: orderId,
        notes: {
          customerId: customerId || "CUS-8F42K1",
          customerName: customerName || "Customer",
          platform: "RevivePay"
        }
      });
      razorpayOrderId = rzpOrder.id;
    } else {
      console.warn("[Razorpay] Instance not initialized (missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET). Using development order fallback.");
    }

    // Persist order in data layer
    const newOrder: Order = {
      orderId,
      customerId: customerId || "CUS-8F42K1",
      customerName: customerName || "Sarah Jenkins",
      customerEmail: customerEmail || "sarah.j@example.com",
      items: items || [],
      subtotal: totalInr,
      shipping: 0,
      tax: Math.round(totalInr * 0.05),
      total: totalInr,
      status: "pending",
      razorpayOrderId,
      shippingAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbService.createOrder(newOrder);

    return NextResponse.json({
      success: true,
      order_id: razorpayOrderId,
      razorpayOrderId,
      orderId,
      amount: totalInr,
      amount_paise: amountPaise,
      currency,
      key_id,
      keyId: key_id,
      receipt: orderId,
      customerName: newOrder.customerName,
      customerEmail: newOrder.customerEmail,
      order: newOrder
    });
  } catch (error: any) {
    console.error("Error in create-order route:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}
