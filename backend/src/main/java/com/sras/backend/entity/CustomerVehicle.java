package com.sras.backend.entity;

import com.sras.backend.entity.enums.VehicleType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** A customer's self-declared vehicle ("personal garage", AS-06). */
@Getter
@Setter
@Entity
@Table(name = "customer_vehicles")
public class CustomerVehicle extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 10)
    private VehicleType vehicleType;

    @Column(name = "brand", nullable = false, length = 50)
    private String brand;

    @Column(name = "model", length = 50)
    private String model;

    @Column(name = "license_plate", length = 15)
    private String licensePlate;

    @Column(name = "color", length = 30)
    private String color;

    @Column(name = "year")
    private Short year;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;
}
