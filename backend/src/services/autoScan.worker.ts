import { Worker, Queue, Job } from 'bullmq';
import { connectionOptions } from '../config/queue';
import { ScanService } from './scan.service';

export const AUTO_SCAN_QUEUE_NAME = 'auto-scan-integrations';
const isMock = process.env.MOCK_SERVICES === 'true';

/**
 * Initialize BullMQ Queue and Worker for 15-minute repeatable auto-scan polling job.
 */
export function startAutoScanWorker(): Worker | null {
  if (isMock || process.env.ENABLE_REDIS !== 'true') {
    console.log('👷 Auto-scan worker running in fault-tolerant direct mode.');
    return null;
  }

  try {
    const autoScanQueue = new Queue(AUTO_SCAN_QUEUE_NAME, { connection: connectionOptions });

    // Schedule repeatable job every 15 minutes
    autoScanQueue
      .add(
        'repeatable-auto-scan-15min',
        {},
        {
          repeat: {
            pattern: '*/15 * * * *', // Every 15 minutes
          },
          removeOnComplete: true,
        } as any
      )
      .catch((err) => console.error('Failed to add repeatable auto-scan job to queue:', err));

    const autoScanWorker = new Worker(
      AUTO_SCAN_QUEUE_NAME,
      async (job: Job) => {
        console.log(`[AUTO-SCAN WORKER] Executing 15-minute integration polling job '${job.name}' (ID: ${job.id})...`);
        await ScanService.runAutoScanJob();
        console.log('[AUTO-SCAN WORKER] 15-minute integration polling job finished.');
      },
      { connection: connectionOptions }
    );

    autoScanWorker.on('failed', (job, err) => {
      console.error(`[AUTO-SCAN WORKER JOB FAILED] Job ${job?.id} failed:`, err.message);
    });

    return autoScanWorker;
  } catch (error: any) {
    console.error('Failed to start auto-scan worker:', error?.message || error);
    return null;
  }
}
