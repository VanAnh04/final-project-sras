import type { BaseEntity } from './base';
import type { VehicleType } from './enums';

/** A customer's self-declared vehicle ("personal garage", AS-06). */
export interface CustomerVehicle extends BaseEntity {
  customerId: number;
  vehicleType: VehicleType;
  brand: string;
  model: string | null;
  licensePlate: string | null;
  color: string | null;
  year: number | null;
  photoUrl: string | null;
  isDefault: boolean;
}
