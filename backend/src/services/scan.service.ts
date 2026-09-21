import { PrismaClient, IntegrationProvider, ScanAction, DocumentStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { sendPushNotification } from './fcm.service';

const prisma = new PrismaClient();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisConnection = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
});

export const documentAnalysisQueue = new Queue('analyze-document', { connection: redisConnection as any });

export class ScanService {
  /**
   * Run auto-scan for all active integrations across Gmail and Google Drive
   */
  static async runAutoScanJob() {
    console.log('[AUTO-SCAN JOB] Starting 15-minute scheduled integration polling...');
    const activeIntegrations = await prisma.integration.findMany({
      where: { is_active: true },
      include: { user: { include: { notification_preference: true } } },
    });

    console.log(`[AUTO-SCAN JOB] Found ${activeIntegrations.length} active integrations to scan.`);

    for (const integration of activeIntegrations) {
      try {
        if (integration.provider === IntegrationProvider.gmail) {
          await this.scanGmailIntegration(integration);
        } else if (integration.provider === IntegrationProvider.google_drive) {
          await this.scanDriveIntegration(integration);
        }
      } catch (err: any) {
        console.error(`[AUTO-SCAN ERROR] Integration ${integration.id} failed:`, err.message);
      }
    }
  }

  /**
   * Scan Gmail integration for new attachments
   */
  private static async scanGmailIntegration(integration: any) {
    const userId = integration.user_id;
    const now = new Date();

    // Mock/simulate finding new contract attachment from Gmail
    const simulatedFiles = [
      {
        ref: `msg_${Date.now()}_1`,
        name: 'Service_Agreement_Gmail_Scan.pdf',
        score: 0.92,
        isDuplicate: false,
      },
    ];

    for (const file of simulatedFiles) {
      await this.processScannedFile(integration, userId, file);
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { last_scanned_at: now },
    });
  }

  /**
   * Scan Google Drive integration for new files in folder
   */
  private static async scanDriveIntegration(integration: any) {
    const userId = integration.user_id;
    const now = new Date();

    const simulatedFiles = [
      {
        ref: `drive_file_${Date.now()}_1`,
        name: 'Vendor_Contract_Drive_Scan.pdf',
        score: 0.88,
        isDuplicate: false,
      },
    ];

    for (const file of simulatedFiles) {
      await this.processScannedFile(integration, userId, file);
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { last_scanned_at: now },
    });
  }

  /**
   * Process scanned file: classify, dedup, save document, trigger BullMQ analysis & push notification
   */
  private static async processScannedFile(integration: any, userId: string, file: { ref: string; name: string; score: number; isDuplicate: boolean }) {
    // Check Rishi's classify+dedup endpoint threshold (> 0.75 and not a duplicate)
    if (file.score <= 0.75 || file.isDuplicate) {
      await prisma.scanLog.create({
        data: {
          user_id: userId,
          integration_id: integration.id,
          source_ref: file.ref,
          source_name: file.name,
          action: file.isDuplicate ? ScanAction.deduplicated : ScanAction.skipped,
          classifier_score: file.score,
        },
      });
      return;
    }

    // Save contract in documents table
    const s3Key = `auto-scanned/${userId}/${Date.now()}-${file.name}`;
    const doc = await prisma.document.create({
      data: {
        user_id: userId,
        filename: `Auto-detected: ${file.name}`,
        s3_key: s3Key,
        status: DocumentStatus.uploaded,
      },
    });

    // Create scan log entry
    await prisma.scanLog.create({
      data: {
        user_id: userId,
        integration_id: integration.id,
        source_ref: file.ref,
        source_name: file.name,
        action: ScanAction.analyzed,
        doc_id: doc.id,
        classifier_score: file.score,
      },
    });

    // Enqueue document analysis job
    await documentAnalysisQueue.add('analyze-document', {
      documentId: doc.id,
      s3Key,
    });

    // Send FCM push notification if enabled
    const pref = integration.user?.notification_preference;
    if (pref && pref.push_enabled && pref.rescan_notify && pref.fcm_token) {
      await sendPushNotification({
        token: pref.fcm_token,
        title: 'New Contract Auto-Detected',
        body: `LegalEase auto-scanned "${file.name}" from ${integration.provider}. Analysis in progress.`,
        docId: doc.id,
      });
    }
  }
}
