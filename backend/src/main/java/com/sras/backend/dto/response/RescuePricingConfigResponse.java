package com.sras.backend.dto.response;

import com.sras.backend.entity.RescuePricingConfig;
import com.sras.backend.entity.enums.VehicleType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RescuePricingConfigResponse {

    private Long id;
    private VehicleType vehicleType;
    private Long feePerKmDay;
    private Long feePerKmNight;
    private Long minFee;
    private Long freeKm;
    private Short nightStartHour;
    private Short nightStartMinute;
    private Short nightEndHour;
    private Short nightEndMinute;
    private Short holidaySurchargePct;
    private Boolean holidaySurgeEnabled;
    private String displayNote;

    // Tier 1
    private Double baseKm;
    private Long baseFareDay;
    private Long baseFareNight;

    // Tier 2
    private Double kmTier2Limit;
    private Long feePerKmTier2Day;
    private Long feePerKmTier2Night;

    // Tier 3
    private Long feePerKmTier3Day;
    private Long feePerKmTier3Night;

    private Long updatedByUserId;
    private OffsetDateTime updatedAt;

    public static RescuePricingConfigResponse fromEntity(RescuePricingConfig entity) {
        if (entity == null) return null;
        return RescuePricingConfigResponse.builder()
                .id(entity.getId())
                .vehicleType(entity.getVehicleType())
                .feePerKmDay(entity.getFeePerKmDay())
                .feePerKmNight(entity.getFeePerKmNight())
                .minFee(entity.getMinFee())
                .freeKm(entity.getFreeKm())
                .nightStartHour(entity.getNightStartHour())
                .nightStartMinute(entity.getNightStartMinute() != null ? entity.getNightStartMinute() : 0)
                .nightEndHour(entity.getNightEndHour())
                .nightEndMinute(entity.getNightEndMinute() != null ? entity.getNightEndMinute() : 0)
                .holidaySurchargePct(entity.getHolidaySurchargePct())
                .holidaySurgeEnabled(entity.getHolidaySurgeEnabled())
                .displayNote(entity.getDisplayNote())
                .baseKm(entity.getBaseKm() != null ? entity.getBaseKm() : 2.0)
                .baseFareDay(entity.getBaseFareDay() != null ? entity.getBaseFareDay() : (entity.getMinFee() != null ? entity.getMinFee() : 30000L))
                .baseFareNight(entity.getBaseFareNight() != null ? entity.getBaseFareNight() : (entity.getMinFee() != null ? (long)(entity.getMinFee() * 1.3) : 40000L))
                .kmTier2Limit(entity.getKmTier2Limit() != null ? entity.getKmTier2Limit() : 10.0)
                .feePerKmTier2Day(entity.getFeePerKmTier2Day() != null ? entity.getFeePerKmTier2Day() : (entity.getFeePerKmDay() != null ? entity.getFeePerKmDay() : 10000L))
                .feePerKmTier2Night(entity.getFeePerKmTier2Night() != null ? entity.getFeePerKmTier2Night() : (entity.getFeePerKmNight() != null ? entity.getFeePerKmNight() : 13000L))
                .feePerKmTier3Day(entity.getFeePerKmTier3Day() != null ? entity.getFeePerKmTier3Day() : 7000L)
                .feePerKmTier3Night(entity.getFeePerKmTier3Night() != null ? entity.getFeePerKmTier3Night() : 9000L)
                .updatedByUserId(entity.getUpdatedByUserId())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
