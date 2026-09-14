import type { BaseEntity } from './base';

/** Route polylines rolled up when the order closes (D-5). 1–1 with a rescue request. */
export interface RouteSnapshot extends BaseEntity {
  requestId: number;
  suggestedPolyline: string | null;
  actualPolyline: string | null;
  staticMapUrl: string | null;
  totalDistanceKm: number | null;
  durationMinutes: number | null;
}
