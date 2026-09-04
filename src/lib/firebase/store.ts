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
  private orderListeners: Set<ListenerCallback<Order[]>> = new Set();

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
    this.products.clear();
    this.customers.clear();
    this.orders.clear();
    this.payments.clear();
    this.opportunities.clear();
    this.decisions.clear();
    this.outcomes.clear();

    this.auditLogs = [];

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

    const defaultOrders: Order[] = [
      {
        orderId: "ORD-SHOE-001",
        customerId: "CUS-8F42K1",
        customerName: "Sarah Jenkins",
        customerEmail: "sarah.j@example.com",
        items: [
          {
            productId: "PROD-001",
            name: "Aeon Performance Runner",
            brand: "LuxeStep",
            price: 4999,
            size: "9",
            quantity: 1,
            imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAfmxkAm9FxGl0cDWrdx4CipB_VGxi9X58jaQB9jyK7lLuDpEqIgKOTSqd4fKHnLCV8NYJj3RcHfPw3ZJ9sOr7gHPLllmwGEQk6AVXkawwCyexA9qpOe9te5yC3N7dMEramc9XRyUEJUfL4v7d-UW5BnhGfans41N3kwtG5ARGBTDzhBdjjI5Y1CAfnGkSfb8TYfgzAhtx1jbsPIMN0YzVbciNk2xTbkCrKnwK3M-THAxPfdXz-lDj-"
          }
        ],
        subtotal: 4999,
        shipping: 0,
        tax: 250,
        total: 4999,
        status: "paid",
        shippingAddress: {
          firstName: "Sarah",
          lastName: "Jenkins",
          address: "Flat 402, Highline Residency",
          apartment: "Tower B",
          city: "Mumbai",
          zipcode: "400001",
          country: "India"
        },
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        orderId: "ORD-COD-001",
        customerId: "CUS-8F42K1",
        customerName: "Sarah Jenkins",
        customerEmail: "sarah.j@example.com",
        items: [
          {
            productId: "PROD-004",
            name: "Nike Metro Court",
            brand: "Nike",
            price: 3499,
            size: "10",
            quantity: 1,
            imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBQA0H8kzAlA8mZ6A9RrDDM_A8J7CWxmNXgC0v_KubV9B1jYe6hZPOpWdIwG34imN40ZQrH5HY3DYtecl9GirvX8RYmxdC0u-LvjS5AJNHpRXW16ktZz6Dgssx82Av9qSXQzToIb1g2-EAGDMM2IcWvDf6zDj1L3xbZUB3AVKhHZs99TEdHIPCkxc-EF6I29SghP53K9kLTxTa8CdwRrglKUjVnaJKrVrbSJZPEhWBPCU2cU-VYxNVB"
          }
        ],
        subtotal: 3499,
        shipping: 0,
        tax: 175,
        total: 3499,
        status: "pending",
        shippingAddress: {
          firstName: "Sarah",
          lastName: "Jenkins",
          address: "Flat 402, Highline Residency",
          apartment: "Tower B",
          city: "Mumbai",
          zipcode: "400001",
          country: "India"
        },
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString()
      }
    ];

    defaultOrders.forEach(o => this.orders.set(o.orderId, o));

    const defaultOpportunities: RecoveryOpportunity[] = [
      {
        opportunityId: "TXN-RETURN-001",
        paymentId: "PAY-RETURN-001",
        orderId: "ORD-SHOE-001",
        customerId: "CUS-8F42K1",
        customerName: "Sarah Jenkins",
        customerEmail: "sarah.j@example.com",
        amount: 4999,
        currency: "INR",
        sourceType: "return",
        paymentMethod: "upi",
        failureType: "Return: Size 9 is too tight (Customer requested Size 10)",
        attemptCount: 1,
        status: "recovery_recommended",
        priority: "High Priority",
        recoveryProbability: 0.95,
        expectedRecovery: 4999,
        recommendedAction: "Size 10 Exchange",
        recommendationReason: "• Customer reason: size mismatch (Size 9 reported too tight)\n• Replacement available: Size 10 verified in stock (8 units)\n• Order preservation: Direct exchange retains full order value (₹4,999.00)\n• Downside prevention: Issuing a refund forfeits 100% of the sale\n• Decision: Size 10 Exchange is the preferred bounded recovery action.",
        selectedStrategy: "size_exchange",
        productName: "Aeon Performance Runner",
        productId: "PROD-001",
        returnReason: "Size 9 too small / tight fit",
        currentSize: "9",
        replacementSize: "10",
        replacementInStock: true,
        decision: {
          decisionId: "DEC-RETURN-001",
          opportunityId: "TXN-RETURN-001",
          model: "Revenue Recovery Agent (Demo Decision)",
          selectedStrategy: "size_exchange",
          selectedStrategyLabel: "Size 10 Exchange",
          recoveryProbability: 0.95,
          expectedRecovery: 4999,
          recommendationReason: "Size mismatch identified for Aeon Performance Runner. Replacement Size 10 is in stock. Exchange preserves 100% of order value vs full refund.",
          failureAnalysis: {
            failureCategory: "user_cancelled",
            isRecoverable: true,
            rootCause: "Shoe size too small / tight fit",
            customerRiskProfile: "low",
            suggestedFocus: "Size 10 Exchange"
          },
          prediction: {
            recoveryProbability: 0.95,
            confidence: 0.95,
            reasoning: "Customer requested exchange for size 10; item in stock.",
            keyDrivers: ["Size mismatch", "Replacement in stock", "High customer lifetime spend"]
          },
          strategiesEvaluated: [
            {
              strategy: "size_exchange",
              label: "Size 10 Exchange (Selected)",
              probability: 0.95,
              expectedRecovery: 4999,
              friction: "low",
              interventionCost: 0,
              score: 4999,
              reasoning: "Preserves 100% order value via verified in-stock inventory."
            },
            {
              strategy: "store_credit",
              label: "Store Credit Voucher",
              probability: 0.40,
              expectedRecovery: 2000,
              friction: "medium",
              interventionCost: 200,
              score: 1800,
              reasoning: "Alternative retention path; higher customer drop-off than direct exchange."
            },
            {
              strategy: "full_refund",
              label: "Full Refund (Loss of Sale)",
              probability: 0.0,
              expectedRecovery: 0,
              friction: "low",
              interventionCost: 4999,
              score: 0,
              reasoning: "Results in complete loss of revenue (₹0 retained) and customer churn."
            }
          ],
          guardrailOutcome: "AUTO_EXECUTE",
          guardrailNotes: [
            "Customer reason: size mismatch",
            "Replacement size available (Size 10: in stock)",
            "Exchange preserves ₹4,999.00 order value",
            "Refund would lose the sale"
          ],
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        customerRecoveryUrl: "/store/payment?oppId=TXN-RETURN-001&orderId=ORD-SHOE-001&type=return",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        opportunityId: "TXN-NDR-001",
        paymentId: "PAY-NDR-001",
        orderId: "ORD-COD-001",
        customerId: "CUS-8F42K1",
        customerName: "Sarah Jenkins",
        customerEmail: "sarah.j@example.com",
        amount: 3499,
        currency: "INR",
        sourceType: "ndr",
        paymentMethod: "cod",
        failureType: "NDR: Cash Unavailable at Delivery (COD ₹3,499)",
        attemptCount: 1,
        status: "recovery_recommended",
        priority: "High Priority",
        recoveryProbability: 0.90,
        expectedRecovery: 3499,
        recommendedAction: "Convert COD to Prepaid via Razorpay",
        recommendationReason: "• Customer reason: customer could not pay cash at delivery (COD ₹3,499.00)\n• Risk tradeoff: Courier re-attempt has ~65% RTO failure rate and courier penalty fee\n• Revenue preservation: Instant Razorpay digital payment secures 100% order value upfront\n• Delivery outcome: Delivery resumes immediately without cash collection friction\n• Decision: Convert COD to Prepaid via Razorpay",
        selectedStrategy: "cod_to_prepaid",
        ndrReason: "Customer could not pay cash at delivery (COD)",
        codAmount: 3499,
        deliveryAttempts: 1,
        deliveryStatus: "delivery_paused_pending_payment",
        productName: "Aeon Performance Runner",
        decision: {
          decisionId: "DEC-NDR-001",
          opportunityId: "TXN-NDR-001",
          model: "Revenue Recovery Agent (Demo Decision)",
          selectedStrategy: "cod_to_prepaid",
          selectedStrategyLabel: "Convert COD to Prepaid",
          recoveryProbability: 0.90,
          expectedRecovery: 3499,
          recommendationReason: "Customer unable to pay cash on delivery. Converting order to Razorpay prepaid eliminates RTO courier loss and secures ₹3,499.00 revenue.",
          failureAnalysis: {
            failureCategory: "insufficient_funds",
            isRecoverable: true,
            rootCause: "Cash not handy during delivery attempt 1",
            customerRiskProfile: "low",
            suggestedFocus: "Immediate Razorpay digital prepayment"
          },
          prediction: {
            recoveryProbability: 0.90,
            confidence: 0.90,
            reasoning: "Customer ready to receive item but lacks exact cash; digital payment enables immediate completion.",
            keyDrivers: ["Customer verified reachable", "Prepaid removes cash barrier", "Zero RTO return cost"]
          },
          strategiesEvaluated: [
            {
              strategy: "cod_to_prepaid",
              label: "Convert COD to Prepaid via Razorpay (Selected)",
              probability: 0.90,
              expectedRecovery: 3499,
              friction: "low",
              interventionCost: 0,
              score: 3499,
              reasoning: "Secures full order value upfront and eliminates courier RTO penalty."
            },
            {
              strategy: "delayed_retry",
              label: "Reattempt Cash On Delivery",
              probability: 0.35,
              expectedRecovery: 1225,
              friction: "high",
              interventionCost: 150,
              score: 1075,
              reasoning: "High RTO risk (~65%) on reattempting cash delivery."
            },
            {
              strategy: "full_refund",
              label: "Cancel & Return to Origin (RTO)",
              probability: 0.0,
              expectedRecovery: 0,
              friction: "low",
              interventionCost: 200,
              score: 0,
              reasoning: "Total revenue loss plus courier penalty."
            }
          ],
          guardrailOutcome: "AUTO_EXECUTE",
          guardrailNotes: [
            "Customer contact verified reachable",
            "Courier: BlueDart Express (Attempt 1 paused)",
            "Prepaid converts 100% order value",
            "Eliminates RTO penalty"
          ],
          createdAt: new Date(Date.now() - 1800000).toISOString()
        },
        customerRecoveryUrl: "/store/payment?oppId=TXN-NDR-001&orderId=ORD-COD-001&type=ndr",
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString()
      }
    ];

    defaultOpportunities.forEach(opp => {
      this.opportunities.set(opp.opportunityId, opp);
      if (opp.decision) {
        this.decisions.set(opp.decision.decisionId, opp.decision);
      }
    });

    const defaultOutcomes: RecoveryOutcome[] = [];
    defaultOutcomes.forEach(out => this.outcomes.set(out.outcomeId, out));

    this.auditLogs = [
      {
        auditId: "AUD-001",
        opportunityId: "TXN-RETURN-001",
        actorType: "AI_AGENT",
        agentName: "RevenueAgent",
        eventType: "RETURN_FILED",
        message: "Return filed: Aeon Performance Runner (Size 9 tight). AI evaluated: Size 10 Exchange preserves ₹4,999.00 (Demo estimate: 95% retention).",
        metadata: { sourceType: "return", currentSize: "9", replacementSize: "10", expectedRecovery: 4999 },
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        auditId: "AUD-002",
        opportunityId: "TXN-RETURN-001",
        actorType: "GUARDRAIL_ENGINE",
        eventType: "GUARDRAIL_EVALUATED",
        message: "Guardrail verified: Size 10 in stock (8 units). Auto-approval passed for order preservation.",
        metadata: { outcome: "AUTO_EXECUTE", stockVerified: true },
        createdAt: new Date(Date.now() - 3590000).toISOString()
      },
      {
        auditId: "AUD-003",
        opportunityId: "TXN-NDR-001",
        actorType: "AI_AGENT",
        agentName: "RevenueAgent",
        eventType: "NDR_FILED",
        message: "NDR incident: COD cash unavailable on attempt 1. AI recommended: Convert COD to Razorpay prepaid (Eliminates 65% RTO risk, preserves ₹3,499.00).",
        metadata: { sourceType: "ndr", codAmount: 3499, expectedRecovery: 3499 },
        createdAt: new Date(Date.now() - 1800000).toISOString()
      },
      {
        auditId: "AUD-004",
        opportunityId: "TXN-NDR-001",
        actorType: "GUARDRAIL_ENGINE",
        eventType: "GUARDRAIL_EVALUATED",
        message: "Guardrail verified: Customer reachable. Razorpay payment link authorized for instant delivery unpause.",
        metadata: { outcome: "AUTO_EXECUTE" },
        createdAt: new Date(Date.now() - 1790000).toISOString()
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
    this.notifyOrders();
    return order;
  }

  public getOrders(): Order[] {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
    this.notifyOrders();
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

  public setRecoveryOpportunitiesBatch(opps: RecoveryOpportunity[]): void {
    if (!opps || opps.length === 0) return;
    opps.forEach(opp => this.opportunities.set(opp.opportunityId, opp));
    this.notifyOpportunities();
    this.notifyMetrics();
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
    let aiRecovered = 0;

    const countedOutcomeIds = new Set<string>();

    opps.forEach((opp) => {
      if (opp.status === "recovered") {
        aiRecovered += opp.amount;
      } else if (opp.status !== "do_not_intervene") {
        revenueAtRisk += opp.amount;
      }
    });

    outcomes.forEach((out) => {
      if (out.successful) {
        // If not already counted via opportunity
        const isMatchedInOpps = opps.some(
          (o) => (o.opportunityId === out.opportunityId || o.opportunityId === `TXN-${out.opportunityId.replace('OUT-', '')}`) && o.status === "recovered"
        );
        if (!isMatchedInOpps && !countedOutcomeIds.has(out.outcomeId)) {
          countedOutcomeIds.add(out.outcomeId);
          aiRecovered += out.amountRecovered;
        }
      }
    });

    const totalCalculated = revenueAtRisk + aiRecovered;
    const recoveryRate = totalCalculated > 0 ? Number(((aiRecovered / totalCalculated) * 100).toFixed(1)) : 0;
    const pendingCount = opps.filter((o) => o.status === "recovery_recommended" || o.status === "analyzing").length;

    return {
      revenueAtRisk,
      aiRecovered,
      recoveryRate,
      activeOpportunitiesCount: opps.length,
      pendingActionCount: pendingCount
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

  public subscribeOrders(cb: ListenerCallback<Order[]>): () => void {
    this.orderListeners.add(cb);
    cb(this.getOrders());
    return () => this.orderListeners.delete(cb);
  }

  private notifyOrders() {
    const list = this.getOrders();
    this.orderListeners.forEach(cb => {
      try { cb(list); } catch (e) { console.error("Error in order listener:", e); }
    });
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
