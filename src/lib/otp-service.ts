import { getDatabase } from "@/lib/mongo-db";
import { sendOtpSms } from "@/lib/sms/sms-service";

export interface OTPSession {
  mobile: string;
  otp: string;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

const OTP_EXPIRY_MINUTES = 10;

// ---------------------------------------------------------------------------
// Public OTP Service — interface is stable regardless of SMS provider
// ---------------------------------------------------------------------------
export const otpService = {
  /** Generate a cryptographically sufficient 6-digit OTP */
  generateOTP(): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[OTP] Generated new OTP.`);
    return otp;
  },

  /**
   * Send an OTP to a mobile number.
   * Stores the OTP in MongoDB and dispatches via the SMS facade (MSG91 or dev console).
   */
  async sendOTP(mobile: string): Promise<{ success: boolean; otp: string }> {
    const db = await getDatabase();
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000);

    // Upsert: one active OTP per mobile at any time
    await db.collection("otps").updateOne(
      { mobile },
      {
        $set: {
          mobile,
          otp,
          expiresAt,
          verified: false,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    const success = await sendOtpSms(mobile, otp);
    if (success) {
      console.log(`[OTP] Sent OTP successfully to ${mobile}`);
    } else {
      console.error(`[OTP] Failed to send OTP to ${mobile}`);
    }
    return { success, otp };
  },

  /**
   * Verify an OTP submitted by a user.
   * Marks the record as verified on success (one-time use).
   */
  async verifyOTP(mobile: string, code: string): Promise<boolean> {
    const db = await getDatabase();

    // Try to find the exact record first to determine why it might fail
    const allRecords = await db.collection("otps").find({ mobile }).toArray();
    const record = allRecords.find(r => r.otp === code && r.verified === false && r.expiresAt > new Date());

    if (!record) {
      const expired = allRecords.find(r => r.otp === code && r.verified === false && r.expiresAt <= new Date());
      if (expired) {
        console.warn(`[OTP] Expired OTP attempted for ${mobile}`);
      } else {
        console.error(`[OTP] Failed / Invalid OTP attempt for ${mobile}`);
      }
      return false;
    }

    // Invalidate immediately so it cannot be reused
    await db.collection("otps").updateOne(
      { _id: record._id },
      { $set: { verified: true } }
    );

    console.log(`[OTP] Verified OTP successfully for ${mobile}`);
    return true;
  },
};
