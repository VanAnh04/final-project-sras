import type { BaseEntity } from './base';
import type { RatingDirection } from './enums';

/** Two-way rating (G-14). stars: 1–5. */
export interface Rating extends BaseEntity {
  requestId: number;
  direction: RatingDirection;
  raterUserId: number;
  stars: number;
  comment: string | null;
}
