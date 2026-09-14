import type { BaseEntity } from './base';
import type { ItemPhase, ItemStatus } from './enums';

/** Item ③ quote lines; the customer approves each line individually (reverses DEC-10). */
export interface RescueRequestItem extends BaseEntity {
  requestId: number;
  serviceId: number | null;
  nameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  amount: number;
  phase: ItemPhase;
  status: ItemStatus;
  createdByUserId: number;
  respondedAt: string | null;
}
