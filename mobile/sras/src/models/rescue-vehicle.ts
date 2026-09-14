import type { BaseEntity } from './base';
import type { Capability, RescueVehicleKind, WorkStatus } from './enums';

/** A rescue vehicle owned by a garage. */
export interface RescueVehicle extends BaseEntity {
  garageId: number;
  licensePlate: string;
  vehicleKind: RescueVehicleKind;
  capability: Capability;
  registrationUrl: string | null;
  status: WorkStatus;
  isActive: boolean;
}
