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

import java.time.OffsetDateTime;

/** Append-only GPS breadcrumb — recorded only when moved &gt; 20 m (RISK-A08). */
@Getter
@Setter
@Entity
@Table(name = "location_tracks", indexes = @Index(
        name = "idx_location_tracks_request_recorded", columnList = "request_id, recorded_at"))
public class LocationTrack extends AppendOnlyEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private RescueRequest request;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "staff_id", nullable = false)
    private GarageStaff staff;

    @Column(name = "lat", nullable = false)
    private Double lat;

    @Column(name = "lng", nullable = false)
    private Double lng;

    @Column(name = "accuracy_m")
    private Short accuracyM;

    @Column(name = "speed_kmh")
    private Short speedKmh;

    @Column(name = "recorded_at", nullable = false)
    private OffsetDateTime recordedAt;
}
