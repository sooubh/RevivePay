# RevivePay Firebase Rules & Data Access Guidelines

This file documents the intended Firebase/Firestore access model for the prototype. The actual deployed Firestore Security Rules must be implemented and tested separately.

## Collections

- `merchants` — one demo merchant
- `customers` — customer profiles
- `products` — shoe catalog
- `orders` — customer orders
- `payments` — Razorpay payment records
- `recovery_opportunities` — revenue-recovery cases
- `recovery_decisions` — AI decisions and evaluated strategies
- `recovery_actions` — executed/rejected recovery actions
- `recovery_outcomes` — recovery results
- `audit_logs` — traceable workflow events
- `merchant_policies` — recovery guardrails

## Access Principles

1. Never allow the browser to write privileged payment/recovery state directly.
2. Razorpay webhook processing happens on trusted server-side code.
3. AI decisions are generated and validated server-side.
4. Recovery execution is server-side only.
5. Customer-facing reads must be limited to the current customer's own data.
6. Merchant-facing reads may access the prototype merchant's data only.
7. Audit logs should be append-oriented and not freely editable from clients.
8. Never store API secrets, Razorpay secrets, or Gemini keys in Firestore documents.

## Customer Prototype Access

The prototype uses customer IDs instead of passwords. Because this is not production authentication, server-side lookups must still validate that the requested customer ID is valid and that the requested document belongs to that customer.

Recommended conceptual check:

`request.customerId == resource.data.customerId`

Do not trust a customer ID supplied only by the client for privileged writes.

## Merchant Prototype Access

Use a single configured demo merchant identifier. The merchant UI may read merchant-owned recovery and analytics data, but should not be able to edit historical audit results or payment truth.

## Server-Only Writes

The following should be written only by trusted server-side code / Cloud Functions:

- `payments` status from Razorpay events
- `recovery_opportunities` lifecycle state
- `recovery_decisions`
- `recovery_actions`
- `recovery_outcomes`
- `audit_logs`
- merchant-level financial aggregates when derived server-side

## Validation

Before writing any financial or workflow record, validate:

- amount is a positive integer in the smallest currency unit where applicable;
- IDs are present and have expected format;
- enum/state values are allowed;
- timestamps are server-generated where practical;
- recovery actions reference an existing opportunity;
- outcome amount does not exceed the original recoverable amount unless explicitly justified;
- retry count does not exceed merchant policy.

## Example Firestore Security Rules Shape

Use this as a starting pattern, not as a final production ruleset:

```text
match /databases/{database}/documents {
  match /products/{productId} {
    allow read: if true;
    allow write: if false;
  }

  match /customers/{customerId} {
    allow read: if /* validated prototype customer access */;
    allow write: if /* only validated profile updates */;
  }

  match /payments/{paymentId} {
    allow read: if /* authorized merchant or customer */;
    allow write: if false;
  }

  match /recovery_opportunities/{opportunityId} {
    allow read: if /* authorized merchant or relevant customer view */;
    allow write: if false;
  }

  match /recovery_decisions/{decisionId} {
    allow read: if /* authorized merchant */;
    allow write: if false;
  }

  match /recovery_actions/{actionId} {
    allow read: if /* authorized merchant */;
    allow write: if false;
  }

  match /recovery_outcomes/{outcomeId} {
    allow read: if /* authorized merchant */;
    allow write: if false;
  }

  match /audit_logs/{logId} {
    allow read: if /* authorized merchant */;
    allow write: if false;
  }
}
```

## Important

The prototype may intentionally omit full Firebase Authentication for customers, but this must never be confused with a secure production authentication model. Keep privileged operations behind trusted server-side code even in the demo.
