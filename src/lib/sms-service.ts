// ---------------------------------------------------------------------------
// COMPATIBILITY SHIM
// This file re-exports from the new layered SMS abstraction at lib/sms/.
// Existing callers (api/slots/assign, otp-service, etc.) continue to work
// without any import changes.
// ---------------------------------------------------------------------------

export type { EntryPayload as SlotAssignmentSMSPayload } from "./sms/sms-provider";
export { sendEntryNotification as sendSlotAssignmentSMS } from "./sms/sms-service";
export { sendOtpSms, sendEntryNotification, sendExitNotification } from "./sms/sms-service";
