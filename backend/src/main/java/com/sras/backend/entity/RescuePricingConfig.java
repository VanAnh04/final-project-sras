package com.sras.backend.entity;

import com.sras.backend.entity.enums.VehicleType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * System-wide rescue travel pricing configuration managed by Admin.
 * Used to calculate item ① (rescue_fee).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "rescue_pricing_config", indexes = @Index(
        name = "uq_rescue_pricing_vehicle_type", columnList = "vehicle_type", unique = true))
public class RescuePricingConfig extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 10, unique = true)
    private VehicleType vehicleType;

    /** VND per km during daytime (06:00 - 22:00). */
    @Column(name = "fee_per_km_day", nullable = false)
    private Long feePerKmDay;

    /** VND per km during nighttime (22:00 - 06:00). */
    @Column(name = "fee_per_km_night", nullable = false)
    private Long feePerKmNight;

    /** Minimum fee (floor fee) to cover base dispatch cost. */
    @Column(name = "min_fee", nullable = false)
    @Builder.Default
    private Long minFee = 0L;

    /** Initial free km before charging (default 0). */
    @Column(name = "free_km", nullable = false)
    @Builder.Default
    private Long freeKm = 0L;

    /** Nighttime start hour (e.g. 22). */
    @Column(name = "night_start_hour", nullable = false)
    @Builder.Default
    private Short nightStartHour = 22;

    /** Nighttime start minute (e.g. 0). */
    @Column(name = "night_start_minute", nullable = false)
    @Builder.Default
    private Short nightStartMinute = 0;

    /** Nighttime end hour (e.g. 6). */
    @Column(name = "night_end_hour", nullable = false)
    @Builder.Default
    private Short nightEndHour = 6;

    /** Nighttime end minute (e.g. 0). */
    @Column(name = "night_end_minute", nullable = false)
    @Builder.Default
    private Short nightEndMinute = 0;

    /** Bật/tắt phụ phí dịp lễ, tết thủ công do Admin điều khiển. */
    @Column(name = "holiday_surge_enabled", nullable = false)
    @Builder.Default
    private Boolean holidaySurgeEnabled = false;

    /** Holiday surcharge percentage (0-100). */
    @Column(name = "holiday_surcharge_pct", nullable = false)
    @Builder.Default
    private Short holidaySurchargePct = 0;

    /** Optional display note for Garages / Customers. */
    @Column(name = "display_note", length = 255)
    private String displayNote;

    @Column(name = "updated_by_user_id")
    private Long updatedByUserId;
}
