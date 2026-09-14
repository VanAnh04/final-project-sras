import type { BaseEntity } from './base';
import type { PaymentMethod, PaymentStatus, PaymentType } from './enums';

/** Inbound money via payOS — shared by order payment and wallet top-up (ADR-21). */
export interface Payment extends BaseEntity {
  paymentType: PaymentType;
  requestId: number | null;
  garageId: number | null;
  paidByUserId: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  providerOrderCode: number;
  providerTxnId: string | null;
  providerResponseCode: string | null;
  rawCallback: string | null;
  confirmedByUserId: number | null;
  paidAt: string | null;
}
