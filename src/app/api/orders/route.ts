import { NextRequest, NextResponse } from "next/server";
import { dbService } from "@/lib/firebase/db";
import { Order } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("id") || searchParams.get("orderId");
    const customerId = searchParams.get("customerId");

    if (orderId) {
      const order = await dbService.getOrderById(orderId);
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, order });
    }

    let orders = await dbService.getOrders();
    if (customerId) {
      orders = orders.filter((o) => o.customerId === customerId);
    }

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const updated = await dbService.updateOrder(orderId, {
      ...(status ? { status } : {}),
      updatedAt: new Date().toISOString()
    });

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
