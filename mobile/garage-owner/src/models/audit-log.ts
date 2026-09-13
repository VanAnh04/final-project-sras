import type { AppendOnlyEntity } from './base';

/** Append-only audit trail of money, order-status, approval, and account-lock changes. */
export interface AuditLog extends AppendOnlyEntity {
  actorUserId: number | null;
  action: string;
  entityType: string;
  entityId: number;
  beforeValue: string | null;
  afterValue: string | null;
  traceId: string | null;
  ipAddress: string | null;
}
