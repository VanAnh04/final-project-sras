package com.sras.backend.service.impl;

import com.sras.backend.dto.request.RescuePricingConfigRequest;
import com.sras.backend.dto.response.RescuePricingConfigResponse;
import com.sras.backend.entity.RescuePricingConfig;
import com.sras.backend.entity.enums.VehicleType;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.RescuePricingConfigRepository;
import com.sras.backend.service.RescuePricingConfigService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RescuePricingConfigServiceImpl implements RescuePricingConfigService {

    private final RescuePricingConfigRepository pricingConfigRepository;

    @PostConstruct
    public void initDefaults() {
        try {
            ensureDefault(VehicleType.MOTORBIKE, 15_000L, 20_000L, 30_000L, 0L, (short) 22, (short) 0, (short) 6, (short) 0, (short) 0, "Biểu phí tiêu chuẩn xe máy");
            ensureDefault(VehicleType.CAR, 25_000L, 35_000L, 50_000L, 0L, (short) 22, (short) 0, (short) 6, (short) 0, (short) 0, "Biểu phí tiêu chuẩn ô tô");
        } catch (Exception e) {
            log.warn("Could not seed default rescue pricing config (schema might be updating): {}", e.getMessage());
        }
    }

    private void ensureDefault(VehicleType type, long dayRate, long nightRate, long minFee, long freeKm,
                               short nightStart, short nightStartMin, short nightEnd, short nightEndMin, short holidayPct, String note) {
        if (pricingConfigRepository.findByVehicleTypeAndIsDeletedFalse(type).isEmpty()) {
            RescuePricingConfig config = RescuePricingConfig.builder()
                    .vehicleType(type)
                    .feePerKmDay(dayRate)
                    .feePerKmNight(nightRate)
                    .minFee(minFee)
                    .freeKm(freeKm)
                    .nightStartHour(nightStart)
                    .nightStartMinute(nightStartMin)
                    .nightEndHour(nightEnd)
                    .nightEndMinute(nightEndMin)
                    .holidaySurgeEnabled(false)
                    .holidaySurchargePct(holidayPct)
                    .displayNote(note)
                    .build();
            pricingConfigRepository.save(config);
            log.info("Initialized default rescue pricing config for {}", type);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<RescuePricingConfigResponse> getAllConfigs() {
        List<RescuePricingConfigResponse> list = new ArrayList<>();
        for (VehicleType type : VehicleType.values()) {
            list.add(getConfig(type));
        }
        return list;
    }

    @Override
    @Transactional(readOnly = true)
    public RescuePricingConfigResponse getConfig(VehicleType vehicleType) {
        RescuePricingConfig config = pricingConfigRepository.findByVehicleTypeAndIsDeletedFalse(vehicleType)
                .orElseGet(() -> buildFallback(vehicleType));
        return RescuePricingConfigResponse.fromEntity(config);
    }

    @Override
    @Transactional
    public RescuePricingConfigResponse updateConfig(VehicleType vehicleType, RescuePricingConfigRequest request, Long updatedByUserId) {
        RescuePricingConfig config = pricingConfigRepository.findByVehicleTypeAndIsDeletedFalse(vehicleType)
                .orElseGet(() -> {
                    RescuePricingConfig newCfg = new RescuePricingConfig();
                    newCfg.setVehicleType(vehicleType);
                    return newCfg;
                });

        config.setFeePerKmDay(request.getFeePerKmDay());
        config.setFeePerKmNight(request.getFeePerKmNight());
        config.setMinFee(request.getMinFee());
        config.setFreeKm(request.getFreeKm());
        config.setNightStartHour(request.getNightStartHour());
        config.setNightStartMinute(request.getNightStartMinute() != null ? request.getNightStartMinute() : (short) 0);
        config.setNightEndHour(request.getNightEndHour());
        config.setNightEndMinute(request.getNightEndMinute() != null ? request.getNightEndMinute() : (short) 0);
        config.setHolidaySurgeEnabled(Boolean.TRUE.equals(request.getHolidaySurgeEnabled()));
        config.setHolidaySurchargePct(request.getHolidaySurchargePct());
        config.setDisplayNote(request.getDisplayNote());
        config.setUpdatedByUserId(updatedByUserId);

        RescuePricingConfig saved = pricingConfigRepository.save(config);
        log.info("Updated rescue pricing config for {} by user {}", vehicleType, updatedByUserId);
        return RescuePricingConfigResponse.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public long calculateRescueFee(VehicleType vehicleType, double distanceKm, OffsetDateTime requestTime) {
        RescuePricingConfig config = pricingConfigRepository.findByVehicleTypeAndIsDeletedFalse(
                vehicleType != null ? vehicleType : VehicleType.MOTORBIKE
        ).orElseGet(() -> buildFallback(vehicleType));

        OffsetDateTime time = requestTime != null ? requestTime : OffsetDateTime.now();
        int hour = time.getHour();
        int minute = time.getMinute();
        int currentTotalMin = hour * 60 + minute;

        short startHour = config.getNightStartHour() != null ? config.getNightStartHour() : 22;
        short startMin = config.getNightStartMinute() != null ? config.getNightStartMinute() : 0;
        int startTotalMin = startHour * 60 + startMin;

        short endHour = config.getNightEndHour() != null ? config.getNightEndHour() : 6;
        short endMin = config.getNightEndMinute() != null ? config.getNightEndMinute() : 0;
        int endTotalMin = endHour * 60 + endMin;

        boolean isNight;
        if (startTotalMin > endTotalMin) {
            isNight = (currentTotalMin >= startTotalMin || currentTotalMin < endTotalMin);
        } else {
            isNight = (currentTotalMin >= startTotalMin && currentTotalMin < endTotalMin);
        }

        long ratePerKm = isNight ? config.getFeePerKmNight() : config.getFeePerKmDay();
        double chargeableKm = Math.max(0.0, distanceKm - config.getFreeKm());
        double calculated = chargeableKm * ratePerKm;

        // Chỉ cộng phụ phí Lễ khi công tắc được bật và tỉ lệ > 0
        if (Boolean.TRUE.equals(config.getHolidaySurgeEnabled())
                && config.getHolidaySurchargePct() != null && config.getHolidaySurchargePct() > 0) {
            calculated = calculated * (1.0 + (config.getHolidaySurchargePct() / 100.0));
        }

        long minFee = config.getMinFee() != null ? config.getMinFee() : 0L;
        long finalFee = Math.max(minFee, Math.round(calculated));

        // Làm tròn tới hàng nghìn VNĐ
        return Math.round(finalFee / 1000.0) * 1000L;
    }

    private RescuePricingConfig buildFallback(VehicleType type) {
        boolean isCar = type == VehicleType.CAR;
        return RescuePricingConfig.builder()
                .vehicleType(type != null ? type : VehicleType.MOTORBIKE)
                .feePerKmDay(isCar ? 25_000L : 15_000L)
                .feePerKmNight(isCar ? 35_000L : 20_000L)
                .minFee(isCar ? 50_000L : 30_000L)
                .freeKm(0L)
                .nightStartHour((short) 22)
                .nightStartMinute((short) 0)
                .nightEndHour((short) 6)
                .nightEndMinute((short) 0)
                .holidaySurgeEnabled(false)
                .holidaySurchargePct((short) 0)
                .displayNote("Cấu hình mặc định")
                .build();
    }
}
