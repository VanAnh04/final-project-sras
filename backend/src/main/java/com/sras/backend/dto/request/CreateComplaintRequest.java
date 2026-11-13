package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.ComplaintTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateComplaintRequest {

    private Long requestId;

    @NotNull(message = "Đối tượng bị khiếu nại không được để trống")
    private ComplaintTargetType targetType;

    @NotBlank(message = "Nội dung khiếu nại không được để trống")
    @Size(max = 2000, message = "Nội dung khiếu nại tối đa 2000 ký tự")
    private String content;

    @Size(max = 500, message = "Đường dẫn file đính kèm tối đa 500 ký tự")
    private String attachmentUrl;
}
