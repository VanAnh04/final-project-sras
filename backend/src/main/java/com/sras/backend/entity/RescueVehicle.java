package com.sras.backend.entity;

import com.sras.backend.entity.enums.Capability;
import com.sras.backend.entity.enums.RescueVehicleKind;
import com.sras.backend.entity.enums.WorkStatus;
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

/** A rescue vehicle owned by a garage. */
@Getter
@Setter
@Entity
@Table(name = "rescue_vehicles")
public class RescueVehicle extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @Column(name = "license_plate", nullable = false, length = 15)
    private String licensePlate;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_kind", nullable = false, length = 20)
    private RescueVehicleKind vehicleKind;

    @Enumerated(EnumType.STRING)
    @Column(name = "capability", nullable = false, length = 10)
    private Capability capability;

    @Column(name = "registration_url", length = 500)
    private String registrationUrl;

    /** Ảnh xe cứu hộ (URL đã upload). Nullable để không phá dữ liệu cũ khi ddl-auto=update. */
    @Column(name = "image_url", length = 500)
    private String imageUrl;

    /** {@code FREE}/{@code BUSY} — set automatically per order (G-10). */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private WorkStatus status = WorkStatus.FREE;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
