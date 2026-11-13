import type { BaseEntity } from './base';
import type { FeeType, ServiceUnit } from './enums';

/** A standard service with an admin-defined min–max price band (DEC-04, DEC-21). */
export interface Service extends BaseEntity {
  categoryId: number;
  name: string;
  code: string;
  feeType: FeeType;
  minPrice: number;
  maxPrice: number;
  unit: ServiceUnit | null;
  isActive: boolean;
}
