import type { BaseEntity } from './base';
import type { Capability } from './enums';

/** A service group defined by the admin. */
export interface ServiceCategory extends BaseEntity {
  name: string;
  code: string;
  vehicleType: Capability;
  displayOrder: number;
  isActive: boolean;
}
