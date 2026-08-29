# Product Requirements Document (PRD)

# RevivePay

**Product:** AI Revenue Recovery Platform for Merchants  
**Prototype type:** Hackathon prototype / functional demo  
**Primary merchant:** One demo merchant  
**Primary customer experience:** Shoe-brand e-commerce storefront  
**Frontend:** Next.js + TypeScript + Tailwind CSS  
**Backend / Data:** Firebase / Firestore / Cloud Functions  
**Payments:** Razorpay Test Mode  
**AI:** Gemini API  
**Realtime:** Firestore realtime listeners  
**Design source:** Existing Stitch-generated UI imported through MCP

---

## 1. Product Summary

RevivePay is an AI-powered revenue recovery layer for an online shoe merchant.

The product detects revenue that is at risk because of payment failures, checkout abandonment, and selected recurring-payment failures, determines the most appropriate recovery strategy, executes a bounded recovery workflow, and records the result.

The prototype has two experiences:

1. **Customer Storefront** — a polished shoe e-commerce website where customers browse shoes, select size, add products to cart, and pay through Razorpay Test Mode.
2. **Merchant Revenue Command Center** — a simple merchant dashboard with only four pages: Overview, Recovery, Analytics, and Audit.

The core demo connects both experiences in realtime:

`Customer purchase → payment event → revenue opportunity → AI decision → recovery action → payment outcome → merchant dashboard update`

The product must remain simple to use and easy to understand. It should not become a generic finance/admin dashboard.

---

## 2. Problem Statement

### Selected PS

**Track 03 — AI Revenue Recovery**

> Find revenue that’s slipping away and win it back.

Build an agent that detects revenue at risk, determines the right intervention, and executes a bounded recovery workflow: from payment failures and checkout abandonment to overdue receivables.

### Product interpretation

RevivePay focuses on the merchant-side intelligence behind recovery:

- identify which failed/abandoned transactions are worth recovering;
- estimate recovery probability;
- compare possible recovery methods;
- recommend the highest-value, lowest-friction action;
- respect merchant-defined stopping rules;
- execute or request the appropriate recovery action;
- measure actual revenue recovered;
- maintain a transparent audit trail.

---

## 3. Goals

### Primary goals

1. Demonstrate a real end-to-end revenue recovery workflow.
2. Make the merchant value of AI obvious.
3. Show measured money recovered, not only predictions.
4. Show a realtime relationship between customer actions and merchant intelligence.
5. Demonstrate bounded, explainable, and auditable AI behavior.
6. Keep the prototype visually clean, simple, and premium.

### Secondary goals

1. Store useful historical outcomes so future decisions can improve.
2. Demonstrate merchant-specific recovery insights.
3. Provide a safe fallback demo simulator when a live payment scenario is unreliable.

---

## 4. Non-Goals

The prototype will NOT attempt to be:

- a full payment gateway;
- a full accounting platform;
- an invoice/ERP system;
- a full CRM;
- a generic AI chatbot;
- a multi-merchant SaaS platform;
- a production identity/authentication system;
- a production-grade machine-learning platform;
- a large customer support platform.

The product should contain only functionality directly supporting revenue recovery.

---

## 5. Target Users

## 5.1 Merchant

One demo merchant operates the shoe store.

The merchant wants to know:

- how much revenue is at risk;
- which revenue opportunities are worth recovering;
- which payment/recovery method is most likely to succeed;
- why AI recommends that method;
- how much money was actually recovered;
- whether recovery actions are being executed safely.

### Merchant success condition

The merchant should be able to understand the current recovery situation and act on a high-value opportunity without navigating a complex system.

---

## 5.2 Customer

The customer shops on the shoe brand storefront.

The customer should be able to:

- browse shoes;
- view product details;
- select shoe size;
- add items to cart;
- proceed to checkout;
- pay with Razorpay Test Mode;
- experience a recovery flow when appropriate;
- receive a clear payment/order result.

### Customer identity model

For this prototype, customer authentication is intentionally lightweight.

On first entry:

1. Customer selects the Customer role.
2. Customer provides a basic name.
3. Customer selects shoe size.
4. System creates a unique customer ID in the form:

`CUS-XXXXXX`

5. Customer enters the storefront.

On future visits, customer can enter the customer ID to restore the same profile and purchase/payment history.

No password, email verification, OTP, or full authentication flow is required for the prototype.

> This simplified identity approach is acceptable for a controlled hackathon prototype. A production version would require proper authentication and account security.

---

## 6. Entry / Role Selection Flow

### Welcome screen

A short, polished welcome experience.

Purpose:

- introduce RevivePay;
- keep the entry experience friendly and quick.

### Role selection

Two choices only:

- **Merchant**
- **Customer**

### Merchant path

`Welcome → Role Selection → Merchant Demo Login → Merchant Overview`

The merchant experience must clearly communicate that this is a prototype demo mode.

Example label:

`Demo Mode — Continue as Merchant`

No merchant password/authentication is required for the prototype.

### Customer path

`Welcome → Role Selection → Customer Profile / Customer ID → Storefront`

Customer choices:

- New customer → name + shoe size → create ID
- Existing customer → enter customer ID → restore profile

---

# 7. Customer Storefront Requirements

## 7.1 Storefront identity

The customer experience represents a modern shoe brand.

It must feel like a real e-commerce site, not a developer demo.

Core elements:

- brand identity;
- product discovery;
- product cards;
- product detail;
- shoe size selection;
- cart;
- checkout;
- Razorpay payment.

## 7.2 Product data

Products should be stored in Firebase rather than hardcoded in page components.

Seed an initial catalog of believable demo shoes.

Each product should support at minimum:

- product ID;
- brand/model name;
- price;
- sale price if applicable;
- image;
- short description;
- available sizes;
- category;
- stock/status.

## 7.3 Customer purchase flow

`Browse → Product → Select Size → Add to Cart → Cart → Checkout → Razorpay`

## 7.4 Order creation

Before opening Razorpay Checkout:

1. validate cart;
2. create an order in the backend;
3. create a pending order record in Firestore;
4. request/create Razorpay order through secure server-side logic;
5. return the required order information to the client;
6. open Razorpay Checkout.

Do not expose Razorpay secret credentials in the browser.

---

# 8. Payment Event Model

The system should treat payment events as the source of recovery opportunities.

Primary real payment source:

**Razorpay Test Mode**

Primary event categories for the prototype:

- payment success;
- payment failure;
- checkout abandonment (application-side event);
- selected subscription/payment-failure simulation where practical.

### Webhook flow

`Razorpay → webhook endpoint → verify event → persist event → create/update payment → trigger recovery workflow`

Webhook handling must be idempotent so duplicate events do not create duplicate recovery actions.

---

# 9. Revenue Opportunity Model

A revenue opportunity is a transaction or revenue event that could potentially be recovered.

Example:

```text
Opportunity
Amount: ₹4,999
Customer: CUS-8F42K1
Payment method: UPI
Failure: temporary payment failure
Status: analyzing
```

Each opportunity should maintain enough data for AI reasoning and auditing.

### Suggested fields

- opportunityId
- merchantId
- customerId
- orderId
- paymentId
- amount
- currency
- sourceType
- paymentMethod
- failureType
- attemptCount
- recoveryProbability
- expectedRecovery
- recommendedAction
- recommendationReason
- status
- selectedStrategy
- createdAt
- updatedAt

---

# 10. AI Revenue Recovery Engine

The AI is the intelligence layer, not the payment executor.

## 10.1 AI responsibilities

The AI should:

1. interpret the failure/revenue context;
2. estimate recovery probability;
3. evaluate candidate recovery methods;
4. choose the most appropriate recommendation;
5. explain the recommendation in business language.

## 10.2 AI should consider useful context

Relevant signals may include:

- transaction amount;
- payment method;
- failure reason;
- attempt number;
- previous payment success/failure history;
- previous successful payment methods;
- customer recovery history;
- customer lifetime value / historical spend where available;
- product/order value;
- time context;
- merchant recovery policy;
- previous recovery outcomes for similar opportunities.

Do not send unnecessary customer information to the model.

## 10.3 AI output

Use structured JSON output.

Example:

```json
{
  "recoveryProbability": 0.84,
  "recommendedMethod": "upi",
  "expectedRecovery": 4199,
  "reason": "Customer successfully completed 4 of the last 5 payments through UPI",
  "confidence": 0.91
}
```

The schema should be validated server-side before being used.

---

# 11. Strategy Evaluation

Candidate recovery strategies for the prototype:

- retry now;
- delayed retry;
- alternate payment method;
- recovery link;
- customer notification;
- human escalation;
- do nothing.

The system should compare the candidate methods using an expected-value approach.

Conceptually:

`Expected recovery value = predicted probability × transaction value`

The strategy should also account for:

- customer friction;
- number of previous attempts;
- merchant policies;
- intervention cost/weight where applicable.

Example:

```text
Retry now        31% → ₹1,550 expected
Retry later      61% → ₹3,049 expected
UPI recovery     84% → ₹4,199 expected
Voice contact    87% → ₹4,349 expected, but high friction
```

The system may recommend UPI rather than voice because recovery value alone is not the only criterion.

---

# 12. Recovery States

Every opportunity must have a controlled lifecycle.

Recommended states:

```text
FAILED
↓
ANALYZING
↓
RECOVERY_RECOMMENDED
↓
AUTO_APPROVED / MERCHANT_APPROVED
↓
ACTION_EXECUTED
↓
AWAITING_OUTCOME
↓
RECOVERED
```

Other valid outcomes:

```text
DO_NOT_INTERVENE
HUMAN_ESCALATION
FAILED_RECOVERY
EXPIRED
```

The state machine should prevent invalid transitions.

---

# 13. Merchant Guardrails

The AI must never directly control sensitive payment operations without server-side validation.

Merchant-defined guardrails should include at minimum:

- maximum retries;
- maximum customer interventions;
- human approval threshold;
- minimum recovery probability;
- cooldown period between interventions.

Example demo policy:

```text
Max retries: 2
Max customer messages: 1
Human approval above: ₹20,000
Minimum recovery probability: 25%
```

### Decision handling

Three high-level outcomes:

**Auto**

Safe action within merchant limits can proceed automatically.

**Approval**

Merchant approval is required.

**Stop**

The system intentionally does not intervene.

Example:

```text
Recovery probability: 8%
Expected recovery: ₹35
Intervention friction: high

Decision: DO NOT INTERVENE
```

This behavior is important because the system must not blindly spam or retry transactions.

---

# 14. Customer Recovery Experience

Customer-facing recovery should remain simple.

The customer does not need to see the full AI reasoning.

Example:

```text
We couldn't complete your payment.

Try another payment method to complete your order.

[ Pay with UPI ]
```

The customer should only see the action needed to recover the payment.

The complex reasoning stays on the merchant side.

---

# 15. Merchant Dashboard

The merchant dashboard contains ONLY four pages:

1. Overview
2. Recovery
3. Analytics
4. Audit

No extra invoice, payout, CRM, accounting, or administrative modules.

The design has already been created in Stitch and must be preserved during implementation.

The UI should remain clean, spacious, premium, and easy to understand.

---

# 16. Overview Page

### Purpose

Answer four questions quickly:

- how much revenue is at risk?
- how much has been recovered?
- what does AI recommend?
- what is happening right now?

### Core metrics

Only the most important metrics:

- Revenue at Risk
- AI Recovered
- Recovery Rate
- Incremental Revenue

### AI recommendation

The page should contain one clear AI recommendation.

Example:

> **Prioritize UPI recovery for failed ₹1,000–₹5,000 payments.**

Display:

- estimated recovery probability;
- recoverable amount;
- short reason;
- review action.

### Live recovery

Show only a small number of active opportunities.

Example:

```text
₹4,999 — UPI failure — AI recommends retry
₹12,500 — Card decline — Alternate payment
₹2,499 — Checkout abandoned — Recovery link
```

The Overview page must not become a metric-heavy analytics page.

---

# 17. Recovery Page

### Purpose

Show the merchant which revenue opportunities should be recovered.

Each opportunity should show:

- amount;
- problem;
- recovery probability;
- recommended action;
- status.

Selecting an opportunity opens a focused AI decision view.

### AI decision detail

Example:

```text
₹12,500 payment

Failure: Card issuer decline

Recovery probability: 82%

Retry now: 31%
Retry later: 61%
Alternate UPI: 82%

Selected: Alternate UPI

Why:
Higher estimated recovery with lower customer friction.

Expected recovery: ₹10,200
```

This is the clearest place to demonstrate merchant value from AI.

---

# 18. Analytics Page

### Purpose

Answer:

> Is the recovery strategy working?

Keep it simple.

Core metrics:

- total revenue at risk;
- recovered;
- recovery rate;
- incremental revenue.

Include:

- one recovery trend visualization;
- best-performing recovery methods;
- one revenue leakage summary;
- one useful AI insight.

Example insight:

> UPI currently has the highest recovery probability for failed payments in the ₹1,000–₹5,000 segment.

Do not build advanced BI features for the prototype.

---

# 19. Audit Page

### Purpose

Prove that every important AI decision and recovery action is traceable.

Show a chronological event timeline.

Example:

```text
10:42:31 Payment failed — ₹12,500
10:42:32 Context analyzed
10:42:33 Recovery probability = 82%
10:42:34 Strategies evaluated
10:42:35 Alternate payment selected
10:42:36 Action executed
10:44:18 Payment recovered — ₹12,500
```

Also show active controls:

- stopping rules active;
- human escalation enabled;
- decision logging enabled.

Keep the audit UI readable and lightweight.

---

# 20. Real-Time Architecture

Realtime updates are a core part of the demo.

### Required flow

```text
Customer Store
   ↓
Razorpay / App Event
   ↓
Backend
   ↓
Firebase Firestore
   ↓
Recovery Engine
   ↓
Firebase state update
   ↓
Merchant Dashboard listener
   ↓
UI updates without refresh
```

Examples of realtime updates:

- new failed payment appears;
- recovery probability appears;
- recommended method appears;
- action status changes;
- payment becomes recovered;
- recovered amount changes;
- audit event appears.

Use Firestore realtime listeners on the merchant-side relevant documents/queries.

---

# 21. Firebase Data Model

Suggested collections:

```text
merchants
customers
products
orders
payments
recovery_opportunities
recovery_decisions
recovery_actions
recovery_outcomes
audit_logs
merchant_policies
```

## merchants

Suggested fields:

- merchantId
- name
- storeName
- razorpayConnected
- createdAt
- settings

## customers

Suggested fields:

- customerId
- name
- shoeSize
- totalSpend
- successfulPayments
- failedPayments
- preferredPaymentMethod
- recoveryHistory
- createdAt
- lastSeenAt

## products

Suggested fields:

- productId
- name
- price
- imageUrl
- sizes
- category
- stockStatus
- createdAt

## orders

Suggested fields:

- orderId
- customerId
- items
- subtotal
- total
- status
- razorpayOrderId
- createdAt
- updatedAt

## payments

Suggested fields:

- paymentId
- orderId
- customerId
- amount
- currency
- paymentMethod
- status
- failureCode
- failureReason
- attemptNumber
- razorpayPaymentId
- createdAt
- updatedAt

## recovery_opportunities

Suggested fields:

- opportunityId
- paymentId
- orderId
- customerId
- amount
- sourceType
- failureType
- recoveryProbability
- expectedRecovery
- recommendedAction
- recommendationReason
- status
- selectedStrategy
- createdAt
- updatedAt

## recovery_decisions

Suggested fields:

- decisionId
- opportunityId
- strategiesEvaluated
- selectedStrategy
- reason
- probability
- expectedRecovery
- model
- policyCheck
- createdAt

## recovery_actions

Suggested fields:

- actionId
- opportunityId
- type
- status
- requestedAt
- executedAt
- executionReference
- error

## recovery_outcomes

Suggested fields:

- outcomeId
- opportunityId
- actionId
- successful
- amountRecovered
- timeToRecovery
- customerFriction
- createdAt

## audit_logs

Suggested fields:

- auditId
- opportunityId
- actorType
- eventType
- message
- metadata
- createdAt

## merchant_policies

Suggested fields:

- merchantId
- maxRetries
- maxCustomerMessages
- humanApprovalThreshold
- minimumRecoveryProbability
- cooldownMinutes
- updatedAt

---

# 22. Seed / Demo Data

The prototype should not look empty on first load.

Seed Firestore with a small set of realistic demo data.

Important:

**Do not hardcode dashboard values directly in UI components.**

Instead:

`seed data → Firebase → application queries → UI`

Seeded demo data should include:

- a few products;
- a few customer profiles;
- successful orders;
- failed payments;
- checkout abandonment opportunities;
- recovery recommendations;
- recovered payments;
- audit events.

This allows the dashboard to demonstrate realistic behavior before a judge creates a new payment.

---

# 23. Demo Simulator

A hidden/internal demo simulator is required as a fallback.

It should NOT be presented as the primary product experience.

Possible scenarios:

- temporary UPI failure;
- card decline;
- checkout abandonment;
- subscription/payment failure;
- successful recovery.

The simulator should trigger the **same backend processing pipeline** as a real event whenever practical.

Target architecture:

```text
Real Razorpay event ──┐
                      ├──→ Event Processor → Recovery Engine
Demo event ───────────┘
```

This avoids having separate fake logic that behaves differently from production-like logic.

---

# 24. AI Safety & Reliability

The AI must be treated as a recommender/decision component, not an unrestricted executor.

Rules:

1. AI output must be structured and validated.
2. All financial calculations should be deterministic in application code.
3. Backend validates AI recommendations before execution.
4. Merchant policies must be checked before actions.
5. Duplicate payment/recovery execution must be prevented.
6. Maximum retry and contact limits must be enforced by code.
7. High-value actions can require human approval.
8. Low-value / low-probability opportunities may be intentionally ignored.
9. Every AI decision must produce an audit entry.
10. API keys/secrets must remain server-side.

---

# 25. Idempotency & Event Handling

Payment webhooks and user actions may be repeated.

The backend must use idempotency rules such as:

- unique Razorpay payment ID;
- unique event/reference ID where available;
- recovery action execution key;
- state transition checks.

A duplicate webhook must not:

- create a duplicate opportunity;
- send a duplicate customer intervention;
- count revenue twice;
- create duplicate recovered revenue.

---

# 26. Revenue Measurement

The prototype must distinguish between:

### Revenue at Risk

Money associated with transactions or revenue events that are currently at risk.

### Recoverable Revenue

Revenue the system estimates has a realistic chance of recovery.

### AI Recovered

Revenue actually recovered through completed recovery actions.

### Incremental Revenue

Revenue attributed to AI-driven intervention beyond the baseline/no-intervention expectation used by the prototype.

Because this is a hackathon prototype, incremental revenue attribution should be clearly labeled as an estimate or modeled value when it is not directly measured through controlled experimentation.

Do not present modeled numbers as guaranteed real-world causal revenue.

---

# 27. User Experience & Interaction Requirements

The application should contain rich but purposeful micro-interactions.

## Customer interactions

- product hover;
- product image transitions;
- add-to-cart animation;
- cart count update;
- checkout transition;
- payment processing state;
- recovery message transition;
- payment success confirmation.

## Merchant interactions

- realtime recovery opportunity entry;
- AI analysis state;
- probability reveal/count animation;
- strategy selection highlight;
- recovery progress;
- recovered amount update;
- audit event appearance;
- subtle status pulse for live operations.

Animations should communicate state changes rather than exist only for decoration.

Avoid excessive animation that distracts from the business story.

---

# 28. Visual / Design Requirements

The Stitch-generated UI is the primary design reference.

Implementation should preserve the established design language.

Required characteristics:

- clean light interface;
- generous spacing;
- rounded cards;
- soft borders;
- restrained shadows;
- premium purple/violet accent;
- professional typography;
- consistent icons;
- subtle glassmorphism only where appropriate;
- simple navigation;
- strong whitespace;
- no unnecessary UI density.

Use a consistent professional icon system such as Lucide.

Do not use:

- random emoji icons;
- excessive gradients;
- neon effects;
- generic AI robot imagery;
- overly complex charts;
- fake-looking AI widgets;
- dense admin tables.

The app should feel intentionally designed, not vibe-coded.

---

# 29. Navigation

Merchant:

```text
Overview
Recovery
Analytics
Audit
```

Customer:

```text
Store
Product
Cart
Checkout
Order result
```

Do not introduce additional top-level navigation unless required by an implementation constraint.

---

# 30. API / Backend Responsibilities

Recommended server-side responsibilities:

### Customer/order APIs

- create order;
- validate cart;
- create Razorpay order;
- retrieve/update order state.

### Payment/webhook APIs

- receive Razorpay webhook;
- validate webhook authenticity;
- normalize payment event;
- update payment state.

### Recovery APIs

- create recovery opportunity;
- gather context;
- request AI decision;
- evaluate strategies;
- apply merchant policy;
- execute allowed action;
- write audit trail.

### Demo APIs

- trigger demo failure scenario;
- trigger demo recovery result.

---

# 31. AI Decision Prompt Principles

The AI prompt should instruct the model to:

- act as a revenue recovery analyst;
- use only provided facts;
- make a recommendation from allowed strategies;
- return structured JSON;
- estimate recovery probability conservatively;
- explain why the chosen strategy is appropriate;
- never claim an action has occurred when the backend has not confirmed it;
- never override merchant policies;
- allow `do_nothing` when recovery is not economically justified.

The prompt should not ask the model to calculate database/accounting truth that can be calculated deterministically.

---

# 32. Golden Demo Scenario

This is the primary presentation flow.

### Step 1 — Customer

Customer enters the shoe store.

### Step 2 — Customer profile

Customer creates/uses:

`CUS-8F42K1`

Shoe size:

`9`

### Step 3 — Purchase

Customer selects a shoe worth:

`₹4,999`

### Step 4 — Razorpay

Customer goes through Razorpay Test Checkout.

Payment is deliberately made to fail in the demo scenario.

### Step 5 — Event ingestion

Backend receives the failure.

### Step 6 — Opportunity

RevivePay creates:

`₹4,999 Revenue at Risk`

### Step 7 — AI analysis

Example:

```text
UPI recovery probability: 84%
Card retry probability: 31%
Expected recovery: ₹4,199
```

### Step 8 — Recommendation

AI recommends:

`UPI recovery`

Reason:

Customer historically succeeds through UPI.

### Step 9 — Merchant realtime view

Merchant dashboard immediately displays the opportunity and AI decision.

### Step 10 — Customer recovery

Customer receives a simple alternate-payment recovery experience.

### Step 11 — Success

Customer completes payment.

### Step 12 — Merchant result

Merchant dashboard updates immediately:

`₹4,999 Recovered`

### Step 13 — Audit

Audit page shows the full sequence of events.

This should be the default end-to-end demo.

---

# 33. Example Merchant AI Insight

Example:

> **UPI has the highest estimated recovery probability for similar failed payments.**
>
> Recovery probability: **84%**
>
> Main reason: **customers in this segment have a strong previous UPI success history.**

The insight must be grounded in available data. Avoid invented explanations that are not represented in the stored context.

---

# 34. Error & Edge Cases

The prototype should gracefully handle:

### Payment fails but no recovery method is viable

Show:

`No suitable recovery action`

and log `DO_NOT_INTERVENE`.

### AI unavailable

The system should fail safely.

Use a deterministic fallback recommendation based on the failure type and merchant policy rather than blocking the whole application.

Example:

`AI unavailable → rule-based safe fallback`

### Razorpay webhook delayed

Show payment state as processing/pending until confirmed.

### Duplicate webhook

Ignore duplicate event after idempotency check.

### Recovery action fails

Record the failure, do not silently retry forever, and enforce stopping rules.

### Firebase unavailable

Show a friendly connection state and do not claim successful persistence.

### Customer ID not found

Show a simple clear message and allow creation of a new customer profile.

---

# 35. Security Requirements

Even for the prototype:

- Razorpay secret keys are server-side only.
- Gemini API key is server-side only.
- Firebase service credentials must never be shipped to the browser.
- Firestore security rules should restrict inappropriate reads/writes.
- Customer IDs should not expose sensitive personal information.
- Server-side financial calculations should be trusted over client-provided totals.
- Never trust client-side payment success as final truth without server/webhook confirmation.

---

# 36. Environment Variables

The implementation should use environment configuration, not inline secrets.

Example categories:

```text
NEXT_PUBLIC_FIREBASE_...
FIREBASE_PRIVATE_...
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
GEMINI_API_KEY
```

Only variables safe for browser use may use `NEXT_PUBLIC_`.

---

# 37. Success Metrics for the Prototype

The prototype succeeds when a judge can see all of the following in one flow:

1. A real customer purchase.
2. A real/test payment failure.
3. Automatic detection of revenue at risk.
4. AI recovery probability.
5. AI comparison/recommendation of payment methods.
6. Clear reason for the AI recommendation.
7. A bounded recovery action.
8. Customer completion of recovery.
9. Merchant dashboard updates in realtime.
10. Actual recovered revenue reflected in the dashboard.
11. A complete audit trail.

---

# 38. Acceptance Criteria

## Customer

- Customer can create a profile with name and shoe size.
- System generates a unique customer ID.
- Customer can later restore the account using that ID.
- Customer can browse shoe products.
- Customer can select size.
- Customer can place an order.
- Customer reaches Razorpay Test Checkout.
- Customer receives clear payment result.
- Customer can follow a recovery flow when appropriate.

## Merchant

- Merchant can enter demo mode directly.
- Overview shows live data from Firebase.
- Recovery page shows active opportunities.
- Analytics shows meaningful recovery performance.
- Audit shows decision and action history.
- Merchant dashboard updates without manual refresh.

## AI

- AI returns structured output.
- AI recommends an allowed recovery method.
- AI gives a reason.
- AI produces a recovery probability.
- AI output is validated by backend logic.
- AI cannot bypass guardrails.
- AI may choose `do_nothing`.

## Backend

- Payment events are persisted.
- Recovery opportunities are persisted.
- Decisions are persisted.
- Outcomes are persisted.
- Audit events are persisted.
- Duplicate events do not double-count recovery.

---

# 39. Recommended Build Order

Implementation should proceed in this order:

### Phase 1 — Foundation

- import Stitch UI through MCP;
- establish Next.js structure;
- configure Tailwind;
- configure Firebase;
- configure environment variables;
- establish shared data/services.

### Phase 2 — Customer Store

- product data;
- product cards;
- product detail;
- cart;
- checkout.

### Phase 3 — Razorpay

- secure server-side order creation;
- test checkout;
- success flow;
- failure flow;
- webhook handling.

### Phase 4 — Firebase Data Layer

- products;
- customers;
- orders;
- payments;
- recovery opportunities;
- audit logs.

### Phase 5 — Recovery Engine

- context collection;
- opportunity creation;
- state machine;
- guardrails;
- fallback rules.

### Phase 6 — Gemini AI

- structured decision prompt;
- validation;
- probability;
- strategy recommendation;
- explanation.

### Phase 7 — Recovery Experience

- customer recovery action;
- recovery outcome capture;
- state changes.

### Phase 8 — Merchant Realtime

- Overview live updates;
- Recovery page;
- Analytics;
- Audit.

### Phase 9 — Demo Simulator

- hidden scenarios;
- same backend pipeline;
- reliable judge demo.

### Phase 10 — Polish

- animations;
- micro-interactions;
- loading states;
- error states;
- performance;
- final demo rehearsal.

---

# 40. Prototype Principles

The entire product should follow these rules:

### Simple outside, intelligent inside

Customer sees a simple store and recovery action.
Merchant sees a simple command center.
Backend contains the actual recovery intelligence.

### AI recommends; code validates

Do not let LLM output directly execute financial actions.

### Real data over hardcoded UI values

Seed Firebase rather than embedding business metrics in components.

### One clear story

Always return to:

`At Risk → AI Decision → Recovery → Money Recovered`

### Avoid over-engineering

Do not build a feature simply because it sounds impressive.

Every feature must help demonstrate revenue recovery.

### Avoid vibe-coding

Use professional icons, consistent states, real data flows, explicit backend logic, validation, and clean component structure.

---

# 41. Final Product Definition

RevivePay is not primarily a dashboard.

It is a **merchant-side AI revenue recovery engine** with a clean merchant interface and a customer storefront that provides a realistic source of revenue events.

The merchant dashboard is the visible control center.
The AI recovery engine is the product's core intelligence.
Firebase is the source of application state and realtime data.
Razorpay is the payment infrastructure.
Gemini provides bounded reasoning/recommendation.

The central product promise is:

> **RevivePay finds recoverable revenue, recommends the best recovery method, acts within merchant-defined guardrails, and proves how much money was recovered.**

---

# 42. One-Line Demo Pitch

> **“A customer payment fails; RevivePay understands why, predicts which recovery method is most likely to work, recovers the payment, and shows the merchant the money recovered in realtime.”**
