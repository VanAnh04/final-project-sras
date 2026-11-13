import type { AppendOnlyEntity } from './base';
import type { WalletTxnType, WalletType } from './enums';

/** Append-only wallet ledger (D-3). refType: RESCUE_REQUEST · PAYMENT · WITHDRAWAL. */
export interface WalletTransaction extends AppendOnlyEntity {
  garageId: number;
  walletType: WalletType;
  type: WalletTxnType;
  amount: number;
  balanceAfter: number;
  refType: string | null;
  refId: number | null;
  description: string;
  createdByUserId: number | null;
}
