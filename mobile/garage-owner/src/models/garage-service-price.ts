import type { BaseEntity } from './base';

/** A garage's own price (item ③) for a service, within the admin min–max band (DEC-04). */
export interface GarageServicePrice extends BaseEntity {
  garageId: number;
  serviceId: number;
  price: number;
  isActive: boolean;
}
