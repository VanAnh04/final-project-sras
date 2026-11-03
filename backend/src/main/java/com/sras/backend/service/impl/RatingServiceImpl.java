package com.sras.backend.service.impl;

import com.sras.backend.dto.request.CreateRatingRequest;
import com.sras.backend.dto.response.RatingResponse;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.Rating;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.RatingDirection;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.RatingRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.service.NotificationService;
import com.sras.backend.service.RatingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RatingServiceImpl implements RatingService {

    private final RatingRepository ratingRepository;
    private final RescueRequestRepository rescueRequestRepository;
    private final NotificationService notificationService;
    private final GarageRepository garageRepository;

    @Override
    @Transactional
    public RatingResponse createRating(User currentUser, CreateRatingRequest req) {
        RescueRequest rescueRequest = rescueRequestRepository.findById(req.getRequestId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn cứu hộ: " + req.getRequestId()));

        // Kiểm tra xem đơn đã hoàn tất chưa
        RescueStatus st = rescueRequest.getStatus();
        if (st != RescueStatus.COMPLETED && st != RescueStatus.AWAITING_PAYMENT && st != RescueStatus.PAID && st != RescueStatus.RATED) {
            throw new IllegalArgumentException("Chỉ có thể đánh giá khi đơn cứu hộ đã hoàn tất hoặc thanh toán (Trạng thái hiện tại: " + st + ")");
        }

        // Khách hàng đánh giá Garage/Staff
        RatingDirection direction = RatingDirection.CUSTOMER_TO_GARAGE;

        // Kiểm tra quyền: người đánh giá phải là khách tạo đơn
        if (rescueRequest.getCustomer() != null && !rescueRequest.getCustomer().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Chỉ khách hàng tạo đơn mới có quyền gửi đánh giá dịch vụ cho đơn này");
        }

        // Kiểm tra xem đã đánh giá chưa
        Rating rating = ratingRepository.findByRequestIdAndDirection(rescueRequest.getId(), direction)
                .orElseGet(() -> {
                    Rating newRating = new Rating();
                    newRating.setRequest(rescueRequest);
                    newRating.setDirection(direction);
                    newRating.setRaterUser(currentUser);
                    return newRating;
                });

        GarageStaff assignedStaff = rescueRequest.getStaff();
        if (assignedStaff != null) {
            rating.setStaff(assignedStaff);
        }

        rating.setStars(req.getStars());
        rating.setComment(req.getComment());

        if (req.getStaffStars() != null) {
            rating.setStaffStars(req.getStaffStars());
            rating.setStaffComment(req.getStaffComment());
        } else if (assignedStaff != null) {
            // Mặc định sao thợ = sao gara nếu khách không chấm riêng
            rating.setStaffStars(req.getStars());
            rating.setStaffComment(req.getComment());
        }

        Rating saved = ratingRepository.save(rating);

        // Đồng bộ điểm trung bình (avgRating) và số lượt đánh giá (ratingCount) vào bảng garages
        try {
            Garage garage = rescueRequest.getGarage();
            if (garage != null) {
                RatingRepository.RatingAgg agg = ratingRepository.aggregateForGarage(garage.getId());
                if (agg != null && agg.getCnt() != null && agg.getCnt() > 0 && agg.getAvgStars() != null) {
                    garage.setAvgRating(java.math.BigDecimal.valueOf(agg.getAvgStars()).setScale(1, java.math.RoundingMode.HALF_UP));
                    garage.setRatingCount(agg.getCnt().intValue());
                } else {
                    garage.setAvgRating(java.math.BigDecimal.ZERO);
                    garage.setRatingCount(0);
                }
                garageRepository.save(garage);
            }
        } catch (Exception ex) {
            log.warn("Lỗi đồng bộ avgRating cho gara sau khi đánh giá: {}", ex.getMessage());
        }

        // Bắn notification cho Garage Owner
        try {
            Garage garage = rescueRequest.getGarage();
            if (garage != null && garage.getOwner() != null) {
                StringBuilder notifBody = new StringBuilder("Khách hàng đánh giá ");
                notifBody.append(req.getStars()).append(" sao cho Gara");
                if (req.getStaffStars() != null && assignedStaff != null && assignedStaff.getUser() != null) {
                    notifBody.append(" và ").append(req.getStaffStars()).append(" sao cho thợ ")
                            .append(assignedStaff.getUser().getFullName());
                }
                notifBody.append(" (Đơn #").append(rescueRequest.getCode()).append(").");

                if (req.getComment() != null && !req.getComment().isBlank()) {
                    notifBody.append(" Nhận xét Gara: \"").append(req.getComment()).append("\".");
                }
                if (req.getStaffComment() != null && !req.getStaffComment().isBlank()) {
                    notifBody.append(" Nhận xét Thợ: \"").append(req.getStaffComment()).append("\".");
                }

                notificationService.createNotification(
                        garage.getOwner(),
                        NotificationType.GARAGE_REVIEWED,
                        "Khách hàng vừa đánh giá dịch vụ",
                        notifBody.toString(),
                        "RESCUE_REQUEST",
                        rescueRequest.getId()
                );
            }
        } catch (Exception ex) {
            log.warn("Không gửi được notification đánh giá cho gara: {}", ex.getMessage());
        }

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RatingResponse> getGarageRatings(Long garageId, Pageable pageable) {
        return ratingRepository.findByRequestGarageIdOrderByCreatedAtDesc(garageId, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RatingResponse> getGarageRatingsList(Long garageId) {
        return ratingRepository.findByRequestGarageIdOrderByCreatedAtDesc(garageId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public RatingResponse getRequestRating(Long requestId, RatingDirection direction) {
        return ratingRepository.findByRequestIdAndDirection(requestId, direction)
                .map(this::toResponse)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RatingResponse> getStaffRatings(Long staffId) {
        return ratingRepository.findByStaffIdOrderByCreatedAtDesc(staffId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RatingResponse> getStaffRatingsPaged(Long staffId, Pageable pageable) {
        return ratingRepository.findByStaffIdOrderByCreatedAtDesc(staffId, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RatingResponse> getGarageStaffRatings(Long garageId) {
        return ratingRepository.findStaffRatingsByGarageId(garageId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RatingResponse> getAdminRatings(Long garageId, Long staffId, Short stars, String keyword, Pageable pageable) {
        return ratingRepository.findAdminRatings(garageId, staffId, stars, keyword, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public com.sras.backend.dto.response.AdminRatingStatsResponse getAdminRatingStats() {
        var agg = ratingRepository.getAdminRatingStats();
        if (agg == null) {
            return com.sras.backend.dto.response.AdminRatingStatsResponse.builder()
                    .totalRatings(0L)
                    .avgStars(0.0)
                    .fiveStarCount(0L)
                    .fourStarCount(0L)
                    .threeStarCount(0L)
                    .twoStarCount(0L)
                    .oneStarCount(0L)
                    .build();
        }

        double avg = agg.getAvgStars() != null ? Math.round(agg.getAvgStars() * 10.0) / 10.0 : 0.0;
        return com.sras.backend.dto.response.AdminRatingStatsResponse.builder()
                .totalRatings(agg.getTotalRatings() != null ? agg.getTotalRatings() : 0L)
                .avgStars(avg)
                .fiveStarCount(agg.getFiveStarCount() != null ? agg.getFiveStarCount() : 0L)
                .fourStarCount(agg.getFourStarCount() != null ? agg.getFourStarCount() : 0L)
                .threeStarCount(agg.getThreeStarCount() != null ? agg.getThreeStarCount() : 0L)
                .twoStarCount(agg.getTwoStarCount() != null ? agg.getTwoStarCount() : 0L)
                .oneStarCount(agg.getOneStarCount() != null ? agg.getOneStarCount() : 0L)
                .build();
    }

    @Override
    @Transactional
    public void deleteRatingByAdmin(Long id) {
        Rating rating = ratingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá ID: " + id));
        ratingRepository.delete(rating);
        log.info("Admin đã xóa đánh giá ID: {}", id);
    }


    private RatingResponse toResponse(Rating r) {
        RescueRequest req = r.getRequest();
        Garage garage = req != null ? req.getGarage() : null;
        GarageStaff staff = r.getStaff() != null ? r.getStaff() : (req != null ? req.getStaff() : null);
        User rater = r.getRaterUser();

        return RatingResponse.builder()
                .id(r.getId())
                .requestId(req != null ? req.getId() : null)
                .requestCode(req != null ? req.getCode() : null)
                .direction(r.getDirection())
                .raterUserId(rater != null ? rater.getId() : null)
                .raterName(rater != null ? rater.getFullName() : null)
                .raterPhone(rater != null ? rater.getPhone() : null)
                .stars(r.getStars())
                .comment(r.getComment())
                .garageId(garage != null ? garage.getId() : null)
                .garageName(garage != null ? garage.getName() : null)
                .staffId(staff != null ? staff.getId() : null)
                .staffName(staff != null && staff.getUser() != null ? staff.getUser().getFullName() : null)
                .staffCode(staff != null ? staff.getStaffCode() : null)
                .staffStars(r.getStaffStars() != null ? r.getStaffStars() : r.getStars())
                .staffComment(r.getStaffComment())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
