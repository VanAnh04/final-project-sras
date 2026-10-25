package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.VehicleType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RescuePricingConfigRequest {

    @NotNull(message = "Loại xe không được để trống")
    private VehicleType vehicleType;

    @NotNull(message = "Phí theo km ban ngày không được để trống")
    @Min(value = 0, message = "Phí theo km ban ngày phải >= 0")
    private Long feePerKmDay;

    @NotNull(message = "Phí theo km ban đêm không được để trống")
    @Min(value = 0, message = "Phí theo km ban đêm phải >= 0")
    private Long feePerKmNight;

    @NotNull(message = "Cước tối thiểu không được để trống")
    @Min(value = 0, message = "Cước tối thiểu phải >= 0")
    private Long minFee;

    @NotNull(message = "Số km miễn phí không được để trống")
    @Min(value = 0, message = "Số km miễn phí phải >= 0")
    private Long freeKm;

    @NotNull(message = "Giờ bắt đầu ban đêm không được để trống")
    @Min(value = 0, message = "Giờ bắt đầu ban đêm từ 0 đến 23")
    @Max(value = 23, message = "Giờ bắt đầu ban đêm từ 0 đến 23")
    private Short nightStartHour;

    @Min(value = 0, message = "Phút bắt đầu ban đêm từ 0 đến 59")
    @Max(value = 59, message = "Phút bắt đầu ban đêm từ 0 đến 59")
    private Short nightStartMinute = 0;

    @NotNull(message = "Giờ kết thúc ban đêm không được để trống")
    @Min(value = 0, message = "Giờ kết thúc ban đêm từ 0 đến 23")
    @Max(value = 23, message = "Giờ kết thúc ban đêm từ 0 đến 23")
    private Short nightEndHour;

    @Min(value = 0, message = "Phút kết thúc ban đêm từ 0 đến 59")
    @Max(value = 59, message = "Phút kết thúc ban đêm từ 0 đến 59")
    private Short nightEndMinute = 0;

    @NotNull(message = "Phần trăm phụ phí lễ không được để trống")
    @Min(value = 0, message = "Phần trăm phụ phí lễ từ 0 đến 100")
    @Max(value = 100, message = "Phần trăm phụ phí lễ từ 0 đến 100")
    private Short holidaySurchargePct;

    private Boolean holidaySurgeEnabled = false;

    private String displayNote;

    // Tier 1 (Mở cửa)
    private Double baseKm = 2.0;
    private Long baseFareDay;
    private Long baseFareNight;

    // Tier 2 (Cự ly chuẩn, VD: 2-10km)
    private Double kmTier2Limit = 10.0;
    private Long feePerKmTier2Day;
    private Long feePerKmTier2Night;

    // Tier 3 (Cự ly xa, VD: > 10km)
    private Long feePerKmTier3Day;
    private Long feePerKmTier3Night;
}
