package com.sras.backend.service.impl;

import com.sras.backend.dto.request.UpdateDispatchConfigRequest;
import com.sras.backend.dto.response.DispatchConfigResponse;
import com.sras.backend.entity.DispatchConfig;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.User;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.repository.DispatchConfigRepository;
import com.sras.backend.service.DispatchScoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
@Slf4j
public class DispatchScoringServiceImpl implements DispatchScoringService {

    private final DispatchConfigRepository dispatchConfigRepository;

    @Override
    @Transactional(readOnly = true)
    public DispatchConfig getActiveConfig() {
        return dispatchConfigRepository.findFirstByIsActiveTrueAndIsDeletedFalseOrderByIdDesc()
                .orElseGet(this::buildAndSaveDefaultConfig);
    }

    @Override
    @Transactional(readOnly = true)
    public DispatchConfigResponse getActiveConfigResponse() {
        return DispatchConfigResponse.fromEntity(getActiveConfig());
    }

    @Override
    @Transactional
    public DispatchConfigResponse updateConfig(UpdateDispatchConfigRequest req, User admin) {
        int sum = req.getWeightDistance() + req.getWeightWorkload() + req.getWeightRating() + req.getWeightResponseRate();
        if (sum != 100) {
            throw new BadRequestException("Tổng các trọng số phải bằng đúng 100% (Hiện tại là " + sum + "%)");
        }

        DispatchConfig config = dispatchConfigRepository.findFirstByIsActiveTrueAndIsDeletedFalseOrderByIdDesc()
                .orElseGet(this::buildDefaultConfig);

        config.setWeightDistance(req.getWeightDistance());
        config.setWeightWorkload(req.getWeightWorkload());
        config.setWeightRating(req.getWeightRating());
        config.setWeightResponseRate(req.getWeightResponseRate());
        config.setPenaltyPerOrder(req.getPenaltyPerOrder());
        config.setIsActive(true);
        if (admin != null) {
            config.setUpdatedByUserId(admin.getId());
        }

        DispatchConfig saved = dispatchConfigRepository.save(config);
        log.info("Admin {} updated dispatch scoring weights: dist={}%, workload={}%, rating={}%, resp={}%",
                admin != null ? admin.getId() : "SYSTEM",
                saved.getWeightDistance(), saved.getWeightWorkload(), saved.getWeightRating(), saved.getWeightResponseRate());

        return DispatchConfigResponse.fromEntity(saved);
    }

    @Override
    public double calculateScore(
            Garage garage,
            double roadDistanceKm,
            double searchRadiusKm,
            long ordersToday,
            Double avgRating,
            Double acceptanceRate,
            DispatchConfig config) {

        if (config == null) {
            config = buildDefaultConfig();
        }

        double wDist = (config.getWeightDistance() != null ? config.getWeightDistance() : 40) / 100.0;
        double wWorkload = (config.getWeightWorkload() != null ? config.getWeightWorkload() : 30) / 100.0;
        double wRating = (config.getWeightRating() != null ? config.getWeightRating() : 20) / 100.0;
        double wResponse = (config.getWeightResponseRate() != null ? config.getWeightResponseRate() : 10) / 100.0;
        int penaltyPerOrder = config.getPenaltyPerOrder() != null ? config.getPenaltyPerOrder() : 10;

        // 1. Điểm cự ly S_dist: Chuẩn hóa theo bán kính cứu hộ tối đa toàn hệ thống MAX_RADIUS = 50 km.
        // Mỗi 1 km cách xa hiện trường trừ đúng 2 điểm (100 / 50 = 2đ/km).
        // 1 công thức duy nhất, cố định cho mọi cự ly dù có nới rộng bán kính hay không!
        double maxSystemRadiusKm = 50.0;
        double sDist = Math.max(0.0, 100.0 * (1.0 - (roadDistanceKm / maxSystemRadiusKm)));

        // 2. Điểm công bằng / tải việc S_workload: Trừ điểm theo số đơn nhận hôm nay
        double sWorkload = Math.max(0.0, 100.0 - (ordersToday * penaltyPerOrder));

        // 3. Điểm đánh giá sao S_rating: Quy về thang 100. Gara mới chưa có sao gán mặc định 4.5 sao (90 điểm)
        double stars = (avgRating != null && avgRating > 0.0) ? avgRating : 4.5;
        double sRating = Math.min(100.0, Math.max(0.0, (stars / 5.0) * 100.0));

        // 4. Điểm chuyên cần / phản hồi S_response: Tỷ lệ chấp nhận lời mời (30 ngày gần nhất). Mặc định 100 điểm cho gara mới
        double acceptRate = (acceptanceRate != null && acceptanceRate >= 0.0) ? acceptanceRate : 1.0;
        double sResponse = Math.min(100.0, Math.max(0.0, acceptRate * 100.0));

        // Tổng điểm theo WSM
        double totalScore = (wDist * sDist) + (wWorkload * sWorkload) + (wRating * sRating) + (wResponse * sResponse);
        double finalScore = BigDecimal.valueOf(totalScore).setScale(2, RoundingMode.HALF_UP).doubleValue();

        log.debug("Scored Garage ID:{} ('{}') -> Total:{}/100 [Dist:{}/100 ({}km), Workload:{}/100 ({} orders), Rating:{}/100 ({}★), Resp:{}/100 ({}%)]",
                garage.getId(), garage.getName(), finalScore,
                Math.round(sDist), roadDistanceKm,
                Math.round(sWorkload), ordersToday,
                Math.round(sRating), stars,
                Math.round(sResponse), Math.round(acceptRate * 100));

        return finalScore;
    }

    private DispatchConfig buildDefaultConfig() {
        return DispatchConfig.builder()
                .weightDistance(40)
                .weightWorkload(30)
                .weightRating(20)
                .weightResponseRate(10)
                .penaltyPerOrder(10)
                .isActive(true)
                .build();
    }

    private DispatchConfig buildAndSaveDefaultConfig() {
        try {
            return dispatchConfigRepository.save(buildDefaultConfig());
        } catch (Exception e) {
            log.warn("Could not persist default DispatchConfig (concurrent insert?): {}", e.getMessage());
            return buildDefaultConfig();
        }
    }
}
