import type { BaseEntity } from './base';
import type { OfferStatus } from './enums';

/** One dispatch offer per garage per request (D-2). */
export interface DispatchOffer extends BaseEntity {
  requestId: number;
  garageId: number;
  rank: number;
  distanceKm: number;
  etaMinutes: number | null;
  quotedFee: number;
  quotedTowingFee: number;
  estimatedObligation: number;
  status: OfferStatus;
  sentAt: string | null;
  expiresAt: string | null;
  respondedAt: string | null;
  rejectReason: string | null;
}
