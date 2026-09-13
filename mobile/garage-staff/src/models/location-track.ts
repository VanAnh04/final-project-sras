import type { AppendOnlyEntity } from './base';

/** Append-only GPS breadcrumb — recorded only when moved > 20 m (RISK-A08). */
export interface LocationTrack extends AppendOnlyEntity {
  requestId: number;
  staffId: number;
  lat: number;
  lng: number;
  accuracyM: number | null;
  speedKmh: number | null;
  recordedAt: string;
}
