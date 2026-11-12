package com.sras.backend.service.impl;

import com.sras.backend.dto.request.UpdateDispatchConfigRequest;
import com.sras.backend.entity.DispatchConfig;
import com.sras.backend.entity.Garage;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.repository.DispatchConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ExtendWith(MockitoExtension.class)
class DispatchScoringServiceTest {

    @Mock
    private DispatchConfigRepository dispatchConfigRepository;

    @InjectMocks
    private DispatchScoringServiceImpl scoringService;

    private DispatchConfig defaultConfig;
    private Garage garageA;
    private Garage garageB;

    @BeforeEach
    void setUp() {
        defaultConfig = DispatchConfig.builder()
                .weightDistance(40)
                .weightWorkload(30)
                .weightRating(20)
                .weightResponseRate(10)
                .penaltyPerOrder(10)
                .isActive(true)
                .build();

        garageA = new Garage();
        garageA.setId(1L);
        garageA.setName("Gara Điểm Đen (Chân cầu)");

        garageB = new Garage();
        garageB.setId(2L);
        garageB.setName("Gara Lân Cận (Cách 2.2km)");
    }

    @Test
    @DisplayName("Kịch bản điểm đen: Gara lân cận chưa có đơn thắng Gara gần đã nhận 3 đơn")
    void testHotspotGarageVsNearbyGarage_FairnessOvercomesDistance() {
        double searchRadiusKm = 10.0;

        // Gara A: Rất gần (0.8km), Rating cao (4.8★), nhưng ĐÃ NHẬN 3 ĐƠN HÔM NAY
        double scoreA = scoringService.calculateScore(
                garageA,
                0.8,
                searchRadiusKm,
                3,       // 3 đơn hôm nay -> S_workload = 100 - 3*10 = 70
                4.8,
                0.95,
                defaultConfig
        );

        // Gara B: Cách 2.2km, Rating cao (4.9★), CHƯA CÓ ĐƠN NÀO HÔM NAY (0 đơn)
        double scoreB = scoringService.calculateScore(
                garageB,
                2.2,
                searchRadiusKm,
                0,       // 0 đơn hôm nay -> S_workload = 100
                4.9,
                0.95,
                defaultConfig
        );

        System.out.printf("Điểm Gara A (gần, 3 đơn): %.2f | Điểm Gara B (xa hơn, 0 đơn): %.2f%n", scoreA, scoreB);
        assertTrue(scoreB > scoreA, "Gara B chưa có đơn nào trong ngày phải thắng Gara A đã nhận 3 đơn");
    }

    @Test
    @DisplayName("Kịch bản các gara đều chưa có đơn: Gara gần hơn sẽ thắng")
    void testEqualOrders_CloserGarageWins() {
        double searchRadiusKm = 10.0;

        // Cả 2 đều chưa có đơn hôm nay
        double scoreA = scoringService.calculateScore(garageA, 1.0, searchRadiusKm, 0, 4.8, 1.0, defaultConfig);
        double scoreB = scoringService.calculateScore(garageB, 3.0, searchRadiusKm, 0, 4.8, 1.0, defaultConfig);

        assertTrue(scoreA > scoreB, "Khi số đơn bằng nhau, gara gần hơn 1km phải có điểm cao hơn gara 3km");
    }

    @Test
    @DisplayName("Cấu hình trọng số tổng khác 100% phải ném BadRequestException")
    void testValidation_WeightSumMustBe100() {
        UpdateDispatchConfigRequest invalidReq = UpdateDispatchConfigRequest.builder()
                .weightDistance(40)
                .weightWorkload(30)
                .weightRating(20)
                .weightResponseRate(5) // Tổng = 95% != 100%
                .penaltyPerOrder(10)
                .build();

        assertThrows(BadRequestException.class, () -> scoringService.updateConfig(invalidReq, null));
    }
}
