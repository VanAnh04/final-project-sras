package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.VehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Payload khách gửi khi thêm hoặc sửa phương tiện cá nhân (bảng customer_vehicles). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCustomerVehicleRequest {

    @NotNull(message = "Vui lòng chọn loại xe (MOTORBIKE hoặc CAR)")
    private VehicleType vehicleType;

    @NotBlank(message = "Vui lòng nhập hãng xe (ví dụ: Honda, Yamaha, Toyota...)")
    @Size(max = 50, message = "Tên hãng xe không quá 50 ký tự")
    private String brand;

    @Size(max = 50, message = "Tên dòng xe không quá 50 ký tự")
    private String model;

    @Size(max = 15, message = "Biển số xe không quá 15 ký tự")
    private String licensePlate;

    @Size(max = 30, message = "Màu sắc không quá 30 ký tự")
    private String color;

    private Short year;

    @Size(max = 500, message = "Đường dẫn ảnh không quá 500 ký tự")
    private String photoUrl;

    private Boolean isDefault;
}
