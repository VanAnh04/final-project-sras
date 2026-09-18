package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.GarageStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class GarageReviewRequest {
    @NotNull(message = "Tráng thái phê duyệt không được để trống")
    private GarageStatus status;

    private BigDecimal commissionRate;

    private String rejectionReason;
}
