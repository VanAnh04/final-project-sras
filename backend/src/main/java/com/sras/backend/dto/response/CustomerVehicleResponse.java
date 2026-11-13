package com.sras.backend.dto.response;

import lombok.Builder;
import lombok.Data;

/** Xe đã lưu trong hồ sơ khách — dùng để khách chọn khi gửi yêu cầu cứu hộ. */
@Data
@Builder
public class CustomerVehicleResponse {
    private Long id;
    /** CAR / MOTORBIKE */
    private String vehicleType;
    private String brand;
    private String model;
    private String licensePlate;
    private String color;
    private Short year;
    /** Ảnh xe thật do khách upload; null nếu chưa có. */
    private String photoUrl;
    private Boolean isDefault;
}
