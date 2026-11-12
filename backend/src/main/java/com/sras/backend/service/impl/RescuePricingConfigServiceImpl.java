package com.sras.backend.service.impl;

import com.sras.backend.dto.request.RescuePricingConfigRequest;
import com.sras.backend.dto.response.RescuePricingConfigResponse;
import com.sras.backend.entity.RescuePricingConfig;
import com.sras.backend.entity.enums.VehicleType;
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
            ensureDefault(
                    VehicleType.MOTORBIKE,
                    2.0, 30_000L, 40_000L,
                    10.0, 10_000L, 13_000L,
                    7_000L, 9_000L,
                    (short) 22, (short) 0, (short) 6, (short) 0, (short) 0,
                    "Biểu phí tiêu chuẩn cứu hộ xe máy theo bậc cước"
            );
            ensureDefault(
                    VehicleType.CAR,
                    2.0, 60_000L, 80_000L,
                    10.0, 20_000L, 25_000L,
                    15_000L, 18_000L,
                    (short) 22, (short) 0, (short) 6, (short) 0, (short) 0,
                    "Biểu phí tiêu chuẩn cứu hộ ô tô theo bậc cước"
            );
        } catch (Exception e) {
            log.warn("Could not seed default rescue pricing config: {}", e.getMessage());
        }
    }

    private void ensureDefault(VehicleType type,
                               double baseKm, long baseFareDay, long baseFareNight,
                               double tier2Km, long tier2Day, long tier2Night,
                               long tier3Day, long tier3Night,
                               short nightStart, short nightStartMin, short nightEnd, short nightEndMin,
                               short holidayPct, String note) {
        if (pricingConfigRepository.findByVehicleTypeAndIsDeletedFalse(type).isEmpty()) {
            RescuePricingConfig config = RescuePricingConfig.builder()
                    .vehicleType(type)
                    .baseKm(baseKm)
                    .baseFareDay(baseFareDay)
                    .baseFareNight(baseFareNight)
                    .kmTier2Limit(tier2Km)
                    .feePerKmTier2Day(tier2Day)
                    .feePerKmTier2Night(tier2Night)
                    .feePerKmTier3Day(tier3Day)
                    .feePerKmTier3Night(tier3Night)
                    .feePerKmDay(tier2Day)
                    .feePerKmNight(tier2Night)
                    .minFee(baseFareDay)
                    .freeKm(0L)
                    .nightStartHour(nightStart)
                    .nightStartMinute(nightStartMin)
                    .nightEndHour(nightEnd)
                    .nightEndMinute(nightEndMin)
                    .holidaySurgeEnabled(false)
                    .holidaySurchargePct(holidayPct)
                    .displayNote(note)
                    .build();
            pricingConfigRepository.save(config);
            log.info("Initialized default rescue pricing config with tiered fare for {}", type);
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

        // Bậc 1: Cước mở cửa
        config.setBaseKm(request.getBaseKm() != null ? request.getBaseKm() : 2.0);
        long baseFareDay = request.getBaseFareDay() != null ? request.getBaseFareDay() : (request.getMinFee() != null ? request.getMinFee() : 30000L);
        long baseFareNight = request.getBaseFareNight() != null ? request.getBaseFareNight() : (long)(baseFareDay * 1.3);
        config.setBaseFareDay(baseFareDay);
        config.setBaseFareNight(baseFareNight);

        // Bậc 2: Cự ly chuẩn
        config.setKmTier2Limit(request.getKmTier2Limit() != null ? request.getKmTier2Limit() : 10.0);
        long tier2Day = request.getFeePerKmTier2Day() != null ? request.getFeePerKmTier2Day() : (request.getFeePerKmDay() != null ? request.getFeePerKmDay() : 10000L);
        long tier2Night = request.getFeePerKmTier2Night() != null ? request.getFeePerKmTier2Night() : (request.getFeePerKmNight() != null ? request.getFeePerKmNight() : 13000L);
        config.setFeePerKmTier2Day(tier2Day);
        config.setFeePerKmTier2Night(tier2Night);

        // Bậc 3: Cự ly xa
        long tier3Day = request.getFeePerKmTier3Day() != null ? request.getFeePerKmTier3Day() : Math.round(tier2Day * 0.7);
        long tier3Night = request.getFeePerKmTier3Night() != null ? request.getFeePerKmTier3Night() : Math.round(tier2Night * 0.7);
        config.setFeePerKmTier3Day(tier3Day);
        config.setFeePerKmTier3Night(tier3Night);

        // Đồng bộ các trường cũ để tương thích
        config.setFeePerKmDay(tier2Day);
        config.setFeePerKmNight(tier2Night);
        config.setMinFee(baseFareDay);
        config.setFreeKm(request.getFreeKm() != null ? request.getFreeKm() : 0L);

        // Giờ đêm & Lễ tết
        config.setNightStartHour(request.getNightStartHour());
        config.setNightStartMinute(request.getNightStartMinute() != null ? request.getNightStartMinute() : (short) 0);
        config.setNightEndHour(request.getNightEndHour());
        config.setNightEndMinute(request.getNightEndMinute() != null ? request.getNightEndMinute() : (short) 0);
        config.setHolidaySurgeEnabled(Boolean.TRUE.equals(request.getHolidaySurgeEnabled()));
        config.setHolidaySurchargePct(request.getHolidaySurchargePct() != null ? request.getHolidaySurchargePct() : (short) 0);
        config.setDisplayNote(request.getDisplayNote());
        if (request.getCancelCompensationRate() != null) {
            config.setCancelCompensationRate(request.getCancelCompensationRate());
        }
        if (request.getMinCancelCompensation() != null) {
            config.setMinCancelCompensation(request.getMinCancelCompensation());
        }
        config.setUpdatedByUserId(updatedByUserId);

        RescuePricingConfig saved = pricingConfigRepository.save(config);
        log.info("Updated tiered rescue pricing config for {} by user {}", vehicleType, updatedByUserId);
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

        // Bậc 1: Cước mở cửa
        double baseKm = config.getBaseKm() != null ? config.getBaseKm() : 2.0;
        long baseFare = isNight
                ? (config.getBaseFareNight() != null ? config.getBaseFareNight() : (config.getBaseFareDay() != null ? (long)(config.getBaseFareDay() * 1.3) : 40_000L))
                : (config.getBaseFareDay() != null ? config.getBaseFareDay() : (config.getMinFee() != null ? config.getMinFee() : 30_000L));

        // Bậc 2: Cự ly chuẩn
        double tier2Limit = config.getKmTier2Limit() != null ? config.getKmTier2Limit() : 10.0;
        long rateTier2 = isNight
                ? (config.getFeePerKmTier2Night() != null ? config.getFeePerKmTier2Night() : (config.getFeePerKmNight() != null ? config.getFeePerKmNight() : 13_000L))
                : (config.getFeePerKmTier2Day() != null ? config.getFeePerKmTier2Day() : (config.getFeePerKmDay() != null ? config.getFeePerKmDay() : 10_000L));

        // Bậc 3: Cự ly xa
        long rateTier3 = isNight
                ? (config.getFeePerKmTier3Night() != null ? config.getFeePerKmTier3Night() : 9_000L)
                : (config.getFeePerKmTier3Day() != null ? config.getFeePerKmTier3Day() : 7_000L);

        // Tính cước theo bậc cộng dồn
        double calculated;
        if (distanceKm <= baseKm) {
            calculated = baseFare;
        } else if (distanceKm <= tier2Limit) {
            calculated = baseFare + (distanceKm - baseKm) * rateTier2;
        } else {
            double tier2Dist = Math.max(0.0, tier2Limit - baseKm);
            double tier3Dist = distanceKm - tier2Limit;
            calculated = baseFare + (tier2Dist * rateTier2) + (tier3Dist * rateTier3);
        }

        // Áp dụng phụ phí Lễ khi bật
        if (Boolean.TRUE.equals(config.getHolidaySurgeEnabled())
                && config.getHolidaySurchargePct() != null && config.getHolidaySurchargePct() > 0) {
            calculated = calculated * (1.0 + (config.getHolidaySurchargePct() / 100.0));
        }

        long finalFee = Math.max(baseFare, Math.round(calculated));

        // Làm tròn tới hàng nghìn VNĐ
        return Math.round(finalFee / 1000.0) * 1000L;
    }

    private RescuePricingConfig buildFallback(VehicleType type) {
        boolean isCar = type == VehicleType.CAR;
        return RescuePricingConfig.builder()
                .vehicleType(type != null ? type : VehicleType.MOTORBIKE)
                .baseKm(2.0)
                .baseFareDay(isCar ? 60_000L : 30_000L)
                .baseFareNight(isCar ? 80_000L : 40_000L)
                .kmTier2Limit(10.0)
                .feePerKmTier2Day(isCar ? 20_000L : 10_000L)
                .feePerKmTier2Night(isCar ? 25_000L : 13_000L)
                .feePerKmTier3Day(isCar ? 15_000L : 7_000L)
                .feePerKmTier3Night(isCar ? 18_000L : 9_000L)
                .feePerKmDay(isCar ? 20_000L : 10_000L)
                .feePerKmNight(isCar ? 25_000L : 13_000L)
                .minFee(isCar ? 60_000L : 30_000L)
                .freeKm(0L)
                .nightStartHour((short) 22)
                .nightStartMinute((short) 0)
                .nightEndHour((short) 6)
                .nightEndMinute((short) 0)
                .holidaySurgeEnabled(false)
                .holidaySurchargePct((short) 0)
                .displayNote("Cấu hình mặc định bậc cước")
                .build();
    }
}
