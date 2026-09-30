package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.WorkStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GarageStaffResponse {
    private Long id;
    private Long userId;
    private String fullName;
    private String phone;
    private String avatarUrl;
    private String staffCode;
    private WorkStatus status;
    private Boolean isActive;
    private Long garageId;
    private String garageName;
    private String garageAddress;
    private String garagePhone;
    private Integer activeJobsCount;
    private Integer todayCompletedJobs;
    private String tempPassword; // Chứa mật khẩu khởi tạo ngẫu nhiên nếu là nhân viên mới tạo
    private OffsetDateTime createdAt;

    /** Điểm trung bình thật (1–5) từ đánh giá của khách; null nếu chưa có lượt nào. */
    private Double rating;
    /** Số lượt đánh giá thật. */
    private Integer ratingCount;
}
