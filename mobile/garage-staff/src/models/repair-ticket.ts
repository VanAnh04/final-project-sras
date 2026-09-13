import type { BaseEntity } from './base';
import type { RepairTicketStatus } from './enums';

/** Workshop repair ticket — 1–1 with a towed-in request; handles item ③ (DEC-11). */
export interface RepairTicket extends BaseEntity {
  code: string;
  rescueRequestId: number;
  garageId: number;
  customerId: number;
  status: RepairTicketStatus;
  receivedAt: string;
  doneAt: string | null;
  deliveredAt: string | null;
  totalAmount: number;
}
