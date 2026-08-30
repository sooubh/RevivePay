import { NextRequest, NextResponse } from "next/server";
import { dbService } from "@/lib/firebase/db";
import { Customer } from "@/lib/types";

function generateCustomerId(): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "CUS-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId") || searchParams.get("id");

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    const customer = await dbService.getCustomerById(customerId.toUpperCase());
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error("Error looking up customer:", error);
    return NextResponse.json({ error: "Failed to lookup customer" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, shoeSize, email, phone } = body as {
      name: string;
      shoeSize: string;
      email?: string;
      phone?: string;
    };

    if (!name || !shoeSize) {
      return NextResponse.json({ error: "Name and shoe size are required" }, { status: 400 });
    }

    const customerId = generateCustomerId();
    const newCustomer: Customer = {
      customerId,
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      phone: phone || "+91 98765 00000",
      shoeSize,
      totalSpend: 0,
      successfulPayments: 0,
      failedPayments: 0,
      preferredPaymentMethod: "upi",
      recoveryHistory: [],
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString()
    };

    await dbService.createCustomer(newCustomer);

    return NextResponse.json({ success: true, customer: newCustomer });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
