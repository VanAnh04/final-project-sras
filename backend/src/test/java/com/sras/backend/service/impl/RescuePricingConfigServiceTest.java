package com.sras.backend.service.impl;

import com.sras.backend.entity.RescuePricingConfig;
import com.sras.backend.entity.enums.VehicleType;
import com.sras.backend.repository.RescuePricingConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RescuePricingConfigServiceTest {

    @Mock
    private RescuePricingConfigRepository pricingConfigRepository;

    @InjectMocks
    private RescuePricingConfigServiceImpl pricingService;

    private RescuePricingConfig motorbikeConfig;

    @BeforeEach
    void setUp() {
        motorbikeConfig = RescuePricingConfig.builder()
                .vehicleType(VehicleType.MOTORBIKE)
                .baseKm(2.0)
                .baseFareDay(30000L)
                .baseFareNight(40000L)
                .kmTier2Limit(10.0)
                .feePerKmTier2Day(10000L)
                .feePerKmTier2Night(13000L)
                .feePerKmTier3Day(7000L)
                .feePerKmTier3Night(9000L)
                .nightStartHour((short) 22)
                .nightStartMinute((short) 0)
                .nightEndHour((short) 6)
                .nightEndMinute((short) 0)
                .holidaySurgeEnabled(false)
                .holidaySurchargePct((short) 0)
                .build();
    }

    @Test
    @DisplayName("Cự ly <= 2km (Bậc 1 mở cửa ban ngày): luôn là 30.000đ")
    void testTier1_Daytime() {
        when(pricingConfigRepository.findByVehicleTypeAndIsDeletedFalse(VehicleType.MOTORBIKE))
                .thenReturn(Optional.of(motorbikeConfig));

        OffsetDateTime noon = OffsetDateTime.of(2026, 10, 25, 12, 0, 0, 0, ZoneOffset.ofHours(7));
        long fee1km = pricingService.calculateRescueFee(VehicleType.MOTORBIKE, 1.0, noon);
        long fee2km = pricingService.calculateRescueFee(VehicleType.MOTORBIKE, 2.0, noon);

        assertEquals(30000L, fee1km);
        assertEquals(30000L, fee2km);
    }

    @Test
    @DisplayName("Cự ly 5km (Bậc 2 ban ngày): 30k + 3km * 10k = 60.000đ")
    void testTier2_Daytime() {
        when(pricingConfigRepository.findByVehicleTypeAndIsDeletedFalse(VehicleType.MOTORBIKE))
                .thenReturn(Optional.of(motorbikeConfig));

        OffsetDateTime noon = OffsetDateTime.of(2026, 10, 25, 12, 0, 0, 0, ZoneOffset.ofHours(7));
        long fee5km = pricingService.calculateRescueFee(VehicleType.MOTORBIKE, 5.0, noon);

        assertEquals(60000L, fee5km);
    }

    @Test
    @DisplayName("Cự ly 15km (Bậc 3 ban ngày): 30k + 8km * 10k + 5km * 7k = 145.000đ")
    void testTier3_Daytime() {
        when(pricingConfigRepository.findByVehicleTypeAndIsDeletedFalse(VehicleType.MOTORBIKE))
                .thenReturn(Optional.of(motorbikeConfig));

        OffsetDateTime noon = OffsetDateTime.of(2026, 10, 25, 12, 0, 0, 0, ZoneOffset.ofHours(7));
        long fee15km = pricingService.calculateRescueFee(VehicleType.MOTORBIKE, 15.0, noon);

        assertEquals(145000L, fee15km);
    }

    @Test
    @DisplayName("Cự ly 15km ban đêm: 40k + 8km * 13k + 5km * 9k = 40k + 104k + 45k = 189.000đ")
    void testTier3_Nighttime() {
        when(pricingConfigRepository.findByVehicleTypeAndIsDeletedFalse(VehicleType.MOTORBIKE))
                .thenReturn(Optional.of(motorbikeConfig));

        OffsetDateTime midnight = OffsetDateTime.of(2026, 10, 25, 23, 30, 0, 0, ZoneOffset.ofHours(7));
        long feeNight = pricingService.calculateRescueFee(VehicleType.MOTORBIKE, 15.0, midnight);

        assertEquals(189000L, feeNight);
    }
}
