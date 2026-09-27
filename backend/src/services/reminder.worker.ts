import { Worker, Queue, Job } from "bullmq";
import { connectionOptions } from "../config/queue";
import { prisma } from "../config/db";
import { sendReminderEmail } from "./email.service";
import { sendPushNotification } from "./fcm.service";
import { sendSmsNotification } from "./twilio.service";

export const REMINDER_QUEUE_NAME = "reminder-notifications";
const isMock = process.env.MOCK_SERVICES === "true";

/**
 * Process pending reminders due for delivery today or earlier.
 * Branches multi-channel delivery by email (SendGrid), push (FCM), or SMS (Twilio).
 */
export async function processPendingReminders(): Promise<{ processedCount: number; successCount: number; failureCount: number }> {
  const now = new Date();

  // Find all pending reminders scheduled for today or in the past
  const pendingReminders = await prisma.reminder.findMany({
    where: {
      status: "pending",
      scheduled_for: {
        lte: now,
      },
    },
    include: {
      user: true,
      contract_date: {
        include: {
          document: true,
        },
      },
    },
  });

  let successCount = 0;
  let failureCount = 0;

  for (const reminder of pendingReminders) {
    try {
      const user = reminder.user;
      const contractDate = reminder.contract_date;
      const document = contractDate?.document;

      if (!user || !contractDate || !document) {
        console.warn(`[REMINDER WORKER] Incomplete data for reminder ${reminder.id}. Marking failed.`);
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: "failed" },
        });
        failureCount++;
        continue;
      }

      // Fetch user's notification preferences (if available)
      const userPrefs = await prisma.notificationPreferences.findFirst({
        where: { user_id: user.id },
      });

      const readableDateType = contractDate.date_type.replace(/_/g, " ").toUpperCase();

      // Branch execution by channel
      if (reminder.channel === "push" || (userPrefs && userPrefs.push_enabled && !userPrefs.email_enabled)) {
        const token = userPrefs?.fcm_token || `fcm-token-user-${user.id}`;
        await sendPushNotification({
          token,
          title: `[LegalEase Alert] ${readableDateType} Deadline`,
          body: `Contract "${document.filename}" deadline in ${reminder.days_before} day(s).`,
          docId: document.id,
        });
      } else if (reminder.channel === "sms" || reminder.days_before === 1) {
        // SMS used for 1-day critical deadline alerts or explicit SMS channel
        const phone = userPrefs?.phone_number || "+15005550006";
        await sendSmsNotification({
          to: phone,
          message: `[LegalEase Critical Alert] ${readableDateType} for ${document.filename} is due in ${reminder.days_before} day(s)!`,
        });
      } else {
        // Default channel: email via SendGrid
        await sendReminderEmail({
          to: user.email,
          userName: user.name,
          documentTitle: document.filename,
          dateType: contractDate.date_type,
          resolvedDate: contractDate.resolved_date,
          daysBefore: reminder.days_before,
        });
      }

      // Update reminder status on success
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: "sent",
          sent_at: new Date(),
        },
      });

      successCount++;
    } catch (error: any) {
      console.error(`[REMINDER WORKER ERROR] Failed processing reminder ${reminder.id}:`, error?.message || error);
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "failed" },
      });
      failureCount++;
    }
  }

  return {
    processedCount: pendingReminders.length,
    successCount,
    failureCount,
  };
}

/**
 * Initialize BullMQ Queue and Worker for multi-channel daily cron reminder job.
 */
export function startReminderWorker(): Worker | null {
  if (isMock || process.env.ENABLE_REDIS !== "true") {
    console.log("👷 Multi-channel reminder worker running in fault-tolerant direct mode.");
    return null;
  }

  try {
    const reminderQueue = new Queue(REMINDER_QUEUE_NAME, { connection: connectionOptions });

    // Schedule daily cron job (runs every day at 8:00 AM)
    reminderQueue.add(
      "daily-reminder-cron",
      {},
      {
        repeat: {
          pattern: "0 8 * * *", // 8 AM UTC daily
        },
        removeOnComplete: true,
      } as any
    ).catch((err) => console.error("Failed to add repeatable reminder job to queue:", err));

    const reminderWorker = new Worker(
      REMINDER_QUEUE_NAME,
      async (job: Job) => {
        console.log(`[REMINDER WORKER] Processing multi-channel reminder job '${job.name}' (ID: ${job.id})...`);
        const result = await processPendingReminders();
        console.log(`[REMINDER WORKER] Completed. Processed: ${result.processedCount}, Sent: ${result.successCount}, Failed: ${result.failureCount}`);
        return result;
      },
      { connection: connectionOptions }
    );

    reminderWorker.on("failed", (job, err) => {
      console.error(`[REMINDER WORKER JOB FAILED] Job ${job?.id} failed:`, err.message);
    });

    return reminderWorker;
  } catch (error: any) {
    console.error("Failed to start reminder worker:", error?.message || error);
    return null;
  }
}
