import type { BaseEntity } from './base';
import type { Capability, GarageStatus } from './enums';

/** A garage; both wallets (credit/cash) live directly on this record (ADR-18). */
export interface Garage extends BaseEntity {
  ownerUserId: number;
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  capability: Capability;
  status: GarageStatus;
  rejectionReason: string | null;
  isOnline: boolean;
  creditBalance: number;
  cashBalance: number;
  bankCode: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  bankAccountHolder: string | null;
  avgRating: number;
  ratingCount: number;
  cancelRate: number;
  totalOrders: number;
  approvedAt: string | null;
  version: number;
}
