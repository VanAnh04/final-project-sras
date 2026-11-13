package com.sras.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Khách đẩy vị trí hiện tại khi đang bật chia sẻ. */
@Data
public class UpdateCustomerLocationRequest {

    @NotNull(message = "Thiếu vĩ độ")
    @DecimalMin(value = "-90", message = "Vĩ độ không hợp lệ")
    @DecimalMax(value = "90", message = "Vĩ độ không hợp lệ")
    private Double lat;

    @NotNull(message = "Thiếu kinh độ")
    @DecimalMin(value = "-180", message = "Kinh độ không hợp lệ")
    @DecimalMax(value = "180", message = "Kinh độ không hợp lệ")
    private Double lng;

    /** Sai số GPS (mét); không có thì coi như không đủ tin để đổi điểm tới. */
    private Double accuracy;
}
