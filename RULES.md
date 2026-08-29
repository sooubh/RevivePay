# RevivePay Development Rules

## 1. Project Identity
- Product name: **RevivePay**.
- Product purpose: AI-powered revenue recovery for a shoe e-commerce merchant.
- This is a functional hackathon prototype, not a production banking system.
- Keep the experience simple, premium, understandable, and demo-safe.

## 2. Core Product Flow
Always preserve this golden path:

`Customer Store → Razorpay Test Checkout → Payment Event → Firebase → Recovery Opportunity → AI Decision → Guardrail Check → Recovery Action → Outcome → Merchant Realtime Update → Audit`

Do not introduce flows that bypass this lifecycle.

## 3. Frontend Stack
- Use **Next.js + TypeScript + Tailwind CSS**.
- Preserve the existing Stitch-generated design system when implementing functionality.
- Do not redesign existing screens unless explicitly requested.
- Keep components reusable and typed.
- Prefer server-side code for secrets and privileged operations.

## 4. UI/UX Rules
- The interface must remain simple and easy to understand.
- Avoid over-engineering the UI.
- Do not add dashboards, cards, charts, filters, tables, badges, or settings that are not required by the PRD.
- Use professional iconography such as Lucide rather than random emoji/icons.
- Use whitespace, hierarchy, and restrained color rather than visual clutter.
- Use micro-interactions generously where they communicate state: loading, analyzing, recommendation, recovery, success, failure, and realtime updates.
- Animations must be purposeful, fast, smooth, and non-blocking.
- Do not use excessive gradients, neon effects, fake AI graphics, or decorative animations.

## 5. Customer Identity
- Each new customer registration generates a unique ID in the format `CUS-XXXXXX`.
- Prototype customer login uses the customer ID only.
- No password, email verification, or full authentication flow is required for the prototype.
- Each new registration must create a fresh customer ID.
- Existing customer ID lookup restores that customer's stored profile and history.
- Do not expose another customer's data when an ID is entered.

## 6. Merchant Identity
- There is exactly **one demo merchant** in the prototype.
- Merchant access is demo-mode direct login.
- Do not build merchant registration, organization management, multi-tenant administration, or role-management features.

## 7. Firebase Rules
- Firebase Firestore is the source of truth for application data.
- Do not hardcode business metrics in UI components.
- Seed demo data into Firebase instead of placing fake values directly in JSX/TSX.
- Use realtime Firestore listeners for merchant live updates.
- Keep secrets and privileged writes on trusted server-side code / Cloud Functions.
- Validate all client-provided IDs and amounts server-side.

## 8. Razorpay Rules
- Use **Razorpay Test Mode** only for the prototype.
- Never expose Razorpay Key Secret in client-side code.
- Create orders and perform privileged Razorpay operations server-side.
- Verify webhook signatures before accepting events.
- Treat webhooks as potentially duplicated or delayed.
- Recovery actions must be idempotent.
- Never assume a client-side payment success event alone means the payment is captured.

## 9. AI Rules
- Primary AI: **Gemini API**.
- AI is responsible for diagnosis, prediction, strategy recommendation, and explanation.
- AI is **not** the source of truth for payment status, amount, retry limits, authorization, or security decisions.
- Never allow raw LLM output to directly execute a payment operation.
- AI output must be structured and validated before use.
- The backend/policy engine must validate every AI recommendation.
- Use meaningful context: amount, payment method, failure reason, attempt count, customer history, prior outcomes, and merchant policy.
- Do not send unnecessary personal data to the model.
- Never describe a predicted probability as a guarantee. Use language such as `estimated recovery probability`.

## 10. Recovery Decision Rules
Recovery decisions should conceptually evaluate:

`Expected Recovery Value = Recovery Probability × Amount`

Then account for intervention cost, retry limits, and customer friction where applicable.

Supported decision outcomes:
- `AUTO_EXECUTE`
- `MERCHANT_APPROVAL`
- `CUSTOMER_ACTION`
- `DO_NOT_INTERVENE`
- `HUMAN_ESCALATION`

A payment should sometimes be intentionally left alone when the expected value is too low or the intervention would create unnecessary friction.

## 11. Guardrails
Default prototype policy:
- Maximum automated retries: 2
- High-value payments above the configured threshold require merchant/human approval.
- Low recovery probability may result in `DO_NOT_INTERVENE`.
- Every recovery action must have a traceable decision.
- Stopping rules must be enforced in code, not only in an AI prompt.

## 12. State Machine
Use explicit recovery states. At minimum:

`FAILED → ANALYZING → RECOVERY_RECOMMENDED → APPROVED/AUTO_APPROVED → ACTION_EXECUTED → AWAITING_OUTCOME → RECOVERED`

Alternative terminal/exception states may include:
- `DO_NOT_INTERVENE`
- `HUMAN_ESCALATION`
- `ACTION_FAILED`

Do not represent important workflow state only with loosely related booleans.

## 13. Realtime Rules
The merchant dashboard must update without manual refresh when:
- a payment fails;
- an opportunity is created;
- AI analysis completes;
- a recommendation is selected;
- a recovery action is executed;
- a payment is recovered.

The customer and merchant experiences should reflect the same underlying Firebase state.

## 14. Demo Simulator
- Real Razorpay Test Mode is the primary path.
- A small hidden/demo simulator is allowed as a fallback.
- Simulator events must enter the same backend/recovery pipeline as real payment events.
- Do not create a separate fake workflow that behaves differently from production-like logic.

## 15. Hardcoded Data
- Minimize hardcoded business values.
- Initial dummy purchases, payments, and recovery outcomes should be seeded records.
- Static UI copy may be hardcoded.
- Calculated metrics must come from stored records or deterministic derived functions.
- Demo seed data must be easy to reset.

## 16. Error Handling
Always handle:
- duplicate webhooks;
- delayed webhooks;
- missing customer IDs;
- failed Razorpay calls;
- AI unavailable/timeouts;
- invalid AI output;
- Firebase write/read failures;
- recovery action failures.

Failures must degrade gracefully and never show false success.

## 17. Logging and Audit
Every important recovery decision should record:
- opportunity ID;
- timestamp;
- input/context summary;
- AI recommendation;
- strategies evaluated;
- selected action;
- guardrail result;
- action outcome;
- amount recovered.

Avoid storing sensitive secrets in logs.

## 18. Code Quality
- TypeScript strictness should remain enabled.
- Avoid `any` unless there is a justified boundary and a comment.
- Validate external data at boundaries.
- Keep business logic outside UI components.
- Prefer small pure functions for scoring, validation, mapping, and formatting.
- Keep recovery logic testable without rendering the UI.
- Use clear names; avoid placeholder names like `data2`, `temp`, or `foo`.

## 19. What NOT to Build
Do not add:
- multi-merchant SaaS administration;
- accounting features;
- full invoicing platform;
- payout management;
- CRM;
- complicated authentication;
- generic AI chatbot;
- large customer-management suite;
- unnecessary reports;
- unnecessary pages;
- extra payment gateways unless explicitly required.

## 20. Definition of Done
A feature is complete only when:
1. The data is persisted in Firebase where appropriate.
2. The server validates important inputs.
3. The UI reflects the actual state.
4. Loading/error/success states are handled.
5. Realtime updates work where required.
6. Audit information exists for meaningful AI/recovery actions.
7. The feature does not violate the project's simplicity rules.
8. The feature can be demonstrated reliably using Razorpay Test Mode or the hidden simulator.
