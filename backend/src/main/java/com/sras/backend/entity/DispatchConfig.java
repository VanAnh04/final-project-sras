package com.sras.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * System-wide dispatch scoring configuration managed by Admin.
 * Used by DispatchScoringService to balance fairness and arrival speed.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "dispatch_configs")
public class DispatchConfig extends BaseEntity {

    /** Trọng số Khoảng cách (0 - 100). Mặc định 40%. */
    @Column(name = "weight_distance", nullable = false)
    @Builder.Default
    private Integer weightDistance = 40;

    /** Trọng số Tải việc / Công bằng hôm nay (0 - 100). Mặc định 30%. */
    @Column(name = "weight_workload", nullable = false)
    @Builder.Default
    private Integer weightWorkload = 30;

    /** Trọng số Đánh giá sao Rating (0 - 100). Mặc định 20%. */
    @Column(name = "weight_rating", nullable = false)
    @Builder.Default
    private Integer weightRating = 20;

    /** Trọng số Tỷ lệ nhận đơn / Chuyên cần (0 - 100). Mặc định 10%. */
    @Column(name = "weight_response_rate", nullable = false)
    @Builder.Default
    private Integer weightResponseRate = 10;

    /** Mức giảm ưu tiên cho mỗi đơn cứu hộ gara đã nhận trong ngày hôm nay. Mặc định 10 điểm. */
    @Column(name = "penalty_per_order", nullable = false)
    @Builder.Default
    private Integer penaltyPerOrder = 10;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "updated_by_user_id")
    private Long updatedByUserId;
}
