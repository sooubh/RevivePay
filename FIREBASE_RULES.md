# RevivePay Firebase Firestore Security Rules & Access Architecture

This document contains the exact security rules and deployment guidelines for Google Cloud Firestore in RevivePay.

---

## 1. Active Collections Overview

| Collection | Client Access (Browser) | Server API Access (Next.js Routes) | Purpose |
| :--- | :--- | :--- | :--- |
| **`products`** | **Read Only** (`allow read: if true`) | **Read / Write** | Public shoe product catalog |
| **`customers`** | **Read Only** (`allow read: if true`) | **Read / Write** | Customer profiles, shoe sizes & lifetime spend |
| **`orders`** | **Read Only** (`allow read: if true`) | **Read / Write** | Customer order line items and shipping info |
| **`payments`** | **Read Only** (`allow read: if true`) | **Read / Write** | Razorpay payment capture and failure records |
| **`recovery_opportunities`** | **Read Only** (`allow read: if true`) | **Read / Write** | Live recovery cases listened via `onSnapshot` |
| **`recovery_actions`** | **Read Only** (`allow read: if true`) | **Read / Write** | Executed automated recovery strategies |
| **`recovery_outcomes`** | **Read Only** (`allow read: if true`) | **Read / Write** | Financial recovery outcomes & conversion records |
| **`audit_logs`** | **Read Only** (`allow read: if true`) | **Read / Write** | Immutable AI decision and recovery audit stream |
| **`merchant_policies`** | **Read Only** (`allow read: if true`) | **Read / Write** | Autonomous guardrails, retry limits & thresholds |

---

## 2. Production `firestore.rules` Definition

Copy and paste the following rules into your Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 1. Products Catalog: Publicly readable by store visitors; writes restricted to backend
    match /products/{productId} {
      allow read: if true;
      allow write: if false;
    }

    // 2. Customers: Readable by prototype storefront; writes handled via /api/customer
    match /customers/{customerId} {
      allow read: if true;
      allow write: if false;
    }

    // 3. Orders: Readable for checkout validation; writes restricted to /api/create-order and webhooks
    match /orders/{orderId} {
      allow read: if true;
      allow write: if false;
    }

    // 4. Payments: Privileged financial records; writes strictly server-side
    match /payments/{paymentId} {
      allow read: if true;
      allow write: if false;
    }

    // 5. Recovery Opportunities: Realtime listener access for merchant dashboard & payment recovery card
    match /recovery_opportunities/{opportunityId} {
      allow read: if true;
      allow write: if false;
    }

    // 6. Recovery Actions: Internal execution records
    match /recovery_actions/{actionId} {
      allow read: if true;
      allow write: if false;
    }

    // 7. Recovery Outcomes: Financial recovery conversion records
    match /recovery_outcomes/{outcomeId} {
      allow read: if true;
      allow write: if false;
    }

    // 8. Audit Logs: Append-only ledger; client writes strictly blocked to prevent tampering
    match /audit_logs/{logId} {
      allow read: if true;
      allow write: if false;
    }

    // 9. Merchant Policies: Guardrail parameters & stopping rules
    match /merchant_policies/{policyId} {
      allow read: if true;
      allow write: if false;
    }

    // Default Fallback: Block all other undefined collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 3. How to Deploy These Rules to Live Firestore

### Option A: Firebase Console (Quickest & Recommended)
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your RevivePay Firebase Project (`revivepay` or configured Project ID).
3. In the left navigation menu, click on **Build** $\rightarrow$ **Firestore Database**.
4. Click on the **Rules** tab at the top.
5. Replace the editor contents with the `firestore.rules` definition above.
6. Click **Publish**.

### Option B: Firebase CLI
If you have the Firebase CLI installed locally:
```bash
# 1. Login to Firebase
firebase login

# 2. Select project
firebase use <YOUR_PROJECT_ID>

# 3. Deploy rules
firebase deploy --only firestore:rules
```
