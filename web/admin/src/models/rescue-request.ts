import type { BaseEntity } from './base';
import type { CancelledBy, RequestPaymentMethod, RescueStatus, VehicleType } from './enums';

/** The central table of the system. State machine: ARCHITECTURE.md §6. */
export interface RescueRequest extends BaseEntity {
  code: string;
  customerId: number;
  customerVehicleId: number | null;
  vehicleType: VehicleType;
  symptom: string;
  aiConversationId: number | null;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string | null;
  locationNote: string | null;
  paymentMethod: RequestPaymentMethod;
  status: RescueStatus;
  garageId: number | null;
  staffId: number | null;
  rescueVehicleId: number | null;
  searchRadiusKm: number;
  isRadiusExpanded: boolean;
  dispatchDistanceKm: number | null;
  rescueFee: number | null;
  quotedTowingFee: number | null;
  towingFee: number | null;
  serviceFee: number | null;
  totalAmount: number | null;
  commissionRate: number | null;
  commissionAmount: number | null;
  taxRate: number | null;
  taxAmount: number | null;
  cancelReason: string | null;
  cancelledBy: CancelledBy | null;
  isCancelFeeCharged: boolean;
  enRouteAt: string | null;
  enRouteLat: number | null;
  enRouteLng: number | null;
  arrivedAt: string | null;
  completedAt: string | null;
  paidAt: string | null;
  version: number;
}
