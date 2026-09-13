import type { AppendOnlyEntity } from './base';
import type { ActorType, RescueStatus } from './enums';

/** Append-only log of rescue-request status transitions. */
export interface RescueStatusHistory extends AppendOnlyEntity {
  requestId: number;
  fromStatus: RescueStatus | null;
  toStatus: RescueStatus;
  changedByUserId: number | null;
  actorType: ActorType;
  note: string | null;
}
