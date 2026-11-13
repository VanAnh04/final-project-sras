import type { BaseEntity } from './base';
import type { PayoutMode, PayoutProvider, WithdrawalStatus } from './enums';

/** Withdrawal from the cash wallet only (ADR-18); MANUAL / AUTO payout (ADR-19, DEC-27). */
export interface WithdrawalRequest extends BaseEntity {
  garageId: number;
  amount: number;
  status: WithdrawalStatus;
  payoutMode: PayoutMode;
  transferCode: string;
  bankSnapshot: string;
  reviewedByUserId: number | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  transferProofUrl: string | null;
  idempotencyKey: string;
  payoutProvider: PayoutProvider | null;
  providerPayoutId: string | null;
  bankBinSnapshot: string;
  bankAccountNumberSnapshot: string;
  payoutSentAt: string | null;
  payoutSettledAt: string | null;
  payoutAttemptCount: number;
  payoutErrorCode: string | null;
  payoutErrorMessage: string | null;
  providerFee: number;
  needsManualReview: boolean;
}
