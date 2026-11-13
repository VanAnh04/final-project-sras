package com.sras.backend.entity.enums;

/** The 8-value lifecycle of a withdrawal request ({@code withdrawal_requests.status}, ADR-19). */
public enum WithdrawalStatus {
    PENDING,
    APPROVED,
    PAYOUT_SENDING,
    PAYOUT_PROCESSING,
    PAYOUT_UNCERTAIN,
    TRANSFERRED,
    REJECTED,
    FAILED
}
