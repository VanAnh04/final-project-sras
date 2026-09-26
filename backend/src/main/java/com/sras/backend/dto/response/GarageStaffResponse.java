package com.sras.backend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GarageStaffResponse {
    private Long id;
    private String name;
    private String phone;
    /** Ảnh đại diện của nhân viên (từ User.avatarUrl), có thể null. */
    private String avatarUrl;
    /** FREE / BUSY */
    private String status;
    /** Điểm trung bình thật (1–5) từ đánh giá của khách; null nếu chưa có lượt nào. */
    private Double rating;
    /** Số lượt đánh giá thật. */
    private Integer ratingCount;
}
