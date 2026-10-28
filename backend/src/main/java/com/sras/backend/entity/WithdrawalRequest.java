package com.sras.backend.entity;

import com.sras.backend.entity.enums.PayoutMode;
import com.sras.backend.entity.enums.PayoutProvider;
import com.sras.backend.entity.enums.WithdrawalStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * Withdrawal from the cash wallet only (ADR-18). Two modes (MANUAL / AUTO payout, ADR-19, DEC-27).
 *
 * <p>NOTE: the partial indexes {@code idx_withdrawal_payout_pending}
 * ({@code WHERE payout_mode = 'AUTO'}) and {@code idx_withdrawal_needs_review}
 * ({@code WHERE needs_manual_review}) cannot be expressed with JPA and must be added via SQL.
 */
@Getter
@Setter
@Entity
@Table(name = "withdrawal_requests", indexes = {
        @Index(name = "uq_withdrawal_transfer_code", columnList = "transfer_code", unique = true),
        @Index(name = "uq_withdrawal_idempotency_key", columnList = "idempotency_key", unique = true),
        @Index(name = "uq_withdrawal_provider_payout_id", columnList = "provider_payout_id", unique = true),
        @Index(name = "idx_withdrawal_requests_status_created", columnList = "status, created_at"),
        @Index(name = "idx_withdrawal_requests_garage_created", columnList = "garage_id, created_at DESC")
})
public class WithdrawalRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    /** VND. Min 100,000; max = cash_balance. */
    @Column(name = "amount", nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private WithdrawalStatus status = WithdrawalStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payout_mode", nullable = false, length = 10)
    private PayoutMode payoutMode = PayoutMode.MANUAL;

    /** Transfer memo {@code RUT<id>} — generates VietQR and reconciles the statement. */
    @Column(name = "transfer_code", nullable = false, unique = true, length = 20)
    private String transferCode;

    /** Human-readable bank snapshot for display. */
    @Column(name = "bank_snapshot", nullable = false, length = 255)
    private String bankSnapshot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_user_id")
    private User reviewedByUser;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    /** MANUAL mode only. */
    @Column(name = "transfer_proof_url", length = 500)
    private String transferProofUrl;

    /** Double-payout guard (INV-1). Generated and committed in TX-1, immutable. */
    @Column(name = "idempotency_key", nullable = false, unique = true, length = 64)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "payout_provider", length = 20)
    private PayoutProvider payoutProvider;

    @Column(name = "provider_payout_id", unique = true, length = 64)
    private String providerPayoutId;

    /** Machine-readable bank BIN snapshot sent to the gateway. */
    @Column(name = "bank_bin_snapshot", nullable = false, length = 10)
    private String bankBinSnapshot;

    @Column(name = "bank_account_number_snapshot", nullable = false, length = 32)
    private String bankAccountNumberSnapshot;

    /** Tên chủ TK lúc tạo lệnh — đối chiếu với tên ngân hàng trả về ({@code toAccountName}). */
    @Column(name = "bank_account_holder_snapshot", length = 100)
    private String bankAccountHolderSnapshot;

    @Column(name = "payout_sent_at")
    private OffsetDateTime payoutSentAt;

    @Column(name = "payout_settled_at")
    private OffsetDateTime payoutSettledAt;

    /** Number of status look-ups, not send attempts (the order is sent once). */
    @Column(name = "payout_attempt_count", nullable = false)
    private Short payoutAttemptCount = 0;

    @Column(name = "payout_error_code", length = 50)
    private String payoutErrorCode;

    @Column(name = "payout_error_message", length = 500)
    private String payoutErrorMessage;

    /** Payout fee, borne by the platform (DEC-28). Reconciliation only, no ledger row. */
    @Column(name = "provider_fee", nullable = false)
    private Long providerFee = 0L;

    @Column(name = "needs_manual_review", nullable = false)
    private Boolean needsManualReview = false;
}
