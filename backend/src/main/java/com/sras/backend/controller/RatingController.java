package com.sras.backend.controller;

import com.sras.backend.dto.request.CreateRatingRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.RatingResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.RatingDirection;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.RatingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
public class RatingController {

    private final RatingService ratingService;
    private final UserRepository userRepository;

    private User getAuthenticatedUser(String principal) {
        return userRepository.findByPhone(principal)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RatingResponse>> createRating(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody CreateRatingRequest request) {
        User user = getAuthenticatedUser(principal);
        RatingResponse response = ratingService.createRating(user, request);
        return ResponseEntity.ok(ApiResponse.success("Gửi đánh giá thành công", response));
    }

    @GetMapping("/garage/{garageId}")
    public ResponseEntity<ApiResponse<Page<RatingResponse>>> getGarageRatings(
            @PathVariable Long garageId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        Page<RatingResponse> result = ratingService.getGarageRatings(garageId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/garage/{garageId}/all")
    public ResponseEntity<ApiResponse<List<RatingResponse>>> getGarageRatingsList(
            @PathVariable Long garageId) {
        List<RatingResponse> result = ratingService.getGarageRatingsList(garageId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/request/{requestId}")
    public ResponseEntity<ApiResponse<RatingResponse>> getRequestRating(
            @PathVariable Long requestId,
            @RequestParam(value = "direction", defaultValue = "CUSTOMER_TO_GARAGE") RatingDirection direction) {
        RatingResponse response = ratingService.getRequestRating(requestId, direction);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/staff/{staffId}")
    public ResponseEntity<ApiResponse<List<RatingResponse>>> getStaffRatings(
            @PathVariable Long staffId) {
        List<RatingResponse> result = ratingService.getStaffRatings(staffId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/garage/{garageId}/staff-ratings")
    public ResponseEntity<ApiResponse<List<RatingResponse>>> getGarageStaffRatings(
            @PathVariable Long garageId) {
        List<RatingResponse> result = ratingService.getGarageStaffRatings(garageId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/admin")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<RatingResponse>>> getAdminRatings(
            @RequestParam(value = "garageId", required = false) Long garageId,
            @RequestParam(value = "staffId", required = false) Long staffId,
            @RequestParam(value = "stars", required = false) Short stars,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        Page<RatingResponse> result = ratingService.getAdminRatings(
                garageId, staffId, stars, keyword, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/admin/stats")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<com.sras.backend.dto.response.AdminRatingStatsResponse>> getAdminRatingStats() {
        var stats = ratingService.getAdminRatingStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @DeleteMapping("/admin/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteRatingByAdmin(@PathVariable Long id) {
        ratingService.deleteRatingByAdmin(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa đánh giá thành công", null));
    }
}

