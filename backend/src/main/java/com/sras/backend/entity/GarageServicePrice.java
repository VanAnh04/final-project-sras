package com.sras.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** A garage's own price (item ③) for a service, constrained to the admin min–max band (DEC-04). */
@Getter
@Setter
@Entity
@Table(name = "garage_service_prices", indexes = @Index(
        name = "uq_garage_service", columnList = "garage_id, service_id", unique = true))
public class GarageServicePrice extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private Service service;

    /** VND; must fall inside [min_price, max_price], validated in the service layer. */
    @Column(name = "price", nullable = false)
    private Long price;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = false;

    @Column(name = "distance_tiers_json", columnDefinition = "TEXT")
    private String distanceTiersJson;

    @Column(name = "night_surge_enabled")
    private Boolean nightSurgeEnabled = false;

    @Column(name = "night_surge_percent")
    private Integer nightSurgePercent = 0;

    @Column(name = "holiday_surge_enabled")
    private Boolean holidaySurgeEnabled = false;

    @Column(name = "holiday_surge_percent")
    private Integer holidaySurgePercent = 0;
}
