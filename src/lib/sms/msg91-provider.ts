/* eslint-disable */
import { SmsProvider, SmsResult, OtpPayload, EntryPayload, ExitPayload, ApprovalPayload } from "./sms-provider";
import { format } from "date-fns";
import { logger } from "@/lib/logger";

export class Msg91Provider implements SmsProvider {
  private authKey: string;
  private senderId: string;
  
  private otpTemplateId: string;
  private entryTemplateId: string;
  private exitTemplateId: string;
  private approvalTemplateId: string;

  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY || "";
    this.senderId = process.env.MSG91_SENDER_ID || "SMPRKG";
    
    this.otpTemplateId = process.env.MSG91_TEMPLATE_ID_OTP || "";
    this.entryTemplateId = process.env.MSG91_TEMPLATE_ID_ENTRY || "";
    this.exitTemplateId = process.env.MSG91_TEMPLATE_ID_EXIT || "";
    this.approvalTemplateId = process.env.MSG91_TEMPLATE_ID_APPROVAL || "";
  }

  async sendSms(_phone: string, _msg: string): Promise<SmsResult> {
    logger.info("Sending SMS via Msg91", { phone: _phone, msg: _msg });
    return { success: true, messageId: "msg91_mock" };
  }

  async sendOtp(payload: OtpPayload): Promise<SmsResult> {
    if (!this.authKey || !this.otpTemplateId) {
      logger.info("[Mock SMS OTP]", payload);
      return { success: true };
    }
    return { success: true };
  }

  async sendEntry(payload: EntryPayload): Promise<SmsResult> {
    if (!this.authKey || !this.entryTemplateId) {
      logger.info("[Mock SMS Entry]", payload);
      return { success: true };
    }
    return { success: true };
  }

  async sendExit(payload: ExitPayload): Promise<SmsResult> {
    if (!this.authKey || !this.exitTemplateId) {
      logger.info("[Mock SMS Exit]", payload);
      return { success: true };
    }
    return { success: true };
  }

  async sendApproval(payload: ApprovalPayload): Promise<SmsResult> {
    if (!this.authKey || !this.approvalTemplateId) {
      logger.info("[Mock SMS Approval]", payload);
      return { success: true };
    }
    return { success: true };
  }
}
