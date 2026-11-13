package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.ComplaintStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResolveComplaintRequest {

    @NotNull(message = "Trạng thái khiếu nại không được để trống")
    private ComplaintStatus status;

    @Size(max = 2000, message = "Nội dung giải quyết tối đa 2000 ký tự")
    private String resolution;

    /** Số tiền bồi hoàn xăng xe được Admin phê duyệt (VND, tuỳ chọn) */
    private Long approvedCompensationAmount;
}
