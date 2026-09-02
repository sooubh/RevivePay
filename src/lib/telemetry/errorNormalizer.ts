import { FailureAnalysisResult, RecoveryStrategyType } from "@/lib/types";

export interface NormalizedPaymentError {
  gateway: 'razorpay' | 'payu' | 'npci_upi' | 'bank_cbs' | 'rbi_mandate';
  rawCode: string;
  rawReason?: string;
  rawDescription?: string;
  source: 'customer' | 'gateway' | 'bank' | 'business' | 'unknown';
  step: 'payment_initiation' | 'payment_authentication' | 'payment_authorization' | 'unknown';
  normalizedCategory: FailureAnalysisResult["failureCategory"];
  isRecoverable: boolean;
  rootCause: string;
  suggestedStrategy: RecoveryStrategyType;
  suggestedFocus: string;
  bankCode?: string;
}

export class ErrorNormalizer {
  /**
   * Normalizes Razorpay error payload from API response or webhook entity.
   */
  public static normalizeRazorpay(errorObj: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
    bank?: string;
    paymentMethod?: string;
  }): NormalizedPaymentError {
    const rawReason = (errorObj.reason || errorObj.description || "").toLowerCase();
    const rawCode = (errorObj.code || "").toUpperCase();
    const source = (errorObj.source as any) || "unknown";
    const step = (errorObj.step as any) || "unknown";

    // 1. UPI Timeouts & Collect Expiry
    if (
      rawReason.includes("timed_out") ||
      rawReason.includes("collect_expired") ||
      rawReason.includes("payment_timed_out") ||
      rawCode.includes("TIMEOUT") ||
      rawCode.includes("U69")
    ) {
      return {
        gateway: "razorpay",
        rawCode: errorObj.code || "BAD_REQUEST_ERROR",
        rawReason: errorObj.reason,
        rawDescription: errorObj.description,
        source: "customer",
        step: "payment_authentication",
        normalizedCategory: "network_timeout",
        isRecoverable: true,
        rootCause: "NPCI / PSP collect request timed out before customer entered UPI PIN.",
        suggestedStrategy: "retry_now",
        suggestedFocus: "Immediate 1-click retry via PhonePe/GPay UPI Intent or Smart QR.",
        bankCode: errorObj.bank
      };
    }

    // 2. Card Declines & RBI Card Controls
    if (
      rawReason.includes("card_declined") ||
      rawReason.includes("issuer_declined") ||
      rawReason.includes("international_disabled") ||
      rawCode.includes("CARD_DECLINED") ||
      rawCode.includes("ISSUER_DECLINE")
    ) {
      return {
        gateway: "razorpay",
        rawCode: errorObj.code || "BAD_REQUEST_ERROR",
        rawReason: errorObj.reason,
        rawDescription: errorObj.description,
        source: "bank",
        step: "payment_authorization",
        normalizedCategory: "card_declined",
        isRecoverable: true,
        rootCause: "Card issuer declined transaction (RBI domestic/e-commerce limit or security block).",
        suggestedStrategy: "alternate_payment",
        suggestedFocus: "Prompt alternate payment via Instant UPI or Netbanking.",
        bankCode: errorObj.bank
      };
    }

    // 3. Bank Server / CBS Technical Downtime
    if (
      rawReason.includes("bank_technical_error") ||
      rawReason.includes("gateway_technical_error") ||
      rawCode.includes("GATEWAY_ERROR") ||
      rawCode.includes("BANK_CBS_TIMEOUT")
    ) {
      return {
        gateway: "razorpay",
        rawCode: errorObj.code || "GATEWAY_ERROR",
        rawReason: errorObj.reason,
        rawDescription: errorObj.description,
        source: "bank",
        step: "payment_authorization",
        normalizedCategory: "temporary_technical",
        isRecoverable: true,
        rootCause: `Issuing bank (${errorObj.bank || "CBS"}) core banking system experiencing downtime.`,
        suggestedStrategy: "alternate_payment",
        suggestedFocus: "Proactively failover to optimal payment rail (NPCI UPI / Razorpay Smart Routing).",
        bankCode: errorObj.bank
      };
    }

    // 4. Insufficient Funds
    if (rawReason.includes("insufficient_funds") || rawReason.includes("balance_low") || rawCode.includes("INSUFFICIENT_FUNDS")) {
      return {
        gateway: "razorpay",
        rawCode: errorObj.code || "BAD_REQUEST_ERROR",
        rawReason: errorObj.reason,
        rawDescription: errorObj.description,
        source: "customer",
        step: "payment_authorization",
        normalizedCategory: "insufficient_funds",
        isRecoverable: true,
        rootCause: "Account balance or credit limit insufficient for transaction amount.",
        suggestedStrategy: "delayed_retry",
        suggestedFocus: "Provide delayed recovery link or alternate payment method.",
        bankCode: errorObj.bank
      };
    }

    // 5. Checkout Abandonment
    if (rawReason.includes("cancelled") || rawReason.includes("abandoned") || rawReason.includes("payment_cancelled") || rawCode.includes("CHECKOUT_ABANDONED")) {
      return {
        gateway: "razorpay",
        rawCode: "PAYMENT_CANCELLED",
        rawReason: errorObj.reason,
        rawDescription: errorObj.description,
        source: "customer",
        step: "payment_authentication",
        normalizedCategory: "abandonment",
        isRecoverable: true,
        rootCause: "Customer closed checkout modal before completing payment authorization.",
        suggestedStrategy: "recovery_link",
        suggestedFocus: "Dispatch 1-click cart recovery link with time-sensitive reservation.",
        bankCode: errorObj.bank
      };
    }

    // Default Fallback
    return {
      gateway: "razorpay",
      rawCode: errorObj.code || "UNKNOWN_ERROR",
      rawReason: errorObj.reason,
      rawDescription: errorObj.description || "Unclassified payment decline",
      source,
      step,
      normalizedCategory: "temporary_technical",
      isRecoverable: true,
      rootCause: errorObj.description || "Payment failed during bank processing.",
      suggestedStrategy: "retry_now",
      suggestedFocus: "Prompt retry or alternate payment method.",
      bankCode: errorObj.bank
    };
  }

  /**
   * Normalizes PayU error parameters.
   */
  public static normalizePayU(payuData: {
    status: string;
    unmappedstatus?: string;
    error_code?: string;
    error_Message?: string;
    field7?: string;
    field8?: string;
    bankcode?: string;
  }): NormalizedPaymentError {
    const errorMsg = (payuData.error_Message || payuData.field8 || "").toLowerCase();
    const unmapped = (payuData.unmappedstatus || "").toLowerCase();

    if (unmapped === "usercancelled" || errorMsg.includes("cancelled by user")) {
      return {
        gateway: "payu",
        rawCode: payuData.error_code || "USER_CANCELLED",
        rawReason: "user_cancelled",
        rawDescription: payuData.error_Message,
        source: "customer",
        step: "payment_authentication",
        normalizedCategory: "abandonment",
        isRecoverable: true,
        rootCause: "Customer exited PayU payment redirect before completing authentication.",
        suggestedStrategy: "recovery_link",
        suggestedFocus: "Dispatch 1-click checkout recovery link.",
        bankCode: payuData.bankcode
      };
    }

    if (errorMsg.includes("3ds") || errorMsg.includes("otp") || payuData.field7 === "3DS_FAIL") {
      return {
        gateway: "payu",
        rawCode: payuData.error_code || "E500",
        rawReason: "otp_timeout",
        rawDescription: payuData.error_Message,
        source: "bank",
        step: "payment_authentication",
        normalizedCategory: "network_timeout",
        isRecoverable: true,
        rootCause: "Bank 3D Secure / OTP authentication timed out.",
        suggestedStrategy: "alternate_payment",
        suggestedFocus: "Offer 1-click UPI alternative without SMS OTP dependency.",
        bankCode: payuData.bankcode
      };
    }

    return {
      gateway: "payu",
      rawCode: payuData.error_code || "E501",
      rawReason: payuData.field8,
      rawDescription: payuData.error_Message,
      source: "gateway",
      step: "payment_authorization",
      normalizedCategory: "temporary_technical",
      isRecoverable: true,
      rootCause: payuData.error_Message || "PayU gateway transaction processing failed.",
      suggestedStrategy: "retry_now",
      suggestedFocus: "Immediate retry with alternate Indian rail.",
      bankCode: payuData.bankcode
    };
  }

  /**
   * Normalizes NPCI UPI response codes.
   */
  public static normalizeNpciUpi(respCode: string, description?: string): NormalizedPaymentError {
    const code = respCode.toUpperCase();
    switch (code) {
      case "U69":
        return {
          gateway: "npci_upi",
          rawCode: "U69",
          rawReason: "COLLECT_REQUEST_EXPIRED",
          rawDescription: description || "Collect request expired at PSP",
          source: "customer",
          step: "payment_authentication",
          normalizedCategory: "network_timeout",
          isRecoverable: true,
          rootCause: "UPI Collect request expired after 90s timeout.",
          suggestedStrategy: "retry_now",
          suggestedFocus: "Reroute to UPI Intent (PhonePe/GPay) to bypass collect notification delay."
        };
      case "U30":
      case "U19":
        return {
          gateway: "npci_upi",
          rawCode: code,
          rawReason: "REMITTER_BANK_DEBIT_FAILED",
          rawDescription: description || "Debit failed at remitter bank CBS",
          source: "bank",
          step: "payment_authorization",
          normalizedCategory: "temporary_technical",
          isRecoverable: true,
          rootCause: "Remitter bank core banking system connection failure.",
          suggestedStrategy: "alternate_payment",
          suggestedFocus: "Suggest payment via Card or alternate linked bank account."
        };
      case "Z9":
        return {
          gateway: "npci_upi",
          rawCode: "Z9",
          rawReason: "INSUFFICIENT_FUNDS",
          rawDescription: description || "Insufficient funds in UPI linked account",
          source: "customer",
          step: "payment_authorization",
          normalizedCategory: "insufficient_funds",
          isRecoverable: true,
          rootCause: "Insufficient account balance in linked UPI account.",
          suggestedStrategy: "delayed_retry",
          suggestedFocus: "Provide delayed recovery link or split payment option."
        };
      case "Z6":
        return {
          gateway: "npci_upi",
          rawCode: "Z6",
          rawReason: "PIN_TRIES_EXCEEDED",
          rawDescription: description || "Number of UPI PIN attempts exceeded",
          source: "customer",
          step: "payment_authentication",
          normalizedCategory: "user_cancelled",
          isRecoverable: false,
          rootCause: "UPI PIN entered incorrectly multiple times (temporary bank block).",
          suggestedStrategy: "alternate_payment",
          suggestedFocus: "Prompt payment via Credit/Debit card or Netbanking."
        };
      default:
        return {
          gateway: "npci_upi",
          rawCode: code,
          rawReason: "UPI_GENERIC_FAILURE",
          rawDescription: description || "UPI switch decline",
          source: "gateway",
          step: "payment_authorization",
          normalizedCategory: "temporary_technical",
          isRecoverable: true,
          rootCause: "Transient UPI network communication error.",
          suggestedStrategy: "retry_now",
          suggestedFocus: "Immediate retry with same UPI VPA or QR code."
        };
    }
  }
}
