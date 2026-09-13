package com.sras.backend.entity.enums;

/** Ledger entry type on {@code wallet_transactions.type}. */
public enum WalletTxnType {
    TOPUP,
    COMMISSION_DEBIT,
    TAX_DEBIT,
    ORDER_CREDIT,
    WITHDRAWAL_HOLD,
    WITHDRAWAL_DONE,
    WITHDRAWAL_REFUND,
    ADJUSTMENT
}
