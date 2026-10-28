package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Admin xử lý lệnh rút treo. Hệ thống luôn tra lại payOS trước: payOS có kết quả thì áp kết quả đó; admin chỉ được
 * tự chọn khi payOS không có lệnh. {@code ACKNOWLEDGE} = đã kiểm tra lệnh đã chốt bị cắm cờ, không đụng tới tiền.
 */
@Data
public class ResolveWithdrawalRequest {
    @NotBlank(message = "Vui lòng chọn kết quả xử lý")
    @Pattern(regexp = "TRANSFERRED|FAILED|ACKNOWLEDGE", message = "Kết quả xử lý không hợp lệ")
    private String result;

    @NotBlank(message = "Vui lòng ghi chú lý do xử lý")
    @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
    private String note;

    /** Ảnh biên lai (bắt buộc khi đánh dấu TRANSFERRED thủ công). */
    @Size(max = 500, message = "Đường dẫn biên lai tối đa 500 ký tự")
    private String proofUrl;
}
