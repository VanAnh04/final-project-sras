package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.RescueVehicleKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Gara thêm nhanh một xe cứu hộ. */
@Data
public class CreateRescueVehicleRequest {

    @NotBlank(message = "Vui lòng nhập biển số xe")
    private String licensePlate;

    @NotNull(message = "Vui lòng chọn loại xe cứu hộ")
    private RescueVehicleKind vehicleKind;

    /** Ảnh xe cứu hộ (URL đã upload). */
    private String imageUrl;
}
