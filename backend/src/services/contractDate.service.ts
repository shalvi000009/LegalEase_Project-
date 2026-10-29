import { prisma } from "../config/db";
import { DateType, ReminderChannel } from "@prisma/client";

export interface ExtractedContractDatesInput {
  effective_date?: string | null;
  expiry_date?: string | null;
  renewal_date?: string | null;
  notice_period_days?: number | null;
  auto_renews?: boolean;
}

export type ComputedVaultStatus = "active" | "expiring_soon" | "expired" | "renewed" | "unknown";

export function computeContractStatus(expiryDate: Date | null): { status: ComputedVaultStatus; daysRemaining: number } {
  if (!expiryDate || isNaN(expiryDate.getTime())) {
    return { status: "unknown", daysRemaining: 0 };
  }

  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let status: ComputedVaultStatus = "active";
  if (daysRemaining < 0) {
    status = "expired";
  } else if (daysRemaining <= 30) {
    status = "expiring_soon";
  } else {
    status = "active";
  }

  return { status, daysRemaining };
}

/**
 * Save extracted or manual contract dates and auto-generate corresponding reminders.
 */
export async function saveContractDatesAndReminders(
  documentId: string,
  userId: string,
  datesData: ExtractedContractDatesInput,
  source: "extracted" | "manual" = "extracted"
): Promise<void> {
  if (!datesData) return;

  const userConfirmed = source === "manual";
  const now = new Date();

  // Fetch user's notification preferences to choose default channel
  const userPrefs = await prisma.notificationPreferences.findFirst({
    where: { user_id: userId },
  });

  const preferredChannel: ReminderChannel =
    userPrefs?.push_enabled && !userPrefs.email_enabled
      ? ReminderChannel.push
      : userPrefs?.sms_enabled && !userPrefs.email_enabled
      ? ReminderChannel.sms
      : ReminderChannel.email;

  // 1. Process Expiry Date
  if (datesData.expiry_date) {
    const parsedExpiry = new Date(datesData.expiry_date);
    if (!isNaN(parsedExpiry.getTime())) {
      // Find or create expiry_date entry
      let expiryDateRecord = await prisma.contractDate.findFirst({
        where: {
          doc_id: documentId,
          date_type: DateType.expiry_date,
          is_active: true,
        },
      });

      if (expiryDateRecord) {
        expiryDateRecord = await prisma.contractDate.update({
          where: { id: expiryDateRecord.id },
          data: {
            resolved_date: parsedExpiry,
            raw_text: `Expiration Date: ${datesData.expiry_date}`,
            confidence: userConfirmed ? 1.0 : 0.95,
            user_confirmed: userConfirmed,
          },
        });
      } else {
        expiryDateRecord = await prisma.contractDate.create({
          data: {
            doc_id: documentId,
            date_type: DateType.expiry_date,
            raw_text: `Expiration Date: ${datesData.expiry_date}`,
            resolved_date: parsedExpiry,
            confidence: userConfirmed ? 1.0 : 0.95,
            user_confirmed: userConfirmed,
            is_active: true,
          },
        });
      }

      // Generate reminders: 30, 7, 1 days before expiry, and 0 days (on expiry day)
      const offsets = [30, 7, 1, 0];
      const isPast = parsedExpiry.getTime() <= now.getTime();

      if (isPast) {
        // Contract is already expired: create one single "expired" notice if not already present
        const existingExpiredReminder = await prisma.reminder.findFirst({
          where: {
            contract_date_id: expiryDateRecord.id,
            days_before: 0,
          },
        });

        if (!existingExpiredReminder) {
          await prisma.reminder.create({
            data: {
              user_id: userId,
              contract_date_id: expiryDateRecord.id,
              days_before: 0,
              scheduled_for: now,
              status: "pending",
              channel: preferredChannel,
            },
          });
        }
      } else {
        // Contract is in the future: schedule reminders for offsets that haven't passed
        for (const daysBefore of offsets) {
          const scheduledFor = new Date(parsedExpiry.getTime() - daysBefore * 24 * 60 * 60 * 1000);

          // Only create reminder if scheduled date is now or in the future
          if (scheduledFor.getTime() >= now.getTime() - 24 * 60 * 60 * 1000) {
            const existing = await prisma.reminder.findFirst({
              where: {
                contract_date_id: expiryDateRecord.id,
                days_before: daysBefore,
              },
            });

            if (!existing) {
              await prisma.reminder.create({
                data: {
                  user_id: userId,
                  contract_date_id: expiryDateRecord.id,
                  days_before: daysBefore,
                  scheduled_for: scheduledFor > now ? scheduledFor : now,
                  status: "pending",
                  channel: preferredChannel,
                },
              });
            }
          }
        }
      }
    }
  }

  // 2. Process Renewal Date
  if (datesData.renewal_date || (datesData.auto_renews && datesData.expiry_date)) {
    const rawRenewal = datesData.renewal_date || datesData.expiry_date;
    const parsedRenewal = new Date(rawRenewal!);
    if (!isNaN(parsedRenewal.getTime())) {
      const existing = await prisma.contractDate.findFirst({
        where: {
          doc_id: documentId,
          date_type: DateType.renewal_date,
          is_active: true,
        },
      });

      if (!existing) {
        await prisma.contractDate.create({
          data: {
            doc_id: documentId,
            date_type: DateType.renewal_date,
            raw_text: `Contract Renewal Date: ${rawRenewal}`,
            resolved_date: parsedRenewal,
            confidence: userConfirmed ? 1.0 : 0.9,
            user_confirmed: userConfirmed,
            is_active: true,
          },
        });
      }
    }
  }

  // 3. Process Notice Deadline (Expiry - notice_period_days)
  if (datesData.notice_period_days && datesData.expiry_date) {
    const parsedExpiry = new Date(datesData.expiry_date);
    if (!isNaN(parsedExpiry.getTime())) {
      const noticeDate = new Date(parsedExpiry.getTime() - datesData.notice_period_days * 24 * 60 * 60 * 1000);
      let noticeRecord = await prisma.contractDate.findFirst({
        where: {
          doc_id: documentId,
          date_type: DateType.notice_deadline,
          is_active: true,
        },
      });

      if (!noticeRecord) {
        noticeRecord = await prisma.contractDate.create({
          data: {
            doc_id: documentId,
            date_type: DateType.notice_deadline,
            raw_text: `Non-Renewal Notice Deadline (${datesData.notice_period_days} days prior)`,
            resolved_date: noticeDate,
            confidence: userConfirmed ? 1.0 : 0.9,
            user_confirmed: userConfirmed,
            is_active: true,
          },
        });

        // If auto_renews, schedule notice deadline alert
        if (datesData.auto_renews) {
          const noticeAlertScheduled = new Date(noticeDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          await prisma.reminder.create({
            data: {
              user_id: userId,
              contract_date_id: noticeRecord.id,
              days_before: 7,
              scheduled_for: noticeAlertScheduled > now ? noticeAlertScheduled : now,
              status: "pending",
              channel: preferredChannel,
            },
          });
        }
      }
    }
  }

  // 4. Process Effective Date
  if (datesData.effective_date) {
    const parsedEffective = new Date(datesData.effective_date);
    if (!isNaN(parsedEffective.getTime())) {
      const existing = await prisma.contractDate.findFirst({
        where: {
          doc_id: documentId,
          date_type: DateType.other,
          raw_text: { startsWith: "Effective Date" },
          is_active: true,
        },
      });

      if (!existing) {
        await prisma.contractDate.create({
          data: {
            doc_id: documentId,
            date_type: DateType.other,
            raw_text: `Effective Date: ${datesData.effective_date}`,
            resolved_date: parsedEffective,
            confidence: userConfirmed ? 1.0 : 0.95,
            user_confirmed: userConfirmed,
            is_active: true,
          },
        });
      }
    }
  }
}

/**
 * Retrieve user's analyzed contracts formatted for Contract Vault UI & Calendar.
 */
export async function getVaultContractsForUser(userId: string) {
  const documents = await prisma.document.findMany({
    where: {
      user_id: userId,
      status: { in: ["done", "uploaded", "processing"] },
    },
    orderBy: { created_at: "desc" },
    include: {
      analyses: {
        orderBy: { created_at: "desc" },
        take: 1,
        include: {
          clauses: {
            select: { clause_type: true },
            take: 5,
          },
        },
      },
      contract_dates: {
        where: { is_active: true },
        include: {
          reminders: {
            where: { status: "pending" },
            orderBy: { scheduled_for: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  const now = new Date();

  const formattedContracts = documents.map((doc) => {
    const latestAnalysis = doc.analyses?.[0];
    const riskScore = latestAnalysis?.overall_risk_score ?? 0;

    // Find expiry date record if available
    const expiryRecord = doc.contract_dates.find((d) => d.date_type === DateType.expiry_date) ||
      doc.contract_dates.find((d) => d.date_type === DateType.renewal_date) ||
      doc.contract_dates[0];

    // Find effective date record if available
    const effectiveRecord = doc.contract_dates.find(
      (d) => d.raw_text.toLowerCase().includes("effective")
    );

    let expiryDate = "";
    let daysRemaining = 0;
    let status: ComputedVaultStatus = "unknown";

    if (expiryRecord?.resolved_date) {
      const expDate = new Date(expiryRecord.resolved_date);
      expiryDate = expDate.toISOString().split("T")[0];
      const comp = computeContractStatus(expDate);
      daysRemaining = comp.daysRemaining;
      status = comp.status;
    }

    const effectiveDate = effectiveRecord?.resolved_date
      ? new Date(effectiveRecord.resolved_date).toISOString().split("T")[0]
      : "";

    // Find next pending reminder
    let nextReminder: string | undefined = undefined;
    for (const cd of doc.contract_dates) {
      if (cd.reminders && cd.reminders.length > 0) {
        const nextRem = cd.reminders[0];
        if (nextRem.scheduled_for) {
          nextReminder = new Date(nextRem.scheduled_for).toISOString().split("T")[0];
          break;
        }
      }
    }

    // Determine readable contract type
    let documentType = "Standard Contract";
    const lowerName = doc.filename.toLowerCase();
    if (lowerName.includes("nda") || lowerName.includes("non-disclosure")) {
      documentType = "Non-Disclosure Agreement";
    } else if (lowerName.includes("employment")) {
      documentType = "Employment Agreement";
    } else if (lowerName.includes("service") || lowerName.includes("msa")) {
      documentType = "Master Services Agreement";
    } else if (lowerName.includes("lease")) {
      documentType = "Commercial Lease";
    } else if (lowerName.includes("vendor")) {
      documentType = "Vendor Agreement";
    } else if (latestAnalysis?.clauses?.length) {
      const firstType = latestAnalysis.clauses[0].clause_type.replace(/_/g, " ");
      documentType = firstType.charAt(0).toUpperCase() + firstType.slice(1) + " Contract";
    }

    return {
      id: doc.id,
      name: doc.filename,
      status,
      expiryDate,
      effectiveDate,
      riskScore,
      daysRemaining,
      nextReminder,
      uploadDate: doc.created_at.toISOString().split("T")[0],
      documentType,
      dateCount: doc.contract_dates.length,
    };
  });

  const total = formattedContracts.length;
  const active = formattedContracts.filter((c) => c.status === "active" || c.status === "renewed").length;
  const expiringSoon = formattedContracts.filter((c) => c.status === "expiring_soon").length;
  const expired = formattedContracts.filter((c) => c.status === "expired").length;

  return {
    contracts: formattedContracts,
    stats: {
      total,
      active,
      expiringSoon,
      expired,
    },
  };
}

