// ---------------------------------------------------------------------------
// SMS Service Facade
// Single import point for all SMS operations throughout the application.
// Swap the provider here — callers never change.
// ---------------------------------------------------------------------------

import { Msg91Provider } from "./msg91-provider";
import type { EntryPayload, ExitPayload, OtpPayload, ApprovalPayload } from "./sms-provider";

// Instantiate once — provider reads env vars at construction time
const provider = new Msg91Provider();

/**
 * Send an OTP to a mobile number.
 * Safe to call from anywhere — silently degrades in dev when credentials absent.
 */
export async function sendOtpSms(mobile: string, otp: string): Promise<boolean> {
  try {
    return (await provider.sendOtp({ mobile, otp })).success;
  } catch (err) {
    console.error("[sms-service] sendOtpSms error:", err);
    return false;
  }
}

/**
 * Dispatch a parking entry / slot assignment notification.
 * Non-fatal — slot assignment must succeed even if SMS fails.
 */
export async function sendEntryNotification(payload: EntryPayload): Promise<boolean> {
  try {
    return (await provider.sendEntry(payload)).success;
  } catch (err) {
    console.error("[sms-service] sendEntryNotification error:", err);
    return false;
  }
}

/**
 * Dispatch a parking exit / slot release notification.
 * Non-fatal — exit processing must succeed even if SMS fails.
 */
export async function sendExitNotification(payload: ExitPayload): Promise<boolean> {
  try {
    return (await provider.sendExit(payload)).success;
  } catch (err) {
    console.error("[sms-service] sendExitNotification error:", err);
    return false;
  }
}

/**
 * Notify vehicle owner of approval / rejection / suspension.
 * Non-fatal — vehicle status update must succeed even if SMS fails.
 */
export async function sendApprovalNotification(payload: ApprovalPayload): Promise<boolean> {
  try {
    return (await provider.sendApproval(payload)).success;
  } catch (err) {
    console.error("[sms-service] sendApprovalNotification error:", err);
    return false;
  }
}

// Re-export payload types so callers don't need to import from provider
export type { OtpPayload, EntryPayload, ExitPayload, ApprovalPayload };
