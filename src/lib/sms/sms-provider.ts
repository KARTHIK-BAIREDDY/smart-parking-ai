/* eslint-disable */
export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsProvider {
  sendSms(phone: string, message: string): Promise<SmsResult>;
  sendOtp?(payload: unknown): Promise<SmsResult>;
  sendEntry?(payload: unknown): Promise<SmsResult>;
  sendExit?(payload: unknown): Promise<SmsResult>;
  sendApproval?(payload: unknown): Promise<SmsResult>;
}

export interface OtpPayload {
  mobile: string;
  otp?: string;
  [key: string]: unknown;
}
export interface EntryPayload {
  mobile: string;
  locationName?: string;
  slotId?: string;
  entryTime?: string;
  isVisitor?: boolean;
  [key: string]: unknown;
}
export interface ExitPayload {
  mobile: string;
  locationName?: string;
  slotId?: string;
  durationMinutes?: string | number;
  exitTime?: string;
  charge?: string;
  [key: string]: unknown;
}
export interface ApprovalPayload {
  mobile: string;
  status?: string;
  reviewNotes?: string;
  [key: string]: unknown;
}

export async function getSmsProvider(providerId?: string): Promise<SmsProvider> {
  const { Msg91Provider } = await import("./msg91-provider");
  return new Msg91Provider();
}
