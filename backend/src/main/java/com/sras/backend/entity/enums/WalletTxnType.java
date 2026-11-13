package com.sras.backend.entity.enums;

/** Ledger entry type on {@code wallet_transactions.type}. */
public enum WalletTxnType {
    TOPUP,
    COMMISSION_DEBIT,
    TAX_DEBIT,
    ORDER_CREDIT,
    ORDER_SPLIT_SYSTEM,
    ORDER_SPLIT_EMPLOYEE,
    ORDER_SPLIT_GARAGE,
    CASH_COLLECT_DEDUCT,
    WITHDRAWAL_HOLD,
    WITHDRAWAL_DONE,
    WITHDRAWAL_REFUND,
    ADJUSTMENT,
    COMPENSATION
}
