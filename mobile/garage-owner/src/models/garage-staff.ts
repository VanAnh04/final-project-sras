import type { BaseEntity } from './base';
import type { WorkStatus } from './enums';

/** A staff member employed by a garage (D-6). */
export interface GarageStaff extends BaseEntity {
  garageId: number;
  userId: number;
  staffCode: string | null;
  status: WorkStatus;
  isActive: boolean;
}
