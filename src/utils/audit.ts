import prisma from './db';
import { Prisma } from '@prisma/client';

interface AuditEventPayload {
  action: string;
  entity: string;
  entityId?: string;
  entityName?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Records an immutable audit event in the database.
 * This function never throws — failures are silently logged so they
 * don't interrupt the primary request flow.
 */
export const logAuditEvent = async (payload: AuditEventPayload): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId ?? null,
        entityName: payload.entityName ?? null,
        actorId: payload.actorId ?? null,
        actorName: payload.actorName ?? null,
        actorRole: payload.actorRole ?? null,
        metadata: payload.metadata ?? Prisma.JsonNull,
        ipAddress: payload.ipAddress ?? null,
      }
    });
  } catch (err) {
    // Audit log failure must NEVER break the main operation
    console.error('[AuditLog] Failed to write audit event:', err);
  }
};
