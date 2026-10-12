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
                .updatedByUserId(entity.getUpdatedByUserId())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
