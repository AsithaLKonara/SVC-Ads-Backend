import prisma from './db';

/**
 * Deletes AuditLog records older than 90 days.
 * This runs on startup and then every 24 hours — records are non-deletable
 * by admins but auto-pruned by the system after the retention window.
 */
export const pruneOldAuditLogs = async (): Promise<void> => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoff }
      }
    });

    if (result.count > 0) {
      console.log(`[AuditLog] Pruned ${result.count} records older than 90 days.`);
    }
  } catch (err) {
    console.error('[AuditLog] Failed to prune old audit logs:', err);
  }
};

/**
 * Schedules daily pruning. Call once at server startup.
 */
export const scheduleAuditLogPrune = (): void => {
  // Run immediately on boot
  pruneOldAuditLogs();

  // Then run every 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(pruneOldAuditLogs, TWENTY_FOUR_HOURS);
  console.log('[AuditLog] 90-day auto-prune scheduled.');
};
