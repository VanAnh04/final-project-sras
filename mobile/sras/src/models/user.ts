import type { BaseEntity } from './base';
import type { UserRole, UserStatus } from './enums';

/** Every system user, distinguished by {@link UserRole}. */
export interface User extends BaseEntity {
  phone: string;
  passwordHash: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  debtAmount: number;
  isBlockedByDebt: boolean;
  lastLoginAt: string | null;
}
