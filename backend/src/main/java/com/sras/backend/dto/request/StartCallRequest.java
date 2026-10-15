package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Bắt đầu một cuộc gọi thoại tới đối phương trong đơn cứu hộ, xác định bằng role. */
@Data
public class StartCallRequest {

    @NotNull(message = "Thiếu mã đơn cứu hộ")
    private Long rescueRequestId;

    /** Role của người nhận trong đơn: {@code CUSTOMER} / {@code GARAGE} / {@code STAFF}. */
    @NotBlank(message = "Thiếu người nhận")
    private String peer;
}
