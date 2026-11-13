package com.sras.backend.service;

import com.sras.backend.dto.request.RescuePricingConfigRequest;
import com.sras.backend.dto.response.RescuePricingConfigResponse;
import com.sras.backend.entity.enums.VehicleType;

import java.time.OffsetDateTime;
import java.util.List;

public interface RescuePricingConfigService {

    List<RescuePricingConfigResponse> getAllConfigs();

    RescuePricingConfigResponse getConfig(VehicleType vehicleType);

    RescuePricingConfigResponse updateConfig(VehicleType vehicleType, RescuePricingConfigRequest request, Long updatedByUserId);

    long calculateRescueFee(VehicleType vehicleType, double distanceKm, OffsetDateTime requestTime);
}
