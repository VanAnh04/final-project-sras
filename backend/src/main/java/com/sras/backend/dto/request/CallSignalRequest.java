package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Tín hiệu WebRTC (SDP đã gom đủ ICE candidate) chuyển tiếp cho đối phương trong cuộc gọi. */
@Data
public class CallSignalRequest {

    /** {@code OFFER} (do người gọi gửi) hoặc {@code ANSWER} (do người nhận gửi). */
    @NotBlank(message = "Thiếu loại tín hiệu")
    @Pattern(regexp = "OFFER|ANSWER", message = "Loại tín hiệu không hợp lệ")
    private String type;

    @NotBlank(message = "Thiếu SDP")
    @Size(max = 16000, message = "SDP quá lớn")
    private String sdp;
}
