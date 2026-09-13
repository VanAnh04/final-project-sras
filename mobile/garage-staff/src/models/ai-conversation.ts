import type { BaseEntity } from './base';
import type { VehicleType } from './enums';

/** An AI assistant conversation (R-07). */
export interface AiConversation extends BaseEntity {
  customerId: number;
  vehicleType: VehicleType | null;
  title: string | null;
  issueGroup: string | null;
  convertedToRequest: boolean;
}
