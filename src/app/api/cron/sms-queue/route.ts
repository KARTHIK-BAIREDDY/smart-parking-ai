import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { getSmsProvider } from "@/lib/sms/sms-provider";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  // In a real production setup, we would secure this route with a secret token
  // that the external CRON service passes in.
  
  try {
    const db = await getDatabase();
    const now = new Date();

    // 1. Claim pending jobs
    // To prevent race conditions if multiple workers run, we use findOneAndUpdate
    // to atomically claim jobs. We will try to process up to 20 jobs.
    
    let processedCount = 0;
    
    while (processedCount < 20) {
      const claimResult = await db.collection("sms_queue").findOneAndUpdate(
        { 
          status: { $in: ["pending", "failed"] }, 
          nextAttempt: { $lte: now },
          retryCount: { $lt: 3 }
        },
        { 
          $set: { status: "processing", lastAttempt: now } 
        },
        { sort: { nextAttempt: 1 } }
      );

      // In MongoDB Node driver v6, findOneAndUpdate returns the document directly
      const job = claimResult;
      
      if (!job) {
        break; // No more jobs to process
      }

      processedCount++;

      const provider = await getSmsProvider(job.provider);
      
      try {
        // 3. Send SMS
        const result = await provider.sendSms(job.phoneNumber, job.message);
        
        if (result.success) {
          // 4. Mark completed
          await db.collection("sms_queue").updateOne(
            { _id: job._id },
            { $set: { status: "completed", error: null } }
          );

          // 5. Generate Audit Log
          await db.collection("sms_logs").insertOne({
            phoneNumber: job.phoneNumber,
            provider: job.provider,
            message: job.message,
            status: "delivered",
            providerMessageId: result.messageId,
            createdAt: job.createdAt,
            deliveredAt: new Date(),
            error: null
          });
        } else {
          throw new Error(result.error || "Unknown provider error");
        }
      } catch (err: any) {
        // Failed
        const newRetryCount = (job.retryCount || 0) + 1;
        let newStatus = "failed";
        let nextAttempt = new Date();

        // Exponential backoff
        if (newRetryCount >= 3) {
          newStatus = "dead";
        } else if (newRetryCount === 1) {
          nextAttempt = new Date(now.getTime() + 1 * 60000); // +1 min
        } else if (newRetryCount === 2) {
          nextAttempt = new Date(now.getTime() + 5 * 60000); // +5 min
        } else if (newRetryCount === 3) {
          nextAttempt = new Date(now.getTime() + 15 * 60000); // +15 min
        }

        await db.collection("sms_queue").updateOne(
          { _id: job._id },
          { 
            $set: { 
              status: newStatus, 
              retryCount: newRetryCount, 
              nextAttempt: nextAttempt,
              error: err.message || String(err)
            } 
          }
        );

        // Audit Log
        await db.collection("sms_logs").insertOne({
          phoneNumber: job.phoneNumber,
          provider: job.provider,
          message: job.message,
          status: newStatus,
          providerMessageId: null,
          createdAt: job.createdAt,
          deliveredAt: null,
          error: err.message || String(err)
        });
      }
    }

    return NextResponse.json({ success: true, processedCount });
  } catch(err: any) {
    logger.error("[CRON] sms-queue processing error:", err as Error, { component: "SmsQueueCron" });
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
