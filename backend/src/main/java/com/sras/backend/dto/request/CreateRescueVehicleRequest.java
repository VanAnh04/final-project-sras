package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.RescueVehicleKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/** Gara thêm nhanh một xe cứu hộ. */
@Data
public class CreateRescueVehicleRequest {

    public static final String LICENSE_PLATE_REGEX = "^\\s*[1-9][0-9]\\s*[- ]?\\s*([A-Za-z]{1,2}|[A-Za-z][0-9])\\s*[- ]?\\s*([0-9]{3}\\.[0-9]{2}|[0-9]{5}|[0-9]{2}\\.[0-9]{2}|[0-9]{4})\\s*$";

    @NotBlank(message = "Vui lòng nhập biển số xe")
    @Pattern(
        regexp = LICENSE_PLATE_REGEX,
        message = "Biển số xe không đúng định dạng chuẩn (VD: 51C-04218, 29A-12345, 59P1-23456)"
    )
    private String licensePlate;

    @NotNull(message = "Vui lòng chọn loại xe cứu hộ")
    private RescueVehicleKind vehicleKind;

    /** Ảnh xe cứu hộ (URL đã upload). */
    private String imageUrl;
}
