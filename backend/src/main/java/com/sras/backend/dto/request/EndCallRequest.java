package com.sras.backend.dto.request;

import lombok.Data;

/** Kết thúc cuộc gọi. Body có thể bỏ trống (coi như kết thúc bình thường). */
@Data
public class EndCallRequest {

    /** true nếu client tự kết thúc vì mất kết nối / lỗi micro → cuộc gọi ghi nhận là FAILED. */
    private Boolean failed;
}
