package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Nhân viên/gara đẩy vị trí xe cứu hộ theo thời gian thực. */
@Data
public class UpdateRescuerLocationRequest {

    @NotNull(message = "Thiếu vĩ độ")
    private Double lat;

    @NotNull(message = "Thiếu kinh độ")
    private Double lng;
}
