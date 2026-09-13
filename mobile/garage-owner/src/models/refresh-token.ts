import type { BaseEntity } from './base';

/** Rotating refresh tokens, stored hashed (ADR-06). */
export interface RefreshToken extends BaseEntity {
  userId: number;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  replacedById: number | null;
  userAgent: string | null;
}
