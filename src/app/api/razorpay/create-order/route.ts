import { NextRequest, NextResponse } from "next/server";
import { razorpayInstance, key_id } from "@/lib/razorpay/client";
import { dbService } from "@/lib/firebase/db";
import { Order, OrderItem } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, customerId, customerName, customerEmail, shippingAddress } = body as {
      items: OrderItem[];
      customerId: string;
      customerName: string;
      customerEmail?: string;
      shippingAddress?: any;
    };

    if (!items || !items.length) {
      return NextResponse.json({ error: "Cart items are required" }, { status: 400 });
    }

    // Deterministic price calculation server-side (never trust client total alone)
    let subtotal = 0;
    for (const item of items) {
      const product = await dbService.getProductById(item.productId);
      const price = product ? product.price : item.price;
      subtotal += price * (item.quantity || 1);
    }

    const shipping = 0; // Free shipping
    const tax = Math.round(subtotal * 0.05); // 5% GST
    const total = subtotal + shipping + tax;

    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    let razorpayOrderId = `order_${Date.now()}`;

    // Create real Razorpay order if real keys are configured
    if (razorpayInstance) {
      try {
        const rzpOrder = await razorpayInstance.orders.create({
          amount: total * 100, // Amount in paise
          currency: "INR",
          receipt: orderId,
          notes: {
            customerId,
            customerName
          }
        });
        razorpayOrderId = rzpOrder.id;
      } catch (err) {
        console.warn("Razorpay API create order error, using fallback test ID:", err);
      }
    }

    const newOrder: Order = {
      orderId,
      customerId: customerId || "CUS-8F42K1",
      customerName: customerName || "Customer",
      customerEmail,
      items,
      subtotal,
      shipping,
      tax,
      total,
      status: "pending",
      razorpayOrderId,
      shippingAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbService.createOrder(newOrder);

    return NextResponse.json({
      success: true,
      orderId,
      razorpayOrderId,
      amount: total,
      amountPaise: total * 100,
      currency: "INR",
      keyId: key_id,
      customerName: newOrder.customerName,
      customerEmail: newOrder.customerEmail
    });
  } catch (error) {
    console.error("Error in create-order route:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
