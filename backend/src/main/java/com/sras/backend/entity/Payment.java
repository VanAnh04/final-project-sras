package com.sras.backend.entity;

import com.sras.backend.entity.enums.PaymentMethod;
import com.sras.backend.entity.enums.PaymentStatus;
import com.sras.backend.entity.enums.PaymentType;
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
 * Inbound money via payOS — shared by order payment and wallet top-up (ADR-21).
 * Idempotent on {@code provider_order_code}.
 */
@Getter
@Setter
@Entity
@Table(name = "payments", indexes = {
        @Index(name = "uq_payments_provider_order_code", columnList = "provider_order_code", unique = true),
        @Index(name = "uq_payments_provider_txn", columnList = "provider_txn_id", unique = true),
        @Index(name = "idx_payments_status_created", columnList = "status, created_at")
})
public class Payment extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false, length = 20)
    private PaymentType paymentType;

    /** For RESCUE_ORDER. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id")
    private RescueRequest request;

    /** For WALLET_TOPUP. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id")
    private Garage garage;

    /** For STAFF WALLET_TOPUP. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id")
    private GarageStaff staff;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "paid_by_user_id", nullable = false)
    private User paidByUser;

    @Column(name = "amount", nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "method", nullable = false, length = 20)
    private PaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 15)
    private PaymentStatus status = PaymentStatus.PENDING;

    /** Idempotency fence; generated and committed in TX-1 before calling the gateway (D-10). */
    @Column(name = "provider_order_code", nullable = false, unique = true)
    private Long providerOrderCode;

    /** paymentLinkId returned by the gateway. */
    @Column(name = "provider_txn_id", unique = true, length = 100)
    private String providerTxnId;

    @Column(name = "provider_response_code", length = 10)
    private String providerResponseCode;

    /** Full webhook payload for reconciliation. Never logged (contains signature + account). */
    @Column(name = "raw_callback", columnDefinition = "text")
    private String rawCallback;

    /** Admin who confirmed a MANUAL_TRANSFER; null if via webhook. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_by_user_id")
    private User confirmedByUser;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;
}
