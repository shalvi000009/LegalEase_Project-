import { Worker, Queue, Job } from "bullmq";
import { connectionOptions } from "../config/queue";
import { prisma } from "../config/db";
import { sendReminderEmail } from "./email.service";

export const REMINDER_QUEUE_NAME = "reminder-notifications";
const isMock = process.env.MOCK_SERVICES === "true";

/**
 * Process pending reminders due for delivery today or earlier.
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

      // Dispatch email notification via SendGrid service
      await sendReminderEmail({
        to: user.email,
        userName: user.name,
        documentTitle: document.filename,
        dateType: contractDate.date_type,
        resolvedDate: contractDate.resolved_date,
        daysBefore: reminder.days_before,
      });

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
 * Initialize BullMQ Queue and Worker for daily cron reminder job.
 */
export function startReminderWorker(): Worker | null {
  if (isMock) {
    console.log("👷 [Mock Worker] Mock reminder worker initialized inline.");
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
        console.log(`[REMINDER WORKER] Processing reminder job '${job.name}' (ID: ${job.id})...`);
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
