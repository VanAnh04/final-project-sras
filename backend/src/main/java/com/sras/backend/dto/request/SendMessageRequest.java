package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Gửi một tin nhắn trong đơn cứu hộ tới đối phương xác định bằng role. */
@Data
public class SendMessageRequest {

    /** Role của người nhận trong đơn: {@code CUSTOMER} / {@code GARAGE} / {@code STAFF}. */
    @NotBlank(message = "Thiếu người nhận")
    private String peer;

    /** Nội dung text (có thể trống nếu chỉ gửi ảnh). */
    private String content;

    /** URL ảnh đính kèm (có thể trống). */
    private String imageUrl;
}
