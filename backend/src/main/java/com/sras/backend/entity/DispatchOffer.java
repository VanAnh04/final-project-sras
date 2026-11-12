package com.sras.backend.entity;

import com.sras.backend.entity.enums.OfferStatus;
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

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * One dispatch offer per garage per request (D-2).
 * {@code idx_dispatch_offers_expires_status} is the hottest index in the system (5s sweep job).
 */
@Getter
@Setter
@Entity
@Table(name = "dispatch_offers", indexes = {
        @Index(name = "idx_dispatch_offers_expires_status", columnList = "expires_at, status"),
        @Index(name = "uq_dispatch_offer", columnList = "request_id, garage_id", unique = true)
})
public class DispatchOffer extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private RescueRequest request;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    /** Invitation order; the garage the customer chose = 1. */
    @Column(name = "rank", nullable = false)
    private Short rank;

    @Column(name = "distance_km", nullable = false, precision = 6, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "eta_minutes")
    private Short etaMinutes;

    @Column(name = "quoted_fee", nullable = false)
    private Long quotedFee;

    @Column(name = "quoted_towing_fee", nullable = false)
    private Long quotedTowingFee = 0L;

    /** Estimated commission + tax on (① + ②); kept for dispute reconciliation. */
    @Column(name = "estimated_obligation", nullable = false)
    private Long estimatedObligation = 0L;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 15)
    private OfferStatus status = OfferStatus.PENDING;

    @Column(name = "sent_at")
    private OffsetDateTime sentAt;

    /** sent_at + 60 seconds (DEC-16). */
    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "responded_at")
    private OffsetDateTime respondedAt;

    @Column(name = "reject_reason", length = 255)
    private String rejectReason;

    /** Score computed by DispatchScoringService when offer was sent. */
    @Column(name = "dispatch_score")
    private Double dispatchScore;
}
