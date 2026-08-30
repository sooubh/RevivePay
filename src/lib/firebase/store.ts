import {
  Customer,
  Product,
  Order,
  Payment,
  RecoveryOpportunity,
  RecoveryDecision,
  RecoveryAction,
  RecoveryOutcome,
  AuditLog,
  MerchantPolicy,
  OverviewMetrics,
  OpportunityStatus,
  RecoveryStrategyType
} from "@/lib/types";

type ListenerCallback<T> = (data: T) => void;

class DataStore {
  private static instance: DataStore;
  private products: Map<string, Product> = new Map();
  private customers: Map<string, Customer> = new Map();
  private orders: Map<string, Order> = new Map();
  private payments: Map<string, Payment> = new Map();
  private opportunities: Map<string, RecoveryOpportunity> = new Map();
  private decisions: Map<string, RecoveryDecision> = new Map();
  private actions: Map<string, RecoveryAction> = new Map();
  private outcomes: Map<string, RecoveryOutcome> = new Map();
  private auditLogs: AuditLog[] = [];
  private policy: MerchantPolicy = {
    merchantId: "MERCH-001",
    maxRetries: 2,
    maxCustomerMessages: 1,
    humanApprovalThreshold: 20000,
    minimumRecoveryProbability: 0.20,
    cooldownMinutes: 15,
    autoExecuteStrategies: ["alternate_payment", "retry_now", "delayed_retry", "recovery_link"],
    updatedAt: new Date().toISOString()
  };

  private opportunityListeners: Set<ListenerCallback<RecoveryOpportunity[]>> = new Set();
  private auditListeners: Set<ListenerCallback<AuditLog[]>> = new Set();
  private singleOpportunityListeners: Map<string, Set<ListenerCallback<RecoveryOpportunity | null>>> = new Map();
  private metricsListeners: Set<ListenerCallback<OverviewMetrics>> = new Set();

  private constructor() {
    this.initDefaultSeed();
  }

  public static getInstance(): DataStore {
    const globalRef = (globalThis as any)._revivepay_dataStore;
    if (globalRef) {
      return globalRef;
    }
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    (globalThis as any)._revivepay_dataStore = DataStore.instance;
    return DataStore.instance;
  }

  public initDefaultSeed() {
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
        colors: [
          { name: "Crimson / Cloud", hex: "#ff5f38" },
          { name: "Midnight Black", hex: "#1e293b" },
          { name: "Glacier White", hex: "#e2e8f0" }
        ],
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
        colors: [
          { name: "Mint / Blue", hex: "#bad237" },
          { name: "Stealth Black", hex: "#2a2a2a" }
        ],
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
        colors: [
          { name: "Lavender / Grey", hex: "#cabeff" },
          { name: "Chicago Red", hex: "#ba1a1a" }
        ],
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
        colors: [
          { name: "Peach / Teal", hex: "#ffdad2" },
          { name: "Core Black", hex: "#1c1b1b" }
        ],
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
        colors: [
          { name: "Sky / Yellow / Red", hex: "#7A90A2" },
          { name: "Mono White", hex: "#ffffff" }
        ],
        stockStatus: "in_stock",
        createdAt: new Date().toISOString()
      }
    ];

    defaultProducts.forEach(p => this.products.set(p.productId, p));

    const defaultCustomers: Customer[] = [
      {
        customerId: "CUS-8F42K1",
        name: "Sarah Jenkins",
        email: "sarah.j@example.com",
        phone: "+91 98765 43210",
        shoeSize: "9",
        totalSpend: 28500,
        successfulPayments: 4,
        failedPayments: 1,
        preferredPaymentMethod: "upi",
        recoveryHistory: [
          {
            opportunityId: "OPP-HIST-01",
            strategy: "alternate_payment",
            recovered: true,
            amount: 4999,
            date: "2026-08-15T10:00:00Z"
          }
        ],
        createdAt: "2026-07-01T00:00:00Z",
        lastSeenAt: new Date().toISOString()
      },
      {
        customerId: "CUS-3B91X2",
        name: "Rohan Sharma",
        email: "rohan.s@example.com",
        phone: "+91 98111 22334",
        shoeSize: "10",
        totalSpend: 15400,
        successfulPayments: 2,
        failedPayments: 1,
        preferredPaymentMethod: "card",
        recoveryHistory: [],
        createdAt: "2026-07-10T00:00:00Z",
        lastSeenAt: new Date().toISOString()
      },
      {
        customerId: "CUS-7M44Q8",
        name: "Ananya Patel",
        email: "ananya.p@example.com",
        phone: "+91 98222 33445",
        shoeSize: "8",
        totalSpend: 42000,
        successfulPayments: 6,
        failedPayments: 0,
        preferredPaymentMethod: "upi",
        recoveryHistory: [],
        createdAt: "2026-06-20T00:00:00Z",
        lastSeenAt: new Date().toISOString()
      }
    ];

    defaultCustomers.forEach(c => this.customers.set(c.customerId, c));

    const defaultOpportunities: RecoveryOpportunity[] = [
      {
        opportunityId: "TXN-8921-X",
        paymentId: "PAY-8921-X",
        orderId: "ORD-8921-X",
        customerId: "CUS-8F42K1",
        customerName: "Sarah Jenkins",
        customerEmail: "sarah.j@example.com",
        amount: 12500,
        currency: "INR",
        sourceType: "razorpay_failure",
        paymentMethod: "card",
        failureType: "Card issuer decline",
        attemptCount: 1,
        status: "recovery_recommended",
        priority: "High Priority",
        recoveryProbability: 0.82,
        expectedRecovery: 10200,
        recommendedAction: "Alternate UPI",
        recommendationReason: "Higher estimated recovery with lower customer friction.",
        selectedStrategy: "alternate_payment",
        decision: {
          decisionId: "DEC-8921-X",
          opportunityId: "TXN-8921-X",
          failureAnalysis: {
            failureCategory: "card_declined",
            isRecoverable: true,
            rootCause: "Card issuer declined transaction due to temporary fraud check or limit.",
            customerRiskProfile: "low",
            suggestedFocus: "Prompt alternate payment via UPI"
          },
          prediction: {
            recoveryProbability: 0.82,
            confidence: 0.91,
            reasoning: "Customer has completed 4 of last 5 purchases via UPI successfully.",
            keyDrivers: ["Prior UPI success rate (80%)", "High customer lifetime spend"]
          },
          strategiesEvaluated: [
            {
              strategy: "retry_now",
              label: "Retry now",
              probability: 0.31,
              expectedRecovery: 3875,
              friction: "low",
              interventionCost: 0,
              score: 3875,
              reasoning: "Immediate retry has low success chance for issuer declines"
            },
            {
              strategy: "delayed_retry",
              label: "Retry later",
              probability: 0.61,
              expectedRecovery: 7625,
              friction: "low",
              interventionCost: 0,
              score: 7625,
              reasoning: "Delayed retry gives time for card issue resolution"
            },
            {
              strategy: "alternate_payment",
              label: "Alternate UPI",
              probability: 0.82,
              expectedRecovery: 10200,
              friction: "low",
              interventionCost: 0,
              score: 10200,
              reasoning: "Highest estimated recovery with lower customer friction"
            }
          ],
          selectedStrategy: "alternate_payment",
          selectedStrategyLabel: "Alternate UPI",
          recoveryProbability: 0.82,
          expectedRecovery: 10200,
          recommendationReason: "Higher estimated recovery with lower customer friction.",
          guardrailOutcome: "AUTO_EXECUTE",
          guardrailNotes: [
            "Within maximum retry limit (attempt 1 <= 2)",
            "Within auto-execute threshold (₹12,500 <= ₹20,000)"
          ],
          model: "gemini-2.5-flash",
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        opportunityId: "TXN-8922-Y",
        paymentId: "PAY-8922-Y",
        orderId: "ORD-8922-Y",
        customerId: "CUS-8F42K1",
        customerName: "Sarah Jenkins",
        customerEmail: "sarah.j@example.com",
        amount: 4999,
        currency: "INR",
        sourceType: "razorpay_failure",
        paymentMethod: "upi",
        failureType: "UPI failure",
        attemptCount: 1,
        status: "recovery_recommended",
        priority: "High Priority",
        recoveryProbability: 0.84,
        expectedRecovery: 4199,
        recommendedAction: "Instant UPI Retry",
        recommendationReason: "Customer historically completes 4 of 5 transactions over UPI.",
        selectedStrategy: "retry_now",
        decision: {
          decisionId: "DEC-8922-Y",
          opportunityId: "TXN-8922-Y",
          failureAnalysis: {
            failureCategory: "temporary_technical",
            isRecoverable: true,
            rootCause: "NPCI / PSP timeout during collect request.",
            customerRiskProfile: "low",
            suggestedFocus: "Instant retry with same VPA"
          },
          prediction: {
            recoveryProbability: 0.84,
            confidence: 0.94,
            reasoning: "Transient UPI gateway timeouts have 84% recovery on immediate retry.",
            keyDrivers: ["Transient error code", "Strong UPI history"]
          },
          strategiesEvaluated: [
            {
              strategy: "retry_now",
              label: "Instant UPI Retry",
              probability: 0.84,
              expectedRecovery: 4199,
              friction: "low",
              interventionCost: 0,
              score: 4199,
              reasoning: "Top recommendation for transient UPI network timeout"
            },
            {
              strategy: "alternate_payment",
              label: "Switch to Card",
              probability: 0.65,
              expectedRecovery: 3249,
              friction: "medium",
              interventionCost: 0,
              score: 3249,
              reasoning: "Viable fallback if UPI continues failing"
            }
          ],
          selectedStrategy: "retry_now",
          selectedStrategyLabel: "Instant UPI Retry",
          recoveryProbability: 0.84,
          expectedRecovery: 4199,
          recommendationReason: "Customer historically completes 4 of 5 transactions over UPI.",
          guardrailOutcome: "AUTO_EXECUTE",
          guardrailNotes: ["Within max retries", "Probability 84% exceeds minimum 20%"],
          model: "gemini-2.5-flash",
          createdAt: new Date(Date.now() - 7200000).toISOString()
        },
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 7200000).toISOString()
      },
      {
        opportunityId: "TXN-8923-Z",
        paymentId: "PAY-8923-Z",
        orderId: "ORD-8923-Z",
        customerId: "CUS-3B91X2",
        customerName: "Rohan Sharma",
        customerEmail: "rohan.s@example.com",
        amount: 8200,
        currency: "INR",
        sourceType: "checkout_abandonment",
        paymentMethod: "card",
        failureType: "Checkout abandoned",
        attemptCount: 1,
        status: "recovery_recommended",
        priority: "Medium Priority",
        recoveryProbability: 0.58,
        expectedRecovery: 4756,
        recommendedAction: "Recovery Link with 1-Click UPI",
        recommendationReason: "Customer abandoned on payment step; sending recovery link has 58% conversion.",
        selectedStrategy: "recovery_link",
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        updatedAt: new Date(Date.now() - 14400000).toISOString()
      },
      {
        opportunityId: "TXN-8924-W",
        paymentId: "PAY-8924-W",
        orderId: "ORD-8924-W",
        customerId: "CUS-7M44Q8",
        customerName: "Ananya Patel",
        customerEmail: "ananya.p@example.com",
        amount: 18000,
        currency: "INR",
        sourceType: "subscription_failure",
        paymentMethod: "card",
        failureType: "Subscription payment failed",
        attemptCount: 2,
        status: "recovery_recommended",
        priority: "Medium Priority",
        recoveryProbability: 0.62,
        expectedRecovery: 11160,
        recommendedAction: "Customer Notification + Smart Retry",
        recommendationReason: "Account balance refreshed after typical salary cycle.",
        selectedStrategy: "delayed_retry",
        createdAt: new Date(Date.now() - 28800000).toISOString(),
        updatedAt: new Date(Date.now() - 28800000).toISOString()
      }
    ];

    defaultOpportunities.forEach(opp => {
      this.opportunities.set(opp.opportunityId, opp);
      if (opp.decision) {
        this.decisions.set(opp.decision.decisionId, opp.decision);
      }
    });

    this.auditLogs = [
      {
        auditId: "AUD-001",
        opportunityId: "TXN-8921-X",
        actorType: "SYSTEM",
        eventType: "PAYMENT_FAILED",
        message: "Payment failed — ₹12,500.00 (Card issuer decline)",
        metadata: { paymentId: "PAY-8921-X", customerId: "CUS-8F42K1", amount: 12500 },
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        auditId: "AUD-002",
        opportunityId: "TXN-8921-X",
        actorType: "AI_AGENT",
        agentName: "FailureAnalyst",
        eventType: "CONTEXT_ANALYZED",
        message: "Context analyzed: Card decline classified as temporary fraud check.",
        metadata: { failureCategory: "card_declined" },
        createdAt: new Date(Date.now() - 3598000).toISOString()
      },
      {
        auditId: "AUD-003",
        opportunityId: "TXN-8921-X",
        actorType: "AI_AGENT",
        agentName: "RecoveryPredictor",
        eventType: "RECOVERY_PROBABILITY_ESTIMATED",
        message: "Recovery probability estimated: 82% (Confidence: 91%)",
        metadata: { probability: 0.82, confidence: 0.91 },
        createdAt: new Date(Date.now() - 3596000).toISOString()
      },
      {
        auditId: "AUD-004",
        opportunityId: "TXN-8921-X",
        actorType: "AI_AGENT",
        agentName: "StrategyAgent",
        eventType: "STRATEGIES_EVALUATED",
        message: "Strategies evaluated: Alternate UPI selected (Expected recovery: ₹10,200.00)",
        metadata: { selectedStrategy: "alternate_payment" },
        createdAt: new Date(Date.now() - 3594000).toISOString()
      },
      {
        auditId: "AUD-005",
        opportunityId: "TXN-8921-X",
        actorType: "GUARDRAIL_ENGINE",
        eventType: "GUARDRAIL_EVALUATED",
        message: "Guardrail verified: Outcome AUTO_EXECUTE. (Amount within ₹20k limit)",
        metadata: { outcome: "AUTO_EXECUTE" },
        createdAt: new Date(Date.now() - 3592000).toISOString()
      },
      {
        auditId: "AUD-006",
        opportunityId: "TXN-8921-X",
        actorType: "SYSTEM",
        eventType: "RECOVERY_ACTION_TRIGGERED",
        message: "Action executed: Alternate payment UI presented to customer.",
        metadata: { actionType: "alternate_payment" },
        createdAt: new Date(Date.now() - 3590000).toISOString()
      }
    ];
  }

  public getProducts(): Product[] {
    return Array.from(this.products.values());
  }

  public getProductById(id: string): Product | undefined {
    return this.products.get(id);
  }

  public setProduct(product: Product): Product {
    this.products.set(product.productId, product);
    return product;
  }

  public getCustomer(id: string): Customer | undefined {
    return this.customers.get(id);
  }

  public setCustomer(customer: Customer): Customer {
    this.customers.set(customer.customerId, customer);
    return customer;
  }

  public createOrder(order: Order): Order {
    this.orders.set(order.orderId, order);
    return order;
  }

  public getOrder(id: string): Order | undefined {
    const direct = this.orders.get(id);
    if (direct) return direct;
    const allOrders = Array.from(this.orders.values());
    for (const order of allOrders) {
      if (order.razorpayOrderId === id) return order;
    }
    return undefined;
  }

  public updateOrder(id: string, updates: Partial<Order>): Order | undefined {
    let existing = this.orders.get(id);
    let key = id;
    if (!existing) {
      const allEntries = Array.from(this.orders.entries());
      for (const [k, order] of allEntries) {
        if (order.razorpayOrderId === id) {
          existing = order;
          key = k;
          break;
        }
      }
    }
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.orders.set(key, updated);
    return updated;
  }

  public createPayment(payment: Payment): Payment {
    this.payments.set(payment.paymentId, payment);
    return payment;
  }

  public getPayment(id: string): Payment | undefined {
    return this.payments.get(id);
  }

  public updatePayment(id: string, updates: Partial<Payment>): Payment | undefined {
    const existing = this.payments.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.payments.set(id, updated);
    return updated;
  }

  public getRecoveryOpportunities(): RecoveryOpportunity[] {
    return Array.from(this.opportunities.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getRecoveryOpportunity(id: string): RecoveryOpportunity | undefined {
    return this.opportunities.get(id);
  }

  public setRecoveryOpportunity(opp: RecoveryOpportunity): RecoveryOpportunity {
    this.opportunities.set(opp.opportunityId, opp);
    this.notifyOpportunities();
    this.notifyOpportunity(opp.opportunityId, opp);
    this.notifyMetrics();
    return opp;
  }

  public updateRecoveryOpportunity(id: string, updates: Partial<RecoveryOpportunity>): RecoveryOpportunity | undefined {
    const existing = this.opportunities.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.opportunities.set(id, updated);
    this.notifyOpportunities();
    this.notifyOpportunity(id, updated);
    this.notifyMetrics();
    return updated;
  }

  public setRecoveryDecision(decision: RecoveryDecision): RecoveryDecision {
    this.decisions.set(decision.decisionId, decision);
    return decision;
  }

  public getRecoveryDecision(id: string): RecoveryDecision | undefined {
    return this.decisions.get(id);
  }

  public setRecoveryAction(action: RecoveryAction): RecoveryAction {
    this.actions.set(action.actionId, action);
    return action;
  }

  public setRecoveryOutcome(outcome: RecoveryOutcome): RecoveryOutcome {
    this.outcomes.set(outcome.outcomeId, outcome);
    this.notifyMetrics();
    return outcome;
  }

  public addAuditLog(log: Omit<AuditLog, "auditId" | "createdAt">): AuditLog {
    const newLog: AuditLog = {
      ...log,
      auditId: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    this.auditLogs.unshift(newLog);
    this.notifyAudit();
    return newLog;
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  public getMerchantPolicy(): MerchantPolicy {
    return { ...this.policy };
  }

  public updateMerchantPolicy(updates: Partial<MerchantPolicy>): MerchantPolicy {
    this.policy = { ...this.policy, ...updates, updatedAt: new Date().toISOString() };
    return { ...this.policy };
  }

  public getOverviewMetrics(): OverviewMetrics {
    const opps = this.getRecoveryOpportunities();
    const outcomes = Array.from(this.outcomes.values());

    let revenueAtRisk = 0;
    let aiRecovered = 11420;
    let incrementalRevenue = 6840;

    opps.forEach(opp => {
      if (opp.status !== "recovered") {
        revenueAtRisk += opp.amount;
      } else {
        aiRecovered += opp.amount;
        incrementalRevenue += Math.round(opp.amount * 0.6);
      }
    });

    outcomes.forEach(out => {
      if (out.successful) {
        aiRecovered += out.amountRecovered;
        incrementalRevenue += Math.round(out.amountRecovered * 0.6);
      }
    });

    if (revenueAtRisk === 0) revenueAtRisk = 24850;

    const totalCalculated = revenueAtRisk + aiRecovered;
    const recoveryRate = totalCalculated > 0 ? Number(((aiRecovered / totalCalculated) * 100).toFixed(1)) : 45.9;
    const pendingCount = opps.filter(o => o.status === "recovery_recommended" || o.status === "analyzing").length;

    return {
      revenueAtRisk,
      aiRecovered,
      recoveryRate,
      incrementalRevenue,
      activeOpportunitiesCount: opps.length,
      pendingActionCount: pendingCount,
      totalTransactions: opps.length + 142,
      monthlyTrend: [
        { month: "Sep", atRisk: 18000, recovered: 9200 },
        { month: "Oct", atRisk: 22400, recovered: 10800 },
        { month: "Nov", atRisk: 26100, recovered: 12400 },
        { month: "Dec", atRisk: revenueAtRisk, recovered: aiRecovered }
      ],
      paymentMethodBreakdown: [
        { method: "UPI", recovered: Math.round(aiRecovered * 0.65), count: 18 },
        { method: "Razorpay Card", recovered: Math.round(aiRecovered * 0.25), count: 8 },
        { method: "Netbanking", recovered: Math.round(aiRecovered * 0.1), count: 3 }
      ]
    };
  }

  public subscribeOpportunities(cb: ListenerCallback<RecoveryOpportunity[]>): () => void {
    this.opportunityListeners.add(cb);
    cb(this.getRecoveryOpportunities());
    return () => this.opportunityListeners.delete(cb);
  }

  public subscribeOpportunityById(id: string, cb: ListenerCallback<RecoveryOpportunity | null>): () => void {
    if (!this.singleOpportunityListeners.has(id)) {
      this.singleOpportunityListeners.set(id, new Set());
    }
    this.singleOpportunityListeners.get(id)!.add(cb);
    cb(this.getRecoveryOpportunity(id) || null);
    return () => {
      this.singleOpportunityListeners.get(id)?.delete(cb);
    };
  }

  public subscribeAuditLogs(cb: ListenerCallback<AuditLog[]>): () => void {
    this.auditListeners.add(cb);
    cb(this.getAuditLogs());
    return () => this.auditListeners.delete(cb);
  }

  public subscribeMetrics(cb: ListenerCallback<OverviewMetrics>): () => void {
    this.metricsListeners.add(cb);
    cb(this.getOverviewMetrics());
    return () => this.metricsListeners.delete(cb);
  }

  private notifyOpportunities() {
    const list = this.getRecoveryOpportunities();
    this.opportunityListeners.forEach(cb => {
      try { cb(list); } catch (e) { console.error("Error in opportunity listener:", e); }
    });
  }

  private notifyOpportunity(id: string, opp: RecoveryOpportunity) {
    const listeners = this.singleOpportunityListeners.get(id);
    if (listeners) {
      listeners.forEach(cb => {
        try { cb(opp); } catch (e) { console.error("Error in single opportunity listener:", e); }
      });
    }
  }

  private notifyAudit() {
    const logs = this.getAuditLogs();
    this.auditListeners.forEach(cb => {
      try { cb(logs); } catch (e) { console.error("Error in audit listener:", e); }
    });
  }

  private notifyMetrics() {
    const metrics = this.getOverviewMetrics();
    this.metricsListeners.forEach(cb => {
      try { cb(metrics); } catch (e) { console.error("Error in metrics listener:", e); }
    });
  }
}

export const store = DataStore.getInstance();
