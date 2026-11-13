package com.sras.backend.service;

import com.sras.backend.dto.response.AdminRatingStatsResponse;
import com.sras.backend.dto.request.CreateRatingRequest;
import com.sras.backend.dto.response.RatingResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.RatingDirection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface RatingService {

    RatingResponse createRating(User currentUser, CreateRatingRequest request);

    Page<RatingResponse> getGarageRatings(Long garageId, Pageable pageable);

    List<RatingResponse> getGarageRatingsList(Long garageId);

    RatingResponse getRequestRating(Long requestId, RatingDirection direction);

    List<RatingResponse> getStaffRatings(Long staffId);

    Page<RatingResponse> getStaffRatingsPaged(Long staffId, Pageable pageable);

    List<RatingResponse> getGarageStaffRatings(Long garageId);

    Page<RatingResponse> getAdminRatings(Long garageId, Long staffId, Short stars, String keyword, Pageable pageable);

    AdminRatingStatsResponse getAdminRatingStats();

    void deleteRatingByAdmin(Long id);
}

