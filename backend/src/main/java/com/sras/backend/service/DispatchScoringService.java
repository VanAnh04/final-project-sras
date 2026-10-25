package com.sras.backend.service;

import com.sras.backend.dto.request.UpdateDispatchConfigRequest;
import com.sras.backend.dto.response.DispatchConfigResponse;
import com.sras.backend.entity.DispatchConfig;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.User;

public interface DispatchScoringService {

    DispatchConfig getActiveConfig();

    DispatchConfigResponse getActiveConfigResponse();

    DispatchConfigResponse updateConfig(UpdateDispatchConfigRequest request, User admin);

    /**
     * Chấm điểm tổng hợp theo mô hình Weighted Sum Model (WSM) đa tiêu chí.
     * Score nằm trong khoảng [0, 100].
     */
    double calculateScore(
            Garage garage,
            double roadDistanceKm,
            double searchRadiusKm,
            long ordersToday,
            Double avgRating,
            Double acceptanceRate,
            DispatchConfig config
    );
}
