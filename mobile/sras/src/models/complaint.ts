import type { BaseEntity } from './base';
import type { ComplaintStatus, ComplaintTargetType } from './enums';

/** A complaint raised against a garage, customer, or the platform. */
export interface Complaint extends BaseEntity {
  requestId: number | null;
  createdByUserId: number;
  targetType: ComplaintTargetType;
  content: string;
  attachmentUrl: string | null;
  status: ComplaintStatus;
  resolution: string | null;
  handledByUserId: number | null;
}
