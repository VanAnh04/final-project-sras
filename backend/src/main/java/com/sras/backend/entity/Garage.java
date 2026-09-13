package com.sras.backend.entity;

import com.sras.backend.entity.enums.Capability;
import com.sras.backend.entity.enums.GarageStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * A garage. Both wallets ({@code credit_balance}/{@code cash_balance}) live directly here (ADR-18).
 */
@Getter
@Setter
@Entity
@Table(name = "garages", indexes = {
        @Index(name = "idx_garages_status_online_capability", columnList = "status, is_online, capability"),
        @Index(name = "idx_garages_lat_lng", columnList = "lat, lng")
})
public class Garage extends BaseEntity {

    /** 1–1: each owner has exactly one garage. */
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_user_id", nullable = false, unique = true)
    private User owner;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "phone", nullable = false, length = 15)
    private String phone;

    @Column(name = "address", nullable = false, length = 255)
    private String address;

    @Column(name = "lat", nullable = false)
    private Double lat;

    @Column(name = "lng", nullable = false)
    private Double lng;

    @Enumerated(EnumType.STRING)
    @Column(name = "capability", nullable = false, length = 10)
    private Capability capability;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private GarageStatus status = GarageStatus.PENDING;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "is_online", nullable = false)
    private Boolean isOnline = false;

    /** Credit wallet — topped up by the garage, non-withdrawable. CHECK &gt;= 0 (DEC-25). */
    @Column(name = "credit_balance", nullable = false)
    private Long creditBalance = 0L;

    /** Cash wallet — bank-transfer income net of commission/tax, withdrawable. CHECK &gt;= 0. */
    @Column(name = "cash_balance", nullable = false)
    private Long cashBalance = 0L;

    @Column(name = "bank_code", length = 20)
    private String bankCode;

    @Column(name = "bank_account_number", length = 30)
    private String bankAccountNumber;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_account_holder", length = 100)
    private String bankAccountHolder;

    @Column(name = "avg_rating", nullable = false, precision = 2, scale = 1)
    private BigDecimal avgRating = BigDecimal.ZERO;

    @Column(name = "rating_count", nullable = false)
    private Integer ratingCount = 0;

    @Column(name = "cancel_rate", nullable = false, precision = 4, scale = 3)
    private BigDecimal cancelRate = BigDecimal.ZERO;

    @Column(name = "total_orders", nullable = false)
    private Integer totalOrders = 0;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    /** Optimistic lock (JPA @Version). */
    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;
}
