package com.sras.backend.service;

import com.sras.backend.dto.request.GarageRegistrationRequest;
import com.sras.backend.dto.request.GarageReviewRequest;
import com.sras.backend.dto.request.GarageServicePriceRequest;
import com.sras.backend.dto.response.GarageDashboardResponse;
import com.sras.backend.dto.response.GaragePublicProfileResponse;
import com.sras.backend.dto.response.GarageResponse;
import com.sras.backend.dto.response.GarageServicePriceResponse;
import com.sras.backend.dto.response.NearbyGarageResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.VehicleType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface GarageService {
    GarageResponse registerGarage(User user, GarageRegistrationRequest request);
    Page<GarageResponse> getGarages(GarageStatus status, String keyword, Pageable pageable);
    GarageResponse getGarageById(Long id);
    GarageResponse reviewGarage(Long id, GarageReviewRequest request);
    GarageResponse getMyGarage(User user);
    GarageResponse updateOnlineStatus(User user, Boolean isOnline);
    GarageResponse updateAutoAccept(User user, Boolean autoAccept);
    GarageDashboardResponse getDashboard(User user);
    List<GarageServicePriceResponse> getGarageServices(User user);
    List<GarageServicePriceResponse> getGarageServicesByGarageId(Long garageId);
    GarageServicePriceResponse updateGarageServicePrice(User user, Long serviceId, GarageServicePriceRequest request);
    GarageServicePriceResponse toggleGarageService(User user, Long serviceId, Boolean isActive);
    List<NearbyGarageResponse> getNearbyGarages(Double lat, Double lng, VehicleType vehicleType, Double radiusKm);
    GaragePublicProfileResponse getGaragePublicProfile(Long id, Double lat, Double lng, VehicleType vehicleType);
}
