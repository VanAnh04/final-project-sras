package com.sras.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/** Route polylines rolled up when the order closes (D-5). 1–1 with a rescue request. */
@Getter
@Setter
@Entity
@Table(name = "route_snapshots")
public class RouteSnapshot extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false, unique = true)
    private RescueRequest request;

    @Column(name = "suggested_polyline", columnDefinition = "text")
    private String suggestedPolyline;

    @Column(name = "actual_polyline", columnDefinition = "text")
    private String actualPolyline;

    @Column(name = "static_map_url", length = 500)
    private String staticMapUrl;

    @Column(name = "total_distance_km", precision = 6, scale = 2)
    private BigDecimal totalDistanceKm;

    @Column(name = "duration_minutes")
    private Short durationMinutes;
}
