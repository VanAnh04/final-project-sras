package com.sras.backend.service;

import com.sras.backend.dto.request.GarageRegistrationRequest;
import com.sras.backend.dto.request.GarageReviewRequest;
import com.sras.backend.dto.response.GarageDashboardResponse;
import com.sras.backend.dto.response.GarageResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.GarageStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface GarageService {
    GarageResponse registerGarage(User user, GarageRegistrationRequest request);
    Page<GarageResponse> getGarages(GarageStatus status, String keyword, Pageable pageable);
    GarageResponse getGarageById(Long id);
    GarageResponse reviewGarage(Long id, GarageReviewRequest request);
    GarageResponse getMyGarage(User user);
    GarageResponse updateOnlineStatus(User user, Boolean isOnline);
    GarageResponse updateAutoAccept(User user, Boolean autoAccept);
    GarageDashboardResponse getDashboard(User user);
}
